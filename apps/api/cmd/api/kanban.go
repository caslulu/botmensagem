package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
)

var defaultColumns = []string{"Cotações para fazer", "Em cotação", "Pronto"}

type columnInput struct {
	Title    *string `json:"title"`
	Position *int    `json:"position"`
}

type cardInput struct {
	ColumnID string         `json:"columnId"`
	Title    string         `json:"title"`
	Payload  map[string]any `json:"payload"`
}

type moveCardInput struct {
	ColumnID string `json:"columnId"`
	Position int    `json:"position"`
}

func (a *App) ensureDefaultColumns(ctx context.Context) ([]kanbanColumn, error) {
	columns, err := a.listColumns(ctx)
	if err != nil {
		return nil, err
	}
	if len(columns) > 0 {
		return columns, nil
	}
	for position, title := range defaultColumns {
		if _, err := a.db.ExecContext(ctx, `
			INSERT INTO kanban_columns (id, title, position, created_at, updated_at)
			VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, uuid.NewString(), title, position); err != nil {
			return nil, err
		}
	}
	return a.listColumns(ctx)
}

func (a *App) listColumns(ctx context.Context) ([]kanbanColumn, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, title, position, created_at, updated_at
		FROM kanban_columns
		ORDER BY position ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []kanbanColumn
	for rows.Next() {
		column, err := scanColumn(rows)
		if err != nil {
			return nil, err
		}
		columns = append(columns, column)
	}
	return columns, rows.Err()
}

func scanColumn(row scanner) (kanbanColumn, error) {
	var column kanbanColumn
	if err := row.Scan(&column.ID, &column.Title, &column.Position, &column.createdTime, &column.updatedTime); err != nil {
		return kanbanColumn{}, err
	}
	column.CreatedAt = isoTime(column.createdTime)
	column.UpdatedAt = isoTime(column.updatedTime)
	return column, nil
}

func scanCard(row scanner) (kanbanCard, error) {
	var card kanbanCard
	var payload []byte
	if err := row.Scan(&card.ID, &card.ColumnID, &card.Title, &card.Description, &payload, &card.Position, &card.createdTime, &card.updatedTime); err != nil {
		return kanbanCard{}, err
	}
	card.Payload = jsonMap(payload)
	card.CreatedAt = isoTime(card.createdTime)
	card.UpdatedAt = isoTime(card.updatedTime)
	return card, nil
}

func scanQuote(row scanner) (quotePrice, error) {
	var quote quotePrice
	var cardID sql.NullString
	var payload []byte
	var processed []byte
	if err := row.Scan(&quote.ID, &cardID, &payload, &processed, &quote.createdTime, &quote.updatedTime); err != nil {
		return quotePrice{}, err
	}
	if cardID.Valid {
		quote.CardID = &cardID.String
	}
	quote.Payload = jsonMap(payload)
	quote.Processed = jsonMap(processed)
	quote.CreatedAt = isoTime(quote.createdTime)
	quote.UpdatedAt = isoTime(quote.updatedTime)
	return quote, nil
}

func (a *App) handleGetBoard(w http.ResponseWriter, r *http.Request) error {
	columns, err := a.ensureDefaultColumns(r.Context())
	if err != nil {
		return err
	}
	for i := range columns {
		cards, err := a.listCardsForColumn(r.Context(), columns[i].ID)
		if err != nil {
			return err
		}
		columns[i].Cards = cards
	}
	writeJSON(w, http.StatusOK, map[string]any{"columns": columns})
	return nil
}

func (a *App) listCardsForColumn(ctx context.Context, columnID string) ([]kanbanCard, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, column_id, title, description, payload, position, created_at, updated_at
		FROM kanban_cards
		WHERE column_id = $1
		ORDER BY position ASC
	`, columnID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cards []kanbanCard
	for rows.Next() {
		card, err := scanCard(rows)
		if err != nil {
			return nil, err
		}
		files, err := a.listFilesForCard(ctx, card.ID)
		if err != nil {
			return nil, err
		}
		card.Files = files
		latest, err := a.latestPriceForCard(ctx, card.ID)
		if err != nil {
			return nil, err
		}
		card.LatestPrice = latest
		cards = append(cards, card)
	}
	return cards, rows.Err()
}

func (a *App) listFilesForCard(ctx context.Context, cardID string) ([]fileAsset, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, card_id, kind, filename, mime_type, path, created_at, updated_at
		FROM file_assets
		WHERE card_id = $1
		ORDER BY created_at DESC
	`, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []fileAsset
	for rows.Next() {
		file, err := scanFileAsset(rows)
		if err != nil {
			return nil, err
		}
		files = append(files, a.withFileURLs(file))
	}
	return files, rows.Err()
}

func (a *App) latestPriceForCard(ctx context.Context, cardID string) (*quotePrice, error) {
	quote, err := scanQuote(a.db.QueryRowContext(ctx, `
		SELECT id, card_id, payload, processed, created_at, updated_at
		FROM quote_prices
		WHERE card_id = $1
		ORDER BY updated_at DESC
		LIMIT 1
	`, cardID))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &quote, nil
}

func (a *App) handleCreateColumn(w http.ResponseWriter, r *http.Request) error {
	var input columnInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if input.Title == nil || strings.TrimSpace(*input.Title) == "" {
		return appErr(http.StatusBadRequest, "Titulo obrigatorio.")
	}
	var max sql.NullInt64
	if err := a.db.QueryRowContext(r.Context(), `SELECT MAX(position) FROM kanban_columns`).Scan(&max); err != nil {
		return err
	}
	position := int(max.Int64) + 1
	if !max.Valid {
		position = 0
	}
	column, err := scanColumn(a.db.QueryRowContext(r.Context(), `
		INSERT INTO kanban_columns (id, title, position, created_at, updated_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, title, position, created_at, updated_at
	`, uuid.NewString(), strings.TrimSpace(*input.Title), position))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, column)
	return nil
}

func (a *App) handleUpdateColumn(w http.ResponseWriter, r *http.Request, id string) error {
	var input columnInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if _, err := a.getColumn(r.Context(), id); err != nil {
		return err
	}
	if input.Title != nil {
		if _, err := a.db.ExecContext(r.Context(), `UPDATE kanban_columns SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, strings.TrimSpace(*input.Title), id); err != nil {
			return err
		}
	}
	if input.Position != nil {
		if err := a.reorderColumns(r.Context(), id, *input.Position); err != nil {
			return err
		}
	}
	column, err := a.getColumn(r.Context(), id)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, column)
	return nil
}

