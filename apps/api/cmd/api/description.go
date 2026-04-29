package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func buildCardDescription(data map[string]any) string {
	if data == nil {
		data = map[string]any{}
	}
	email := readString(data["email"])
	if email == "" {
		email = generateEmail(readString(data["nome"]), readString(data["documento"]))
	}
	address := composeAddress(data)
	if address == "" {
		address = "-"
	}

	var b strings.Builder
	b.WriteString("Documento: " + fallback(readString(data["documento"]), "-") + "\n")
	b.WriteString("Estado do Documento: " + fallback(readString(data["documento_estado"]), "-") + "\n")
	b.WriteString("Estado Civil: " + fallback(readString(data["estado_civil"]), "-") + "\n")
	b.WriteString("Genero: " + fallback(readString(data["genero"]), "-") + "\n")
	b.WriteString("Endereco: " + address + "\n")
	b.WriteString("Data de Nascimento: " + fallback(formatDateToMdy(data["data_nascimento"]), "-") + "\n")
	b.WriteString("Tempo de Seguro: " + fallback(readString(data["tempo_de_seguro"]), "-") + "\n")
	b.WriteString("Tempo no Endereco: " + fallback(readString(data["tempo_no_endereco"]), "-") + "\n")
	b.WriteString("Email: " + fallback(email, "-") + "\n")
	b.WriteString(formatVehicles(data["veiculos"]))
	b.WriteString(formatPeople(data["pessoas"]))

	if readString(data["nome_conjuge"]) != "" {
		b.WriteString("\nINFORMACOES DO CONJUGE:\n")
		b.WriteString("Nome: " + fallback(readString(data["nome_conjuge"]), "-") + "\n")
		b.WriteString("Data de Nascimento: " + fallback(formatDateToMdy(data["data_nascimento_conjuge"]), "-") + "\n")
		b.WriteString("Documento: " + fallback(readString(data["documento_conjuge"]), "-") + "\n")
		b.WriteString("Estado do Documento: " + fallback(readString(data["documento_estado_conjuge"]), "-") + "\n")
	}
	if readString(data["observacoes"]) != "" {
		b.WriteString("\nOBSERVACOES:\n" + readString(data["observacoes"]) + "\n")
	}
	return b.String()
}

func fallback(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func composeAddress(data map[string]any) string {
	if readString(data["endereco"]) != "" {
		return readString(data["endereco"])
	}
	parts := []string{}
	if street := readString(data["endereco_rua"]); street != "" {
		parts = append(parts, street)
	}
	if apt := readString(data["endereco_apt"]); apt != "" {
		parts = append(parts, "Apt "+apt)
	}
	cityState := strings.Join(nonEmpty(readString(data["endereco_cidade"]), readString(data["endereco_estado"])), " - ")
	zip := readString(data["endereco_zipcode"])
	if cityState != "" {
		if zip != "" {
			parts = append(parts, cityState+", "+zip)
		} else {
			parts = append(parts, cityState)
		}
	} else if zip != "" {
		parts = append(parts, zip)
	}
	return strings.Join(parts, ", ")
}

func nonEmpty(values ...string) []string {
	out := []string{}
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			out = append(out, value)
		}
	}
	return out
}

func parseJSONList(value any) []map[string]any {
	switch v := value.(type) {
	case []any:
		out := make([]map[string]any, 0, len(v))
		for _, item := range v {
			if m, ok := item.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return out
	case string:
		if strings.TrimSpace(v) == "" {
			return nil
		}
		var parsed []map[string]any
		if err := json.Unmarshal([]byte(v), &parsed); err == nil {
			return parsed
		}
	}
	return nil
}

func formatVehicles(value any) string {
	list := parseJSONList(value)
	if len(list) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\nVEICULOS:\n")
	for i, vehicle := range list {
		label := strings.TrimSpace(strings.Join(nonEmpty(readString(vehicle["ano"]), readString(vehicle["marca"]), readString(vehicle["modelo"])), " "))
		if label == "" {
			label = "-"
		}
		b.WriteString(fmt.Sprintf("\nVeiculo %d:\n", i+1))
		b.WriteString("   VIN: " + fallback(readString(vehicle["vin"]), "-") + "\n")
		b.WriteString("   Placa: " + fallback(readString(vehicle["placa"]), "-") + "\n")
		b.WriteString("   Veiculo: " + label + "\n")
		b.WriteString("   Estado: " + fallback(readString(vehicle["financiado"]), "-") + "\n")
		b.WriteString("   Tempo com veiculo: " + fallback(readString(vehicle["tempo_com_veiculo"]), "-") + "\n")
	}
	return b.String()
}

func formatPeople(value any) string {
	list := parseJSONList(value)
	if len(list) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\nDRIVERS ADICIONAIS:\n")
	for i, person := range list {
		b.WriteString(fmt.Sprintf("\nDriver %d:\n", i+1))
		b.WriteString("   Nome: " + fallback(readString(person["nome"]), "-") + "\n")
		b.WriteString("   Documento: " + fallback(readString(person["documento"]), "-") + " (" + fallback(readString(person["documento_estado"]), "-") + ")\n")
		b.WriteString("   Data de Nascimento: " + fallback(formatDateToMdy(person["data_nascimento"]), "-") + "\n")
		b.WriteString("   Parentesco: " + fallback(readString(person["parentesco"]), "-") + "\n")
		b.WriteString("   Genero: " + fallback(readString(person["genero"]), "-") + "\n")
	}
	return b.String()
}

func generateEmail(fullName, documentNumber string) string {
	name := strings.ToLower(sanitizeHumanText(fullName))
	docDigits := onlyDigits(documentNumber)
	if len(docDigits) > 4 {
		docDigits = docDigits[len(docDigits)-4:]
	}
	if name == "" {
		return "cliente" + docDigits + "@outlook.com"
	}
	tokens := strings.Fields(name)
	first := tokens[0]
	last := ""
	if len(tokens) > 1 {
		last = tokens[len(tokens)-1]
	}
	return first + last + docDigits + "@outlook.com"
}

func sanitizeHumanText(value string) string {
	clean := sanitizeFileName(strings.ReplaceAll(value, " ", "_"))
	clean = strings.ReplaceAll(clean, "_", " ")
	clean = strings.ReplaceAll(clean, "-", "")
	return strings.TrimSpace(clean)
}

func onlyDigits(value string) string {
	var b strings.Builder
	for _, r := range value {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func formatDateToMdy(value any) string {
	raw := readString(value)
	if raw == "" {
		return ""
	}
	if len(raw) == 10 && raw[4] == '-' && raw[7] == '-' {
		return raw[5:7] + "/" + raw[8:10] + "/" + raw[0:4]
	}
	if len(raw) == 10 && raw[2] == '/' && raw[5] == '/' {
		return raw
	}
	if millis, err := strconv.ParseInt(raw, 10, 64); err == nil {
		return time.UnixMilli(millis).Format("01/02/2006")
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return parsed.Format("01/02/2006")
	}
	if parsed, err := time.Parse("2006-01-02", raw); err == nil {
		return parsed.Format("01/02/2006")
	}
	return raw
}
