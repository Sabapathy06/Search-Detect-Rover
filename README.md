# Rescue Server (FastAPI)

Conversion of the original Flask server to FastAPI. Contains endpoints for image upload, dashboard rendering, static uploads serving, and camera streaming.

Quick start

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Run with uvicorn:

```bash
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

Or run directly:

```bash
python app.py
```

Notes
- Templates expected in `templates/` (dashboard.html)
- Uploaded images stored in `static/uploads/`
- Camera stream URL configured in `app.py` as `CAMERA_URL`
