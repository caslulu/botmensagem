package auth

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	SessionCookieName = "botmensagem_session"
	SessionTTL        = 12 * time.Hour
)

type User struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	Role            string     `json:"role"`
	IsActive        bool       `json:"isActive"`
	AvatarPath      *string    `json:"avatarPath,omitempty"`
	AvatarMimeType  *string    `json:"avatarMimeType,omitempty"`
	AvatarUpdatedAt *time.Time `json:"avatarUpdatedAt,omitempty"`
	AvatarURL       *string    `json:"avatarUrl"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type SessionClaims struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatarUrl"`
	jwt.RegisteredClaims
}

type Service struct {
	pool       *pgxpool.Pool
	authSecret []byte
	adminEmail string
	adminPass  string
}

func NewService(pool *pgxpool.Pool, authSecret, adminEmail, adminPass string) *Service {
	return &Service{
		pool:       pool,
		authSecret: []byte(authSecret),
		adminEmail: adminEmail,
		adminPass:  adminPass,
	}
}

// EnsureSeed cria o usuario admin configurado se ainda nao existir ningum.
func (s *Service) EnsureSeed(ctx context.Context) error {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM "users"`).Scan(&count)
	if err != nil {
		return fmt.Errorf("verificar seed users: %w", err)
	}
	if count > 0 {
		return nil
	}
	if s.adminEmail == "" || s.adminPass == "" {
		log.Println("[auth] seed: ADMIN_EMAIL/ADMIN_PASSWORD ausentes; nenhum usuario criado")
		return nil
	}
	if len(s.adminPass) < 8 {
		return fmt.Errorf("ADMIN_PASSWORD muito curta (min 8)")
	}
	hash, err := HashPassword(s.adminPass)
	if err != nil {
		return fmt.Errorf("hashear senha admin: %w", err)
	}
	now := time.Now().UTC()
	id := uuid.NewString()
	_, err = s.pool.Exec(ctx,
		`INSERT INTO "users" (id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, 'admin', true, NULL, NULL, NULL, $5, $5)`,
		id, strings.ToLower(s.adminEmail), nameFromEmail(s.adminEmail), string(hash), now)
	if err != nil {
		return fmt.Errorf("inserir admin seed: %w", err)
	}
	log.Printf("[auth] seed: admin criado (%s)", s.adminEmail)
	return nil
}

func nameFromEmail(email string) string {
	if at := strings.Index(email, "@"); at > 0 {
		return email[:at]
	}
	return email
}

// rowToUser le uma linha de users e monta o struct. AvatarURL e derivado do path.
func rowToUser(id, email, name, role string, isActive bool, avatarPath, avatarMimeType *string, avatarUpdatedAt *time.Time, createdAt, updatedAt time.Time) User {
	u := User{
		ID: id, Email: email, Name: name, Role: role, IsActive: isActive,
		AvatarPath: avatarPath, AvatarMimeType: avatarMimeType, AvatarUpdatedAt: avatarUpdatedAt,
		CreatedAt: createdAt, UpdatedAt: updatedAt,
		AvatarURL: nil,
	}
	return u
}

func (s *Service) findByEmail(ctx context.Context, email string) (User, string, error) {
	var (
		u              User
		passwordHash   string
		avatarPath     *string
		avatarMime     *string
		avatarUpdated  *time.Time
	)
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, name, password_hash, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		 FROM "users" WHERE email=$1 AND is_active=true`,
		strings.ToLower(email)).Scan(
		&u.ID, &u.Email, &u.Name, &passwordHash, &u.Role, &u.IsActive,
		&avatarPath, &avatarMime, &avatarUpdated, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, "", ErrNotFound
		}
		return User{}, "", err
	}
	u.AvatarPath = avatarPath
	u.AvatarMimeType = avatarMime
	u.AvatarUpdatedAt = avatarUpdated
	u.AvatarURL = nil
	return u, passwordHash, nil
}

