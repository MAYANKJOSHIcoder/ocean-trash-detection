from pathlib import Path

import cv2
import numpy as np
import torch
from flask import Flask, jsonify, render_template, request
from ultralytics import YOLO

MODEL_PATH = Path(__file__).resolve().parent.parent / "best.pt"
CONF = 0.35
DEVICE = 0 if torch.cuda.is_available() else "cpu"
HALF = DEVICE != "cpu"

model = YOLO(MODEL_PATH)
print(f"[detect] using {'cuda:0 ' + torch.cuda.get_device_name(0) if HALF else 'cpu'}", flush=True)
app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/detect", methods=["POST"])
def detect():
    img = cv2.imdecode(np.frombuffer(request.get_data(), np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return jsonify(error="invalid image"), 400
    result = model.predict(img, conf=CONF, device=DEVICE, half=HALF, verbose=False)[0]
    dets = [
        {
            "box": [round(v) for v in b.xyxy[0].tolist()],
            "conf": round(float(b.conf), 3),
            "cls": model.names[int(b.cls)],
        }
        for b in result.boxes
    ]
    return jsonify(dets)


if __name__ == "__main__":
    app.run(port=5002, threaded=True)
