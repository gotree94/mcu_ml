# TinyML 교육

## 개요

하드웨어(마이크로컨트롤러 보드) 없이도 TinyML의 핵심 개념과 실습을 충분히 수행할 수 있습니다.
PC/노트북 + 웹 브라우저만으로 전체 파이프라인을 학습할 수 있습니다.

---

## 1. Edge Impulse Studio (웹 기반) - 가장 쉬운 접근

**URL**: https://studio.edgeimpulse.com

브라우저에서 데이터 수집 → 학습 → 배포 전체를 수행할 수 있습니다.


### 실습 가능 항목

| 단계 | 내용 | 하드웨어 필요 |
|------|------|:---:|
| 데이터 수집 | 브라우저 마이크/웹캠으로 직접 수집 | X |
| 데이터 전처리 | MFCC, Spectrogram, Image 등 자동 생성 | X |
| 모델 학습 | 클라우드에서 학습 (무료) | X |
| 모델 테스트 | Live Classification으로 결과 확인 | X |
| 모델 프로파일링 | MCU 타겟별 RAM/ROM/지연시간 추정 | X |
| WebAssembly 배포 | 브라우저에서 바로 모델 실행 | X |

### 실습 예제

```
1. 가속도계 기반 동작 인식
   - 브라우저 마이크로 소리 데이터 수집
   - 또는 샘플 데이터셋 업로드
   → 음성 명령 인식 모델 학습

2. 이미지 분류
   - 웹캠으로 이미지 캡처
   - 또는 공개 데이터셋 활용
   → 이미지 분류 모델 학습

3. 이상 감지 (Anomaly Detection)
   - 정상 데이터만 학습
   → 비정상 감지 모델 학습
```

---

## 2. Edge Impulse Python SDK (PC에서 학습 + 배포)

**장점**: Python으로 모델을 학습하고, MCU 타겟용으로 프로파일링/배포까지 가능


```
로컬 (PC)                    원격 (Edge Impulse 클라우드)
─────────────────            ─────────────────────────
① MNIST 학습 (TensorFlow)
② Int8 TFLite 변환
                      ──►   ③ 모델 업로드
                             ④ MCU 시뮬레이션 (RAM/ROM/ms)
                      ◄──   ⑤ 결과 반환 (JSON)
⑥ 결과 출력
```

### 환경 설정

```bash
pip install tensorflow edgeimpulse
```

### API 키 설정

Edge Impulse Python SDK는 프로파일링/배포 시 **클라우드 API 인증**이 필요합니다.

```bash
# 방법 1: 환경변수 설정 (권장)
set EI_API_KEY=ei_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 방법 2: 코드 내 직접 지정
# import edgeimpulse as ei
# ei.API_KEY = "ei_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

API 키 발급: https://studio.edgeimpulse.com/studio/profile

> ⚠ **API 키 권한 주의:**
> `list_profile_devices()`는 모든 키로 가능하지만, **`profile()`과 `deploy()`는 `admin` 권한이 필요**합니다.
> API 키 생성 시 역할(Role)을 **Admin**으로 설정해야 프로파일링/배포까지 사용 가능합니다.
> `ingestion_deployment` 역할 키로는 `Forbidden (403)` 오류가 발생합니다.

### 실습: MNIST 손글씨 분류 → MCU 배포 시뮬레이션

#### Part A: Float32 + Int8 양자화 + 다중 타겟 프로파일링

```python
import tensorflow as tf
from tensorflow import keras
import edgeimpulse as ei
import numpy as np
import os
import json
import io
import re
from contextlib import redirect_stdout

# API 키 설정
ei.API_KEY = "ei_your_admin_api_key_here"

# ─────────────────────────────────────────────
# 1. MNIST 데이터 로드 및 전처리
# ─────────────────────────────────────────────
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
x_train = x_train.reshape(-1, 784).astype('float32') / 255.0
x_test = x_test.reshape(-1, 784).astype('float32') / 255.0

