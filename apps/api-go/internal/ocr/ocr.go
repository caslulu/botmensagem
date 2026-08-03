package ocr

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"botmensagem/api/internal/auth"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DailyOcrLimit e o numero maximo de OCRs por usuario por dia.
const DailyOcrLimit = 15

// Service faz OCR de documentos de seguro via Ollama Cloud (qwen3.5 multimodal).
type Service struct {
	client *http.Client
	apiURL string
	apiKey string
	model  string
	pool   *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	apiURL := os.Getenv("OLLAMA_API_URL")
	if apiURL == "" {
		apiURL = "https://ollama.com/api/chat"
	}
	return &Service{
		client: &http.Client{Timeout: 90 * time.Second},
		apiURL: apiURL,
		apiKey: os.Getenv("OLLAMA_API_KEY"),
		model:  getenvDefault("OLLAMA_MODEL", "kimi-k2.6"),
		pool:   pool,
	}
}

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// ExtractResult e o JSON estruturado que o modelo deve devolver.
// Usa json tags compatíveis com o payload do card do kanban (mesmas chaves do formulario desktop).
type ExtractResult struct {
	TipoDocumento   string         `json:"tipo_documento"`
	Nome            string         `json:"nome"`
	Documento       string         `json:"documento"`
	DocumentoEstado string         `json:"documento_estado"`
	DataNascimento  string         `json:"data_nascimento"`
	Email           string         `json:"email"`
	EnderecoRua     string         `json:"endereco_rua"`
	EnderecoApt     string         `json:"endereco_apt"`
	EnderecoCidade  string         `json:"endereco_cidade"`
	EnderecoEstado   string         `json:"endereco_estado"`
	EnderecoZipcode string         `json:"endereco_zipcode"`
	Genero          string         `json:"genero"`
	EstadoCivil     string         `json:"estado_civil"`
	TeveSeguro      string         `json:"teve_seguro_anterior"`
	TempoSeguro     string         `json:"tempo_de_seguro"`
	TempoEndereco   string         `json:"tempo_no_endereco"`
	Observacoes     string         `json:"observacoes"`
	Veiculos        []ExtractVehicle `json:"veiculos"`
}

type ExtractVehicle struct {
	VIN             string `json:"vin"`
	Placa           string `json:"placa"`
	Ano             string `json:"ano"`
	Marca           string `json:"marca"`
	Modelo          string `json:"modelo"`
	Financiado      string `json:"financiado"`
	TempoComVeiculo string `json:"tempo_com_veiculo"`
}

const extractPrompt = `Voce e um assistente de OCR especializado em documentos americanos para seguro automotivo. O usuario pode enviar diferentes tipos de documento:

TIPOS DE DOCUMENTO QUE PODEM APARECER:
1. "driver_license" — Carteira de motorista: tem nome, data de nascimento, sexo, numero da DL, estado emissor, endereco, classe.
2. "vehicle_registration" — Registro/titulo do veiculo (Title/Registration): tem VIN, placa, marca, modelo, ano, proprietario, titulo.
3. "insurance_form" — Formulario de seguro: tem nome, endereco, dados do veiculo, info de cobertura.
4. "title_application" — RTA: tem dados do proprietario, veiculo, vin, endereco.
5. "outro" — Outro documento: extraia o que conseguir.

INSTRUCAO:
- Identifique QUAL tipo de documento e (campo "tipo_documento").
- Extraia TODOS os campos que aparecerem na imagem. Campos que nao existirem no documento, deixe vazio ("").
- Para driver_license: preencha principalmente nome, documento (numero da DL), documento_estado, data_nascimento, genero, endereco_*.
- Para vehicle_registration: preencha principalmente veiculos[].vin, placa, marca, modelo, ano, e nome do proprietario se houver.
- Para insurance_form ou outros: extraia todos os campos que conseguir identificar.

Responda APENAS com JSON valido (sem markdown, sem cercas de codigo, sem texto antes ou depois). Use EXATAMENTE estas chaves:
{
  "tipo_documento": "",
  "nome": "",
  "documento": "",
  "documento_estado": "",
  "data_nascimento": "",
  "email": "",
  "endereco_rua": "",
  "endereco_apt": "",
  "endereco_cidade": "",
  "endereco_estado": "",
  "endereco_zipcode": "",
  "genero": "",
  "estado_civil": "",
  "teve_seguro_anterior": "",
  "tempo_de_seguro": "",
  "tempo_no_endereco": "",
  "observacoes": "",
  "veiculos": [{"vin":"","placa":"","ano":"","marca":"","modelo":"","financiado":"","tempo_com_veiculo":""}]
}

REGRAS CRITICAS:
- tipo_documento: "driver_license", "vehicle_registration", "insurance_form", "title_application" ou "outro".
- data_nascimento no formato MM/DD/YYYY (ex: 03/15/1985). Se vier YYYY-MM-DD, converta.
- genero: "male", "female" ou "other" (NUNCA "M"/"F"/"Masculino"). Se vier "M" -> "male", "F" -> "female".
- estado_civil: "single", "married", "divorced" ou "widowed" (NUNCA "Solteiro"/"Casado").
- teve_seguro_anterior: "yes" ou "no" (NUNCA "Sim"/"Nao").
- tempo_de_seguro: "lt_6m", "6m_1y", "1y_3y", "3y_5y" ou "5y_plus".
- tempo_no_endereco: "lt_1y", "1y_2y", "3y_5y" ou "5y_plus".
- financiado (veiculo): "quitado" ou "financiado".
- tempo_com_veiculo: "less than 1 month", "1 month - 1 year", "1 year - 3 years", "3 years - 5 years" ou "5 years or more".
- documento_estado e endereco_estado: codigo de estado US de 2 letras (ex: NY, TX, CA, IL). Se vier por extenso (Illinois, New York), abrevie.
- documento (numero da DL): apenas os digitos/letras do numero, sem tracos ou espacos extras.
- vin: 17 caracteres alfanumericos em maiusculas. Se vier menos de 17, mesmo assim extraia.
- placa: maiusculas.
- Se um campo nao estiver na imagem, deixe vazio (""). Nao invente valores.
- Se nao houver veiculos, devolva "veiculos": [].`

