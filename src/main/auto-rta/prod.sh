#!/usr/bin/env bash
echo "ℹ️  O comando de produção deve ser executado a partir da raiz com Gunicorn."
echo "Exemplo:"
echo "  gunicorn -w 4 -b 0.0.0.0:\${PORT:-5000} auto-rta/start:app"