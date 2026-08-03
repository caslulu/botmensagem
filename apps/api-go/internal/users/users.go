package users

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"botmensagem/api/internal/auth"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

type pubUser struct {
	ID        string     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"isActive"`
	AvatarURL *string    `json:"avatarUrl"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type fullUser struct {
	pubUser
	AvatarPath     *string    `json:"avatarPath,omitempty"`
	AvatarMimeType *string    `json:"avatarMimeType,omitempty"`
	AvatarUpdatedAt *time.Time `json:"avatarUpdatedAt,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func rowToPub(id, email, name, role string, isActive bool, avatarPath, avatarMime *string, avatarUpdated *time.Time, createdAt, updatedAt time.Time) pubUser {
	return pubUser{
		ID: id, Email: email, Name: name, Role: role, IsActive: isActive,
		AvatarURL: nil, CreatedAt: createdAt, UpdatedAt: updatedAt,
	}
}

// HandleUsers: GET (admin), POST (admin)
func (s *Service) HandleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.list(w, r)
	case http.MethodPost:
		s.create(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Service) list(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, email, name, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		 FROM "users" ORDER BY created_at DESC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	defer rows.Close()
	var out []pubUser
	for rows.Next() {
		var (
			id, email, name, role string
			isActive              bool
			avatarPath, avatarMime *string
			avatarUpdated          *time.Time
			createdAt, updatedAt   time.Time
		)
		if err := rows.Scan(&id, &email, &name, &role, &isActive, &avatarPath, &avatarMime, &avatarUpdated, &createdAt, &updatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
			return
		}
		out = append(out, rowToPub(id, email, name, role, isActive, avatarPath, avatarMime, avatarUpdated, createdAt, updatedAt))
	}
	if out == nil {
		out = []pubUser{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": out})
}

type createUserReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (s *Service) create(w http.ResponseWriter, r *http.Request) {
	var body createUserReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	name := strings.TrimSpace(body.Name)
	email := strings.ToLower(strings.TrimSpace(body.Email))
	password := body.Password
	role := strings.TrimSpace(body.Role)
	if role == "" {
		role = "user"
	}
	if name == "" || email == "" || len(password) < 8 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Nome, email e senha (min 8) obrigatorios."})
		return
	}
	if role != "admin" && role != "user" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Role invalido."})
		return
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	id := uuid.NewString()
	now := time.Now().UTC()
	_, err = s.pool.Exec(r.Context(),
		`INSERT INTO "users" (id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, true, NULL, NULL, NULL, $6, $6)`,
		id, email, name, string(hash), role, now)
	if err != nil {
		if strings.Contains(err.Error(), "users_email_key") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Conflict", "message": "Email ja cadastrado."})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao criar usuario."})
		return
	}
	u := pubUser{ID: id, Email: email, Name: name, Role: role, IsActive: true, AvatarURL: nil, CreatedAt: now, UpdatedAt: now}
	writeJSON(w, http.StatusOK, map[string]any{"user": u})
}

// HandleUserByID: PATCH /users/:id
func (s *Service) HandleUserByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "ID obrigatorio."})
		return
	}
	if r.Method != http.MethodPatch {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	s.update(w, r, id)
}

type updateUserReq struct {
	Name     *string `json:"name,omitempty"`
	Email    *string `json:"email,omitempty"`
	Role     *string `json:"role,omitempty"`
	IsActive *bool   `json:"isActive,omitempty"`
	Password *string `json:"password,omitempty"`
}

func (s *Service) update(w http.ResponseWriter, r *http.Request, id string) {
	var body updateUserReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	now := time.Now().UTC()
	if body.Name != nil && strings.TrimSpace(*body.Name) != "" {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET name=$1, updated_at=$2 WHERE id=$3`, strings.TrimSpace(*body.Name), now, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar."})
			return
		}
	}
	if body.Email != nil && strings.TrimSpace(*body.Email) != "" {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET email=$1, updated_at=$2 WHERE id=$3`, strings.ToLower(strings.TrimSpace(*body.Email)), now, id); err != nil {
			if strings.Contains(err.Error(), "users_email_key") {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Conflict", "message": "Email ja cadastrado."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar email."})
			return
		}
	}
	if body.Role != nil && (*body.Role == "admin" || *body.Role == "user") {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET role=$1, updated_at=$2 WHERE id=$3`, *body.Role, now, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar role."})
			return
		}
	}
	if body.IsActive != nil {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET is_active=$1, updated_at=$2 WHERE id=$3`, *body.IsActive, now, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar status."})
			return
		}
	}
	if body.Password != nil && len(*body.Password) >= 8 {
		hash, err := auth.HashPassword(*body.Password)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
			return
		}
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET password_hash=$1, updated_at=$2 WHERE id=$3`, string(hash), now, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar senha."})
			return
		}
	}
	// retornar usuario atualizado
	u, err := s.get(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not Found", "message": "Usuario nao encontrado."})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": u})
}

func (s *Service) get(ctx context.Context, id string) (pubUser, error) {
	var (
		u           pubUser
		avatarPath  *string
		avatarMime  *string
		avatarUpd   *time.Time
	)
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, name, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		 FROM "users" WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.IsActive, &avatarPath, &avatarMime, &avatarUpd, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return pubUser{}, err
	}
	u.AvatarURL = nil
	return u, nil
}

// CurrentUserOrAdmin exige que o usuario seja admin OU seja o proprio usuario do path.
func (s *Service) AdminOrSelf(next http.HandlerFunc, idParam string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := auth.FromContext(r.Context())
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
			return
		}
		if u.Role == "admin" {
			next(w, r)
			return
		}
		id := r.PathValue(idParam)
		if id == u.ID {
			next(w, r)
			return
		}
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Forbidden", "message": "Acesso restrito."})
	}
}