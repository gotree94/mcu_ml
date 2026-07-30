# 3일차: STM32N6 + Neural-ART NPU 실습 (6시간)

**목표**: STM32N6 내장 Neural-ART NPU 활용, 하드웨어 가속 추론, 실제 제품 수준 파이프라인

| 시간 | 주제 | 내용 |
|------|------|------|
| 09:00-09:45 | **STM32N6 아키텍처** | Cortex-M85 (800MHz, Helium) + Neural-ART NPU, <br>4.2MB SRAM, 8MB Flash, STM32 최초 AI 내장 MCU |
| 09:45-10:30 | **NPU vs CPU 추론 비교** | CPU(Cortex-M85 Helium MVE) vs NPU(Neural-ART) 연산 방식, <br>MAC/cycle, 전력 효율(TOPS/W), 메모리 대역폭 |
| 10:30-12:00 | **STM32 Edge AI Suite 실습** | ST Edge AI Suite 설치, 모델 가져오기(TFLite/Keras/ONNX), <br>NPU 할당(CPU/NPU/혼합), 변환 → 배포 → 벤치마크 |
| 12:00-13:00 | 점심 | |
| 13:00-14:00 | **실시간 객체 탐지 실습** | MobileNet v1 / FOMO 모델 → NPU 양자화 <br>→ STM32N6 배포, 카메라 입력 → NPU 추론 → UART 출력 |
| 14:00-15:00 | **NPU 성능 튜닝** | 메모리 배치 최적화, NPU-CPU 파이프라인 분할, <br>전력-성능 트레이드오프, 프로파일링 |
| 15:00-16:00 | **종합 프로젝트 + Q&A** | 3일간 학습 내용 복습, <br> ESP32/STM32F411/STM32N6 계열별 배포 전략 수립, 추가 학습 로드맵 |

**3일차 핵심 포인트**:
- Neural-ART NPU: CNN/RNN 전용 하드웨어 가속기, CPU 대비 10~100배 전력 효율
- Cortex-M85 Helium: 벡터 명령어(MVE)로 CPU만으로도 4x SIMD 연산 가능
- Edge AI Suite는 모델 → NPU 바이너리 자동 변환 (수동 최적화 불필요)
- 3개 보드(ESP32 Xtensa / F411 Cortex-M4 / N6 Cortex-M85+NPU) 배포 전략 비교

---

## 사전 준비

### 준비물

- [ ] NUCLEO-N6570 보드 (STM32N6 Nucleo) - https://www.st.com/en/evaluation-tools/nucleo-n657x0-q.html
- [ ] 카메라 모듈 (MIPI CSI-2, B-CAMS-IMX 권장)
- [ ] USB-C 케이블 (데이터 전송 지원)
- [ ] STM32CubeIDE 2.2.0+
- [ ] STM32CubeMX 6.18.0+
- [ ] ST Edge AI Core 4.0.0+ (Neural-ART NPU 지원 포함)
- [ ] Python 3.8+ (TensorFlow 2.x)
- [ ] PC (Windows 10+ / Linux / macOS)

> **참고**: STM32N6는 2025년 양산 시작된 STM32 최초의 AI 내장 MCU입니다. Neural-ART NPU는 600 GOPS 성능을 제공합니다.

### ST Edge AI Core 설치

1. https://www.st.com/en/development-tools/stedgeai-core.html  방문
2. **Get Software** → 로그인 후 다운로드
3. 설치 프로그램 실행:
   - Windows: `ST Edge AI Core 4.0.0.exe` (기본 설치 경로: `C:\ST\STEdgeAI`)
   - Linux: `st-edge-ai-core-4.0.0.run`
4. **PATH 등록 (Windows 필수)**:
   `stedgeai` CLI가 기본적으로 PATH에 등록되지 않습니다. 아래 중 한 가지 방법으로 등록하세요.
   - **임시** (현재 터미널): `$env:Path += ";C:\ST\STEdgeAI\4.0\Utilities\windows"`
   - **영구**: 시스템 환경 변수 `Path`에 `C:\ST\STEdgeAI\4.0\Utilities\windows` 추가
5. 설치 확인:
   ```bash
   stedgeai --version
   # ST Edge AI Core v4.0.1 (build 2026-07-31)
   ```

### Python 패키지 설치

```bash
pip install tensorflow numpy matplotlib pillow opencv-python
```

### 보드 연결 확인 (프로젝트 생성 전)

1. USB-C 케이블로 NUCLEO-N6570을 PC에 연결
2. 장치 관리자 확인:
   - `STM32 STLink Virtual COM Port` (예: COM5) — 시리얼 통신 포트
   - `STM32 STLink` (또는 `ST-Link Debug`) — 디버그 인터페이스
   > 참고: `STM32N6570`이라는 이름은 나타나지 않습니다. ST-Link 인터페이스가 정상 인식되면 됩니다.
3. 녹색 전원 LED 점등 확인
4. (**선택**) CubeIDE 실행 → **File → New → STM32 Project** → **Board Selector**에서 `NUCLEO-N6570` 검색 시 보드 템플릿이 목록에 나타나는지 확인
   - 이 단계는 보드 연결 없이도 가능하며, 단순히 CubeIDE에 보드 지원이 설치되었는지 확인하는 것입니다.
   - 실제 디버깅 연결 확인은 3.4절의 프로젝트 생성 후 **Run (F11)** 시 ST-Link가 인식되는지로 대체합니다.

---

## 0. 첫 번째 프로젝트: LED + UART (보드 테스트)

NPU 실습 전에 STM32CubeIDE로 기본 프로젝트를 생성하고 보드가 정상 동작하는지 확인합니다.

> **참고**: STM32N6는 Cortex-M85 기반으로 **TrustZone**을 지원합니다. 따라서 프로젝트 생성 시 **Secure(보안)** 영역과 **Non-Secure(일반)** 영역을 구분해서 설정해야 합니다.

### 0.1 CubeMX로 프로젝트 생성

1. **STM32CubeMX 실행** → **File → New Project**
2. **Board Selector** 탭 → 검색: `NUCLEO-N6570` → 선택 → **Start Project**
3. **Yes** (초기화 확인 다이얼로그)
4. **Pinout & Configuration** 탭에서 다음 설정:

   #### ① Secure Boot 설정 (System Core → SYS_S)
   - **SYS_S** 클릭 → `First Stage Boot Loader` 체크, `Application` 체크
     - FSBL은 CubeMX가 자동 생성하며 클럭/메모리 초기화 후 Application으로 점프합니다.
     - 사용자 코드는 Non-Secure 쪽 Application(`NonSecure/App/Src/main.c`)에만 작성하면 됩니다.
   - **Timebase Source**: `SysTick` 유지
   - 확인 후 좌측 메뉴에 **Initializer** 항목이 새로 생깁니다.

   #### ② Initializer에서 컨텍스트 선택
   - **Initializer** 클릭 → `Select initialized context` 드롭다운에서 **Application** 선택
     - `First stage boot loader`: Secure 부트로더용 설정 (클럭, 메모리 등 HW 초기화)
     - `Application`: Non-Secure 사용자 애플리케이션용 설정 ← **LED/UART 실습용**
     - `External Memory Loader`: 외부 메모리 로더용 설정
   > 이후 모든 주변장치 설정은 선택한 컨텍스트(Application)에 적용됩니다.

   #### ③ USART2 활성화 (Application 컨텍스트)
   - **Connectivity → USART2** → `Mode: Asynchronous`
     - 자동 할당된 TX/RX 핀 확인
     - **Parameter Settings → Baud Rate**: `115200`
     - 모드 선택 후 아래 **USART2 Mode and Configuration** 창에 **FSBL / Application / External** 체크박스가 나타납니다.
       - **Application** 체크 (Non-Secure 영역에서 printf 출력에 사용)
       - FSBL에도 디버그 출력을 원하면 FSBL도 함께 체크 (선택)

   #### ③ 사용자 LED GPIO 설정 (직접 추가 필요)
   NUCLEO-N6570 Nucleo-144 보드의 사용자 LED는 CubeMX 기본 설정에 포함되어 있지 않으므로 직접 추가해야 합니다.
   - 아래 핀 중 원하는 LED를 Pinout View에서 **GPIO_Output**으로 설정:
     - **PG0** = LED3 (녹색) — `GPIO_Output` 클릭
     - **PG8** = LED1 (파랑)
     - **PG10** = LED2 (빨강)
   - **주의**: 모든 사용자 LED는 **Active LOW** (핀 LOW일 때 ON, HIGH일 때 OFF)입니다.
     - `HAL_GPIO_WritePin(..., GPIO_PIN_RESET)` → LED ON
     - `HAL_GPIO_WritePin(..., GPIO_PIN_SET)` → LED OFF
   - **System Core → GPIO**에서 해당 핀의 `User Label`을 `LED3` 등으로 변경하면 코드에서 `LED3_GPIO_Port`, `LED3_Pin` 매크로를 자동 생성할 수 있습니다.

