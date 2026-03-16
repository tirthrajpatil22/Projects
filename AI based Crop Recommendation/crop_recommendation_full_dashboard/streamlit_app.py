import streamlit as st
import pandas as pd
import joblib
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import os

# =========================
# ✅ CONFIG & PAGE SETUP
# =========================
st.set_page_config(
    page_title="Farmer Assistant",
    page_icon="🌾",
    layout="wide",
)

# =========================
# ✅ MODEL PATHS (UPDATE THESE)
# =========================
CROP_MODEL_PATH = r"C:\Users\Tirthraj Patil\Desktop\Aies\crop_recommendation_full\models\best_model.pkl"
DISEASE_MODEL_PATH = r"C:\Users\Tirthraj Patil\Desktop\Aies\crop_recommendation_full\disease_detection_project\models\best_disease_model.h5"

# =========================
# ✅ STYLES
# =========================
st.markdown("""
    <style>
    body {
        background-color: #f8fff4;
    }
    .title {
        font-size: 38px;
        font-weight: 800;
        color: #207000;
        text-align: center;
        margin-bottom: 0.2em;
    }
    .subtitle {
        font-size: 20px;
        text-align: center;
        color: #444;
        margin-bottom: 1.5em;
    }
    .success-box {
        background-color: #e6f7e8;
        border-left: 6px solid #3cb371;
        padding: 10px 15px;
        border-radius: 10px;
        margin-bottom: 10px;
    }
    .error-box {
        background-color: #ffe6e6;
        border-left: 6px solid #ff4d4d;
        padding: 10px 15px;
        border-radius: 10px;
        margin-bottom: 10px;
    }
    </style>
""", unsafe_allow_html=True)

# =========================
# ✅ LOAD MODELS
# =========================
def load_crop_model(path):
    if os.path.exists(path):
        model = joblib.load(path)
        st.markdown(f"<div class='success-box'>✅ Crop Recommendation Model loaded successfully from:<br>{path}</div>", unsafe_allow_html=True)
        return model
    else:
        st.markdown(f"<div class='error-box'>❌ Crop model not found at:<br>{path}</div>", unsafe_allow_html=True)
        return None

def load_disease_model(path):
    if os.path.exists(path):
        model = tf.keras.models.load_model(path)
        st.markdown(f"<div class='success-box'>✅ Disease Detection Model loaded successfully from:<br>{path}</div>", unsafe_allow_html=True)
        return model
    else:
        st.markdown(f"<div class='error-box'>❌ Disease model not found at:<br>{path}</div>", unsafe_allow_html=True)
        return None


# =========================
# ✅ SIDEBAR NAVIGATION
# =========================
st.sidebar.title("🌾 Farmer Assistant")
page = st.sidebar.radio(
    "Navigate to:",
    ["🏠 Home", "🌱 Crop Recommendation", "🍃 Disease Detection", "📊 Reports", "ℹ️ About"]
)

# =========================
# ✅ HOME PAGE
# =========================
if page == "🏠 Home":
    st.markdown("<div class='title'>🌾 Farmer Assistant</div>", unsafe_allow_html=True)
    st.markdown("<div class='subtitle'>Empowering Farmers with AI-driven Crop & Disease Insights</div>", unsafe_allow_html=True)
    st.image("https://cdn.pixabay.com/photo/2017/06/06/22/44/field-2373383_1280.jpg", use_container_width=True)

    st.markdown("""
    ### 🚀 Features:
    - 🌱 **Crop Recommendation:** Suggests the most suitable crop based on soil and weather conditions.  
    - 🍃 **Disease Detection:** Detects plant diseases from leaf images using deep learning.  
    - 📊 **Reports:** View model accuracy and performance charts.  
    - 🌍 **Offline Compatible:** No internet required to run your trained models.  
    """)

# =========================
# ✅ CROP RECOMMENDATION PAGE
# =========================
elif page == "🌱 Crop Recommendation":
    st.header("🌱 Crop Recommendation System")
    crop_model = load_crop_model(CROP_MODEL_PATH)

    if crop_model:
        N = st.number_input("Nitrogen (N)", min_value=0.0)
        P = st.number_input("Phosphorus (P)", min_value=0.0)
        K = st.number_input("Potassium (K)", min_value=0.0)
        temperature = st.number_input("Temperature (°C)", min_value=-10.0)
        humidity = st.number_input("Humidity (%)", min_value=0.0, max_value=100.0)
        ph = st.number_input("pH", min_value=0.0, max_value=14.0)
        rainfall = st.number_input("Rainfall (mm)", min_value=0.0)

        if st.button("🔍 Recommend Crop"):
            input_data = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
            prediction = crop_model.predict(input_data)[0]
            st.success(f"🌾 Recommended Crop: **{prediction.upper()}**")

# =========================
# ✅ DISEASE DETECTION PAGE
# =========================
elif page == "🍃 Disease Detection":
    st.header("🍃 Plant Disease Detection")
    disease_model = load_disease_model(DISEASE_MODEL_PATH)

    if disease_model:
        uploaded_file = st.file_uploader("Upload a leaf image:", type=["jpg", "png", "jpeg"])
        if uploaded_file is not None:
            st.image(uploaded_file, caption="Uploaded Leaf", use_container_width=False, width=300)
            if st.button("🔍 Detect Disease"):
                img = image.load_img(uploaded_file, target_size=(224, 224))
                img_array = image.img_to_array(img) / 255.0
                img_array = np.expand_dims(img_array, axis=0)
                predictions = disease_model.predict(img_array)
                class_idx = np.argmax(predictions)
                confidence = np.max(predictions) * 100

                st.success(f"🩺 Predicted Class Index: {class_idx}")
                st.info(f"Prediction Confidence: **{confidence:.2f}%**")

# =========================
# ✅ REPORTS PAGE
# =========================
elif page == "📊 Reports":
    st.header("📊 Model Reports")
    if os.path.exists("reports/model_comparison.csv"):
        df = pd.read_csv("reports/model_comparison.csv")
        st.dataframe(df)
    else:
        st.warning("No reports found. Please train models first.")

# =========================
# ✅ ABOUT PAGE
# =========================
elif page == "ℹ️ About":
    st.header("ℹ️ About the Project")
    st.markdown("""
    **Project:** AI-Powered Farmer Assistant  
    **Location:** Pune, India 🇮🇳  
    **Developed by:** Kavindra & Tirthraj  
    **Technology Stack:** Python, Streamlit, TensorFlow, Scikit-Learn  
    **Modules:**
    - Crop Recommendation (XGBoost / Random Forest)
    - Disease Detection (Transfer Learning with EfficientNetB0)
    """)
