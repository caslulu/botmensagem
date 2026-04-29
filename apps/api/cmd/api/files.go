package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

func (a *App) createFileAsset(ctx context.Context, kind, filename, mimeType, absolutePath string, cardID *string) (fileAsset, error) {
	id := uuid.NewString()
	row := a.db.QueryRowContext(ctx, `
		INSERT INTO file_assets (id, card_id, kind, filename, mime_type, path, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, card_id, kind, filename, mime_type, path, created_at, updated_at
	`, id, cardID, kind, sanitizeFileName(filename), mimeType, filepath.Clean(absolutePath))
	file, err := scanFileAsset(row)
	if err != nil {
		return fileAsset{}, err
	}
	return a.withFileURLs(file), nil
}

func (a *App) getDownloadable(ctx context.Context, id string) (fileAsset, error) {
	file, err := scanFileAsset(a.db.QueryRowContext(ctx, `
		SELECT id, card_id, kind, filename, mime_type, path, created_at, updated_at
		FROM file_assets
		WHERE id = $1
	`, id))
	if err != nil {
		if err == sql.ErrNoRows {
			return fileAsset{}, appErr(http.StatusNotFound, "Arquivo nao encontrado.")
		}
		return fileAsset{}, err
	}
	if _, err := os.Stat(file.Path); err != nil {
		return fileAsset{}, appErr(http.StatusNotFound, "Arquivo nao encontrado.")
	}
	return file, nil
}

func scanFileAsset(row scanner) (fileAsset, error) {
	var file fileAsset
	var cardID sql.NullString
	if err := row.Scan(&file.ID, &cardID, &file.Kind, &file.Filename, &file.MimeType, &file.Path, &file.createdTime, &file.updatedTime); err != nil {
		return fileAsset{}, err
	}
	if cardID.Valid {
		file.CardID = &cardID.String
	}
	file.CreatedAt = isoTime(file.createdTime)
	file.UpdatedAt = isoTime(file.updatedTime)
	return file, nil
}

func (a *App) withFileURLs(file fileAsset) fileAsset {
	file.DownloadURL = a.cfg.PublicAPIURL + "/files/" + urlPathEscape(file.ID) + "/download"
	file.PreviewURL = a.cfg.PublicAPIURL + "/files/" + urlPathEscape(file.ID) + "/preview"
	return file
}

func (a *App) handleDownloadFile(w http.ResponseWriter, r *http.Request, id string, preview bool) error {
	file, err := a.getDownloadable(r.Context(), id)
	if err != nil {
		return err
	}
	w.Header().Set("Content-Type", file.MimeType)
	if preview {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, strings.ReplaceAll(filepath.Base(file.Filename), `"`, "")))
	} else {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"; filename*=UTF-8''%s`, strings.ReplaceAll(file.Filename, `"`, ""), url.QueryEscape(file.Filename)))
	}
	http.ServeFile(w, r, file.Path)
	return nil
}

func (a *App) saveMultipartFile(ctx context.Context, header *multipart.FileHeader, kind string, cardID *string, targetDir string) (fileAsset, error) {
	source, err := header.Open()
	if err != nil {
		return fileAsset{}, err
	}
	defer source.Close()

	safeName := sanitizeFileName(header.Filename)
	targetPath := filepath.Join(targetDir, uuid.NewString()+"-"+safeName)
	target, err := os.Create(targetPath)
	if err != nil {
		return fileAsset{}, err
	}
	defer target.Close()
	if _, err := io.Copy(target, source); err != nil {
		_ = os.Remove(targetPath)
		return fileAsset{}, err
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	return a.createFileAsset(ctx, kind, safeName, mimeType, targetPath, cardID)
}