5. **Project Manager** 탭:
   - **Project Name**: `nucleo_n6570_led_uart`
   - **Project Location**: 적절한 폴더 선택
   - **Toolchain / IDE**: `STM32CubeIDE`
   - TrustZone 프로젝트는 Secure / Non-Secure 폴더가 분리되어 생성됩니다.

6. **Generate Code** 버튼 클릭 → 프로젝트 생성

### 0.2 LED 깜빡임 코드 (Non-Secure Application)

생성된 프로젝트에서 `NonSecure/App/Src/main.c`를 엽니다. (Secure 프로젝트가 아닌 **Non-Secure** 쪽 main.c입니다.)

`main()` 함수의 `USER CODE BEGIN 2` ~ `USER CODE END 2`, `USER CODE BEGIN WHILE` ~ `USER CODE END WHILE`에 추가:

```c
/* USER CODE BEGIN 0 */
#include <stdio.h>
/* USER CODE END 0 */

/* USER CODE BEGIN 2 */
printf("STM32N6 Nucleo-6570 Boot OK!\r\n");
/* USER CODE END 2 */

/* USER CODE BEGIN WHILE */
while (1)
{
  /* Active LOW: Reset(LOW) = ON, Set(HIGH) = OFF */
  HAL_GPIO_TogglePin(LED3_GPIO_Port, LED3_Pin);
  printf("LED: %s\r\n",
         HAL_GPIO_ReadPin(LED3_GPIO_Port, LED3_Pin) ? "OFF" : "ON");
  HAL_Delay(500);
  /* USER CODE END WHILE */

  /* USER CODE BEGIN 3 */
}
/* USER CODE END 3 */
```

### 0.3 UART `_write` 재정의 (printf 출력)

STM32N6 TrustZone 프로젝트에서 `printf`가 USART2로 출력되도록 `NonSecure/App/Src/main.c`에 추가:

```c
/* USER CODE BEGIN 0 */
#include <stdio.h>

/* printf → USART2 (ST-Link VCP) */
int _write(int file, char *ptr, int len)
{
    HAL_UART_Transmit(&huart2, (uint8_t *)ptr, len, HAL_MAX_DELAY);
    return len;
}
/* USER CODE END 0 */
```

> `huart2` 핸들은 USART2를 Asynchronous 모드로 활성화하면 CubeMX가 자동 생성합니다. 만약 컴파일 에러가 발생하면 헤더에 extern 선언이 있는지 확인하세요.

### 0.4 빌드 및 플래싱

TrustZone 프로젝트는 **Secure → Non-Secure** 순서로 빌드됩니다.

1. CubeMX가 생성한 프로젝트를 **STM32CubeIDE**로 열기
   - 또는 CubeMX **Generate Code** 시 **Open Project** 클릭
2. **Project → Build All (Ctrl+B)**
   - Secure 프로젝트 → Non-Secure 프로젝트 → 최종 바이너리 병합
3. **Run → Debug (F11)** 또는 **Run (Ctrl+F11)**
   - ST-Link 자동 인식 → FSBL + Application이 보드에 플래싱
4. 시리얼 모니터 (115200 baud, ST-Link VCP 포트) 확인:

```
STM32N6 Nucleo-6570 Boot OK!
LED: ON
LED: OFF
LED: ON
LED: OFF
...
```

> **500ms 간격으로 사용자 LED가 깜빡이고 시리얼로 상태가 출력되면 보드와 개발 환경이 정상입니다.**

### 0.5 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| ST-Link 인식 안 됨 | 드라이버 미설치 | [ST-Link 드라이버](https://www.st.com/en/development-tools/stsw-link009.html) 설치 |
| `No ST-Link detected` | USB 케이블이 데이터 전용 아님 | 데이터 케이블 사용, 다른 USB 포트 시도 |
| printf 출력 안 됨 | VCP 포트 잘못 선택 | 장치 관리자 COM 포트 번호 확인 |
| 빌드 에러 (printf) | `_write` 미구현 | 위 0.3절 코드 추가 |
| Secure/Non-Secure 링크 에러 | FSBL 설정 누락 | SYS_S에서 FSBL + Application 모두 체크 확인 |

---

## 1. STM32N6 아키텍처 (09:00-09:45)

### 1.1 STM32N6 개요

STM32N6는 STMicroelectronics의 STM32 포트폴리오에서 최초로 **Neural-ART NPU**를 내장한 MCU입니다.

| 항목 | 사양 |
|------|------|
| **CPU 코어** | ARM Cortex-M85 (Helium MVE v2) |
| **CPU 최대 클럭** | 800MHz |
| **NPU** | Neural-ART (최대 600 GOPS) |
| **SRAM** | 4.2MB (내부) + 외부 메모리 인터페이스 |
| **Flash** | 8MB (내부) |
| **외부 메모리** | Octo-SPI, HyperRAM, DDR 지원 |
| **카메라** | MIPI CSI-2 (2-lane) |
| **디스플레이** | LTDC, DSI |
| **NPU 전력** | ~50mW (MobileNet 추론 시) |
| **패키지** | LQFP176, UFBGA169 |

### 1.2 Cortex-M85 Helium (MVE v2)

Cortex-M85는 ARM v8.1-M 아키텍처 기반으로, **Helium MVE(M-Profile Vector Extension)** v2를 지원합니다.

| 기능 | Cortex-M4F (F411) | Cortex-M85 (N6) |
|------|------------------|-----------------|
| **아키텍처** | ARM v7E-M | ARM v8.1-M |
| **SIMD** | 16-bit (SMLAD 등) | 128-bit Helium MVE |
| **벡터 레지스터** | 없음 | 16 x 128-bit |
| **MACs/cycle** | 1 (32-bit) / 2 (16-bit) | 최대 16 (8-bit) |
| **FPU** | 단정밀도 | 단정밀도 + 배정밀도 |
| **신뢰성** | 없음 | PACBTI, TrustZone |

**Helium MVE MACs/cycle 성능**:

| 데이터 타입 | 연산 | MACs/cycle |
|-----------|------|-----------|
| float32 | 4 x FMA | 4 |
| int16 | 8 x MAC | 8 |
| int8 | 16 x MAC | 16 |

> **Cortex-M85 Helium은 단일 사이클에 16개의 8비트 곱셈-누적을 수행합니다.** 이는 Cortex-M4의 2 MACs/cycle 대비 8배 향상입니다.

### 1.3 Neural-ART NPU 아키텍처

Neural-ART는 ST가 자체 개발한 CNN/RNN 전용 NPU입니다.

```
          ┌──────────────────────────────────────────┐
          │              Cortex-M85 CPU               │
          │  ┌─────┐  ┌──────┐  ┌─────────────────┐  │
          │  │ MVE │  │ FPU  │  │ TrustZone + PAC  │  │
          │  └─────┘  └──────┘  └─────────────────┘  │
          └──────────────┬───────────────────────────┘
                         │ AXI Bus (64-bit, 400MHz)
          ┌──────────────┴───────────────────────────┐
          │           Neural-ART NPU                  │
          │  ┌──────────┐  ┌──────────┐              │
          │  │  MAC     │  │  MAC     │  ... (16개)   │
          │  │  Array   │  │  Array   │              │
          │  └──────────┘  └──────────┘              │
          │  ┌──────────┐  ┌──────────┐              │
          │  │ Activation│  │ Pooling  │              │
          │  │  Engine   │  │  Engine  │              │
          │  └──────────┘  └──────────┘              │
          │  ┌──────────────────────────────────┐     │
          │  │          DMA Engine              │     │
          │  └──────────────────────────────────┘     │
          └──────────────────────────────────────────┘
                         │
          ┌──────────────┴───────────────────────────┐
          │            Memory Subsystem               │
          │  SRAM4 (512KB) ───── Neural-ART 전용      │
          │  SRAM1-3 (3.7MB) ─── CPU + 공유            │
          │  Flash (8MB) ─────── 코드 + 가중치 저장    │
          └──────────────────────────────────────────┘
```

