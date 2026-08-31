# BlueLens · AI Pollution Monitoring

AI-powered underwater waste detection. Single-page Flask app with YOLO — detects plastic and marine debris from images, webcam, and video.

## Quick Start

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Install PyTorch (CUDA build; plain `pip install torch torchvision` works too, CPU fallback)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

# Run
python main.py
# or directly:
python backend/app.py
```

Open http://localhost:5000

## Project Structure

```
model/
├── .gitignore
├── model.txt              # Config: model=, conf=, port=
├── backend/
│   ├── app.py             # Flask server + API
│   ├── detect.py          # ModelRegistry (lazy-load, GPU/CPU, FP16)
│   └── requirements.txt
├── frontend/
│   ├── index.html         # Single page: navbar + home panel + 3 detection panels
│   ├── style.css
│   └── app.js
├── best.pt                # Default model (15 custom classes)
├── best_prerna.pt         # Alternative model
├── nano.pt                # YOLO11n (COCO classes)
├── main.py                # Launcher
└── README.md
```

## Configuration (`model.txt`)

```ini
model=nano.pt      # Model filename (must exist in project root)
conf=0.35          # Confidence threshold (0.0-1.0)
port=5000          # HTTP port
```

- **model**: `.pt` file in project root. Change and restart to switch models.
- **conf**: Minimum confidence for detections. Lower = more detections (more false positives). 0.35 is balanced default.
- **port**: Server port. Change and restart.

**Fail-fast behavior**: If `model.txt` missing, `model=` empty, or model file not found — server exits with error.

## UI

- **Navbar**: Home / Image / Webcam / Video (switch without reload)
- **Home panel**: Hero + feature grid
- **Status line**: Shows inference FPS, inference time (ms), object count

### Image Panel
- Click "Choose image" → select file → detection runs once → boxes drawn with class + confidence

### Webcam Panel
- Switching to the Webcam tab auto-starts the camera (permission prompt); the button toggles start/stop
- Only frames completing inference are displayed

### Video Panel
- Click "Choose video" → select file → plays looped like a webcam feed
- Detection runs on each frame that completes inference

## Models

Place `.pt` files in project root. Server discovers all `*.pt` at startup (the one named in `model.txt` is used).

| Model | Classes | Source |
|-------|---------|--------|
| `best.pt` | 15 custom (Mask, can, cellphone, electronics, gbottle, glove, metal, misc, net, pbag, pbottle, plastic, rod, sunglasses, tire) | Custom trained |
| `best_prerna.pt` | Custom | Custom trained |
| `nano.pt` | 80 COCO (person, car, dog, etc.) | YOLO11n |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves frontend |
| POST | `/api/detect` | Run inference (body: raw JPEG/PNG image bytes) → JSON boxes |

### Detection Request
```
POST /api/detect
Content-Type: image/jpeg
Body: <raw image bytes>
```

### Detection Response
```json
[
  {"box": [x1, y1, x2, y2], "conf": 0.87, "cls": "cellphone"},
  {"box": [x1, y1, x2, y2], "conf": 0.62, "cls": "plastic"}
]
```

## GPU Support

- Auto-detects CUDA: uses GPU if `torch.cuda.is_available()`, else CPU
- FP16 (quantize) enabled on CUDA for faster inference
- For GPU: install CUDA-enabled PyTorch (see Quick Start)
- Verify: `python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"`
- Server binds `0.0.0.0` (accessible on LAN)

## Deployment

- Point start command at `main.py` or `backend/app.py`
- Ensure `.pt` models are in project root
- Set `port` in `model.txt` to match platform (e.g., `$PORT` on Render/Railway)
- Webcam requires HTTPS or localhost (browser security)

## License

GPL-3.0 — see [LICENSE](LICENSE).
