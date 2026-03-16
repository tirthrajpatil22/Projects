import argparse, joblib, pandas as pd, os

def predict(model_path, input_path, output_path):
    model = joblib.load(model_path)
    df = pd.read_csv(input_path)
    features = df.copy()
    if 'crop' in features.columns:
        features = features.drop('crop', axis=1)
    preds = model.predict(features)
    df['predicted_crop'] = preds
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f'Predictions saved to {output_path}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, help='Trained model path')
    parser.add_argument('--input', required=True, help='CSV with feature rows to predict')
    parser.add_argument('--output', required=True, help='Output CSV path with predictions')
    args = parser.parse_args()
    predict(args.model, args.input, args.output)
