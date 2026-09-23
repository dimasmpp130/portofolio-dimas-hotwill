from fastapi import FastAPI, Query
import os
import requests

app = FastAPI()


@app.get("/api")
def generate_lobby(
    text: str = Query(...)
):
    api_key = os.environ.get("NEOXR_API_KEY")

    if not api_key:
        return {
            "status": False,
            "message": "NEOXR_API_KEY belum diatur"
        }

    try:
        response = requests.get(
            "https://api.neoxr.eu/api/fflobby",
            params={
                "text": text,
                "apikey": api_key
            },
            timeout=60
        )

        return response.json()

    except Exception as e:
        return {
            "status": False,
            "message": "Gagal menghubungi NeoXR API",
            "error": str(e)
        }
