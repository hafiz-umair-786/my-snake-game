from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import mimetypes

ROOT = Path(__file__).parent
scores = []


class GameServer(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if self.path == "/api/scores":
            self.send_json(scores[-10:][::-1])
            return

        requested = self.path.split("?", 1)[0]
        relative = "index.html" if requested in ("", "/") else requested.lstrip("/")
        file_path = (ROOT / relative).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            self.send_error(403)
            return
        if not file_path.is_file():
            self.send_error(404)
            return
        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(file_path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        if self.path != "/api/scores":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            entry = json.loads(self.rfile.read(length))
            score = int(entry["score"])
            name = str(entry.get("name", "PLAYER"))[:16].strip() or "PLAYER"
            scores.append({"name": name, "score": score})
            scores.sort(key=lambda item: item["score"], reverse=True)
            del scores[10:]
            self.send_json(scores)
        except (ValueError, KeyError, json.JSONDecodeError):
            self.send_json({"error": "Invalid score"}, 400)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8000), GameServer)
    print("Snake web app: http://localhost:8000")
    print("For phone testing on the same Wi-Fi, use your computer's local IP with port 8000.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
