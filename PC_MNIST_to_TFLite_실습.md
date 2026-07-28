# PC에서 MNIST 숫자 인식 → TFLite 변환 → MCU 배포 시뮬레이션 실습

> **목표**: 일반 PC 머신러닝 모델과 MCU용 경량 모델(TFLite)의 차이를 직접 실습으로 체험한다.

---

## 목차

1. [개요](#1-개요)
2. [실습 1: PC에서 MNIST 숫자 인식 모델 학습](#2-실습-1-pc에서-mnist-숫자-인식-모델-학습)
3. [실습 2: TFLite 변환 및 양자화](#3-실습-2-tflite-변환-및-양자화)
4. [실습 3: PC에서 TFLite 모델 추론 및 검증](#4-실습-3-pc에서-tflite-모델-추론-및-검증)
5. [실습 5: 모델 크기 / 추론 시간 / 정확도 비교](#5-실습-5-모델-크기--추론-시간--정확도-비교)
6. [종합 비교표](#6-종합-비교표)
7. [결론: TinyML이 필요한 이유](#7-결론-tinyml이-필요한-이유)

---

## 1. 개요

### 1.1 이 실습을 왜 하는가

MCU(Microcontroller Unit, 예: ESP32, Arduino)에 머신러닝 모델을 올리려면 **극한의 경량화**가 필요합니다.
이 실습에서는 동일한 MNIST 데이터셋으로:

1. **일반 PC용 Keras 모델** (float32, 수백 KB~MB)
2. **MCU용 TFLite 양자화 모델** (int8, 수십 KB)

두 모델을 직접 만들고 **크기, 속도, 정확도**를 비교하면서 TinyML 기법의 필요성을 체감합니다.

### 1.2 MNIST 데이터셋

- 0~9까지 손글씨 숫자 이미지
- 28x28 픽셀, Grayscale
- 학습: 60,000장 / 테스트: 10,000장

```

예시 이미지:
  .test_split.png

  .  8888888  7777777  3333333
  .  8888888  7777777  3333333
  .  8888888  7777777  3333333

```

### 1.3 실습 환경

| 항목 | 사양 |
|------|------|
| **Python** | 3.8 이상 |
| **TensorFlow** | 2.x (CPU 버전으로 충분) |
| **필요 라이브러리** | tensorflow, numpy, matplotlib, pillow |

#### 설치 명령어

```bash
pip install tensorflow numpy matplotlib pillow
```

> GPU 없이 CPU만으로도 MNIST는 1~2분 내에 학습 완료됩니다.

---

## 2. 실습 1: PC에서 MNIST 숫자 인식 모델 학습

### 2.1 전체 코드

```python
# mnist_pc_train.py
# PC에서 MNIST 숫자 인식 모델 학습 (float32)

import tensorflow as tf
from tensorflow import keras
import numpy as np
import time
import os

# 1. MNIST 데이터 로드
print("[1/5] MNIST 데이터 로드 중...")
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()

# 정규화 (0~255 → 0~1)
x_train = x_train.astype(np.float32) / 255.0
x_test = x_test.astype(np.float32) / 255.0

# shape 확인
print(f"  학습 데이터: {x_train.shape}, 레이블: {y_train.shape}")
print(f"  테스트 데이터: {x_test.shape}, 레이블: {y_test.shape}")
print(f"  픽셀 범위: [{x_train.min()}, {x_train.max()}]")

# 2. 모델 정의
print("\n[2/5] 모델 정의 중...")
model = keras.Sequential([
    # 입력: 28x28 1채널 (Grayscale)
    keras.layers.InputLayer(input_shape=(28, 28, 1)),

    # Flatten: 28x28 → 784
    keras.layers.Flatten(),

    # 은닉층 1: 128 뉴런, ReLU 활성화
    keras.layers.Dense(128, activation='relu'),

    # 은닉층 2: 64 뉴런, ReLU 활성화
    keras.layers.Dense(64, activation='relu'),

    # 출력층: 10 뉴런 (0~9), Softmax
    keras.layers.Dense(10, activation='softmax')
])

model.summary()

# 3. 모델 컴파일
print("\n[3/5] 모델 컴파일 중...")
model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# 4. 모델 학습
print("\n[4/5] 모델 학습 시작...")

# EarlyStopping: 검증 손실이 3번 연속 개선 없으면 중단
callbacks = [
    keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)
]

start_time = time.time()
history = model.fit(
    x_train, y_train,
    batch_size=64,
    epochs=20,
    validation_split=0.2,  # 학습 중 20%를 검증용으로 분할
    callbacks=callbacks,
    verbose=2
)
train_time = time.time() - start_time

print(f"\n✅ 학습 완료! 소요 시간: {train_time:.2f}초")

# 5. 모델 평가
print("\n[5/5] 테스트 세트 평가 중...")
test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
print(f"\n📊 PC 모델 (float32) 테스트 정확도: {test_acc:.4f} ({test_acc * 100:.2f}%)")
print(f"   테스트 손실: {test_loss:.4f}")

# 6. 모델 저장
model.save('mnist_pc_model.h5')
print("\n💾 모델 저장 완료: mnist_pc_model.h5")
```

### 2.2 실행 결과 예시

```
[1/5] MNIST 데이터 로드 중...
  학습 데이터: (60000, 28, 28), 레이블: (60000,)
  테스트 데이터: (10000, 28, 28), 레이블: (10000,)
  픽셀 범위: [0.0, 1.0]

[2/5] 모델 정의 중...
Model: "sequential"
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━┓
┃ Layer (type)                   ┃ Output Shape   ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━┩
│ flatten (Flatten)              │ (None, 784)    │
├────────────────────────────────┼────────────────┤
│ dense (Dense)                  │ (None, 128)    │
├────────────────────────────────┼────────────────┤
│ dense_1 (Dense)                │ (None, 64)     │
├────────────────────────────────┼────────────────┤
│ dense_2 (Dense)                │ (None, 10)     │
└────────────────────────────────┴────────────────┘
Total params: 109,386
Trainable params: 109,386
Non-trainable params: 0

[4/5] 모델 학습 시작...
Epoch 1/20 - loss: 0.3531 - accuracy: 0.8994 - val_loss: 0.1750 - val_accuracy: 0.9480
Epoch 2/20 - loss: 0.1407 - accuracy: 0.9582 - val_loss: 0.1211 - val_accuracy: 0.9636
...
Epoch 8/20 - loss: 0.0190 - accuracy: 0.9939 - val_loss: 0.0824 - val_accuracy: 0.9773

✅ 학습 완료! 소요 시간: 28.53초

📊 PC 모델 (float32) 테스트 정확도: 0.9772 (97.72%)
```

### 2.3 모델 구조 설명

```
입력 (28x28x1)
    │
    ▼
Flatten (28x28 → 784)
    │
    ▼
Dense 128 + ReLU  ←── 은닉층 1: 특징 학습
    │
    ▼
Dense 64 + ReLU   ←── 은닉층 2: 추상화
    │
    ▼
Dense 10 + Softmax ←── 출력: 각 숫자(0~9)의 확률
```

- **파라미터 수**: 109,386개
- **메모리 사용량**: 약 437KB (float32 기준: 109,386 × 4 bytes)

---

## 3. 실습 2: TFLite 변환 및 양자화

### 3.1 TFLite 변환의 이해

| 변환 방식 | 데이터 타입 | 모델 크기 | 정확도 손실 | MCU 실행 가능 |
|-----------|-----------|-----------|------------|--------------|
| Float32 (원본) | float32 | 437KB | 없음 | ❌ (메모리 초과) |
| Float16 양자화 | float16 | ~218KB | 거의 없음 | ❌ |
| **Int8 양자화** | **int8** | **~109KB** | **약간(0~2%)** | **✅ 가능** |

> MCU(ESP32 등)는 일반적으로 **약 320KB SRAM**을 가지므로, Int8 양자화가 필수적입니다.

### 3.2 전체 코드

```python
# mnist_to_tflite.py
# PC 모델 → TFLite 변환 및 양자화

import tensorflow as tf
import numpy as np
import os

# 1. 저장된 PC 모델 로드
print("[1/6] PC 모델 로드 중...")
model = tf.keras.models.load_model('mnist_pc_model.h5')
print(f"  로드 완료: mnist_pc_model.h5")

# 2. MNIST 테스트 데이터 로드 (양자화 Calibration용)
print("\n[2/6] Calibration 데이터 로드 중...")
(_, _), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x_test = x_test.astype(np.float32) / 255.0

# 대표 데이터셋 (100장만 사용)
calibration_data = x_test[:100]
print(f"  Calibration 데이터: {calibration_data.shape}")

# 3. Float32 TFLite 변환 (양자화 없음)
print("\n[3/6] Float32 TFLite 변환 중...")
converter_float = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_float_model = converter_float.convert()

float_path = 'mnist_float32.tflite'
with open(float_path, 'wb') as f:
    f.write(tflite_float_model)
float_size = os.path.getsize(float_path)
print(f"  ✅ Float32 TFLite 저장 완료: {float_path}")
print(f"     크기: {float_size:,} bytes ({float_size/1024:.1f} KB)")

# 4. Int8 양자화 TFLite 변환 (MCU용)
print("\n[4/6] Int8 양자화 TFLite 변환 중...")

def representative_dataset():
    """Calibration용 대표 데이터셋: 100장"""
    for i in range(100):
        # Shape: (1, 28, 28, 1)
        x = calibration_data[i].reshape(1, 28, 28, 1)
        yield [x.astype(np.float32)]

converter_int8 = tf.lite.TFLiteConverter.from_keras_model(model)
converter_int8.optimizations = [tf.lite.Optimize.DEFAULT]
converter_int8.representative_dataset = representative_dataset
# int8 연산으로 강제 지정 (일부 연산이 float32로 남는 것 방지)
converter_int8.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
# 입력/출력 타입을 int8로
converter_int8.inference_input_type = tf.int8
converter_int8.inference_output_type = tf.int8

tflite_int8_model = converter_int8.convert()

int8_path = 'mnist_int8_quantized.tflite'
with open(int8_path, 'wb') as f:
    f.write(tflite_int8_model)
int8_size = os.path.getsize(int8_path)
print(f"  ✅ Int8 양자화 TFLite 저장 완료: {int8_path}")
print(f"     크기: {int8_size:,} bytes ({int8_size/1024:.1f} KB)")

# 5. 크기 비교
print("\n[5/6] 모델 크기 비교")
reduction = (1 - int8_size / float_size) * 100
print(f"  Float32 모델: {float_size:>8,} bytes ({float_size/1024:.1f} KB)")
print(f"  Int8 양자화 모델: {int8_size:>8,} bytes ({int8_size/1024:.1f} KB)")
print(f"  📉 크기 감소율: {reduction:.1f}%")

# 6. 모델 정보 출력
print("\n[6/6] 모델 상세 정보")
# Float32 모델
interpreter_float = tf.lite.Interpreter(model_content=tflite_float_model)
interpreter_float.allocate_tensors()
float_details = interpreter_float.get_input_details()[0]

print(f"\n  [Float32 모델]")
print(f"    입력 shape: {float_details['shape']}")
print(f"    입력 dtype: {float_details['dtype']}")

# Int8 모델
interpreter_int8 = tf.lite.Interpreter(model_content=tflite_int8_model)
interpreter_int8.allocate_tensors()
int8_details = interpreter_int8.get_input_details()[0]

print(f"\n  [Int8 양자화 모델]")
print(f"    입력 shape: {int8_details['shape']}")
print(f"    입력 dtype: {int8_details['dtype']}")
print(f"    입력 scale: {int8_details['quantization_parameters']['scales']}")
print(f"    입력 zero_point: {int8_details['quantization_parameters']['zero_points']}")

print(f"\n{'='*50}")
print(f"✨ Int8 양자화 모델이 MCU(ESP32)에 탑재 가능한 크기로 줄었습니다!")
print(f"{'='*50}")
```

### 3.3 실행 결과 예시

```
[1/6] PC 모델 로드 중...
  로드 완료: mnist_pc_model.h5

[2/6] Calibration 데이터 로드 중...
  Calibration 데이터: (100, 28, 28)

[3/6] Float32 TFLite 변환 중...
  ✅ Float32 TFLite 저장 완료: mnist_float32.tflite
     크기: 437,544 bytes (427.3 KB)

[4/6] Int8 양자화 TFLite 변환 중...
  ✅ Int8 양자화 TFLite 저장 완료: mnist_int8_quantized.tflite
     크기: 109,384 bytes (106.8 KB)

[5/6] 모델 크기 비교
  Float32 모델:  437,544 bytes (427.3 KB)
  Int8 양자화 모델:  109,384 bytes (106.8 KB)
  📉 크기 감소율: 75.0%

[6/6] 모델 상세 정보

  [Float32 모델]
    입력 shape: [  1 28 28  1]
    입력 dtype: <class 'numpy.float32'>

  [Int8 양자화 모델]
    입력 shape: [  1 28 28  1]
    입력 dtype: <class 'numpy.int8'>
    입력 scale: [0.00392156886]
    입력 zero_point: [-128]

==================================================
✨ Int8 양자화 모델이 MCU(ESP32)에 탑재 가능한 크기로 줄었습니다!
==================================================
```

### 3.4 양자화의 원리

```
Float32 (4 bytes)                    Int8 (1 byte)
    0.0 ~ 1.0          ──────►      -128 ~ 127

변환 공식:
    int8_value = (float32_value / scale) + zero_point

  - scale: 양자화 스텝 크기 (0.00392)
  - zero_point: 0에 대응하는 int8 값 (-128)

예:
    float32 = 0.5
    int8 = (0.5 / 0.00392) + (-128) ≈ 0

메모리 1/4로 감소!
추론 속도 2~4배 향상! (정수 연산이 실수보다 빠름)
```

---

## 4. 실습 3: PC에서 TFLite 모델 추론 및 검증

### 4.1 실습 목표

1. 변환된 TFLite 모델(Float32, Int8)로 실제 추론 실행
2. 각 모델의 **정확도** 측정
3. 각 모델의 **추론 시간** 측정

### 4.2 전체 코드

```python
# mnist_tflite_eval.py
# TFLite 모델 (Float32 vs Int8) 추론 및 정확도/속도 비교

import tensorflow as tf
import numpy as np
import time

# 1. MNIST 테스트 데이터 로드
print("[1/7] MNIST 테스트 데이터 로드 중...")
(_, _), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x_test_float = x_test.astype(np.float32) / 255.0  # [0, 1]
print(f"  테스트 데이터: {x_test.shape}")

# 2. TFLite 모델 로드
print("\n[2/7] TFLite 모델 로드 중...")

# Float32 모델
interpreter_float = tf.lite.Interpreter(model_path='mnist_float32.tflite')
interpreter_float.allocate_tensors()
input_float = interpreter_float.get_input_details()[0]
output_float = interpreter_float.get_output_details()[0]
print(f"  Float32 모델 로드 완료")
print(f"    입력: {input_float['shape']}, {input_float['dtype']}")
print(f"    출력: {output_float['shape']}, {output_float['dtype']}")

# Int8 모델
interpreter_int8 = tf.lite.Interpreter(model_path='mnist_int8_quantized.tflite')
interpreter_int8.allocate_tensors()
input_int8 = interpreter_int8.get_input_details()[0]
output_int8 = interpreter_int8.get_output_details()[0]
print(f"  Int8 양자화 모델 로드 완료")
print(f"    입력: {input_int8['shape']}, {input_int8['dtype']}")
print(f"    출력: {output_int8['shape']}, {output_int8['dtype']}")

# 3. Float32 모델 추론
print("\n[3/7] Float32 모델 추론 중...")

correct_float = 0
times_float = []

for i in range(len(x_test)):
    # 입력 전처리
    input_data = x_test_float[i].reshape(1, 28, 28, 1).astype(np.float32)

    # 추론
    start = time.perf_counter()
    interpreter_float.set_tensor(input_float['index'], input_data)
    interpreter_float.invoke()
    output_data = interpreter_float.get_tensor(output_float['index'])
    elapsed = time.perf_counter() - start

    # 예측
    prediction = np.argmax(output_data[0])
    if prediction == y_test[i]:
        correct_float += 1
    times_float.append(elapsed)

    if (i + 1) % 2000 == 0:
        print(f"    Float32: {i + 1}/10000 완료 (현재 정확도: {correct_float / (i + 1):.4f})")

accuracy_float = correct_float / len(x_test)
avg_time_float = np.mean(times_float) * 1000  # ms
print(f"\n  ✅ Float32 TFLite 정확도: {accuracy_float:.4f} ({accuracy_float * 100:.2f}%)")
print(f"     평균 추론 시간: {avg_time_float:.4f} ms")

# 4. Int8 양자화 모델 추론
print("\n[4/7] Int8 양자화 모델 추론 중...")

correct_int8 = 0
times_int8 = []

for i in range(len(x_test)):
    # Int8 입력 변환
    # float32 [0, 1] → int8 [-128, 127]
    input_scale = input_int8['quantization_parameters']['scales'][0]
    input_zero_point = input_int8['quantization_parameters']['zero_points'][0]
    input_data_float = x_test_float[i].reshape(1, 28, 28, 1)
    input_data_int8 = (input_data_float / input_scale + input_zero_point).astype(np.int8)

    # 추론
    start = time.perf_counter()
    interpreter_int8.set_tensor(input_int8['index'], input_data_int8)
    interpreter_int8.invoke()
    output_data = interpreter_int8.get_tensor(output_int8['index'])
    elapsed = time.perf_counter() - start

    # 예측
    prediction = np.argmax(output_data[0])
    if prediction == y_test[i]:
        correct_int8 += 1
    times_int8.append(elapsed)

    if (i + 1) % 2000 == 0:
        print(f"    Int8: {i + 1}/10000 완료 (현재 정확도: {correct_int8 / (i + 1):.4f})")

accuracy_int8 = correct_int8 / len(x_test)
avg_time_int8 = np.mean(times_int8) * 1000  # ms
print(f"\n  ✅ Int8 양자화 TFLite 정확도: {accuracy_int8:.4f} ({accuracy_int8 * 100:.2f}%)")
print(f"     평균 추론 시간: {avg_time_int8:.4f} ms")

# 5. 오분류 사례 분석
print("\n[5/7] 오분류 사례 분석 중...")

misclassified_float = []
misclassified_int8 = []

for i in range(len(x_test)):
    # Float32
    input_data = x_test_float[i].reshape(1, 28, 28, 1).astype(np.float32)
    interpreter_float.set_tensor(input_float['index'], input_data)
    interpreter_float.invoke()
    pred_float = np.argmax(interpreter_float.get_tensor(output_float['index'])[0])

    # Int8
    input_data_int8 = (x_test_float[i].reshape(1, 28, 28, 1) / input_scale + input_zero_point).astype(np.int8)
    interpreter_int8.set_tensor(input_int8['index'], input_data_int8)
    interpreter_int8.invoke()
    pred_int8 = np.argmax(interpreter_int8.get_tensor(output_int8['index'])[0])

    if pred_float != y_test[i]:
        misclassified_float.append((i, y_test[i], pred_float))
    if pred_int8 != y_test[i]:
        misclassified_int8.append((i, y_test[i], pred_int8))

print(f"  Float32 오분류: {len(misclassified_float)}개 / 10000")
print(f"  Int8 오분류: {len(misclassified_int8)}개 / 10000")

# 양자화로 인해 추가로 오분류된 사례 (Int8만 틀린 경우)
only_int8_wrong = [m for m in misclassified_int8 if m not in misclassified_float]
print(f"  양자화로 인한 추가 오분류: {len(only_int8_wrong)}개")

if len(only_int8_wrong) > 0:
    print(f"\n  🔍 양자화로 추가 오분류된 예 (최대 5개):")
    for idx, true_label, pred_label in only_int8_wrong[:5]:
        print(f"    - 테스트 #{idx}: 실제={true_label}, 예측={pred_label}")

# 6. 추론 시간 분포 분석
print(f"\n[6/7] 추론 시간 분포")
print(f"  Float32:")
print(f"    최소: {np.min(times_float) * 1000:.4f} ms")
print(f"    최대: {np.max(times_float) * 1000:.4f} ms")
print(f"    평균: {avg_time_float:.4f} ms")
print(f"    중앙값: {np.median(times_float) * 1000:.4f} ms")
print(f"    표준편차: {np.std(times_float) * 1000:.4f} ms")
print(f"  Int8:")
print(f"    최소: {np.min(times_int8) * 1000:.4f} ms")
print(f"    최대: {np.max(times_int8) * 1000:.4f} ms")
print(f"    평균: {avg_time_int8:.4f} ms")
print(f"    중앙값: {np.median(times_int8) * 1000:.4f} ms")
print(f"    표준편차: {np.std(times_int8) * 1000:.4f} ms")

# 7. 종합 결과 출력
print(f"\n{'='*60}")
print(f"📊 TFLite 모델 종합 평가 결과")
print(f"{'='*60}")
print(f"  {'항목':<25} {'Float32':<20} {'Int8 양자화':<20}")
print(f"  {'-'*25} {'-'*20} {'-'*20}")
print(f"  {'모델 크기':<25} {437544/1024:<10.1f} KB     {109384/1024:<10.1f} KB")
print(f"  {'정확도':<25} {accuracy_float:<10.4f}     {accuracy_int8:<10.4f}")
print(f"  {'평균 추론 시간':<25} {avg_time_float:<10.2f} ms     {avg_time_int8:<10.2f} ms")
print(f"  {'오분류 개수':<25} {len(misclassified_float):<10}     {len(misclassified_int8):<10}")
print(f"{'='*60}")
```

### 4.3 실행 결과 예시

```
[1/7] MNIST 테스트 데이터 로드 중...
  테스트 데이터: (10000, 28, 28)

[2/7] TFLite 모델 로드 중...
  Float32 모델 로드 완료
    입력: [  1 28 28  1], <class 'numpy.float32'>
    출력: [ 1 10], <class 'numpy.float32'>
  Int8 양자화 모델 로드 완료
    입력: [  1 28 28  1], <class 'numpy.int8'>
    출력: [ 1 10], <class 'numpy.int8'>

[3/7] Float32 모델 추론 중...
    Float32: 2000/10000 완료 (현재 정확도: 0.9770)
    Float32: 4000/10000 완료 (현재 정확도: 0.9760)
    ...
  ✅ Float32 TFLite 정확도: 0.9772 (97.72%)
     평균 추론 시간: 0.3215 ms

[4/7] Int8 양자화 모델 추론 중...
    Int8: 2000/10000 완료 (현재 정확도: 0.9755)
    Int8: 4000/10000 완료 (현재 정확도: 0.9745)
    ...
  ✅ Int8 양자화 TFLite 정확도: 0.9748 (97.48%)
     평균 추론 시간: 0.1458 ms

[5/7] 오분류 사례 분석 중...
  Float32 오분류: 228개 / 10000
  Int8 오분류: 252개 / 10000
  양자화로 인한 추가 오분류: 24개

  🔍 양자화로 추가 오분류된 예 (최대 5개):
    - 테스트 #68: 실제=4, 예측=9
    - 테스트 #215: 실제=8, 예측=3
    - 테스트 #433: 실제=7, 예측=2
    - 테스트 #721: 실제=9, 예측=7
    - 테스트 #1054: 실제=3, 예측=5

[6/7] 추론 시간 분포
  Float32:
    최소: 0.2100 ms
    최대: 1.8900 ms
    평균: 0.3215 ms
    중앙값: 0.3100 ms
    표준편차: 0.0512 ms
  Int8:
    최소: 0.0900 ms
    최대: 0.8500 ms
    평균: 0.1458 ms
    중앙값: 0.1400 ms
    표준편차: 0.0231 ms

====================================================================
📊 TFLite 모델 종합 평가 결과
====================================================================
  항목                      Float32              Int8 양자화
  ---------------------------------------------------------
  모델 크기                 427.3 KB             106.8 KB
  정확도                    0.9772               0.9748
  평균 추론 시간            0.32 ms              0.15 ms
  오분류 개수               228                  252
====================================================================
```

### 4.4 추론 결과 시각화 (선택사항)

```python
# visualize_results.py
# 추론 결과 시각화: 원본 vs 예측

import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt

# 모델 로드
interpreter = tf.lite.Interpreter(model_path='mnist_int8_quantized.tflite')
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()[0]
output_details = interpreter.get_output_details()[0]

# 테스트 데이터
(_, _), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x_test_float = x_test.astype(np.float32) / 255.0

# 랜덤 16개 선택
indices = np.random.choice(len(x_test), 16, replace=False)

fig, axes = plt.subplots(4, 4, figsize=(10, 10))
axes = axes.flatten()

for i, idx in enumerate(indices):
    # 추론
    input_scale = input_details['quantization_parameters']['scales'][0]
    input_zero_point = input_details['quantization_parameters']['zero_points'][0]
    input_data = (x_test_float[idx].reshape(1, 28, 28, 1) / input_scale + input_zero_point).astype(np.int8)

    interpreter.set_tensor(input_details['index'], input_data)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details['index'])
    pred = np.argmax(output[0])

    # 시각화
    axes[i].imshow(x_test[idx], cmap='gray')
    color = 'green' if pred == y_test[idx] else 'red'
    axes[i].set_title(f'True: {y_test[idx]}, Pred: {pred}', color=color)
    axes[i].axis('off')

plt.tight_layout()
plt.savefig('mnist_prediction_results.png', dpi=150)
plt.show()
print("✅ 결과 이미지 저장 완료: mnist_prediction_results.png")
```

---

## 5. 실습 5: 모델 크기 / 추론 시간 / 정확도 비교

### 5.1 한 번에 모든 비교 실행

```python
# mnist_full_comparison.py
# 전체 파이프라인: 학습 → 변환 → 평가 → 비교

import tensorflow as tf
from tensorflow import keras
import numpy as np
import time
import os

print("=" * 60)
print("🧪 MNIST 전체 비교 실험")
print("=" * 60)

# ─── 1. 데이터 로드 ─────────────────────────────────
print("\n[1] MNIST 데이터 로드")
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
x_train = x_train.astype(np.float32) / 255.0
x_test_f = x_test.astype(np.float32) / 255.0
print(f"    학습: {x_train.shape}, 테스트: {x_test_f.shape}")

# ─── 2. PC 모델 학습 ────────────────────────────────
print("\n[2] PC 모델 학습 (float32)")
model = keras.Sequential([
    keras.layers.InputLayer(input_shape=(28, 28, 1)),
    keras.layers.Flatten(),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

t0 = time.time()
model.fit(x_train, y_train, batch_size=64, epochs=10, validation_split=0.2, verbose=0)
train_time = time.time() - t0

pc_loss, pc_acc = model.evaluate(x_test_f, y_test, verbose=0)
pc_size = 0
for w in model.get_weights():
    pc_size += w.nbytes
print(f"    학습 시간: {train_time:.1f}초")
print(f"    정확도: {pc_acc:.4f}")
print(f"    파라미터 크기: {pc_size:,} bytes ({pc_size/1024:.1f} KB)")

# ─── 3. TFLite 변환 ─────────────────────────────────
print("\n[3] TFLite 변환")

# Float32
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_float = converter.convert()
float_size = len(tflite_float)
print(f"    Float32 TFLite: {float_size:,} bytes ({float_size/1024:.1f} KB)")

# Int8
def rep_dataset():
    for i in range(100):
        yield [x_test_f[i].reshape(1, 28, 28, 1)]
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = rep_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_int8 = converter.convert()
int8_size = len(tflite_int8)
print(f"    Int8 양자화 TFLite: {int8_size:,} bytes ({int8_size/1024:.1f} KB)")
print(f"    📉 압축률: {(1 - int8_size/float_size)*100:.1f}%")

# ─── 4. TFLite 평가 ─────────────────────────────────
print("\n[4] TFLite 모델 평가")

results = {}
for name, model_bytes, input_type in [
    ("Float32 TFLite", tflite_float, np.float32),
    ("Int8 TFLite", tflite_int8, np.int8)
]:
    interpreter = tf.lite.Interpreter(model_content=model_bytes)
    interpreter.allocate_tensors()
    in_d = interpreter.get_input_details()[0]
    out_d = interpreter.get_output_details()[0]

    correct = 0
    times_list = []
    for i in range(1000):  # 1000장만 측정 (속도)
        if input_type == np.int8:
            scale = in_d['quantization_parameters']['scales'][0]
            zp = in_d['quantization_parameters']['zero_points'][0]
            in_data = (x_test_f[i].reshape(1, 28, 28, 1) / scale + zp).astype(np.int8)
        else:
            in_data = x_test_f[i].reshape(1, 28, 28, 1).astype(np.float32)

        t0 = time.perf_counter()
        interpreter.set_tensor(in_d['index'], in_data)
        interpreter.invoke()
        out = interpreter.get_tensor(out_d['index'])
        elapsed = time.perf_counter() - t0

        if np.argmax(out[0]) == y_test[i]:
            correct += 1
        times_list.append(elapsed)

    # 전체 정확도 (10000장)
    correct_all = 0
    for i in range(10000):
        if input_type == np.int8:
            in_data = (x_test_f[i].reshape(1, 28, 28, 1) / scale + zp).astype(np.int8)
        else:
            in_data = x_test_f[i].reshape(1, 28, 28, 1).astype(np.float32)
        interpreter.set_tensor(in_d['index'], in_data)
        interpreter.invoke()
        if np.argmax(interpreter.get_tensor(out_d['index'])[0]) == y_test[i]:
            correct_all += 1

    results[name] = {
        'accuracy': correct_all / 10000,
        'avg_time_ms': np.mean(times_list) * 1000,
        'size_bytes': len(model_bytes)
    }
    print(f"    {name}: 정확도={results[name]['accuracy']:.4f}, "
          f"추론시간={results[name]['avg_time_ms']:.3f}ms")

# ─── 5. 결과 요약 ──────────────────────────────────
print(f"\n{'='*70}")
print(f"{'📊 최종 비교표':^68}")
print(f"{'='*70}")
print(f"{'모델':<25} {'크기(KB)':<12} {'정확도(%)':<12} {'추론시간(ms)':<15}")
print(f"{'-'*25} {'-'*12} {'-'*12} {'-'*15}")
print(f"{'PC Keras (float32)':<25} {pc_size/1024:<12.1f} {pc_acc*100:<12.2f} {'N/A':<15}")
print(f"{'TFLite Float32':<25} {float_size/1024:<12.1f} "
      f"{results['Float32 TFLite']['accuracy']*100:<12.2f} "
      f"{results['Float32 TFLite']['avg_time_ms']:<12.3f} ms")
print(f"{'TFLite Int8 (MCU용)':<25} {int8_size/1024:<12.1f} "
      f"{results['Int8 TFLite']['accuracy']*100:<12.2f} "
      f"{results['Int8 TFLite']['avg_time_ms']:<12.3f} ms")
print(f"{'='*70}")

# 속도 향상
speedup = results['Float32 TFLite']['avg_time_ms'] / results['Int8 TFLite']['avg_time_ms']
print(f"\n💡 인사이트")
print(f"   • Int8 모델은 Float32 대비 크기 {((1-int8_size/float_size)*100):.0f}% 감소")
print(f"   • 추론 속도 {speedup:.1f}배 향상")
print(f"   • 정확도 손실: {(results['Float32 TFLite']['accuracy'] - results['Int8 TFLite']['accuracy'])*100:.2f}%p")
print(f"   • MCU(ESP32)에 탑재 시 {int8_size/1024:.1f}KB면 충분 (ESP32 SRAM: ~320KB)")
```

### 5.2 실행 결과 예시

```
=====================================================================
🧪 MNIST 전체 비교 실험
=====================================================================

[1] MNIST 데이터 로드
    학습: (60000, 28, 28), 테스트: (10000, 28, 28)

[2] PC 모델 학습 (float32)
    학습 시간: 25.3초
    정확도: 0.9772
    파라미터 크기: 437,544 bytes (427.3 KB)

[3] TFLite 변환
    Float32 TFLite: 437,544 bytes (427.3 KB)
    Int8 양자화 TFLite: 109,384 bytes (106.8 KB)
    📉 압축률: 75.0%

[4] TFLite 모델 평가
    Float32 TFLite: 정확도=0.9772, 추론시간=0.322ms
    Int8 TFLite: 정확도=0.9748, 추론시간=0.146ms

=====================================================================
📊 최종 비교표
=====================================================================
모델                      크기(KB)     정확도(%)    추론시간(ms)
---------------------------------------------------------------
PC Keras (float32)        427.3       97.72       N/A
TFLite Float32            427.3       97.72       0.322 ms
TFLite Int8 (MCU용)       106.8       97.48       0.146 ms
=====================================================================

💡 인사이트
   • Int8 모델은 Float32 대비 크기 75% 감소
   • 추론 속도 2.2배 향상
   • 정확도 손실: 0.24%p (97.72% → 97.48%)
   • MCU(ESP32)에 탑재 시 106.8KB면 충분 (ESP32 SRAM: ~320KB)
```

---

## 6. 종합 비교표

| 비교 항목 | PC Keras (float32) | TFLite Float32 | TFLite Int8 (MCU용) |
|-----------|-------------------|----------------|-------------------|
| **모델 크기** | 437 KB | 427 KB | **107 KB (75%↓)** |
| **파라미터 수** | 109,386 | 109,386 | 109,386 |
| **데이터 타입** | float32 | float32 | **int8** |
| **테스트 정확도** | 97.72% | 97.72% | **97.48% (-0.24%p)** |
| **추론 시간 (PC)** | ~0.5ms (배치) | 0.32ms | **0.15ms (2.2배↑)** |
| **메모리 요구량** | 437KB+ | 427KB+ | **~110KB** |
| **MCU 실행 가능** | ❌ 불가능 | ❌ 불가능 | **✅ 가능** |
| **MCU 추론 시간** | - | - | **~300~500ms 예상** |

### MCU (ESP32)에서의 추가 고려사항

| 항목 | ESP32 (Xtensa LX6) |
|------|-------------------|
| **CPU 클럭** | 240MHz |
| **SRAM** | 320KB (모델 + 입출력 + 스택 공유) |
| **Flash** | 4MB (모델 저장 가능) |
| **추론 시간 예상** | 300~500ms (Int8 TFLite Micro) |
| **전력 소모** | ~80mA (추론 중) |

> ESP32는 PC보다 클럭이 낮고(수 GHz vs 240MHz), 인터프리터 오버헤드가 있어 PC보다 추론이 느립니다. 이것이 바로 **TinyML 최적화**가 필요한 이유입니다.

---

## 7. 결론: TinyML이 필요한 이유

### 7.1 이 실습에서 배운 3가지

```
1. 모델 크기 (Memory)
   PC: 427KB → MCU: 107KB
   양자화만으로 1/4로 줄일 수 있다.

2. 추론 속도 (Latency)
   Float32: 0.32ms → Int8: 0.15ms
   정수 연산이 실수보다 빠르다.

3. 정확도 (Accuracy)
   97.72% → 97.48% (손실 단 0.24%p)
   현저한 성능 저하 없이 경량화가 가능하다.
```

### 7.2 실제 MCU 배포 시 추가 고려사항

| 고려사항 | 설명 |
|---------|------|
| **TFLite Micro** | MCU용 추론 엔진 (표준 TFLite와 다름) |
| **메모리 관리** | 힙/스택 충돌 방지, 정적 할당 권장 |
| **CMSIS-NN** | ARM MCU용 최적화 커널 (Cortex-M 계열) |
| **ESP32-S3 최적화** | ESP-NN 라이브러리로 추론 가속 가능 |
| **모델 선택** | FOMO, MobileNet v1, TinyML 예제 모델 |

### 7.3 다음 단계

이 실습을 마친 후 실제 MCU(ESP32)에 올리려면:

1. TFLite Micro를 ESP32 펌웨어에 포함
2. 카메라/센서 입력을 모델 입력 포맷(int8)으로 변환
3. 시리얼/블루투스/WiFi로 추론 결과 출력
4. Edge Impulse를 사용하면 이 과정을 자동화 가능

---

## 부록: 파일 목록

| 파일 | 설명 |
|------|------|
| `mnist_pc_train.py` | PC 모델 학습 (float32, Keras) |
| `mnist_to_tflite.py` | TFLite 변환 및 양자화 |
| `mnist_tflite_eval.py` | TFLite 모델 정확도/속도 평가 |
| `visualize_results.py` | 추론 결과 시각화 |
| `mnist_full_comparison.py` | 전체 실험 자동화 (학습→변환→평가→비교) |

### 생성되는 파일

| 파일 | 설명 |
|------|------|
| `mnist_pc_model.h5` | PC Keras 모델 (float32) |
| `mnist_float32.tflite` | Float32 TFLite 모델 |
| `mnist_int8_quantized.tflite` | Int8 양자화 TFLite 모델 (**MCU 탑재용**) |
| `mnist_prediction_results.png` | 추론 결과 이미지 |

---

> 이 실습은 **일반 ML과 TinyML의 차이를 직접 경험**하기 위해 설계되었습니다.
> MCU에 모델을 실제로 배포할 때는 **TFLite Micro** 또는 **Edge Impulse**를 활용하세요.
