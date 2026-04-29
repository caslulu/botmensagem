package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

type userResponse struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	IsActive  bool    `json:"isActive"`
	AvatarURL *string `json:"avatarUrl"`
	CreatedAt string  `json:"createdAt"`
	UpdatedAt string  `json:"updatedAt"`
}

type createUserInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type updateUserInput struct {
	Name     *string `json:"name"`
	Email    *string `json:"email"`
	Password *string `json:"password"`
	Role     *string `json:"role"`
	IsActive *bool   `json:"isActive"`
}

type updateProfileInput struct {
	Name  *string `json:"name"`
	Email *string `json:"email"`
}

type changePasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (a *App) handleListUsers(w http.ResponseWriter, r *http.Request) error {
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		FROM users
		ORDER BY role ASC, name ASC
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	users := []userResponse{}
	for rows.Next() {
		user, err := a.scanUser(rows)
		if err != nil {
			return err
		}
		users = append(users, a.toUserResponse(user))
	}
	if err := rows.Err(); err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
	return nil
}

func (a *App) handleCreateUser(w http.ResponseWriter, r *http.Request) error {
	var input createUserInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Name = strings.TrimSpace(input.Name)
	if err := validateUserInput(input.Name, input.Email, input.Password, input.Role); err != nil {
		return err
	}
	if err := a.ensureEmailAvailable(r.Context(), input.Email, ""); err != nil {
		return err
	}
	hash, err := hashPassword(input.Password)
	if err != nil {
		return err
	}
	user, err := a.scanUser(a.db.QueryRowContext(r.Context(), `
		INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
	`, uuid.NewString(), input.Email, input.Name, hash, input.Role))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": a.toUserResponse(user)})
	return nil
}

func (a *App) handleUpdateUser(w http.ResponseWriter, r *http.Request, id string, actor AuthUser) error {
	var input updateUserInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	current, err := a.findUserByID(r.Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return appErr(http.StatusNotFound, "Usuario nao encontrado.")
		}
		return err
	}
	if actor.ID == id && input.IsActive != nil && !*input.IsActive {
		return appErr(http.StatusBadRequest, "Voce nao pode desativar sua propria conta.")
	}
	if actor.ID == id && input.Role != nil && *input.Role != current.Role {
		return appErr(http.StatusBadRequest, "Voce nao pode alterar sua propria funcao.")
	}

	name := current.Name
	email := current.Email
	role := current.Role
	isActive := current.IsActive
	passwordHash := current.PasswordHash
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
		if len(name) < 2 {
			return appErr(http.StatusBadRequest, "Nome invalido.")
		}
	}
	if input.Email != nil {
		email = strings.ToLower(strings.TrimSpace(*input.Email))
		if !validEmail(email) {
			return appErr(http.StatusBadRequest, "Email invalido.")
		}
		if err := a.ensureEmailAvailable(r.Context(), email, id); err != nil {
			return err
		}
	}
	if input.Role != nil {
		role = strings.TrimSpace(*input.Role)
		if role != "admin" && role != "user" {
			return appErr(http.StatusBadRequest, "Funcao invalida.")
		}
	}
	if input.IsActive != nil {
		isActive = *input.IsActive
	}
	if input.Password != nil {
		if len(*input.Password) < 8 {
			return appErr(http.StatusBadRequest, "Senha invalida.")
		}
		hash, err := hashPassword(*input.Password)
		if err != nil {
			return err
		}
		passwordHash = hash
	}

	user, err := a.scanUser(a.db.QueryRowContext(r.Context(), `
		UPDATE users
		SET name = $1, email = $2, role = $3, is_active = $4, password_hash = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
	`, name, email, role, isActive, passwordHash, id))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": a.toUserResponse(user)})
	return nil
}

func (a *App) handleUpdateProfile(w http.ResponseWriter, r *http.Request, actor AuthUser) error {
	var input updateProfileInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	current, err := a.findUserByID(r.Context(), actor.ID)
	if err != nil {
		return appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	name := current.Name
	email := current.Email
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
		if len(name) < 2 {
			return appErr(http.StatusBadRequest, "Nome invalido.")
		}
	}
	if input.Email != nil {
		email = strings.ToLower(strings.TrimSpace(*input.Email))
		if !validEmail(email) {
			return appErr(http.StatusBadRequest, "Email invalido.")
		}
		if err := a.ensureEmailAvailable(r.Context(), email, actor.ID); err != nil {
			return err
		}
	}
	user, err := a.scanUser(a.db.QueryRowContext(r.Context(), `
		UPDATE users
		SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
	`, name, email, actor.ID))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": a.toAuthUser(user)})
	return nil
}