// ollamaReq e o corpo do request para /api/chat do Ollama.
type ollamaReq struct {
	Model    string       `json:"model"`
	Messages []ollamaMsg  `json:"messages"`
	Stream   bool         `json:"stream"`
	Format   string       `json:"format,omitempty"`
}

type ollamaMsg struct {
	Role    string   `json:"role"`
	Content string   `json:"content"`
	Images  []string `json:"images,omitempty"`
}

type ollamaResp struct {
	Model   string `json:"model"`
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	Done         bool   `json:"done"`
	Error        string `json:"error,omitempty"`
}

// Extract envia a imagem (bytes + mime) para o Ollama e devolve os campos estruturados.
// Tenta o modelo configurado (OLLAMA_MODEL); se ele nao suportar imagem, cai para fallbacks multimodais.
func (s *Service) Extract(ctx context.Context, imageBytes []byte, mime string) (*ExtractResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("OLLAMA_API_KEY nao configurado")
	}
	if len(imageBytes) == 0 {
		return nil, fmt.Errorf("imagem vazia")
	}

	// Modelos multimodais confirmados na Ollama Cloud (suportam campo "images").
	// Usados como fallback se o modelo primario rejeitar imagem.
	fallbackModels := []string{"kimi-k2.6", "minimax-m3", "mistral-large-3:675b"}

	// lista de modelos a tentar: primario primeiro, depois fallbacks (sem duplicar)
	tryModels := []string{s.model}
	for _, fb := range fallbackModels {
		if fb != s.model {
			tryModels = append(tryModels, fb)
		}
	}

	var lastErr error
	for _, model := range tryModels {
		result, err := s.callOllama(ctx, model, imageBytes)
		if err == nil {
			return result, nil
		}
		lastErr = err
		// Erros transitarios/fallback: modelo nao suporta imagem, HTTP 500 do provedor,
		// timeout ou imagem invalida para aquele modelo -> tentar proximo fallback.
		if isRetriableOcrErr(err) {
			continue
		}
		// outros erros (ex.: API key invalida): propagar sem tentar fallback
		return nil, err
	}
	// todos os modelos falharam
	if lastErr != nil {
		return nil, fmt.Errorf("nenhum modelo multimodal disponivel. ultimo erro: %w", lastErr)
	}
	return nil, fmt.Errorf("erro desconhecido no OCR")
}

// isRetriableOcrErr retorna true para erros que valem tentar o proximo modelo de fallback:
// modelo nao suporta imagem, HTTP 500 do provedor, timeout, ou imagem recusada por aquele modelo.
func isRetriableOcrErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "does not support image input") ||
		strings.Contains(msg, "ollama HTTP 500") ||
		strings.Contains(msg, "Internal Server Error") ||
		strings.Contains(msg, "could not be loaded as a valid image") ||
		strings.Contains(msg, "context deadline exceeded") ||
		strings.Contains(msg, "chamar ollama:")
}

