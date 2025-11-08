#!/usr/bin/env bash
echo "ℹ️  Este script foi movido para a raiz do repositório: ./build.sh"
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
exec "$ROOT_DIR/build.sh" "$@"