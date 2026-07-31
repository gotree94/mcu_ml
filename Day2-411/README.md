# 2일차: STM32F411 + X-Cube-AI 실습 (7시간)

**목표**: Cortex-M4 기반 STM32F411에서 X-Cube-AI로 모델 변환 및 배포, RTOS 연동

| 시간 | 주제 | 내용 |
|------|------|------|
| 09:00-09:30 | **STM32F411 개요** | Cortex-M4 FPU (84MHz), SRAM 128KB, <br> Flash 512KB, NUCLEO-F411RE 보드, STM32CubeIDE 환경 |
| 09:30-10:30 | **STM32CubeMX + HAL 기초** | GPIO/UART/TIM 설정, 프로젝트 생성, <br> printf 리디렉션, LED Blink |
| 10:30-11:30 | **X-Cube-AI 이해** | X-Cube-AI 워크플로우: PC 모델 → .tflite → C 코드 변환, <br> RAM/ROM 최적화, 벤치마킹 |
| 11:30-12:30 | **실습: 심박 데이터 분류 모델** | Python PPG 데이터 생성 → Keras DNN 학습 <br> → X-Cube-AI 변환 → STM32F411 포팅 |
| 12:30-13:30 | 점심 | |
| 13:30-15:00 | **CMSIS-NN 최적화** | Cortex-M4용 DSP 명령어(SIMD), CMSIS-NN 커널(s8/s16), <br> 가중치/활성화 8비트 양자화 |
| 15:00-16:30 | **FreeRTOS + AI 태스크 통합** | 센서 수집 Task → Queue 전달 → AI 추론 Task <br> → 결과 출력 Task, Stack 크기 설계 |
| 16:30-17:00 | **프로젝트 코드 리뷰 + 최적화 팁** | Flash/RAM 사용량 분석,  <br> CubeIDE 프로파일러로 추론 시간 측정, 추가 최적화 방안 |

**2일차 핵심 포인트**:
- Cortex-M4 FPU는 float32 연산 가능하지만 SRAM 128KB가 한계
- X-Cube-AI는 Keras/TFLite/ONNX 모델을 STM32용 C 코드로 자동 변환
- CMSIS-NN은 ARM SIMD 명령어로 int8 추론 4~5배 가속
- FreeRTOS Task로 AI 파이프라인 분리 설계

---

## 사전 준비

### 준비물

- [ ] NUCLEO-F411RE 보드
- [ ] USB Mini-B 케이블 (데이터 전송 지원)
- [ ] STM32CubeIDE 2.2.0+ (2026-06 출시, Eclipse 2025-12 기반, GCC 14) - https://www.st.com/en/development-tools/stm32cubeide.html
- [ ] STM32CubeMX 6.18.0+ - https://www.st.com/en/development-tools/stm32cubemx.html
- [ ] Python 3.8+ (TensorFlow 2.x)
- [ ] PC (Windows/Linux/macOS)
- [ ] Git Example : https://github.com/STMicroelectronics/STM32CubeN6/tree/main

> **참고**: STM32CubeIDE v2.0.0부터 CubeMX가 분리되었습니다. 두 툴을 각각 설치해야 합니다.

### Python 패키지 설치

```bash
pip install tensorflow scikit-learn numpy matplotlib
```

### X-Cube-AI 설치 (CubeMX 내 Software Packs)

1. STM32CubeMX 실행
2. 메뉴: **Help → Manage embedded software packs**
3. 탭: **STMicroelectronics** 선택
4. 목록에서 **X-CUBE-AI** 찾기
5. 최신 버전 선택 후 **Install** 클릭

> **대안**: STM32Cube AI Studio (신규 standalone GUI) 또는 **ST Edge AI Core 4.0.0**(CLI) 설치 가능

---

## 1. STM32F411 개요 (09:00-09:30)

### 1.1 STM32F411 아키텍처

| 항목 | 사양 |
|------|------|
| **코어** | ARM Cortex-M4 FPU (단정밀도 부동소수점) |
| **최대 클럭** | 84MHz (일부 모델 100MHz) |
| **SRAM** | 128KB |
| **Flash** | 512KB |
| **전압** | 1.7V ~ 3.6V |
| **AI 연산** | FPU + DSP 명령어 + CMSIS-NN |
| **디버그** | SWD (Serial Wire Debug) |

### 1.2 NUCLEO-F411RE 보드

NUCLEO-F411RE는 STM32의 엔트리급 평가 보드로, Arduino UNO V3 호환 커넥터와 ST-Morpho 확장 커넥터를 제공합니다.

| 구성 | 설명 |
|------|------|
| **MCU** | STM32F411RET6 (Cortex-M4F @ 84MHz) |
| **Flash** | 512KB |
| **SRAM** | 128KB |
| **LED** | LD2 (PA5, 사용자 LED), LD1 (전원), LD3 (통신) |
| **버튼** | B1 (PA0, 사용자 버튼) |
| **디버거** | ST-LINK/V2-1 내장 (USB Mini-B) |
| **UART** | ST-LINK 가상 COM 포트 (PA2=TX, PA3=RX) |
| **Arduino** | Uno V3 호환 커넥터 |
| **가격** | 약 $14 (STM32 중 최저가 AI 학습 보드) |

> NUCLEO-F411RE는 STM32 AI 학습에 가장 저렴한 진입 장벽을 제공합니다. X-Cube-AI를 이용한 CPU 기반 추론에 최적화되어 있습니다.

### 1.3 보드 연결 확인

1. USB Mini-B 케이블로 NUCLEO-F411RE를 PC에 연결
2. 장치 관리자에서 포트 확인:
   - `ST-LINK Virtual COM Port` (예: COM3)
   - `STM32 STLink` 디버그 포트
3. 녹색 전원 LED(LD1) 점등 확인
4. STM32CubeIDE 실행 → **Help → Check for Updates** 실행

---

## 2. STM32CubeMX + HAL 기초 (09:30-10:30)

### 2.1 STM32CubeMX로 신규 프로젝트 생성

1. **STM32CubeMX 실행**
2. **File → New Project**
3. **Board Selector** 탭 선택
4. 검색창: `NUCLEO-F411RE` 입력
5. 목록에서 **NUCLEO-F411RE** 선택 → **Start Project**
   - 보드 설정 자동 로드:
     - HSE: 8MHz (ST-LINK에서 제공)
     - HCLK: 84MHz
     - SysTick: 1ms 인터럽트
6. **Yes** → 초기화

### 2.2 핀 설정 확인 및 UART 설정

**기본 핀 설정** (보드 자동 설정)

| 핀 | 기능 | 설명 |
|------|------|------|
| PA5 | GPIO_Output | 사용자 LED (LD2) |
| PA0 | GPIO_Input | 사용자 버튼 (B1) |
| PA2 | USART2_TX | ST-LINK 가상 COM 포트 |
| PA3 | USART2_RX | ST-LINK 가상 COM 포트 |

**UART 설정** (printf 출력용):

1. **Pinout & Configuration** 탭
2. 왼쪽 **Connectivity → USART2** 선택
3. **Mode**: `Asynchronous` 확인
4. **Configuration → Parameter Settings**:
   - Baud Rate: `115200` (기본 9600 → 115200 권장)
   - Word Length: `8 Bits`
   - Parity: `None`
   - Stop Bits: `1`
5. **NVIC Settings** 탭:
   - `USART2 global interrupt` **Enabled** (선택)

### 2.3 프로젝트 생성

1. 툴체인: **STM32CubeIDE** 선택
2. **Project Name**: `STM32F411_LED_Blink`
3. **Generate Code** 클릭
4. **Open Project** → 자동으로 STM32CubeIDE 실행

### 2.4 printf 리디렉션 (UART 출력)

`Core/Src/main.c` 파일을 열고 USER CODE 영역에 추가:

```c
/* USER CODE BEGIN Includes */
#include <stdio.h>
/* USER CODE END Includes */
```

```c
/* USER CODE BEGIN PFP */
#ifdef __GNUC__
int __io_putchar(int ch)
{
    HAL_UART_Transmit(&huart2, (uint8_t *)&ch, 1, HAL_MAX_DELAY);
    return ch;
}
#endif
/* USER CODE END PFP */
```

> `__io_putchar`는 GCC의 `printf`가 내부적으로 호출하는 저수준 출력 함수입니다. 이를 UART 전송으로 리디렉션하면 `printf("Hello")` 호출만으로 시리얼 모니터에 출력됩니다.

### 2.5 LED Blink 코드 작성

`main()` 함수의 `while (1)` 루프에 작성:

```c
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
    printf("LED Toggled! Count: %lu\r\n", HAL_GetTick() / 500);
    HAL_Delay(500);
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
```

### 2.6 빌드 및 플래싱

1. **Project → Build All** (또는 Ctrl+B)
2. 타겟 선택: **STM32F411_LED_Blink**
3. **Run → Run** (또는 F11)
4. ST-LINK가 자동으로 인식 → 바이너리 플래시
5. **시리얼 모니터** (터미널 프로그램: Tera Term, PuTTY 등):
   - Port: ST-LINK Virtual COM Port
   - Baud: 115200
   - LED가 0.5초 간격으로 토글되면서 시리얼로 메시지 출력 확인

### 2.7 외부 인터럽트: 스위치 입력 → 시리얼 출력

버튼(B1, PA0)을 눌렀을 때 인터럽트로 감지하여 시리얼(UART)로 메시지를 전송:

```c
/* USER CODE BEGIN 0 */
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
    /* PA0(B1) falling edge 감지 → 시리얼로 전송 */
    printf("Button pressed!\r\n");
}
/* USER CODE END 0 */
```

> **참고:** `HAL_GPIO_EXTI_Callback`은 EXTI 라인 번호만 전달하므로 `GPIO_Pin == GPIO_PIN_0`은 PA0/PB0/PC0 등 **포트까지 구분하지 못합니다**. NUCLEO-F411RE는 PA0만 EXTI0에 할당되어 있어 조건문 없이 사용해도 됩니다. 여러 핀이 같은 EXTI 라인을 공유한다면 포트 레지스터(`GPIOA->IDR`)를 직접 읽어야 합니다.

CubeMX에서 PA0을 `GPIO_EXTI0` (falling edge trigger)으로 설정하고 **NVIC → EXTI0 global interrupt**를 Enable해야 합니다.

### 2.8 TIM (타이머) 설정

CubeMX에서 TIM3 설정:
1. **Timers → TIM3**
2. **Clock Source**: `Internal Clock`
3. **Prescaler**: `8399` (84MHz / 8400 = 10kHz)
4. **Counter Period**: `9999` (10kHz / 10000 = 1Hz)
5. **NVIC Settings**: `TIM3 global interrupt` **Enabled**

코드:

```c
/* USER CODE BEGIN 0 */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM3)
    {
        HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
    }
}
/* USER CODE END 0 */
```

```c
  /* USER CODE BEGIN 2 */
  HAL_TIM_Base_Start_IT(&htim3);
  /* USER CODE END 2 */
```

> 타이머 인터럽트는 HAL_Delay()와 달리 CPU를 블로킹하지 않습니다. FreeRTOS와 함께 사용하기에 적합한 방식입니다.

---

## 3. X-Cube-AI 이해 (10:30-11:30)

### 3.1 X-Cube-AI란?

X-Cube-AI은 STM32 전용 AI 모델 변환 및 최적화 도구입니다.

| 기능 | 설명 |
|------|------|
| **입력 형식** | Keras (.h5), TFLite (.tflite), ONNX (.onnx) |
| **출력** | STM32 최적화 C 코드 (CMSIS-NN, CMSIS-DSP 활용) |
| **최적화** | RAM/ROM 최적화, int8/int16 양자화, 메모리 풀 재사용 |
| **벤치마킹** | 대상 MCU별 Flash/RAM 사용량, 추론 시간 예측 |
| **정확도 검증** | PC 시뮬레이션으로 출력 일치 확인 |
| **라이선스** | STM32 MCU에 대해 무료 |

### 3.2 워크플로우

```
PC Model (Keras/TFLite/ONNX)
    │
    ▼
X-Cube-AI 분석 (Profile)
    │  - STM32 타겟별 Flash/RAM 예측
    │  - 양자화 필요 여부 판단
    ▼
X-Cube-AI 변환 (Generate)
    │  - C 코드 (weights + activation buffers)
    │  - CMSIS-NN / fallback kernels
    ▼
STM32CubeIDE 프로젝트 통합
    │  - 변환된 C 코드 추가
    │  - API 호출 (ai_model_run)
    ▼
STM32F411에서 추론 실행
```

