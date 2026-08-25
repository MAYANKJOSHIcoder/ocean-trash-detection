# Object Detection Web Apps

Three Flask apps running a YOLO11n model (`best.pt`, 15 classes) in a browser:

| Folder | Port | What it does |
|---|---|---|
| `1-image-detect` | 5001 | Upload an image, detection runs once, boxes drawn on the result |
| `2-webcam-detect` | 5002 | Live webcam detection; only frames that complete inference are displayed |
| `3-video-live-detect` | 5003 | Upload a video that plays like a live camera feed; only frames that complete inference are displayed |

All three share `best.pt` from this root folder and use the same minimal API: the browser sends a JPEG frame to `POST /detect`, the server returns JSON boxes (`box`, `conf`, `cls`), the browser draws the overlay.

On the two live pages the raw video is never shown directly. The display canvas updates only after a frame completes inference; frames with no detections are still shown, just without boxes. The status line is a meter like `12/30 fps | 3 object(s)`: inference passes per second / source frame rate (camera or video, via `requestVideoFrameCallback` where available), plus the object count from the latest inferred frame.

## Classes

Mask, can, cellphone, electronics, gbottle, glove, metal, misc, net, pbag, pbottle, plastic, rod, sunglasses, tire

## Run

```bash
pip install -r 1-image-detect/requirements.txt
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
python main.py
```

`main.py` starts all three sites and keeps running, restarting any app that crashes. Press Ctrl+C to stop all three.

- `1-image-detect` → http://localhost:5001
- `2-webcam-detect` → http://localhost:5002
- `3-video-live-detect` → http://localhost:5003

Each folder can also run standalone: `cd 1-image-detect && python app.py`. Ports differ, so all three can run at once.

## Health check

With the sites running (normally via `main.py`):

```bash
python checkhealth.py
```

Checks each site: page serves with the expected markup, `/detect` returns valid `box/conf/cls` JSON for a synthetic JPEG, and garbage input returns 400. Prints a PASS/FAIL report per site, lists issues, exits nonzero if anything is wrong (including a site that is not running).

## Configuration

In each folder's `app.py`:

- `MODEL_PATH` - points to `../best.pt`
- `CONF` - confidence threshold, default `0.35`
- `port` - last line of `app.py`

## Notes

- Webcam mode needs `localhost` or HTTPS; browsers block camera access on plain HTTP otherwise. Image and video modes work anywhere.
- The video app loops the file automatically.
- The FPS meter denominator uses `requestVideoFrameCallback` (Chrome/Edge/Safari). Without it, the denominator falls back to the capture-tick rate.
- GPU inference needs CUDA Torch. Check it with `python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"`.
- Deployment (Render, Railway, PythonAnywhere, etc.): point the start command at `main.py` at the root, and make `best.pt` available one level up from each app folder as expected by `MODEL_PATH`.
