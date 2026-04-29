package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

func urlPathEscape(value string) string {
	return url.PathEscape(value)
}

func urlQueryEscape(value string) string {
	return url.QueryEscape(value)
}

func sanitizeFileName(name string) string {
	if strings.TrimSpace(name) == "" {
		name = "arquivo"
	}
	t := norm.NFD.String(name)
	var b strings.Builder
	lastDash := false
	for _, r := range t {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		allowed := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-'
		if allowed {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			b.WriteByte('-')
			lastDash = true
		}
	}
	cleaned := strings.Trim(b.String(), "-")
	if cleaned == "" {
		return "arquivo"
	}
	return cleaned
}

func readString(values ...any) string {
	for _, value := range values {
		switch v := value.(type) {
		case string:
			if strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		case float64:
			if isFinite(v) {
				return strconv.FormatFloat(v, 'f', -1, 64)
			}
		case int:
			return strconv.Itoa(v)
		case json.Number:
			if strings.TrimSpace(v.String()) != "" {
				return v.String()
			}
		}
	}
	return ""
}

func parseCurrency(value any) float64 {
	if value == nil {
		return 0
	}
	switch v := value.(type) {
	case float64:
		if isFinite(v) {
			return v
		}
	case int:
		return float64(v)
	case json.Number:
		f, _ := v.Float64()
		return f
	}

	str := strings.TrimSpace(fmt.Sprint(value))
	str = strings.ReplaceAll(str, "$", "")
	str = strings.ReplaceAll(str, "R$", "")
	str = strings.ReplaceAll(str, "r$", "")
	str = strings.ReplaceAll(str, "\u00a0", "")
	str = regexp.MustCompile(`\s+`).ReplaceAllString(str, "")

	commaCount := strings.Count(str, ",")
	dotCount := strings.Count(str, ".")
	if commaCount == 1 && dotCount == 0 {
		str = strings.ReplaceAll(str, ",", ".")
	} else if commaCount > 1 {
		lastComma := strings.LastIndex(str, ",")
		var b strings.Builder
		for i, r := range str {
			switch {
			case r == ',' && i == lastComma:
				b.WriteByte('.')
			case r == ',' || r == '.':
			default:
				b.WriteRune(r)
			}
		}
		str = b.String()
	} else {
		str = strings.ReplaceAll(str, ",", "")
	}
	str = regexp.MustCompile(`[^0-9.\-]`).ReplaceAllString(str, "")
	parsed, err := strconv.ParseFloat(str, 64)
	if err != nil || math.IsNaN(parsed) {
		return 0
	}
	return parsed
}

func formatWithComma(value float64) string {
	if !isFinite(value) {
		return "0.00"
	}
	parts := strings.Split(strconv.FormatFloat(value, 'f', 2, 64), ".")
	if len(parts[0]) > 3 {
		return parts[0][:1] + "," + parts[0][1:] + "." + parts[1]
	}
	return parts[0] + "." + parts[1]
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