### 3.3 X-Cube-AI vs TFLite Micro vs Edge Impulse

| 항목 | X-Cube-AI | TFLite Micro | Edge Impulse |
|------|-----------|-------------|-------------|
| **벤더** | ST 전용 | Google (오픈소스) | Edge Impulse (SaaS) |
| **지원 MCU** | STM32 전 제품군 | 모든 MCU (ARM, RISC-V, Xtensa) | 30+ MCU + Linux |
| **코드 효율** | STM32 특화 최적화 (매우 높음) | 범용 (상대적 큼) | EON Compiler 최적화 |
| **라이선스** | STM32에서 무료 | Apache 2.0 | Enterprise (일부 유료) |
| **자동 양자화** | 포함 | 별도 변환 필요 | 포함 |
| **양자화 데이터** | int8, int16, float32 | int8, float32 | int8, float16 |

> **핵심 차이**: X-Cube-AI는 STM32 하드웨어에 특화된 코드를 생성하지만, 타겟이 STM32로 고정됩니다. Edge Impulse는 멀티 플랫폼을 지원하며 EON Compiler로 RAM 효율을 높입니다.

### 3.4 CubeMX에서 X-Cube-AI 활성화

1. CubeMX에서 프로젝트 열기
2. **Pinout & Configuration** → **Software Packs** → **Select Components**
3. 창 좌측 트리에서 **STMicroelectronics → X-CUBE-AI** 선택
4. 우측 **Artificial Intelligence** 항목을 펼쳐서 **Selection** 체크박스 활성화
5. 하단 **OK** 클릭
6. 활성화 확인:
   - **Pinout & Configuration** 좌측 트리 최하단 **Software Packs** 아래 **X-CUBE-AI** 항목 생성됨
   - 또는 **Project Manager → Advanced Settings**에서 X-CUBE-AI 관련 옵션 확인 가능

> **Device Application 내 옵션**: X-CUBE-AI 항목을 클릭하면 하위에 `System`, `Application`, `Validation` 등이 보입니다.
> - **System**: RTOS/클럭 설정 (기본값 유지)
> - **Application**: 모델(.tflite) 추가하는 핵심 항목 (4.3절에서 진행)
> - **Validation**: 정확도 검증용 테스트 데이터 (선택)
> - 지금 단계에서는 추가 설정 없이 넘어가도 됩니다.

---

## 4. 실습: 심박 데이터 분류 모델 (11:30-12:30)

> **목표**: Python으로 PPG(광용적맥파) 심박 데이터를 생성하고, Keras DNN으로 학습한 뒤 X-Cube-AI로 STM32F411에 포팅합니다.

### 4.1 PPG 심박 데이터 생성 (Python)

`C:\Users\Administrator\Desktop\day2_ppg_training` 폴더 생성 후, `generate_ppg_data.py` 생성:

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
import os

os.makedirs("model", exist_ok=True)

def generate_ppg(n_samples=1000, n_points=128, label=0, noise_level=0.05):
    """
    PPG 신호 생성기

    Args:
        n_samples: 생성할 샘플 수
        n_points: 샘플당 데이터 포인트 수 (128 = ~2.5초 @ 50Hz)
        label: 0=정상, 1=빈맥, 2=서맥
        noise_level: 노이즈 수준
    """
    data = []
    for _ in range(n_samples):
        t = np.linspace(0, 4 * np.pi, n_points)

        if label == 0:         # 정상 (Normal): 60-80 BPM
            heart_rate = 1.0
            amplitude = 1.0
        elif label == 1:       # 빈맥 (Tachycardia): 100-140 BPM
            heart_rate = 2.0
            amplitude = 0.7
        else:                  # 서맥 (Bradycardia): 40-55 BPM
            heart_rate = 0.6
            amplitude = 1.3

        # PPG 형태 모델링: 기본 파형 + 고조파
        signal = (amplitude * np.sin(heart_rate * t) ** 2 +
                  0.3 * amplitude * np.sin(2 * heart_rate * t) ** 2 +
                  0.1 * amplitude * np.sin(3 * heart_rate * t) ** 2)

        # DC 성분 (베이스라인)
        signal += 1.0

        # 노이즈 추가
        noise = np.random.normal(0, noise_level, n_points)
        signal += noise

        # 정규화
        signal = (signal - signal.min()) / (signal.max() - signal.min())
        data.append(signal)

    return np.array(data, dtype=np.float32)

print("=== PPG 심박 데이터 생성 ===")

# 3개 클래스 각각 1000개 생성
X_normal = generate_ppg(1000, 128, label=0, noise_level=0.05)
X_tachy = generate_ppg(1000, 128, label=1, noise_level=0.08)
X_brady = generate_ppg(1000, 128, label=2, noise_level=0.04)

# 레이블 생성 (One-hot)
y_normal = np.array([[1, 0, 0]] * 1000, dtype=np.float32)
y_tachy  = np.array([[0, 1, 0]] * 1000, dtype=np.float32)
y_brady  = np.array([[0, 0, 1]] * 1000, dtype=np.float32)

# 데이터 결합
X = np.vstack([X_normal, X_tachy, X_brady])
y = np.vstack([y_normal, y_tachy, y_brady])

print(f"전체 데이터: X={X.shape}, y={y.shape}")
print(f"클래스: 0=정상, 1=빈맥, 2=서맥")

# Train/Test 분할
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y.argmax(axis=1)
)

print(f"Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")

# 데이터 시각화
plt.figure(figsize=(12, 4))
for i, label_name in enumerate(["Normal", "Tachycardia", "Bradycardia"]):
    plt.subplot(1, 3, i + 1)
    idx = np.where(y.argmax(axis=1) == i)[0][0]
    plt.plot(X[idx])
    plt.title(label_name)
    plt.ylim(-0.1, 1.1)

plt.tight_layout()
plt.savefig("ppg_samples.png")
plt.show()

# NumPy로 저장 (Keras에서 직접 로드)
np.save("model/X_train.npy", X_train)
np.save("model/X_test.npy", X_test)
np.save("model/y_train.npy", y_train)
np.save("model/y_test.npy", y_test)
np.save("model/X_all.npy", X)
np.save("model/y_all.npy", y)

print("데이터 저장 완료: model/ 폴더")
```

**실행**:
```bash
cd C:\Users\Administrator\Desktop\day2_ppg_training
python generate_ppg_data.py
```

### 4.2 Keras DNN 학습

`train_ppg_model.py` 생성:

```python
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import matplotlib.pyplot as plt
import os

os.makedirs("model", exist_ok=True)

print("=== PPG 분류 모델 학습 ===")

# 데이터 로드
X_train = np.load("model/X_train.npy")
X_test  = np.load("model/X_test.npy")
y_train = np.load("model/y_train.npy")
y_test  = np.load("model/y_test.npy")

# 입력 shape: (128, 1) - 1D 시계열
X_train = X_train.reshape(-1, 128, 1)
X_test  = X_test.reshape(-1, 128, 1)

print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# 모델 정의 - SRAM 128KB에 맞춰 파라미터 최소화
model = keras.Sequential([
    layers.Input(shape=(128, 1), name="ppg_input"),
    layers.Conv1D(8, kernel_size=5, activation="relu", name="conv1"),
    layers.MaxPooling1D(pool_size=2, name="pool1"),
    layers.Conv1D(16, kernel_size=3, activation="relu", name="conv2"),
    layers.MaxPooling1D(pool_size=2, name="pool2"),
    layers.Flatten(name="flatten"),
    layers.Dense(16, activation="relu", name="dense1"),
    layers.Dense(3, activation="softmax", name="output")
])

model.summary()

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# 학습
history = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=50,
    batch_size=32,
    verbose=1
)

# 평가
test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
print(f"\n테스트 정확도: {test_acc:.4f} ({test_acc*100:.2f}%)")

# 모델 저장 (h5 + tflite)
model.save("model/ppg_model.h5")

# TFLite Float32 변환
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_f32 = converter.convert()
with open("model/ppg_model_f32.tflite", "wb") as f:
    f.write(tflite_f32)
print(f"Float32 TFLite: {len(tflite_f32)} bytes")

# TFLite Int8 양자화 변환
def representative_dataset():
    for i in range(100):
        yield [X_train[i:i+1]]

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_i8 = converter.convert()
with open("model/ppg_model_i8.tflite", "wb") as f:
    f.write(tflite_i8)
print(f"Int8 TFLite: {len(tflite_i8)} bytes")

# 크기 비교
f32_size = len(tflite_f32)
i8_size = len(tflite_i8)
print(f"\n=== 모델 크기 비교 ===")
print(f"Float32: {f32_size:>6} bytes ({f32_size/1024:.1f} KB)")
print(f"Int8:    {i8_size:>6} bytes ({i8_size/1024:.1f} KB)")
print(f"감소율:  {(1 - i8_size/f32_size)*100:.1f}%")

# 학습 곡선
plt.figure(figsize=(12, 4))
plt.subplot(1, 2, 1)
plt.plot(history.history["loss"], label="Train Loss")
plt.plot(history.history["val_loss"], label="Val Loss")
plt.legend()
plt.title("Loss")

plt.subplot(1, 2, 2)
plt.plot(history.history["accuracy"], label="Train Acc")
plt.plot(history.history["val_accuracy"], label="Val Acc")
plt.legend()
plt.title("Accuracy")

plt.tight_layout()
plt.savefig("training_history.png")
plt.show()

# X-Cube-AI 테스트용 입력 샘플 저장
np.save("model/test_sample.npy", X_test[0])
print("\n실제 레이블:", np.argmax(y_test[0]))
print("예측:", np.argmax(model.predict(X_test[0:1])[0]))

# TFLite 추론 검증
interpreter = tf.lite.Interpreter(model_content=tflite_i8)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

input_scale, input_zero = input_details[0]["quantization"]
test_input = X_test[0:1].astype(np.int8)
test_input = test_input / input_scale + input_zero
test_input = test_input.astype(np.int8)

interpreter.set_tensor(input_details[0]["index"], test_input)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]["index"])
print(f"Int8 TFLite 예측: {np.argmax(output)}")

