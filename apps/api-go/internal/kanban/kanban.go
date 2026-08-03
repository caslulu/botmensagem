package kanban

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"botmensagem/api/internal/auth"
	"botmensagem/api/internal/httperr"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- modelos de saida ---

type Column struct {
	ID        string     `json:"id"`
	Title     string    `json:"title"`
	Position  int       `json:"position"`
	Cards     []*Card   `json:"cards"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Card struct {
	ID          string          `json:"id"`
	ColumnID    string          `json:"columnId"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Payload     json.RawMessage `json:"payload"`
	Position    int             `json:"position"`
	LatestPrice *QuotePrice     `json:"latestPrice"`
	Prices      []*QuotePrice   `json:"prices,omitempty"`
	Files       []*FileAsset    `json:"files,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type QuotePrice struct {
	ID        string          `json:"id"`
	CardID    *string         `json:"cardId,omitempty"`
	Payload   json.RawMessage `json:"payload"`
	Processed json.RawMessage `json:"processed"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type FileAsset struct {
	ID        string     `json:"id"`
	CardID    *string    `json:"cardId,omitempty"`
	Kind      string     `json:"kind"`
	Filename  string     `json:"filename"`
	MimeType  string     `json:"mimeType"`
	Path      string     `json:"path"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// --- helpers de leitura ---

func asString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	if b, err := json.Marshal(v); err == nil {
		s := string(b)
		if strings.HasPrefix(s, "\"") && strings.HasSuffix(s, "\"") {
			return s[1 : len(s)-1]
		}
		return s
	}
	return fmt.Sprintf("%v", v)
}

func asBool(v any) bool {
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return x == "true" || x == "1"
	case float64:
		return x == 1
	}
	return false
}

// getStr pega um campo string de um map JSON.
func getStr(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	return asString(v)
}

// getMap pega um submap de um map JSON.
func getMap(m map[string]any, key string) map[string]any {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	if mm, ok := v.(map[string]any); ok {
		return mm
	}
	return nil
}

// getList pega uma lista de maps de um map JSON.
func getList(m map[string]any, key string) []map[string]any {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	if arr, ok := v.([]any); ok {
		out := make([]map[string]any, 0, len(arr))
		for _, item := range arr {
			if mm, ok := item.(map[string]any); ok {
				out = append(out, mm)
			}
		}
		return out
	}
	return nil
}

// onlyAlnumLower retorna so letras/digitos em minusculo.
var nonAlnum = regexp.MustCompile(`[^a-zA-Z0-9]`)

func onlyAlnumLower(s string) string {
	return strings.ToLower(nonAlnum.ReplaceAllString(s, ""))
}

// lastN pega os ultimos n caracteres de s.
func lastN(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[len(s)-n:]
}

// formatBRLDate converte YYYY-MM-DD -> MM/DD/YYYY. Se nao bater, retorna o original.
func formatBRLDate(s string) string {
	s = strings.TrimSpace(s)
	if len(s) == 10 && s[4] == '-' && s[7] == '-' {
		return s[5:7] + "/" + s[8:10] + "/" + s[0:4]
	}
	return s
}

// dashIfEmpty troca string vazia por "-".
func dashIfEmpty(s string) string {
	if strings.TrimSpace(s) == "" {
		return "-"
	}
	return s
}

// deriveEmail gera o email sintetico igual a API original.
// Regra observada:
//   - se payload.email existir e nao for vazio, usa ele
//   - senao: base = apenas alfanum do nome lower (ou "arquivo" se nome vazio)
//            + ultimos 4 digitos do documento (ou vazio se nao tiver)
//            + "@outlook.com"
func deriveEmail(p map[string]any) string {
	if e := strings.TrimSpace(getStr(p, "email")); e != "" {
		return e
	}
	nome := strings.TrimSpace(getStr(p, "nome"))
	doc := strings.TrimSpace(getStr(p, "documento"))
	base := onlyAlnumLower(nome)
	if base == "" {
		base = "arquivo"
	}
	tail := ""
	// pegar so digitos do doc
	digits := regexp.MustCompile(`\d`).FindAllString(doc, -1)
	if len(digits) > 0 {
		joined := strings.Join(digits, "")
		tail = lastN(joined, 4)
	}
	return base + tail + "@outlook.com"
}

// deriveTitle gera o title do card igual a API original.
func deriveTitle(p map[string]any) string {
	nome := strings.TrimSpace(getStr(p, "nome"))
	if nome == "" {
		return "Sem nome"
	}
	return nome
}

// deriveDescription gera a description do card no formato da API original.
func deriveDescription(p map[string]any) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Documento: %s\n", dashIfEmpty(getStr(p, "documento")))
	fmt.Fprintf(&b, "Estado do Documento: %s\n", dashIfEmpty(getStr(p, "documento_estado")))
	fmt.Fprintf(&b, "Estado Civil: %s\n", dashIfEmpty(getStr(p, "estado_civil")))
	fmt.Fprintf(&b, "Genero: %s\n", dashIfEmpty(getStr(p, "genero")))
	rua := dashIfEmpty(getStr(p, "endereco_rua"))
	cidade := getStr(p, "endereco_cidade")
	estado := getStr(p, "endereco_estado")
	zip := getStr(p, "endereco_zipcode")
	if cidade == "" && estado == "" && zip == "" {
		fmt.Fprintf(&b, "Endereco: %s\n", rua)
	} else {
		fmt.Fprintf(&b, "Endereco: %s, %s - %s, %s\n", rua, dashIfEmpty(cidade), dashIfEmpty(estado), dashIfEmpty(zip))
	}
	fmt.Fprintf(&b, "Data de Nascimento: %s\n", dashIfEmpty(formatBRLDate(getStr(p, "data_nascimento"))))
	fmt.Fprintf(&b, "Tempo de Seguro: %s\n", dashIfEmpty(getStr(p, "tempo_de_seguro")))
	fmt.Fprintf(&b, "Tempo no Endereco: %s\n", dashIfEmpty(getStr(p, "tempo_no_endereco")))
	fmt.Fprintf(&b, "Email: %s\n", deriveEmail(p))

	veiculos := getList(p, "veiculos")
	if len(veiculos) > 0 {
		b.WriteString("\nVEICULOS:\n")
		for i, v := range veiculos {
			fmt.Fprintf(&b, "\nVeiculo %d:\n", i+1)
			fmt.Fprintf(&b, "   VIN: %s\n", dashIfEmpty(getStr(v, "vin")))
			fmt.Fprintf(&b, "   Placa: %s\n", dashIfEmpty(getStr(v, "placa")))
			veicStr := strings.TrimSpace(strings.Join([]string{
				getStr(v, "ano"), getStr(v, "marca"), getStr(v, "modelo"),
			}, " "))
			fmt.Fprintf(&b, "   Veiculo: %s\n", dashIfEmpty(veicStr))
			fmt.Fprintf(&b, "   Estado: %s\n", dashIfEmpty(getStr(v, "estado")))
			fmt.Fprintf(&b, "   Tempo com veiculo: %s\n", dashIfEmpty(getStr(v, "tempo_com_veiculo")))
		}
	}
	return b.String()
}

// injectLabels garante que payload.labels == [userName] (igual API original).
func injectLabels(p map[string]any, userName string) map[string]any {
	p["labels"] = []string{userName}
	return p
}

// normalizePayloadMap garante que o payload seja um map[string]any.
func normalizePayloadMap(raw json.RawMessage) (map[string]any, error) {
	if len(raw) == 0 {
		return map[string]any{}, nil
	}
	var p map[string]any
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, fmt.Errorf("payload nao e objeto: %w", err)
	}
	if p == nil {
		p = map[string]any{}
	}
	return p, nil
}

// --- queries ---

func (s *Service) firstColumnID(ctx context.Context) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM "kanban_columns" ORDER BY position ASC, created_at ASC LIMIT 1`).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNoColumns
		}
		return "", err
	}
	return id, nil
}