# ─────────────────────────────────────────────
# 2. Keras 모델 학습
# ─────────────────────────────────────────────
model = keras.Sequential([
    keras.layers.Input(shape=(784,)),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
model.fit(x_train, y_train, epochs=5, batch_size=32)

# ─────────────────────────────────────────────
# 3. Int8 양자화 변환 (MCU 탑재용)
# ─────────────────────────────────────────────
def representative_dataset():
    for i in range(100):
        yield [x_train[i].reshape(1, 784).astype('float32')]

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_int8 = converter.convert()

int8_path = 'model_int8.tflite'
with open(int8_path, 'wb') as f:
    f.write(tflite_int8)
print(f"Int8 모델 크기: {len(tflite_int8) / 1024:.1f} KB")

# ─────────────────────────────────────────────
# 4. 프로파일링 (Float32 + Int8 / 다중 타겟)
# ─────────────────────────────────────────────
try:
    devices = ei.model.list_profile_devices()
    print("\n사용 가능한 타겟 수:", len(devices))

    # 프로파일링할 타겟 목록 (ESP32 기본, 나머지는 주석 해제)
    target_list = [
        'espressif-esp32',    # [기본] ESP32 (1일차)
        # 'cortex-m4f-80mhz', # 필요시 주석 해제: STM32F411 (2일차)
        # 'cortex-m7-216mhz', # 필요시 주석 해제: STM32F7/H7 (고성능)
        # 'st-stm32n6',       # 필요시 주석 해제: STM32N6 NPU (3일차)
    ]

    for target in target_list:
        if target not in devices:
            print(f"\n  ⚠ '{target}' 미지원, 건너뜀")
            continue

        print(f"\n{'='*50}")
        print(f"  타겟: {target}")
        print(f"{'='*50}")

        def parse_profile(profile_obj):
            """summary()의 stdout 출력에서 JSON 추출"""
            with io.StringIO() as buf, redirect_stdout(buf):
                profile_obj.summary()
                out = buf.getvalue()
            match = re.search(r'\{.*\}', out, re.DOTALL)
            return json.loads(match.group()) if match else {}

        # Float32 프로파일링
        print(f"  [Float32] 프로파일링 중...")
        p_f32 = ei.model.profile(model=model, device=target)
        j_f32 = parse_profile(p_f32)
        m_f32 = j_f32['memory']['tflite']
        print(f"  Float32 → RAM: {m_f32['ram']/1024:.1f} KB"
              f" | ROM: {m_f32['rom']/1024:.1f} KB"
              f" | 추론: {j_f32['timePerInferenceMs']} ms"
              f" | 지원: {j_f32['isSupportedOnMcu']}")

        # Int8 프로파일링 (양자화된 TFLite 파일로)
        print(f"  [Int8] 프로파일링 중...")
        try:
            p_int8 = ei.model.profile(model=int8_path, device=target)
            j_int8 = parse_profile(p_int8)
            m_int8 = j_int8['memory']['tflite']
            print(f"  Int8    → RAM: {m_int8['ram']/1024:.1f} KB"
                  f" | ROM: {m_int8['rom']/1024:.1f} KB"
                  f" | 추론: {j_int8['timePerInferenceMs']} ms"
                  f" | 지원: {j_int8['isSupportedOnMcu']}")
        except Exception as e:
            print(f"  Int8 프로파일링 실패: {e}")

except ei.exceptions.MissingApiKeyException:
    print("API 키가 설정되지 않았습니다.")
except Exception as e:
    print(f"API 오류: {e}")
```

#### Part B: 결과 해석 예시

```
  ==================================================
  타겟: cortex-m4f-80mhz   ← STM32F411 (Flash 512KB, SRAM 128KB)
  ==================================================
  [Float32] RAM: 8.8 KB | ROM: 462.5 KB | 추론: 5 ms
  [Int8]    RAM: 4.2 KB | ROM: 114.9 KB | 추론: 2 ms   ← ✅ 탑재 가능

  ==================================================
  타겟: espressif-esp32    ← ESP32 (SRAM 320KB, PSRAM 별도)
  ==================================================
  [Float32] RAM: 8.8 KB | ROM: 462.5 KB | 추론: 7 ms   ← ❌ ROM > SRAM
  [Int8]    RAM: 4.2 KB | ROM: 114.9 KB | 추론: 3 ms   ← ✅ 탑재 가능!

  ==================================================
  타겟: st-stm32n6         ← STM32N6 (Neural-ART NPU)
  ==================================================
  [Float32] 지원 안 함 (NPU는 양자화만 가속)
  [Int8]    RAM: 3.1 KB | ROM: 114.9 KB | 추론: 0.3 ms ← 🚀 NPU 가속
```

※ `profile()` 호출은 각각 클라우드 API 요청이므로 실행에 10~30초씩 소요됩니다.

#### Part C: C++ 라이브러리 배포 (선택한 타겟)

```python
# 가장 적합한 타겟 선택 후 배포
labels = [str(i) for i in range(10)]

# Int8 모델 → ESP32용 C++ 라이브러리
deploy_bytes = ei.model.deploy(
    model=int8_path,  # ← 양자화된 TFLite 파일
    model_output_type=ei.model.output_type.Classification(labels=labels),
    model_input_type=ei.model.input_type.OtherInput(),
    deploy_target='espressif-esp32'  # 또는 'zip' (범용)
)

if deploy_bytes:
    with open('esp32_mnist_int8.zip', 'wb') as f:
        f.write(deploy_bytes.getvalue())
    print("ESP32용 C++ 라이브러리 다운로드 완료")
```

> **`deploy_target` 값별 생성 결과:**
>
> | `deploy_target` | 생성 구조 | 사용법 |
> |----------------|-----------|--------|
> | `'zip'` | `tflite-model/` 폴더 (소스 + 헤더) | 직접 MCU 프로젝트에 include, 이식 필요 |
> | `'espressif-esp32'` | ESP32-IDF 프로젝트 (`main/`, `CMakeLists.txt`, `sdkconfig`) | `idf.py build; idf.py flash` |
> | `'arduino-nano-33-ble'` | Arduino 라이브러리 폴더 | Arduino IDE에 include |
> | `'cortex-m4f-80mhz'` | Makefile + CMSIS-RTOS 프로젝트 | STM32CubeIDE에 이식 |
> | `'st-stm32n6'` | ST Edge AI Core 프로젝트 | STM32CubeIDE + Neural-ART 활용 |
>
> 교육에서는 `'zip'`(범용)으로 받아서 Renode 시뮬레이션에 쓰고, 실습 보드에 맞는 타겟으로 다시 받아서 플래시하는 순서로 진행합니다.

#### 실제 `deploy_target='zip'` 압축 해제 구조 (실습 예시)

```
my_model_cpp/                      ← C:\Users\Administrator\my_model_cpp
├── CMakeLists.txt                 (458 bytes)  CMake 빌드 설정
├── README.txt                     (1.2 KB)     프로젝트 개요
│
├── model-parameters/
│   ├── model_metadata.h           (13.3 KB)    모델 메타데이터 (입출력 shape, 라벨 등)
│   └── model_variables.h          (6.9 KB)     DSP → 학습 → 후처리 파이프라인 정의
│
├── tflite-model/
│   ├── tflite-resolver.h          (2.1 KB)     필요 연산자 목록 (FullyConnected, Softmax)
│   ├── tflite_learn_1072795_6.h   (3.2 KB)     .tflite 바이너리 INCBIN 포함, arena 크기
│   ├── tflite_learn_1072795_6.cpp (1.8 KB)     구현체 (empty)
│   ├── tflite_learn_1072795_6.tflite           ← 실제 양자화 모델 파일
│   └── trained_model_ops_define.h (1.9 KB)     연산자 정의
│
└── edge-impulse-sdk/              ← Edge Impulse 추론 SDK (전체 포함)
    ├── classifier/                추론 엔진 (TFLite Micro, EON 등)
    │   └── inferencing_engines/   16개 엔진 지원 (tflite_micro, ethos, akida, tensorrt...)
    ├── CMSIS/                     CMSIS-DSP + CMSIS-NN (ARM 가속 라이브러리)
    ├── dsp/                       DSP 블록 (FFT, MFCC, spectral, image, speechpy...)
    ├── porting/                   20+ 플랫폼 포팅 레이어
    │   ├── espressif/             ESP32용 (ESP-NN + ESP-DSP)
    │   ├── stm32-cubeai/          STM32CubeIDE용
    │   ├── arduino/               Arduino용
    │   ├── zephyr/                Zephyr RTOS용
    │   └── ...                    (himax, silabs, renesas, nordic, ti 등)
    └── tensorflow/lite/micro/     TFLite Micro 런타임 (~80개 op 커널)
```

**핵심 파일 분석:**

| 파일 | 설명 |
|------|------|
| `tflite-resolver.h` | 모델에 필요한 연산자 = **FullyConnected + Softmax** (단 2개!) |
| `tflite_learn_1072795_6.h` | Arena 크기 = **8819 bytes** (약 8.6 KB) |
| `model_metadata.h` | 프로젝트명: esp32_cam, 입력: 784 floats, 출력: 10 classes |
| `model_variables.h` | 파이프라인: raw feature(flatten) → TFLite NN → classification |

> **프로젝트 정보:** Edge Impulse Studio에서 생성된 프로젝트 ID 1072795, MNIST 10-class 숫자 인식 모델입니다.

---

### C++ 라이브러리 사용법 (실제 보드에서 실행)

#### 방법 1: STM32CubeIDE에 수동 이식 (STM32F411, 2일차)

```
1. STM32CubeIDE 실행 → 새 STM32F411RE 프로젝트 생성
2. 탐색기에서 my_model_cpp/ 폴더 통째로 프로젝트 폴더로 복사
3. CubeIDE에서 프로젝트 우클릭 → Properties → C/C++ Build → Settings
4. Include paths에 다음 추가:
     my_model_cpp/
     my_model_cpp/tflite-model/
     my_model_cpp/model-parameters/
     my_model_cpp/edge-impulse-sdk/
     my_model_cpp/edge-impulse-sdk/CMSIS/Core/Include/
     my_model_cpp/edge-impulse-sdk/CMSIS/NN/Include/
     my_model_cpp/edge-impulse-sdk/CMSIS/DSP/Include/
     my_model_cpp/edge-impulse-sdk/porting/stm32-cubeai/
5. Source files에 tflite-model/*.cpp 추가 (디버그 출력용 porting 파일도 추가)
6. 아래 main.c 작성
7. 빌드 → ST-Link로 플래시 → UART(115200 baud)로 결과 확인
```

#### 방법 2: ESP32-IDF (ESP32, 1일차)

```
# 1. 새 ESP32-IDF 프로젝트 생성
idf.py create-project mnist_esp32
cd mnist_esp32

# 2. my_model_cpp/ 통째로 프로젝트 루트에 복사

# 3. CMakeLists.txt 수정 (main/CMakeLists.txt)
#   idf_component_register(SRCS "main.c"
#                          INCLUDE_DIRS
#                            "../my_model_cpp"
#                            "../my_model_cpp/tflite-model"
#                            "../my_model_cpp/model-parameters"
#                            "../my_model_cpp/edge-impulse-sdk"
#                            "../my_model_cpp/edge-impulse-sdk/porting/espressif")

# 4. 아래 main.c 작성
# 5. 빌드 및 플래시
idf.py set-target esp32
idf.py build
idf.py flash monitor
```

#### 공통: main.c 코드

```c
/* main.c — MCU에서 MNIST 추론 실행 */
#include <stdio.h>
#include <stdlib.h>
#include "model-parameters/model_metadata.h"
#include "model-parameters/model_variables.h"
#include "edge-impulse-sdk/classifier/ei_run_classifier.h"
#include "edge-impulse-sdk/dsp/numpy.hpp"

/* PC에서 추출한 MNIST 테스트 이미지 (784 floats, 0~1)
   Colab에서 numpy.save()로 추출한 값을 hex array로 변환하여 포함 */
static const float test_image[784] = {
    /* 여기에 실제 MNIST 테스트 이미지 데이터를 넣음 */
    /* PC에서 아래 Python 코드로 생성: */
    /* np.savetxt('image_hex.txt', x_test[0].flatten(), fmt='%.8f') */
};

/* Edge Impulse porting layer 필수 함수 */
void ei_printf(const char *format, ...) {
    char buf[256];
    va_list args;
    va_start(args, format);
    vsnprintf(buf, sizeof(buf), format, args);
    va_end(args);
    printf("%s", buf);  /* MCU의 printf(UART)로 출력 */
}

int main(void) {
    /* 시스템 초기화 (HAL, SysTick, UART)는 CubeIDE/IDF 자동 생성 코드 사용 */
    printf("\n=== MNIST Edge Impulse Inference ===\n");
    printf("Model: %s\n", EI_CLASSIFIOR_PROJECT_NAME);

    ei_impulse_result_t result = { 0 };
    signal_t signal;
    int16_t buf[EI_CLASSIFIER_RAW_SAMPLE_COUNT] = { 0 };

    /* float → int16 변환 (Edge Impulse EON 런타임 입력 형식) */
    for (size_t i = 0; i < EI_CLASSIFIER_RAW_SAMPLE_COUNT; i++) {
        buf[i] = (int16_t)(test_image[i] * 32767.0f);
    }
    numpy::signal_from_buffer(buf, EI_CLASSIFIER_RAW_SAMPLE_COUNT, &signal);

    /* 추론 실행 */
    printf("Running inference...\n");
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);

    if (err != EI_IMPULSE_OK) {
        printf("ERROR: %d\n", err);
        while (1);
    }

    /* 결과 출력 */
    printf("\n=== Result ===\n");
    printf("Prediction: %s (%.4f)\n",
           ei_classifier_inferencing_categories[result.classification[0].label],
           result.classification[0].value);

    printf("Timing: %lu us\n",
           (unsigned long)result.timing.classification_us);

    while (1);
}
```

#### PC 테스트 데이터를 MCU에 전달하는 방법

```
방법 A: 배열로 하드코딩 (위 main.c 방식)
  Python: np.savetxt('image_hex.txt', x_test[0].flatten(), fmt='%.8f')
  → 생성된 텍스트를 C 배열 리터럴로 변환하여 main.c에 포함

방법 B: UART로 실시간 전송 (실습용)
  PC (Python)                    MCU (STM32/ESP32)
     │                                │
     │  UART: 784 floats (CSV or bin) │
     │───────────────────────────────>│
     │                                │ run_classifier()
     │  UART: result label + prob     │
     │<───────────────────────────────│
     │                                │

방법 C: SD 카드 (실전용)
  MNIST 테스트 데이터를 SD 카드에 .bin 파일로 저장
  MCU가 FATFS로 읽어서 추론 → 결과를 SD 카드에 로그로 저장
```

#### 플랫폼별 UART 전송 코드 (방법 B)

```python
# PC Python: UART로 MNIST 이미지 전송 → 결과 수신
import serial
import struct
import numpy as np
from tensorflow import keras

# MNIST 테스트 데이터 로드
(_, _), (x_test, y_test) = keras.datasets.mnist.load_data()
x_test = x_test.reshape(-1, 784).astype('float32') / 255.0

# UART 연결 (보드별 포트 상이)
ser = serial.Serial('COM3', 115200, timeout=5)  # Windows
# ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=5)  # Linux

for i in range(10):  # 10개 테스트
    # float array → binary 전송
    data = x_test[i].astype('<f4').tobytes()  # little-endian float32
    ser.write(data)

    # 결과 수신
    result = ser.readline().decode().strip()
    print(f"Image {i}: 실제={y_test[i]}, 추론={result}")
```

### 실행 결과

#### list_profile_devices() 성공 (API 키 정상)

```
Epoch 1/5
1875/1875 ━━━━━━━━━━━━━━━━━━━━ 3s 1ms/step - accuracy: 0.8834 - loss: 0.4064
Epoch 2/5
1875/1875 ━━━━━━━━━━━━━━━━━━━━ 2s 1ms/step - accuracy: 0.9675 - loss: 0.1066
Epoch 3/5
1875/1875 ━━━━━━━━━━━━━━━━━━━━ 2s 1ms/step - accuracy: 0.9778 - loss: 0.0686
Epoch 4/5
1875/1875 ━━━━━━━━━━━━━━━━━━━━ 2s 1ms/step - accuracy: 0.9844 - loss: 0.0494
Epoch 5/5
1875/1875 ━━━━━━━━━━━━━━━━━━━━ 2s 1ms/step - accuracy: 0.9884 - loss: 0.0373

사용 가능한 타겟: ['alif-he', 'alif-hp', 'ambiq-apollo4', 'ambiq-apollo5',
  'arduino-nano-33-ble', 'arduino-nicla-vision', 'arduino-nicla-vision-m4',
  'portenta-h7', 'arduino-unoq', 'brainchip-akd1000', 'brickml',
  'cortex-m4f-80mhz', 'cortex-m7-216mhz', 'nxp-imx93-npu', 'nxp-imx93-cpu',
  'espressif-esp32', 'himax-we-i', 'himax-wiseeye2', 'himax-wiseeye2-ethos',
  'imdt-v2h-cpu', 'imdt-v2h', 'infineon-cy8ckit-062s2', ...]

총 70+개 타겟 (2026년 7월 기준)
```

#### profile() 실패 (API 키 권한 부족)

```
edgeimpulse_api.exceptions.ForbiddenException: (403)
Reason: Forbidden
HTTP response body: The API key you provided has insufficient permissions
(valid roles: [admin], current role: ingestion_deployment)
```

> **원인:** API 키 역할이 `ingestion_deployment` → `profile()`은 `admin` 역할 필요
> **해결:** Edge Impulse Studio → Dashboard → API Keys → Create Key → Role=**Admin**

#### profile() 실제 출력 (admin 권한 키, Float32, MNIST 3-layer Dense)

```
Target results for float32:
===========================
{
    "variant": "float32",
    "device": "cortex-m4f-80mhz",
    "tfliteFileSizeBytes": 441364,          # 모델 파일 크기
    "isSupportedOnMcu": true,
    "memory": {
        "tflite": {
            "ram": 8995,                    # 8.8 KB
            "rom": 473592,                  # 462.5 KB
            "arenaSize": 8819
        },
        "eon": {
            "ram": 6272,                    # 6.1 KB
            "rom": 888000,                  # 867.2 KB
            "arenaSize": 4608
        }
    },
    "timePerInferenceMs": 5,                # Cortex-M4F @ 80MHz
    "hasPerformance": true
}

Performance on device types:
----------------------------
| 타겟 | 추론 시간 | RAM | ROM | 비고 |
|------|----------|-----|-----|------|
| Low-end MCU (Cortex-M0+ @ 40MHz) | 167 ms | 8.7 KB | 466.9 KB | TFLite |
| High-end MCU (Cortex-M7 @ 240MHz) | **2 ms** | 9.0 KB | 473.6 KB | TFLite |
| Cortex-M4F @ 80MHz | **5 ms** | 8.8 KB | 462.5 KB | TFLite |
| MPU (Cortex-A72 @ 1.5GHz) | 1 ms | — | 441.4 KB | |
```

> **ESP32 탑재 불가:** Float32 ROM 462.5KB가 ESP32 가용 SRAM(320KB) 초과.
> **STM32F411 탑재:** ROM 462.5KB < Flash 512KB ✅, RAM 8.8KB < SRAM 128KB ✅
> **Int8 양자화 필요:** ESP32 탑재를 위해 Int8 변환 후 프로파일링 재시도 필요

### 학습 포인트
- 동일한 모델이 Cortex-M4(MCU)에서 차지하는 RAM/ROM을 시뮬레이션
- 모델 크기와 정확도의 트레이드오프 실험
- 양자화(Quantization) 전후 비교

---

## 3. Renode (MCU 시뮬레이터) - 가장 현실적인 시뮬레이션

**URL**: https://renode.io | **GitHub**: https://github.com/renode/renode

Renode는 실제 MCU를 에뮬레이션하는 오픈소스 프레임워크로,
Edge Impulse `profile()`의 **추정치**와 달리 **실제 컴파일된 바이너리**를 가상 MCU에서 실행하여 정확한 RAM/ROM/추론 시간을 측정합니다.

```
Edge Impulse profile()  →  추정치 (서버 사이드 시뮬레이션)
                    ↓
Renode + TFLite Micro →  실제 바이너리 실행 (PC에서 MCU 동작 재현)
                    ↓
실제 보드            →  하드웨어 성능 (최종 검증)
```

### 한 줄 요약

> **Edge Impulse** = 예산/타겟 선정용 (30초), **Renode** = 상세 검증용 (5분), **실제 보드** = 최종 확인

### 작동 원리

```
PC Python (Colab)
    │
    ├── Cell 1: Renode + arm-none-eabi-gcc 설치
    ├── Cell 2: Edge Impulse C++ 라이브러리 압축 풀기
    ├── Cell 3: MNIST C 코드 작성 (TFLite Micro API 사용)
    ├── Cell 4: 크로스 컴파일 (arm-none-eabi-gcc → .elf)
    ├── Cell 5: Renode Python API로 STM32F411 시뮬레이션
    └── Cell 6: 결과 출력 (RAM/ROM/추론 시간)
```

### Cell-by-Cell Colab 실행 코드

```python
# ═══════════════════════════════════════════════
# Cell 1: Renode + ARM GCC 설치
# ═══════════════════════════════════════════════
!wget -q https://github.com/renode/renode/releases/download/v1.15.3/renode-1.15.3-linux-portable.tar.gz
!tar -xzf renode-1.15.3-linux-portable.tar.gz
!pip install -q pyrenode3

# ARM 크로스 컴파일러 설치 (Colab 환경)
!apt-get update -qq && apt-get install -y -qq gcc-arm-none-eabi 2>/dev/null | tail -1
!arm-none-eabi-gcc --version | head -1

# ═══════════════════════════════════════════════
# Cell 2: Edge Impulse C++ 라이브러리 준비
# ═══════════════════════════════════════════════
# PC에서 다운로드한 my_model_cpp.zip을 Colab에 업로드
# 또는 wget으로 직접 다운로드 (API 키 필요, 데모용)
!unzip -q my_model_cpp.zip -d edge_impulse_model
!ls -R edge_impulse_model/
# 출력 예:
#   edge_impulse_model/
#   ├── tflite-model/
#   │   ├── model.tflite        # 양자화된 TFLite 모델
#   │   ├── model_metadata.h    # 메타데이터
#   │   ├── model_parameters.h  # 입력/출력 shape
#   │   ├── model.h             # main 헤더
#   │   └── model.cpp           # 구현체
#   └── ...

# ═══════════════════════════════════════════════
# Cell 3: MNIST 테스트 C 코드
# ═══════════════════════════════════════════════
%%writefile mnist_test.c
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "edge_impulse_model/tflite-model/model.h"

// MNIST 28x28 = 784 픽셀, float 0~1
// 여기서는 3번 샘플 (숫자 '3')을 하드코딩
// 실제로는 Colab에서 numpy 테스트 데이터를 추출해서 사용
static const float test_image[784] = {
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0.01176471,0.07058824,0.07058824,0.07058824,0.49411765,0.53333336,0.6862745,0.10196079,0.6509804,1.0,0.96862745,0.49803922,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0.11764706,0.14117648,0.36862746,0.6039216,0.6666667,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.88235295,0.6745098,0.99215686,0.9490196,0.7647059,0.2509804,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0.19215687,0.93333334,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.9843137,0.36470588,0.32156864,0.32156864,0.21960784,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0.07058824,0.85882354,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.6392157,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0.21568628,0.6745098,0.8862745,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.95686275,0.52156866,0.04313726,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.33333334,0.4862745,0.6039216,0.6666667,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.8862745,0.5686275,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.3372549,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.54509807,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11372549,0.93333334,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.95686275,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.9843137,0.8039216,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.27058825,0,0.23921569,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0.23921569,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0.23921569,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0.23921569,0.99215686,0.32156864,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.41568628,0.07450981,0.23921569,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.23921569,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.95686275,0.04313726,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.81960784,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.81960784,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.81960784,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.23921569,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.81960784,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04313726,0.8156863,0.9647059,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.99215686,0.6901961,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.14117648,0.11764706,0.11764706,0.11764706,0.11764706,0.11764706,0.00392157,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
};

int main() {
    printf("\n=== Renode MNIST TFLite Inference Test ===\n\n");
    printf("MCU: STM32F411 (Cortex-M4F @ 100MHz)\n");
    printf("Model: MNIST 3-layer Dense (784→128→64→10)\n\n");

    // 1. TFLite 모델 로드
    // Edge Impulse가 생성한 C++ 라이브러리는 정적 바이너리로 모델 포함
    // TFLite Micro Interpreter 초기화
    printf("[1] Loading TFLite model...\n");

    // Edge Impulse의 ei_classifier_inferencing_api 사용
    ei_impulse_result_t result = {0};
    signal_t signal;
    int16_t buf[784];

    // float → int16 변환 (Edge Impulse EON 런타임은 int16 입력 사용)
    for (int i = 0; i < 784; i++) {
        buf[i] = (int16_t)(test_image[i] * 32767.0f);
    }
    numpy::signal_from_buffer(buf, 784, &signal);

    // 2. 추론 실행
    printf("[2] Running inference...\n");
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
    if (err != EI_IMPULSE_OK) {
        printf("ERROR: run_classifier returned %d\n", err);
        return 1;
    }
    printf("[2] Inference complete.\n\n");

    // 3. 결과 출력
    printf("========== Classification Result ==========\n");
    printf("  Predicted digit: %d\n", result.classification[0].label);
    printf("  Confidence:      %.4f (%.2f%%)\n\n",
           result.classification[0].value,
           result.classification[0].value * 100.0f);

    // 상위 3개 클래스 출력
    printf("Top-3 predictions:\n");
    for (int i = 0; i < 3 && i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        printf("  %d: %.4f (%.2f%%)\n",
               result.classification[i].label,
               result.classification[i].value,
               result.classification[i].value * 100.0f);
    }

    // 4. 타이밍 정보
    printf("\n========== Performance Metrics ==========\n");
    printf("  Classification time: %lu us\n",
           (unsigned long)result.timing.classification_us);
    printf("  Anomaly detection:   %lu us\n",
           (unsigned long)result.timing.anomaly_us);
    printf("  Total inference:     %lu us\n",
           (unsigned long)(result.timing.classification_us + result.timing.anomaly_us));

    // 5. 메모리 정보 (링커 스크립트 변수)
    extern unsigned int _sdata, _edata, _sbss, _ebss;
    extern unsigned int _estack;
    printf("\n============== Memory Usage ==============\n");
    printf("  .data (initialized):  %u bytes\n", &_edata - &_sdata);
    printf("  .bss  (uninitialized): %u bytes\n", &_ebss - &_sbss);
    printf("  Stack pointer:        0x%08X\n", &_estack);

    printf("\n=== Test Complete ===\n");
    return 0;
}

# ═══════════════════════════════════════════════
# Cell 4: 크로스 컴파일 (PC x86 → ARM Cortex-M4F)
# ═══════════════════════════════════════════════
# Edge Impulse 라이브러리 + 우리 코드 + TFLite Micro = 하나의 ELF
!arm-none-eabi-gcc \
    -mcpu=cortex-m4 \
    -mfloat-abi=hard \
    -mfpu=fpv4-sp-d16 \
    -mthumb \
    -O2 \
    -ffunction-sections \
    -fdata-sections \
    -Wl,--gc-sections \
    -Wl,-T,edge_impulse_model/tflite-model/STM32F411RE_FLASH.ld \
    -o mnist_test.elf \
    mnist_test.c \
    edge_impulse_model/tflite-model/*.cpp \
    edge_impulse_model/tflite-model/edge-impulse-sdk/*.cpp \
    -Iedge_impulse_model/tflite-model \
    -Iedge_impulse_model/tflite-model/edge-impulse-sdk \
    -Iedge_impulse_model/tflite-model/model-parameters \
    -D__ARM_FEATURE_DSP=0 \
    -D__ARM_FEATURE_SAT=0 \
    -nostartfiles \
    -lc -lm -lnosys 2>&1

# ELF 파일 정보 확인
!arm-none-eabi-size mnist_test.elf
# 출력 예:
#   text    data     bss     dec     hex filename
#  45200     120    3200   48520    BD88 mnist_test.elf

# 심볼 테이블에서 메모리 사용량 확인
!arm-none-eabi-objdump -t mnist_test.elf | grep -E "(arena|tensor|interpreter|model)" | head -10

# ═══════════════════════════════════════════════
# Cell 5: Renode 시뮬레이션 실행 (Python API)
# ═══════════════════════════════════════════════
from pyrenode3 import emulation
import time

print("Starting Renode STM32F411 simulation...")

# Renode 머신 생성
machine = emulation.Machine("stm32f411")

# STM32F411-Nucleo 보드 설정 로드
# Renode 내장 .repl 파일 경로
repl_path = "renode-1.15.3/platforms/boards/stm32f411-nucleo.repl"
machine.load_platform(repl_path)

# ELF 바이너리 로드
machine.LoadExecutable("mnist_test.elf")

# UART2 시리얼 출력 캡처 (ST-Link Virtual COM Port)
uart = machine.GetPeripheral("usart2")
uart.StartRecording("renode_uart_output.txt")

# Renode Monitor 콘솔 로그
monitor = machine.GetMonitor()

# 시뮬레이션 시작 (10초 타임아웃, 실제 MCU 시간)
print("Running simulation (10ms MCU time)...")
try:
    machine.Start(10)  # 10 milliseconds MCU time
    time.sleep(2)      # 호스트 시간 대기 (에뮬레이션 완료)
    machine.Pause()
except Exception as e:
    print(f"Simulation error: {e}")
    machine.Pause()

# UART 출력 읽기
with open("renode_uart_output.txt") as f:
    output = f.read()

print("\n=== RENODE UART OUTPUT ===")
print(output)
print("=== END OF OUTPUT ===\n")

# Renode Monitor로 메모리 정보 조회
print("=== Renode Monitor: RAM Usage ===")
monitor.Execute("sysbus.ram ReadDoubleWord 0x20000000 64")

# 레지스터 덤프 (Cortex-M4)
print("=== Renode Monitor: CPU State ===")
monitor.Execute("cpu Registers")

machine.Dispose()

# ═══════════════════════════════════════════════
# Cell 6: 결과 비교 (Edge Impulse 추정 vs Renode 실측)
# ═══════════════════════════════════════════════
print("""
+---------------------------+--------------+--------------+
| Metric                   | Edge Impulse | Renode (실측) |
|                          | (추정치)     | (실행 결과)   |
+---------------------------+--------------+--------------+
| RAM (TFLite arena)       | ~8.8 KB      | (UART 출력)   |
| ROM (text + data)        | ~462 KB      | (size 출력)   |
| 추론 시간 (Cortex-M4F)    | 5 ms         | (UART 출력)   |
+---------------------------+--------------+--------------+
""")
print("비교 결과: Edge Impulse 추정치 vs Renode 실제 바이너리 실행 결과")
print("차이가 크다면: 링커 스크립트, 최적화 옵션, TFLite Micro 버전 차이 의심")
```

### 실습 가능 항목 (Colab 호환)

| 실습 | 설명 | 난이도 |
|------|------|--------|
| **MNIST 숫자 인식** | Edge Impulse C++ 라이브러리를 STM32F411 시뮬레이터에서 실행 | 하 |
| **Magic Wand** | Renode 내장 LiteX+VexRiscv 가속도계 제스처 데모 | 중 |
| **Person Detection** | 가상 카메라 입력 → TFLite Micro 사람 감지 | 중 |
| **메모리 분석** | Renode Monitor로 RAM/Flash 사용량 실시간 관찰 | 중 |
| **센서 데이터 주입** | 가상 I2C/GPIO로 MAX30102 PPG 데이터 시뮬레이션 | 상 |

### 유용한 Renode 명령어 (Colab 터미널)

```bash
# CLI로 STM32F411 직접 실행
./renode-1.15.3/renode boards/stm32f411-nucleo.repl -e "sysbus LoadExecutable @mnist_renode_test.elf; start;"
```

### 지원 보드 (Renode 내장)

| 보드 | 아키텍처 | TinyML 용도 |
|------|---------|------------|
| STM32F411-Nucleo | Cortex-M4F | 2일차 교육 보드 |
| STM32F746G-Discovery | Cortex-M7 | 고성능 MCU |
| Arduino Nano 33 BLE | nRF52840 (Cortex-M4F) | Harvard TinyML 코스 |
| LiteX VexRiscv | RISC-V | 오픈소스 CPU |
| SiFive HiFive1 | RISC-V | Freedom E310 |

---

### Renode 고급: 가상 센서 데이터 주입 (MAX30102 PPG 예제)

Renode는 **GPIO, I2C, SPI, UART 등 모든 주변장치를 소프트웨어로 모델링**하므로, 가상 센서를 연결해 실제와 동일한 환경에서 TFLite 모델을 검증할 수 있습니다.

#### 작동 원리

```
Colab Python (pyrenode3)
    │
    ├── Renode 가상 I2C 버스 생성
    ├── MAX30102 가상 센서 주입 (I2C slave, 주소 0x57)
    ├── MCU가 I2C로 PPG 데이터 요청 → 센서가 미리 준비된 데이터 반환
    ├── MCU가 run_classifier() 실행 (심박수/SpO2 추정)
    └── 결과 UART 출력 확인
```

#### Cell 7: 가상 MAX30102 PPG 센서 데이터 생성

```python
# Colab Cell 7: PPG 테스트 데이터 생성 (PC에서 생성, MCU로 전달)
import numpy as np

# 실제 PPG 신호 시뮬레이션 (샘플링 100Hz, 10초 = 1000 samples)
fs = 100       # 100Hz
duration = 10  # 10초
t = np.linspace(0, duration, fs * duration)

# 정상 심박수 72 BPM = 1.2Hz
bpm = 72
heartbeat_freq = bpm / 60

# PPG 신호: DC 성분 + 맥파 (AC 성분)
ppg_signal = 0.5 + 0.3 * np.sin(2 * np.pi * heartbeat_freq * t)
# 노이즈 추가
ppg_signal += np.random.normal(0, 0.02, len(ppg_signal))

# int16 양자화 (Edge Impulse 입력 형식)
ppg_int16 = (ppg_signal * 32767).astype(np.int16)

# Renode용 .bin 저장 (바이너리)
ppg_int16.tofile('ppg_test_data.bin')
print(f"PPG 데이터 생성: {len(ppg_int16)} samples, {len(ppg_int16)*2} bytes")

# 시각화 (선택)
import matplotlib.pyplot as plt
plt.figure(figsize=(12, 3))
plt.plot(t[:200], ppg_signal[:200])
plt.title("Simulated PPG Signal (first 2 seconds)")
plt.xlabel("Time (s)")
plt.ylabel("Normalized Amplitude")
plt.grid(True)
plt.show()
```

#### Cell 8: Renode 가상 센서 + MCU 시뮬레이션

```python
# Colab Cell 8: Renode에서 가상 I2C 센서와 MCU 연동
from pyrenode3 import emulation
import time

machine = emulation.Machine("stm32f411")
machine.load_platform("renode-1.15.3/platforms/boards/stm32f411-nucleo.repl")

# I2C1 버스에 가상 MAX30102 연결 (I2C 주소 0x57)
i2c1 = machine.GetPeripheral("i2c1")
i2c1.CreateSlave(0x57, "max30102_mock")

# PPG 데이터 파일을 Renode 메모리에 로드
machine.LoadDataFile("ppg_test_data.bin", 0x20001000)  # SRAM 영역

# MCU 바이너리 로드 (PPG 데이터를 I2C로 읽어서 추론하는 코드)
machine.LoadExecutable("mnist_test.elf")

# UART 캡처
uart = machine.GetPeripheral("usart2")
uart.StartRecording("renode_sensor_output.txt")

# I2C 트래픽 로깅 (선택)
machine.SetLogLevel(3)  # I2C 통신 로그 출력

# 시뮬레이션 실행
machine.Start(50)  # 50ms MCU 시간
time.sleep(3)
machine.Pause()

# 결과 출력
with open("renode_sensor_output.txt") as f:
    print(f.read())

machine.Dispose()
```

#### Renode Monitor 센서 디버깅 명령어

```bash
# Renode Monitor (Colab 터미널 또는 Python에서 호출)

# I2C 버스 상태 확인
monitor.Execute("i2c1 Status")

# 특정 GPIO 핀 강제 설정 (센서 인터럽트 시뮬레이션)
monitor.Execute("gpioA Pin5 true")    # PA5 = HIGH
monitor.Execute("gpioA Pin5 false")   # PA5 = LOW

# 메모리에 센서 데이터 직접 주입
monitor.Execute("sysbus.ram WriteDoubleWord 0x20001000 0x3F800000")  # float 1.0

# 시뮬레이션 속도 제어
monitor.Execute("emulation SetGlobalQuantum 1000")  # 1000us 단위 실행
```

#### 실습: 센서 데이터 종류별 Renode 시뮬레이션

| 센서 | 인터페이스 | 데이터 형식 | TinyML 활용 |
|------|-----------|------------|------------|
| MAX30102 (PPG) | I2C (0x57) | 32bit int, FIFO | 심박수/SpO2 이상 감지 |
| MPU6050 (IMU) | I2C (0x68) | 3축 accel + 3축 gyro | 제스처 인식 (Magic Wand) |
| HTS221 (온습도) | I2C (0x5F) | 16bit temp + humidity | 이상 탐지 (Threshold) |
| 가상 마이크 | I2S/PDM | 16bit PCM @ 16kHz | 키워드 인식 (Speech) |

> **한계점:** Renode의 센서 모델은 실제 타이밍과 차이가 있을 수 있습니다.
> 최종 검증은 항상 **실제 보드**에서 수행해야 합니다.

---

## 4. Wokwi (브라우저 기반 시뮬레이터)

**URL**: https://wokwi.com

ESP32, Arduino, STM32를 브라우저에서 시뮬레이션합니다.
TFLite Micro도 지원됩니다.

### 실습 예제

```
1. TinyML 코사인 예측기
   - ESP32에서 TFLite 모델 실행
   - 양자화(quantization) 과정 확인
   - 메모리 사용량 관찰

2. 가속도계 기반 동작 인식
   - 가상 MPU6050 센서 연동
   - 제스처 분류 결과 확인

3. 오디오 분류
   - 가상 마이크 입력
   - 키워드 인식 모델 실행
```

### 장점
- 코드를 바로 편집하고 실행
- GPIO, 센서 시뮬레이션
- 회로도 시각화
- 하드웨어 구매 불필요

---

## 5. tinyml-edge-inspector (브라우저 전용)

**GitHub**: https://github.com/Zhaosiqiang/tinyml-edge-inspector

센서 데이터 시뮬레이션 → 이상 감지 → MCU용 C 코드 생성까지 브라우저에서 수행합니다.

### 기능

| 기능 | 설명 |
|------|------|
| 센서 시뮬레이션 | 온도, 전압, ADC 등 가상 센서 데이터 생성 |
| 이상 감지 알고리즘 | EMA, Z-Score, Threshold, Linear Model 4가지 |
| C 코드 생성 | ARM Cortex-M용 자동 코드 생성 |
| 메모리 추정 | RAM/ROM 사용량 계산 |
| 지연시간 추정 | Cortex-M4 @ 48MHz 기준 |

### 실습

```bash
git clone https://github.com/Zhaosiqiang/tinyml-edge-inspector.git
cd tinyml-edge-inspector
npm install
npm run dev
# http://localhost:5173 접속
```

---

## 6. Qualcomm Device Cloud (클라우드 MCU)

**URL**: https://www.qualcomm.com/developer/software/qualcomm-device-cloud

물리적 하드웨어 없이 클라우드의 실제 Qualcomm 보드에서 추론을 실행할 수 있습니다.

- 무료 5,000분 제공
- Edge Impulse CLI 연동
- RB3 Gen 2 보드에서 AI 추론 테스트

---

## 추천 교육 커리큘럼 (하드웨어 없음)

### Part 1: TinyML 기초 (2주)

```
실습 1: Edge Impulse Studio 워크숍
  - https://studio.edgeimpulse.com 에서 계정 생성
  - 가속도계 샘플 프로젝트로 동작 인식
  - WebAssembly로 브라우저에서 추론 실행
  학습: 데이터 수집 → 전처리 → 학습 → 배포 전체 흐름

실습 2: Python SDK로 모델 프로파일링
  - TensorFlow로 간단한 모델 학습
  - ei.model.profile()로 MCU 타겟 분석
  - 양자화 전후 정확도/크기 비교
  학습: MCU 제약 조건 이해
```

### Part 2: 시뮬레이션 실습 (2주)

```
실습 3: Renode에서 TFLite Micro 실행
  - Magic Wand 제스처 인식 데모
  - 가상 가속도계 데이터로 추론 확인
  - UART 출력으로 결과 관찰
  학습: 실제 MCU 바이너리 실행 과정 이해

실습 4: Wokwi에서 ESP32 TinyML
  - TFLite 모델을 ESP32 시뮬레이터에서 실행
  - 양자화된 모델의 int8 연산 확인
  - 메모리 arena 크기 실험
  학습: 메모리 제약에서의 모델 최적화
```

### Part 3: 응용 프로젝트 (2주)

```
실습 5: tinyml-edge-inspector로 이상 감지
  - 센서 데이터 시뮬레이션
  - 4가지 알고리즘 비교
  - C 코드 생성 및 메모리 분석
  학습: 산업용 이상 감지 개념

실습 6: Edge Impulse + Python으로 이미지 분류
  - 공개 데이터셋으로 이미지 분류 모델 학습
  - 모델 크기 vs 정확도 실험
  - C++ 라이브러리 배포
  학습: 임베디드 배포 파이프라인
```

---

## 도구 비교표

| 도구 | 난이도 | 실습 가능 항목 | 브라우저 | 비용 |
|------|:---:|---------------|:---:|:---:|
| Edge Impulse Studio | 하 | 데이터수집, 학습, 배포, 테스트 | O | 무료 |
| Edge Impulse Python SDK | 중 | 학습, 프로파일링, 배포 | X | 무료 |
| Renode | 중상 | 실제 바이너리 실행, 센서 시뮬레이션 | X | 무료 |
| Wokwi | 중 | MCU 시뮬레이션, 회로 설계 | O | 무료 |
| tinyml-edge-inspector | 하 | 센서 시뮬레이션, 이상감지, C코드 생성 | O | 무료 |
| Qualcomm Device Cloud | 중 | 실제 클라우드 하드웨어 추론 | O | 무료 5000분 |

---

# Edge Impulse 지원 타겟 디바이스 분류

> 총 69개 타겟 | 2026년 7월 29일 기준 (`list_profile_devices()` 실제 출력)

---

## STMicroelectronics
| 타겟 | 타입 |
|------|------|
| `st-stm32n6` | MCU + NPU (Neural-ART) |
| `st-stm32n6-cpu` | MCU (CPU only) |
| `st-iot-discovery-kit` | 개발 키트 |

## Raspberry Pi
| 타겟 | 타입 |
|------|------|
| `raspberry-pi-4` | SBC (CPU) |
| `raspberry-pi-5` | SBC (CPU) |
| `raspberry-pi-rp2040` | MCU |
| `raspberry-pi-rp2350` | MCU |

## Arduino
| 타겟 | 타입 |
|------|------|
| `arduino-nano-33-ble` | MCU (nRF52840) |
| `arduino-nicla-vision` | MCU + 카메라 |
| `arduino-nicla-vision-m4` | MCU (M4 코어) |
| `arduino-unoq` | MCU |
| `portenta-h7` | MCU (M7 코어) |

## Nordic Semiconductor
| 타겟 | 타입 |
|------|------|
| `nordic-nrf52840-dk` | MCU |
| `nordic-nrf5340-dk` | MCU |
| `nordic-nrf54l15-dk` | MCU |
| `nordic-nrf9151-dk` | MCU + LTE-M |
| `nordic-nrf9160-dk` | MCU + LTE-M |
| `nordic-nrf9161-dk` | MCU + LTE-M |

## NXP
| 타겟 | 타입 |
|------|------|
| `nxp-imx93-npu` | SoC + NPU |
| `nxp-imx93-cpu` | SoC (CPU only) |

## Renesas
| 타겟 | 타입 |
|------|------|
| `renesas-ck-ra6m5` | MCU (Cortex-M33) |
| `renesas-ek-ra8d1` | MCU (Cortex-M85) |
| `renesas-rzg2l` | MPU |
| `renesas-rzv2h-cpu` | MPU + NPU (DRP) |
| `renesas-rzv2h` | MPU + NPU (DRP) |
| `renesas-rzv2l-cpu` | MPU + NPU (DRP) |
| `renesas-rzv2l` | MPU + NPU (DRP) |

## Espressif
| 타겟 | 타입 |
|------|------|
| `espressif-esp32` | MCU + Wi-Fi |

## Himax
| 타겟 | 타입 |
|------|------|
| `himax-we-i` | MCU + NPU |
| `himax-wiseeye2` | MCU + NPU |
| `himax-wiseeye2-ethos` | MCU + NPU + Ethos-U |

## Alif Semiconductor
| 타겟 | 타입 |
|------|------|
| `alif-he` | MCU + NPU (Ensemble) |
| `alif-hp` | MCU + NPU (Ensemble) |

## Ambiq
| 타겟 | 타입 |
|------|------|
| `ambiq-apollo4` | MCU (Apollo4) |
| `ambiq-apollo5` | MCU + NPU (Apollo5) |

## Infineon
| 타겟 | 타입 |
|------|------|
| `infineon-cy8ckit-062s2` | MCU (PSoC 6) |
| `infineon-cy8ckit-062-ble` | MCU (PSoC 6 + BLE) |

## Qualcomm
| 타겟 | 타입 |
|------|------|
| `qualcomm-iq-8275-evk` | SoC |
| `qualcomm-iq-9075-evk` | SoC |
| `qualcomm-rb3-gen2-dk` | SoC (RB3 Gen2) |
| `qualcomm-sa8255p` | SoC |
| `qualcomm-silex-ep-200q-evk` | SoC |

## NVIDIA (Jetson)
| 타겟 | 타입 |
|------|------|
| `jetson-nano` | GPU (Maxwell) |
| `jetson-orin-nx` | GPU (Ampere) |
| `jetson-orin-nano` | GPU (Ampere) |

## Silicon Labs
| 타겟 | 타입 |
|------|------|
| `silabs-xg24` | MCU (EFR32) |
| `silabs-thunderboard-sense-2` | MCU (EFR32MG24) |

## Texas Instruments
| 타겟 | 타입 |
|------|------|
| `ti-am62a` | SoC + MMA (NPU) |
| `ti-am68a` | SoC + MMA (NPU) |
| `ti-launchxl` | MCU (MSP432) |
| `ti-tda4vm` | SoC + MMA (NPU) |

## Sony
| 타겟 | 타입 |
|------|------|
| `sony-spresense` | MCU (CXD5605) |

## BrainChip
| 타겟 | 타입 |
|------|------|
| `brainchip-akd1000` | NPU (Akida) |

## Seeed Studio
| 타겟 | 타입 |
|------|------|
| `seeed-sense-cap` | MCU |
| `seeed-vision-ai` | MCU + 카메라 |
| `wio-terminal` | MCU (SAMD51) |

## Microchip
| 타겟 | 타입 |
|------|------|
| `microchip-sama7d65` | MPU |
| `microchip-sama7g54` | MPU |

## Particle
| 타겟 | 타입 |
|------|------|
| `particle-boron` | MCU (nRF52840 + LTE) |
| `particle-p2` | MCU (Photon 2) |

## IMDT
| 타겟 | 타입 |
|------|------|
| `imdt-v2h-cpu` | SoC (CPU only) |
| `imdt-v2h` | SoC + NPU |

## ThunderComm
| 타겟 | 타입 |
|------|------|
| `thundercomm-rubik-pi-3` | SBC (QCS6490) |

## Synaptics
| 타겟 | 타입 |
|------|------|
| `synaptics-ka10000` | SoC + NPU |

## Memryx
| 타겟 | 타입 |
|------|------|
| `memryx-mx3` | NPU (MemX) |

## OpenMV
| 타겟 | 타입 |
|------|------|
| `openmv-h7p` | MCU (STM32H7) + 카메라 |

## Generic CPU (프로파일링 전용)
| 타겟 | 타입 |
|------|------|
| `cortex-m4f-80mhz` | CPU (Cortex-M4F @ 80MHz) |
| `cortex-m7-216mhz` | CPU (Cortex-M7 @ 216MHz) |

## PC (개발/프로파일링용)
| 타겟 | 타입 |
|------|------|
| `mbp-16-2020` | MacBook Pro 16" (2020) |
| `mbp-16-2021` | MacBook Pro 16" (2021) |

## 기타
| 타겟 | 타입 |
|------|------|
| `brickml` | 브릭 ML |

---

## 타입별 분류

### MCU (NPU 없음)
`arduino-nano-33-ble`, `arduino-nicla-vision-m4`, `arduino-unoq`, `portenta-h7`, `raspberry-pi-rp2040`, `raspberry-pi-rp2350`, `nordic-nrf52840-dk`, `nordic-nrf5340-dk`, `nordic-nrf54l15-dk`, `nordic-nrf9151-dk`, `nordic-nrf9160-dk`, `nordic-nrf9161-dk`, `renesas-ck-ra6m5`, `renesas-ek-ra8d1`, `espressif-esp32`, `infineon-cy8ckit-062s2`, `infineon-cy8ckit-062-ble`, `silabs-xg24`, `silabs-thunderboard-sense-2`, `sony-spresense`, `wio-terminal`, `particle-boron`, `particle-p2`, `seeed-sense-cap`,
`cortex-m4f-80mhz`, `cortex-m7-216mhz` (프로파일링 전용 가상 타겟)

### MCU + NPU (내장 가속기)
`st-stm32n6`, `st-stm32n6-cpu`, `nxp-imx93-npu`, `renesas-rzv2h-cpu`, `renesas-rzv2h`, `renesas-rzv2l-cpu`, `renesas-rzv2l`, `himax-we-i`, `himax-wiseeye2`, `himax-wiseeye2-ethos`, `alif-he`, `alif-hp`, `ambiq-apollo5`, `brainchip-akd1000`

### SoC + NPU (고성능)
`ti-am62a`, `ti-am68a`, `ti-tda4vm`, `qualcomm-iq-8275-evk`, `qualcomm-iq-9075-evk`, `qualcomm-rb3-gen2-dk`, `qualcomm-sa8255p`, `imdt-v2h`, `synaptics-ka10000`, `memryx-mx3`, `brainchip-akd10000`

### GPU / SBC
`raspberry-pi-4`, `raspberry-pi-5`, `jetson-nano`, `jetson-orin-nx`, `jetson-orin-nano`, `thundercomm-rubik-pi-3`

### 카메라 탑재 모듈
`arduino-nicla-vision`, `seeed-vision-ai`, `openmv-h7p`, `himax-wiseeye2`

### 개발 보드 / 키트
`st-iot-discovery-kit`, `st-stm32n6`, `mbp-16-2020`, `mbp-16-2021`


---

## 참고 자료

- [Edge Impulse 공식 문서](https://docs.edgeimpulse.com)
- [Renode TinyML 교육 사례](https://www.zephyrproject.org/using-renode-for-education-research-and-demonstration/)
- [Harvard edX TinyML 코스 (무료)](https://www.edx.org/course/tiny-machine-learning)
- [TensorFlow Lite Micro + Renode 튜토리얼](https://blog.tensorflow.org/2020/06/running-and-testing-tf-lite-on-microcontrollers.html)
- [Edge Impulse WebAssembly 가이드](https://docs.edgeimpulse.com/hardware/deployments/run-webassembly-browser)