print("\n=== 학습 및 변환 완료 ===")
```

**실행**:
```bash
python train_ppg_model.py
```

**예상 결과**:
```
Float32 TFLite: ~20 KB
Int8 TFLite:    ~7 KB
감소율:         ~65%
테스트 정확도:  ~95%+
```

> **실제 심박 데이터로 대체**: 실제 PPG 센서(MAX30102 등) 데이터가 있다면 `generate_ppg_data.py` 대신 실제 수집 데이터를 로드하여 사용하세요. `X = np.load("real_ppg.npy")` 형태로 대체 가능합니다.

### 4.3 X-Cube-AI로 모델 변환

#### 방법 A: CubeMX 내장 X-Cube-AI 사용

1. **CubeMX 실행** → 새 프로젝트 생성 (NUCLEO-F411RE)
2. **Software Packs → Select Components → X-CUBE-AI** 활성화
3. **Pinout & Configuration → Software Packs → X-CUBE-AI** 항목 선택
4. **Add network** 버튼 클릭 → 아래 옵션 설정 후 `.tflite` 파일 선택

   | 옵션 | 항목 | 권장 설정 | 설명 |
   |------|------|----------|------|
   | **Model type** | `TFLite` / `Keras` / `ONNX` | `TFLite` | PC에서 변환한 `.tflite` 파일 사용 |
   | **Runtime** | `STM32Cube.AI MCU runtime` / `TF Lite micro runtime` | `STM32Cube.AI MCU runtime` | STM32 특화 최적화 코드 생성. TFLite Micro는 범용 |
   | **Compression** | `None` / `Low` / `Medium` / `High` | `None` | 압축률 ↑ = 정확도 ↓. 첫 분석은 None으로 시작 |
   | **Optimization** | `Balanced` / `Time` / `Ram` | `Balanced` | Time = 속도 우선(ROM ↑), Ram = 메모리 우선(속도 ↓) |
   | **Validation Input** | `Random numbers` / `Browse` | `Random numbers` | 분석을 위한 랜덤 입력. Browse는 실제 테스트 파일 |
   | **Validation Option** | `None` / `Browse` | `None` | 정확도 검증용 (선택사항) |

   > 처음 열면 `network_1` 항목이 이미 있지만 내용은 비어 있습니다. `Add network` 버튼을 눌러 새로 추가합니다. 기존 `network_1`을 사용하려면 **Select** 버튼으로 파일을 직접 지정하세요.

5. 모델이 추가되면 하단 **Analysis** 탭에서:
   - **Target**: `STM32F411RE` (또는 `cortex-m4f`)
   - **Analyze** 버튼 클릭 (tflite 파일은 가장 짧은 경로에 한글이 없어야 함. c:\ 아래에 바로 이동하는것이 좋음)


* /C:/model/ppg_model_f32.tflite

```
Analyzing model 
C:/Users/Administrator/STM32Cube/Repository//Packs/STMicroelectronics/X-CUBE-AI/10.2.1/Utilities/windows/stedgeai.exe analyze --target stm32f4 --name network -m C:/model/ppg_model_f32.tflite --compression none --verbosity 1 --workspace C:/Users/ADMINI~1/AppData/Local/Temp/mxAI_workspace2370414396423002287740613494088094 --output C:/Users/Administrator/.stm32cubemx/network_output 
ST Edge AI Core v2.2.0-20266 2adc00962 
Creating c (debug) info json file C:\Users\Administrator\.stm32cubemx\network_output\network_c_info.json 
  
 Exec/report summary (analyze) 
 --------------------------------------------------------------------------------------------------------------- 
 model file         :   C:\model\ppg_model_f32.tflite                                                            
 type               :   tflite                                                                                   
 c_name             :   network                                                                                  
 compression        :   none                                                                                     
 options            :   allocate-inputs, allocate-outputs                                                        
 optimization       :   balanced                                                                                 
 target/series      :   stm32f4                                                                                  
 workspace dir      :   C:\Users\ADMINI~1\AppData\Local\Temp\mxAI_workspace2370414396423002287740613494088094    
 output dir         :   C:\Users\Administrator\.stm32cubemx\network_output                                       
 model_fmt          :   float                                                                                    
 model_name         :   ppg_model_f32                                                                            
 model_hash         :   0x229f9575e154a6846c28b6de7edb71ba                                                       
 params #           :   8,195 items (32.01 KiB)                                                                  
 --------------------------------------------------------------------------------------------------------------- 
 input 1/1          :   'serving_default_ppg_input0', f32(1x128x1), 512 Bytes, activations                       
 output 1/1         :   'nl_14', f32(1x3), 12 Bytes, activations                                                 
 macc               :   39,736                                                                                   
 weights (ro)       :   32,780 B (32.01 KiB) (1 segment)                                                         
 activations (rw)   :   5,920 B (5.78 KiB) (1 segment) *                                                         
 ram (total)        :   5,920 B (5.78 KiB) = 5,920 + 0 + 0                                                       
 --------------------------------------------------------------------------------------------------------------- 
 (*) 'input'/'output' buffers are allocated in the activations buffer 
Computing AI RT data/code size (target=stm32f4).. 
 Model name - ppg_model_f32 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 m_id   layer (original)                oshape                param/size         macc                 connected to 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 0      serving_default_ppg_input0 ()   [b:1,h:128,c:1] 
        reshape_0 (EXPAND_DIMS)         [b:1,h:1,w:128,c:1]                             serving_default_ppg_input0 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 1      conv2d_1 (CONV_2D)              [b:1,h:1,w:124,c:8]   48/192            4,968                    reshape_0 
        nl_1_nl (CONV_2D)               [b:1,h:1,w:124,c:8]                       992                     conv2d_1 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 2      reshape_2 (RESHAPE)             [b:1,h:124,c:8]                                                    nl_1_nl 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 3      reshape_3 (EXPAND_DIMS)         [b:1,h:1,w:124,c:8]                                              reshape_2 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 4      pool_4 (MAX_POOL_2D)            [b:1,h:1,w:62,c:8]                        992                    reshape_3 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 5      reshape_5 (RESHAPE)             [b:1,h:62,c:8]                                                      pool_4 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 6      reshape_6 (EXPAND_DIMS)         [b:1,h:1,w:62,c:8]                                               reshape_5 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 7      conv2d_7 (CONV_2D)              [b:1,h:1,w:60,c:16]   400/1,600        23,056                    reshape_6 
        nl_7_nl (CONV_2D)               [b:1,h:1,w:60,c:16]                       960                     conv2d_7 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 8      reshape_8 (RESHAPE)             [b:1,h:60,c:16]                                                    nl_7_nl 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 9      reshape_9 (EXPAND_DIMS)         [b:1,h:1,w:60,c:16]                                              reshape_8 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 10     pool_10 (MAX_POOL_2D)           [b:1,h:1,w:30,c:16]                       960                    reshape_9 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 11     reshape_11 (RESHAPE)            [b:1,c:480]                                                        pool_10 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 12     arith_constant8 ()              [b:16,c:480]          7,680/30,720 
        arith_constant10 ()             [b:16]                16/64 
        gemm_12 (FULLY_CONNECTED)       [b:1,c:16]                              7,696                   reshape_11 
                                                                                                   arith_constant8 
                                                                                                  arith_constant10 
        nl_12_nl (FULLY_CONNECTED)      [b:1,c:16]                                 16                      gemm_12 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 13     arith_constant7 ()              [b:3,c:16]            48/192 
        arith_constant9 ()              [b:3]                 3/12 
        gemm_13 (FULLY_CONNECTED)       [b:1,c:3]                                  51                     nl_12_nl 
                                                                                                   arith_constant7 
                                                                                                   arith_constant9 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 14     nl_14 (SOFTMAX)                 [b:1,c:3]                                  45                      gemm_13 
 ------ ------------------------------- --------------------- -------------- -------- ---------------------------- 
 model: macc=39,736 weights=32,780 activations=-- io=-- 
 Number of operations per c-layer 
 ------- ------ ------------------------- -------- -------------- 
 c_id    m_id   name (type)                    #op           type 
 ------- ------ ------------------------- -------- -------------- 
 0       1      conv2d_1 (Conv2D)            4,968   smul_f32_f32 
 1       1      nl_1_nl (Nonlinearity)         992     op_f32_f32 
 2       4      pool_4 (Pool)                  992   smul_f32_f32 
 3       7      conv2d_7 (Conv2D)           23,056   smul_f32_f32 
 4       7      nl_7_nl (Nonlinearity)         960     op_f32_f32 
 5       10     pool_10 (Pool)                 960   smul_f32_f32 
 6       12     gemm_12 (Dense)              7,696   smul_f32_f32 
 7       12     nl_12_nl (Nonlinearity)         16     op_f32_f32 
 8       13     gemm_13 (Dense)                 51   smul_f32_f32 
 9       14     nl_14 (Nonlinearity)            45     op_f32_f32 
 ------- ------ ------------------------- -------- -------------- 
 total                                      39,736 
 Number of operation types 
 ---------------- -------- ----------- 
 operation type          #           % 
 ---------------- -------- ----------- 
 smul_f32_f32       37,723       94.9% 
 op_f32_f32          2,013        5.1% 
 Complexity report (model) 
 ------ ----------------- ------------------------- ------------------------- -------- 
 m_id   name              c_macc                    c_rom                     c_id 
 ------ ----------------- ------------------------- ------------------------- -------- 
 1      conv2d_1          ||||              15.0%   |                  0.6%   [0, 1] 
 4      pool_4            |                  2.5%   |                  0.0%   [2] 
 7      conv2d_7          ||||||||||||||||  60.4%   |                  4.9%   [3, 4] 
 10     pool_10           |                  2.4%   |                  0.0%   [5] 
 12     arith_constant8   |||||             19.4%   ||||||||||||||||  93.9%   [6, 7] 
 13     arith_constant7   |                  0.1%   |                  0.6%   [8] 
 14     nl_14             |                  0.1%   |                  0.0%   [9] 
 ------ ----------------- ------------------------- ------------------------- -------- 
 macc=39,736 weights=32,780 act=5,920 ram_io=0 
 Requested memory size by section - "stm32f4" target 
 ------------------------------ -------- -------- ------- ------- 
 module                             text   rodata    data     bss 
 ------------------------------ -------- -------- ------- ------- 
 NetworkRuntime1020_CM4_GCC.a      9,436        0       0       0 
 network.o                           664       80   2,988     232 
 network_data.o                       48       16      88       0 
 lib (toolchain)*                    712       24       0       0 
 ------------------------------ -------- -------- ------- ------- 
 RT total**                       10,860      120   3,076     232 
 ------------------------------ -------- -------- ------- ------- 
 weights                               0   32,784       0       0 
 activations                           0        0       0   5,920 
 io                                    0        0       0       0 
 ------------------------------ -------- -------- ------- ------- 
 TOTAL                            10,860   32,904   3,076   6,152 
 ------------------------------ -------- -------- ------- ------- 
 *  toolchain objects (libm/libgcc*) 
 ** RT AI runtime objects (kernels+infrastructure) 
  Summary - "stm32f4" target 
  --------------------------------------------------- 
               FLASH (ro)      %*   RAM (rw)       % 
  --------------------------------------------------- 
  RT total         14,056   30.0%      3,308   35.8% 
  --------------------------------------------------- 
  TOTAL            46,840              9,228 
  --------------------------------------------------- 
  *  rt/total 
Creating txt report file C:\Users\Administrator\.stm32cubemx\network_output\network_analyze_report.txt 
elapsed time (analyze): 14.325s 
Model file:      ppg_model_f32.tflite 
Total Flash:     46836 B (45.74 KiB) 
    Weights:     32780 B (32.01 KiB) 
    Library:     14056 B (13.73 KiB) 
Total Ram:       9228 B (9.01 KiB) 
    Activations: 5920 B (5.78 KiB) 
    Library:     3308 B (3.23 KiB) 
    Input:       512 B (included in Activations) 
    Output:      12 B (included in Activations) 
Done 
Analyze complete on AI model
```

* /C:/model/ppg_model_i8.tflite
```


Analyzing model 
C:/Users/Administrator/STM32Cube/Repository//Packs/STMicroelectronics/X-CUBE-AI/10.2.1/Utilities/windows/stedgeai.exe analyze --target stm32f4 --name network -m C:/model/ppg_model_i8.tflite --compression none --verbosity 1 --workspace C:/Users/ADMINI~1/AppData/Local/Temp/mxAI_workspace2371931428147007682268062020999004 --output C:/Users/Administrator/.stm32cubemx/network_output 
ST Edge AI Core v2.2.0-20266 2adc00962 
Creating c (debug) info json file C:\Users\Administrator\.stm32cubemx\network_output\network_c_info.json 
  
 Exec/report summary (analyze) 
 ----------------------------------------------------------------------------------------------------------------------------- 
 model file         :   C:\model\ppg_model_i8.tflite                                                                           
 type               :   tflite                                                                                                 
 c_name             :   network                                                                                                
 compression        :   none                                                                                                   
 options            :   allocate-inputs, allocate-outputs                                                                      
 optimization       :   balanced                                                                                               
 target/series      :   stm32f4                                                                                                
 workspace dir      :   C:\Users\ADMINI~1\AppData\Local\Temp\mxAI_workspace2371931428147007682268062020999004                  
 output dir         :   C:\Users\Administrator\.stm32cubemx\network_output                                                     
 model_fmt          :   ss/sa per channel                                                                                      
 model_name         :   ppg_model_i8                                                                                           
 model_hash         :   0xec343715106d0ae325ca72f819e4839a                                                                     
 params #           :   8,195 items (8.13 KiB)                                                                                 
 ----------------------------------------------------------------------------------------------------------------------------- 
 input 1/1          :   'serving_default_ppg_input0', int8(1x128x1), 128 Bytes, QLinear(0.003921569,-128,int8), activations    
 output 1/1         :   'nl_14', int8(1x3), 3 Bytes, QLinear(0.003906250,-128,int8), activations                               
 macc               :   37,768                                                                                                 
 weights (ro)       :   8,324 B (8.13 KiB) (1 segment) / -24,456(-74.6%) vs float model                                        
 activations (rw)   :   2,544 B (2.48 KiB) (1 segment) *                                                                       
 ram (total)        :   2,544 B (2.48 KiB) = 2,544 + 0 + 0                                                                     
 ----------------------------------------------------------------------------------------------------------------------------- 
 (*) 'input'/'output' buffers are allocated in the activations buffer 
