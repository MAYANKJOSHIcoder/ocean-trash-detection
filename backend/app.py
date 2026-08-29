import sys
from pathlib import Path
from flask import Flask, request, jsonify, render_template

from detect import ModelRegistry

ROOT = Path(__file__).parent.parent
CONFIG_FILE = ROOT / "model.txt"


def load_config(path):
    config = {}
    if not path.exists():
        sys.exit(f"ERROR: Config file not found at {path}. Create it with 'model=best.pt', 'conf=0.35', 'port=5000'")
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        k, v = line.split("=", 1)
        config[k.strip()] = v.strip()
    return config


config = load_config(CONFIG_FILE)

model_name = config.get("model")
if not model_name:
    sys.exit("ERROR: 'model=' not set in model.txt")

MODEL_PATH = ROOT / model_name
if not MODEL_PATH.exists():
    sys.exit(f"ERROR: Model file not found at {MODEL_PATH}")

CONF_THRESHOLD = float(config.get("conf", "0.35"))
PORT = int(config.get("port", "5000"))

registry = ModelRegistry(ROOT, conf=CONF_THRESHOLD)

app = Flask(__name__, static_folder="../frontend", static_url_path="", template_folder="../frontend")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/detect", methods=["POST"])
def detect():
    try:
        dets = registry.predict(model_name, request.get_data())
        return jsonify(dets)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"inference failed: {e}"}), 500


if __name__ == "__main__":
    print(f"[backend] model: {model_name}, device: {registry.device}, port: {PORT}")
    app.run(host="0.0.0.0", port=PORT, threaded=True)