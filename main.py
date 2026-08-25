import subprocess
import sys
import time

APPS = [
    ("1-image-detect", 5001),
    ("2-webcam-detect", 5002),
    ("3-video-live-detect", 5003),
]

procs = {}


def start(folder, port):
    procs[folder] = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=folder,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"[main] {folder} -> http://localhost:{port} (pid {procs[folder].pid})", flush=True)


def stop_all():
    for p in procs.values():
        if p.poll() is None:
            p.terminate()
    for p in procs.values():
        try:
            p.wait(timeout=10)
        except subprocess.TimeoutExpired:
            p.kill()


def main():
    for folder, port in APPS:
        start(folder, port)
    print("[main] Running. Press Ctrl+C to stop all.", flush=True)
    try:
        while True:
            time.sleep(2)
            for folder, port in APPS:
                p = procs[folder]
                if p.poll() is not None:
                    print(f"[main] {folder} exited (code {p.returncode}). Restarting.", flush=True)
                    time.sleep(2)
                    start(folder, port)
    except KeyboardInterrupt:
        print("\n[main] Stopping all.", flush=True)
        stop_all()


if __name__ == "__main__":
    main()