Computing AI RT data/code size (target=stm32f4).. 
 Model name - ppg_model_i8 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 m_id   layer (original)                oshape                param/size        macc                 connected to 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 0      serving_default_ppg_input0 ()   [b:1,h:128,c:1] 
        reshape_0 (EXPAND_DIMS)         [b:1,h:1,w:128,c:1]                            serving_default_ppg_input0 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 1      conv2d_1 (CONV_2D)              [b:1,h:1,w:124,c:8]   48/72            4,968                    reshape_0 
        nl_1_nl (CONV_2D)               [b:1,h:1,w:124,c:8]                      992                     conv2d_1 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 2      reshape_2 (RESHAPE)             [b:1,h:124,c:8]                                                   nl_1_nl 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 3      reshape_3 (EXPAND_DIMS)         [b:1,h:1,w:124,c:8]                                             reshape_2 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 4      pool_4 (MAX_POOL_2D)            [b:1,h:1,w:62,c:8]                       992                    reshape_3 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 5      reshape_5 (RESHAPE)             [b:1,h:62,c:8]                                                     pool_4 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 6      reshape_6 (EXPAND_DIMS)         [b:1,h:1,w:62,c:8]                                              reshape_5 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 7      conv2d_7 (CONV_2D)              [b:1,h:1,w:60,c:16]   400/448         23,056                    reshape_6 
        nl_7_nl (CONV_2D)               [b:1,h:1,w:60,c:16]                      960                     conv2d_7 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 8      reshape_8 (RESHAPE)             [b:1,h:60,c:16]                                                   nl_7_nl 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 9      reshape_9 (EXPAND_DIMS)         [b:1,h:1,w:60,c:16]                                             reshape_8 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 10     pool_10 (MAX_POOL_2D)           [b:1,h:1,w:30,c:16]                      960                    reshape_9 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 11     reshape_11 (RESHAPE)            [b:1,c:480]                                                       pool_10 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 12     tfl_pseudo_qconst3 ()           [b:16,c:480]          7,680/7,680 
        tfl_pseudo_qconst2 ()           [b:16]                16/64 
        gemm_12 (FULLY_CONNECTED)       [b:1,c:16]                             7,696                   reshape_11 
                                                                                               tfl_pseudo_qconst3 
                                                                                               tfl_pseudo_qconst2 
        nl_12_nl (FULLY_CONNECTED)      [b:1,c:16]                                16                      gemm_12 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 13     tfl_pseudo_qconst1 ()           [b:3,c:16]            48/48 
        tfl_pseudo_qconst ()            [b:3]                 3/12 
        gemm_13 (FULLY_CONNECTED)       [b:1,c:3]                                 51                     nl_12_nl 
                                                                                               tfl_pseudo_qconst1 
                                                                                                tfl_pseudo_qconst 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 14     nl_14 (SOFTMAX)                 [b:1,c:3]                                 45                      gemm_13 
 ------ ------------------------------- --------------------- ------------- -------- ---------------------------- 
 model: macc=39,736 weights=8,324 activations=-- io=-- 
 Number of operations per c-layer 
 ------- ------ ---------------------- -------- ------------ 
 c_id    m_id   name (type)                 #op         type 
 ------- ------ ---------------------- -------- ------------ 
 0       1      conv2d_1 (Conv2D)         4,968   smul_s8_s8 
 1       4      pool_4 (Pool)               992   smul_s8_s8 
 2       7      conv2d_7 (Conv2D)        23,056   smul_s8_s8 
 3       10     pool_10 (Pool)              960   smul_s8_s8 
 4       12     gemm_12 (Dense)           7,696   smul_s8_s8 
 5       13     gemm_13 (Dense)              51   smul_s8_s8 
 6       14     nl_14 (Nonlinearity)         45     op_s8_s8 
 ------- ------ ---------------------- -------- ------------ 
 total                                   37,768 
 Number of operation types 
 ---------------- -------- ----------- 
 operation type          #           % 
 ---------------- -------- ----------- 
 smul_s8_s8         37,723       99.9% 
 op_s8_s8               45        0.1% 
 Complexity report (model) 
 ------ -------------------- ------------------------- ------------------------- ------ 
 m_id   name                 c_macc                    c_rom                     c_id 
 ------ -------------------- ------------------------- ------------------------- ------ 
 1      conv2d_1             ||||              13.2%   |                  0.9%   [0] 
 4      pool_4               |                  2.6%   |                  0.0%   [1] 
 7      conv2d_7             ||||||||||||||||  61.0%   |                  5.4%   [2] 
 10     pool_10              |                  2.5%   |                  0.0%   [3] 
 12     tfl_pseudo_qconst3   ||||||            20.4%   ||||||||||||||||  93.0%   [4] 
 13     tfl_pseudo_qconst1   |                  0.1%   |                  0.7%   [5] 
 14     nl_14                |                  0.1%   |                  0.0%   [6] 
 ------ -------------------- ------------------------- ------------------------- ------ 
 macc=37,768 weights=8,324 act=2,544 ram_io=0 
 Requested memory size by section - "stm32f4" target 
 ------------------------------ -------- -------- ------- ------- 
 module                             text   rodata    data     bss 
 ------------------------------ -------- -------- ------- ------- 
 NetworkRuntime1020_CM4_GCC.a     18,756        0       0       0 
 network.o                           676      531   2,728     196 
 network_data.o                       48       16      88       0 
 lib (toolchain)*                      0        0       0       0 
 ------------------------------ -------- -------- ------- ------- 
 RT total**                       19,480      547   2,816     196 
 ------------------------------ -------- -------- ------- ------- 
 weights                               0    8,328       0       0 
 activations                           0        0       0   2,544 
 io                                    0        0       0       0 
 ------------------------------ -------- -------- ------- ------- 
 TOTAL                            19,480    8,875   2,816   2,740 
 ------------------------------ -------- -------- ------- ------- 
 *  toolchain objects (libm/libgcc*) 
 ** RT AI runtime objects (kernels+infrastructure) 
  Summary - "stm32f4" target 
  --------------------------------------------------- 
               FLASH (ro)      %*   RAM (rw)       % 
  --------------------------------------------------- 
  RT total         22,843   73.3%      3,012   54.2% 
  --------------------------------------------------- 
  TOTAL            31,171              5,556 
  --------------------------------------------------- 
  *  rt/total 
Creating txt report file C:\Users\Administrator\.stm32cubemx\network_output\network_analyze_report.txt 
elapsed time (analyze): 15.238s 
Model file:      ppg_model_i8.tflite 
Total Flash:     31167 B (30.44 KiB) 
    Weights:     8324 B (8.13 KiB) 
    Library:     22843 B (22.31 KiB) 
Total Ram:       5556 B (5.43 KiB) 
    Activations: 2544 B (2.48 KiB) 
    Library:     3012 B (2.94 KiB) 
    Input:       128 B (included in Activations) 
    Output:      3 B (included in Activations) 
Done 
Analyze complete on AI model
```

# STM32 X-CUBE-AI 모델 분석 결과 비교

```
Creating txt report file C:\Users\user\.stm32cubemx\network_output\network_analyze_report.txt 
elapsed time (analyze): 17.893s 
Model file:      ppg_model_f32.tflite 
Total Flash:     46836 B (45.74 KiB) 
    Weights:     32780 B (32.01 KiB) 
    Library:     14056 B (13.73 KiB) 
Total Ram:       9228 B (9.01 KiB) 
    Activations: 5920 B (5.78 KiB) 
    Library:     3308 B (3.23 KiB) 
    Input:       512 B (included in Activations) 
    Output:      12 B (included in Activations)

=============================================
Creating txt report file C:\Users\user\.stm32cubemx\network_output\network_analyze_report.txt 
elapsed time (analyze): 16.586s 
Model file:      ppg_model_i8.tflite 
Total Flash:     31167 B (30.44 KiB) 
    Weights:     8324 B (8.13 KiB) 
    Library:     22843 B (22.31 KiB) 
Total Ram:       5556 B (5.43 KiB) 
    Activations: 2544 B (2.48 KiB) 
    Library:     3012 B (2.94 KiB) 
    Input:       128 B (included in Activations) 
    Output:      3 B (included in Activations) 
Done

```

## 모델 개요

| 항목 | Float32 | INT8 Quantization |
|------|---------|-------------------|
| 모델명 | ppg_model_f32 | ppg_model_i8 |
| 입력 | 128 × 1 (float32) | 128 × 1 (int8) |
| 출력 | 3 Class | 3 Class |
| 파라미터 수 | 8,195 | 8,195 |
| 네트워크 구조 | 동일 | 동일 |

> 두 모델은 구조는 동일하며, 데이터 타입만 Float32 → INT8로 변경되었습니다.

---

## 메모리 비교

| 항목 | Float32 | INT8 | 감소율 |
|------|---------|------|--------:|
| Weights | 32.01 KB | 8.13 KB | **-74.6%** |
| Activations | 5.78 KB | 2.48 KB | **-57.0%** |
| Total RAM | 9.01 KB | 5.43 KB | **-39.8%** |
| Total Flash | 45.74 KB | 30.44 KB | **-33.4%** |

### 요약

- Weight 약 **75% 감소**
- RAM 약 **40% 감소**
- Flash 약 **33% 감소**

---

## 연산량(MACC)

| 항목 | Float32 | INT8 |
|------|---------|------|
| MACC | 39,736 | 37,768 |

모델 구조가 동일하여 연산량 차이는 거의 없습니다.

---

## Weight 비교

| 항목 | Float32 | INT8 |
|------|---------|------|
| Weight 크기 | 32,780 Bytes | 8,324 Bytes |
| 감소량 | - | **24,456 Bytes 감소** |

---

## Activation 메모리

| 항목 | Float32 | INT8 |
|------|---------|------|
| Activation | 5,920 Bytes | 2,544 Bytes |

약 **57% 감소**했습니다.

---

## Runtime Library 비교

| 항목 | Float32 | INT8 |
|------|---------|------|
| Runtime Library | 13.73 KB | 22.31 KB |

INT8 모델은 Runtime 라이브러리 크기는 증가하지만 Weight 감소 효과가 더 커 전체 Flash 사용량은 더 작습니다.

---

## 연산 종류 비교

### Float32
- Float Multiply
- Float Activation
- Float Dense

약 **95%**가 부동소수점 연산입니다.

### INT8
- INT8 Multiply
- INT8 Activation

거의 **100%**가 정수 연산입니다.

---

## STM32 탑재 관점 비교

| 항목 | Float32 | INT8 |
|------|---------|------|
| Flash 사용량 | 45.7 KB | **30.4 KB** ✅ |
| SRAM 사용량 | 9.0 KB | **5.4 KB** ✅ |
| Weight 크기 | 큼 | **매우 작음** ✅ |
| MCU 적합성 | 보통 | **매우 우수** ✅ |
| Edge AI 배포 | 가능 | **권장** ⭐ |

---

# 결론

INT8 양자화 모델(ppg_model_i8)은 STM32F4 계열 MCU에서 더 적합합니다.

- Weight 메모리 약 **75% 감소**
- RAM 사용량 약 **40% 감소**
- Flash 사용량 약 **33% 감소**
- 모델 구조는 동일
- MCU 환경에서 메모리 효율이 우수

따라서 추론 정확도가 유지된다면 STM32 기반 Edge AI에서는 **INT8 양자화 모델 사용을 권장**합니다.



---

6. **Analyze 실패 시 대처:**

   | 에러 상황 | 원인 | 해결 |
   |-----------|------|------|
   | `long paths are not enabled` | Windows 경로 제한(260자) 초과 | 레지스트리 수정 또는 모델/프로젝트를 짧은 경로에 배치 (아래 참고) |
   | `Unsupported operator` | X-Cube-AI 버전이 해당 TFLite op를 미지원 | `model/ppg_model_f32.tflite` (float32)로 재시도 |
   | `Quantization mismatch` | int8 양자화 파라미터 불일치 | float32 모델로 분석 → X-Cube-AI가 자체 양자화 |
   | `Analysis failed` (일반) | 모델-타겟 간 호환성 문제 | CubeMX + X-CUBE-AI 최신 버전인지 확인 |

   > **long paths 에러 해결 방법**:
   > - **방법 1 (권장)**: 모델 파일과 CubeMX 프로젝트를 짧은 경로에 배치 (예: `C:\model\`에 .tflite 복사)
   > - **방법 2**: 레지스트리 편집 — `regedit` 실행 → `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem` → `LongPathsEnabled` 값을 `0` → `1`로 변경 → 재부팅

   > **권장**: 첫 분석은 **float32 모델**(`ppg_model_f32.tflite`)로 시도한 뒤, X-Cube-AI가 분석 결과에서 제공하는 양자화 옵션을 적용하는 것이 안정적입니다. Int8 모델이 Analyze에 실패하면 float32로 바꿔서 다시 시도하세요.

**분석 결과 예시**:

| 항목 | 예상 값 |
|------|---------|
| Flash (ROM) | ~15 KB (가중치 + 코드) |
| RAM (활성화 버퍼) | ~4 KB (scratch buffer) |
| 추론 시간 (M4 @84MHz) | ~5-10 ms |
| MACC 연산 수 | ~50K |

7. **Generate Code** → 프로젝트에 통합

#### 방법 B: ST Edge AI Core (CLI) 사용

```bash
# ST Edge AI Core 설치 확인
stedgeai --version

