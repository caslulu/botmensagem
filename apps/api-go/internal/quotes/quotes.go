package quotes

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

type QuotePrice struct {
	ID        string          `json:"id"`
	CardID    *string         `json:"cardId,omitempty"`
	Payload   json.RawMessage `json:"payload"`
	Processed json.RawMessage `json:"processed"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// GET /quotes -> lista todas as quote_prices (usado pelo desktop para fallback de mensagens)
// POST /quotes -> cria uma nova quote_price {cardId?, payload, processed}
func (s *Service) HandleQuotes(w http.ResponseWriter, r *http.Request) {
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
		`SELECT id, card_id, payload, processed, created_at, updated_at
		 FROM "quote_prices" ORDER BY updated_at DESC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	defer rows.Close()
	var out []QuotePrice
	for rows.Next() {
		var (
			q         QuotePrice
			payload   []byte
			processed []byte
		)
		if err := rows.Scan(&q.ID, &q.CardID, &payload, &processed, &q.CreatedAt, &q.UpdatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
			return
		}
		q.Payload = json.RawMessage(payload)
		q.Processed = json.RawMessage(processed)
		out = append(out, q)
	}
	if out == nil {
		out = []QuotePrice{}
	}
	// API original retorna {"quotes": [...]} para o frontend web, mas o desktop
	// espera array direto (CloudQuotesResponse aceita ambos). Mantemos {"quotes": [...]}.
	writeJSON(w, http.StatusOK, map[string]any{"quotes": out})
}

type createQuoteReq struct {
	CardID    *string         `json:"cardId"`
	Payload   json.RawMessage `json:"payload"`
	Processed json.RawMessage `json:"processed"`
}

func (s *Service) create(w http.ResponseWriter, r *http.Request) {
	var body createQuoteReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	if len(body.Payload) == 0 {
		body.Payload = json.RawMessage(`{}`)
	}
	if len(body.Processed) == 0 {
		body.Processed = json.RawMessage(`{}`)
	}
	// cardId vazio ("") -> NULL
	var cardIDArg any
	if body.CardID != nil && strings.TrimSpace(*body.CardID) != "" {
		cardIDArg = *body.CardID
	} else {
		cardIDArg = nil
	}
	id := uuid.NewString()
	now := time.Now().UTC()
	q := QuotePrice{
		ID: id, CardID: body.CardID,
		Payload: body.Payload, Processed: body.Processed,
		CreatedAt: now, UpdatedAt: now,
	}
	if cardIDArg == nil {
		q.CardID = nil
	}
	_, err := s.pool.Exec(r.Context(),
		`INSERT INTO "quote_prices" (id, card_id, payload, processed, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $5)`,
		id, cardIDArg, []byte(body.Payload), []byte(body.Processed), now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao criar quote."})
		return
	}
	writeJSON(w, http.StatusOK, q)
}

// HandleQuoteByID: GET/PATCH/DELETE /quotes/:id
func (s *Service) HandleQuoteByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "ID obrigatorio."})
		return
	}
	switch r.Method {
	case http.MethodGet:
		s.get(w, r, id)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Service) get(w http.ResponseWriter, r *http.Request, id string) {
	var (
		q         QuotePrice
		payload   []byte
		processed []byte
	)
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, card_id, payload, processed, created_at, updated_at FROM "quote_prices" WHERE id=$1`, id).
		Scan(&q.ID, &q.CardID, &payload, &processed, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not Found", "message": "Quote nao encontrada."})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro interno."})
		return
	}
	q.Payload = json.RawMessage(payload)
	q.Processed = json.RawMessage(processed)
	writeJSON(w, http.StatusOK, q)
}