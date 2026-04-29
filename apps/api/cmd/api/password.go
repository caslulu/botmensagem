package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/scrypt"
)

const (
	scryptN      = 16384
	scryptR      = 8
	scryptP      = 1
	scryptKeyLen = 64
)

func hashPassword(password string) (string, error) {
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return "", err
	}
	salt := base64.RawURLEncoding.EncodeToString(saltBytes)
	derived, err := scrypt.Key([]byte(password), []byte(salt), scryptN, scryptR, scryptP, scryptKeyLen)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("scrypt$%d$%d$%d$%s$%s", scryptN, scryptR, scryptP, salt, base64.RawURLEncoding.EncodeToString(derived)), nil
}

func verifyPassword(password, storedHash string) (bool, error) {
	parts := strings.Split(storedHash, "$")
	if len(parts) != 6 || parts[0] != "scrypt" {
		return false, nil
	}
	n, err := strconv.Atoi(parts[1])
	if err != nil {
		return false, nil
	}
	r, err := strconv.Atoi(parts[2])
	if err != nil {
		return false, nil
	}
	p, err := strconv.Atoi(parts[3])
	if err != nil {
		return false, nil
	}
	expected, err := base64.RawURLEncoding.DecodeString(parts[5])
	if err != nil {
		return false, nil
	}
	actual, err := scrypt.Key([]byte(password), []byte(parts[4]), n, r, p, len(expected))
	if err != nil {
		return false, err
	}
	if len(actual) != len(expected) {
		return false, nil
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1, nil
}
