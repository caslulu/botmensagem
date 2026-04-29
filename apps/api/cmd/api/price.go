package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	stddraw "image/draw"
	"image/png"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
)

type generatePriceInput struct {
	FormType    string         `json:"formType"`
	Seguradora  string         `json:"seguradora"`
	Idioma      string         `json:"idioma"`
	TaxaCotacao any            `json:"taxaCotacao"`
	CardID      string         `json:"cardId"`
	Campos      map[string]any `json:"campos"`
}

type saveQuoteInput struct {
	CardID    string         `json:"cardId"`
	Payload   map[string]any `json:"payload"`
	Processed map[string]any `json:"processed"`
}

type quoteOption struct {
	ID          string         `json:"id"`
	CardID      *string        `json:"cardId"`
	Label       string         `json:"label"`
	Title       string         `json:"title"`
	Payload     map[string]any `json:"payload"`
	LatestPrice *quotePrice    `json:"latestPrice"`
	UpdatedAt   string         `json:"updatedAt"`
}

type overlayEntry struct {
	Text     string
	X        int
	Y        int
	Size     float64
	Color    string
	Align    string
	MaxWidth float64
}

func (a *App) handleListQuotes(w http.ResponseWriter, r *http.Request) error {
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, title, payload, updated_at
		FROM kanban_cards
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	quotes := []quoteOption{}
	for rows.Next() {
		var id, title string
		var payloadBytes []byte
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &payloadBytes, &updatedAt); err != nil {
			return err
		}
		cardID := id
		latest, err := a.latestPriceForCard(r.Context(), id)
		if err != nil {
			return err
		}
		quotes = append(quotes, quoteOption{
			ID:          id,
			CardID:      &cardID,
			Label:       title,
			Title:       title,
			Payload:     jsonMap(payloadBytes),
			LatestPrice: latest,
			UpdatedAt:   isoTime(updatedAt),
		})
	}
	if err := rows.Err(); err != nil {
		return err
	}

	manualRows, err := a.db.QueryContext(r.Context(), `
		SELECT id, card_id, payload, processed, created_at, updated_at
		FROM quote_prices
		WHERE card_id IS NULL
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return err
	}
	defer manualRows.Close()
	for manualRows.Next() {
		price, err := scanQuote(manualRows)
		if err != nil {
			return err
		}
		title := manualQuoteTitle(price.Payload)
		quotes = append(quotes, quoteOption{
			ID:          price.ID,
			CardID:      nil,
			Label:       title,
			Title:       title,
			Payload:     price.Payload,
			LatestPrice: &price,
			UpdatedAt:   price.UpdatedAt,
		})
	}
	if err := manualRows.Err(); err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, map[string]any{"quotes": quotes})
	return nil
}

func manualQuoteTitle(payload map[string]any) string {
	if campos, ok := payload["campos"].(map[string]any); ok {
		if name := readString(campos["nome"]); name != "" {
			return name
		}
	}
	if name := readString(payload["nome"]); name != "" {
		return name
	}
	return "Cotacao manual"
}

func (a *App) handleSaveQuote(w http.ResponseWriter, r *http.Request) error {
	var input saveQuoteInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if input.Payload == nil {
		return appErr(http.StatusBadRequest, "Payload obrigatorio.")
	}
	cardID := strings.TrimSpace(input.CardID)
	var cardIDPtr *string
	if cardID != "" {
		if err := a.ensureCardExists(r.Context(), cardID); err != nil {
			return err
		}
		cardIDPtr = &cardID
	}
	if input.Processed == nil {
		input.Processed = map[string]any{}
	}
	quote, err := a.createQuotePrice(r.Context(), cardIDPtr, input.Payload, input.Processed)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"quote": quote})
	return nil
}

func (a *App) handleGeneratePrice(w http.ResponseWriter, r *http.Request) error {
	var input generatePriceInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	if input.FormType != "quitado" && input.FormType != "financiado" {
		return appErr(http.StatusBadRequest, "Tipo invalido.")
	}
	if strings.TrimSpace(input.Seguradora) == "" {
		return appErr(http.StatusBadRequest, "Seguradora obrigatoria.")
	}
	if input.Campos == nil {
		return appErr(http.StatusBadRequest, "Campos obrigatorios.")
	}
	cardID := strings.TrimSpace(input.CardID)
	var cardIDPtr *string
	if cardID != "" {
		if err := a.ensureCardExists(r.Context(), cardID); err != nil {
			return err
		}
		cardIDPtr = &cardID
	}

	language := normalizeLanguage(input.Idioma)
	tax := input.TaxaCotacao
	if tax == nil {
		tax = float64(320)
	}
	var processed map[string]any
	var overlays []overlayEntry
	if input.FormType == "quitado" {
		processed = processQuitado(input.Campos, tax)
		overlays = quitadoOverlay(input.Seguradora, processed)
	} else {
		processed = processFinanciado(input.Campos, tax)
		overlays = financiadoOverlay(input.Seguradora, processed)
	}

	templatePath := a.pickPriceTemplate(input.FormType, language)
	outputPath, fileName, err := a.renderPriceImage(templatePath, overlays, input.FormType, language)
	if err != nil {
		return err
	}
	file, err := a.createFileAsset(r.Context(), "price", fileName, "image/png", outputPath, cardIDPtr)
	if err != nil {
		return err
	}

	var quote *quotePrice
	if cardIDPtr != nil {
		payload := map[string]any{
			"formType":    input.FormType,
			"seguradora":  input.Seguradora,
			"idioma":      language,
			"taxaCotacao": firstTax(input.TaxaCotacao),
			"campos":      input.Campos,
		}
		created, err := a.createQuotePrice(r.Context(), cardIDPtr, payload, processed)
		if err != nil {
			return err
		}
		quote = &created
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"fileId":         file.ID,
		"filename":       file.Filename,
		"downloadUrl":    file.DownloadURL,
		"attachedCardId": cardIDPtr,
		"processed":      processed,
		"quotePrice":     quote,
	})
	return nil
}

func (a *App) ensureCardExists(ctx context.Context, cardID string) error {
	var id string
	err := a.db.QueryRowContext(ctx, `SELECT id FROM kanban_cards WHERE id = $1`, cardID).Scan(&id)
	if err == sql.ErrNoRows {
		return appErr(http.StatusNotFound, "Cotacao selecionada nao encontrada.")
	}
	return err
}

func (a *App) createQuotePrice(ctx context.Context, cardID *string, payload map[string]any, processed map[string]any) (quotePrice, error) {
	payloadBytes, _ := json.Marshal(payload)
	processedBytes, _ := json.Marshal(processed)
	id := uuid.NewString()
	return scanQuote(a.db.QueryRowContext(ctx, `
		INSERT INTO quote_prices (id, card_id, payload, processed, created_at, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, card_id, payload, processed, created_at, updated_at
	`, id, cardID, payloadBytes, processedBytes))
}

func processQuitado(payload map[string]any, taxValue any) map[string]any {
	tax := parseCurrency(taxValue)
	return map[string]any{
		"nome":                 readString(payload["nome"]),
		"entrada_basico":       formatWithComma(parseCurrency(payload["entrada_basico"]) + tax),
		"mensal_basico":        readString(payload["mensal_basico"]),
		"valor_total_basico":   formatWithComma(parseCurrency(payload["valor_total_basico"]) + tax),
		"entrada_completo":     formatWithComma(parseCurrency(payload["entrada_completo"]) + tax),
		"mensal_completo":      readString(payload["mensal_completo"]),
		"valor_total_completo": formatWithComma(parseCurrency(payload["valor_total_completo"]) + tax),
	}
}

func processFinanciado(payload map[string]any, taxValue any) map[string]any {
	tax := parseCurrency(taxValue)
	return map[string]any{
		"nome":                 readString(payload["nome"]),
		"entrada_completo":     formatWithComma(parseCurrency(payload["entrada_completo"]) + tax),
		"mensal_completo":      readString(payload["mensal_completo"]),
		"valor_total_completo": formatWithComma(parseCurrency(payload["valor_total_completo"]) + tax),
	}
}

func firstTax(value any) any {
	if value == nil || readString(value) == "" {
		return 320
	}
	return value
}

func normalizeLanguage(value string) string {
	switch strings.ToLower(value) {
	case "en", "es", "pt":
		return strings.ToLower(value)
	default:
		return "pt"
	}
}

func (a *App) pickPriceTemplate(formType, language string) string {
	assetDir := filepath.Join(a.cfg.AssetsDir, "price")
	if formType == "quitado" {
		switch language {
		case "en":
			return filepath.Join(assetDir, "images", "basico_en.png")
		case "es":
			return filepath.Join(assetDir, "images", "basico_es.png")
		default:
			return filepath.Join(assetDir, "images", "basico.png")
		}
	}
	switch language {
	case "en":
		return filepath.Join(assetDir, "images", "full_en.png")
	case "es":
		return filepath.Join(assetDir, "images", "full_es.png")
	default:
		return filepath.Join(assetDir, "images", "full.png")
	}
}

func (a *App) renderPriceImage(templatePath string, overlays []overlayEntry, formType, language string) (string, string, error) {
	templateFile, err := os.Open(templatePath)
	if err != nil {
		return "", "", err
	}
	defer templateFile.Close()
	base, _, err := image.Decode(templateFile)
	if err != nil {
		return "", "", err
	}
	bounds := base.Bounds()
	canvas := image.NewRGBA(bounds)
	stddraw.Draw(canvas, bounds, base, bounds.Min, stddraw.Src)

	fontPath := filepath.Join(a.cfg.AssetsDir, "price", "fonts", "fonte.otf")
	fontBytes, _ := os.ReadFile(fontPath)
	var parsedFont *opentype.Font
	if len(fontBytes) > 0 {
		parsedFont, _ = opentype.Parse(fontBytes)
	}
	for _, entry := range overlays {
		drawOverlayText(canvas, parsedFont, entry)
	}

	fileName := sanitizeFileName(formType + "-" + language + "-" + fileTimestamp() + ".png")
	outputPath := filepath.Join(a.cfg.GeneratedDir, fileName)
	out, err := os.Create(outputPath)
	if err != nil {
		return "", "", err
	}
	defer out.Close()
	if err := png.Encode(out, canvas); err != nil {
		return "", "", err
	}
	return outputPath, fileName, nil
}

func drawOverlayText(canvas *image.RGBA, parsedFont *opentype.Font, entry overlayEntry) {
	text := strings.TrimSpace(entry.Text)
	if text == "" {
		return
	}
	size := entry.Size
	if size <= 0 {
		size = 48
	}
	face := newFontFace(parsedFont, size)
	if entry.MaxWidth > 0 {
		for measureText(face, text) > entry.MaxWidth && size > 10 {
			size -= 2
			face = newFontFace(parsedFont, size)
		}
	}
	col := parseHexColor(entry.Color)
	width := measureText(face, text)
	x := fixed.I(entry.X)
	if entry.Align == "center" {
		x -= fixed.I(int(width / 2))
	} else if entry.Align == "right" || entry.Align == "end" {
		x -= fixed.I(int(width))
	}
	y := fixed.I(entry.Y) + face.Metrics().Ascent
	d := &font.Drawer{
		Dst:  canvas,
		Src:  image.NewUniform(col),
		Face: face,
		Dot:  fixed.Point26_6{X: x, Y: y},
	}
	d.DrawString(text)
}

func newFontFace(parsedFont *opentype.Font, size float64) font.Face {
	if parsedFont == nil {
		return basicfont.Face7x13
	}
	face, err := opentype.NewFace(parsedFont, &opentype.FaceOptions{Size: size, DPI: 72, Hinting: font.HintingFull})
	if err != nil {
		return basicfont.Face7x13
	}
	return face
}

func measureText(face font.Face, text string) float64 {
	return float64((&font.Drawer{Face: face}).MeasureString(text)) / 64
}

func parseHexColor(value string) color.Color {
	value = strings.TrimPrefix(strings.TrimSpace(value), "#")
	if len(value) != 6 {
		return color.White
	}
	var r, g, b uint8
	_, _ = fmt.Sscanf(value, "%02x%02x%02x", &r, &g, &b)
	return color.RGBA{R: r, G: g, B: b, A: 255}
}

func fileTimestamp() string {
	value := time.Now().UTC().Format(time.RFC3339Nano)
	replacer := strings.NewReplacer(":", "-", ".", "-")
	return replacer.Replace(value)
}

func quitadoOverlay(seguradora string, processed map[string]any) []overlayEntry {
	y := 15
	return []overlayEntry{
		{Text: seguradora, X: 500, Y: 543 + y, Size: 40, Color: "#ffffff", Align: "center"},
		{Text: seguradora, X: 1150, Y: 543 + y, Size: 40, Color: "#ffffff", Align: "center"},
		{Text: readString(processed["entrada_basico"]), X: 530, Y: 1375 + y, Size: 55, Color: "#000000", Align: "center"},
		{Text: readString(processed["mensal_basico"]), X: 540, Y: 1525 + y, Size: 45, Color: "#000000", Align: "center"},
		{Text: readString(processed["valor_total_basico"]), X: 510, Y: 1655 + y, Size: 55, Color: "#000000", Align: "center"},
		{Text: readString(processed["entrada_completo"]), X: 1200, Y: 1375 + y, Size: 55, Color: "#000000", Align: "center"},
		{Text: readString(processed["mensal_completo"]), X: 1200, Y: 1520 + y, Size: 45, Color: "#000000", Align: "center"},
		{Text: readString(processed["valor_total_completo"]), X: 1180, Y: 1655 + y, Size: 55, Color: "#000000", Align: "center"},
		{Text: readString(processed["nome"]), X: 490, Y: 1890 + y, Size: 45, Color: "#ffffff", Align: "left"},
	}
}

func financiadoOverlay(seguradora string, processed map[string]any) []overlayEntry {
	y := 15
	return []overlayEntry{
		{Text: seguradora, X: 900, Y: 552 + y, Size: 40, Color: "#ffffff", Align: "center", MaxWidth: 400},
		{Text: readString(processed["entrada_completo"]), X: 960, Y: 1400 + y, Size: 55, Color: "#000000", Align: "center", MaxWidth: 350},
		{Text: readString(processed["mensal_completo"]), X: 960, Y: 1545 + y, Size: 45, Color: "#000000", Align: "center", MaxWidth: 350},
		{Text: readString(processed["valor_total_completo"]), X: 960, Y: 1695 + y, Size: 55, Color: "#000000", Align: "center", MaxWidth: 350},
		{Text: readString(processed["nome"]), X: 490, Y: 1908 + y, Size: 45, Color: "#ffffff", Align: "left", MaxWidth: 800},
	}
}
