package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
)

const vinDecodeURL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/"

func (a *App) handleDecodeVIN(w http.ResponseWriter, r *http.Request, vin string) error {
	sanitized := strings.ToUpper(regexp.MustCompile(`[^A-Za-z0-9]`).ReplaceAllString(vin, ""))
	if len(sanitized) < 11 {
		return appErr(http.StatusBadRequest, "VIN invalido.")
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, vinDecodeURL+urlPathEscape(sanitized)+"?format=json", nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return appErr(http.StatusBadGateway, "Falha ao consultar o VIN.")
	}
	var payload struct {
		Results []map[string]any `json:"Results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return err
	}
	row := map[string]any{}
	if len(payload.Results) > 0 {
		row = payload.Results[0]
	}
	data := map[string]string{
		"vin":   sanitized,
		"year":  readString(row["ModelYear"], row["Model_Year"]),
		"make":  readString(row["Make"]),
		"model": readString(row["Model"]),
	}
	if data["year"] == "" && data["make"] == "" && data["model"] == "" {
		return appErr(http.StatusNotFound, "Nao foi possivel decodificar o VIN.")
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": data})
	return nil
}
