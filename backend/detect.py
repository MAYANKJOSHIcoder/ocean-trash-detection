from pathlib import Path
import cv2
import numpy as np
import torch
from ultralytics import YOLO


class ModelRegistry:
    def __init__(self, root_path, conf=0.35):
        self.root = Path(root_path)
        self.conf = conf
        self.device = 0 if torch.cuda.is_available() else "cpu"
        self.half = self.device != "cpu"
        self.models = {}
        self.metadata = {}
        self._discover()

    def _discover(self):
        for pt in self.root.glob("*.pt"):
            name = pt.name
            self.metadata[name] = {"path": pt, "classes": None}

    def get_available(self):
        return [{"name": k, "classes": v["classes"] or []} for k, v in self.metadata.items()]

    def _load(self, name):
        if name not in self.models:
            m = YOLO(str(self.metadata[name]["path"]))
            self.metadata[name]["classes"] = list(m.names.values())
            self.models[name] = m
        return self.models[name]

    def predict(self, name, image_bytes):
        model = self._load(name)
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("invalid image")
        result = model.predict(img, conf=self.conf, device=self.device, half=self.half, verbose=False)[0]
        return [{
            "box": [round(v) for v in b.xyxy[0].tolist()],
            "conf": round(float(b.conf), 3),
            "cls": model.names[int(b.cls)],
        } for b in result.boxes]