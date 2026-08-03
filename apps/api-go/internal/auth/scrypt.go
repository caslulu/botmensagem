package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/scrypt"
)

// Formato do hash (compativel com a API Go original):
//   scrypt$N$r$p$salt_string$hash_base64url
// O salt e uma string arbitraria (NAO decodificada de base64).
// O hash e derivado via scrypt com keyLen=64 e codificado em base64url sem padding.

const (
	scryptN     = 16384
	scryptR     = 8
	scryptP     = 1
	scryptKeyLen = 64
	saltLen     = 16
)

// VerifyPassword compara a senha contra o hash armazenado.
func VerifyPassword(stored, password string) (bool, error) {
	parts := strings.Split(stored, "$")
	if len(parts) != 6 || parts[0] != "scrypt" {
		return false, errors.New("formato de hash invalido")
	}
	N, err := strconv.Atoi(parts[1])
	if err != nil {
		return false, fmt.Errorf("N invalido: %w", err)
	}
	r, err := strconv.Atoi(parts[2])
	if err != nil {
		return false, fmt.Errorf("r invalido: %w", err)
	}
	p, err := strconv.Atoi(parts[3])
	if err != nil {
		return false, fmt.Errorf("p invalido: %w", err)
	}
	salt := []byte(parts[4]) // salt como string crua
	expected, err := base64.RawURLEncoding.DecodeString(parts[5])
	if err != nil {
		// tentar StdEncoding como fallback
		expected, err = base64.StdEncoding.DecodeString(parts[5])
		if err != nil {
			return false, fmt.Errorf("decodificar hash: %w", err)
		}
	}
	derived, err := scrypt.Key([]byte(password), salt, N, r, p, len(expected))
	if err != nil {
		return false, fmt.Errorf("scrypt: %w", err)
	}
	return subtle.ConstantTimeCompare(derived, expected) == 1, nil
}

// HashPassword gera um novo hash de senha no formato compativel.
func HashPassword(password string) (string, error) {
	saltBytes := make([]byte, saltLen)
	if _, err := rand.Read(saltBytes); err != nil {
		return "", fmt.Errorf("gerar salt: %w", err)
	}
	// salt como string base64url sem padding (para ser seguro em $-separated)
	salt := base64.RawURLEncoding.EncodeToString(saltBytes)
	derived, err := scrypt.Key([]byte(password), []byte(salt), scryptN, scryptR, scryptP, scryptKeyLen)
	if err != nil {
		return "", fmt.Errorf("scrypt: %w", err)
	}
	hash := base64.RawURLEncoding.EncodeToString(derived)
	return fmt.Sprintf("scrypt$%d$%d$%d$%s$%s", scryptN, scryptR, scryptP, salt, hash), nil
}
