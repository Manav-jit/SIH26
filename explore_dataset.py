import h5py
import numpy as np
from PIL import Image
from huggingface_hub import hf_hub_download
import os

os.makedirs("d:/SIH26/gamus_samples/heights", exist_ok=True)
os.makedirs("d:/SIH26/gamus_samples/classes", exist_ok=True)

def download_and_extract(folder, suffix):
    filename = f"DC_03_26_{suffix}.h5"
    print(f"Downloading {folder}/test/{filename}...")
    try:
        path = hf_hub_download(repo_id="earthflow/GAMUS", filename=f"{folder}/test/{filename}", repo_type="dataset", local_dir="d:/SIH26/gamus_samples")
        
        with h5py.File(path, 'r') as f:
            keys = list(f.keys())
            data = f[keys[0]][:]
            print(f"[{folder}] Shape: {data.shape}, dtype: {data.dtype}, min: {data.min()}, max: {data.max()}")
            
            # Format handling
            if len(data.shape) == 3:
                if data.shape[0] in [1, 3, 4]: 
                    data = np.transpose(data, (1, 2, 0))
                if data.shape[2] == 1:
                    data = data[:, :, 0]
                    
            if folder == "heights":
                # Heights are absolute values (AGL). Let's normalize for visualization/displacement map
                visual_data = (data - data.min()) / (data.max() - data.min() + 1e-8) * 255.0
                visual_data = visual_data.astype(np.uint8)
                Image.fromarray(visual_data).save(f"d:/SIH26/gamus_samples/heights/{filename.replace('.h5', '.png')}")
            elif folder == "classes":
                # Classes are distinct integers
                visual_data = (data * 30).astype(np.uint8)
                Image.fromarray(visual_data).save(f"d:/SIH26/gamus_samples/classes/{filename.replace('.h5', '.png')}")
                
        os.remove(path)
    except Exception as e:
        print(f"Error: {e}")

download_and_extract("heights", "AGL")
download_and_extract("classes", "CLS")
