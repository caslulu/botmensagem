#!/usr/bin/env python3
"""
Mini-API HTTP para gerenciar o envio automatico do WhatsApp (Evolution API).

Expoe endpoints que o app desktop consome para configurar, em tempo real:
  - horarios de envio (regenera o crontab do root)
  - texto da mensagem (caption.txt)
  - imagem do envio (media/imagem.<ext>)
  - status atual (config + crontab + instancia + ultima execucao do log)

Sem dependencias externas: usa apenas stdlib do Python 3.8 (http.server, json,
subprocess, base64, re, pathlib). Roda como systemd service na porta 8091.

Endpoints:
  GET  /health
  GET  /config
  POST /config          { "times": ["06:30","13:00","20:00"] }
  GET  /caption
  POST /caption         { "text": "..." }
  GET  /image
  POST /image           { "base64": "...", "mimetype": "image/jpeg" }
  GET  /status
  POST /send-now
  GET  /log?lines=200
"""

import base64
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

EVOLUTION_DIR = Path("/opt/evolution")
CONFIG_ENV = EVOLUTION_DIR / "config.env"
CAPTION_FILE = EVOLUTION_DIR / "caption.txt"
MEDIA_DIR = EVOLUTION_DIR / "media"
DEFAULT_IMAGE = MEDIA_DIR / "imagem.jpg"
LOG_FILE = Path("/var/log/evolution_daily.log")
SEND_SCRIPT = EVOLUTION_DIR / "scripts" / "send_daily.py"
CRON_MARKER_BEGIN = "# >>> botmensagem-scheduler >>>"
CRON_MARKER_END = "# <<< botmensagem-scheduler <<<"

BRT = timezone(timedelta(hours=-3))

AUTH_TOKEN = os.environ.get("SCHEDULER_TOKEN", "").strip()


def _load_config_env():
    cfg = {
        "EVOLUTION_HOST": "http://localhost:8080",
        "API_KEY": "",
        "INSTANCE": "Thiago",
        "SEND_TO_ALL_GROUPS": "true",
        "DEST_NUMBER": "",
        "MEDIA_PATH": str(DEFAULT_IMAGE),
        "CAPTION_FILE": str(CAPTION_FILE),
    }
    if CONFIG_ENV.exists():
        for line in CONFIG_ENV.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def _get_crontab():
    try:
        r = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        return r.stdout if r.returncode == 0 else ""
    except Exception:
        return ""


