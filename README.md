# Object Detection Web App

Single-page Flask app with YOLO object detection. Three modes in one interface: Image upload, Live Webcam, and Video playback.

## Quick Start

```bash
# Install dependencies
pip install -r backend/requirements.txt
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126

# Run
python main.py
# or directly:
python backend/app.py
```

Open http://localhost:5000

## Project Structure

```
model/
├── model.txt              # Config: model=, conf=, port=
├── backend/
│   ├── app.py             # Flask server + API
│   ├── detect.py          # ModelRegistry (lazy-load, GPU/CPU)
│   └── requirements.txt
├── frontend/
│   ├── index.html         # Single page: hero + 3 tabs
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
model=best.pt      # Model filename (must exist in project root)
conf=0.35          # Confidence threshold (0.0-1.0)
port=5000          # HTTP port
```

- **model**: `.pt` file in project root. Change and restart to switch models.
- **conf**: Minimum confidence for detections. Lower = more detections (more false positives). 0.35 is balanced default.
- **port**: Server port. Change and restart.

**Fail-fast behavior**: If `model.txt` missing, `model=` empty, or model file not found — server exits with error.

## UI

- **Hero**: Title and description
- **3 Tabs**: Image / Webcam / Video (switch without reload)
- **Status line**: Shows FPS, inference time, object count

### Image Tab
- Click "Choose image" → select file → detection runs once → boxes drawn

### Webcam Tab
- Click "Start camera" → grants permission → live detection loop
- Only frames completing inference are displayed
- Click "Stop camera" to end

### Video Tab
- Click "Choose video" → select file → plays looped like webcam
- Detection runs on each frame that completes inference

## Models

Place `.pt` files in project root. Server discovers all `*.pt` at startup.

| Model | Classes | Source |
|-------|---------|--------|
| `best.pt` | 15 custom (Mask, can, cellphone, electronics, gbottle, glove, metal, misc, net, pbag, pbottle, plastic, rod, sunglasses, tire) | Custom trained |
| `best_prerna.pt` | Custom | Custom trained |
| `nano.pt` | 80 COCO (person, car, dog, etc.) | YOLO11n |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves frontend |
| GET | `/api/models` | List discovered models with classes |
| GET | `/api/model/current` | Active model name |
| POST | `/api/detect` | Run inference (body: JPEG bytes) → JSON boxes |

### Detection Response
```json
[
  {"box": [x1, y1, x2, y2], "conf": 0.87, "cls": "cellphone"},
  {"box": [x1, y1, x2, y2], "conf": 0.62, "cls": "plastic"}
]
```

## GPU Support

- Auto-detects CUDA: uses GPU if `torch.cuda.is_available()`, else CPU
- For GPU: install CUDA-enabled PyTorch (see Quick Start)
- Verify: `python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"`

## Deployment

- Point start command at `main.py` or `backend/app.py`
- Ensure `best.pt` (and other models) are in project root
- Set `port` in `model.txt` to match platform (e.g., `$PORT` on Render/Railway)
- Webcam requires HTTPS or localhost (browser security)

## License

MIT