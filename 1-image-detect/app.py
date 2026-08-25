from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request
from ultralytics import YOLO

MODEL_PATH = Path(__file__).resolve().parent.parent / "best.pt"
CONF = 0.35

model = YOLO(MODEL_PATH)
app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/detect", methods=["POST"])
def detect():
    img = cv2.imdecode(np.frombuffer(request.get_data(), np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return jsonify(error="invalid image"), 400
    result = model.predict(img, conf=CONF, verbose=False)[0]
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
    app.run(port=5001, threaded=True)