// callOllama faz a chamada HTTP para um modelo especifico do Ollama.
func (s *Service) callOllama(ctx context.Context, model string, imageBytes []byte) (*ExtractResult, error) {
	b64 := base64.StdEncoding.EncodeToString(imageBytes)
	reqBody := ollamaReq{
		Model:  model,
		Stream: false,
		Format: "json",
		Messages: []ollamaMsg{
			{Role: "user", Content: extractPrompt, Images: []string{b64}},
		},
	}
	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("serializar request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.apiURL, bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, fmt.Errorf("criar request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("chamar ollama: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ler resposta: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ollama HTTP %d: %s", resp.StatusCode, truncate(string(raw), 300))
	}

	var oresp ollamaResp
	if err := json.Unmarshal(raw, &oresp); err != nil {
		return nil, fmt.Errorf("decodificar resposta ollama: %w", err)
	}
	if oresp.Error != "" {
		return nil, fmt.Errorf("ollama: %s", oresp.Error)
	}

	content := strings.TrimSpace(oresp.Message.Content)
	// tirar cercas de codigo markdown se vier
	content = stripCodeFences(content)

	var result ExtractResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("decodificar JSON do modelo: %w (content: %s)", err, truncate(content, 200))
	}
	// normalizacoes leves
	result.Genero = normalizeGenero(result.Genero)
	result.EstadoCivil = normalizeEstadoCivil(result.EstadoCivil)
	result.TeveSeguro = normalizeTeveSeguro(result.TeveSeguro)
	result.DataNascimento = normalizeDate(result.DataNascimento)
	return &result, nil
}

func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		// remove primeira linha (```json ou ```)
		if i := strings.Index(s, "\n"); i >= 0 {
			s = s[i+1:]
		}
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
		s = strings.TrimSpace(s)
	}
	return s
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// normalizeGenero aceita M/F/Masculino etc e devolve male/female/other.
func normalizeGenero(g string) string {
	switch strings.ToLower(strings.TrimSpace(g)) {
	case "m", "male", "masculino", "masculino (m)":
		return "male"
	case "f", "female", "feminino", "feminino (f)":
		return "female"
	case "o", "other", "outro", "nao binario", "nao-binario":
		return "other"
	case "":
		return ""
	}
	return strings.ToLower(strings.TrimSpace(g))
}

// normalizeEstadoCivil traduz valores comuns para os enums do formulario.
func normalizeEstadoCivil(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "single", "solteiro", "solteira":
		return "single"
	case "married", "casado", "casada":
		return "married"
	case "divorced", "divorciado", "divorciada":
		return "divorced"
	case "widowed", "viuvo", "viuva":
		return "widowed"
	case "":
		return ""
	}
	return strings.ToLower(strings.TrimSpace(s))
}

// normalizeTeveSeguro traduz sim/nao para yes/no.
func normalizeTeveSeguro(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "yes", "sim", "s":
		return "yes"
	case "no", "nao", "não", "n":
		return "no"
	case "":
		return ""
	}
	return strings.ToLower(strings.TrimSpace(s))
}

// normalizeDate converte YYYY-MM-DD -> MM/DD/YYYY. Outros formatos passa direto.
func normalizeDate(s string) string {
	s = strings.TrimSpace(s)
	if len(s) == 10 && s[4] == '-' && s[7] == '-' {
		return s[5:7] + "/" + s[8:10] + "/" + s[0:4]
	}
	return s
}

// --- HTTP handler ---

// usageRow representa o contador diario de OCR de um usuario.
type usageRow struct {
	Count int
	Paid  bool
}

// todayUTC devolve a data atual em UTC (sem hora) para usar como chave de dia.
func todayUTC() time.Time {
	return time.Now().UTC().Truncate(24 * time.Hour)
}

// readUsage le o contador do dia para o usuario. Se nao existir, devolve zeros.
func (s *Service) readUsage(ctx context.Context, userID string) (usageRow, error) {
	if s.pool == nil {
		return usageRow{}, fmt.Errorf("pool do banco indisponivel")
	}
	var u usageRow
	err := s.pool.QueryRow(ctx,
		`SELECT count, paid FROM ocr_usage WHERE user_id=$1 AND day=$2`,
		userID, todayUTC()).Scan(&u.Count, &u.Paid)
	if err != nil {
		// pgx.ErrNoRows -> sem uso ainda hoje
		return usageRow{}, nil
	}
	return u, nil
}

