import tensorflow as tf
import numpy as np
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import load_model
import pandas as pd
from sklearn.utils.multiclass import unique_labels

# ✅ Paths
MODEL_PATH = "../models/best_disease_model.h5"
DATASET_PATH = "../data/dataset/test"
REPORTS_DIR = "../reports"

# ✅ Ensure folders exist
os.makedirs(REPORTS_DIR, exist_ok=True)

# ✅ Load model
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"❌ Model not found at {MODEL_PATH}. Train the model first.")

model = load_model(MODEL_PATH)
print("✅ Model loaded successfully!")

# ✅ Prepare test data
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
test_datagen = ImageDataGenerator(rescale=1.0 / 255)

test_gen = test_datagen.flow_from_directory(
    DATASET_PATH,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

# ✅ Get true labels and predictions
Y_true = test_gen.classes
Y_pred_prob = model.predict(test_gen)
Y_pred = np.argmax(Y_pred_prob, axis=1)
class_labels = list(test_gen.class_indices.keys())

# ✅ Handle class mismatch dynamically
labels = unique_labels(Y_true, Y_pred)
matched_class_labels = [class_labels[i] for i in labels if i < len(class_labels)]

# ✅ Classification Report
report = classification_report(Y_true, Y_pred, labels=labels, target_names=matched_class_labels, output_dict=True)
report_df = pd.DataFrame(report).transpose()
report_path = os.path.join(REPORTS_DIR, "classification_report_disease.csv")
report_df.to_csv(report_path, index=True)
print(f"📄 Classification report saved to {report_path}")

# ✅ Confusion Matrix
cm = confusion_matrix(Y_true, Y_pred, labels=labels)
plt.figure(figsize=(12, 10))
sns.heatmap(cm, annot=False, cmap="Greens", xticklabels=matched_class_labels, yticklabels=matched_class_labels)
plt.title("Confusion Matrix - Disease Detection")
plt.xlabel("Predicted")
plt.ylabel("Actual")
cm_path = os.path.join(REPORTS_DIR, "confusion_matrix_disease.png")
plt.savefig(cm_path, dpi=300, bbox_inches="tight")
plt.close()
print(f"🖼️ Confusion matrix saved to {cm_path}")

# ✅ Accuracy Plot
if "accuracy" in report_df.index:
    accuracy = report_df.loc["accuracy", "precision"] * 100
    plt.figure(figsize=(6, 4))
    plt.bar(["Accuracy"], [accuracy], color="#2e7d32")
    plt.ylim(0, 100)
    plt.title(f"Model Accuracy: {accuracy:.2f}%")
    acc_path = os.path.join(REPORTS_DIR, "accuracy_bar_disease.png")
    plt.savefig(acc_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"📊 Accuracy chart saved to {acc_path}")

print("\n✅ Disease Detection Evaluation Completed Successfully!")
