import os
import shutil
import random
from tqdm import tqdm

# ✅ Correct base dataset path for your setup
ORIG_DIR = "../data/PlantVillage"

# New dataset structure (train/val/test)
BASE_DIR = "../data"
TRAIN_DIR = os.path.join(BASE_DIR, "train")
VAL_DIR = os.path.join(BASE_DIR, "val")
TEST_DIR = os.path.join(BASE_DIR, "test")

# Split ratios
train_split = 0.7
val_split = 0.2
test_split = 0.1

# Create new directories
for folder in [TRAIN_DIR, VAL_DIR, TEST_DIR]:
    os.makedirs(folder, exist_ok=True)

# Loop through class folders and split
for cls in tqdm(os.listdir(ORIG_DIR), desc="📦 Splitting dataset"):
    cls_path = os.path.join(ORIG_DIR, cls)
    if not os.path.isdir(cls_path):
        continue

    images = os.listdir(cls_path)
    random.shuffle(images)

    n_total = len(images)
    n_train = int(train_split * n_total)
    n_val = int(val_split * n_total)

    train_imgs = images[:n_train]
    val_imgs = images[n_train:n_train + n_val]
    test_imgs = images[n_train + n_val:]

    for subset, subset_imgs in zip(
        [TRAIN_DIR, VAL_DIR, TEST_DIR],
        [train_imgs, val_imgs, test_imgs]
    ):
        subset_cls_dir = os.path.join(subset, cls)
        os.makedirs(subset_cls_dir, exist_ok=True)
        for img in subset_imgs:
            src = os.path.join(cls_path, img)
            dst = os.path.join(subset_cls_dir, img)
            shutil.copy2(src, dst)

print("✅ Dataset successfully split into train/val/test folders inside '../data/'!")