# 프로파일링
stedgeai profile --model model/ppg_model_i8.tflite --target stm32f411re

# C 코드 생성
stedgeai generate --model model/ppg_model_i8.tflite --target stm32f411re --output stm32_ai_model/
```

생성된 파일:
```
stm32_ai_model/
├── network.c/h          # 네트워크 정의 (레이어 구조)
├── network_data.c/h     # 가중치 데이터
├── network_config.h     # 설정 (입출력 shape)
└── stm32ai_util.c/h     # 유틸리티 함수
```

### 4.4 STM32CubeIDE 프로젝트 통합

1. **CubeMX**에서 X-CUBE-AI 생성 완료 후 **Generate Code**
2. **STM32CubeIDE**에서 프로젝트 열기

**프로젝트 구조** (X-CUBE-AI 추가 후):
```
STM32F411_PPG/
├── Core/
│   ├── Inc/
│   │   ├── main.h
│   │   └── ...
│   └── Src/
│       ├── main.c
│       └── ...
├── Drivers/
├── X-CUBE-AI/
│   ├── App/
│   │   ├── app_x-cube-ai.c    # X-Cube-AI 메인 어플리케이션
│   │   └── app_x-cube-ai.h
│   └── network/
│       ├── network.c/h
│       ├── network_data.c/h
│       └── network_config.h
└── .project / .cproject
```

### 4.5 main.c에 추론 코드 작성

```c
/* USER CODE BEGIN Includes */
#include "network.h"
#include "network_data.h"
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
/* USER CODE END Includes */

/* USER CODE BEGIN PV */
static AI_ALIGNED(4) float ai_input[AI_NETWORK_IN_1_SIZE];
static AI_ALIGNED(4) float ai_output[AI_NETWORK_OUT_1_SIZE];
static ai_handle network = AI_HANDLE_NULL;
static AI_ALIGNED(8) ai_u8 activations_pool[AI_NETWORK_DATA_ACTIVATIONS_SIZE];
/* USER CODE END PV */

/* USER CODE BEGIN PFP */
#ifdef __GNUC__
int __io_putchar(int ch)
{
    HAL_UART_Transmit(&huart2, (uint8_t *)&ch, 1, HAL_MAX_DELAY);
    return ch;
}
#endif
/* USER CODE END PFP */

  /* USER CODE BEGIN 2 */
    /* X-Cube-AI 초기화 */
    ai_error err;
    err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
    if (err.type != AI_ERROR_NONE) {
        printf("Network create error: %d\r\n", err.code);
        Error_Handler();
    }

    /* 네트워크 파라미터 얻기 (활성화/가중치 버퍼 맵) */
    ai_network_params params;
    if (!ai_network_data_params_get(&params)) {
        printf("Failed to get network params\r\n");
        Error_Handler();
    }

    /* 활성화 버퍼 주소 설정 (runtime이 NULL data ptr을 허용하지 않음) */
    AI_BUFFER_ARRAY_ITEM_SET_ADDRESS(&params.map_activations, 0,
                                     AI_HANDLE_PTR(&activations_pool));

    /* 네트워크 활성화 (메모리 할당 및 가중치 로드) */
    if (!ai_network_init(network, &params)) {
        ai_error err = ai_network_get_error(network);
        printf("Network init error: type=%d code=%d\r\n", err.type, err.code);
        Error_Handler();
    }

    printf("X-Cube-AI initialized!\r\n");
    printf("Input size: %d, Output size: %d\r\n",
           AI_NETWORK_IN_1_SIZE, AI_NETWORK_OUT_1_SIZE);
  /* USER CODE END 2 */

    /* USER CODE BEGIN WHILE */
      while (1)
      {
        /* ---- 1. 센서 데이터 수신 (시뮬레이션) ---- */
        /* 실제로는 ADC/ I2C/ UART로 PPG 데이터를 수신 */
        for (int i = 0; i < AI_NETWORK_IN_1_SIZE; i++)
        {
            /* 테스트용: 사인파로 PPG 모방 */
            float t = (float)i / AI_NETWORK_IN_1_SIZE * 4 * 3.14159f;
            ai_input[i] = (sinf(t) * sinf(t)) + 0.1f * ((float)rand() / RAND_MAX);
        }

        /* ---- 2. 추론 실행 ---- */
        ai_i32 batch;
        ai_buffer *input_buff = ai_network_inputs_get(network, NULL);
        ai_buffer *output_buff = ai_network_outputs_get(network, NULL);

        input_buff->data = AI_HANDLE_PTR(&ai_input);
        output_buff->data = AI_HANDLE_PTR(&ai_output);

        batch = ai_network_run(network, input_buff, output_buff);
        if (batch != 1) {
            printf("Inference error!\r\n");
        }

        /* ---- 3. 결과 해석 ---- */
        int predicted_class = 0;
        float max_prob = ai_output[0];
        for (int i = 1; i < AI_NETWORK_OUT_1_SIZE; i++) {
            if (ai_output[i] > max_prob) {
                max_prob = ai_output[i];
                predicted_class = i;
            }
        }

        const char* class_names[] = {"Normal", "Tachycardia", "Bradycardia"};
        printf("Prediction: %s (%.1f%%)\r\n",
               class_names[predicted_class], max_prob * 100.0f);

        /* 결과에 따라 LED 표시 */
        if (predicted_class == 0) HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_RESET);  // OFF
        else                     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);      // ON

        HAL_Delay(1000);  // 1초마다 추론
        /* USER CODE END WHILE */
```

### 4.6 메모리 사용량 분석

| 구성 요소 | Flash (ROM) | RAM (SRAM) |
|-----------|------------|------------|
| 가중치 (int8 양자화) | ~7 KB | 0 |
| 네트워크 코드 | ~4 KB | 0 |
| 활성화 버퍼 (scratch) | 0 | ~4 KB |
| 입력/출력 버퍼 | 0 | ~1 KB |
| Stack/Heap | 0 | ~2 KB |
| HAL 드라이버 | ~20 KB | ~0.5 KB |
| **합계** | **~31 KB / 512 KB** | **~7.5 KB / 128 KB** |

> **결론**: STM32F411의 리소스에 여유 있음 (Flash 6%, RAM 6% 사용)


```c
/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include "network.h"
#include "network_data.h"
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
UART_HandleTypeDef huart2;

/* USER CODE BEGIN PV */
static ai_handle network = AI_HANDLE_NULL;
static AI_ALIGNED(8) ai_u8 activations_pool[AI_NETWORK_DATA_ACTIVATIONS_SIZE];

/* UART interrupt receive buffer (128 bytes = 128 int8 values) */
static volatile uint8_t uart_rx_buf[AI_NETWORK_IN_1_SIZE_BYTES];
static volatile uint8_t uart_data_ready = 0;
/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART2_UART_Init(void);
/* USER CODE BEGIN PFP */
#ifdef __GNUC__
int __io_putchar(int ch)
{
    HAL_UART_Transmit(&huart2, (uint8_t *)&ch, 1, HAL_MAX_DELAY);
    return ch;
}
#endif
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

/* Model quantization parameters (from network_generate_report.txt) */
#define QSCALE_IN    0.003921569f
#define QZP_IN      (-128)
#define QSCALE_OUT   0.003906250f
#define QZP_OUT     (-128)

static ai_i8 float_to_q7(float val, float scale, int zp)
{
    float q = val / scale + zp;
    if (q < -128) q = -128;
    if (q > 127) q = 127;
    return (ai_i8)q;
}

/* UART receive complete callback (called from ISR) */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    if (huart->Instance == USART2) {
        uart_data_ready = 1;
    }
}

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_USART2_UART_Init();
  /* USER CODE BEGIN 2 */
    /* X-Cube-AI 초기화 */
    ai_error err;
    err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
    if (err.type != AI_ERROR_NONE) {
        printf("Network create error: %d\r\n", err.code);
        Error_Handler();
    }

    /* 네트워크 파라미터 얻기 (활성화/가중치 버퍼 맵) */
    ai_network_params params;
    if (!ai_network_data_params_get(&params)) {
        printf("Failed to get network params\r\n");
        Error_Handler();
    }

    /* 활성화 버퍼 주소 설정 (runtime이 NULL data ptr을 허용하지 않음) */
    AI_BUFFER_ARRAY_ITEM_SET_ADDRESS(&params.map_activations, 0,
                                     AI_HANDLE_PTR(&activations_pool));

    /* 네트워크 활성화 (메모리 할당 및 가중치 로드) */
    if (!ai_network_init(network, &params)) {
        ai_error err = ai_network_get_error(network);
        printf("Network init error: type=%d code=%d\r\n", err.type, err.code);
        Error_Handler();
    }

    printf("X-Cube-AI initialized!\r\n");
    printf("Input size: %d (%d bytes), Output size: %d (%d bytes)\r\n",
           AI_NETWORK_IN_1_SIZE, AI_NETWORK_IN_1_SIZE_BYTES,
           AI_NETWORK_OUT_1_SIZE, AI_NETWORK_OUT_1_SIZE_BYTES);

    /* UART 인터럽트 수신 시작 (128 bytes = 128 int8) */
    HAL_UART_Receive_IT(&huart2, (uint8_t*)uart_rx_buf, sizeof(uart_rx_buf));
  /* USER CODE END 2 */

  /* Infinite loop */
    /* USER CODE BEGIN WHILE */
      while (1)
      {
        /* ---- 1. 입력 버퍼 포인터 얻기 (activations pool에 할당됨) ---- */
        ai_buffer *input_buff = ai_network_inputs_get(network, NULL);
        ai_buffer *output_buff = ai_network_outputs_get(network, NULL);
        ai_i8 *in_data = (ai_i8*)input_buff->data;
        ai_i8 *out_data = (ai_i8*)output_buff->data;

        /* ---- 2. 데이터 수신 또는 시뮬레이션 ---- */
        if (uart_data_ready) {
            uart_data_ready = 0;
            memcpy(in_data, (uint8_t*)uart_rx_buf, AI_NETWORK_IN_1_SIZE_BYTES);
            HAL_UART_Receive_IT(&huart2, (uint8_t*)uart_rx_buf, sizeof(uart_rx_buf));
            printf("--- External Data ---\r\n");
        } else {
            /* float 시뮬레이션 생성 → int8 양자화 */
            for (int i = 0; i < AI_NETWORK_IN_1_SIZE; i++)
            {
                float t = (float)i / AI_NETWORK_IN_1_SIZE * 4 * 3.14159f;
                float fval = (sinf(t) * sinf(t)) + 0.1f * ((float)rand() / RAND_MAX);
                in_data[i] = float_to_q7(fval, QSCALE_IN, QZP_IN);
            }
            printf("--- Simulation Data ---\r\n");
        }

        /* ---- 3. 추론 실행 ---- */
        ai_i32 batch = ai_network_run(network, input_buff, output_buff);
        if (batch != 1) {
            printf("Inference error!\r\n");
        }

        /* ---- 4. 결과 해석 (int8 → float 역양자화) ---- */
        float fout[AI_NETWORK_OUT_1_SIZE];
        for (int i = 0; i < AI_NETWORK_OUT_1_SIZE; i++) {
            fout[i] = (out_data[i] - QZP_OUT) * QSCALE_OUT;
        }

        int predicted_class = 0;
        float max_prob = fout[0];
        for (int i = 1; i < AI_NETWORK_OUT_1_SIZE; i++) {
            if (fout[i] > max_prob) {
                max_prob = fout[i];
                predicted_class = i;
            }
        }

        const char* class_names[] = {"Normal", "Tachycardia", "Bradycardia"};
        int pct = (int)(max_prob * 10000);
        printf("Prediction: %s (%d.%02d%%)\r\n",
               class_names[predicted_class], pct / 100, pct % 100);

        int r0 = (int)(fout[0] * 10000);
        int r1 = (int)(fout[1] * 10000);
        int r2 = (int)(fout[2] * 10000);
        printf("Raw: %d.%04d %d.%04d %d.%04d\r\n",
               r0 / 10000, r0 % 10000,
               r1 / 10000, r1 % 10000,
               r2 / 10000, r2 % 10000);

        /* 결과에 따라 LED 표시 */
        if (predicted_class == 0) HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_RESET);  // OFF
        else                     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);      // ON

        HAL_Delay(1000);
        /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Configure the main internal regulator output voltage
  */
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSI;
  RCC_OscInitStruct.PLL.PLLM = 8;
  RCC_OscInitStruct.PLL.PLLN = 100;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV2;
  RCC_OscInitStruct.PLL.PLLQ = 7;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_3) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 115200;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  /* USER CODE BEGIN MX_GPIO_Init_1 */

  /* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOH_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(LD2_GPIO_Port, LD2_Pin, GPIO_PIN_RESET);

  /*Configure GPIO pin : B1_Pin */
  GPIO_InitStruct.Pin = B1_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_FALLING;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(B1_GPIO_Port, &GPIO_InitStruct);

  /*Configure GPIO pin : LD2_Pin */
  GPIO_InitStruct.Pin = LD2_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(LD2_GPIO_Port, &GPIO_InitStruct);

  /* USER CODE BEGIN MX_GPIO_Init_2 */

  /* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */

