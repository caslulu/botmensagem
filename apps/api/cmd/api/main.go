package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := db.PingContext(ctx); err != nil {
		log.Fatal(err)
	}
	if err := runMigrations(ctx, db, cfg.MigrationsDir); err != nil {
		log.Fatal(err)
	}
	if err := ensureStorageDirs(cfg); err != nil {
		log.Fatal(err)
	}
	if err := installPDFCPUFonts(); err != nil {
		log.Printf("pdf font setup warning: %v", err)
	}

	app := &App{
		cfg:    cfg,
		db:     db,
		client: &http.Client{Timeout: 15 * time.Second},
	}
	if err := app.ensureAdminFromEnv(ctx); err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:              "0.0.0.0:" + cfg.Port,
		Handler:           app,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("botmensagem Go API listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
