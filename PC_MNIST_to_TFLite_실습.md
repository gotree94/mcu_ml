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
Epoch 7/20 - 3s - accuracy: 0.9898 - loss: 0.0317 - val_accuracy: 0.9730 - val_loss: 0.0963

✅ 학습 완료! 소요 시간: 20.04초

📊 PC 모델 (float32) 테스트 정확도: 0.9716 (97.16%)
   테스트 손실: 0.0903
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
    Float32: 2000/10000 완료 (현재 정확도: 0.9710)
    Float32: 4000/10000 완료 (현재 정확도: 0.9700)
    ...
  ✅ Float32 TFLite 정확도: 0.9716 (97.16%)
     평균 추론 시간: 0.3215 ms

[4/7] Int8 양자화 모델 추론 중...
    Int8: 2000/10000 완료 (현재 정확도: 0.9695)
    Int8: 4000/10000 완료 (현재 정확도: 0.9685)
    ...
  ✅ Int8 양자화 TFLite 정확도: 0.9692 (96.92%)
     평균 추론 시간: 0.1458 ms

[5/7] 오분류 사례 분석 중...
  Float32 오분류: 284개 / 10000
  Int8 오분류: 308개 / 10000
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
  정확도                    0.9716               0.9692
  평균 추론 시간            0.32 ms              0.15 ms
  오분류 개수               284                  308
====================================================================
```

### 4.4 시각화: PC 모델 vs TFLite 모델 결과 비교

#### 생성되는 이미지

| 파일명 | 내용 |
|--------|------|
| `viz_side_by_side.png` | 3개 모델 예측 결과 **나란히 비교** (초록=정답, 빨강=오답) |
| `viz_confusion_matrix.png` | 3개 모델의 **혼동 행렬** 한눈에 비교 |
| `viz_error_analysis.png` | **오분류 패턴 분석** (실제 숫자 → 잘못 예측한 숫자) |
| `viz_speed_comparison.png` | 모델 크기 / 추론 시간 / 정확도 **막대 그래프** |

```python
# visualize_all_results.py
# PC Keras vs Float32 TFLite vs Int8 TFLite 시각적 비교

import tensorflow as tf
from tensorflow import keras
import numpy as np
import time
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

# ============================================================
# 1. 데이터 및 모델 준비
# ============================================================
print("[1/7] 데이터 및 모델 로드 중...")
(_, _), (x_test, y_test) = keras.datasets.mnist.load_data()
x_test_f = x_test.astype(np.float32) / 255.0

