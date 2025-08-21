#This python script was Generated with ChatGPT 5
import os
from flask import Flask, jsonify

app = Flask(__name__)

MESSAGE = os.environ.get("APP_MESSAGE", "Hello from Turion Space Demo!")

@app.route("/")
def index():
    return f"<h1>{MESSAGE}</h1>"

@app.route("/healthz")
def healthz():
    return jsonify(status="ok"), 200

# Allow local `python app.py` runs. In containers, we use Gunicorn.
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=False)