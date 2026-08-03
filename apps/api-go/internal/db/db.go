package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

type DB struct {
	Pool *pgxpool.Pool
}

func Open(ctx context.Context, databaseURL string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.ConnConfig.ConnectTimeout = 5 * time.Second

	var pool *pgxpool.Pool
	// retry: o postgres pode ainda nao estar pronto no docker compose
	deadline := time.Now().Add(30 * time.Second)
	lastErr := err
	for {
		pool, err = pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			err = pool.Ping(ctx)
		}
		if err == nil {
			return &DB{Pool: pool}, nil
		}
		lastErr = err
		if pool != nil {
			pool.Close()
		}
		if time.Now().After(deadline) {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	return nil, fmt.Errorf("abrir pool postgres apos retries: %w", lastErr)
}

func (d *DB) Close() {
	if d.Pool != nil {
		d.Pool.Close()
	}
}

// Migrate roda os arquivos embedados em ordem. Idempotente.
// Usa o formato do Prisma: tabela "schema_migrations" com coluna "version" (TEXT),
// onde version e o nome da migration (ex: "20260417000000_init").
func (d *DB) Migrate(ctx context.Context) error {
	if _, err := d.Pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS "schema_migrations" (
		"version" TEXT NOT NULL,
		"applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
	)`); err != nil {
		return fmt.Errorf("criar schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return fmt.Errorf("ler migrations embed: %w", err)
	}

	type mig struct {
		version string // ex: 20260417000000_init (nome do arquivo sem .sql)
		name    string
		data    []byte
	}
	var migs []mig
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}
		version := strings.TrimSuffix(name, ".sql")
		data, err := migrationFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("ler %s: %w", name, err)
		}
		migs = append(migs, mig{version: version, name: name, data: data})
	}
	sort.Slice(migs, func(i, j int) bool { return migs[i].version < migs[j].version })

	for _, m := range migs {
		var exists bool
		err := d.Pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM "schema_migrations" WHERE version=$1)`, m.version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("verificar migracao %s: %w", m.version, err)
		}
		if exists {
			continue
		}
		tx, err := d.Pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("iniciar tx migracao %s: %w", m.version, err)
		}
		if _, err := tx.Exec(ctx, string(m.data)); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("aplicar migracao %s (%s): %w", m.version, m.name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO "schema_migrations"(version) VALUES($1)`, m.version); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("registrar migracao %s: %w", m.version, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migracao %s: %w", m.version, err)
		}
	}
	return nil
}