**NPU 구성 요소**:

| 블록 | 설명 |
|------|------|
| **MAC Array** | 16개의 병렬 MAC 유닛, 각 유닛은 128 MAC/cycle |
| **Activation Engine** | ReLU, Sigmoid, Tanh, Hard-Swish 등 HW 가속 |
| **Pooling Engine** | Max, Average, Global Pooling HW 가속 |
| **DMA Engine** | 메모리 ↔ NPU 간 데이터 전송 전용 DMA |
| **전용 SRAM** | SRAM4 (512KB) = NPU 전용 워크 버퍼 |

### 1.4 메모리 맵

| 주소 범위 | 크기 | 용도 |
|-----------|------|------|
| `0x1000_0000` - `0x103F_FFFF` | 4MB | Flash (코드 + 가중치 저장) |
| `0x2000_0000` - `0x203B_FFFF` | ~3.7MB | SRAM1-3 (CPU 코드/데이터) |
| `0x2040_0000` - `0x2047_FFFF` | 512KB | SRAM4 (NPU 전용 워크 버퍼) |
| `0x6000_0000` - `0x6FFF_FFFF` | 256MB | 외부 메모리 (Octo-SPI / HyperRAM) |

> **NPU 메모리 설계 핵심**: NPU는 SRAM4(512KB)를 워크 버퍼로 사용합니다. CPU와 NPU가 동시에 접근할 수 있는 공유 메모리 영역(SRAM1-3)을 통해 데이터를 주고받습니다.

---

## 2. NPU vs CPU 추론 비교 (09:45-10:30)

### 2.1 연산 방식 비교

| 항목 | CPU (Cortex-M85 Helium) | NPU (Neural-ART) |
|------|------------------------|-----------------|
| **연산 단위** | 순차 명령어 실행 (Von Neumann) | 데이터 병렬 (SIMD + systolic array) |
| **MAC/cycle** | 16 (int8) | 2,048 (int8, 피크) |
| **클럭** | 800MHz | 400MHz |
| **피크 성능** | 12.8 GOPS (int8) | 600 GOPS (int8) |
| **전력 소모** | ~5-20 mW/MHz (코어 전압依存) | ~50mW (MobileNet 추론) |
| **전력 효율** | ~1 TOPS/W | ~12 TOPS/W |
| **제어 흐름** | 분기/루프 자유로움 | 고정 파이프라인 (if-then 제한적) |
| **데이터 타입** | int8/16/32, float32/64 | int8, int4 혼합 (weight only) |

### 2.2 MAC/cycle 상세 분석

**Cortex-M85 Helium (MVE)**:
```
VLDM.32  {Q0, Q1}, [R0]!    ; 128-bit 로드 x2 = 8 x float32
VMLA.32  Q2, Q0, Q1           ; 4 x FMA (4 MACs)
→ 1 cycle에 4 MACs (float32)
→ 1 cycle에 16 MACs (int8, with widening)
```

**Neural-ART NPU**:
```
Systolic Array 동작:
  - Input feature map: 16채널 동시 입력
  - Weight: 16 x 16 = 256개 weight 동시 연산
  - 한 cycle: 16 x 128 = 2,048 MACs (int8)
→ 1 cycle에 2,048 MACs (NPU 피크)
```

### 2.3 MobileNetV1 추론 시간 비교

| 항목 | Cortex-M4F @84MHz | Cortex-M85 @800MHz | Neural-ART NPU |
|------|:-----------------:|:------------------:|:--------------:|
| **MACs** | 569M | 569M | 569M |
| **MACs/cycle** | 2 | 16 | 2,048 |
| **사이클 수** | ~285M | ~36M | ~278K |
| **추론 시간** | ~3,400ms | ~45ms | ~0.7ms |
| **전력** | ~20mA @3.3V | ~150mA @1.2V | ~15mA @1.2V |
| **에너지** | ~224mJ | ~22mJ | ~0.035mJ |

> **NPU는 CPU 대비 약 64배 빠르고, 에너지는 1/640 수준입니다.**

### 2.4 언제 CPU만으로 충분한가?

| 조건 | 권장 엔진 | 이유 |
|------|----------|------|
| 모델 MACs < 10M | CPU (Helium) | NPU 초기화 오버헤드가 더 큼 |
| 실시간 요구사항 > 30fps | NPU | CPU는 22fps 한계 |
| 복잡한 제어 흐름 (if-else) | CPU | NPU는 조건부 실행 비효율 |
| 매우 작은 모델 (< 10KB) | CPU | NPU 메모리 할당 오버헤드 |
| 배터리 구동 (수 mA) | NPU | CPU 대비 1/10 전력 |
| mixed int4/int8 양자화 | NPU | NPU만 HW 지원 |

### 2.5 NPU vs CPU: 실제 애플리케이션 기준

```
애플리케이션        MACs      필요 프레임율    권장
───────────────    ─────     ─────────────    ────
키워드 검출 (KWS)    ~500K     10-50fps        CPU
제스처 인식         ~5M       15-30fps        CPU
PPG 심박 분류        ~50K     1-10fps          CPU (여유)
이미지 분류 (224)    ~400M    1-30fps          NPU
객체 탐지 (320)     ~1B       15-30fps        NPU
자세 추정           ~5B       10-30fps        NPU
```

---

## 3. STM32 Edge AI Suite 실습 (10:30-12:00)

### 3.1 ST Edge AI Core 워크플로우

```
Python Keras/TFLite/ONNX
        │
        ▼
─── ST Edge AI Core (CLI) ───
│                           │
├─ stedgeai profile         ├─ Edge AI Studio (GUI)
│     (분석 + 예측)         │
├─ stedgeai generate        │
│     (C 코드 + NPU bin)    │
├─ stedgeai benchmark       │
│     (벤치마크 실행)       │
└─ stedgeai validate        └─ Edge AI Studio (GUI)
      (정확도 검증)
        │
        ▼
STM32CubeIDE 통합
        │
        ▼
STM32N6 추론 실행
```

### 3.2 MLOps 흐름

```
[개발 PC]                         [STM32N6 보드]
─────────                       ────────────
1. Keras/TFLite 학습
2. stedgeai profile → 분석
3. stedgeai generate → NPU 변환
4. CubeIDE 프로젝트 생성
5. 변환 코드 추가
6. Build → Binary ──────────► 7. Flash via ST-Link
                                 8. UART/로그 출력
                                 9. 성능 측정 (DWT)
```

### 3.3 실습: MobileNetV1 NPU 변환

#### 3.3.1 사전 준비 - MobileNetV1 다운로드/변환

`C:\Users\Administrator\Desktop\day3_npu_training` 폴더 생성 후 `prepare_model.py`:

```python
import tensorflow as tf
import numpy as np
import os

os.makedirs("models", exist_ok=True)

print("=== MobileNetV1 준비 ===")

# 1. Keras에서 MobileNetV1 로드 (ImageNet, 224x224)
model = tf.keras.applications.MobileNetV1(
    input_shape=(224, 224, 3),
    weights="imagenet",
    classes=1000
)
model.summary()

# 2. TFLite Float32 변환
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_f32 = converter.convert()
with open("models/mobilenet_v1_f32.tflite", "wb") as f:
    f.write(tflite_f32)
print(f"Float32: {len(tflite_f32)/1024:.1f} KB")

# 3. TFLite Int8 양자화 변환
def representative_dataset():
    for _ in range(100):
        data = np.random.randn(1, 224, 224, 3).astype(np.float32)
        yield [data]

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_i8 = converter.convert()
with open("models/mobilenet_v1_i8.tflite", "wb") as f:
    f.write(tflite_i8)
print(f"Int8:     {len(tflite_i8)/1024:.1f} KB")

print("=== 준비 완료 ===")
```

```bash
cd C:\Users\Administrator\Desktop\day3_npu_training
python prepare_model.py
```

**예상 결과**:
```
Float32: 16.3 MB
Int8:     4.2 MB  (74% 감소)
```

#### 3.3.2 ST Edge AI Core 프로파일링

```bash
# STM32N6 타겟 프로파일링
stedgeai profile ^
    --model models/mobilenet_v1_i8.tflite ^
    --target stm32n6570 ^
    --output report.json

# 또는 cortex-m85 가상 타겟
stedgeai profile ^
    --model models/mobilenet_v1_i8.tflite ^
    --target cortex-m85-800mhz ^
    --output report_cpu.json
```

