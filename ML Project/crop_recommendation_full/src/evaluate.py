import argparse
import os
import joblib
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder

def evaluate_model(model_name, model_path, test_df, label_encoder=None):
    """Evaluate one model, save confusion matrix and report."""
    print(f"\n🔍 Evaluating {model_name} ...")
    model = joblib.load(model_path)

    X = test_df.drop("crop", axis=1)
    y_true = test_df["crop"]

    # Handle encoded labels for XGBoost
    if model_name == "XGBoost" and label_encoder is not None:
        y_encoded = label_encoder.transform(y_true)
        y_pred_encoded = model.predict(X)
        y_pred = label_encoder.inverse_transform(y_pred_encoded)
    else:
        y_pred = model.predict(X)

    # Accuracy and classification report
    acc = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred, digits=4)
    print(f"✅ Accuracy: {acc:.4f}")

    # Save classification report
    report_path = f"reports/classification_report_{model_name}.txt"
    with open(report_path, "w") as f:
        f.write(f"Model: {model_name}\nAccuracy: {acc:.4f}\n\n{report}")
    print(f"📄 Saved report → {report_path}")

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=sorted(y_true.unique()))
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=False, cmap="Blues",
                xticklabels=sorted(y_true.unique()),
                yticklabels=sorted(y_true.unique()))
    plt.title(f"Confusion Matrix - {model_name}")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    cm_path = f"reports/confusion_matrix_{model_name}.png"
    plt.savefig(cm_path)
    plt.close()
    print(f"🖼️ Saved confusion matrix → {cm_path}")

    return {"Model": model_name, "Accuracy": acc}


def evaluate_all_models(test_path):
    # Load test data
    test_df = pd.read_csv(test_path)

    # Load label encoder (for XGBoost)
    encoder_path = "models/label_encoder.joblib"
    label_encoder = joblib.load(encoder_path) if os.path.exists(encoder_path) else None

    # Define all models
    model_files = [
        ("DecisionTree", "models/DecisionTree.pkl"),
        ("RandomForest", "models/RandomForest.pkl"),
        ("LogisticRegression", "models/LogisticRegression.pkl"),
        ("XGBoost", "models/XGBoost.pkl"),
        ("BestModel", "models/best_model.pkl"),
    ]

    os.makedirs("reports", exist_ok=True)
    results = []

    print("\n📊 Starting evaluation for all models...\n")

    for name, path in model_files:
        if os.path.exists(path):
            result = evaluate_model(name, path, test_df, label_encoder)
            results.append(result)
        else:
            print(f"⚠️ Skipping {name}: file not found → {path}")

    if results:
        results_df = pd.DataFrame(results)
        results_df.to_csv("reports/model_evaluations.csv", index=False)
        print("\n✅ All results saved → reports/model_evaluations.csv")

        # Plot comparison bar chart
        plt.figure(figsize=(8, 5))
        sns.barplot(data=results_df, x="Model", y="Accuracy", palette="cool")
        plt.title("Model Accuracy Comparison")
        plt.ylim(0, 1.05)
        plt.tight_layout()
        plt.savefig("reports/model_accuracy_comparison.png")
        plt.close()
        print("📊 Saved model accuracy chart → reports/model_accuracy_comparison.png")

        best_model = results_df.loc[results_df["Accuracy"].idxmax()]
        print(f"\n🏆 Best Model: {best_model['Model']} (Accuracy: {best_model['Accuracy']:.4f})")
    else:
        print("\n❌ No models found to evaluate.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to test dataset (CSV)")
    args = parser.parse_args()

    evaluate_all_models(args.data)
