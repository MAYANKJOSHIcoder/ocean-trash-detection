import subprocess
import sys
import time
import os
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND = ROOT / "backend" / "app.py"


def main():
    print(f"[main] Starting unified backend on http://localhost:5000", flush=True)
    proc = subprocess.Popen(
        [sys.executable, str(BACKEND)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    try:
        for line in proc.stdout:
            print(line, end='', flush=True)
    except KeyboardInterrupt:
        print("\n[main] Stopping.", flush=True)
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    main()