**출력 예시 (`report.json`)**:

```json
{
  "model": "mobilenet_v1_i8.tflite",
  "target": "stm32n6570",
  "npu_allocated": true,
  "memory": {
    "flash_code": 24576,
    "flash_weights": 4194304,
    "sram_total": 524288,
    "sram_activation": 327680,
    "sram_weights": 0
  },
  "performance": {
    "total_macs": 569000000,
    "npu_cycles": 278000,
    "cpu_cycles": 5000,
    "total_cycles": 283000,
    "inference_time_us": 708,
    "inference_time_ms": 0.708
  },
  "layers": [
    { "name": "conv1", "type": "Conv2D", "npu": true, "cycles": 12000 },
    { "name": "conv_dw_1", "type": "DepthwiseConv2D", "npu": true, "cycles": 8000 },
    ...
  ]
}
```

**CPU만 사용 시 프로파일 결과**:

| 항목 | Cortex-M85 Helium | Neural-ART NPU |
|------|:-----------------:|:--------------:|
| 총 사이클 | 35,562,500 | 283,000 |
| 추론 시간 | ~44.5 ms | ~0.71 ms |
| Flash (가중치) | 4.2 MB | 4.2 MB |
| SRAM (활성화) | ~3 MB | 512 KB (SRAM4) |

> **NPU 할당 시 추론 속도가 약 63배 향상됩니다.**

#### 3.3.3 NPU 바이너리 생성

```bash
# NPU 바이너리 생성 (자동 NPU 할당)
stedgeai generate ^
    --model models/mobilenet_v1_i8.tflite ^
    --target stm32n6570 ^
    --output gen_npu ^
    --allocate-npu  # NPU 자동 할당

# CPU 전용 (NPU 미사용)
stedgeai generate ^
    --model models/mobilenet_v1_i8.tflite ^
    --target stm32n6570 ^
    --output gen_cpu ^
    --allocate-npu=false
```

**생성된 파일 구조** (`gen_npu/`):
```
gen_npu/
├── stm32n6_network.c/h         # 네트워크 정의 (NPU + CPU 혼합)
├── stm32n6_network_data.c/h    # 가중치 데이터 (NPU 바이너리 포함)
├── stm32n6_network_config.h    # 설정 (입출력 shape, 메모리 맵)
├── stm32n6_npu_interface.c/h   # NPU 드라이버 인터페이스
├── stm32n6_network_perf.h      # 예측 성능 정보
└── middleware/                  # RTOS 통합 레이어
    ├── stm32n6_mw.c/h          # FreeRTOS/ThreadX 통합
    └── stm32n6_mw_config.h
```

### 3.4 CubeMX 프로젝트 생성

#### 3.4.1 NUCLEO-N6570 프로젝트 생성

1. **STM32CubeMX 실행**
2. **File → New Project → Board Selector**
3. 검색: `NUCLEO-N6570` → 선택 → **Start Project**
4. 자동 설정 확인:
   - CPU: 800MHz
   - HSE: 24MHz (ST-LINK 제공)
   - SRAM1-3: 3.7MB
   - SRAM4: 512KB (NPU 전용)
   - Flash: 8MB
5. **Pinout & Configuration → Software Packs → Select Components**
   - `STMicroelectronics → X-CUBE-AI` 활성화 (NPU 지원)
6. Middleware:
   - `FREERTOS` 활성화 (CMSIS_V2)
   - `THREADX` (선택, STM32N6 기본 RTOS)

#### 3.4.2 카메라 설정 (MIPI CSI-2)

1. **Pinout & Configuration → Multimedia → DCMI** (Digital Camera Interface)
   - **Mode**: `MIPI CSI-2`
   - **Pixel Clock**: `PLL outputs` → 적절한 분주비 설정
   - **Data Format**: `RGB565` 또는 `YUV422`

2. **Pinout & Configuration → Multimedia → DSI-HOST** (MIPI DSI, 디스플레이용, 선택)

3. 핀 할당 확인 (NUCLEO-N6570 + B-CAMS-IMX):
   - CSI-2 CLK: PF0, CSI-2 DATA0: PF1, CSI-2 DATA1: PF2
   - I2C (카메라 제어): PB6 (SCL), PB7 (SDA)

### 3.5 NPU 추론 코드

`Core/Src/main.c`:

```c
/* USER CODE BEGIN Includes */
#include "stm32n6_network.h"
#include "stm32n6_npu_interface.h"
#include <stdio.h>
/* USER CODE END Includes */

/* USER CODE BEGIN PV */
/* NPU 네트워크 핸들 */
static ai_handle network = AI_HANDLE_NULL;

/* 입력/출력 버퍼 (NPU 정렬 요구사항: 16바이트 정렬) */
static AI_ALIGNED(16) int8_t ai_input[AI_NETWORK_IN_1_SIZE];
static AI_ALIGNED(16) float ai_output[AI_NETWORK_OUT_1_SIZE];

/* 카메라 프레임 버퍼 (MIPI CSI-2 DMA) */
static AI_ALIGNED(32) uint8_t camera_frame[224 * 224 * 3];  // RGB888

/* 추론 통계 */
static uint32_t inference_count = 0;
static float total_inference_ms = 0.0f;
/* USER CODE END PV */

/* USER CODE BEGIN 0 */
/* 카메라 콜백 (DMA 전송 완료 시) */
void HAL_DCMI_FrameEventCallback(DCMI_HandleTypeDef *hdcmi)
{
    /* 프레임 준비 완료 → AI Task에 알림 */
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    vTaskNotifyGiveFromISR(aiTaskHandle, &xHigherPriorityTaskWoken);
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}

/* 이미지 전처리: 카메라 RAW → NPU 입력 형식 */
static void preprocess_image(uint8_t *raw, int8_t *input)
{
    /* BGR→RGB + 정규화 + int8 양자화 */
    for (int i = 0; i < 224 * 224; i++)
    {
        uint8_t r = raw[i * 3 + 2];  // Camera BGR → RGB
        uint8_t g = raw[i * 3 + 1];
        uint8_t b = raw[i * 3];

        /* ImageNet 정규화: (pixel - 128) → [-128, 127] 범위 */
        input[i * 3 + 0] = (int8_t)((int)r - 128);
        input[i * 3 + 1] = (int8_t)((int)g - 128);
        input[i * 3 + 2] = (int8_t)((int)b - 128);
    }
}
/* USER CODE END 0 */
```

#### AI Task (FreeRTOS)

```c
/* USER CODE BEGIN 1 */
/* AI 추론 Task */
void AITask(void *argument)
{
    ai_error err;

    /* NPU 초기화 */
    err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
    if (err.type != AI_ERROR_NONE) {
        printf("AI: Network create error %d\r\n", err.code);
        while (1);
    }

    err = ai_network_init(network, NULL);
    if (err.type != AI_ERROR_NONE) {
        printf("AI: Network init error %d\r\n", err.code);
        while (1);
    }

    printf("AI: NPU initialized (max %d classes)\r\n", AI_NETWORK_OUT_1_SIZE);

    while (1)
    {
        /* 카메라 프레임 준비 완료 대기 */
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

        /* 이미지 전처리 */
        preprocess_image(camera_frame, ai_input);

        /* NPU 추론 실행 */
        ai_buffer input_buff = ai_network_inputs_get(network, NULL);
        ai_buffer output_buff = ai_network_outputs_get(network, NULL);
        input_buff.data = AI_HANDLE_PTR(&ai_input);
        output_buff.data = AI_HANDLE_PTR(&ai_output);

        /* DWT 타이머 시작 */
        DWT_Init();
        uint32_t t0 = DWT_GetCycles();

        ai_i32 batch = ai_network_run(network, &input_buff, &output_buff);

        uint32_t cycles = DWT_GetCycles() - t0;
        float ms = (float)cycles / 800e6f * 1000.0f;

        if (batch == 1)
        {
            inference_count++;
            total_inference_ms += ms;

            /* Top-5 결과 출력 */
            int top5[5] = {0};
            float top5_prob[5] = {0};
            for (int i = 0; i < AI_NETWORK_OUT_1_SIZE; i++)
            {
                for (int j = 0; j < 5; j++)
                {
                    if (ai_output[i] > top5_prob[j])
                    {
                        for (int k = 4; k > j; k--)
                        {
                            top5[k] = top5[k - 1];
                            top5_prob[k] = top5_prob[k - 1];
                        }
                        top5[j] = i;
                        top5_prob[j] = ai_output[i];
                        break;
                    }
                }
            }

            printf("[%lu] Inference: %.3f ms (avg %.3f ms)\r\n",
                   inference_count, ms,
                   total_inference_ms / inference_count);
            printf("  Top-5:\r\n");
            for (int i = 0; i < 5; i++)
            {
                printf("  %d. class %d: %.1f%%\r\n",
                       i + 1, top5[i], top5_prob[i] * 100.0f);
            }
        }
        else
        {
            printf("AI: Inference failed (batch=%ld)\r\n", batch);
        }
    }
}
/* USER CODE END 1 */
```

