FROM golang:1.25-bookworm AS build
ENV PATH="/usr/local/go/bin:${PATH}" \
    GOROOT="/usr/local/go"
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM debian:bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates fonts-roboto \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/api /app/api
COPY prisma ./prisma
COPY assets ./assets
RUN mkdir -p /app/storage/generated /app/storage/uploads
EXPOSE 3000
CMD ["/app/api"]
