# 2일차: STM32F411 + X-Cube-AI 실습 (7시간)

**목표**: Cortex-M4 기반 STM32F411에서 X-Cube-AI로 모델 변환 및 배포, RTOS 연동

| 시간 | 주제 | 내용 |
|------|------|------|
| 09:00-09:30 | **STM32F411 개요** | Cortex-M4 FPU (84MHz), SRAM 128KB, Flash 512KB, NUCLEO-F411RE 보드, STM32CubeIDE 환경 |
| 09:30-10:30 | **STM32CubeMX + HAL 기초** | GPIO/UART/TIM 설정, 프로젝트 생성, printf 리디렉션, LED Blink |
| 10:30-11:30 | **X-Cube-AI 이해** | X-Cube-AI 워크플로우: PC 모델 → .tflite → C 코드 변환, RAM/ROM 최적화, 벤치마킹 |
| 11:30-12:30 | **실습: 심박 데이터 분류 모델** | Python PPG 데이터 생성 → Keras DNN 학습 → X-Cube-AI 변환 → STM32F411 포팅 |
| 12:30-13:30 | 점심 | |
| 13:30-15:00 | **CMSIS-NN 최적화** | Cortex-M4용 DSP 명령어(SIMD), CMSIS-NN 커널(s8/s16), 가중치/활성화 8비트 양자화 |
| 15:00-16:30 | **FreeRTOS + AI 태스크 통합** | 센서 수집 Task → Queue 전달 → AI 추론 Task → 결과 출력 Task, Stack 크기 설계 |
| 16:30-17:00 | **프로젝트 코드 리뷰 + 최적화 팁** | Flash/RAM 사용량 분석, CubeIDE 프로파일러로 추론 시간 측정, 추가 최적화 방안 |

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
4. **Add network** 버튼 클릭 → `.tflite` 파일 선택 (`model/ppg_model_i8.tflite`)

   > 처음 열면 `network_1` 항목이 이미 있지만 내용은 비어 있습니다. `Add network`를 눌러 새로 추가하거나, 기존 `network_1`의 **Select** 버튼으로 파일을 지정합니다.

5. 모델이 추가되면 하단 **Analysis** 탭에서:
   - **Target**: `STM32F411RE` (또는 `cortex-m4f`)
   - **Validation**: `None` (테스트 데이터 없이 진행)
   - **Analyze** 버튼 클릭

6. **Analyze 실패 시 대처:**

   | 에러 상황 | 원인 | 해결 |
   |-----------|------|------|
   | `Unsupported operator` | X-Cube-AI 버전이 해당 TFLite op를 미지원 | `model/ppg_model_f32.tflite` (float32)로 재시도 |
   | `Quantization mismatch` | int8 양자화 파라미터 불일치 | float32 모델로 분석 → X-Cube-AI가 자체 양자화 |
   | `Analysis failed` (일반) | 모델-타겟 간 호환성 문제 | CubeMX + X-CUBE-AI 최신 버전인지 확인 |

   > **권장**: 첫 분석은 **float32 모델**(`ppg_model_f32.tflite`)로 시도한 뒤, X-Cube-AI가 분석 결과에서 제공하는 양자화 옵션을 적용하는 것이 안정적입니다. Int8 모델이 Analyze에 실패하면 float32로 바꿔서 다시 시도하세요.

**분석 결과 예시**:

| 항목 | 예상 값 |
|------|---------|
| Flash (ROM) | ~15 KB (가중치 + 코드) |
| RAM (활성화 버퍼) | ~4 KB (scratch buffer) |
| 추론 시간 (M4 @84MHz) | ~5-10 ms |
| MACC 연산 수 | ~50K |

6. **Generate Code** → 프로젝트에 통합

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
#include "app_x_cube_ai.h"
#include "network.h"
#include <stdio.h>
/* USER CODE END Includes */

/* USER CODE BEGIN PV */
static AI_ALIGNED(4) float ai_input[AI_NETWORK_IN_1_SIZE];
static AI_ALIGNED(4) float ai_output[AI_NETWORK_OUT_1_SIZE];
static ai_handle network = AI_HANDLE_NULL;
/* USER CODE END PV */

/* USER CODE BEGIN 2 */
  /* X-Cube-AI 초기화 */
  ai_error err;
  err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
  if (err.type != AI_ERROR_NONE) {
      printf("Network create error: %d\r\n", err.code);
      Error_Handler();
  }

  /* 네트워크 활성화 (메모리 할당) */
  err = ai_network_init(network, NULL);
  if (err.type != AI_ERROR_NONE) {
      printf("Network init error: %d\r\n", err.code);
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
    ai_buffer input_buff = ai_network_inputs_get(network, NULL);
    ai_buffer output_buff = ai_network_outputs_get(network, NULL);

    input_buff.data = AI_HANDLE_PTR(&ai_input);
    output_buff.data = AI_HANDLE_PTR(&ai_output);

    batch = ai_network_run(network, &input_buff, &output_buff);
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
  }
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
