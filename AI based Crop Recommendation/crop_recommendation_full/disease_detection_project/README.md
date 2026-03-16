# Disease Detection Module (Transfer Learning)

This module performs plant leaf disease detection using MobileNetV2 transfer learning.
It expects your dataset arranged like this (common PlantVillage layout):

dataset_root/
├── train/
│   ├── ClassA/
│   ├── ClassB/
│   └── ...
└── test/
    ├── ClassA/
    ├── ClassB/
    └── ...

## Files in this package
- src/train_disease.py     : Train MobileNetV2 on your dataset (transfer learning)
- src/evaluate_disease.py  : Evaluate saved model on test set, outputs reports
- src/predict_disease.py   : Predict single image and print class + confidence
- requirements.txt         : Python dependencies
- models/                  : Saved model and class mapping files will appear here
- reports/                 : Generated plots and reports will be saved here

## Quick steps (after you download & extract)
1. Place your real dataset somewhere on your disk (it can be outside this folder).
2. Edit the three scripts in `src/` to set your dataset paths OR pass paths via CLI.
   - You'll see clear TODO placeholders:
     e.g. train_dir = r"C:\path\to\your\dataset\train"
3. Open terminal/PowerShell inside this project folder.
   ```bash
   pip install -r requirements.txt
   python src/train_disease.py --train "C:\full\path\to\train" --val "C:\full\path\to\test" --epochs 8
   python src/evaluate_disease.py --data "C:\full\path\to\test"
   python src/predict_disease.py --image "C:\path\to\one_leaf.jpg"
   ```
4. Outputs:
   - models/disease_model.h5
   - models/class_indices.json  (index->class list)
   - reports/training_history.png
   - reports/confusion_matrix.png
   - reports/classification_report.txt

## Notes
- The dataset itself (3GB) is NOT included. Keep it where it already is and provide its path when running scripts.
- If your dataset folders are named in a way that differs from training labels, ensure class folder names match across train/test.
- If you want the scripts to use paths by default, open `src/train_disease.py` and replace the placeholder with your absolute path.