```

```python
"""
PPG Signal Sender GUI - STM32F411 X-CUBE-AI

Shows 3 synthetic PPG patterns, let user select one,
and sends to STM32 via serial (Binary protocol: 512 bytes).

Usage:
  python ppg_sender_gui.py
"""

import tkinter as tk
from tkinter import ttk, messagebox
import math
import struct
import serial
import serial.tools.list_ports
import threading


def generate_normal():
    data = []
    for i in range(128):
        t = i / 128.0
        val = math.sin(2 * math.pi * t) ** 2
        if 0.32 < t < 0.48:
            notch = (t - 0.32) / 0.16
            val -= 0.25 * math.sin(notch * math.pi)
        data.append(max(0.01, val))
    return data


def generate_tachycardia():
    data = []
    for i in range(128):
        t = i / 128.0
        val = abs(math.sin(3.5 * math.pi * t))
        val = val ** 0.6
        data.append(max(0.01, val))
    return data


def generate_bradycardia():
    data = []
    for i in range(128):
        t = i / 128.0
        val = math.sin(1.1 * math.pi * t) ** 6
        if val < 0.05:
            val = 0
        data.append(max(0.01, val + 0.02 * math.sin(8 * math.pi * t)))
    return data


class PPGApp:
    def __init__(self, root):
        self.root = root
        self.root.title("PPG Signal Sender - STM32 X-CUBE-AI")
        self.root.geometry("900x750")

        self.signals = [
            ("Normal", generate_normal(), "#2ecc71"),
            ("Tachycardia", generate_tachycardia(), "#e74c3c"),
            ("Bradycardia", generate_bradycardia(), "#3498db"),
        ]
        self.selected_index = 0
        self.serial_port = None
        self.connected = False

        self.create_widgets()

    def create_widgets(self):
        top_frame = ttk.Frame(self.root, padding=5)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="COM Port:").pack(side=tk.LEFT)
        self.port_var = tk.StringVar()
        self.port_combo = ttk.Combobox(top_frame, textvariable=self.port_var, width=15)
        self.port_combo.pack(side=tk.LEFT, padx=5)
        self.refresh_ports()
        ttk.Button(top_frame, text="Scan", command=self.refresh_ports).pack(side=tk.LEFT, padx=2)
        self.connect_btn = ttk.Button(top_frame, text="Connect", command=self.toggle_connect)
        self.connect_btn.pack(side=tk.LEFT, padx=5)
        self.status_lbl = ttk.Label(top_frame, text="Disconnected", foreground="red")
        self.status_lbl.pack(side=tk.LEFT, padx=10)

        plot_frame = ttk.Frame(self.root, padding=5)
        plot_frame.pack(fill=tk.BOTH, expand=True)

        import matplotlib
        matplotlib.use('TkAgg')
        from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
        from matplotlib.figure import Figure

        self.fig = Figure(figsize=(9, 5.5), dpi=100)
        self.fig.subplots_adjust(hspace=0.45, left=0.06, right=0.97, top=0.95, bottom=0.06)

        self.axes = []
        self.lines = []
        for idx, (name, data, color) in enumerate(self.signals):
            ax = self.fig.add_subplot(3, 1, idx + 1)
            xs = [i / 128.0 for i in range(128)]
            line, = ax.plot(xs, data, color=color, linewidth=1.8)
            ax.set_title(name, fontsize=11, fontweight='bold')
            ax.set_ylabel("Amplitude")
            ax.set_ylim(-0.1, 1.2)
            ax.set_xlim(0, 1)
            ax.tick_params(labelsize=8)
            ax.grid(True, alpha=0.3)
            if idx < 2:
                ax.tick_params(labelbottom=False)
            else:
                ax.set_xlabel("Time (normalized)")
            self.axes.append(ax)
            self.lines.append(line)

        self.canvas = FigureCanvasTkAgg(self.fig, master=plot_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

        self.fig.canvas.mpl_connect('button_press_event', self.on_click)
        self.highlight_selected()

        bottom_frame = ttk.Frame(self.root, padding=5)
        bottom_frame.pack(fill=tk.X)

        info_frame = ttk.LabelFrame(bottom_frame, text="Selection", padding=5)
        info_frame.pack(fill=tk.X, pady=2)

        self.selection_lbl = ttk.Label(
            info_frame,
            text=f"Selected: {self.signals[self.selected_index][0]}",
            font=("", 10, "bold")
        )
        self.selection_lbl.pack(side=tk.LEFT, padx=10)

        self.send_btn = ttk.Button(
            info_frame, text="Send to STM32", command=self.send_data, state=tk.DISABLED
        )
        self.send_btn.pack(side=tk.RIGHT, padx=10)

        result_frame = ttk.LabelFrame(bottom_frame, text="Result", padding=5)
        result_frame.pack(fill=tk.BOTH, expand=True, pady=2)

        self.result_text = tk.Text(result_frame, height=5, wrap=tk.WORD, state=tk.DISABLED)
        self.result_text.pack(fill=tk.BOTH, expand=True)

    def refresh_ports(self):
        ports = [p.device for p in serial.tools.list_ports.comports()]
        self.port_combo['values'] = ports
        if ports and not self.port_var.get():
            self.port_var.set(ports[0])

    def toggle_connect(self):
        if self.connected:
            self.disconnect()
        else:
            self.connect()

    def connect(self):
        port = self.port_var.get()
        if not port:
            messagebox.showerror("Error", "Select a COM port first")
            return
        try:
            self.serial_port = serial.Serial(port, 115200, timeout=10)
            self.connected = True
            self.connect_btn.config(text="Disconnect")
            self.status_lbl.config(text=f"Connected: {port}", foreground="green")
            self.send_btn.config(state=tk.NORMAL)
            self.log(f"Connected to {port}")
        except Exception as e:
            messagebox.showerror("Connection Error", str(e))

    def disconnect(self):
        if self.serial_port:
            try:
                self.serial_port.close()
            except:
                pass
            self.serial_port = None
        self.connected = False
        self.connect_btn.config(text="Connect")
        self.status_lbl.config(text="Disconnected", foreground="red")
        self.send_btn.config(state=tk.DISABLED)
        self.log("Disconnected")

    def highlight_selected(self):
        for idx, ax in enumerate(self.axes):
            for spine in ax.spines.values():
                spine.set_color('#333333')
                spine.set_linewidth(1.0)
            if idx == self.selected_index:
                for spine in ax.spines.values():
                    spine.set_color(self.signals[idx][2])
                    spine.set_linewidth(2.5)
        self.canvas.draw_idle()

    def on_click(self, event):
        if event.inaxes is None:
            return
        for idx, ax in enumerate(self.axes):
            if event.inaxes == ax:
                self.selected_index = idx
                self.selection_lbl.config(text=f"Selected: {self.signals[idx][0]}")
                self.highlight_selected()
                break

    def send_data(self):
        if not self.connected or not self.serial_port:
            return
        self.send_btn.config(state=tk.DISABLED)
        threading.Thread(target=self._send_thread, daemon=True).start()

    def quantize(self, floats, scale, zp):
        """Quantize float list to int8 bytes."""
        result = []
        for f in floats:
            q = f / scale + zp
            q = max(-128, min(127, round(q)))
            result.append(q)
        return struct.pack(f'<{len(result)}b', *result)

    def _send_thread(self):
        try:
            ser = self.serial_port
            name, data, _ = self.signals[self.selected_index]

            # Model quantization: scale=0.003921569, zero_point=-128
            raw_bytes = self.quantize(data, 0.003921569, -128)
            ser.write(raw_bytes)
            self.log(f"-> Sent {len(raw_bytes)} bytes ({name})")

            self.log("--- Result ---")
            found = False
            for _ in range(100):
                line = ser.readline()
                if not line:
                    break
                text = line.decode('utf-8', errors='replace').strip()
                if not text:
                    continue
                if found:
                    self.log(text)
                    if "Raw:" in text:
                        break
                elif "--- External Data ---" in text:
                    found = True
                    self.log(text)
                elif "--- Simulation Data ---" in text and not found:
                    pass  # skip simulation data

        except Exception as e:
            self.log(f"Error: {e}")
        finally:
            self.root.after(0, lambda: self.send_btn.config(state=tk.NORMAL))

    def log(self, msg):
        self.root.after(0, lambda: self._append_log(msg))

    def _append_log(self, msg):
        self.result_text.config(state=tk.NORMAL)
        self.result_text.insert(tk.END, msg + "\n")
        self.result_text.see(tk.END)
        self.result_text.config(state=tk.DISABLED)


if __name__ == '__main__':
    root = tk.Tk()
    app = PPGApp(root)
    root.mainloop()

```


---

## 5. CMSIS-NN 최적화 (13:30-15:00)

### 5.1 CMSIS-NN이란?

CMSIS-NN은 ARM이 제공하는 Cortex-M 시리즈용 신경망 최적화 라이브러리입니다.

| 구성 | 설명 |
|------|------|
| **CMSIS-DSP** | 디지털 신호 처리 함수 (FIR, FFT, 행렬 연산) |
| **CMSIS-NN** | 신경망 최적화 커널 (Conv2D, FC, Pooling, Activation) |
| **SIMD 최적화** | Cortex-M4/M7의 16비트 SIMD 명령어 활용 |
| **데이터 타입** | int8 (q7), int16 (q15), float32 |

### 5.2 SIMD (Single Instruction Multiple Data) 이해

Cortex-M4는 16비트 SIMD 명령어를 지원합니다:

| 명령어 | 동작 | MACs/cycle |
|--------|------|-----------|
| `SMLAD` | 2개의 16비트 곱셈 후 덧셈 | 2 |
| `SMLALD` | 2개의 16비트 곱셈 후 32비트 누적 | 2 |
| `SMUAD` | 2개의 16비트 곱셈 | 2 |
| `PKHBT` | 레지스터 절반 팩/언팩 | - |

**SIMD 가속 원리**:
```
일반 연산 (1 MAC/cycle):
  a[0]*w[0] + a[1]*w[1] + ...  →  매번 1개 곱셈

SIMD (2 MACs/cycle):
  한 사이클에 (a[0]*w[0] + a[1]*w[1]) 수행
  → 이론적 2배 가속
```

### 5.3 CMSIS-NN 커널 종류

| 함수 | 설명 | 사용처 |
|------|------|--------|
| `arm_convolve_s8()` | int8 합성곱 (im2col + GEMM) | Conv2D 레이어 |
| `arm_depthwise_conv_s8()` | int8 Depthwise 합성곱 | DepthwiseConv2D |
| `arm_fully_connected_s8()` | int8 전결합 | Dense 레이어 |
| `arm_avgpool_s8()` | int8 Average Pooling | AveragePooling2D |
| `arm_maxpool_s8()` | int8 Max Pooling | MaxPooling2D |
| `arm_softmax_s8()` | int8 Softmax | 출력 레이어 |

### 5.4 STM32Cube.AI의 CMSIS-NN 활용

X-Cube-AI가 생성하는 C 코드는 자동으로 CMSIS-NN을 활용합니다:

```c
// X-Cube-AI 생성 코드 내부 (network.c)
/* CMSIS-NN을 사용한 Conv2D 구현 */
#include "arm_nnfunctions.h"

static ai_i32 conv2d_s8(
    const ai_i8 *pWeights,
    const ai_i8 *pBias,
    ai_i8 *pDataIn,
    ai_i8 *pDataOut,
    const ai_shape *shape)
{
    /* CMSIS-NN 호출 */
    arm_convolve_s8(
        pDataIn,                  // 입력
        shape->in_dim,            // 입력 차원
        shape->in_ch,             // 입력 채널
        shape->out_ch,            // 출력 채널
        shape->kernel,            // 커널 크기
        shape->stride,            // 스트라이드
        shape->pad,               // 패딩
        pWeights,                 // 가중치
        pBias,                    // 바이어스
        NULL,                     // activation buffer
        pDataOut,                 // 출력
        NULL);                    // 임시 버퍼
    return 0;
}
```

### 5.5 직접 TFLite Micro vs X-Cube-AI 비교

| 항목 | X-Cube-AI (STM32Cube.AI) | 직접 TFLite Micro 포팅 |
|------|--------------------------|----------------------|
| **설정 용이성** | CubeMX GUI, 자동 변환 | 수동 빌드/링크 필요 |
| **CMSIS-NN 활용** | 자동 | 수동 include 필요 |
| **메모리 최적화** | 레이어별 메모리 공유 | Tensor Arena 수동 설계 |
| **추론 시간** | ~5ms (예상) | ~8ms (예상) |
| **ROM 크기** | ~20KB (가중치 + 코드) | ~40KB (가중치 + TFLite Micro runtime) |
| **이식성** | STM32 전용 | 모든 MCU (범용) |
| **업데이트** | CubeMX 버전에 종속 | 최신 TFLite Micro 직접 사용 가능 |

### 5.6 양자화 영향 분석

**8비트 양자화 공식**:

```
int8_value = (float32_value / scale) + zero_point
float32_value = (int8_value - zero_point) * scale
```

**PPG 모델 양자화 영향**:

| 항목 | Float32 | Int8 | 차이 |
|------|---------|------|------|
| 크기 | ~20 KB | ~7 KB | -65% |
| 추론 시간 (M4) | ~15 ms | ~5 ms | -67% |
| 정확도 | ~96% | ~95.9% | -0.1% |
| RAM 사용 | ~8 KB | ~3 KB | -62% |

> **결론**: Int8 양자화는 정확도 0.1% 손실로 크기/속도/메모리 모두 대폭 개선

### 5.7 CMSIS-NN 수동 사용 예제 (선택)

X-Cube-AI 없이 직접 CMSIS-NN을 사용하려면:

```c
#include "arm_nnfunctions.h"
#include "arm_math.h"

#define INPUT_SIZE  128
#define HIDDEN_SIZE 16
#define OUTPUT_SIZE 3

/* int8 양자화된 가중치 */
const q7_t weights_fc1[INPUT_SIZE * HIDDEN_SIZE] = { /* ... */ };
const q7_t weights_fc2[HIDDEN_SIZE * OUTPUT_SIZE] = { /* ... */ };
const q7_t bias_fc1[HIDDEN_SIZE] = { /* ... */ };
const q7_t bias_fc2[OUTPUT_SIZE] = { /* ... */ };

/* CMSIS-NN으로 FC 레이어 실행 */
void run_fully_connected(q7_t *input, q7_t *output)
{
    q7_t hidden[HIDDEN_SIZE];

    /* 첫 번째 FC 레이어 */
    arm_fully_connected_s8(
        input,
        weights_fc1,
        HIDDEN_SIZE,
        INPUT_SIZE,
        0,                    // bias shift
        0,                    // output shift
        bias_fc1,
        hidden,
        NULL);                // activation min/max (ReLU)

    /* 두 번째 FC 레이어 */
    arm_fully_connected_s8(
        hidden,
        weights_fc2,
        OUTPUT_SIZE,
        HIDDEN_SIZE,
        0, 0,
        bias_fc2,
        output,
        NULL);
}
```

---

## 6. FreeRTOS + AI 태스크 통합 (15:00-16:30)

### 6.1 FreeRTOS 개요

STM32CubeMX는 FreeRTOS를 내장하고 있습니다. CubeMX에서 **Middleware → FREERTOS**를 활성화하면 자동으로 통합됩니다.

| FreeRTOS 개념 | 설명 | AI 파이프라인 적용 |
|---------------|------|-------------------|
| **Task** | 독립 실행 스레드 | 센서수집 / AI추론 / 결과출력 |
| **Queue** | Task 간 데이터 전달 | 센서 → AI Task |
| **Semaphore** | 동기화 도구 | 추론 완료 → 결과 출력 |
| **Stack** | Task별 메모리 영역 | 추론 Task는 큰 스택 필요 |

### 6.2 CubeMX에서 FreeRTOS 활성화

1. **Pinout & Configuration → Middleware → FREERTOS**
2. **Mode**: `CMSIS_V2` (CMSIS-RTOS V2 래퍼)
3. **Configuration → Config Parameters**:
   - `USE_NEWLIB_REENTRANT`: `Enabled` (printf 사용 시)
   - `TOTAL_HEAP_SIZE`: `32768` (32KB, SRAM 128KB 내에서)
   - `MAX_TASK_NAME_LEN`: `16`
   - `USE_DAEMON_TASK_STARTUP_HOOK`: `Disabled`

### 6.3 AI 파이프라인 태스크 설계

```
                    Queue                    Queue
   [Sensor Task] ────────→ [AI Task] ────────→ [Output Task]
   (수집: 50Hz)          (추론: 1Hz)         (출력: 1Hz)
       │                       │                    │
       │  PPG 데이터            │  예측 결과          │  LED / UART
       ▼                       ▼                    ▼
   HAL_ADC / I2C         ai_network_run()      HAL_GPIO / printf
```

> **설계 원칙**: 각 태스크는 단일 책임을 가집니다. Queue로 느슨하게 결합하여 각 태스크를 독립적으로 개발/테스트할 수 있습니다.

### 6.4 FreeRTOS 태스크 구현

`Core/Src/main.c` 수정:

```c
/* USER CODE BEGIN Includes */
#include "cmsis_os.h"
#include "app_x_cube_ai.h"
#include "network.h"
#include <stdio.h>
/* USER CODE END Includes */

/* USER CODE BEGIN PV */
#define QUEUE_LENGTH 5
#define PPG_SAMPLE_RATE 50  // Hz

/* AI 관련 버퍼 */
static AI_ALIGNED(4) float ai_input[AI_NETWORK_IN_1_SIZE];
static AI_ALIGNED(4) float ai_output[AI_NETWORK_OUT_1_SIZE];
static ai_handle network = AI_HANDLE_NULL;

/* Queue 핸들 */
osQueueId_t ppgQueueHandle;    // 센서 → AI
osQueueId_t resultQueueHandle; // AI → 출력

/* Task 핸들 */
osThreadId_t sensorTaskHandle;
osThreadId_t aiTaskHandle;
osThreadId_t outputTaskHandle;

/* 전역 카운터 */
static volatile uint32_t inference_count = 0;
/* USER CODE END PV */

/* USER CODE BEGIN 0 */
/* --- 1. 센서 수집 Task (50Hz 실행) --- */
void SensorTask(void *argument)
{
    float ppg_buffer[AI_NETWORK_IN_1_SIZE];
    uint32_t sample_idx = 0;

    /* TIM6으로 50Hz 트리거 (20ms) */
    HAL_TIM_Base_Start_IT(&htim6);

    while (1)
    {
        /* TIM6 콜백에서 이 Task를 깨우는 방식 (osSemaphoreAcquire) */
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

        /* PPG 데이터 수집 (시뮬레이션: 사인파) */
        float t = (float)sample_idx / PPG_SAMPLE_RATE;
        ppg_buffer[sample_idx] = (sinf(2 * 3.14159f * t) *
                                  sinf(2 * 3.14159f * t));

        sample_idx++;

        /* 128개 샘플 모이면 Queue로 전송 */
        if (sample_idx >= AI_NETWORK_IN_1_SIZE)
        {
            sample_idx = 0;

            /* Queue가 가득 차면 가장 오래된 데이터 폐기 */
            if (xQueueSend(ppgQueueHandle, ppg_buffer, 0) != pdTRUE)
            {
                /* Queue Full → 이전 데이터 무시 (덮어쓰기) */
                printf("Sensor: Queue full, dropping data\r\n");
            }
            else
            {
                printf("Sensor: Data sent (128 samples)\r\n");
            }
        }
    }
}

/* --- 2. AI 추론 Task (데이터 도착 시 실행) --- */
void AITask(void *argument)
{
    float input_buffer[AI_NETWORK_IN_1_SIZE];

    /* X-Cube-AI 초기화 */
    ai_error err;
    err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
    if (err.type != AI_ERROR_NONE) {
        printf("AI: Network create failed\r\n");
        while (1);
    }
    ai_network_init(network, NULL);
    printf("AI: Network initialized\r\n");

    while (1)
    {
        /* Queue에서 센서 데이터 수신 (무한 대기) */
        if (xQueueReceive(ppgQueueHandle, input_buffer, portMAX_DELAY) == pdTRUE)
        {
            printf("AI: Received data, starting inference...\r\n");

            /* 입력 복사 */
            for (int i = 0; i < AI_NETWORK_IN_1_SIZE; i++)
                ai_input[i] = input_buffer[i];

            /* 추론 실행 */
            ai_i32 batch;
            ai_buffer input_buff = ai_network_inputs_get(network, NULL);
            ai_buffer output_buff = ai_network_outputs_get(network, NULL);
            input_buff.data = AI_HANDLE_PTR(&ai_input);
            output_buff.data = AI_HANDLE_PTR(&ai_output);

            uint32_t start_tick = HAL_GetTick();
            batch = ai_network_run(network, &input_buff, &output_buff);
            uint32_t elapsed = HAL_GetTick() - start_tick;

            if (batch == 1)
            {
                inference_count++;

                /* 결과 해석 */
                int predicted_class = 0;
                float max_prob = ai_output[0];
                for (int i = 1; i < AI_NETWORK_OUT_1_SIZE; i++)
                {
                    if (ai_output[i] > max_prob)
                    {
                        max_prob = ai_output[i];
                        predicted_class = i;
                    }
                }

                /* 결과를 Output Queue로 전송 */
                uint8_t result_packet[2] = {predicted_class, (uint8_t)(elapsed)};
                if (xQueueSend(resultQueueHandle, result_packet, 0) != pdTRUE)
                {
                    printf("AI: Result queue full\r\n");
                }

                printf("AI: Inference done (%lu ms), class=%d, prob=%.1f%%\r\n",
                       elapsed, predicted_class, max_prob * 100.0f);
            }
            else
            {
                printf("AI: Inference failed\r\n");
            }
        }
    }
}

/* --- 3. 결과 출력 Task --- */
void OutputTask(void *argument)
{
    uint8_t result[2];

    while (1)
    {
        /* Queue에서 결과 수신 */
        if (xQueueReceive(resultQueueHandle, result, portMAX_DELAY) == pdTRUE)
        {
            uint8_t predicted_class = result[0];
            uint8_t inference_ms = result[1];

            const char *class_names[] = {"Normal", "Tachy", "Brady"};
            printf("Output: %s (%d ms), Total=%lu\r\n",
                   class_names[predicted_class],
                   inference_ms, inference_count);

            /* LED 표시 */
            if (predicted_class == 0)
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_RESET);  // OFF
            else if (predicted_class == 1)
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);     // ON (빈맥)
            else
                HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);     // ON (서맥)
        }
    }
}

