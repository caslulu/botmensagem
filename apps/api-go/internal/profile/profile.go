package profile

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

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
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatarUrl"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (s *Service) reload(ctx context.Context, id string) (pubUser, error) {
	var u pubUser
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, name, role FROM "users" WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Name, &u.Role)
	if err != nil {
		return pubUser{}, err
	}
	u.AvatarURL = nil
	return u, nil
}

type updateProfileReq struct {
	Name  *string `json:"name,omitempty"`
	Email *string `json:"email,omitempty"`
}

// HandleProfile: PATCH /profile
func (s *Service) HandleProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	u, ok := auth.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
		return
	}
	var body updateProfileReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	now := time.Now().UTC()
	if body.Name != nil && strings.TrimSpace(*body.Name) != "" {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET name=$1, updated_at=$2 WHERE id=$3`, strings.TrimSpace(*body.Name), now, u.ID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar."})
			return
		}
	}
	if body.Email != nil && strings.TrimSpace(*body.Email) != "" {
		newEmail := strings.ToLower(strings.TrimSpace(*body.Email))
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "users" SET email=$1, updated_at=$2 WHERE id=$3`, newEmail, now, u.ID); err != nil {
			if strings.Contains(err.Error(), "users_email_key") {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "Conflict", "message": "Email ja cadastrado."})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar email."})
			return
		}
	}
	out, err := s.reload(r.Context(), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": out})
}

type changePasswordReq struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// HandlePassword: PATCH /profile/password
func (s *Service) HandlePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	u, ok := auth.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
		return
	}
	var body changePasswordReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	if len(body.NewPassword) < 8 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Nova senha muito curta (min 8)."})
		return
	}
	var currentHash string
	err := s.pool.QueryRow(r.Context(),
		`SELECT password_hash FROM "users" WHERE id=$1`, u.ID).Scan(&currentHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not Found", "message": "Usuario nao encontrado."})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	if ok, _ := auth.VerifyPassword(currentHash, body.CurrentPassword); !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Senha atual incorreta."})
		return
	}
	newHash, err := auth.HashPassword(body.NewPassword)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	now := time.Now().UTC()
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE "users" SET password_hash=$1, updated_at=$2 WHERE id=$3`, string(newHash), now, u.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar senha."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// HandleAvatar: POST /profile/avatar (multipart form, file)
func (s *Service) HandleAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	u, ok := auth.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
		return
	}
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Arquivo invalido."})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Arquivo nao enviado."})
		return
	}
	defer file.Close()
	mime := header.Header.Get("Content-Type")
	if !strings.HasPrefix(mime, "image/") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Tipo de arquivo nao permitido."})
		return
	}
	now := time.Now().UTC()
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE "users" SET avatar_mime_type=$1, avatar_updated_at=$2, updated_at=$2 WHERE id=$3`,
		mime, now, u.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao salvar avatar."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}