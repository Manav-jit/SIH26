from huggingface_hub import HfFileSystem, hf_hub_download
import os

fs = HfFileSystem()
print("Listing files in datasets/earthflow/GAMUS/images...")
files = fs.ls("datasets/earthflow/GAMUS/images", detail=False)

# Take first 5 files
sample_files = files[:5]
print(f"Found {len(files)} files. Downloading first 5...")

os.makedirs("d:/SIH26/dataset/images", exist_ok=True)
os.makedirs("d:/SIH26/dataset/height", exist_ok=True)
os.makedirs("d:/SIH26/dataset/classes", exist_ok=True)

for file in sample_files:
    # Handle the fact that fs.ls might return the 'images' folder itself if it's empty, or full paths
    if not file.endswith('.png') and not file.endswith('.jpg') and not file.endswith('.tif'):
        continue
        
    filename = file.split("/")[-1]
    print(f"Downloading {filename}...")
    
    # Download image
    hf_hub_download(repo_id="earthflow/GAMUS", filename=f"images/{filename}", repo_type="dataset", local_dir="d:/SIH26/dataset")
    
    # Download corresponding height map
    try:
        hf_hub_download(repo_id="earthflow/GAMUS", filename=f"height/{filename}", repo_type="dataset", local_dir="d:/SIH26/dataset")
    except Exception as e:
        print(f"Height map for {filename} not found.")
        
    # Download corresponding class map
    try:
        hf_hub_download(repo_id="earthflow/GAMUS", filename=f"classes/{filename}", repo_type="dataset", local_dir="d:/SIH26/dataset")
    except Exception as e:
        pass

print("Done downloading samples!")
