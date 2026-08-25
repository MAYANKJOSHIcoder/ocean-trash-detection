# Object Detection Web Apps

Three standalone Flask apps running a YOLO11n model (`best.pt`, 15 classes) in a browser:

| Folder | Port | What it does |
|---|---|---|
| `1-image-detect` | 5001 | Upload an image, detection runs once, boxes drawn on the result |
| `2-webcam-detect` | 5002 | Live webcam detection, ~10 FPS |
| `3-video-live-detect` | 5003 | Upload a video that plays like a live camera feed; detection runs during playback |

All three share `best.pt` from this root folder and use the same minimal API: the browser sends a JPEG frame to `POST /detect`, the server returns JSON boxes (`box`, `conf`, `cls`), the browser draws the overlay.

## Classes

Mask, can, cellphone, electronics, gbottle, glove, metal, misc, net, pbag, pbottle, plastic, rod, sunglasses, tire

## Run

```bash
pip install -r 1-image-detect/requirements.txt

cd 1-image-detect      && python app.py   # http://localhost:5001
cd 2-webcam-detect     && python app.py   # http://localhost:5002
cd 3-video-live-detect && python app.py   # http://localhost:5003
```

Each folder is standalone. Ports differ, so all three can run at once.

## Test

```bash
python run_tests.py
```

Starts each app, checks page markup, posts a synthetic JPEG to `/detect`, verifies the JSON contract and the 400 path for garbage input.

## Configuration

In each `app.py`:

- `MODEL_PATH` - points to `../best.pt`
- `CONF` - confidence threshold, default `0.35`
- `port` - last line of `app.py`

## Notes

- Webcam mode needs `localhost` or HTTPS; browsers block camera access on plain HTTP otherwise. Image and video modes work anywhere.
- The video app loops the file automatically and pauses detection when the video is paused.
- Deployment (Render, Railway, PythonAnywhere, etc.): point the start command at `app.py` in the folder you want, and make `best.pt` available one level up as expected by `MODEL_PATH`.
