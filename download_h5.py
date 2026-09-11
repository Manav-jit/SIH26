import h5py
import numpy as np
from PIL import Image
from huggingface_hub import hf_hub_download
import os

os.makedirs("d:/SIH26/gamus_samples", exist_ok=True)

files = [
    'DC_03_26_RGB.h5',
    'DC_05_28_RGB.h5',
    'DC_05_30_RGB.h5',
    'DC_07_21_RGB.h5',
    'DC_07_29_RGB.h5'
]

for filename in files:
    print(f"Downloading and extracting {filename}...")
    try:
        # Download
        h5_path = hf_hub_download(repo_id="earthflow/GAMUS", filename=f"images/test/{filename}", repo_type="dataset", local_dir="d:/SIH26/gamus_samples")
        
        # Read h5 and convert to image
        with h5py.File(h5_path, 'r') as f:
            keys = list(f.keys())
            if not keys:
                print(f"No keys found in {filename}")
                continue
                
            data = f[keys[0]][:]
            
            # Format handling
            if len(data.shape) == 3:
                if data.shape[0] in [1, 3, 4]: # (C, H, W)
                    data = np.transpose(data, (1, 2, 0))
                
                # If 1 channel, drop it to (H, W) for greyscale
                if data.shape[2] == 1:
                    data = data[:, :, 0]
                
                # Normalize if it's float or large ints
                if data.dtype != np.uint8:
                    data = (data - data.min()) / (data.max() - data.min() + 1e-8) * 255.0
                    data = data.astype(np.uint8)
                
                img = Image.fromarray(data)
                out_name = filename.replace('.h5', '.png')
                img.save(f"d:/SIH26/gamus_samples/{out_name}")
                print(f"Successfully saved {out_name}")
            else:
                print(f"Unexpected shape {data.shape} in {filename}")
                
        # Clean up the .h5 file to save space
        os.remove(h5_path)
    except Exception as e:
        print(f"Error processing {filename}: {e}")

print("Done extracting samples!")
