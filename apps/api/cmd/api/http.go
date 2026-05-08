package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type httpError struct {
	status  int
	message string
}

func (e httpError) Error() string {
	return e.message
}

func appErr(status int, message string) httpError {
	return httpError{status: status, message: message}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := "Erro interno."
	var httpErr httpError
	if errors.As(err, &httpErr) {
		status = httpErr.status
		message = httpErr.message
	}
	if status >= http.StatusInternalServerError {
		log.Printf("request error: %v", err)
	}
	writeJSON(w, status, map[string]any{
		"message": message,
		"error":   http.StatusText(status),
	})
}

func decodeJSON(r *http.Request, out any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(out); err != nil {
		return appErr(http.StatusBadRequest, "JSON invalido.")
	}
	return nil
}

func decodeJSONLoose(r *http.Request, out any) error {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(out); err != nil {
		return appErr(http.StatusBadRequest, "JSON invalido.")
	}
	return nil
}

func (a *App) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !a.applyCORS(w, r) {
		return
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if err := a.route(w, r); err != nil {
		writeError(w, err)
	}
}

func (a *App) applyCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	if !a.isAllowedOrigin(origin) {
		writeError(w, appErr(http.StatusForbidden, fmt.Sprintf("Origem nao permitida pelo CORS: %s", origin)))
		return false
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	return true
}

func (a *App) isAllowedOrigin(origin string) bool {
	for _, allowed := range strings.Split(a.cfg.WebOrigin, ",") {
		if strings.TrimSpace(allowed) == origin {
			return true
		}
	}
	local := regexp.MustCompile(`(?i)^https?://(localhost|127\.0\.0\.1)(:\d+)?$`)
	orb := regexp.MustCompile(`(?i)^https?://[^/]+\.orb\.local(?::\d+)?$`)
	return local.MatchString(origin) || orb.MatchString(origin)
}

func (a *App) route(w http.ResponseWriter, r *http.Request) error {
	parts := pathParts(r.URL.Path)
	if len(parts) == 1 && parts[0] == "health" && r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":        true,
			"service":   "botmensagem-web-api",
			"timestamp": isoTime(time.Now()),
		})
		return nil
	}
	if len(parts) == 2 && parts[0] == "auth" && parts[1] == "login" && r.Method == http.MethodPost {
		return a.handleLogin(w, r)
	}
	if len(parts) == 2 && parts[0] == "auth" && parts[1] == "logout" && r.Method == http.MethodPost {
		clearSessionCookie(w, a.cfg)
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return nil
	}

	user, err := a.authenticateRequest(r)
	if err != nil {
		return err
	}

	switch {
	case len(parts) == 2 && parts[0] == "auth" && parts[1] == "me" && r.Method == http.MethodGet:
		writeJSON(w, http.StatusOK, map[string]any{"user": user})
		return nil
	case len(parts) == 1 && parts[0] == "users" && r.Method == http.MethodGet:
		return a.requireAdmin(user, func() error { return a.handleListUsers(w, r) })
	case len(parts) == 1 && parts[0] == "users" && r.Method == http.MethodPost:
		return a.requireAdmin(user, func() error { return a.handleCreateUser(w, r) })
	case len(parts) == 2 && parts[0] == "users" && r.Method == http.MethodPatch:
		return a.requireAdmin(user, func() error { return a.handleUpdateUser(w, r, parts[1], user) })
	case len(parts) == 3 && parts[0] == "users" && parts[2] == "avatar" && r.Method == http.MethodGet:
		return a.handleGetAvatar(w, r, parts[1], user)
	case len(parts) == 1 && parts[0] == "profile" && r.Method == http.MethodPatch:
		return a.handleUpdateProfile(w, r, user)
	case len(parts) == 2 && parts[0] == "profile" && parts[1] == "password" && r.Method == http.MethodPatch:
		return a.handleChangePassword(w, r, user)
	case len(parts) == 2 && parts[0] == "profile" && parts[1] == "avatar" && r.Method == http.MethodPost:
		return a.handleUpdateAvatar(w, r, user)
	case len(parts) == 1 && parts[0] == "kanban" && r.Method == http.MethodGet:
		return a.handleGetBoard(w, r)
	case len(parts) == 2 && parts[0] == "kanban" && parts[1] == "columns" && r.Method == http.MethodPost:
		return a.handleCreateColumn(w, r)
	case len(parts) == 3 && parts[0] == "kanban" && parts[1] == "columns" && r.Method == http.MethodPatch:
		return a.handleUpdateColumn(w, r, parts[2])
	case len(parts) == 3 && parts[0] == "kanban" && parts[1] == "columns" && r.Method == http.MethodDelete:
		return a.handleDeleteColumn(w, r, parts[2])
	case len(parts) == 2 && parts[0] == "kanban" && parts[1] == "cards" && r.Method == http.MethodPost:
		return a.handleCreateCard(w, r, user)
	case len(parts) == 3 && parts[0] == "kanban" && parts[1] == "cards" && r.Method == http.MethodPatch:
		return a.handleUpdateCard(w, r, parts[2])
	case len(parts) == 4 && parts[0] == "kanban" && parts[1] == "cards" && parts[3] == "move" && r.Method == http.MethodPatch:
		return a.handleMoveCard(w, r, parts[2])
	case len(parts) == 3 && parts[0] == "kanban" && parts[1] == "cards" && r.Method == http.MethodDelete:
		return a.handleDeleteCard(w, r, parts[2])
	case len(parts) == 4 && parts[0] == "kanban" && parts[1] == "cards" && parts[3] == "attachments" && r.Method == http.MethodPost:
		return a.handleAttachFile(w, r, parts[2])
	case len(parts) == 3 && parts[0] == "files" && parts[2] == "download" && r.Method == http.MethodGet:
		return a.handleDownloadFile(w, r, parts[1], false)
	case len(parts) == 3 && parts[0] == "files" && parts[2] == "preview" && r.Method == http.MethodGet:
		return a.handleDownloadFile(w, r, parts[1], true)
	case len(parts) == 1 && parts[0] == "quotes" && r.Method == http.MethodGet:
		return a.handleListQuotes(w, r)
	case len(parts) == 1 && parts[0] == "quotes" && r.Method == http.MethodPost:
		return a.handleSaveQuote(w, r)
	case len(parts) == 2 && parts[0] == "price" && parts[1] == "generate" && r.Method == http.MethodPost:
		return a.handleGeneratePrice(w, r)
	case len(parts) == 2 && parts[0] == "rta" && parts[1] == "generate" && r.Method == http.MethodPost:
		return a.handleGenerateRTA(w, r)
	case len(parts) == 3 && parts[0] == "vehicles" && parts[1] == "vin" && r.Method == http.MethodGet:
		return a.handleDecodeVIN(w, r, parts[2])
	}

	return appErr(http.StatusNotFound, "Rota nao encontrada.")
}

func (a *App) requireAdmin(user AuthUser, fn func() error) error {
	if user.Role != "admin" {
		return appErr(http.StatusForbidden, "Acesso restrito.")
	}
	return fn()
}

func pathParts(path string) []string {
	cleaned := strings.Trim(path, "/")
	if cleaned == "" {
		return nil
	}
	return strings.Split(cleaned, "/")
}
