package main

import (
	"context"
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"botmensagem/api/internal/auth"
	"botmensagem/api/internal/db"
	"botmensagem/api/internal/httperr"
	"botmensagem/api/internal/kanban"
	"botmensagem/api/internal/ocr"
	"botmensagem/api/internal/profile"
	"botmensagem/api/internal/quotes"
	"botmensagem/api/internal/users"
	"botmensagem/api/internal/vehicles"
)

//go:embed all:web
var webFS embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL nao configurado")
	}
	authSecret := os.Getenv("AUTH_SECRET")
	if authSecret == "" {
		log.Fatal("AUTH_SECRET nao configurado")
	}
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPass := os.Getenv("ADMIN_PASSWORD")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	database, err := db.Open(ctx, databaseURL)
	if err != nil {
		log.Fatalf("abrir banco: %v", err)
	}
	defer database.Close()
	if err := database.Migrate(ctx); err != nil {
		log.Fatalf("migrar banco: %v", err)
	}
	log.Println("[db] migracoes aplicadas")

	authSvc := auth.NewService(database.Pool, authSecret, adminEmail, adminPass)
	if err := authSvc.EnsureSeed(ctx); err != nil {
		log.Printf("[auth] seed admin: %v", err)
	}
	kanbanSvc := kanban.NewService(database.Pool)
	quotesSvc := quotes.NewService(database.Pool)
	usersSvc := users.NewService(database.Pool)
	profileSvc := profile.NewService(database.Pool)
	vehiclesSvc := vehicles.NewService()
	ocrSvc := ocr.NewService(database.Pool)

	mux := http.NewServeMux()

	// --- publicos ---
	mux.HandleFunc("/auth/login", authSvc.HandleLogin)
	mux.HandleFunc("/auth/me", authSvc.HandleMe)
	mux.HandleFunc("/auth/logout", authSvc.HandleLogout)

	// --- protegidos: Require envolve todo o sub-mux authed ---
	authed := http.NewServeMux()

	// kanban: roteamento manual sob /kanban/...
	authed.HandleFunc("/kanban", kanbanSvc.HandleBoard)
	authed.HandleFunc("/kanban/", func(w http.ResponseWriter, r *http.Request) {
		rest := strings.TrimPrefix(r.URL.Path, "/kanban/")
		if rest == "" {
			kanbanSvc.HandleBoard(w, r)
			return
		}
		parts := strings.SplitN(rest, "/", 2)
		resource := parts[0]
		switch resource {
		case "ocr":
			// POST /kanban/ocr — recebe multipart com imagem, devolve campos extraidos
			ocrSvc.HandleOCR(w, r)
			return
		case "ocr-json":
			// POST /kanban/ocr-json — recebe JSON {image: base64}, devolve campos extraidos
			ocrSvc.HandleOCRJSON(w, r)
			return
		case "columns":
			if len(parts) == 1 {
				kanbanSvc.HandleColumns(w, r)
				return
			}
			r.SetPathValue("id", parts[1])
			kanbanSvc.HandleColumnByID(w, r)
			return
		case "cards":
			if len(parts) == 1 {
				kanbanSvc.HandleCards(w, r)
				return
			}
			cardParts := strings.SplitN(parts[1], "/", 2)
			r.SetPathValue("id", cardParts[0])
			if len(cardParts) == 2 && cardParts[1] == "move" {
				kanbanSvc.HandleCardMove(w, r)
				return
			}
			kanbanSvc.HandleCardByID(w, r)
			return
		default:
			httperr.NotFoundRoute(w, r)
		}
	})

	authed.HandleFunc("/quotes", quotesSvc.HandleQuotes)
	authed.HandleFunc("/quotes/", quotesSvc.HandleQuoteByID)
	authed.HandleFunc("/profile", profileSvc.HandleProfile)
	authed.HandleFunc("/profile/password", profileSvc.HandlePassword)
	authed.HandleFunc("/profile/avatar", profileSvc.HandleAvatar)

	// vehicles: /vehicles/vin/:vin (parse manual)
	authed.HandleFunc("/vehicles/", func(w http.ResponseWriter, r *http.Request) {
		rest := strings.TrimPrefix(r.URL.Path, "/vehicles/")
		// esperar formato vin/:vin
		parts := strings.SplitN(rest, "/", 2)
		if len(parts) == 2 && parts[0] == "vin" {
			r.SetPathValue("vin", parts[1])
			vehiclesSvc.HandleVIN(w, r)
			return
		}
		httperr.NotFoundRoute(w, r)
	})

	// /users requer admin
	authed.Handle("/users", authSvc.RequireAdmin(http.HandlerFunc(usersSvc.HandleUsers)))
	authed.Handle("/users/", authSvc.Require(http.HandlerFunc(usersSvc.HandleUserByID)))

	// Envolve todo o authed com Require (autenticacao). RequireAdmin em /users acima e extra.
	authedProtected := authSvc.Require(authed)

	mux.Handle("/kanban", authedProtected)
	mux.Handle("/kanban/", authedProtected)
	mux.Handle("/quotes", authedProtected)
	mux.Handle("/quotes/", authedProtected)
	mux.Handle("/profile", authedProtected)
	mux.Handle("/profile/", authedProtected)
	mux.Handle("/users", authedProtected)
	mux.Handle("/users/", authedProtected)
	mux.Handle("/vehicles/", authedProtected)

	// 404 para API
	mux.HandleFunc("/auth/", httperr.NotFoundRoute)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			// healthcheck
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "service": "botmensagem-api", "version": "1.0"})
			return
		}
		// tentar servir estatico do web (se embedado)
		if serveWeb(w, r) {
			return
		}
		httperr.NotFoundRoute(w, r)
	})

	handler := withCORS(mux)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 15 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("[api] botmensagem Go API listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("[api] desligando...")
	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("[api] shutdown: %v", err)
	}
}

func withCORS(next http.Handler) http.Handler {
	allowedOrigins := os.Getenv("WEB_ORIGIN")
	allowed := map[string]bool{}
	for _, o := range strings.Split(allowedOrigins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			allowed[o] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if allowed[origin] || allowedOrigins == "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Idempotency-Key")
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// serveWeb tenta servir um arquivo estatico do frontend web embedado.
func serveWeb(w http.ResponseWriter, r *http.Request) bool {
	if _, err := fs.Stat(webFS, "web"); err != nil {
		return false
	}
	clean := strings.TrimPrefix(r.URL.Path, "/")
	if clean == "" {
		clean = "index.html"
	}
	f, err := webFS.Open("web/" + clean)
	if err != nil {
		// fallback para SPA index.html
		f2, err2 := webFS.Open("web/index.html")
		if err2 != nil {
			return false
		}
		defer f2.Close()
		fi, _ := f2.Stat()
		http.ServeContent(w, r, "index.html", fi.ModTime(), f2.(io.ReadSeeker))
		return true
	}
	defer f.Close()
	fi, _ := f.Stat()
	if fi.IsDir() {
		return false
	}
	ext := strings.ToLower(clean)
	if strings.HasSuffix(ext, ".html") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	} else if strings.HasSuffix(ext, ".js") {
		w.Header().Set("Content-Type", "application/javascript")
	} else if strings.HasSuffix(ext, ".css") {
		w.Header().Set("Content-Type", "text/css")
	} else if strings.HasSuffix(ext, ".png") {
		w.Header().Set("Content-Type", "image/png")
	} else if strings.HasSuffix(ext, ".svg") {
		w.Header().Set("Content-Type", "image/svg+xml")
	}
	http.ServeContent(w, r, clean, fi.ModTime(), f.(io.ReadSeeker))
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}