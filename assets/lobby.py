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
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        self.wfile.write(body)

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

        api_url = (
            "https://api.neoxr.eu/api/fflobby?"
            + urllib.parse.urlencode({
                "text": text,
                "apikey": api_key
            })
        )

        try:
            request = urllib.request.Request(
                api_url,
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
            )

            with urllib.request.urlopen(
                request,
                timeout=60
            ) as response:
                raw = response.read().decode("utf-8")

            data = json.loads(raw)
            self.send_json(data)

        except Exception as error:
            self.send_json({
                "status": False,
                "message": "Gagal menghubungi NeoXR API"
            }, 502)
