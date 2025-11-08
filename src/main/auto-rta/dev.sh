#!/usr/bin/env bash
set -e

echo "🧪 Starting Auto RTA in development mode..."

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
VENV_DIR="$SCRIPT_DIR/backend/venv"
VENV_PY="$VENV_DIR/bin/python"

# Ensure backend venv exists and has dependencies
if [ ! -x "$VENV_PY" ]; then
    echo "📦 Creating backend virtual environment..."
    python -m venv "$VENV_DIR"
    echo "📥 Installing backend dependencies into venv..."
    "$VENV_PY" -m pip install --upgrade pip
    "$VENV_PY" -m pip install -r "$SCRIPT_DIR/requirements.txt"
    # Also install route-specific requirements if present
    if [ -f "$SCRIPT_DIR/backend/requirements.txt" ]; then
        "$VENV_PY" -m pip install -r "$SCRIPT_DIR/backend/requirements.txt"
    fi
fi

# Função para limpar processos ao sair
cleanup() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap para capturar Ctrl+C
trap cleanup INT

# Inicia o backend usando o Python do venv
echo "🐍 Starting backend (venv)..."
pushd "$SCRIPT_DIR" >/dev/null
"$VENV_PY" start.py &
BACKEND_PID=$!
popd >/dev/null

# Aguarda um pouco para o backend iniciar
sleep 3

# Inicia o frontend
echo "🚀 Starting frontend dev server (Vite)..."
pushd "$REPO_ROOT/frontend" >/dev/null
npm install
npm run dev &
FRONTEND_PID=$!
popd >/dev/null

echo "✅ Dev servers started. Frontend PID: $FRONTEND_PID, Backend PID: $BACKEND_PID"
echo "Press Ctrl+C to stop both."

# Aguarda os processos
wait

echo "🚀 Starting Auto RTA in development mode..."

# Função para limpar processos ao sair
cleanup() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap para capturar Ctrl+C
trap cleanup INT

# Inicia o backend
echo "🐍 Starting backend..."
cd backend
python main.py &
BACKEND_PID=$!

# Aguarda um pouco para o backend iniciar
sleep 3

# Inicia o frontend
echo "⚛️  Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "📱 Frontend: http://localhost:5174"
echo "🔧 Backend:  http://localhost:5000"
echo "Press Ctrl+C to stop both services"

# Aguarda os processos
wait