package vehicles

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Service struct {
	client *http.Client
}

func NewService() *Service {
	return &Service{client: &http.Client{Timeout: 12 * time.Second}}
}

type vinResp struct {
	Data struct {
		Make  string `json:"make"`
		Model string `json:"model"`
		VIN   string `json:"vin"`
		Year  string `json:"year"`
	} `json:"data"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// HandleVIN: GET /vehicles/vin/:vin
func (s *Service) HandleVIN(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	vin := strings.ToUpper(strings.TrimSpace(r.PathValue("vin")))
	if len(vin) != 17 || !isAlnum17(vin) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad Request", "message": "VIN invalido."})
		return
	}
	out, err := s.decode(r.Context(), vin)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error", "message": "Erro ao decodificar VIN."})
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func isAlnum17(s string) bool {
	if len(s) != 17 {
		return false
	}
	for _, c := range s {
		if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z')) {
			return false
		}
	}
	return true
}

type vpicResult struct {
	Variable string `json:"Variable"`
	Value    any    `json:"Value"`
}

func (s *Service) decode(ctx context.Context, vin string) (vinResp, error) {
	url := fmt.Sprintf("https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/%s?format=json", vin)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := s.client.Do(req)
	if err != nil {
		return vinResp{}, err
	}
	defer resp.Body.Close()
	var raw struct {
		Results []vpicResult `json:"Results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return vinResp{}, err
	}
	out := vinResp{}
	out.Data.VIN = vin
	for _, r := range raw.Results {
		s := fmt.Sprintf("%v", r.Value)
		if s == "" || s == "null" {
			continue
		}
		switch r.Variable {
		case "Make":
			out.Data.Make = s
		case "Model":
			out.Data.Model = s
		case "Model Year":
			out.Data.Year = s
		}
	}
	return out, nil
}