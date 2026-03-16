import tensorflow as tf
import numpy as np
import os
import pandas as pd
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model

# ✅ Paths
MODEL_PATH = "../models/best_disease_model.h5"
DATASET_PATH = "../data/dataset/train"
SAMPLE_PATH = "../data/sample"
REPORTS_PATH = "../reports/predictions.csv"

# ✅ Check model
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"❌ Model not found at {MODEL_PATH}. Train the model first.")

# ✅ Load model
model = load_model(MODEL_PATH)
print("✅ Model loaded successfully!")

# ✅ Class names
if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(f"❌ Dataset path not found: {DATASET_PATH}")
class_names = sorted(os.listdir(DATASET_PATH))
print(f"🧾 Found {len(class_names)} classes.")

# ✅ Predict function
def predict_disease(img_path):
    try:
        img = image.load_img(img_path, target_size=(224, 224))
        img_array = image.img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        predictions = model.predict(img_array, verbose=0)
        predicted_class_index = np.argmax(predictions)
        confidence = np.max(predictions)
        predicted_class = class_names[predicted_class_index]

        return predicted_class, confidence * 100
    except Exception as e:
        return "Error", str(e)

# ✅ Run predictions for all images in /data/sample
if __name__ == "__main__":
    if not os.path.exists(SAMPLE_PATH):
        raise FileNotFoundError(f"❌ Folder not found: {SAMPLE_PATH}")

    results = []

    print("\n🔍 Starting disease prediction for images in /data/sample/ ...\n")

    for img_file in os.listdir(SAMPLE_PATH):
        if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(SAMPLE_PATH, img_file)
            predicted_class, confidence = predict_disease(img_path)
            print(f"🖼️ {img_file} → 🍃 {predicted_class} ({confidence:.2f}% confidence)")
            results.append([img_file, predicted_class, confidence])

    # ✅ Save results
    if results:
        os.makedirs(os.path.dirname(REPORTS_PATH), exist_ok=True)
        df = pd.DataFrame(results, columns=["Image", "Predicted Class", "Confidence (%)"])
        df.to_csv(REPORTS_PATH, index=False)
        print(f"\n📄 All results saved to: {REPORTS_PATH}")
    else:
        print("⚠️ No images found in /data/sample/")