#### main() 함수

```c
/* USER CODE BEGIN 2 */
  /* DWT 타이머 초기화 */
  DWT_Init();

  /* 카메라 초기화 (MIPI CSI-2) */
  BSP_CAMERA_Init(CAMERA_R654, CAMERA_RGB888, 224, 224);
  BSP_CAMERA_Start(CAMERA_R654, camera_frame, CAMERA_FRAME_RGB888);

  /* DMA 연속 전송 모드 */
  HAL_DCMI_Start_DMA(&hdcmi, DCMI_MODE_CONTINUOUS,
                     (uint32_t)camera_frame, 224 * 224 * 3);

  /* FreeRTOS 태스크 생성 */
  osThreadAttr_t ai_attr = {
      .name = "AITask",
      .stack_size = 4096,    /* 16KB - NPU 드라이버 호출 깊음 */
      .priority = osPriorityNormal,
  };
  aiTaskHandle = osThreadNew(AITask, NULL, &ai_attr);

  printf("STM32N6 + NPU: System ready!\r\n");
  printf("Camera: 224x224 RGB888, MIPI CSI-2\r\n");
  printf("NPU: Neural-ART, max %d classes\r\n", AI_NETWORK_OUT_1_SIZE);
/* USER CODE END 2 */
```

### 3.6 빌드 및 실행

1. **CubeMX → Generate Code** → CubeIDE 프로젝트 생성
2. **Project → Build All (Ctrl+B)**
3. **Run → Run (F11)** → ST-LINK로 플래싱
4. 시리얼 모니터 (115200 baud) 출력 확인:

```
STM32N6 + NPU: System ready!
Camera: 224x224 RGB888, MIPI CSI-2
NPU: Neural-ART, max 1000 classes

[1] Inference: 0.724 ms (avg 0.724 ms)
  Top-5:
  1. class 282: 85.3%   (tiger cat)
  2. class 285: 7.1%    (Egyptian cat)
  3. class 281: 3.2%    (tabby cat)
  4. class 283: 2.1%    (Persian cat)
  5. class 287: 0.8%    (lynx)

[2] Inference: 0.708 ms (avg 0.716 ms)
  Top-5:
  1. class 282: 91.2%   (tiger cat)
  ...
```

> **약 0.7ms = 1,400fps!** 이는 STM32N6 NPU의 실시간 추론 능력을 보여줍니다.

---

## 4. 실시간 객체 탐지 실습 (13:00-14:00)

### 4.1 FOMO 모델 개요

FOMO (Faster Objects, More Objects)는 Edge Impulse가 개발한 경량 객체 탐지 알고리즘입니다.

| 항목 | MobileNetV1 SSD | FOMO (MobileNetV1 backbone) |
|------|:--------------:|:--------------------------:|
| **출력** | 바운딩 박스 (x,y,w,h) | 그리드 셀 존재 확률 |
| **MACs** | ~1.2B | ~400M |
| **모델 크기** | ~8 MB | ~2.5 MB |
| **추론 시간 (NPU)** | ~1.5 ms | ~0.5 ms |
| **정확도 (mAP)** | 높음 | 중간 (경량 응용에 충분) |
| **출력 개수** | 가변 (NMS 필요) | 고정 그리드 |

**FOMO 동작 원리**:
```
입력 이미지 (160x120)
    │
    ▼
MobileNetV1 backbone
    │
    ▼
출층 그리드 (20x15 = 300 셀)
    │
    ▼
각 셀: [존재확률, 클래스1, 클래스2, ...]
    │
    ▼
임계값(0.5) 이상 셀만 출력
```

### 4.2 Edge Impulse로 FOMO 모델 학습

#### 4.2.1 Edge Impulse 프로젝트 생성

1. https://edgeimpulse.com 로그인
2. **Create new project** → 이름: `STM32N6_FOMO_Detection`
3. **Labeling method**: `Object Detection (Bounding boxes)`

#### 4.2.2 데이터 수집 (CSV 형식)

`C:\Users\Administrator\Desktop\day3_fomo\generate_fomo_data.py`:

```python
import numpy as np
import cv2
import os

os.makedirs("dataset/images", exist_ok=True)
os.makedirs("dataset/labels", exist_ok=True)

W, H = 160, 120
NUM_IMAGES = 200


def draw_random_object(img, obj_id):
    """랜덤 위치에 사각형 객체 생성"""
    x = np.random.randint(10, W - 40)
    y = np.random.randint(10, H - 40)
    w = np.random.randint(20, 40)
    h = np.random.randint(20, 40)

    colors = [(0, 0, 255), (0, 255, 0)]
    color = colors[obj_id]

    cv2.rectangle(img, (x, y), (x + w, y + h), color, -1)
    # 테두리
    cv2.rectangle(img, (x, y), (x + w, y + h), (255, 255, 255), 1)

    return img, [x, y, x + w, y + h, obj_id]


for i in range(NUM_IMAGES):
    img = np.random.randint(0, 64, (H, W, 3), dtype=np.uint8)

    num_objs = np.random.randint(0, 4)
    labels = []
    for _ in range(num_objs):
        obj_id = np.random.randint(0, 2)
        img, bbox = draw_random_object(img, obj_id)
        labels.append(bbox)

    cv2.imwrite(f"dataset/images/frame_{i:04d}.jpg", img)

    # YOLO 형식 라벨
    with open(f"dataset/labels/frame_{i:04d}.txt", "w") as f:
        for bbox in labels:
            x1, y1, x2, y2, obj_id = bbox
            # Edge Impulse 형식: label x_center y_center width height
            x_c = (x1 + x2) / 2 / W
            y_c = (y1 + y2) / 2 / H
            bw = (x2 - x1) / W
            bh = (y2 - y1) / H
            f.write(f"{obj_id} {x_c:.6f} {y_c:.6f} {bw:.6f} {bh:.6f}\n")

print(f"생성 완료: {NUM_IMAGES}개 이미지")
```

#### 4.2.3 Edge Impulse에서 학습

1. **Dashboard → Upload data** → 이미지 업로드 (CSV 형식)
2. **Impulse design**:
   - `Image` block: `160x120` resize
   - `Object Detection` block: `FOMO (MobileNetV1 0.35)` 선택
3. **Generate features**
4. **Object Detection** 학습:
   - Epochs: `60`
   - Learning rate: `0.001`
   - **Start training**
5. **Model testing** → 정확도 확인 (mAP > 80% 목표)

### 4.3 ST Edge AI Core로 NPU 변환

#### 4.3.1 Edge Impulse → TFLite 다운로드

1. Edge Impulse → **Deployment** 탭
2. **Build firmware → TensorFlow Lite (int8 quantized)** 선택
3. 다운로드: `stm32n6_fomo_model.zip`
4. 압축 해제 → `tflite-model/` 폴더 확인

#### 4.3.2 NPU 변환

```bash
stedgeai profile ^
    --model stm32n6_fomo_model.zip/tflite-model/model.tflite ^
    --target stm32n6570 ^
    --output fomo_report.json

stedgeai generate ^
    --model stm32n6_fomo_model.zip/tflite-model/model.tflite ^
    --target stm32n6570 ^
    --output gen_fomo_npu ^
    --allocate-npu
```

**FOMO NPU 프로파일**:
```json
{
  "model": "fomo_mobilenetv1_035",
  "target": "stm32n6570",
  "npu_allocated": true,
  "performance": {
    "inference_time_us": 480,
    "total_macs": 285000000,
    "npu_cycles": 192000
  },
  "memory": {
    "flash_code": 12288,
    "flash_weights": 2516582,
    "sram_activation": 163840
  }
}
```

### 4.4 FOMO 결과 처리 코드

