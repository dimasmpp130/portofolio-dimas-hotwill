from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import urllib.request
import urllib.parse


class handler(BaseHTTPRequestHandler):

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        text = params.get("text", [""])[0].strip()

        if not text:
            self.send_json({
                "status": False,
                "message": "Nama wajib diisi"
            }, 400)
            return

        api_key = os.environ.get("NEOXR_API_KEY")

        if not api_key:
            self.send_json({
                "status": False,
                "message": "NEOXR_API_KEY belum diatur di Vercel"
            }, 500)
            return

        api_url = "https://api.neoxr.eu/api/fflobby?" + urllib.parse.urlencode({
            "text": text,
            "apikey": api_key
        })

        try:
            req = urllib.request.Request(
                api_url,
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
            )

            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read().decode("utf-8")

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                self.send_json({
                    "status": False,
                    "message": "NeoXR mengembalikan respons yang bukan JSON"
                }, 502)
                return

            self.send_json(data, 200)

        except Exception as error:
            self.send_json({
                "status": False,
                "message": "Gagal menghubungi NeoXR API"
            }, 502)
