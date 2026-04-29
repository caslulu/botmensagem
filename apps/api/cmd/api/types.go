package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

type App struct {
	cfg    Config
	db     *sql.DB
	client *http.Client
}

type AuthUser struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatarUrl"`
}

type selectedUser struct {
	ID              string
	Email           string
	Name            string
	PasswordHash    string
	Role            string
	IsActive        bool
	AvatarPath      sql.NullString
	AvatarMimeType  sql.NullString
	AvatarUpdatedAt sql.NullTime
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type fileAsset struct {
	ID          string    `json:"id"`
	CardID      *string   `json:"cardId,omitempty"`
	Kind        string    `json:"kind"`
	Filename    string    `json:"filename"`
	MimeType    string    `json:"mimeType"`
	Path        string    `json:"path,omitempty"`
	CreatedAt   string    `json:"createdAt"`
	UpdatedAt   string    `json:"updatedAt"`
	DownloadURL string    `json:"downloadUrl,omitempty"`
	PreviewURL  string    `json:"previewUrl,omitempty"`
	createdTime time.Time `json:"-"`
	updatedTime time.Time `json:"-"`
}

type quotePrice struct {
	ID          string         `json:"id"`
	CardID      *string        `json:"cardId"`
	Payload     map[string]any `json:"payload"`
	Processed   map[string]any `json:"processed"`
	CreatedAt   string         `json:"createdAt"`
	UpdatedAt   string         `json:"updatedAt"`
	createdTime time.Time      `json:"-"`
	updatedTime time.Time      `json:"-"`
}

type kanbanCard struct {
	ID          string         `json:"id"`
	ColumnID    string         `json:"columnId"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Payload     map[string]any `json:"payload"`
	Position    int            `json:"position"`
	Files       []fileAsset    `json:"files,omitempty"`
	LatestPrice *quotePrice    `json:"latestPrice"`
	CreatedAt   string         `json:"createdAt"`
	UpdatedAt   string         `json:"updatedAt"`
	createdTime time.Time      `json:"-"`
	updatedTime time.Time      `json:"-"`
}

type kanbanColumn struct {
	ID          string       `json:"id"`
	Title       string       `json:"title"`
	Position    int          `json:"position"`
	Cards       []kanbanCard `json:"cards,omitempty"`
	CreatedAt   string       `json:"createdAt"`
	UpdatedAt   string       `json:"updatedAt"`
	createdTime time.Time    `json:"-"`
	updatedTime time.Time    `json:"-"`
}

func isoTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339Nano)
}

func jsonMap(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil || out == nil {
		return map[string]any{}
	}
	return out
}