```c
/* USER CODE BEGIN Includes */
#include "stm32n6_network.h"
#include "stm32n6_npu_interface.h"
/* USER CODE END Includes */

/* USER CODE BEGIN PV */
#define FOMO_GRID_W   20    // 160 / 8
#define FOMO_GRID_H   15    // 120 / 8
#define FOMO_CLASSES  2
#define FOMO_THRESHOLD 0.5f

typedef struct {
    uint16_t x, y;           // 그리드 셀 좌표
    uint8_t  class_id;
    float    confidence;
} FomoDetection;

static FomoDetection detections[FOMO_GRID_W * FOMO_GRID_H];
static uint16_t detection_count = 0;
/* USER CODE END PV */

/* USER CODE BEGIN 0 */
/* FOMO 후처리: NPU 출력 → 바운딩 박스 */
static void postprocess_fomo(float *output, int output_size)
{
    detection_count = 0;
    float *grid = output;  // shape: (300, 2) = 20x15x2

    for (int row = 0; row < FOMO_GRID_H; row++)
    {
        for (int col = 0; col < FOMO_GRID_W; col++)
        {
            int idx = (row * FOMO_GRID_W + col) * FOMO_CLASSES;

            for (int c = 0; c < FOMO_CLASSES; c++)
            {
                float prob = grid[idx + c];
                if (prob > FOMO_THRESHOLD)
                {
                    detections[detection_count].x = col;
                    detections[detection_count].y = row;
                    detections[detection_count].class_id = c;
                    detections[detection_count].confidence = prob;
                    detection_count++;
                }
            }
        }
    }
}

/* UART로 탐지 결과 출력 (JSON 형식) */
static void print_detections(void)
{
    printf("{\"detections\": %d, \"objects\": [\r\n", detection_count);
    for (int i = 0; i < detection_count; i++)
    {
        printf("  {\"x\":%d,\"y\":%d,\"class\":%d,\"conf\":%.2f}%s\r\n",
               detections[i].x, detections[i].y,
               detections[i].class_id, detections[i].confidence,
               (i < detection_count - 1) ? "," : "");
    }
    printf("]}\r\n");
}
/* USER CODE END 0 */
```

#### AI Task (FOMO 버전)

```c
void AITask(void *argument)
{
    ai_error err;

    err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
    if (err.type != AI_ERROR_NONE) while (1);
    ai_network_init(network, NULL);

    printf("FOMO Detector ready (%dx%d grid, %d classes)\r\n",
           FOMO_GRID_W, FOMO_GRID_H, FOMO_CLASSES);

    while (1)
    {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

        /* 카메라 → NPU 입력 전처리 (160x120 RGB) */
        BSP_CAMERA_Snapshot(CAMERA_R654, camera_frame, CAMERA_FRAME_RGB888);
        preprocess_image(camera_frame, ai_input);

        /* NPU 추론 */
        uint32_t t0 = DWT_GetCycles();

        ai_buffer in = ai_network_inputs_get(network, NULL);
        ai_buffer out = ai_network_outputs_get(network, NULL);
        in.data = AI_HANDLE_PTR(&ai_input);
        out.data = AI_HANDLE_PTR(&ai_output);
        ai_network_run(network, &in, &out);

        uint32_t cycles = DWT_GetCycles() - t0;
        float ms = (float)cycles / 800e6f * 1000.0f;

        /* FOMO 후처리 */
        postprocess_fomo(ai_output, AI_NETWORK_OUT_1_SIZE);

        /* 결과 출력 */
        printf("FOMO: %.3f ms, %d objects\r\n", ms, detection_count);
        if (detection_count > 0)
        {
            print_detections();
        }
    }
}
```

### 4.5 결과 확인

시리얼 모니터 출력 예시:
```
FOMO: 0.512 ms, 3 objects
{"detections": 3, "objects": [
  {"x":5,"y":3,"class":0,"conf":0.92},
  {"x":12,"y":8,"class":1,"conf":0.87},
  {"x":18,"y":12,"class":0,"conf":0.76}
]}
```

> **FOMO는 0.5ms 만에 최대 300개 그리드 셀에서 객체 존재 여부를 탐지합니다.**

---

## 5. NPU 성능 튜닝 (14:00-15:00)

### 5.1 메모리 배치 최적화

#### 5.1.1 SRAM4 (NPU 전용) 활용

```
메모리 배치 전 (비효율):
  SRAM1~3 (CPU data + NPU scratch) → CPU-NPU 경합 발생
  SRAM4   (미사용)

메모리 배치 후 (최적):
  SRAM1~3 (CPU data: 256KB, 스택: 64KB, Heap: 64KB)
  SRAM4   (NPU scratch buffer: 512KB 전용)
  외부 메모리 (입력 이미지 버퍼: 160x120x3 = 57.6KB)
```

CubeMX에서 메모리 배치:
```
Project Manager → Advanced Settings:
  SRAM1: 0x20000000, Size: 0x40000 (256KB) → CPU 전용
  SRAM2: 0x20040000, Size: 0x40000 (256KB) → CPU 전용
  SRAM3: 0x20080000, Size: 0x20000 (128KB) → CPU 전용
  SRAM4: 0x20400000, Size: 0x80000 (512KB) → NPU 전용 (링커 스크립트에서 제외)
```

**링커 스크립트 수정** (`STM32N6570_FLASH.ld`):
```ld
/* SRAM4를 NPU 전용 영역으로 분리 */
MEMORY
{
    FLASH     (rx)  : ORIGIN = 0x10000000, LENGTH = 8M
    SRAM1     (rwx) : ORIGIN = 0x20000000, LENGTH = 256K
    SRAM2     (rwx) : ORIGIN = 0x20040000, LENGTH = 256K
    SRAM3     (rwx) : ORIGIN = 0x20080000, LENGTH = 128K
    SRAM4_NPU (rw)  : ORIGIN = 0x20400000, LENGTH = 512K  /* NPU 전용 - .bss/.data에서 제외 */
}

/* NPU 워크 버퍼를 SRAM4에 배치 */
.npu_buffer (NOLOAD) :
{
    *(.npu_buffer)
} > SRAM4_NPU
```

**C 코드에서 NPU 버퍼 지정**:
```c
/* SRAM4에 배치될 NPU 워크 버퍼 */
__attribute__((section(".npu_buffer"), aligned(64)))
static uint8_t npu_scratch_buffer[512 * 1024];
```

#### 5.1.2 가중치 배치

| 저장 위치 | 크기 | 접근 속도 | 적합 |
|----------|------|----------|------|
| 내부 Flash | 8MB | 느림 (CPU wait-state) | 자주 안 바뀌는 가중치 |
| 외부 Octo-SPI Flash | 64MB | 보통 (메모리 매핑) | 큰 모델 (ResNet 등) |
| HyperRAM | 64MB | 빠름 (CPU 직접 접근) | 실시간 업데이트 필요한 모델 |

**권장 구성**:
```bash
# 대용량 외부 Flash 활용
stedgeai generate ^
    --model large_model.tflite ^
    --target stm32n6570 ^
    --output gen_external ^
    --allocate-npu ^
    --memory external-flash  # 가중치를 외부 Flash에 배치
```

### 5.2 NPU-CPU 파이프라인 분할

#### 5.2.1 전처리를 CPU에 위임

NPU가 효율적으로 처리하지 못하는 연산은 CPU에 할당:

| 연산 | NPU | CPU | 이유 |
|------|:---:|:---:|------|
| Conv2D (3x3, stride 2) | O | - | NPU 최적화 |
| DepthwiseConv2D | O | - | NPU 전용 가속 |
| Resize (bilinear) | - | O | NPU 미지원 |
| Color space 변환 | - | O | 단순 연산, CPU 적합 |
| Sort (Top-K) | - | O | 제어 흐름 필요 |
| Softmax | O | O | NPU에서 더 빠름 |
| Concatenate | O | - | 메모리 대역폭 중요 |

**CPU 전처리 예제**:
```c
/* CPU에서만 수행하는 전처리 (NPU 할당 불가) */
static void preprocess_cpu(uint8_t *raw, int8_t *output)
{
    /* 1. 색상 변환: YUV → RGB (CPU 전용) */
    /* 2. 리사이즈: 320x240 → 224x224 (CPU 전용) */
    /* 3. 정규화: uint8 → int8 (SIMD 가속 가능) */
    for (int i = 0; i < 224 * 224 * 3; i++)
    {
        output[i] = (int8_t)((int)raw[i] - 128);
    }
}
```

