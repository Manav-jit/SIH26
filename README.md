# AETHER - 3D Feature Extraction from 2D Aerial Imagery

**Smart India Hackathon 2026**

AETHER is a web-based platform that leverages deep learning to convert standard 2D aerial or satellite imagery into 3D structures. It predicts depth maps and semantic segmentations from a single RGB image to reconstruct Level of Detail 1 (LoD1) 3D buildings, trees, and road networks automatically.

## 🚀 Key Features

- **Monocular Depth Estimation:** Generates height/depth maps (AGL) from a single overhead RGB image.
- **Semantic Segmentation:** Classifies pixels into buildings, trees, roads, and background.
- **3D Vectorization (LoD1):** Extracts structural footprints and extrudes them based on the predicted depth, creating actionable 3D objects.
- **Interactive 3D Viewer:** Built with React Three Fiber, allowing users to upload images and instantly view and interact with the reconstructed 3D environments.
- **Evaluation Pipeline:** Scripts to evaluate performance against ground-truth datasets.

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Vite
- Three.js & React Three Fiber (for 3D visualization)
- Tailwind CSS 4

**Backend:**
- FastAPI (Python)
- OpenCV, Pillow
- Deep Learning (Depth estimation & Segmentation models)

## 📂 Project Structure

- `backend/`: FastAPI server handling image processing, inference, and vectorization (`app.py`, `depth_model.py`, `segmentation_model.py`, `vectorizer.py`).
- `frontend/`: React application containing the UI and the interactive 3D viewer.
- `extract_buildings.py`: Standalone script for testing vectorization of buildings and trees.
- `evaluate.py`: Script to run evaluation metrics on models.
- `download_*.py`: Utilities to download required datasets (demo, eval data, H5 models, etc.).

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Start the FastAPI server:
```bash
python app.py
# The API will run on http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
# The frontend will run on http://localhost:5173
```

## 🧠 Usage

1. Open the frontend in your browser.
2. Upload an aerial RGB image.
3. The backend will process the image through the segmentation and depth models.
4. The vectorized 3D data (LoD1) is returned to the frontend.
5. Explore the generated 3D city/environment in the interactive canvas!

## 🏆 Hackathon Details
- **Event:** Smart India Hackathon (SIH) 2026
- **Repository:** [Manav-jit/SIH26](https://github.com/Manav-jit/SIH26)