# PC Keras 모델 (재생성)
model = keras.Sequential([
    keras.layers.InputLayer(input_shape=(28, 28, 1)),
    keras.layers.Flatten(),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
(x_train, y_train), _ = keras.datasets.mnist.load_data()
model.fit(x_train.astype(np.float32)/255.0, y_train, batch_size=64, epochs=5, verbose=0)

# TFLite 모델
interp_f32 = tf.lite.Interpreter(model_path='mnist_float32.tflite')
interp_f32.allocate_tensors()
in_f32 = interp_f32.get_input_details()[0]
out_f32 = interp_f32.get_output_details()[0]

interp_i8 = tf.lite.Interpreter(model_path='mnist_int8_quantized.tflite')
interp_i8.allocate_tensors()
in_i8 = interp_i8.get_input_details()[0]
out_i8 = interp_i8.get_output_details()[0]

scale_i8 = in_i8['quantization_parameters']['scales'][0]
zp_i8 = in_i8['quantization_parameters']['zero_points'][0]

# ============================================================
# 2. 10,000장 전체 추론
# ============================================================
print("[2/7] 3개 모델로 10,000장 추론 중...")

pred_pc = []
pred_f32 = []
pred_i8 = []

for i in range(10000):
    # PC Keras
    p = model.predict(x_test_f[i].reshape(1, 28, 28, 1), verbose=0)
    pred_pc.append(np.argmax(p[0]))

    # Float32 TFLite
    interp_f32.set_tensor(in_f32['index'], x_test_f[i].reshape(1, 28, 28, 1).astype(np.float32))
    interp_f32.invoke()
    pred_f32.append(np.argmax(interp_f32.get_tensor(out_f32['index'])[0]))

    # Int8 TFLite
    in_data = (x_test_f[i].reshape(1, 28, 28, 1) / scale_i8 + zp_i8).astype(np.int8)
    interp_i8.set_tensor(in_i8['index'], in_data)
    interp_i8.invoke()
    pred_i8.append(np.argmax(interp_i8.get_tensor(out_i8['index'])[0]))

    if (i + 1) % 2000 == 0:
        print(f"    {i + 1}/10000 완료")

pred_pc = np.array(pred_pc)
pred_f32 = np.array(pred_f32)
pred_i8 = np.array(pred_i8)

# ============================================================
# 3. [시각화 1] Side-by-Side 예측 비교
# ============================================================
print("[3/7] Side-by-side 비교 이미지 생성 중...")

# 오분류 케이스 우선 선정
wrong_i8 = np.where(pred_i8 != y_test)[0]
wrong_pc = np.where(pred_pc != y_test)[0]
wrong_f32 = np.where(pred_f32 != y_test)[0]
# Int8만 틀린 케이스 우선
only_i8_wrong = sorted(set(wrong_i8) - set(wrong_f32))

n_samples = 6  # 6개 케이스 표시
if len(only_i8_wrong) >= n_samples:
    indices = only_i8_wrong[:n_samples]
else:
    indices = wrong_i8[:n_samples]

fig, axes = plt.subplots(n_samples, 4, figsize=(14, 3 * n_samples))
fig.suptitle('PC Keras vs Float32 TFLite vs Int8 TFLite 예측 비교', fontsize=16, y=1.02)

for row, idx in enumerate(indices):
    img = x_test[idx]
    true_label = y_test[idx]

    for col, (name, pred) in enumerate([
        ('PC Keras (float32)', pred_pc[idx]),
        ('TFLite Float32', pred_f32[idx]),
        ('TFLite Int8 (MCU용)', pred_i8[idx])
    ]):
        ax = axes[row, col] if n_samples > 1 else axes[col]
        ax.imshow(img, cmap='gray')
        color = 'green' if pred == true_label else 'red'
        ax.set_title(f'{name}\nTrue: {true_label} / Pred: {pred}', color=color, fontsize=10)
        ax.axis('off')

    # 원본 숫자 크게 표시
    ax = axes[row, 3] if n_samples > 1 else axes[3]
    ax.text(0.5, 0.5, f'{true_label}', fontsize=72, ha='center', va='center')
    ax.set_title('실제 숫자', fontsize=10)
    ax.axis('off')

plt.tight_layout()
plt.savefig('viz_side_by_side.png', dpi=150, bbox_inches='tight')
plt.close()
print("    ✅ viz_side_by_side.png 저장 완료")

# ============================================================
# 4. [시각화 2] 혼동 행렬 (Confusion Matrix)
# ============================================================
print("[4/7] 혼동 행렬 이미지 생성 중...")

fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle('모델별 혼동 행렬 (Confusion Matrix)', fontsize=16)

for ax, (name, preds) in zip(axes, [
    ('PC Keras (float32)', pred_pc),
    ('TFLite Float32', pred_f32),
    ('TFLite Int8 (MCU용)', pred_i8)
]):
    cm = confusion_matrix(y_test, preds, labels=range(10))
    disp = ConfusionMatrixDisplay(cm, display_labels=range(10))
    disp.plot(ax=ax, cmap='Blues', colorbar=False, values_format='d')
    ax.set_title(name, fontsize=12)

plt.tight_layout()
plt.savefig('viz_confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.close()
print("    ✅ viz_confusion_matrix.png 저장 완료")

# ============================================================
# 5. [시각화 3] 오분류 패턴 분석
# ============================================================
print("[5/7] 오분류 패턴 분석 이미지 생성 중...")

fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle('오분류 패턴 분석 (실제 숫자 → 잘못 예측한 숫자 분포)', fontsize=16)

for ax, (name, preds) in zip(axes, [
    ('PC Keras (float32)', pred_pc),
    ('TFLite Float32', pred_f32),
    ('TFLite Int8 (MCU용)', pred_i8)
]):
    # 실제 숫자별 오분류율 계산
    error_rates = []
    for digit in range(10):
        mask = (y_test == digit)
        total = np.sum(mask)
        errors = np.sum(preds[mask] != digit) if total > 0 else 0
        error_rates.append(errors / total * 100)

    bars = ax.bar(range(10), error_rates, color='coral', edgecolor='white')
    # 가장 높은 막대 강조
    max_idx = np.argmax(error_rates)
    bars[max_idx].set_color('red')

    for i, v in enumerate(error_rates):
        ax.text(i, v + 0.3, f'{v:.1f}%', ha='center', fontsize=9)

    ax.set_xlabel('실제 숫자')
    ax.set_ylabel('오분류율 (%)')
    ax.set_title(name)
    ax.set_xticks(range(10))
    ax.set_ylim(0, max(error_rates) + 5)

plt.tight_layout()
plt.savefig('viz_error_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
print("    ✅ viz_error_analysis.png 저장 완료")

# ============================================================
# 6. [시각화 4] 종합 성능 비교 차트
# ============================================================
print("[6/7] 종합 성능 비교 차트 생성 중...")

# 속도 측정 (1000장)
times = {'PC Keras': [], 'TFLite Float32': [], 'TFLite Int8': []}
for i in range(1000):
    t0 = time.perf_counter()
    model.predict(x_test_f[i].reshape(1, 28, 28, 1), verbose=0)
    times['PC Keras'].append(time.perf_counter() - t0)

    t0 = time.perf_counter()
    interp_f32.set_tensor(in_f32['index'], x_test_f[i].reshape(1, 28, 28, 1).astype(np.float32))
    interp_f32.invoke()
    _ = interp_f32.get_tensor(out_f32['index'])
    times['TFLite Float32'].append(time.perf_counter() - t0)

    t0 = time.perf_counter()
    in_data = (x_test_f[i].reshape(1, 28, 28, 1) / scale_i8 + zp_i8).astype(np.int8)
    interp_i8.set_tensor(in_i8['index'], in_data)
    interp_i8.invoke()
    _ = interp_i8.get_tensor(out_i8['index'])
    times['TFLite Int8'].append(time.perf_counter() - t0)

# 모델 크기 계산
pc_size = sum(w.nbytes for w in model.get_weights())
f32_size = len(open('mnist_float32.tflite', 'rb').read())
i8_size = len(open('mnist_int8_quantized.tflite', 'rb').read())

# 정확도
acc_pc = np.mean(pred_pc == y_test) * 100
acc_f32 = np.mean(pred_f32 == y_test) * 100
acc_i8 = np.mean(pred_i8 == y_test) * 100

fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle('3개 모델 종합 성능 비교', fontsize=16)

labels = ['PC Keras\n(float32)', 'TFLite\nFloat32', 'TFLite Int8\n(MCU용)']
colors = ['#4CAF50', '#2196F3', '#FF9800']

# (a) 모델 크기
ax = axes[0]
bars = ax.bar(labels, [pc_size/1024, f32_size/1024, i8_size/1024], color=colors, edgecolor='white')
for bar, val in zip(bars, [pc_size/1024, f32_size/1024, i8_size/1024]):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
            f'{val:.1f} KB', ha='center', fontsize=11, fontweight='bold')
ax.set_ylabel('크기 (KB)')
ax.set_title('모델 크기', fontsize=13)
ax.set_ylim(0, max(pc_size/1024, f32_size/1024, i8_size/1024) * 1.3)

# (b) 정확도
ax = axes[1]
bars = ax.bar(labels, [acc_pc, acc_f32, acc_i8], color=colors, edgecolor='white')
for bar, val in zip(bars, [acc_pc, acc_f32, acc_i8]):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
            f'{val:.2f}%', ha='center', fontsize=11, fontweight='bold')
ax.set_ylabel('정확도 (%)')
ax.set_title('테스트 정확도', fontsize=13)
ax.set_ylim(90, 100)

# (c) 추론 시간
ax = axes[2]
avg_times = [np.mean(times['PC Keras']) * 1000,
             np.mean(times['TFLite Float32']) * 1000,
             np.mean(times['TFLite Int8']) * 1000]
bars = ax.bar(labels, avg_times, color=colors, edgecolor='white')
for bar, val in zip(bars, avg_times):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
            f'{val:.3f} ms', ha='center', fontsize=11, fontweight='bold')
ax.set_ylabel('추론 시간 (ms)')
ax.set_title('평균 추론 시간 (1장당)', fontsize=13)
ax.set_ylim(0, max(avg_times) * 1.3)

plt.tight_layout()
plt.savefig('viz_speed_comparison.png', dpi=150, bbox_inches='tight')
plt.close()
print("    ✅ viz_speed_comparison.png 저장 완료")

# ============================================================
# 7. 결과 요약 출력
# ============================================================
print(f"\n{'='*60}")
print(f"{'📊 시각화 결과 요약':^58}")
print(f"{'='*60}")
print(f"  {'구분':<20} {'PC Keras':<15} {'TFLite F32':<15} {'TFLite Int8':<15}")
print(f"  {'-'*20} {'-'*15} {'-'*15} {'-'*15}")
print(f"  {'모델 크기':<20} {pc_size/1024:<15.1f} {f32_size/1024:<15.1f} {i8_size/1024:<15.1f} KB")
print(f"  {'정확도':<20} {acc_pc:<15.2f} {acc_f32:<15.2f} {acc_i8:<15.2f} %")
print(f"  {'추론 시간':<20} {avg_times[0]:<15.3f} {avg_times[1]:<15.3f} {avg_times[2]:<15.3f} ms")
print(f"{'='*60}")
print(f"\n✅ 저장된 시각화 파일:")
print(f"  1. viz_side_by_side.png     - 예측 결과 나란히 비교")
print(f"  2. viz_confusion_matrix.png - 혼동 행렬 비교")
print(f"  3. viz_error_analysis.png   - 오분류율 분석")
print(f"  4. viz_speed_comparison.png - 크기/정확도/속도 종합 차트")

# 양자화 영향 분석
print(f"\n📌 양자화 영향 분석:")
common_correct = np.sum((pred_f32 == y_test) & (pred_i8 == y_test))
f32_only_correct = np.sum((pred_f32 == y_test) & (pred_i8 != y_test))
i8_only_correct = np.sum((pred_f32 != y_test) & (pred_i8 == y_test))
both_wrong = np.sum((pred_f32 != y_test) & (pred_i8 != y_test))

print(f"  두 모델 모두 정답: {common_correct}장 ({common_correct/100:.1f}%)")
print(f"  Float32만 정답 (양자화 손실): {f32_only_correct}장 ({f32_only_correct/100:.1f}%)")
print(f"  Int8만 정답 (양자화가 더 잘한 경우): {i8_only_correct}장 ({i8_only_correct/100:.1f}%)")
print(f"  두 모델 모두 오답: {both_wrong}장 ({both_wrong/100:.1f}%)")
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
    학습 시간: 20.0초
    정확도: 0.9716
    파라미터 크기: 437,544 bytes (427.3 KB)

[3] TFLite 변환
    Float32 TFLite: 437,544 bytes (427.3 KB)
    Int8 양자화 TFLite: 109,384 bytes (106.8 KB)
    📉 압축률: 75.0%

[4] TFLite 모델 평가
    Float32 TFLite: 정확도=0.9716, 추론시간=0.322ms
    Int8 TFLite: 정확도=0.9692, 추론시간=0.146ms

=====================================================================
📊 최종 비교표
=====================================================================
모델                      크기(KB)     정확도(%)    추론시간(ms)
---------------------------------------------------------------
PC Keras (float32)        427.3       97.16       N/A
TFLite Float32            427.3       97.16       0.322 ms
TFLite Int8 (MCU용)       106.8       96.92       0.146 ms
=====================================================================

💡 인사이트
   • Int8 모델은 Float32 대비 크기 75% 감소
   • 추론 속도 2.2배 향상
   • 정확도 손실: 0.24%p (97.16% → 96.92%)
   • MCU(ESP32)에 탑재 시 106.8KB면 충분 (ESP32 SRAM: ~320KB)
```

---

## 6. 종합 비교표

| 비교 항목 | PC Keras (float32) | TFLite Float32 | TFLite Int8 (MCU용) |
|-----------|-------------------|----------------|-------------------|
| **모델 크기** | 437 KB | 427 KB | **107 KB (75%↓)** |
| **파라미터 수** | 109,386 | 109,386 | 109,386 |
| **데이터 타입** | float32 | float32 | **int8** |
| **테스트 정확도** | 97.16% | 97.16% | **96.92% (-0.24%p)** |
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
   97.16% → 96.92% (손실 단 0.24%p)
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
| `visualize_all_results.py` | **PC vs TFLite 시각적 비교 (4종 이미지 생성)** |
| `mnist_full_comparison.py` | 전체 실험 자동화 (학습→변환→평가→비교) |

### 생성되는 파일

| 파일 | 설명 |
|------|------|
| `mnist_pc_model.h5` | PC Keras 모델 (float32) |
| `mnist_float32.tflite` | Float32 TFLite 모델 |
| `mnist_int8_quantized.tflite` | Int8 양자화 TFLite 모델 (**MCU 탑재용**) |
| `viz_side_by_side.png` | 3개 모델 예측 **나란히 비교** (초록=정답, 빨강=오답) |
| `viz_confusion_matrix.png` | 3개 모델 **혼동 행렬** 비교 |
| `viz_error_analysis.png` | 숫자별 **오분류율** 막대 그래프 |
| `viz_speed_comparison.png` | **크기 / 정확도 / 속도** 종합 차트 |

---

## 부록 B: mnist.npz → MCU 시리얼 전송

### B.1 mnist.npz 구조

Keras 설치 시 포함되는 `mnist.npz` 파일은 numpy 배열을 그대로 저장한 파일입니다.

```
파일: mnist.npz  (위치: ~/.keras/datasets/mnist.npz)
 ├── x_train: (60000, 28, 28)  uint8  → 60,000장 학습 이미지
 ├── y_train: (60000,)          uint8  → 레이블
 ├── x_test:  (10000, 28, 28)  uint8  → 10,000장 테스트 이미지
 └── y_test:  (10000,)          uint8  → 레이블

각 이미지: 28 × 28 = 784바이트 (픽셀 값 0~255)
```

> MNIST 데이터는 `keras.datasets.mnist.load_data()` 호출 시 자동으로 `~/.keras/datasets/mnist.npz`에 캐싱됩니다.
> 이미 존재하면 추가 다운로드 없이 로컬 파일을 그대로 사용합니다.

---

### B.2 numpy 배열 → 이미지 파일 변환

```python
# mnist_npz_to_image.py
# mnist.npz에서 개별 이미지를 추출하여 BMP 파일로 저장

import numpy as np
from PIL import Image
import os

# mnist.npz 파일 직접 로드
npz_path = os.path.expanduser('~/.keras/datasets/mnist.npz')
data = np.load(npz_path)

x_test = data['x_test']  # (10000, 28, 28) uint8
y_test = data['y_test']  # (10000,) uint8

print(f"데이터 shape: {x_test.shape}")
print(f"픽셀 범위: [{x_test.min()}, {x_test.max()}]")
print(f"데이터 타입: {x_test.dtype}")

# 출력 폴더 생성
out_dir = 'mnist_samples'
os.makedirs(out_dir, exist_ok=True)

# 여러 장 추출하여 저장
for idx in [0, 5, 42, 128, 256, 512, 1024, 2048]:
    image = x_test[idx]
    label = int(y_test[idx])
    filename = f'{out_dir}/sample_{idx}_label_{label}.bmp'
    img = Image.fromarray(image, mode='L')  # 'L' = 8-bit grayscale
    img.save(filename)
    print(f"  저장: {filename} (크기: {image.shape}, 값 범위: [{image.min()}, {image.max()}])")

print(f"\n✅ {out_dir} 폴더에 샘플 이미지 저장 완료")
```

---

### B.3 numpy 배열 → raw bytes (MCU 시리얼 전송용)

```python
# mnist_to_serial_format.py
# MCU 시리얼 전송을 위한 다양한 포맷 변환

import numpy as np
import base64
from PIL import Image

# mnist.npz 로드
data = np.load('mnist.npz')  # 또는 ~/.keras/datasets/mnist.npz
x_test = data['x_test']
y_test = data['y_test']

idx = 0
image = x_test[idx]   # (28, 28) uint8
label = int(y_test[idx])

print(f"[샘플 #{idx}] 정답 레이블: {label}")
print(f"  이미지 shape: {image.shape}")
print(f"  픽셀 범위: [{image.min()}, {image.max()}]")
print()

# ─── 방법 1: Raw Binary (784 bytes) ───────────────────────────
# MCU 시리얼 전송에 가장 적합 (크기 최소)
raw_bytes = image.tobytes()
print(f"[방법 1] Raw Binary")
print(f"  크기: {len(raw_bytes)} bytes")
print(f"  처음 20바이트: {list(raw_bytes[:20])}")
print()

# ─── 방법 2: CSV 텍스트 ──────────────────────────────────────
# 사람이 읽기 가능, 디버깅용
csv_line = ','.join(map(str, image.flatten()))
print(f"[방법 2] CSV 텍스트")
print(f"  길이: {len(csv_line)} chars")
print(f"  처음 100자: {csv_line[:100]}...")
print()

# ─── 방법 3: Base64 인코딩 ────────────────────────────────────
# 텍스트 기반 시리얼 프로토콜에 적합
b64 = base64.b64encode(raw_bytes).decode('ascii')
print(f"[방법 3] Base64")
print(f"  길이: {len(b64)} chars ({len(raw_bytes)} bytes → {len(b64)} chars)")
print(f"  앞부분: {b64[:60]}...")
print()

# ─── 방법 4: HEX 문자열 ───────────────────────────────────────
# 디버깅용 (16진수 표시)
hex_str = raw_bytes.hex()
print(f"[방법 4] HEX 문자열")
print(f"  길이: {len(hex_str)} chars")
print(f"  앞부분: {hex_str[:60]}...")
print()

# ─── 방법 5: BMP 파일 저장 (시각 확인) ──────────────────────
img = Image.fromarray(image, mode='L')
img.save(f'sample_{idx}_label_{label}.bmp')
print(f"[방법 5] BMP 이미지 저장: sample_{idx}_label_{label}.bmp")
```

---

### B.4 MCU로 시리얼 전송 (PC → ESP32 → 추론 → 결과 수신)

#### 시리얼 프로토콜 설계

```
PC → MCU: [0xAA (HEADER)] [LABEL: 1byte] [DATA: 784bytes] [0xBB (FOOTER)] [CHECKSUM: 1byte]
MCU → PC: [0xCC (RESPONSE)] [PREDICTION: 1byte]
```

| 필드 | 크기 | 설명 |
|------|------|------|
| `0xAA` | 1 byte | 패킷 시작 (Header) |
| LABEL | 1 byte | 실제 정답 숫자 (확인용) |
| DATA | 784 bytes | 28×28 픽셀, 각 1 byte (0~255) |
| `0xBB` | 1 byte | 패킷 끝 (Footer) |
| CHECKSUM | 1 byte | 간단한 XOR 체크섬 |
| `0xCC` | 1 byte | 응답 헤더 |
| PREDICTION | 1 byte | MCU가 추론한 결과 |

#### PC 측 전송 코드 (Python)

```python
# serial_send_mnist.py
# mnist.npz → 시리얼 → MCU 전송 및 결과 수신

import serial
import numpy as np
import time

# 설정
PORT = 'COM3'       # 실제 포트로 변경
BAUD = 115200
NUM_SAMPLES = 50    # 전송할 이미지 수

# mnist.npz 로드
data = np.load('mnist.npz')
x_test = data['x_test']
y_test = data['y_test']

# 시리얼 연결
ser = serial.Serial(PORT, BAUD, timeout=5)
time.sleep(2)  # MCU 리셋 대기
print(f"✅ 시리얼 연결: {PORT} @ {BAUD}")

correct = 0
total = NUM_SAMPLES

for i in range(total):
    image = x_test[i]
    label = int(y_test[i])
    raw = image.tobytes()  # 784 bytes

    # 체크섬 계산 (XOR)
    checksum = 0
    for b in raw:
        checksum ^= b

    # 패킷 전송
    packet = b'\xAA' + bytes([label]) + raw + b'\xBB' + bytes([checksum])
    ser.write(packet)

    # 응답 수신
    resp = ser.read(2)  # 0xCC + prediction

    if len(resp) == 2 and resp[0] == 0xCC:
        prediction = resp[1]
        if prediction == label:
            correct += 1
            status = '✅'
        else:
            status = '❌'
        print(f"  [{i+1}/{total}] 실제={label}, 예측={prediction}  {status}")
    else:
        print(f"  [{i+1}/{total}] 응답 오류: {resp.hex() if resp else 'TIMEOUT'}")

    time.sleep(0.05)  # MCU 처리 시간

# 결과 요약
print(f"\n{'='*40}")
print(f"📊 전송 완료: {total}장")
print(f"   정확도: {correct}/{total} = {correct/total*100:.1f}%")
print(f"   (참고: PC TFLite Int8 정확도: ~97.5%)")

ser.close()
```

---

#### MCU 측 수신 코드 (ESP32, Arduino)

```cpp
// mnis_serial_receiver.ino
// PC로부터 시리얼로 MNIST 이미지를 받아 TFLite Micro 추론 후 결과 반환

#include <TensorFlowLite_ESP32.h>
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/all_ops_resolver.h"

// TFLite 모델 (mnist_int8_quantized.tflite 배열)
extern const unsigned char mnist_model[];
extern const int mnist_model_len;

// TFLite 설정
constexpr int kTensorArenaSize = 100 * 1024;  // 100KB
uint8_t tensor_arena[kTensorArenaSize];

tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* input = nullptr;
TfLiteTensor* output = nullptr;

// 버퍼
#define IMG_SIZE 784
uint8_t img_buffer[IMG_SIZE];

void setup() {
    Serial.begin(115200);
    Serial.println("MNIST Serial Receiver Ready");

    // TFLite Micro 초기화
    static tflite::AllOpsResolver resolver;
    static tflite::MicroInterpreter static_interpreter(
        mnist_model, resolver, tensor_arena, kTensorArenaSize);
    interpreter = &static_interpreter;

    input = interpreter->input(0);
    output = interpreter->output(0);

    if (interpreter->AllocateTensors() != kTfLiteOk) {
        Serial.println("TENSOR ALLOCATION FAILED");
        while (1);
    }
    Serial.println("TFLite Micro Ready");
}

void loop() {
    // 헤더 대기 (0xAA)
    while (Serial.available() && Serial.read() != 0xAA);

    if (!Serial.available()) return;

    // 레이블 읽기 (선택)
    uint8_t label = Serial.read();

    // 이미지 데이터 읽기 (784 bytes)
    int received = 0;
    unsigned long timeout = millis() + 2000;  // 2초 타임아웃

    while (received < IMG_SIZE) {
        if (Serial.available()) {
            img_buffer[received++] = Serial.read();
        }
        if (millis() > timeout) {
            Serial.println("TIMEOUT");
            return;
        }
    }

    // 푸터 + 체크섬 읽기
    uint8_t footer = Serial.read();
    uint8_t checksum = Serial.read();

    // 체크섬 검증
    uint8_t calc = 0;
    for (int i = 0; i < IMG_SIZE; i++) calc ^= img_buffer[i];

    if (calc != checksum) {
        Serial.write(0xCC);  // 응답 헤더
        Serial.write(0xFF);  // 체크섬 오류
        return;
    }

    // 입력 텐서에 이미지 복사
    // TFLite Int8 모델 입력: [-128, 127] 스케일
    int8_t* in_data = interpreter->input(0)->data.int8;
    for (int i = 0; i < IMG_SIZE; i++) {
        // uint8 [0,255] → int8 [-128,127]
        in_data[i] = (int8_t)((int)img_buffer[i] - 128);
    }

    // 추론
    if (interpreter->Invoke() != kTfLiteOk) {
        Serial.write(0xCC);
        Serial.write(0xFE);  // 추론 오류
        return;
    }

    // 결과 추출
    int8_t* out_data = interpreter->output(0)->data.int8;
    int prediction = 0;
    int8_t max_val = out_data[0];
    for (int i = 1; i < 10; i++) {
        if (out_data[i] > max_val) {
            max_val = out_data[i];
            prediction = i;
        }
    }

    // 결과 전송
    Serial.write(0xCC);        // 응답 헤더
    Serial.write(prediction);  // 예측 숫자 (0~9)
}
```

---

### B.5 전송 테스트 및 확인

#### 실행 순서

```bash
# 1. mnist.npz → 이미지 파일 추출 (시각 확인)
python mnist_npz_to_image.py

# 2. MCU 펌웨어 업로드 (Arduino IDE)
#    mnis_serial_receiver.ino → ESP32 업로드

# 3. PC → MCU 시리얼 전송
python serial_send_mnist.py

# 예상 출력:
#   [1/50] 실제=7, 예측=7  ✅
#   [2/50] 실제=2, 예측=2  ✅
#   [3/50] 실제=1, 예측=1  ✅
#   [4/50] 실제=0, 예측=0  ✅
#   [5/50] 실제=4, 예측=9  ❌  ← TFLite 양자화 손실
#   ...
#   ========================================
#   📊 전송 완료: 50장
#      정확도: 48/50 = 96.0%
```

#### 포트 확인 방법

```bash
# Windows
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
# → ['COM1', 'COM3', ...]
```

#### 주의사항

| 문제 | 원인 | 해결 |
|------|------|------|
| 타임아웃 | 포트/보레이트 불일치 | `PORT`, `BAUD` 값 확인 |
| 체크섬 오류 | 데이터 손상 | 시리얼 케이블 품질 확인, 낮은 보레이트 시도 |
| 모두 오답 | 모델 바이너리 누락 | TFLite 모델을 ESP32 Flash에 포함했는지 확인 |
| 응답 없음 | MCU 리셋 필요 | `time.sleep(2)` 후 전송 시작 |

---

### B.6 파일 목록

| 파일 | 설명 |
|------|------|
| `mnist_npz_to_image.py` | mnist.npz → BMP 이미지 파일 변환 |
| `mnist_to_serial_format.py` | mnist.npz → raw/CSV/Base64/HEX 변환 |
| `serial_send_mnist.py` | PC → MCU 시리얼 전송 및 결과 수신 |
| `mnis_serial_receiver.ino` | ESP32 수신 및 TFLite Micro 추론 |