#### 5.2.2 CPU-NPU 이중 파이프라인

```c
void PipelineTask(void *argument)
{
    while (1)
    {
        /* 1. 카메라 캡처 (DMA, CPU 개입 없음) */
        HAL_DCMI_Start_DMA(&hdcmi, DCMI_MODE_CONTINUOUS,
                           (uint32_t)frame_buffer, sizeof(frame_buffer));

        /* 2. CPU 전처리 (전처리가 완료될 때까지 NPU 대기) */
        preprocess_cpu(frame_buffer, npu_input);

        /* 3. NPU 추론 (비동기 실행) */
        NPU_Start(network, npu_input, npu_output);

        /* 4. CPU 후처리 + NPU 추론 동시 실행 (이중 파이프라인) */
        while (NPU_IsBusy())
        {
            /* NPU가 추론하는 동안 CPU는 이전 결과 후처리 */
            if (previous_output_ready)
            {
                postprocess_cpu(prev_output);
                send_result_uart(prev_result);
                previous_output_ready = 0;
            }
        }

        /* 5. NPU 완료 → 결과 복사 */
        NPU_GetResult(network, npu_output);
        memcpy(prev_output, npu_output, sizeof(prev_output));
        previous_output_ready = 1;
    }
}
```

**파이프라인 타이밍 다이어그램**:
```
단일 실행 (non-pipelined):
  |---Preprocess---|---NPU Inference---|---Postprocess---|
  60fps = 16.6ms → Pre 2ms + NPU 1ms + Post 0.5ms = 3.5ms (여유)

이중 파이프라인:
  |---Preprocess---|---NPU Inference---|---Postprocess---|
                    |---Preprocess---|---NPU Inference---|---Postprocess---|
  → Frame N의 NPU 실행 중 Frame N+1 전처리 → 추가 속도 향상
```

### 5.3 전력-성능 트레이드오프

#### 5.3.1 NPU 클럭 조정

```bash
# NPU 클럭 400MHz (기본)
stedgeai generate --model model.tflite --target stm32n6570 --npu-clock 400

# NPU 클럭 200MHz (절전 모드)
stedgeai generate --model model.tflite --target stm32n6570 --npu-clock 200
```

**클럭별 성능**:
| NPU 클럭 | 추론 시간 | 전력 | 에너지/추론 |
|----------|:---------:|:----:|:----------:|
| 400MHz | 0.71 ms | 52 mW | 37 μJ |
| 300MHz | 0.95 ms | 41 mW | 39 μJ |
| 200MHz | 1.42 ms | 30 mW | 43 μJ |
| 100MHz | 2.84 ms | 19 mW | 54 μJ |

> **400MHz → 100MHz: 속도 4배 느려지지만, 전력 2.7배 절감**

#### 5.3.2 Sleep 모드 활용

```c
/* 추론 완료 후 CPU Deep Sleep */
void AITask(void *argument)
{
    while (1)
    {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);  // 이벤트 대기 (Sleep)

        /* 짧은 burst 연산 */
        preprocess_cpu(frame_buffer, npu_input);
        NPU_Start(network, npu_input, npu_output);
        NPU_Wait();  // NPU가 연산하는 동안 CPU는 Sleep
        postprocess(npu_output);

        /* 다시 Sleep (OS Tick만 활성) */
        osDelay(pdMS_TO_TICKS(33));  // 30fps
    }
}
```

**전력 소모 상태**:
| 모드 | 전류 | 전력 (@1.2V 코어) | 비고 |
|------|:----:|:----------------:|------|
| Run (800MHz + NPU) | ~200mA | 240mW | 최대 성능 |
| Run (800MHz only) | ~80mA | 96mW | NPU 끔 |
| Sleep (WFI) | ~10mA | 12mW | CPU 클럭 정지 |
| Deep Stop | ~200μA | 240μW | SRAM 유지 |
| Standby | ~100nA | 120nW | RTC만 동작 |

### 5.4 프로파일링

#### 5.4.1 DWT 사이클 카운터

```c
static volatile uint32_t *DWT_CYCCNT  = (uint32_t *)0xE0001004;
static volatile uint32_t *DWT_CONTROL = (uint32_t *)0xE0001000;
static volatile uint32_t *SCB_DEMCR   = (uint32_t *)0xE000EDFC;

void DWT_Init(void)
{
    *SCB_DEMCR |= (1 << 24);  // TRCENA
    *DWT_CONTROL |= 1;        // CYCCNT enable
}

/* NPU + CPU 전체 시간 측정 */
uint32_t t0 = DWT_GetCycles();
ai_network_run(network, &input_buff, &output_buff);
uint32_t total = DWT_GetCycles() - t0;

/* 개별 레이어 시간 (NPU는 내부 레지스터로 측정) */
printf("Total: %lu cycles (%.3f ms)\r\n", total,
       (float)total / 800e6f * 1000.0f);
```

#### 5.4.2 ST Edge AI Studio 프로파일러

GUI 모드에서:
1. ST Edge AI Studio 실행
2. 모델 로드 → **Performance** 탭
3. **Run on board** (STM32N6 연결 필요)
4. 레이어별 NPU/CPU 할당 및 사이클 확인

**프로파일러 출력 예시**:
```
Layer-by-layer breakdown:
  conv1:       12,340 cycles (NPU)  ✓
  conv_dw_1:    8,210 cycles (NPU)  ✓
  conv_pw_1:   15,432 cycles (NPU)  ✓
  ...
  reshape:        120 cycles (CPU)  ← 작은 연산은 CPU가 효율적
  softmax:        890 cycles (NPU)  ✓
                              ─────
  Total:       283,000 cycles (0.71ms @ 400MHz)
```

### 5.5 최적화 체크리스트

| 항목 | 설명 | 확인 |
|------|------|:----:|
| **NPU 할당률** | 레이어의 95% 이상이 NPU에 할당되어야 함 | `stedgeai report` |
| **SRAM4 전용** | NPU scratch는 SRAM4(512KB)에 격리 | 링커 스크립트 |
| **DMA 전송** | CPU 개입 없는 DMA 기반 데이터 이동 | CubeMX DMA 설정 |
| **파이프라인** | NPU 추론 + CPU 후처리 동시 실행 | 이중 버퍼 |
| **데이터 타입** | int8 양자화 (NPU 최적) | TFLite 변환 시 |
| **입출력 정렬** | 16바이트 정렬 (NPU 요구사항) | `AI_ALIGNED(16)` |
| **전처리 최적화** | Helium SIMD로 전처리 가속 | MVE intrinsics |
| **Sleep 활용** | 유휴 시간에 CPU Sleep | WFI 명령어 |

---

## 6. 종합 프로젝트 + Q&A (15:00-16:00)

### 6.1 3일간 학습 내용 복습

#### 보드별 특징 비교

| 항목 | ESP32 (1일차) | STM32F411 (2일차) | STM32N6 (3일차) |
|------|:------------:|:-----------------:|:--------------:|
| **CPU** | Xtensa LX6 240MHz | Cortex-M4 84MHz | Cortex-M85 800MHz |
| **NPU** | 없음 | 없음 | Neural-ART 600 GOPS |
| **SRAM** | 320KB | 128KB | 4.2MB |
| **Flash** | 4MB | 512KB | 8MB |
| **추론 엔진** | TFLite Micro / ESP-DL | X-Cube-AI / CMSIS-NN | ST Edge AI Core / NPU SDK |
| **MNIST 추론** | ~300-500ms | ~50-100ms | ~0.05ms (NPU) |
| **MobileNetV1** | 불가 (SRAM 부족) | 불가 (SRAM 부족) | ~0.7ms (NPU) |
| **전력 소모** | ~80mA | ~50mA | ~200mA (NPU ON) |
| **가격 (보드)** | ~$7 (ESP32-CAM) | ~$14 (NUCLEO) | ~$50 (NUCLEO) |
| **개발 난이도** | 하 | 중 | 중상 |
| **무선 통신** | WiFi/Bluetooth 내장 | 외장 필요 | 외장 필요 |

#### 모델 크기 제약 비교