func (a *App) getColumn(ctx context.Context, id string) (kanbanColumn, error) {
	column, err := scanColumn(a.db.QueryRowContext(ctx, `SELECT id, title, position, created_at, updated_at FROM kanban_columns WHERE id = $1`, id))
	if err == sql.ErrNoRows {
		return kanbanColumn{}, appErr(http.StatusNotFound, "Coluna nao encontrada.")
	}
	return column, err
}

func (a *App) handleDeleteColumn(w http.ResponseWriter, r *http.Request, id string) error {
	var count int
	if err := a.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM kanban_cards WHERE column_id = $1`, id).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return appErr(http.StatusConflict, "A coluna precisa estar vazia antes de ser removida.")
	}
	result, err := a.db.ExecContext(r.Context(), `DELETE FROM kanban_columns WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return appErr(http.StatusNotFound, "Coluna nao encontrada.")
	}
	if err := a.normalizeColumnPositions(r.Context()); err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	return nil
}

func (a *App) handleCreateCard(w http.ResponseWriter, r *http.Request, actor AuthUser) error {
	var input cardInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if input.Payload == nil {
		return appErr(http.StatusBadRequest, "Payload obrigatorio.")
	}
	columns, err := a.ensureDefaultColumns(r.Context())
	if err != nil {
		return err
	}
	columnID := strings.TrimSpace(input.ColumnID)
	if columnID == "" {
		columnID = columns[0].ID
	}
	if _, err := a.getColumn(r.Context(), columnID); err != nil {
		return err
	}
	var max sql.NullInt64
	if err := a.db.QueryRowContext(r.Context(), `SELECT MAX(position) FROM kanban_cards WHERE column_id = $1`, columnID).Scan(&max); err != nil {
		return err
	}
	position := int(max.Int64) + 1
	if !max.Valid {
		position = 0
	}
	payloadMap := withCreatorLabel(input.Payload, actor.Name)
	payload, _ := json.Marshal(payloadMap)
	card, err := scanCard(a.db.QueryRowContext(r.Context(), `
		INSERT INTO kanban_cards (id, column_id, title, description, payload, position, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, column_id, title, description, payload, position, created_at, updated_at
	`, uuid.NewString(), columnID, titleFromPayload(payloadMap, input.Title), buildCardDescription(payloadMap), payload, position))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, card)
	return nil
}

