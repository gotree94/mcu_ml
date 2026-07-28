# MCU OS & ML 생태계 현황 (2026년 기준)

## Mbed OS EOL 상황

Arm은 2024년 7월 Mbed OS EOL을 발표했고, **2026년 7월** 웹사이트 아카이브 및 온라인 도구 지원이 종료됩니다.

- 커뮤니티 포크인 **[Mbed CE](https://github.com/mbed-ce)** (Community Edition)가 활발히 유지되고 있습니다.
- Mbed TLS는 [TrustedFirmware](https://www.trustedfirmware.org/) 프로젝트의 일부로 계속 지원됩니다.
- 기존 프로젝트는 Mbed CLI 기반으로 계속 빌드 가능하나, Arm 공식 지원은 중단됩니다.

---

## 주요 MCU 벤더별 OS & ML 지원

| 벤더 | 주요 RTOS 지원 | ML/AI 프레임워크 |
|---|---|---|
| **STMicroelectronics** | Azure RTOS, FreeRTOS, Zephyr (최근 지원 추가) | **STM32Cube AI Studio (X-CUBE-AI)**, NanoEdge AI Studio, STM32 Edge AI Suite, STM32N6 (Neural-ART NPU 내장) |
| **NXP** | FreeRTOS, Azure RTOS, Zephyr (Platinum member) | eIQ (TFLite for MCU, Glow, DeepViewRT) |
| **Renesas** | FreeRTOS, Azure RTOS, Zephyr (Platinum member) | Reality AI Tools, RUHMI 프레임워크 (TFLite, PyTorch, ONNX) |
| **Infineon** | FreeRTOS, Zephyr | ModusToolbox ML + DEEPCRAFT AI Suite, PSoC Edge (Cortex-M55/M33 + NPU) |
| **Nordic Semiconductor** | Zephyr (nRF Connect SDK) | Neuton (초소형 ML), Axon NPU (내장 AI 가속기) |
| **Espressif** | ESP-IDF (FreeRTOS 기반) | ESP-DL, ESP-SR (음성인식), TFLite for MCU |
| **Microchip** | FreeRTOS, Zephyr (Silver member) | VectorBlox 3.0 NPU 가속기 SDK |
| **Texas Instruments** | TI-RTOS, FreeRTOS | Tiny ML Tensorlab (40+ MCU, TFLite 기반) |

---

## 벤더별 상세 정보

### STMicroelectronics

- **STM32N6 시리즈**: Arm Cortex-M85 (800MHz) + Neural-ART Accelerator (NPU) 탑재, 최초의 AI 내장 STM32 MCU
- **[STM32 Edge AI Suite](https://www.st.com/content/st_com/en/st-edge-ai-suite.html)**: TFLite, Keras, ONNX 모델 지원
- **X-CUBE-AI**: STM32CubeMX 내 Neural Network 변환 도구
- **RTOS**: [Azure RTOS + STM32Cube](https://wiki.st.com/stm32mcu/wiki/Introduction_to_Azure_RTOS_with_STM32) 통합, Zephyr 지원 추가
- **Zephyr 개발 환경**: [공식 문서](https://docs.zephyrproject.org/latest/develop/tools/stm32cubeide.html) / [GitHub 소스](https://github.com/zephyrproject-rtos/zephyr/blob/main/doc/develop/tools/stm32cubeide.rst) — STM32CubeIDE에서 Zephyr 애플리케이션 빌드 지원

### NXP

- **eIQ ML 환경**: i.MX RT 크로스오버 MCU에서 TFLite, Glow, DeepViewRT 지원
- **[Zephyr Platinum member](https://github.com/nxp-zephyr)**: i.MX RT 시리즈 Zephyr 보드 지원
- **Training Academy**: [Machine Learning on MCUs](https://www.nxp.com/design/design-center/training/TIP-ML-AND-AI-SERIES-ON-MCU) 온라인 교육 과정 제공

### Renesas

- **RA8P1 시리즈**: Arm Cortex-M85 (1GHz) + NPU, MRAM 탑재
- **[RUHMI 프레임워크](https://www.renesas.com/en/key-technologies/artificial-intelligence)**: TFLite, PyTorch, ONNX 모델을 프레임워크 독립적으로 최적화/배포
- **[Reality AI Tools](https://www.renesas.com/en/software-tool/e2-studio)**: e2 studio IDE와 연동, 센서 데이터 수집 → ML 모델 자동 생성
- **RTOS**: FSP(Flexible Software Package)에서 FreeRTOS, Azure RTOS, **Zephyr** 모두 지원
- **[Zephyr Platinum member](https://www.renesas.com/en/design-resources/partners/zephyr-project/zephyr-rtos)**: RA, RX, RZ 제품군 Zephyr 지원

### Infineon

- **PSoC Edge 시리즈**: Arm Cortex-M55/M33 + NPU, 다음 세대 AI MCU
- **[ModusToolbox ML](https://www.infineon.com/design-resources/development-tools/sdk/modustoolbox-software/modustoolbox-machine-learning)**: TensorFlow 모델 → PSoC 배포, 최적화/검증
- **[DEEPCRAFT AI Suite](https://www.infineon.com/design-resources/embedded-software/deepcraft-edge-ai-solutions)**: 엣지 AI 모델 학습부터 프로덕션까지 지원
- **Edge Impulse 연동**: PSoC 6에서 네이티브 ML 개발 지원

### Nordic Semiconductor

- **Neuton (2025년 인수)**: [Ultra-compact ML 모델](https://www.nordicsemi.com/Products/Technologies/Edge-AI/Software), TFLite 대비 10배 작은 메모리, 10배 빠른 추론
- **Axon NPU**: [내장 AI 가속기](https://www.nordicsemi.com/Products/Technologies/Edge-AI/Axon-NPU), TFLite 대비 15배 빠르고 에너지 효율적
- **[nRF Connect SDK](https://www.nordicsemi.com/Products/Technologies/Edge-AI/Software)**: Zephyr 기반 SDK, Edge AI Add-on 포함
- **[Edge AI Lab](https://www.nordicsemi.com/Products/Technologies/Edge-AI/Edge-AI-Lab?lang=en)**: 온라인 ML 실험 환경 제공

### Espressif

- **ESP-IDF**: FreeRTOS 기반, v6.0 릴리스 진행 중 (2026)
- **[ESP-DL](https://www.espressif.com/)**: 양자화 모델 추론 (ESP32-S3, P4), SIMD 가속, 자동 이중 코어 스케줄링
- **ESP-SR**: WakeNet9 (기상 단어), MultiNet (명령 인식), 다국어 지원
- **ESP32-P4**: 듀얼코어 RISC-V + AI 명령어 확장, 32MB PSRAM 지원
- **TFLite for Microcontrollers**: ESP32-S3/P4 네이티브 지원

### Microchip

- **[VectorBlox 3.0](https://www.edge-ai-vision.com/2026/07/microchip-advances-neural-network-implementation-with-vectorblox-3-0-accelerator-sdk/)**: Neural Network 가속기 SDK
- **[Zephyr Silver member](https://www.microchip.com/en-us/tools-resources/develop/zephyr)**: Zephyr for Microchip 프로젝트 진행
- **FreeRTOS**: MPLAB Code Configurator(MCC)에 직접 통합

### Texas Instruments

- **[Tiny ML Tensorlab](https://github.com/TexasInstruments/tinyml-tensorlab)**: 40+ MCU 지원, 시계열 분류/이상탐지/이미지 분류
- **Claude Code 연동**: AI Agent Skill Plugin으로 자연어 기반 TinyML 개발 지원
- **지원 MCU**: MSPM0, MSPM33, C2000 F28/F29 시리즈, CC13xx/CC35xx 무선 MCU

---

## Edge Impulse Studio 상세

### 개요

[Edge Impulse Studio](https://studio.edgeimpulse.com/)는 MCU/엣지 디바이스에서 ML 모델을 **학습→최적화→배포**하는 웹 기반 통합 개발 플랫폼입니다. ML 전문 지식 없이도 센서 데이터 기반 TinyML 애플리케이션을 빠르게 프로토타이핑하고 프로덕션까지 배포할 수 있게 해줍니다.

### 핵심 기능

| 기능 | 설명 |
|---|---|
| **데이터 수집** | 가속도계, 마이크, 카메라 등 센서에서 실시간 데이터 수집 |
| **전처리** | 임베디드용 신호 처리, 특징 추출 도구 제공 |
| **모델 학습** | 내장 ML 알고리즘 + TensorFlow/PyTorch 통합, AutoML 지원 |
| **엣지 최적화** | 양자화, 프루닝 등 자동 최적화로 저전율 하드웨어에 최적화 |
| **배포** | C++ 라이브러리, Zephyr Module, Arduino 라이브러리 등 다양한 형태로 배포 |
| **웹 기반** | 브라우저에서 모든 워크플로우 관리, 로컬 설정 불필요 |

### 지원 하드웨어 (850+ 타겟)

| 벤더 | 주요 지원 보드 |
|---|---|
| Arduino | Nano 33 BLE Sense, Nano RP2040, UNO Q (Zephyr), Nicla |
| STMicroelectronics | STM32 시리즈 (190+ 보드), Nucleo, Discovery |
| Nordic Semiconductor | nRF52840, nRF5340, nRF54L 시리즈 |
| NXP | i.MX RT 시리즈, FRDM 보드 |
| Infineon | PSoC 6, PSoC Edge (최신 지원) |
| Espressif | ESP32, ESP32-S3, ESP32-P4 |
| Raspberry Pi | RP2040, RP2350 (Pico 시리즈) |
| Seeed Studio | XIAO ESP32S3, XIAO nRF52840, Wio Terminal |
| Syntiant | NDP101 기반 TinyML 보드 |

### Zephyr 연동

Edge Impulse는 **Zephyr Module**을 통해 850+ 지원 하드웨어에 배포 가능합니다.

```bash
# Zephyr 프로젝트 초기화
mkdir ~/zephyrproject && cd ~/zephyrproject
west init -m https://github.com/edgeimpulse/example-standalone-inferencing-zephyr-module
cd example-standalone-inferencing-zephyr-module
west update

# Edge Impulse Studio에서 모델 배포 → Zephyr Module 다운로드
mkdir -p model
unzip ~/Downloads/my_model-zephyr.zip -d model

# 빌드 및 플래시
west build -b <board_name>
west flash
```

- 공식 문서: [Edge Impulse Zephyr Module Deployment](https://docs.edgeimpulse.com/hardware/deployments/run-zephyr-module)
- Example: [Arduino UNO Q + Zephyr](https://docs.edgeimpulse.com/tutorials/topics/zephyr/arduino-unoq-zephyr)

### 주요 특징

- **벤더 독립적**: 하나의 모델로 여러 MCU 플랫폼에 배포 가능
- **Zephyr 통합**: `west` 기반 빌드 시스템과 네이티브 통합
- **무료 티어**: 개인 및 소규모 프로젝트에 무료 사용 가능
- **커뮤니티**: 10만+ 개발자가 사용하는 가장 큰 TinyML 커뮤니티

---

## ST STM32Cube.AI / X-CUBE-AI 상세

### 개요

[STM32Cube.AI](https://stm32ai.st.com/stm32-cube-ai/) (구 X-CUBE-AI)는 사전 학습된 신경망 모델을 **STM32 MCU에 최적화된 C 코드로 자동 변환**하는 STMicroelectronics의 핵심 AI 배포 도구입니다. 2026년 현재 **v10.0** 릴리스되었으며, 독립형 GUI 도구인 **STM32Cube AI Studio**로 진화했습니다.

### 도구 변천사

```
X-CUBE-AI (STM32CubeMX 플러그인)
    ↓
STM32Cube.AI v8~v9 (Developer Cloud 온라인 지원)
    ↓
STM32Cube AI Studio (2026, 독립형 GUI 도구)
    └── X-CUBE-AI를 대체하는 차세대 도구
```

### 핵심 기능

| 기능 | 설명 |
|---|---|
| **모델 변환** | 학습된 NN/ML 모델 → STM32 최적화 C 코드 자동 생성 |
| **Neural-ART NPU 지원** | STM32N6의 NPU에 AI 연산 매핑, 불가능 시 CPU로 폴백 |
| **프레임워크 지원** | Keras, TensorFlow Lite, ONNX (PyTorch, MATLAB 등) |
| **클래식 ML 지원** | scikit-learn 모델 (Isolation Forest, SVM, K-means) via ONNX |
| **양자화 지원** | FLOAT32, INT8 양자화 (TFLite, ONNX Tensor-oriented QDQ) |
| **성능 최적화** | TFLite 대비 추론 시간 70% 향상, Flash/RAM 75% 절약 |
| **무료** | GUI 도구 및 CLI 모두 무료 |

### 지원 입력 형식

| 형식 | 확장자 | 설명 |
|---|---|---|
| TensorFlow Lite | `.tflite` | 양자화된 모델 |
| Keras | `.h5`, `.keras` | 학습된 모델 |
| ONNX | `.onnx` | PyTorch, MATLAB 등에서 변환 |
| scikit-learn | `.onnx` | 클래식 ML 모델 (Isolation Forest 등) |

### 사용 흐름 (5단계)

```
1. 모델 로드 → 2. 모델 분석 → 3. 검증 → 4. 최적화 → 5. 코드 생성
```

1. **모델 로드**: 학습된 모델 파일(.tflite, .onnx, .h5) 로드
2. **모델 분석**: 파라미터 수, MACC 복잡도, RAM/Flash 필요량 상세 분석
3. **검증**: 데스크톱 또는 STM32 보드에서 원본 모델과 생성 코드 비교 검증
4. **최적화**: 레이어별 메모리 관리, 내부/외부 메모리 리소스 최적화
5. **코드 생성**: 최적화된 추론 C 라이브러리 생성 → 프로젝트에 통합

### STM32Cube AI Studio (신규 독립형 도구)

2026년 출시된 X-CUBE-AI의 차세대 독립형 GUI 도구:

- **독립 실행**: STM32CubeMX 없이 단독 사용 가능
- **ST Edge AI Core 기술**: CLI 기반 최적화 엔진
- **상세 성능 리포트**: 레이어별 추론 메트릭 시각화
- **정확도 검증**: 호스트 및 타겟 보드에서 검증
- **STM32Cube 생태계 통합**: 기존 프로젝트 재사용 가능

```
STM32Cube AI Studio
├── 모델 최적화/변환 (X-CUBE-AI 기능 계승)
├── Neural-ART NPU 마이크로코드 생성
├── 상세 성능 리포트/메트릭 시각화
└── CLI (ST Edge AI Core) 기반 자동화
```

### STM32Cube.AI Developer Cloud (온라인)

- **Board Farm**: 주요 STM32 개발 보드에서 자동 벤치마크 실행
- **모델 Zoo**: [GitHub](https://github.com/STMicroelectronics/stm32ai-modelzoo)에서 사전 최적화된 모델 다운로드
- **온라인 배포**: 모델 업로드 → 전체 보드 팜에서 추론 시간 비교

### ST Edge AI Suite 내 위치

```
ST Edge AI Suite
├── STM32Cube AI Studio (X-CUBE-AI 계승) ← 모델 최적화/배포
├── NanoEdge AI Studio ← AutoML (소규모 데이터 → ML 라이브러리)
├── ST AIoT Craft ← 머신러닝 코어용 클라우드 도구
├── MEMS Studio ← MEMS 센서 AI 기능 개발
├── STM32 Developer Cloud ← 온라인 벤치마크/Board Farm
└── Model Zoo ← 사전 최적화 모델 컬렉션
```

### 참고 링크

- [STM32Cube.AI 공식 페이지](https://stm32ai.st.com/stm32-cube-ai/)
- [X-CUBE-AI 다운로드](https://www.st.com/en/embedded-software/x-cube-ai.html)
- [STM32Cube AI Studio 다운로드](https://www.st.com/en/development-tools/stedgeai-cubeai.html)
- [공식 위키](https://wiki.st.com/stm32mcu/wiki/AI:X-CUBE-AI_documentation)
- [Model Zoo (GitHub)](https://github.com/STMicroelectronics/stm32ai-modelzoo)
- [Developer Cloud](https://stm32ai.st.com/stm32-cube-ai-dc/)

---

## ST NanoEdge AI Studio 상세

### 개요

[NanoEdge AI Studio](https://stm32ai.st.com/nanoedge-ai/)는 STMicroelectronics에서 제공하는 **무료 AutoML 도구**로, AI 전문 지식 없이도 **모든 Arm Cortex-M MCU**에서 ML 모델을 자동 생성할 수 있습니다.

### 핵심 기능

| 기능 | 설명 |
|---|---|
| **AutoML 벤치마크** | 수백만 개의 전처리/모델/파라미터 조합을 자동 탐색하여 최적의 알고리즘 선택 |
| **4가지 라이브러리** | 이상 탐지(Anomaly Detection), 이상치 탐지(Outlier), 분류(Classification), 회귀(Regression) |
| **온디바이스 학습** | MCU에서 직접 "정상성"을 학습할 수 있음 (소규모 데이터셋 가능) |
| **PC 기반 실행** | Windows/Linux에서 로컬 실행, 클라우드 불필요 |
| **자동 코드 생성** | 최적화된 C 코드 라이브러리 자동 생성 → 기존 프로젝트에 통합 |

### 지원 하드웨어

- **모든 STM32 MCU**: Cortex-M0 ~ Cortex-M7, Cortex-R52 지원
- **Stellar MCU 패밀리**: 자동차용 MCU 포함
- **ISM330ISN 등 ISPU 센서**: 온디바이스 학습 지원하는 스마트 센서
- **ST 개발 보드**: 모든 STWIN, Nucleo, Discovery 보드 네이티브 지원

### ST Edge AI Suite 내 위치

```
ST Edge AI Suite
├── NanoEdge AI Studio ← AutoML (소규모 데이터 → ML 라이브러리)
├── X-CUBE-AI ← TFLite/Keras/ONNX 모델 변환 (대규모 데이터 → 최적화)
├── ST AIoT Craft ← 머신러닝 코어용 클라우드 도구
├── MEMS Studio ← MEMS 센서 AI 기능 개발
└── STM32 Developer Cloud ← 온라인 벤치마크/최적화
```

### 사용 흐름

1. **데이터 수집**: NanoEdge AI Studio 내장 데이터로깅 또는 외부 데이터 입력
2. **벤치마크 실행**:数千~数万 조합 자동 탐색
3. **라이브러리 생성**: 최적화된 C 코드 + 모델 포함 라이브러리
4. **통합**: `main()` 루프에서 함수 호출 한 줄로 추론 실행
5. **검증**: 임베디드 에뮬레이터 또는 실제 보드에서 성능 검증

### 참고 링크

- [NanoEdge AI Studio 다운로드](https://stm32ai.st.com/download-nanoedgeai/)
- [공식 위키](https://wiki.st.com/stm32mcu/wiki/AI:NanoEdge_AI_Studio)
- [v5.1 릴리스 노트](https://blog.st.com/nanoedge-ai-studio-v5)
- [ST Edge AI Suite](https://www.st.com/content/st_com/en/st-edge-ai-suite.html)

---

## Arm CMSIS-NN 상세

### 개요

[CMSIS-NN](https://github.com/ARM-software/CMSIS-NN) (Cortex Microcontroller Software Interface Standard - Neural Network)은 **Arm Cortex-M 프로세서용 최적화된 신경망 커널 라이브러리**입니다. ML 추론의 성능을 극대화하고 메모리 사용량을 최소화하도록 설계되었습니다.

### 핵심 기능

| 기능 | 설명 |
|---|---|
| **4.6x 성능 향상** | 범용 구현 대비 런타임/스루풋 4.6배 향상 |
| **4.9x 에너지 효율** | 범용 구현 대비 에너지 효율 4.9배 향상 |
| **INT8/INT16 양자화** | TFLite for MCU의 int8/int16 양자화 스펙 완전 호환 |
| **비트-정확** | TFLite reference kernels와 비트-정확 (bit-exact) 호환 |
| **SIMD 가속** | DSP extension 및 Arm MVE(Helium) 명령어 활용 |
| **무료 오픈소스** | Apache 2.0 라이선스 |

### 지원 프로세서

| 프로세서 유형 | 예시 | 최적화 기법 |
|---|---|---|
| SIMD 미지원 | Cortex-M0 | 순수 C 참조 구현 |
| DSP extension | Cortex-M4, M7 | `ARM_MATH_DSP` 매크로 → SIMD 최적화 |
| Arm MVE (Helium) | Cortex-M55, M85 | `ARM_MATH_MVEI` 매크로 → 128비트 벡터 연산 |

### 지원 연산 카테고리

```
CMSIS-NN 커널
├── Convolution (합성곱)
│   ├── 2D Convolution (일반)
│   ├── Depthwise Convolution
│   └── Transposed Convolution
├── Activation (활성화)
│   ├── ReLU
│   ├── Sigmoid
│   └── Tanh
├── Fully-Connected (전결합)
├── Pooling (풀링)
│   ├── Max Pooling
│   └── Average Pooling
├── Softmax
├── Elementwise (요소별 연산)
├── SVDF (순환 신경망)
├── LSTM (장단기 메모리)
└── Batch Normalization
```

### TFLite Micro와의 통합

CMSIS-NN은 **TensorFlow Lite for Microcontrollers의 기본 가속 라이브러리**로 사용됩니다.

```c
// TFLite Micro에서 CMSIS-NN 자동 사용
#include "tensorflow/lite/micro/micro_interpreter.h"

// TFLite 모델 로드 시 CMSIS-NN 커널이 자동으로 최적화된 커널 사용
// 특별한 코드 변경 불필요
```

### Zephyr에서의 사용

```c
// prj.conf
CONFIG_TENSORFLOW_LITE_MICRO=y
CONFIG_CMSIS_NN=y  // CMSIS-NN 가속 활성화

// CMSIS-NN은 TFLite Micro와 자동 통합됨
// ARM_MATH_DSP 또는 ARM_MATH_MVEI 매크로가 프로세서에 따라 자동 설정
```

### 실용적 참고사항

- **Firmware 개발자**: 별도의 추가 작업 없이 TFLite Micro 사용 시 자동으로 CMSIS-NN 커널 적용
- **모델 학습**: 별도의 학습 프로세스 불필요, 기존 TensorFlow/PyTorch 모델을 INT8 양자화하여 배포
- **Zephyr 통합**: Zephyr의 `CONFIG_CMSIS_NN=y` 옵션 하나로 활성화

### 참고 링크

- [GitHub 저장소](https://github.com/ARM-software/CMSIS-NN)
- [공식 문서](https://arm-software.github.io/CMSIS-NN/latest/)
- [논문 (arXiv)](https://arxiv.org/abs/1801.06601)
- [Arm Edge AI 도구 목록](https://developer.arm.com/edge-ai/libraries-and-tools)

---

## ML 관련 주요 트렌드

### 1. Zephyr RTOS가 사실상의 표준으로 부상

Mbed 대체재로 **모든 주요 벤더**가 적극 참여:

- **Platinum member**: NXP, Renesas, Nordic, Intel, Google
- **Silver member**: Microchip, Infineon, Adafruit, Laird Connectivity 등
- 1,000명 이상의 컨트리버터 보유

### 2. TensorFlow Lite for Microcontrollers (LiteRT) 표준 채택

- 가장 광범위한 런타임으로 Zephyr와 네이티브 통합
- 벤더별 NPU 백엔드: Arm Ethos-U, Neural-ART, Axon 등
- Edge Impulse와의 통합으로 학습→배포 파이프라인 구축

### 3. NPU 내장 MCU 급증

| MCU | NPU/가속기 | 특징 |
|---|---|---|
| STM32N6 | Neural-ART | 600x ML 성능 향상 |
| Renesas RA8P1 | NPU | 1GHz Cortex-M85 |
| Infineon PSoC Edge | NPU | Cortex-M55/M33 |
| Nordic nRF54 | Axon NPU | 15x TFLite 성능 |
| ESP32-P4 | AI 명령어 확장 | 듀얼 RISC-V |

### 4. Edge Impulse - 벤더 독립적 ML 플랫폼

- 모든 주요 MCU 벤더에서 지원
- 데이터 수집 → 모델 학습 → 최적화 → 배포 통합 파이프라인

### 5. CMSIS-NN 표준 채택

- Arm Cortex-M에서 최적화된 ML 커널
- Zephyr에서 네이티브로 지원

---

## ML 프레임워크 통합도 (Zephyr 기준)

```
Zephyr RTOS
├── TensorFlow Lite Micro (네이티브 모듈)
│   ├── Arm Cortex-M reference kernels
│   ├── CMSIS-NN optimized kernels (기본 가속 라이브러리)
│   └── Arm Ethos-U NPU 백엔드
├── ST NanoEdge AI Studio (ST 전용 AutoML)
│   └── 생성된 라이브러리를 Zephyr 앱에 통합
├── emlearn (scikit-learn/Keras → C 코드 생성)
├── microTVM (Apache TVM 백엔드)
└── 벤더별 NPU 드라이버
    ├── Arm Ethos-U55/U65/U85
    ├── ST Neural-ART
    ├── Nordic Axon
    └── NXP eIQ
```

---

## 요약

Mbed EOL 이후 **Zephyr RTOS + TensorFlow Lite Micro** 조합이 범용성과 이식성이 가장 높은 표준 경로입니다.

각 벤더는 자사 NPU/가속기와 연계된 독자 ML SDK를 제공하면서도, Zephyr 생태계에 적극 참여하는 **이중 전략**을 취하고 있습니다. 이는 Mbed의 단점이었던 벤더 종속성을 피하고, 개발자는 하나의 RTOS 기반으로 여러 MCU 플랫폼에서 ML 애플리케이션을 개발할 수 있게 됩니다.

### 추천 조합

| 목적 | 추천 조합 |
|---|---|
| 가장 넓은 하드웨어 지원 | Zephyr + TFLite Micro + CMSIS-NN |
| 가장 빠른 프로토타이핑 | **Edge Impulse Studio** + Target MCU |
| ST MCU에서 사전학습 모델 배포 | **STM32Cube AI Studio (X-CUBE-AI)** + STM32 |
| ST MCU에서 AutoML | **NanoEdge AI Studio** + STM32 |
| 최소 메모리 ML | Zephyr + Neuton (Nordic) 또는 emlearn |
| NPU 활용 고성능 ML | Zephyr + 벤더별 NPU SDK + CMSIS-NN |
| 음성/오디오 ML | ESP32 + ESP-SR + TFLite |

---

## 참고 링크

- [Zephyr Project](https://www.zephyrproject.org/)
- [Zephyr RTOS Tutorial](https://github.com/maksimdrachov/zephyr-rtos-tutorial)
- [Zephyr RTOS + STM32CubeIDE](https://docs.zephyrproject.org/latest/develop/tools/stm32cubeide.html)
- [TensorFlow Lite for Microcontrollers](https://www.tensorflow.org/lite/microcontrollers)
- [CMSIS-NN GitHub](https://github.com/ARM-software/CMSIS-NN)
- [CMSIS-NN 공식 문서](https://arm-software.github.io/CMSIS-NN/latest/)
- [Edge Impulse](https://www.edgeimpulse.com/)
- [Edge Impulse Zephyr Module](https://docs.edgeimpulse.com/hardware/deployments/run-zephyr-module)
- [Edge Impulse Studio](https://studio.edgeimpulse.com/)
- [STM32 Edge AI](https://www.st.com/content/st_com/en/st-edge-ai-suite.html)
- [NanoEdge AI Studio](https://stm32ai.st.com/nanoedge-ai/)
- [NanoEdge AI Studio 위키](https://wiki.st.com/stm32mcu/wiki/AI:NanoEdge_AI_Studio)
- [STM32Cube.AI (X-CUBE-AI)](https://stm32ai.st.com/stm32-cube-ai/)
- [STM32Cube AI Studio 다운로드](https://www.st.com/en/development-tools/stedgeai-cubeai.html)
- [STM32 Model Zoo (GitHub)](https://github.com/STMicroelectronics/stm32ai-modelzoo)
- [NXP eIQ ML](https://www.nxp.com/design/design-center/training/TIP-ML-AND-AI-SERIES-ON-MCU)
- [Renesas AI Technologies](https://www.renesas.com/en/key-technologies/artificial-intelligence)
- [Nordic Edge AI](https://www.nordicsemi.com/Products/Technologies/Edge-AI/Software)
- [Infineon ModusToolbox ML](https://www.infineon.com/design-resources/development-tools/sdk/modustoolbox-software/modustoolbox-machine-learning)
- [TI Tiny ML Tensorlab](https://github.com/TexasInstruments/tinyml-tensorlab)
- [Espressif AI/ML](https://www.espressif.com/)
- [Mbed CE (Community Edition)](https://github.com/mbed-ce)
- [FreeRTOS](https://www.freertos.org/)