func (s *Service) findByID(ctx context.Context, id string) (User, error) {
	var (
		u             User
		avatarPath    *string
		avatarMime    *string
		avatarUpdated  *time.Time
	)
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, name, role, is_active, avatar_path, avatar_mime_type, avatar_updated_at, created_at, updated_at
		 FROM "users" WHERE id=$1`,
		id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Role, &u.IsActive,
		&avatarPath, &avatarMime, &avatarUpdated, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	u.AvatarPath = avatarPath
	u.AvatarMimeType = avatarMime
	u.AvatarUpdatedAt = avatarUpdated
	u.AvatarURL = nil
	return u, nil
}

var (
	ErrNotFound      = errors.New("usuario nao encontrado")
	ErrInvalidCreds  = errors.New("credenciais invalidas")
	ErrInactive      = errors.New("usuario inativo")
)

func (s *Service) Login(ctx context.Context, email, password string) (User, string, time.Time, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || len(password) < 8 {
		return User{}, "", time.Time{}, ErrInvalidCreds
	}
	u, hash, err := s.findByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return User{}, "", time.Time{}, ErrInvalidCreds
		}
		return User{}, "", time.Time{}, err
	}
	if ok, _ := VerifyPassword(hash, password); !ok {
		return User{}, "", time.Time{}, ErrInvalidCreds
	}
	if !u.IsActive {
		return User{}, "", time.Time{}, ErrInactive
	}
	expiresAt := time.Now().Add(SessionTTL).UTC()
	claims := SessionClaims{
		ID: u.ID, Email: u.Email, Name: u.Name, Role: u.Role, AvatarURL: u.AvatarURL,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.authSecret)
	if err != nil {
		return User{}, "", time.Time{}, fmt.Errorf("assinar jwt: %w", err)
	}
	return u, signed, expiresAt, nil
}

// Verify parses the cookie JWT and returns the user (reloaded from DB).
func (s *Service) Verify(ctx context.Context, r *http.Request) (User, error) {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil || cookie == nil || cookie.Value == "" {
		return User{}, ErrInvalidCreds
	}
	claims := &SessionClaims{}
	tok, err := jwt.ParseWithClaims(cookie.Value, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metodo inesperado: %v", t.Header["alg"])
		}
		return s.authSecret, nil
	})
	if err != nil || !tok.Valid {
		return User{}, ErrInvalidCreds
	}
	u, err := s.findByID(ctx, claims.ID)
	if err != nil {
		return User{}, err
	}
	if !u.IsActive {
		return User{}, ErrInactive
	}
	return u, nil
}

func (s *Service) issueCookie(w http.ResponseWriter, signed string, expiresAt time.Time) {
	secure := strings.EqualFold(os.Getenv("AUTH_COOKIE_SECURE"), "true")
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    signed,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(SessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Service) clearCookie(w http.ResponseWriter) {
	secure := strings.EqualFold(os.Getenv("AUTH_COOKIE_SECURE"), "true")
	http.SetCookie(w, &http.Cookie{
		Name: SessionCookieName, Value: "", Path: "/",
		MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode,
	})
}

// --- HTTP handlers ---

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResp struct {
	ExpiresAt string `json:"expiresAt"`
	User      pubUser `json:"user"`
}

type pubUser struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatarUrl"`
}

func pub(u User) pubUser {
	return pubUser{ID: u.ID, Email: u.Email, Name: u.Name, Role: u.Role, AvatarURL: u.AvatarURL}
}

func (s *Service) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method Not Allowed"})
		return
	}
	var body loginReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	u, signed, expiresAt, err := s.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCreds) || errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Email ou senha invalidos."})
			return
		}
		if errors.Is(err, ErrInactive) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Forbidden", "message": "Usuario inativo."})
			return
		}
		log.Println("[auth] login erro:", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	s.issueCookie(w, signed, expiresAt)
	writeJSON(w, http.StatusOK, authResp{ExpiresAt: expiresAt.Format(time.RFC3339), User: pub(u)})
}

func (s *Service) HandleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method Not Allowed"})
		return
	}
	u, err := s.Verify(r.Context(), r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]pubUser{"user": pub(u)})
}

func (s *Service) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method Not Allowed"})
		return
	}
	s.clearCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Require e o middleware que injeta o usuario autenticado no contexto.
type ctxKey string

const userCtxKey ctxKey = "auth.user"

func (s *Service) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, err := s.Verify(r.Context(), r)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
			return
		}
		ctx := context.WithValue(r.Context(), userCtxKey, u)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAdmin exige que o usuario autenticado seja admin.
func (s *Service) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := r.Context().Value(userCtxKey).(User)
		if !ok || u.Role != "admin" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Forbidden", "message": "Acesso restrito a administradores."})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func FromContext(ctx context.Context) (User, bool) {
	u, ok := ctx.Value(userCtxKey).(User)
	return u, ok
}

// Helpers de comparacao constant-time para evitar timing attacks (irrelevante para 2 users, mas ok)
func ctEqual(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}