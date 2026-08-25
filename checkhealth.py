import json
import sys
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
    base = f"http://127.0.0.1:{port}"
    try:
        status, html = get(base + "/")
    except Exception as e:
        check("server reachable", False, f"{e} -- not running? start main.py")
        continue
    check("server reachable", status == 200)

    for m in markers:
        check(f"page contains {m.decode()!r}", m in html)

    status, body = post(base + "/detect", make_jpeg())
    check("POST /detect jpeg returns 200", status == 200)
    if status == 200:
        dets = json.loads(body)
        check("response is a JSON list", isinstance(dets, list))
        if isinstance(dets, list) and dets:
            keys_ok = all(set(d) == {"box", "conf", "cls"} and len(d["box"]) == 4 for d in dets)
            check("detections have box/conf/cls", keys_ok)
            print(f"       model found {len(dets)} object(s): " + ", ".join(d["cls"] for d in dets[:5]))

    status, _ = post(base + "/detect", b"not-an-image")
    check("POST /detect garbage returns 400", status == 400)

print("\n" + ("ALL HEALTH CHECKS PASSED" if not failures else f"{len(failures)} ISSUE(S) FOUND:"))
for f in failures:
    print("  - " + f)
sys.exit(1 if failures else 0)
