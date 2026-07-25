import os
import sys
import time
import subprocess
import webbrowser
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).parent
FRONTEND_DIR = ROOT_DIR / "frontend"

def run_command(cmd, cwd=None, wait=True):
    print(f"[Civix-AI Launcher] Executing: {' '.join(cmd)}")
    if wait:
        return subprocess.run(cmd, cwd=cwd, check=True)
    else:
        return subprocess.Popen(cmd, cwd=cwd)

def wait_for_backend(url="http://127.0.0.1:8000/api/health", max_retries=30):
    print("⌛ Waiting for FastAPI & PyTorch YOLO model to initialize...")
    for i in range(max_retries):
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    print("✅ FastAPI Backend & YOLO Model loaded successfully!")
                    return True
        except Exception:
            pass
        time.sleep(1)
    print("⚠️ Backend server is taking longer than expected to start.")
    return False

def main():
    print("=" * 60)
    print("🚀 Civix-AI Road Damage Detection Platform - React + FastAPI")
    print("=" * 60)

    # 1. Install frontend node modules if missing
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print("\n📦 Installing React frontend dependencies (npm install)...")
        run_command(["npm.cmd" if sys.platform == "win32" else "npm", "install"], cwd=FRONTEND_DIR)

    # 2. Start FastAPI server
    print("\n⚡ Starting FastAPI Backend Server on http://127.0.0.1:8000 ...")
    backend_proc = run_command([sys.executable, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], cwd=ROOT_DIR, wait=False)

    # 3. Wait until backend is fully online
    wait_for_backend()

    # 4. Start Vite React frontend
    print("⚡ Starting Vite React Frontend Server on http://localhost:5173 ...")
    frontend_proc = run_command(["npm.cmd" if sys.platform == "win32" else "npm", "run", "dev"], cwd=FRONTEND_DIR, wait=False)

    time.sleep(2)
    webbrowser.open("http://localhost:5173")

    print("\n✅ Civix-AI Application is up and running!")
    print("   - Frontend UI: http://localhost:5173")
    print("   - Backend API: http://127.0.0.1:8000/docs")
    print("\nPress Ctrl+C to stop both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down Civix-AI servers...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