/* --- 4. TIM6 콜백 (50Hz 트리거) --- */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM6)
    {
        BaseType_t xHigherPriorityTaskWoken = pdFALSE;

        /* Sensor Task 깨우기 (ISR 안전 버전) */
        vTaskNotifyGiveFromISR(sensorTaskHandle,
                               &xHigherPriorityTaskWoken);
        portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
    }
}
/* USER CODE END 0 */
```

### 6.5 main() 함수에서 태스크 생성

```c
/* USER CODE BEGIN 2 */
  /* 큐 생성 */
  ppgQueueHandle = xQueueCreate(QUEUE_LENGTH,
                                AI_NETWORK_IN_1_SIZE * sizeof(float));
  resultQueueHandle = xQueueCreate(QUEUE_LENGTH, 2 * sizeof(uint8_t));

  if (ppgQueueHandle == NULL || resultQueueHandle == NULL)
  {
      printf("Queue creation failed!\r\n");
      Error_Handler();
  }

  /* 태스크 생성 */
  osThreadAttr_t sensor_attr = {
      .name = "SensorTask",
      .stack_size = 512,      /* 512 * 4 = 2048 bytes */
      .priority = osPriorityNormal,
  };
  sensorTaskHandle = osThreadNew(SensorTask, NULL, &sensor_attr);

  osThreadAttr_t ai_attr = {
      .name = "AITask",
      .stack_size = 2048,     /* AI 추론 스택: 2048*4 = 8KB */
      .priority = osPriorityBelowNormal,
  };
  aiTaskHandle = osThreadNew(AITask, NULL, &ai_attr);

  osThreadAttr_t output_attr = {
      .name = "OutputTask",
      .stack_size = 256,      /* 256 * 4 = 1KB */
      .priority = osPriorityNormal,
  };
  outputTaskHandle = osThreadNew(OutputTask, NULL, &output_attr);

  printf("FreeRTOS + AI Tasks created!\r\n");
