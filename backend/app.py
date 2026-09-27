from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import uvicorn
import base64
import numpy as np
from depth_model import get_estimator
from segmentation_model import get_seg_estimator
from vectorizer import extract_features

app = FastAPI(title="AETHER API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    get_estimator()

@app.get("/")
def read_root():
    return {"message": "AETHER API is running."}

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    class_map: UploadFile = File(None),
    ground_truth: UploadFile = File(None)
):
    try:
        estimator = get_estimator()
        
        # Read the main image
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # 1. Get Raw Prediction
        raw_depth_bytes = estimator.estimate_depth(pil_image)
        raw_b64 = base64.b64encode(raw_depth_bytes).decode('utf-8')
        
        response_data = {
            "raw_depth": f"data:image/png;base64,{raw_b64}"
        }
        
        # 2. Vectorize LoD1 if class_map provided OR generate one dynamically
        if class_map:
            class_contents = await class_map.read()
            if class_contents and len(class_contents) > 0:
                class_img = Image.open(io.BytesIO(class_contents)).convert("L")
                class_arr = np.array(class_img)
            else:
                class_arr = None
        else:
            seg_estimator = get_seg_estimator()
            class_arr = seg_estimator.segment_image(pil_image)
            
        if class_arr is not None:
            # Determine which height map to use for extrusion
            if ground_truth:
                gt_contents = await ground_truth.read()
                if gt_contents and len(gt_contents) > 0:
                    depth_img = Image.open(io.BytesIO(gt_contents)).convert("L")
                else:
                    depth_img = Image.open(io.BytesIO(raw_depth_bytes)).convert("L")
            else:
                depth_img = Image.open(io.BytesIO(raw_depth_bytes)).convert("L")
            
            depth_arr = np.array(depth_img)
            
            lod1_objects = extract_features(class_arr, depth_arr)
            response_data["lod1_objects"] = lod1_objects
            
        return JSONResponse(content=response_data)
    except Exception as e:
        import traceback
        print(f"Error during prediction: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
