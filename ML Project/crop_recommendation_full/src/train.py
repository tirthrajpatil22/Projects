import argparse
import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder

def train_and_compare(data_path):
    # Load dataset
    df = pd.read_csv(data_path)
    if 'crop' not in df.columns:
        raise KeyError("Expected 'crop' column in processed data")

    X = df.drop('crop', axis=1)
    y = df['crop']

    # -------------------------------
    # Encode labels for XGBoost
    # -------------------------------
    encoder_path = "models/label_encoder.joblib"
    if os.path.exists(encoder_path):
        le = joblib.load(encoder_path)
        y_encoded = le.transform(y)
    else:
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        os.makedirs("models", exist_ok=True)
        joblib.dump(le, encoder_path)

    # -------------------------------
    # Define models
    # -------------------------------
    models = {
        "DecisionTree": DecisionTreeClassifier(random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
    }

    results = []
    os.makedirs("models", exist_ok=True)
    print("Training and comparing models...\n")

    # -------------------------------
    # Train & Evaluate
    # -------------------------------
    for name, model in models.items():
        if name == "XGBoost":
            model.fit(X, y_encoded)
            preds = model.predict(X)
            preds_decoded = le.inverse_transform(preds)
            acc = accuracy_score(y, preds_decoded)
        else:
            model.fit(X, y)
            preds = model.predict(X)
            acc = accuracy_score(y, preds)

        results.append({"Model": name, "Accuracy": acc})
        model_path = f"models/{name}.pkl"
        joblib.dump(model, model_path)
        print(f"{name} trained and saved → {model_path} (Accuracy: {acc:.4f})")

    # -------------------------------
    # Compare Models
    # -------------------------------
    results_df = pd.DataFrame(results)
    best_model_row = results_df.loc[results_df['Accuracy'].idxmax()]
    best_model_name = best_model_row['Model']
    best_model_acc = best_model_row['Accuracy']

    # Save comparison CSV
    os.makedirs("reports", exist_ok=True)
    results_df.to_csv("reports/model_comparison.csv", index=False)
    print("\nModel comparison results saved → reports/model_comparison.csv\n")

    # Save best model
    best_model = models[best_model_name]
    best_model_path = "models/best_model.pkl"
    joblib.dump(best_model, best_model_path)
    print(f"✅ Best model: {best_model_name} (Accuracy: {best_model_acc:.4f}) saved as → {best_model_path}")

    return results_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Processed train CSV path")
    args = parser.parse_args()
    train_and_compare(args.data)