```
ESP32 (SRAM 320KB):
  ┌─────────────────────────────────────────┐
  │ OS + Stack: 80KB    │ Model Arena: 240KB │
  └─────────────────────────────────────────┘
  → 모델: < 100KB (Int8 MNIST)만 가능

STM32F411 (SRAM 128KB):
  ┌──────────────────────┐
  │ OS: 40KB │ Arena: 80KB │
  └──────────────────────┘
  → 모델: < 50KB (초경량 DNN)만 가능

STM32N6 (SRAM 4.2MB):
  ┌──────────────────────────────────────────────┐
  │ OS: 256KB │ CPU Data: 512KB │ NPU Arena: 3.4MB │
  └──────────────────────────────────────────────┘
  → 모델: < 3MB (MobileNetV1, FOMO 등) 가능
```

#### 배포 전략 의사 결정

```
[문제 정의]
    │
    ├─ 무선 통신 필요한가?
    │   YES → ESP32 (WiFi 내장)
    │   NO  → STM32 계열
    │
    ├─ 모델 크기 > 100KB?
    │   YES → STM32N6 (NPU 필요)
    │   NO  → STM32F411 (CPU로 충분)
    │
    ├─ 실시간성 < 10ms 필요한가?
    │   YES → STM32N6 (NPU 가속)
    │   NO  → STM32F411 충분
    │
    ├─ 배터리 수명 중요한가?
    │   YES → STM32F411 (저전력) 또는 STM32N6 (NPU Sleep)
    │   NO  → 성능 우선 (선택 자유)
    │
    └─ 최종 결정:
        ESP32      → WiFi + 초경량 모델
        STM32F411  → 유선 + 중간 모델
        STM32N6    → 고성능 + 실시간 추론
```

### 6.2 실전 팁

#### 프로덕션 코드 작성 시 주의사항

```c
/* ❌ 잘못된 코드: 매 추론마다 create/delete */
while (1) {
    ai_network_create(&net, AI_NETWORK_DATA_CONFIG);
    ai_network_init(net, NULL);
    ai_network_run(net, &in, &out);
    ai_network_delete(net);
}
// → NPU 재초기화 오버헤드: ~5ms 손실

/* ✅ 올바른 코드: 한 번 초기화, 반복 추론 */
ai_network_create(&net, AI_NETWORK_DATA_CONFIG);
ai_network_init(net, NULL);
while (1) {
    ai_network_run(net, &in, &out);
}
// → 추론만: ~0.7ms
```

```c
/* ❌ 잘못된 코드: HAL_Delay()로 CPU 블로킹 */
while (1) {
    ai_network_run(net, &in, &out);
    HAL_Delay(33);  // 30fps → 33ms 동안 CPU 낭비
}

/* ✅ 올바른 코드: FreeRTOS로 CPU 효율적 사용 */
while (1) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);  // 이벤트 대기 (Sleep)
    ai_network_run(net, &in, &out);
}
// → CPU가 Sleep 상태로 전력 절감
```

#### NPU 드라이버 에러 처리

```c
ai_error err = ai_network_create(&network, AI_NETWORK_DATA_CONFIG);
if (err.type != AI_ERROR_NONE) {
    switch (err.code) {
        case AI_ERROR_OUT_OF_MEMORY:
            printf("NPU OOM: SRAM4 insufficient!\r\n");
            // → SRAM4 버퍼 크기 줄이거나 외부 메모리 사용
            break;
        case AI_ERROR_INVALID_MODEL:
            printf("NPU: Invalid model format!\r\n");
            // → 재변환 필요
            break;
        case AI_ERROR_NPU_UNAVAILABLE:
            printf("NPU: Hardware not found!\r\n");
            // → CPU fallback 모드로 전환
            break;
        default:
            printf("NPU Error: type=%d, code=%d\r\n",
                   err.type, err.code);
            break;
    }
}
```

### 6.3 추가 학습 로드맵

| 단계 | 주제 | 내용 | 예상 시간 |
|:----:|------|------|:---------:|
| 1 | **TinyML 기초 완성** | 3일차 복습, 자체 데이터로 모델 학습→배포 | 1주 |
| 2 | **고급 양자화** | int4/integer-only/float16 mixed precision | 1주 |
| 3 | **NPU 심화** | Neural-ART SDK 직접 제어, 사용자 정의 연산 | 2주 |
| 4 | **멀티 모달** | Vision + Audio + IMU 융합 추론 | 2주 |
| 5 | **RTOS 심화** | ThreadX/FreeRTOS 고급 (event groups, mutex, timers) | 1주 |
| 6 | **프로덕션** | OTA 업데이트, 모델 버전 관리, 에지 로깅 | 2주 |
| 7 | **NPU 클러스터** | 다중 NPU 활용, 모델 병렬화 | 4주 |

#### 추천 도서

| 도서 | 저자 | 난이도 | 초점 |
|------|------|:----:|------|
| TinyML: ML with TFLite on Arduino | Pete Warden | 입문 | TFLite Micro 기초 |
| TinyML Cookbook | Gian Marco Iodice | 중급 | 실제 구현 예제 |
| AI at the Edge | Daniel Situnayake | 중급 | Edge Impulse + 프로덕션 |
| Embedded Deep Learning | Hayssam | 고급 | MCU 최적화 심화 |

#### 유용한 GitHub 저장소

| 저장소 | 설명 |
|--------|------|
| https://github.com/tensorflow/tflite-micro | TFLite Micro 공식 |
| https://github.com/ARM-software/CMSIS-NN | ARM CMSIS-NN 라이브러리 |
| https://github.com/edgeimpulse/example-standalone-inferencing | Edge Impulse 독립 추론 예제 |
| https://github.com/espressif/esp-dl | ESP32 딥러닝 라이브러리 |
| https://github.com/STMicroelectronics/STM32CubeAI | STM32Cube.AI 공식 |

---

## 부록 A: STM32N6 메모리 맵 상세

```
주소                크기      영역            용도
───────────────    ─────    ─────────      ─────────────────
0x0000_0000        256KB    Boot ROM       시스템 부트로더
0x1000_0000         8MB     Flash          사용자 코드 + 가중치
0x2000_0000        256KB    SRAM1          CPU 데이터 (D-TCM)
0x2004_0000        256KB    SRAM2          CPU 데이터
0x2008_0000        128KB    SRAM3          CPU 데이터 (Ethernet 등)
0x2010_0000       2064KB    SRAM5-8        CPU 데이터 (그래픽 버퍼)
0x2040_0000        512KB    SRAM4          NPU 전용 워크 버퍼
0x6000_0000        256MB    외부 메모리    Octo-SPI / HyperRAM
0xA000_0000        256MB    외부 메모리    NAND / NOR Flash
0xC000_0000         32KB    백업 SRAM      저전력 데이터 유지
```

## 부록 B: NPU 명령어 파이프라인

```
Neural-ART NPU 명령어 체인:

LOAD_WEIGHT:  외부 메모리 → NPU weight buffer
    │
LOAD_FMAP:    SRAM → NPU input buffer
    │
COMPUTE:      MAC Array 연산 (Conv2D/FC)
    │
ACTIVATE:     Activation function (ReLU/Sigmoid)
    │
POOL:         Max/Average Pooling
    │
STORE_FMAP:   NPU output buffer → SRAM
    │
    └─── chain next layer ────→

CPU는 단일 `ai_network_run()` 호출로 전체 체인 실행
```

## 부록 C: 자주 발생하는 문제와 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| `NPU OOM` | SRAM4 부족 | `--memory external-flash` 옵션 사용 |
| `Invalid model` | TFLite ops 미지원 | Edge AI Suite로 호환 ops 확인 |
| `HardFault` | 버퍼 정렬 미준수 | `AI_ALIGNED(16)` 또는 `AI_ALIGNED(64)` 추가 |
| 추론 결과 0만 출력 | 입력 정규화 오류 | int8 입력값이 [-128, 127] 범위인지 확인 |
| 카메라 안 잡힘 | MIPI CSI-2 설정 오류 | PLL 클럭, 데이터 레인 수 확인 |
| 추론 시간 비정상 | NPU 미할당 (CPU fallback) | `--allocate-npu=true` 확인 |
| Flash 부족 | 가중치가 내부 Flash 초과 | 외부 Octo-SPI Flash로 변경 |
| UART 출력 없음 | VCP 드라이버 미설치 | ST-LINK 드라이버 재설치 |

---

> **수고하셨습니다!** 3일간의 임베디드 머신러닝 교육이 완료되었습니다.<br>
> ESP32 (TFLite Micro) → STM32F411 (X-Cube-AI + CMSIS-NN) → STM32N6 (Neural-ART NPU)까지<br>
> MCU ML의 전체 스펙트럼을 학습했습니다. 실제 프로젝트에 적용해보세요!
