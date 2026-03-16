import argparse, os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def preprocess(input_path, output_dir):
    df = pd.read_csv(input_path)
    # Standardize column names
    df.columns = [c.strip() for c in df.columns]
    # If label column named 'Crop' or 'crop' or 'label', normalize to 'crop'
    for candidate in ['Crop','crop','label','Label']:
        if candidate in df.columns:
            df.rename(columns={candidate:'crop'}, inplace=True)
            break
    if 'crop' not in df.columns:
        raise KeyError("No 'crop' column found in input CSV. Found columns: " + ",".join(df.columns))
    # simple cleaning: drop duplicates
    df = df.drop_duplicates().reset_index(drop=True)
    # Train/test split
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['crop'])
    os.makedirs(output_dir, exist_ok=True)
    train_df.to_csv(os.path.join(output_dir, 'train.csv'), index=False)
    test_df.to_csv(os.path.join(output_dir, 'test.csv'), index=False)
    # Save label encoder
    le = LabelEncoder()
    le.fit(df['crop'])
    import joblib
    os.makedirs('models', exist_ok=True)
    joblib.dump(le, 'models/label_encoder.joblib')
    print(f'Preprocessing done. train.csv and test.csv saved to {output_dir}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Raw CSV input path')
    parser.add_argument('--output', required=True, help='Output directory for processed files')
    args = parser.parse_args()
    preprocess(args.input, args.output)
