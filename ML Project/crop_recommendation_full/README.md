# Crop Recommendation ML Pipeline (Full Package)

This package includes scripts, a small sample dataset, and instructions so you can run the pipeline locally.

Steps:
1. Install dependencies:
   pip install -r requirements.txt

2. If you want the full Kaggle dataset, download it from:
   https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
   and place `crop_data.csv` into `data/raw/`. (A small sample is included.)

3. Preprocess:
   python src/preprocess.py --input data/raw/crop_data.csv --output data/processed

4. Train:
   python src/train.py --data data/processed/train.csv --model models/model.pkl

5. Evaluate:
   python src/evaluate.py --data data/processed/test.csv --model models/model.pkl

6. Predict:
   python src/predict.py --model models/model.pkl --input data/raw/sample_predict.csv --output reports/predictions.csv

Note: This package includes a small sample `data/raw/crop_data.csv` so you can test immediately.
To run on the full dataset, download the Kaggle CSV and replace the sample file.