func (a *App) handleChangePassword(w http.ResponseWriter, r *http.Request, actor AuthUser) error {
	var input changePasswordInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if len(input.CurrentPassword) < 8 || len(input.NewPassword) < 8 {
		return appErr(http.StatusBadRequest, "Senha invalida.")
	}
	user, err := a.findUserByID(r.Context(), actor.ID)
	if err != nil {
		return appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	valid, err := verifyPassword(input.CurrentPassword, user.PasswordHash)
	if err != nil {
		return err
	}
	if !valid {
		return appErr(http.StatusForbidden, "Senha atual invalida.")
	}
	hash, err := hashPassword(input.NewPassword)
	if err != nil {
		return err
	}
	if _, err := a.db.ExecContext(r.Context(), `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, hash, actor.ID); err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	return nil
}

func (a *App) handleUpdateAvatar(w http.ResponseWriter, r *http.Request, actor AuthUser) error {
	r.Body = http.MaxBytesReader(w, r.Body, 2*1024*1024+1024)
	if err := r.ParseMultipartForm(512 << 10); err != nil {
		return appErr(http.StatusBadRequest, "Foto invalida.")
	}
	file, header, err := r.FormFile("avatar")
	if err != nil {
		return appErr(http.StatusBadRequest, "Foto obrigatoria.")
	}
	_ = file.Close()
	mimeType := header.Header.Get("Content-Type")
	if !allowedAvatarTypes[mimeType] {
		return appErr(http.StatusBadRequest, "Use uma imagem PNG, JPG ou WEBP.")
	}

	current, err := a.findUserByID(r.Context(), actor.ID)
	if err != nil {
		return err
	}
	extension := extensionForMimeType(mimeType)
	header.Filename = uuid.NewString() + "-" + sanitizeFileName(actor.Email) + extension
	asset, err := a.saveAvatarFile(header, mimeType)
	if err != nil {
		return err
	}
	user, err := a.scanUser(a.db.QueryRowContext(r.Context(), `
		UPDATE users
		SET avatar_path = $1, avatar_mime_type = $2, avatar_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
	`, asset, mimeType, actor.ID))
	if err != nil {
		return err
	}
	if current.AvatarPath.Valid && current.AvatarPath.String != asset {
		_ = os.Remove(current.AvatarPath.String)
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": a.toAuthUser(user)})
	return nil
}

func (a *App) saveAvatarFile(header *multipart.FileHeader, mimeType string) (string, error) {
	source, err := header.Open()
	if err != nil {
		return "", err
	}
	defer source.Close()
	targetPath := filepath.Join(a.cfg.UploadsDir, "avatars", header.Filename)
	target, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer target.Close()
	if _, err := io.Copy(target, source); err != nil {
		_ = os.Remove(targetPath)
		return "", err
	}
	return targetPath, nil
}

func (a *App) handleGetAvatar(w http.ResponseWriter, r *http.Request, id string, actor AuthUser) error {
	if actor.ID != id && actor.Role != "admin" {
		return appErr(http.StatusForbidden, "Acesso restrito.")
	}
	user, err := a.findUserByID(r.Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return appErr(http.StatusNotFound, "Foto nao encontrada.")
		}
		return err
	}
	if !user.AvatarPath.Valid || !user.AvatarMimeType.Valid {
		return appErr(http.StatusNotFound, "Foto nao encontrada.")
	}
	if _, err := os.Stat(user.AvatarPath.String); err != nil {
		return appErr(http.StatusNotFound, "Foto nao encontrada.")
	}
	w.Header().Set("Content-Type", user.AvatarMimeType.String)
	w.Header().Set("Cache-Control", "private, max-age=3600")
	http.ServeFile(w, r, user.AvatarPath.String)
	return nil
}

func (a *App) ensureAdminFromEnv(ctx context.Context) error {
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	if email == "" && password == "" {
		return nil
	}
	if name == "" {
		name = strings.Split(email, "@")[0]
	}
	if !validEmail(email) || len(password) < 8 {
		return appErr(http.StatusBadRequest, "ADMIN_EMAIL/ADMIN_PASSWORD invalidos.")
	}
	hash, err := hashPassword(password)
	if err != nil {
		return err
	}
	_, err = a.db.ExecContext(ctx, `
		INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT (email) DO UPDATE
		SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin', is_active = true, updated_at = CURRENT_TIMESTAMP
	`, uuid.NewString(), email, name, hash)
	return err
}

func validateUserInput(name, email, password, role string) error {
	if len(strings.TrimSpace(name)) < 2 {
		return appErr(http.StatusBadRequest, "Nome invalido.")
	}
	if !validEmail(email) {
		return appErr(http.StatusBadRequest, "Email invalido.")
	}
	if len(password) < 8 {
		return appErr(http.StatusBadRequest, "Senha invalida.")
	}
	if role != "admin" && role != "user" {
		return appErr(http.StatusBadRequest, "Funcao invalida.")
	}
	return nil
}

func validEmail(email string) bool {
	return regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`).MatchString(email)
}

func (a *App) ensureEmailAvailable(ctx context.Context, email, ignoreID string) error {
	var id string
	err := a.db.QueryRowContext(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&id)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}
	if id != ignoreID {
		return appErr(http.StatusConflict, "Email ja esta em uso.")
	}
	return nil
}

func (a *App) toUserResponse(user selectedUser) userResponse {
	auth := a.toAuthUser(user)
	return userResponse{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Role:      user.Role,
		IsActive:  user.IsActive,
		AvatarURL: auth.AvatarURL,
		CreatedAt: isoTime(user.CreatedAt),
		UpdatedAt: isoTime(user.UpdatedAt),
	}
}

func extensionForMimeType(mimeType string) string {
	switch mimeType {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg"
	}
}

var allowedAvatarTypes = map[string]bool{
	"image/png":  true,
	"image/jpeg": true,
	"image/webp": true,
}

func rawOptionalString(raw map[string]json.RawMessage, key string) *string {
	if value, ok := raw[key]; ok {
		var out string
		if json.Unmarshal(value, &out) == nil {
			return &out
		}
	}
	return nil
}

func rawOptionalBool(raw map[string]json.RawMessage, key string) *bool {
	if value, ok := raw[key]; ok {
		var out bool
		if json.Unmarshal(value, &out) == nil {
			return &out
		}
	}
	return nil
}

func _unusedTime(_ time.Time) {}
