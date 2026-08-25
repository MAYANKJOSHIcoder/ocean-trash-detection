import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

import cv2
import numpy as np

APPS = [
    ("1-image-detect", 5001, [b"file", b"overlay"]),
    ("2-webcam-detect", 5002, [b"toggle", b"getUserMedia"]),
    ("3-video-live-detect", 5003, [b'accept="video/*"', b"video.loop"]),
]

failures = []


def check(name, cond, detail=""):
    tag = "PASS" if cond else "FAIL"
    print(f"  [{tag}] {name}" + (f" -- {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(f"{name}: {detail}")


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def post(url, data):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/octet-stream"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def make_jpeg():
    img = np.full((480, 640, 3), 235, np.uint8)
    cv2.rectangle(img, (100, 100), (300, 350), (40, 40, 40), -1)
    cv2.circle(img, (480, 240), 90, (180, 160, 140), -1)
    noise = np.random.randint(0, 30, img.shape, dtype=np.uint8)
    img = cv2.add(img, noise)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


for folder, port, markers in APPS:
    print(f"\n=== {folder} :{port} ===")
    proc = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=folder,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        deadline = time.time() + 120
        up = False
        while time.time() < deadline:
            if proc.poll() is not None:
                break
            try:
                status, _ = get(base + "/")
                up = status == 200
                break
            except Exception:
                time.sleep(1)
        check("server starts (model loads)", up)

        if not up:
            continue

        status, html = get(base + "/")
        check("GET / returns 200", status == 200)
        for m in markers:
            check(f"page contains {m.decode()!r}", m in html)

        status, body = post(base + "/detect", make_jpeg())
        check("POST /detect jpeg returns 200", status == 200)
        dets = json.loads(body)
        check("response is a JSON list", isinstance(dets, list))
        if dets:
            keys_ok = all(set(d) == {"box", "conf", "cls"} and len(d["box"]) == 4 for d in dets)
            check("detections have box/conf/cls", keys_ok)
            print(f"       model found {len(dets)} object(s) in synthetic image: "
                  + ", ".join(d['cls'] for d in dets[:5]))
        else:
            print("       no detections on synthetic image (expected for random shapes)")

        status, _ = post(base + "/detect", b"not-an-image")
        check("POST /detect garbage returns 400", status == 400)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()

print("\n" + ("ALL TESTS PASSED" if not failures else f"{len(failures)} FAILURE(S):"))
for f in failures:
    print("  - " + f)
sys.exit(1 if failures else 0)
