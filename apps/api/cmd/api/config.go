package main

import (
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	defaultTokenTTLSeconds = 12 * 60 * 60
	devAuthSecret          = "botmensagem-development-auth-secret-change-before-production"
)

type Config struct {
	Port             string
	DatabaseURL      string
	WebOrigin        string
	PublicAPIURL     string
	GeneratedDir     string
	UploadsDir       string
	AssetsDir        string
	MigrationsDir    string
	AuthSecret       string
	AuthTTLSeconds   int64
	SecureAuthCookie bool
}

func loadConfig() (Config, error) {
	port := env("PORT", "3000")
	authSecret := strings.TrimSpace(os.Getenv("AUTH_SECRET"))
	if authSecret == "" {
		if os.Getenv("NODE_ENV") == "production" {
			return Config{}, errors.New("AUTH_SECRET precisa ser configurado em producao")
		}
		authSecret = devAuthSecret
	}

	ttl := int64(defaultTokenTTLSeconds)
	if configured := strings.TrimSpace(os.Getenv("AUTH_TOKEN_TTL_SECONDS")); configured != "" {
		if parsed, err := strconv.ParseInt(configured, 10, 64); err == nil && parsed >= 300 {
			ttl = parsed
		}
	}

	secureCookie := os.Getenv("NODE_ENV") == "production"
	if configured := strings.TrimSpace(os.Getenv("AUTH_COOKIE_SECURE")); configured != "" {
		secureCookie = configured == "true"
	}

	publicURL := strings.TrimRight(env("PUBLIC_API_URL", "http://localhost:"+port), "/")
	databaseURL := normalizeDatabaseURL(os.Getenv("DATABASE_URL"))
	if strings.TrimSpace(databaseURL) == "" {
		return Config{}, errors.New("DATABASE_URL precisa ser configurado")
	}
	wd, _ := os.Getwd()
	return Config{
		Port:             port,
		DatabaseURL:      databaseURL,
		WebOrigin:        env("WEB_ORIGIN", "http://localhost:8080"),
		PublicAPIURL:     publicURL,
		GeneratedDir:     filepath.Clean(env("GENERATED_DIR", filepath.Join(wd, "storage", "generated"))),
		UploadsDir:       filepath.Clean(env("UPLOADS_DIR", filepath.Join(wd, "storage", "uploads"))),
		AssetsDir:        filepath.Clean(env("ASSETS_DIR", filepath.Join(wd, "assets"))),
		MigrationsDir:    filepath.Clean(env("MIGRATIONS_DIR", filepath.Join(wd, "prisma", "migrations"))),
		AuthSecret:       authSecret,
		AuthTTLSeconds:   ttl,
		SecureAuthCookie: secureCookie,
	}, nil
}

func normalizeDatabaseURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return raw
	}
	query := parsed.Query()
	query.Del("schema")
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func ensureStorageDirs(cfg Config) error {
	for _, dir := range []string{cfg.GeneratedDir, cfg.UploadsDir, filepath.Join(cfg.UploadsDir, "avatars")} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	return nil
}
