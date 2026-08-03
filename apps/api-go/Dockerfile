FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api .

FROM alpine:3
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 api
WORKDIR /app
COPY --from=builder /out/api /app/api
COPY web /app/web
USER api
EXPOSE 3000
ENTRYPOINT ["/app/api"]