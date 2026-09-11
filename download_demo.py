import h5py
import numpy as np
from PIL import Image
from huggingface_hub import hf_hub_download
import os

os.makedirs("d:/SIH26/demo_dataset", exist_ok=True)

tiles = [
    'DC_03_26',
    'DC_05_28',
    'DC_05_30',
    'DC_07_21',
    'DC_07_29'
]

modalities = ['RGB', 'AGL', 'CLS']

for tile in tiles:
    for mod in modalities:
        filename = f"{tile}_{mod}.h5"
        print(f"Downloading and extracting {filename}...")
        try:
            if mod == 'RGB':
                repo_path = f"images/test/{filename}"
            elif mod == 'AGL':
                repo_path = f"heights/test/{filename}"
            elif mod == 'CLS':
                repo_path = f"classes/test/{filename}"
                
            # Download
            h5_path = hf_hub_download(
                repo_id="earthflow/GAMUS", 
                filename=repo_path, 
                repo_type="dataset", 
                local_dir="d:/SIH26/demo_dataset"
            )
            
            # Read h5 and convert to image
            with h5py.File(h5_path, 'r') as f:
                keys = list(f.keys())
                if not keys:
                    print(f"No keys found in {filename}")
                    continue
                    
                data = f[keys[0]][:]
                
                # Format handling
                if len(data.shape) == 3 and data.shape[0] == 3: # (C, H, W) -> (H, W, C)
                    data = np.transpose(data, (1, 2, 0))
                    
                if mod == 'CLS':
                    # Scale class values so they are visible in PNG format
                    data = (data * 30).astype(np.uint8)
                elif mod == 'AGL':
                    # Height maps clipped to 255
                    data = np.clip(data, 0, 255).astype(np.uint8)
                else:
                    data = data.astype(np.uint8)
                    
                if len(data.shape) == 2:
                    img = Image.fromarray(data, mode='L')
                else:
                    img = Image.fromarray(data, mode='RGB')
                    
                out_name = filename.replace('.h5', '.png')
                img.save(f"d:/SIH26/demo_dataset/{out_name}")
                print(f"Successfully saved {out_name}")
                    
            # Clean up the .h5 file to save space
            os.remove(h5_path)
        except Exception as e:
            print(f"Error processing {filename}: {e}")

print("Demo dataset ready!")