/* USER CODE END 2 */
```

### 6.6 Stack 크기 설계 가이드

| Task | 스택 크기 | 이유 |
|------|----------|------|
| **Sensor Task** | 512 words (2KB) | 간단한 수집, 함수 호출 깊이 얕음 |
| **AI Task** | 2048 words (8KB) | ai_network_run() 내부 호출 깊음, 지역 변수 많은 레이어 |
| **Output Task** | 256 words (1KB) | 단순 printf + GPIO |
| **Idle Task** | 128 words (512B) | FreeRTOS 내부 관리 |
| **Timer Task** | 256 words (1KB) | 소프트웨어 타이머 |
| **총합** | **~12KB** | SRAM 128KB 여유 |

> **스택 오버플로우 확인 방법**:
> 1. `FreeRTOSConfig.h`에서 `configCHECK_FOR_STACK_OVERFLOW`를 `2`로 설정
> 2. `vApplicationStackOverflowHook()` 콜백 구현
> 3. 디버그 모드에서 각 Task의 `uxTaskGetStackHighWaterMark()` 모니터링

### 6.7 NVIDIA Nsight / CubeIDE 프로파일러로 태스크 분석

CubeIDE에서 **Window → Show View → RTOS** 로 FreeRTOS 태스크 상태 실시간 모니터링:

```
Task Name     State    Stack High Water   Priority
SensorTask    Ready    128 words          Normal
AITask        Blocked  512 words          Below Normal
OutputTask    Blocked  64 words           Normal
Tmr Svc       Blocked  128 words          Normal
IDLE          Running  32 words           Idle
```

> **스택 High Water**: 사용되지 않은 스택 워드 수. 0에 가까울수록 스택 크기 증가 필요.

---

## 7. 프로젝트 코드 리뷰 + 최적화 팁 (16:30-17:00)

### 7.1 Flash/RAM 사용량 분석

CubeIDE에서 바이너리 분석:

```
arm-none-eabi-size STM32F411_PPG.elf

   text    data     bss     dec     hex filename
  18472    1234    5432   25138    6232 STM32F411_PPG.elf
```

| 영역 | 설명 | 예상 값 |
|------|------|---------|
| **text** | 코드 + 상수 데이터 (Flash) | ~18 KB |
| **data** | 초기화된 전역 변수 (Flash→RAM) | ~1 KB |
| **bss** | 초기화되지 않은 전역 변수 (RAM) | ~5 KB |
| **Flash 합계** | text + data | ~19 KB / 512 KB (3.7%) |
| **RAM 합계** | data + bss + Heap + Stack | ~32 KB / 128 KB (25%) |
| **Free Flash** | | ~493 KB |
| **Free RAM** | | ~96 KB |

### 7.2 추론 시간 측정

`HAL_GetTick()`을 이용한 측정 (1ms 분해능):

```c
uint32_t t0 = HAL_GetTick();
ai_network_run(network, &input_buff, &output_buff);
uint32_t t1 = HAL_GetTick();
printf("Inference: %lu ms\r\n", t1 - t0);
```

**더 정밀한 측정** (DWT 사이클 카운터 사용):

```c
/* USER CODE BEGIN 0 */
static volatile uint32_t *DWT_CYCCNT  = (uint32_t *)0xE0001004;
static volatile uint32_t *DWT_CONTROL = (uint32_t *)0xE0001000;
static volatile uint32_t *SCB_DEMCR   = (uint32_t *)0xE000EDFC;

void DWT_Init(void)
{
    *SCB_DEMCR |= (1 << 24);  // TRCENA 활성화
    *DWT_CONTROL |= 1;        // CYCCNT 활성화
}

uint32_t DWT_GetCycles(void)
{
    return *DWT_CYCCNT;
}
/* USER CODE END 0 */
```

```c
/* 측정 코드 */
DWT_Init();
uint32_t c0 = DWT_GetCycles();
ai_network_run(network, &input_buff, &output_buff);
uint32_t c1 = DWT_GetCycles();
float ms = (float)(c1 - c0) / 84e6f * 1000.0f;
printf("Inference: %lu cycles (%.3f ms)\r\n", c1 - c0, ms);
```

> STM32F411 @84MHz는 1사이클 ≈ 11.9ns. DWT 측정으로 마이크로초 단위 정밀도 도출 가능.

### 7.3 최적화 방안

#### 1. 모델 측면 최적화

| 방법 | 효과 | 수정 사항 |
|------|------|----------|
| **레이어 수 축소** | Flash 감소, 속도 향상 | Conv 레이어 통합 |
| **필터 수 감소** | 가중치 감소 | 16→8 채널로 축소 |
| **커널 크기 증가** | 레이어 깊이 감소 | 3→5로 변경 |
| **양자화 강도** | 크기/속도 ↑, 정확도 ↓ | int8, int4 혼용 |

#### 2. 코드 측면 최적화

```c
/* 최적화 전: 매 HAL_Delay()가 CPU 블로킹 */
HAL_Delay(500);

/* 최적화 후: FreeRTOS로 CPU 효율적 사용 */
osDelay(pdMS_TO_TICKS(500));
// osDelay()는 블로킹되지 않고 Idle Task가 실행됨
```

```c
/* 최적화 전: AI 네트워크 재초기화 (비효율) */
while (1) {
    ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
    ai_network_init(network, NULL);
    ai_network_run(network, &input_buff, &output_buff);
    ai_network_delete(network);
}

/* 최적화 후: 한 번 초기화, 반복 추론만 */
ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
ai_network_init(network, NULL);
while (1) {
    ai_network_run(network, &input_buff, &output_buff);
}
```

#### 3. CMSIS-NN 최적화 옵션 (CubeIDE)

**Project Properties → C/C++ Build → Settings → Tool Settings → MCU GCC Compiler**:

| 옵션 | 설명 | 적용 |
|------|------|------|
| `-O2` | 속도 최적화 (권장) | 기본 최적화 수준 |
| `-O3` | 최대 속도 (코드 크기 증가) | 추론 루프에만 적용 |
| `-Os` | 크기 최적화 | Flash 제한 시 |
| `-ffast-math` | 부동소수점 최적화 | FPU 활용 시 |
| `-mfpu=fpv4-sp-d16` | FPU 활성화 | Cortex-M4F 필수 |
| `-mfloat-abi=hard` | 하드웨어 FPU 호출 | 소프트 FPU보다 빠름 |

**권장 최적화 설정**:
```
-O2 -ffunction-sections -fdata-sections -mfpu=fpv4-sp-d16 -mfloat-abi=hard
```

#### 4. 메모리 배치 최적화 (CubeMX)

CubeMX → **Project Manager → Advanced Settings**:

| 설정 | 권장 값 | 설명 |
|------|---------|------|
| Heap Size | 4096 (4KB) | AI 버퍼용 |
| Stack Size | 2048 (2KB) | main 스택 |
| DTCM RAM | 사용 안함 | F411에는 없음 |
| SRAM1 | 0x20000000, 112KB | 기본 데이터 영역 |
| SRAM2 | 0x2001C000, 16KB | DMA 전용 (선택) |

### 7.4 자주 발생하는 문제와 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| `Out of memory` 에러 | Tensor Arena 부족 | 활성화 버퍼 크기 확인, Heap 증가 |
| `HardFault_Handler` | 스택 오버플로우 | Task 스택 크기 증가, `configCHECK_FOR_STACK_OVERFLOW=2` |
| 추론 결과 NaN | 입력 데이터 범위 오류 | 입력 정규화 확인 (0~1 또는 -1~1) |
| UART 출력 깨짐 | Baud rate 불일치 | 115200으로 통일 |
| LED 안 켜짐 | 잘못된 핀 번호 | PA5 확인, HAL_GPIO_WritePin 인자 확인 |
| CubeMX Generate 실패 | X-CUBE-AI 버전 불일치 | 최신 버전 설치 확인 |

### 7.5 추가 학습 자료

| 주제 | 참고 자료 |
|------|----------|
| X-CUBE-AI 공식 문서 | https://wiki.st.com/stm32mcu/wiki/Artificial_intelligence_intro |
| ST Edge AI Suite | https://www.st.com/content/st_com/en/st-edge-ai-suite.html |
| CMSIS-NN GitHub | https://github.com/ARM-software/CMSIS-NN |
| TFLite Micro | https://www.tensorflow.org/lite/microcontrollers |
| STM32CubeIDE 가이드 | https://www.st.com/en/development-tools/stm32cubeide.html |
| FreeRTOS 문서 | https://www.freertos.org/Documentation/RTOS_book.html |

---

## 부록 A: 전체 프로젝트 구조

```
STM32F411_PPG/                     # CubeMX 생성 프로젝트
├── .mxproject                    # CubeMX 설정 파일
├── STM32F411_PPG.ioc             # CubeMX IOC 설정
├── Core/
│   ├── Inc/
│   │   ├── main.h
│   │   ├── stm32f4xx_hal_conf.h
│   │   ├── stm32f4xx_it.h
│   │   ├── FreeRTOSConfig.h
│   │   └── cmsis_os.h
│   └── Src/
│       ├── main.c                # 메인 (태스크 생성 + FreeRTOS 시작)
│       ├── stm32f4xx_hal_msp.c
│       ├── stm32f4xx_it.c
│       └── freertos.c            # FreeRTOS 훅
├── Drivers/
│   ├── CMSIS/
│   └── STM32F4xx_HAL_Driver/
├── Middlewares/
│   └── Third_Party/
│       └── FreeRTOS/
├── X-CUBE-AI/                    # X-Cube-AI 생성 코드
│   ├── App/
│   │   └── app_x_cube_ai.c/h
│   └── network/
│       ├── network.c/h           # 네트워크 구조
│       ├── network_data.c/h      # 가중치 데이터
│       └── network_config.h      # 설정 헤더
├── .project / .cproject
└── STM32F411_PPG.elf / .bin
```

## 부록 B: Edge Impulse 연동 (대안)

Edge Impulse로 학습한 모델을 STM32F411에 배포하려면:

1. Edge Impulse 프로젝트 생성 → 학습 완료
2. **Deployment** 탭
3. **Build firmware** → `Cube.MX CMSIS-PACK` 선택
4. 다운로드된 `.pack` 파일 설치:
   - CubeMX → **Software Packs → Install from File**
5. 프로젝트에 추가 후 `ei_run_classifier()` API 사용

```c
/* Edge Impulse C++ 라이브러리 사용 */
#include <edge-impulse-sdk/classifier/ei_run_classifier.h>

/* 추론 */
ei_impulse_result_t result;
signal_t signal;
float ppg_data[128];

numpy::signal_from_buffer(ppg_data, 128, &signal);
run_classifier(&signal, &result, false);

/* 결과 출력 */
ei_printf("Predictions:\r\n");
for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
    ei_printf("  %s: %.5f\r\n",
              result.classification[i].label,
              result.classification[i].value);
}
```

---

> **다음 단계**: 3일차에서는 STM32N6의 Neural-ART NPU를 활용한 하드웨어 가속 추론을 학습합니다.