// checkQuota devolve nil se o usuario ainda tem cota disponivel hoje,
// ou um erro explicativo se ja atingiu o limite e nao pagou.
func (s *Service) checkQuota(ctx context.Context, userID string) error {
	u, err := s.readUsage(ctx, userID)
	if err != nil {
		return err
	}
	if u.Paid {
		return nil
	}
	if u.Count >= DailyOcrLimit {
		return fmt.Errorf("limite diario de %d OCR atingido. Faca upgrade para continuar.", DailyOcrLimit)
	}
	return nil
}

// incrementUsage incrementa o contador do dia para o usuario (cria a linha se necessario).
func (s *Service) incrementUsage(ctx context.Context, userID string) error {
	if s.pool == nil {
		return nil
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO ocr_usage (user_id, day, count) VALUES ($1, $2, 1)
		 ON CONFLICT (user_id, day) DO UPDATE SET count = ocr_usage.count + 1, updated_at = CURRENT_TIMESTAMP`,
		userID, todayUTC())
	return err
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// HandleOCR: POST /kanban/ocr
// Recebe multipart/form-data com campo "image" (arquivo de imagem).
// Devolve o ExtractResult como JSON.
func (s *Service) HandleOCR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	// limita 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Arquivo invalido ou muito grande (max 10MB)."})
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Imagem nao enviada (campo 'image')."})
		return
	}
	defer file.Close()

	mime := header.Header.Get("Content-Type")
	if !strings.HasPrefix(mime, "image/") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Tipo de arquivo nao permitido. Envie uma imagem (PNG, JPG, etc)."})
		return
	}

	// le bytes
	const maxBytes = 10 << 20
	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, io.LimitReader(file, maxBytes+1)); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao ler imagem."})
		return
	}
	if buf.Len() > maxBytes {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Imagem muito grande (max 10MB)."})
		return
	}

	// --- quota diaria ---
	user, ok := auth.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
		return
	}
	if err := s.checkQuota(r.Context(), user.ID); err != nil {
		writeJSON(w, http.StatusPaymentRequired, map[string]string{"error": "Payment Required", "message": err.Error()})
		return
	}

	result, err := s.Extract(r.Context(), buf.Bytes(), mime)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Bad Gateway", "message": "Erro ao processar OCR: " + err.Error()})
		return
	}
	_ = s.incrementUsage(r.Context(), user.ID)
	writeJSON(w, http.StatusOK, result)
}

// HandleOCRJSON: POST /kanban/ocr-json
// Variante que aceita JSON com imagem em base64 (dataUrl ou raw base64).
// Compativel com o bridge web-api:request do desktop (que so faz JSON).
type ocrJSONReq struct {
	Image string `json:"image"` // data:image/png;base64,....  OU  base64 cru
}

func (s *Service) HandleOCRJSON(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var body ocrJSONReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Corpo invalido."})
		return
	}
	raw := strings.TrimSpace(body.Image)
	if raw == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Imagem nao enviada (campo 'image' em base64)."})
		return
	}
	// separar mime e base64 se vier como data: URL
	mime := "image/png"
	b64 := raw
	if strings.HasPrefix(raw, "data:") {
		// formato: data:<mime>;base64,<dados>
		if comma := strings.Index(raw, ","); comma > 0 {
			header := raw[:comma]
			b64 = raw[comma+1:]
			if semi := strings.Index(header, ";"); semi > 0 {
				mime = header[5:semi]
			} else {
				mime = strings.TrimPrefix(header, "data:")
			}
		}
	}
	imageBytes, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Base64 invalido."})
		return
	}
	if len(imageBytes) > 10<<20 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "Imagem muito grande (max 10MB)."})
		return
	}

	// --- quota diaria ---
	user, ok := auth.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized", "message": "Login necessario."})
		return
	}
	if err := s.checkQuota(r.Context(), user.ID); err != nil {
		writeJSON(w, http.StatusPaymentRequired, map[string]string{"error": "Payment Required", "message": err.Error()})
		return
	}

	result, err := s.Extract(r.Context(), imageBytes, mime)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Bad Gateway", "message": "Erro ao processar OCR: " + err.Error()})
		return
	}
	_ = s.incrementUsage(r.Context(), user.ID)
	writeJSON(w, http.StatusOK, result)
}