func (a *App) handleUpdateCard(w http.ResponseWriter, r *http.Request, id string) error {
	var input cardInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	current, err := a.getCard(r.Context(), id)
	if err != nil {
		return err
	}
	payloadMap := input.Payload
	if payloadMap == nil {
		payloadMap = current.Payload
	}
	payload, _ := json.Marshal(payloadMap)
	title := titleFromPayload(payloadMap, firstNonEmpty(input.Title, current.Title))
	card, err := scanCard(a.db.QueryRowContext(r.Context(), `
		UPDATE kanban_cards
		SET title = $1, description = $2, payload = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING id, column_id, title, description, payload, position, created_at, updated_at
	`, title, buildCardDescription(payloadMap), payload, id))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, card)
	return nil
}

func (a *App) getCard(ctx context.Context, id string) (kanbanCard, error) {
	card, err := scanCard(a.db.QueryRowContext(ctx, `
		SELECT id, column_id, title, description, payload, position, created_at, updated_at
		FROM kanban_cards
		WHERE id = $1
	`, id))
	if err == sql.ErrNoRows {
		return kanbanCard{}, appErr(http.StatusNotFound, "Card nao encontrado.")
	}
	return card, err
}

func (a *App) handleMoveCard(w http.ResponseWriter, r *http.Request, id string) error {
	var input moveCardInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if input.ColumnID == "" {
		return appErr(http.StatusBadRequest, "Coluna obrigatoria.")
	}
	card, err := a.getCard(r.Context(), id)
	if err != nil {
		return err
	}
	if _, err := a.getColumn(r.Context(), input.ColumnID); err != nil {
		return err
	}

	targetCards, err := a.cardsForMove(r.Context(), input.ColumnID, id)
	if err != nil {
		return err
	}
	targetPosition := input.Position
	if targetPosition < 0 {
		targetPosition = 0
	}
	if targetPosition > len(targetCards) {
		targetPosition = len(targetCards)
	}
	targetCards = append(targetCards, kanbanCard{})
	copy(targetCards[targetPosition+1:], targetCards[targetPosition:])
	targetCards[targetPosition] = card

	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		return err
	}
	for position, item := range targetCards {
		if _, err := tx.ExecContext(r.Context(), `UPDATE kanban_cards SET column_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, input.ColumnID, position, item.ID); err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	if card.ColumnID != input.ColumnID {
		sourceCards, err := a.cardsForMoveTx(r.Context(), tx, card.ColumnID, id)
		if err != nil {
			_ = tx.Rollback()
			return err
		}
		for position, item := range sourceCards {
			if _, err := tx.ExecContext(r.Context(), `UPDATE kanban_cards SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, position, item.ID); err != nil {
				_ = tx.Rollback()
				return err
			}
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	updated, err := a.getCard(r.Context(), id)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, updated)
	return nil
}