var ErrNoColumns = errors.New("nenhuma coluna existente")

func (s *Service) nextCardPosition(ctx context.Context, columnID string) (int, error) {
	var pos sql.NullInt64
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(MAX(position), -1) FROM "kanban_cards" WHERE column_id=$1`, columnID).Scan(&pos)
	if err != nil {
		return 0, err
	}
	return int(pos.Int64) + 1, nil
}

// --- handlers ---

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (s *Service) HandleBoard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method Not Allowed"})
		return
	}
	cols, err := s.loadBoard(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"columns": cols})
}

func (s *Service) loadBoard(ctx context.Context) ([]Column, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, title, position, created_at, updated_at FROM "kanban_columns" ORDER BY position ASC, created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cols []Column
	for rows.Next() {
		var c Column
		if err := rows.Scan(&c.ID, &c.Title, &c.Position, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.Cards = []*Card{}
		cols = append(cols, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(cols) == 0 {
		return cols, nil
	}
	// carregar cards
	cardRows, err := s.pool.Query(ctx,
		`SELECT id, column_id, title, description, payload, position, created_at, updated_at
		 FROM "kanban_cards" ORDER BY column_id, position ASC, created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer cardRows.Close()
	cardsByCol := map[string][]*Card{}
	for cardRows.Next() {
		var c Card
		if err := cardRows.Scan(&c.ID, &c.ColumnID, &c.Title, &c.Description, &c.Payload, &c.Position, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.LatestPrice = nil
		cardsByCol[c.ColumnID] = append(cardsByCol[c.ColumnID], &c)
	}
	if err := cardRows.Err(); err != nil {
		return nil, err
	}
	// carregar latestPrice por card (ultima quote_price de cada card)
	priceRows, err := s.pool.Query(ctx,
		`SELECT DISTINCT ON (card_id) card_id, id, payload, processed, created_at, updated_at
		 FROM "quote_prices" WHERE card_id IS NOT NULL
		 ORDER BY card_id, updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer priceRows.Close()
	latestByID := map[string]*QuotePrice{}
	for priceRows.Next() {
		var (
			cardID    string
			qp        QuotePrice
			processed []byte
		)
		if err := priceRows.Scan(&cardID, &qp.ID, &qp.Payload, &processed, &qp.CreatedAt, &qp.UpdatedAt); err != nil {
			return nil, err
		}
		qp.Processed = json.RawMessage(processed)
		latestByID[cardID] = &qp
	}
	for i := range cols {
		cards := cardsByCol[cols[i].ID]
		for _, c := range cards {
			if qp, ok := latestByID[c.ID]; ok {
				c.LatestPrice = qp
			}
		}
		cols[i].Cards = cards
		if cols[i].Cards == nil {
			cols[i].Cards = []*Card{}
		}
	}
	return cols, nil
}

// --- columns ---

type createColumnReq struct {
	Title string `json:"title"`
}

func (s *Service) HandleColumns(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.listColumns(w, r)
	case http.MethodPost:
		s.createColumn(w, r)
	default:
		httperr.MethodNotAllowed(w, r)
	}
}

func (s *Service) listColumns(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, title, position, created_at, updated_at FROM "kanban_columns" ORDER BY position ASC, created_at ASC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	defer rows.Close()
	var cols []Column
	for rows.Next() {
		var c Column
		if err := rows.Scan(&c.ID, &c.Title, &c.Position, &c.CreatedAt, &c.UpdatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
			return
		}
		c.Cards = []*Card{}
		cols = append(cols, c)
	}
	if cols == nil {
		cols = []Column{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"columns": cols})
}

func (s *Service) createColumn(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.FromContext(r.Context())
	var body createColumnReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httperr.BadRequest("Corpo invalido.").Write(w)
		return
	}
	title := strings.TrimSpace(body.Title)
	if title == "" {
		httperr.BadRequest("Titulo da coluna obrigatorio.").Write(w)
		return
	}
	var pos int
	if err := s.pool.QueryRow(r.Context(),
		`SELECT COALESCE(MAX(position), -1) FROM "kanban_columns"`).Scan(&pos); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	pos++
	id := uuid.NewString()
	now := time.Now().UTC()
	col := Column{ID: id, Title: title, Position: pos, Cards: []*Card{}, CreatedAt: now, UpdatedAt: now}
	_, err := s.pool.Exec(r.Context(),
		`INSERT INTO "kanban_columns" (id, title, position, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)`,
		id, title, pos, now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao criar coluna."})
		return
	}
	_ = u
	writeJSON(w, http.StatusOK, col)
}

func (s *Service) HandleColumnByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httperr.BadRequest("ID obrigatorio.").Write(w)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		s.updateColumn(w, r, id)
	case http.MethodDelete:
		s.deleteColumn(w, r, id)
	case http.MethodGet:
		s.getColumn(w, r, id)
	default:
		httperr.MethodNotAllowed(w, r)
	}
}

func (s *Service) getColumn(w http.ResponseWriter, r *http.Request, id string) {
	var c Column
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, title, position, created_at, updated_at FROM "kanban_columns" WHERE id=$1`, id).
		Scan(&c.ID, &c.Title, &c.Position, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httperr.NotFound("Coluna nao encontrada.").Write(w)
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	c.Cards = []*Card{}
	writeJSON(w, http.StatusOK, c)
}

type updateColumnReq struct {
	Title    *string `json:"title,omitempty"`
	Position *int    `json:"position,omitempty"`
}

func (s *Service) updateColumn(w http.ResponseWriter, r *http.Request, id string) {
	var body updateColumnReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httperr.BadRequest("Corpo invalido.").Write(w)
		return
	}
	now := time.Now().UTC()
	if body.Title != nil && *body.Title != "" {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "kanban_columns" SET title=$1, updated_at=$2 WHERE id=$3`,
			strings.TrimSpace(*body.Title), now, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar coluna."})
			return
		}
	}
	if body.Position != nil {
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE "kanban_columns" SET position=$1, updated_at=$2 WHERE id=$3`,
			*body.Position, now, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao mover coluna."})
			return
		}
	}
	// retornar coluna atualizada
	var c Column
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, title, position, created_at, updated_at FROM "kanban_columns" WHERE id=$1`, id).
		Scan(&c.ID, &c.Title, &c.Position, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	c.Cards = nil
	writeJSON(w, http.StatusOK, c)
}

func (s *Service) deleteColumn(w http.ResponseWriter, r *http.Request, id string) {
	// onDelete: Cascade nos cards. A API original so permite se vazia.
	var cardCount int
	if err := s.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM "kanban_cards" WHERE column_id=$1`, id).Scan(&cardCount); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	if cardCount > 0 {
		httperr.BadRequest("A coluna precisa estar vazia.").Write(w)
		return
	}
	ct, err := s.pool.Exec(r.Context(), `DELETE FROM "kanban_columns" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao excluir coluna."})
		return
	}
	if ct.RowsAffected() == 0 {
		httperr.NotFound("Coluna nao encontrada.").Write(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// --- cards ---

type createCardReq struct {
	ColumnID string          `json:"columnId"`
	Payload  json.RawMessage `json:"payload"`
}

func (s *Service) HandleCards(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httperr.MethodNotAllowed(w, r)
		return
	}
	u, _ := auth.FromContext(r.Context())
	var body createCardReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httperr.BadRequest("Corpo invalido.").Write(w)
		return
	}
	payload, err := normalizePayloadMap(body.Payload)
	if err != nil {
		httperr.BadRequest("Payload invalido.").Write(w)
		return
	}
	// injeta labels = [userName]
	injectLabels(payload, u.Name)
	// resolve columnId: vazio ou ausente -> primeira coluna
	colID := strings.TrimSpace(body.ColumnID)
	if colID == "" {
		colID, err = s.firstColumnID(r.Context())
		if err != nil {
			httperr.BadRequest("Informe columnId ou crie uma coluna primeiro.").Write(w)
			return
		}
	} else {
		// valida coluna
		var exists bool
		if err := s.pool.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM "kanban_columns" WHERE id=$1)`, colID).Scan(&exists); err != nil || !exists {
			httperr.BadRequest("Coluna nao encontrada.").Write(w)
			return
		}
	}
	title := deriveTitle(payload)
	description := deriveDescription(payload)
	payloadJSON, _ := json.Marshal(payload)
	pos, err := s.nextCardPosition(r.Context(), colID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	id := uuid.NewString()
	now := time.Now().UTC()
	card := Card{
		ID: id, ColumnID: colID, Title: title, Description: description,
		Payload: payloadJSON, Position: pos, LatestPrice: nil,
		CreatedAt: now, UpdatedAt: now,
	}
	if _, err := s.pool.Exec(r.Context(),
		`INSERT INTO "kanban_cards" (id, column_id, title, description, payload, position, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
		id, colID, title, description, payloadJSON, pos, now); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao criar card."})
		return
	}
	writeJSON(w, http.StatusOK, card)
}

func (s *Service) HandleCardByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httperr.BadRequest("ID obrigatorio.").Write(w)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		s.updateCard(w, r, id)
	case http.MethodDelete:
		s.deleteCard(w, r, id)
	default:
		httperr.MethodNotAllowed(w, r)
	}
}

type updateCardReq struct {
	Payload  json.RawMessage `json:"payload,omitempty"`
	ColumnID *string         `json:"columnId,omitempty"`
	Position *int            `json:"position,omitempty"`
}

func (s *Service) updateCard(w http.ResponseWriter, r *http.Request, id string) {
	u, _ := auth.FromContext(r.Context())
	var body updateCardReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httperr.BadRequest("Corpo invalido.").Write(w)
		return
	}
	now := time.Now().UTC()
	// recupera card atual
	var (
		curColID    string
		curPayload  []byte
	)
	err := s.pool.QueryRow(r.Context(),
		`SELECT column_id, payload FROM "kanban_cards" WHERE id=$1`, id).Scan(&curColID, &curPayload)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httperr.NotFound("Card nao encontrado.").Write(w)
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	// move? (columnId + position)
	if body.ColumnID != nil {
		newCol := strings.TrimSpace(*body.ColumnID)
		if newCol != "" {
			var exists bool
			if err := s.pool.QueryRow(r.Context(),
				`SELECT EXISTS(SELECT 1 FROM "kanban_columns" WHERE id=$1)`, newCol).Scan(&exists); err != nil || !exists {
				httperr.BadRequest("Coluna de destino nao encontrada.").Write(w)
				return
			}
			curColID = newCol
		}
	}
	// atualiza payload?
	var payloadMap map[string]any
	if len(body.Payload) > 0 {
		payloadMap, err = normalizePayloadMap(body.Payload)
		if err != nil {
			httperr.BadRequest("Payload invalido.").Write(w)
			return
		}
	} else {
		payloadMap, err = normalizePayloadMap(curPayload)
		if err != nil {
			httperr.BadRequest("Payload atual invalido.").Write(w)
			return
		}
	}
	// injeta labels do usuario logado
	injectLabels(payloadMap, u.Name)
	title := deriveTitle(payloadMap)
	description := deriveDescription(payloadMap)
	payloadJSON, _ := json.Marshal(payloadMap)
	if body.Position != nil {
		// mover explicito
		_, err = s.pool.Exec(r.Context(),
			`UPDATE "kanban_cards" SET column_id=$1, title=$2, description=$3, payload=$4, position=$5, updated_at=$6 WHERE id=$7`,
			curColID, title, description, payloadJSON, *body.Position, now, id)
	} else {
		_, err = s.pool.Exec(r.Context(),
			`UPDATE "kanban_cards" SET column_id=$1, title=$2, description=$3, payload=$4, updated_at=$5 WHERE id=$6`,
			curColID, title, description, payloadJSON, now, id)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao atualizar card."})
		return
	}
	// retornar card atualizado
	card, err := s.loadCard(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	writeJSON(w, http.StatusOK, card)
}

func (s *Service) loadCard(ctx context.Context, id string) (*Card, error) {
	var c Card
	var payload []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, column_id, title, description, payload, position, created_at, updated_at
		 FROM "kanban_cards" WHERE id=$1`, id).
		Scan(&c.ID, &c.ColumnID, &c.Title, &c.Description, &payload, &c.Position, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Payload = json.RawMessage(payload)
	return &c, nil
}

func (s *Service) deleteCard(w http.ResponseWriter, r *http.Request, id string) {
	ct, err := s.pool.Exec(r.Context(), `DELETE FROM "kanban_cards" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao excluir card."})
		return
	}
	if ct.RowsAffected() == 0 {
		httperr.NotFound("Card nao encontrado.").Write(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// HandleCardMove: PATCH /kanban/cards/:id/move {columnId, position}
type moveCardReq struct {
	ColumnID string `json:"columnId"`
	Position  int    `json:"position"`
}

func (s *Service) HandleCardMove(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httperr.BadRequest("ID obrigatorio.").Write(w)
		return
	}
	if r.Method != http.MethodPatch {
		httperr.MethodNotAllowed(w, r)
		return
	}
	var body moveCardReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httperr.BadRequest("Corpo invalido.").Write(w)
		return
	}
	// columnId vazio -> primeira coluna
	targetCol := strings.TrimSpace(body.ColumnID)
	if targetCol == "" {
		first, err := s.firstColumnID(r.Context())
		if err != nil {
			httperr.BadRequest("Informe columnId ou crie uma coluna primeiro.").Write(w)
			return
		}
		targetCol = first
	}
	var exists bool
	if err := s.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM "kanban_columns" WHERE id=$1)`, targetCol).Scan(&exists); err != nil || !exists {
		httperr.BadRequest("Coluna de destino nao encontrada.").Write(w)
		return
	}
	now := time.Now().UTC()
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE "kanban_cards" SET column_id=$1, position=$2, updated_at=$3 WHERE id=$4`,
		targetCol, body.Position, now, id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao mover card."})
		return
	}
	card, err := s.loadCard(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	writeJSON(w, http.StatusOK, card)
}

// NormalizePositions reordena posicoes apos operacoes (best-effort, simples).
func (s *Service) NormalizePositions(ctx context.Context) error {
	rows, err := s.pool.Query(ctx,
		`SELECT id FROM "kanban_columns" ORDER BY position ASC, created_at ASC`)
	if err != nil {
		return err
	}
	defer rows.Close()
	var colIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		colIDs = append(colIDs, id)
	}
	for _, cid := range colIDs {
		cardRows, err := s.pool.Query(ctx,
			`SELECT id FROM "kanban_cards" WHERE column_id=$1 ORDER BY position ASC, created_at ASC`, cid)
		if err != nil {
			return err
		}
		var ids []string
		for cardRows.Next() {
			var id string
			if err := cardRows.Scan(&id); err != nil {
				cardRows.Close()
				return err
			}
			ids = append(ids, id)
		}
		cardRows.Close()
		for i, id := range ids {
			if _, err := s.pool.Exec(ctx,
				`UPDATE "kanban_cards" SET position=$1 WHERE id=$2`, i, id); err != nil {
				return err
			}
		}
	}
	// normalizar posicoes de colunas
	for i, id := range colIDs {
		if _, err := s.pool.Exec(ctx,
			`UPDATE "kanban_columns" SET position=$1 WHERE id=$2`, i, id); err != nil {
			return err
		}
	}
	return nil
}

// sortRows helper para ordenar slices de cards por posicao
func sortCardsByPosition(cards []*Card) {
	sort.SliceStable(cards, func(i, j int) bool { return cards[i].Position < cards[j].Position })
}