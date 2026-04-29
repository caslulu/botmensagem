package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const sessionCookieName = "botmensagem_session"

type loginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
	V   int    `json:"v"`
}

type tokenPayload struct {
	AuthUser
	Sub string `json:"sub"`
	Iat int64  `json:"iat"`
	Exp int64  `json:"exp"`
}

func (a *App) handleLogin(w http.ResponseWriter, r *http.Request) error {
	var input loginInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" || len(input.Password) < 8 {
		return appErr(http.StatusUnauthorized, "Email ou senha invalidos.")
	}

	user, err := a.findUserByEmail(r.Context(), email)
	if err != nil {
		if err == sql.ErrNoRows {
			return appErr(http.StatusUnauthorized, "Email ou senha invalidos.")
		}
		return err
	}
	if !user.IsActive {
		return appErr(http.StatusUnauthorized, "Email ou senha invalidos.")
	}
	valid, err := verifyPassword(input.Password, user.PasswordHash)
	if err != nil || !valid {
		return appErr(http.StatusUnauthorized, "Email ou senha invalidos.")
	}

	authUser := a.toAuthUser(user)
	token, expiresAt, err := a.signToken(authUser)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.SecureAuthCookie,
		Expires:  expiresAt,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"expiresAt": isoTime(expiresAt),
		"user":      authUser,
	})
	return nil
}

func (a *App) authenticateRequest(r *http.Request) (AuthUser, error) {
	token := bearerToken(r.Header.Get("Authorization"))
	if token == "" {
		if cookie, err := r.Cookie(sessionCookieName); err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		return AuthUser{}, appErr(http.StatusUnauthorized, "Login necessario.")
	}
	payload, err := a.verifyToken(token)
	if err != nil {
		return AuthUser{}, err
	}
	user, err := a.findUserByID(r.Context(), payload.Sub)
	if err != nil {
		if err == sql.ErrNoRows {
			return AuthUser{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
		}
		return AuthUser{}, err
	}
	if !user.IsActive {
		return AuthUser{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	return a.toAuthUser(user), nil
}

func bearerToken(header string) string {
	parts := strings.Fields(header)
	if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
		return parts[1]
	}
	return ""
}

func clearSessionCookie(w http.ResponseWriter, cfg Config) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   cfg.SecureAuthCookie,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func (a *App) signToken(user AuthUser) (string, time.Time, error) {
	now := time.Now().Unix()
	expiresAt := time.Unix(now+a.cfg.AuthTTLSeconds, 0).UTC()
	header := tokenHeader{Alg: "HS256", Typ: "JWT", V: 1}
	payload := tokenPayload{
		AuthUser: user,
		Sub:      user.ID,
		Iat:      now,
		Exp:      expiresAt.Unix(),
	}
	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", time.Time{}, err
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", time.Time{}, err
	}
	body := base64.RawURLEncoding.EncodeToString(headerBytes) + "." + base64.RawURLEncoding.EncodeToString(payloadBytes)
	return body + "." + a.signBody(body), expiresAt, nil
}

func (a *App) verifyToken(token string) (tokenPayload, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	body := parts[0] + "." + parts[1]
	if !safeEqual(parts[2], a.signBody(body)) {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}

	var header tokenHeader
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}

	var payload tokenPayload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao invalida.")
	}
	if header.Alg != "HS256" || header.V != 1 || payload.Sub == "" || payload.Exp <= time.Now().Unix() {
		return tokenPayload{}, appErr(http.StatusUnauthorized, "Sessao expirada.")
	}
	return payload, nil
}

func (a *App) signBody(body string) string {
	mac := hmac.New(sha256.New, []byte(a.cfg.AuthSecret))
	_, _ = mac.Write([]byte(body))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func safeEqual(left, right string) bool {
	return hmac.Equal([]byte(left), []byte(right))
}

func (a *App) findUserByEmail(ctx context.Context, email string) (selectedUser, error) {
	return a.scanUser(a.db.QueryRowContext(ctx, `
		SELECT id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		FROM users
		WHERE email = $1
	`, email))
}

func (a *App) findUserByID(ctx context.Context, id string) (selectedUser, error) {
	return a.scanUser(a.db.QueryRowContext(ctx, `
		SELECT id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id))
}

type scanner interface {
	Scan(dest ...any) error
}

func (a *App) scanUser(row scanner) (selectedUser, error) {
	var user selectedUser
	err := row.Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.PasswordHash,
		&user.Role,
		&user.IsActive,
		&user.AvatarPath,
		&user.AvatarMimeType,
		&user.AvatarUpdatedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	return user, err
}

func (a *App) toAuthUser(user selectedUser) AuthUser {
	var avatarURL *string
	if user.AvatarUpdatedAt.Valid {
		value := a.cfg.PublicAPIURL + "/users/" + urlPathEscape(user.ID) + "/avatar?v=" + urlQueryEscape(user.AvatarUpdatedAt.Time.UTC().Format(time.RFC3339Nano))
		avatarURL = &value
	}
	return AuthUser{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Role:      user.Role,
		AvatarURL: avatarURL,
	}
}