def _write_crontab(content):
    proc = subprocess.run(["crontab", "-"], input=content, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError("falha ao gravar crontab: " + proc.stderr.strip())


def _parse_times_from_cron(crontab):
    """Extrai os horarios HH:MM (Brasilia) do bloco marcado no crontab."""
    times = []
    in_block = False
    for line in crontab.splitlines():
        if CRON_MARKER_BEGIN in line:
            in_block = True
            continue
        if CRON_MARKER_END in line:
            break
        if not in_block:
            continue
        m = re.match(r"^\s*(\d+)\s+(\d+)\s+\*\s+\*\s+\*\s+", line)
        if not m:
            continue
        minute, hour = int(m.group(1)), int(m.group(2))
        brt = (hour * 60 + minute - 180) % (24 * 60)
        bh, bm = divmod(brt, 60)
        times.append("{:02d}:{:02d}".format(bh, bm))
    if not times:
        times = ["06:30", "13:00", "20:00"]
    return times


def _build_cron_block(times_brt):
    lines = [CRON_MARKER_BEGIN, "# Horarios em UTC (Brasilia = UTC-3)"]
    for t in times_brt:
        m = re.match(r"^(\d{1,2}):(\d{2})$", t.strip())
        if not m:
            continue
        bh, bm = int(m.group(1)), int(m.group(2))
        utc = (bh * 60 + bm + 180) % (24 * 60)
        uh, um = divmod(utc, 60)
        lines.append("{:02d} {:02d} * * * {} >> /var/log/evolution_daily.log 2>&1".format(
            um, uh, str(SEND_SCRIPT)))
    lines.append(CRON_MARKER_END)
    return "\n".join(lines) + "\n"


def _is_send_daily_line(line):
    """True para linhas do crontab que disparam o send_daily (dentro ou fora do bloco)."""
    stripped = line.strip()
    return stripped and str(SEND_SCRIPT) in stripped and not stripped.startswith("#")


def _replace_cron_block(crontab, new_block):
    """Substitui (ou insere) o bloco marcado e remove qualquer linha de envio
    antiga fora do bloco (evita duplicatas quando migramos do cron manual)."""
    lines = crontab.splitlines()
    out = []
    i = 0
    replaced = False
    while i < len(lines):
        if CRON_MARKER_BEGIN in lines[i]:
            while i < len(lines) and CRON_MARKER_END not in lines[i]:
                i += 1
            i += 1
            out.append(new_block.rstrip("\n"))
            replaced = True
            continue
        # remove linhas antigas de send_daily fora do bloco (limpeza de duplicatas)
        if _is_send_daily_line(lines[i]):
            i += 1
            continue
        out.append(lines[i])
        i += 1
    if not replaced:
        if out and out[-1].strip() != "":
            out.append("")
        out.append(new_block.rstrip("\n"))
    return "\n".join(out) + "\n"


def _save_times(times_brt):
    crontab = _get_crontab()
    new_block = _build_cron_block(times_brt)
    _write_crontab(_replace_cron_block(crontab, new_block))


def _read_log_tail(lines=200):
    if not LOG_FILE.exists():
        return ""
    try:
        out = subprocess.run(["tail", "-n", str(int(lines)), str(LOG_FILE)],
                             capture_output=True, text=True)
        return out.stdout
    except Exception:
        return ""


def _current_image_path():
    """Retorna o caminho da imagem atual em media/imagem.* (ou None)."""
    if MEDIA_DIR.exists():
        for f in MEDIA_DIR.glob("imagem.*"):
            if f.is_file():
                return f
    return None


def _instance_state():
    cfg = _load_config_env()
    try:
        import urllib.request
        req = urllib.request.Request(
            "{}/instance/connectionState/{}".format(cfg["EVOLUTION_HOST"], cfg["INSTANCE"]),
            headers={"apikey": cfg["API_KEY"]})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            return data.get("instance", {}).get("state") or data.get("state") or "unknown"
    except Exception as e:
        return "erro: " + str(e)[:120]


def _send_now():
    try:
        subprocess.Popen(["python3", str(SEND_SCRIPT)],
                         stdout=open(str(LOG_FILE), "a"),
                         stderr=subprocess.STDOUT)
        return {"ok": True, "message": "envio disparado em background"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _update_config_env_media(media_path):
    if not CONFIG_ENV.exists():
        return
    lines = CONFIG_ENV.read_text().splitlines()
    out = []
    found = False
    for line in lines:
        if line.strip().startswith("MEDIA_PATH="):
            out.append("MEDIA_PATH=" + media_path)
            found = True
        else:
            out.append(line)
    if not found:
        out.append("MEDIA_PATH=" + media_path)
    CONFIG_ENV.write_text("\n".join(out) + "\n")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[{}] {} - {}\n".format(
            datetime.now(BRT).strftime("%Y-%m-%d %H:%M:%S"), self.address_string(), fmt % args))

    def _check_auth(self):
        if not AUTH_TOKEN:
            return True
        header = self.headers.get("Authorization", "")
        token = ""
        if header.lower().startswith("bearer "):
            token = header[7:].strip()
        return token == AUTH_TOKEN

    def _send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        ctype = (self.headers.get("Content-Type") or "").lower()
        if "application/json" in ctype:
            return json.loads(raw.decode("utf-8") or "{}")
        return {}

    def do_OPTIONS(self):
        self._send_json(204, {})

    def do_GET(self):
        if not self._check_auth():
            return self._send_json(401, {"error": "nao autorizado"})
        path = urlparse(self.path).path
        if path == "/health":
            return self._send_json(200, {"ok": True, "service": "evolution-scheduler", "time": datetime.now(BRT).isoformat()})
        if path == "/config":
            times = _parse_times_from_cron(_get_crontab())
            return self._send_json(200, {"times": times})
        if path == "/caption":
            text = CAPTION_FILE.read_text(encoding="utf-8") if CAPTION_FILE.exists() else ""
            return self._send_json(200, {"text": text})
        if path == "/image":
            return self._serve_image()
        if path == "/status":
            return self._send_json(200, self._status())
        if path == "/log":
            qs = parse_qs(urlparse(self.path).query)
            n = int((qs.get("lines", ["200"])[0]) or 200)
            return self._send_json(200, {"log": _read_log_tail(n)})
        return self._send_json(404, {"error": "rota nao encontrada"})

    def do_POST(self):
        if not self._check_auth():
            return self._send_json(401, {"error": "nao autorizado"})
        path = urlparse(self.path).path
        try:
            body = self._read_body()
        except Exception as e:
            return self._send_json(400, {"error": "JSON invalido: " + str(e)})
        if path == "/config":
            return self._post_config(body)
        if path == "/caption":
            return self._post_caption(body)
        if path == "/image":
            return self._post_image(body)
        if path == "/send-now":
            return self._send_json(200, _send_now())
        return self._send_json(404, {"error": "rota nao encontrada"})

    def _status(self):
        cfg = _load_config_env()
        times = _parse_times_from_cron(_get_crontab())
        caption = CAPTION_FILE.read_text(encoding="utf-8") if CAPTION_FILE.exists() else ""
        current_image = _current_image_path()
        return {
            "times": times,
            "instance": cfg["INSTANCE"],
            "instance_state": _instance_state(),
            "image_path": str(current_image) if current_image else "",
            "image_exists": current_image is not None and current_image.exists(),
            "caption_preview": (caption[:200] + "...") if len(caption) > 200 else caption,
            "caption_length": len(caption),
            "log_tail": _read_log_tail(20),
            "updated_at": datetime.now(BRT).isoformat(),
        }

    def _serve_image(self):
        current_image = _current_image_path()
        if not current_image or not current_image.exists():
            return self._send_json(404, {"error": "imagem nao configurada"})
        data = current_image.read_bytes()
        ext = current_image.suffix.lower().lstrip(".")
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "gif": "image/gif", "webp": "image/webp"}.get(ext, "image/jpeg")
        b64 = base64.b64encode(data).decode("ascii")
        return self._send_json(200, {"base64": b64, "mimetype": mime, "size": len(data)})

    def _post_config(self, body):
        times = body.get("times")
        if not isinstance(times, list) or not times:
            return self._send_json(400, {"error": "times deve ser uma lista nao vazia"})
        clean = []
        for t in times:
            ts = str(t).strip()
            if not re.match(r"^\d{1,2}:\d{2}$", ts):
                return self._send_json(400, {"error": "horario invalido: " + ts})
            clean.append(ts)
        if len(clean) > 12:
            return self._send_json(400, {"error": "maximo de 12 horarios"})
        _save_times(clean)
        return self._send_json(200, {"ok": True, "times": clean})

    def _post_caption(self, body):
        text = body.get("text")
        if not isinstance(text, str) or not text.strip():
            return self._send_json(400, {"error": "text nao pode ser vazio"})
        CAPTION_FILE.write_text(text, encoding="utf-8")
        return self._send_json(200, {"ok": True, "length": len(text)})

    def _post_image(self, body):
        b64 = body.get("base64")
        if not isinstance(b64, str) or not b64:
            return self._send_json(400, {"error": "base64 ausente"})
        try:
            data = base64.b64decode(b64)
        except Exception as e:
            return self._send_json(400, {"error": "base64 invalido: " + str(e)})
        if len(data) > 8 * 1024 * 1024:
            return self._send_json(413, {"error": "imagem maior que 8MB"})
        mime = (body.get("mimetype") or "image/jpeg").lower()
        ext = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
               "image/gif": "gif", "image/webp": "webp"}.get(mime, "jpg")
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        for f in MEDIA_DIR.glob("imagem.*"):
            try:
                f.unlink()
            except Exception:
                pass
        target = MEDIA_DIR / ("imagem." + ext)
        target.write_bytes(data)
        _update_config_env_media(str(target))
        return self._send_json(200, {"ok": True, "path": str(target), "size": len(data)})


def main():
    port = int(os.environ.get("SCHEDULER_PORT", "8091"))
    host = os.environ.get("SCHEDULER_HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    sys.stderr.write("evolution-scheduler ouvindo em {}:{}\n".format(host, port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()