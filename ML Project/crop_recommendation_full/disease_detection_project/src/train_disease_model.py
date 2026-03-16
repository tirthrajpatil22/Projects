import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# ===============================
# 📁 Dataset Paths
# ===============================
BASE_DIR = os.path.join("..", "data", "dataset")
TRAIN_DIR = os.path.join(BASE_DIR, "train")
VAL_DIR = os.path.join(BASE_DIR, "val")
TEST_DIR = os.path.join(BASE_DIR, "test")

# ===============================
# 🧹 Data Preprocessing
# ===============================
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=25,
    width_shift_range=0.15,
    height_shift_range=0.15,
    shear_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

val_test_datagen = ImageDataGenerator(rescale=1./255)

train_gen = train_datagen.flow_from_directory(
    TRAIN_DIR, target_size=(224, 224), batch_size=32, class_mode='categorical'
)

val_gen = val_test_datagen.flow_from_directory(
    VAL_DIR, target_size=(224, 224), batch_size=32, class_mode='categorical'
)

test_gen = val_test_datagen.flow_from_directory(
    TEST_DIR, target_size=(224, 224), batch_size=32, class_mode='categorical'
)

# ===============================
# 🧠 Model Setup
# ===============================
base_model = EfficientNetB3(weights='imagenet', include_top=False, input_shape=(224, 224, 3))

# Unfreeze all layers for full fine-tuning
for layer in base_model.layers:
    layer.trainable = True

x = GlobalAveragePooling2D()(base_model.output)
x = BatchNormalization()(x)
x = Dropout(0.5)(x)
output = Dense(train_gen.num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=output)

# ===============================
# ⚡ Compile
# ===============================
model.compile(optimizer=Adam(learning_rate=1e-5),
              loss='categorical_crossentropy',
              metrics=['accuracy'])

# ===============================
# 🧩 Callbacks
# ===============================
os.makedirs("../models", exist_ok=True)

checkpoint = ModelCheckpoint("../models/best_disease_model.h5",
                             monitor='val_accuracy',
                             save_best_only=True,
                             mode='max',
                             verbose=1)

early_stop = EarlyStopping(monitor='val_accuracy',
                           patience=4,
                           restore_best_weights=True,
                           verbose=1)

reduce_lr = ReduceLROnPlateau(monitor='val_loss',
                              factor=0.3,
                              patience=2,
                              verbose=1,
                              min_lr=1e-7)

# ===============================
# 🚀 Train
# ===============================
EPOCHS = 20
history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS,
    callbacks=[checkpoint, early_stop, reduce_lr]
)

# ===============================
# 🧾 Evaluate
# ===============================
loss, acc = model.evaluate(test_gen)
print(f"✅ Test Accuracy: {acc:.4f}")

# Save final model
model.save("../models/final_disease_model.h5")
print("🎉 Training complete. Model saved to ../models/final_disease_model.h5")
