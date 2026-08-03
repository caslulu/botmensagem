package httperr

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Status  int    `json:"-"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (e *APIError) Write(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(e.Status)
	_ = json.NewEncoder(w).Encode(e)
}

func New(status int, code, message string) *APIError {
	return &APIError{Status: status, Error: code, Message: message}
}

func BadRequest(msg string) *APIError       { return New(http.StatusBadRequest, "Bad Request", msg) }
func Unauthorized(msg string) *APIError     { return New(http.StatusUnauthorized, "Unauthorized", msg) }
func Forbidden(msg string) *APIError        { return New(http.StatusForbidden, "Forbidden", msg) }
func NotFound(msg string) *APIError        { return New(http.StatusNotFound, "Not Found", msg) }
func Conflict(msg string) *APIError        { return New(http.StatusConflict, "Conflict", msg) }
func Internal(msg string) *APIError        { return New(http.StatusInternalServerError, "Internal Server Error", msg) }

// NotFoundRoute e o handler padrao para rotas inexistentes.
func NotFoundRoute(w http.ResponseWriter, r *http.Request) {
	New(http.StatusNotFound, "Not Found", "Rota nao encontrada.").Write(w)
}

// MethodNotAllowed responde 405.
func MethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	New(http.StatusMethodNotAllowed, "Method Not Allowed", "Metodo nao permitido.").Write(w)
}