func (a *App) cardsForMove(ctx context.Context, columnID, exceptID string) ([]kanbanCard, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, column_id, title, description, payload, position, created_at, updated_at
		FROM kanban_cards
		WHERE column_id = $1 AND id <> $2
		ORDER BY position ASC
	`, columnID, exceptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCards(rows)
}

func (a *App) cardsForMoveTx(ctx context.Context, tx *sql.Tx, columnID, exceptID string) ([]kanbanCard, error) {
	rows, err := tx.QueryContext(ctx, `
		SELECT id, column_id, title, description, payload, position, created_at, updated_at
		FROM kanban_cards
		WHERE column_id = $1 AND id <> $2
		ORDER BY position ASC
	`, columnID, exceptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCards(rows)
}

func scanCards(rows *sql.Rows) ([]kanbanCard, error) {
	var cards []kanbanCard
	for rows.Next() {
		card, err := scanCard(rows)
		if err != nil {
			return nil, err
		}
		cards = append(cards, card)
	}
	return cards, rows.Err()
}

func (a *App) handleDeleteCard(w http.ResponseWriter, r *http.Request, id string) error {
	card, err := a.getCard(r.Context(), id)
	if err != nil {
		return err
	}
	if err := a.deleteFilesForCard(r.Context(), id); err != nil {
		return err
	}
	if _, err := a.db.ExecContext(r.Context(), `DELETE FROM kanban_cards WHERE id = $1`, id); err != nil {
		return err
	}
	if err := a.normalizeCardPositions(r.Context(), card.ColumnID); err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	return nil
}

func (a *App) handleAttachFile(w http.ResponseWriter, r *http.Request, cardID string) error {
	if _, err := a.getCard(r.Context(), cardID); err != nil {
		return err
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024+1024)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		return appErr(http.StatusBadRequest, "Arquivo invalido.")
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		return appErr(http.StatusBadRequest, "Arquivo obrigatorio.")
	}
	_ = file.Close()
	mimeType := header.Header.Get("Content-Type")
	if !allowedAttachmentTypes[mimeType] {
		return appErr(http.StatusBadRequest, "Tipo de arquivo nao permitido.")
	}
	asset, err := a.saveMultipartFile(r.Context(), header, "attachment", &cardID, a.cfg.UploadsDir)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, asset)
	return nil
}

var allowedAttachmentTypes = map[string]bool{
	"image/png":       true,
	"image/jpeg":      true,
	"image/webp":      true,
	"application/pdf": true,
}

func (a *App) deleteFilesForCard(ctx context.Context, cardID string) error {
	rows, err := a.db.QueryContext(ctx, `SELECT path FROM file_assets WHERE card_id = $1`, cardID)
	if err != nil {
		return err
	}
	defer rows.Close()
	var paths []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return err
		}
		paths = append(paths, p)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if _, err := a.db.ExecContext(ctx, `DELETE FROM file_assets WHERE card_id = $1`, cardID); err != nil {
		return err
	}
	for _, p := range paths {
		if err := os.Remove(p); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}

func (a *App) reorderColumns(ctx context.Context, id string, targetPosition int) error {
	columns, err := a.listColumns(ctx)
	if err != nil {
		return err
	}
	var current kanbanColumn
	without := []kanbanColumn{}
	for _, column := range columns {
		if column.ID == id {
			current = column
		} else {
			without = append(without, column)
		}
	}
	if current.ID == "" {
		return nil
	}
	if targetPosition < 0 {
		targetPosition = 0
	}
	if targetPosition > len(without) {
		targetPosition = len(without)
	}
	without = append(without, kanbanColumn{})
	copy(without[targetPosition+1:], without[targetPosition:])
	without[targetPosition] = current

	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	for position, column := range without {
		if _, err := tx.ExecContext(ctx, `UPDATE kanban_columns SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, position, column.ID); err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (a *App) normalizeColumnPositions(ctx context.Context) error {
	columns, err := a.listColumns(ctx)
	if err != nil {
		return err
	}
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	for position, column := range columns {
		if _, err := tx.ExecContext(ctx, `UPDATE kanban_columns SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, position, column.ID); err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (a *App) normalizeCardPositions(ctx context.Context, columnID string) error {
	cards, err := a.cardsForMove(ctx, columnID, "")
	if err != nil {
		return err
	}
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	for position, card := range cards {
		if _, err := tx.ExecContext(ctx, `UPDATE kanban_cards SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, position, card.ID); err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func titleFromPayload(payload map[string]any, explicitTitle string) string {
	title := readString(explicitTitle, payload["nome"], payload["name"])
	if title == "" {
		return "Sem nome"
	}
	return title
}

func withCreatorLabel(payload map[string]any, creatorName string) map[string]any {
	base := map[string]any{}
	for key, value := range payload {
		base[key] = value
	}
	labels := labelsFromPayload(payload)
	creator := strings.TrimSpace(creatorName)
	if creator != "" {
		exists := false
		for _, label := range labels {
			if strings.EqualFold(label, creator) {
				exists = true
				break
			}
		}
		if !exists {
			labels = append(labels, creator)
		}
	}
	base["labels"] = labels
	return base
}

func labelsFromPayload(payload map[string]any) []string {
	raw, ok := payload["labels"]
	if !ok {
		return []string{}
	}
	values, ok := raw.([]any)
	if !ok {
		return []string{}
	}
	labels := make([]string, 0, len(values))
	for _, value := range values {
		label := strings.TrimSpace(readString(value))
		if label == "" {
			continue
		}
		duplicated := false
		for _, existing := range labels {
			if strings.EqualFold(existing, label) {
				duplicated = true
				break
			}
		}
		if !duplicated {
			labels = append(labels, label)
		}
	}
	return labels
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
