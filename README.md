# Embedded ML 3일 교육 커리큘럼

**총 시간**: 20시간 (1일차 7h + 2일차 7h + 3일차 6h) <br>
**목표**: TinyML 기초부터 NPU 가속 추론까지, MCU 3종(ESP32 / STM32F411 / STM32N6) 실습

---

## 1일차: TinyML 기초 + ESP32 실습 (7시간)

**목표**: TinyML 개념 이해, PC에서 모델 변환 경험, ESP32에서 추론 실행

| 시간 | 주제 | 내용 |
|------|------|------|
| 09:00-09:30 | **Orientation** | MCU ML 3일 개요, <br>보드(ESP32/STM32F411/STM32N6) 소개, <br>개발 환경 점검 |
| 09:30-10:30 | **TinyML 역사와 개념** | TinyML 정의, <br>Cloud AI → Edge AI → TinyML 계층 구조, <br>역사 타임라인(2008~2026), 3대 축(알고리즘/SW/HW) |
| 10:30-11:00 | **MCU ML 생태계** | 벤더별 현황(ST/NXP/Renesas/Espressif/Nordic), <br>오픈 런타임(TFLite Micro) vs 벤더 종속(X-CUBE-AI/eIQ), <br>Mbed EOL, Edge Impulse Qualcomm 인수 |
| 11:00-11:30 | **참고도서 가이드** | TinyML 추천 도서, <br>난이도별/주제별 학습 로드맵 |
| 11:30-12:30 | **실습: MNIST → TFLite 변환** | Keras 학습 → Float32 TFLite → Int8 양자화, <br>정확도/속도/크기 비교, 양자화 영향 분석 |
| 12:30-13:30 | 점심 | | |
| 13:30-14:30 | **ESP32 아키텍처 이해** | Xtensa LX6 듀얼코어(Core0 WiFi Core1 App), <br>SRAM 320KB 제약, Flash 4MB, <br>주변장치 공유 구조, FreeRTOS xTaskCreatePinnedToCore |
| 14:30-16:00 | **ESP32-CAM + Edge Impulse** | ESP32-CAM 셋업, 웹서버 구동, <br>EloquentEsp32Cam 데이터 수집, <br>Edge Impulse 프로젝트 → 학습 → TFLite 모델 다운로드 |
| 16:00-17:00 | **ESP32 TFLite Micro 포팅** | PC 모델(Int8 114.9KB) → ESP32 SRAM(~320KB) 적합성 판단, <br>Tensor Arena 설계, 시리얼 프로토콜로 이미지 전송 → 추론 → 결과 수신 |

**1일차 핵심 포인트**:
- TinyML = MCU급 디바이스에서의 ML 추론 (클라우드 없이)
- Float32(429.6KB)는 SRAM 초과, Int8(114.9KB)만 ESP32 탑재 가능
- Xtensa LX6는 듀얼코어지만 주변장치 공유 → 동시 접근 시 주의
- Edge Impulse로 엔드투엔드 TinyML 워크플로우 체험

---

## 2일차: STM32F411 + X-Cube-AI 실습 (7시간)

**목표**: Cortex-M4 기반 STM32F411에서 X-Cube-AI로 모델 변환 및 배포, RTOS 연동

| 시간 | 주제 | 내용 |
|------|------|------|
| 09:00-09:30 | **STM32F411 개요** | Cortex-M4 FPU (84MHz), SRAM 128KB, Flash 512KB, <br>NUCLEO-F411RE 보드, STM32CubeIDE 환경 |
| 09:30-10:30 | **STM32CubeMX + HAL 기초** | GPIO/UART/TIM 설정, 프로젝트 생성, <br>printf 리디렉션, LED Blink |
| 10:30-11:30 | **X-Cube-AI 이해** | X-Cube-AI 워크플로우: PC 모델 → .tflite → C 코드 변환, <br>RAM/ROM 최적화, 벤치마킹, 정확도 검증 (LLM과의 차이점) |
| 11:30-12:30 | **실습: 심박 데이터 분류 모델** | Python PPG 데이터 생성 → Keras DNN 학습 → X-Cube-AI 변환 → STM32F411 포팅 |
| 12:30-13:30 | 점심 | |
| 13:30-15:00 | **CMSIS-NN 최적화** | Cortex-M4용 DSP 명령어(SIMD), <br>CMSIS-NN 커널(s8/s16), 가중치/활성화 8비트 양자화, <br>STM32Cube.AI vs 직접 TFLite Micro 비교 |
| 15:00-16:30 | **FreeRTOS + AI 태스크 통합** | 센서 수집 Task → Queue 전달 → AI 추론 Task → 결과 출력 Task, <br>xTaskCreatePinnedToCore, Stack 크기 설계 |
| 16:30-17:00 | **프로젝트 코드 리뷰 + 최적화 팁** | 학습된 모델의 Flash/램 사용량 분석, <br>CubeIDE 프로파일러로 추론 시간 측정, 추가 최적화 방안 논의 |

**2일차 핵심 포인트**:
- Cortex-M4 FPU는 float32 연산 가능하지만 SRAM 128KB가 한계
- X-Cube-AI는 Keras/TFLite/ONNX 모델을 STM32용 C 코드로 자동 변환
- CMSIS-NN은 ARM SIMD 명령어로 int8 추론 4~5배 가속
- FreeRTOS Task로 AI 파이프라인 분리 설계

---

## 3일차: STM32 N6 + Neural-ART NPU 실습 (6시간)

**목표**: STM32N6 내장 Neural-ART NPU 활용, 하드웨어 가속 추론, 실제 제품 수준 파이프라인

| 시간 | 주제 | 내용 |
|------|------|------|
| 09:00-09:45 | **STM32N6 아키텍처** | Cortex-M85 (800MHz, Helium) + Neural-ART NPU, 4.2MB SRAM, 8MB Flash, STM32 최초 AI 내장 MCU |
| 09:45-10:30 | **NPU vs CPU 추론 비교** | CPU(Cortex-M85, Helium MVE) vs NPU(Neural-ART) 연산 방식, MAC/cycle, 전력 효율(TOPS/W), 메모리 대역폭 |
| 10:30-12:00 | **STM32 Edge AI Suite 실습** | ST Edge AI Suite 설치, 모델 가져오기(TFLite/Keras/ONNX), NPU 할당(CPU/NPU/혼합), 변환 → 배포 → 벤치마크 |
| 12:00-13:00 | 점심 | |
| 13:00-14:00 | **실시간 객체 탐지 실습** | MobileNet v1 / FOMO 모델 → NPU 양자화 → STM32N6 배포, 카메라 입력 → NPU 추론 → UART 출력 |
| 14:00-15:00 | **NPU 성능 튜닝** | 메모리 배치 최적화, NPU-CPU 파이프라인 분할, 전력-성능 트레이드오프, 프로파일링 |
| 15:00-16:00 | **종합 프로젝트 + Q&A** | 3일간 학습 내용 복습, ESP32/S TM32F411/STM32N6 계열별 배포 전략 수립, 추가 학습 로드맵 |

**3일차 핵심 포인트**:
- Neural-ART NPU: CNN/RNN 전용 하드웨어 가속기, CPU 대비 10~100배 전력 효율
- Cortex-M85 Helium: 벡터 명령어(MVE)로 CPU만으로도 4x SIMD 연산 가능
- Edge AI Suite는 모델 → NPU 바이너리 자동 변환 (수동 최적화 불필요)
- 3개 보드(ESP32 Xtensa / F411 Cortex-M4 / N6 Cortex-M85+NPU) 배포 전략 비교

---

## 보드별 ML 배포 전략 비교

| 항목 | ESP32 (1일차) | STM32F411 (2일차) | STM32N6 (3일차) |
|------|:---:|:---:|:---:|
| **CPU 코어** | Xtensa LX6 (240MHz) | Cortex-M4 FPU (84MHz) | Cortex-M85 Helium (800MHz) |
| **NPU** | 없음 | 없음 | Neural-ART (1GOPS) |
| **SRAM** | 320KB | 128KB | 4.2MB |
| **추론 엔진** | TFLite Micro / ESP-DL | X-Cube-AI / CMSIS-NN | ST Edge AI Suite / NPU SDK |
| **데이터 타입** | int8 필수 | int8 권장 (float32 가능) | int8/int4 혼합 |
| **추론 시간 (MNIST)** | ~300~500ms 예상 | ~50~100ms 예상 | ~1~5ms 예상 |
| **전력 소모** | ~80mA | ~50mA | ~200mA (NPU ON) |
| **대표 응용** | Wi-Fi CAM, 음성인식 | 의료기, 센서 융합 | 비전 AI, 실시간 객체탐지 |

---

## 설치 및 사전 준비

### Day 1 (ESP32)
- [ ] Python 3.8+ (TensorFlow 2.x)
- [ ] Arduino IDE + ESP32 패키지
- [ ] Edge Impulse 계정 (https://edgeimpulse.com)
- [ ] ESP32-CAM 보드 + USB-UART 변환기
- [ ] `pip install tensorflow numpy matplotlib pillow pyserial`

### Day 2 (STM32F411)
- [ ] STM32CubeIDE 2.2.0+ (2026-06 출시, Eclipse 2025-12 기반, GCC 14)
- [ ] STM32CubeMX 6.18.0+ (2026-06 출시, STM32N6 메모리 관리 향상)
- [ ] X-Cube-AI (CubeMX 내 Software Packs에서 설치) / ST Edge AI Core 4.0.0
- [ ] NUCLEO-F411RE 보드
- [ ] 심박 센서 (PPG, 선택)
- [ ] `pip install tensorflow scikit-learn`

> **참고:** STM32CubeIDE v2.0.0부터 CubeMX가 분리되었습니다. 두 툴을 각각 설치해야 합니다.
> X-Cube-AI 레거시 대신 **STM32Cube AI Studio**(신규 standalone GUI) 또는 **ST Edge AI Core 4.0.0**(CLI) 사용을 권장합니다.

### Day 3 (STM32N6)
- [ ] STM32CubeIDE 2.2.0+
- [ ] STM32CubeMX 6.18.0+
- [ ] ST Edge AI Core 4.0.0 (Neural-ART NPU 지원 포함)
- [ ] NUCLEO-N6570 보드 (STM32N6 Nucleo)
- [ ] 카메라 모듈 (MIPI CSI-2)
- [ ] USB-C 케이블 (데이터)

---

## 참고 자료

- [TinyML: Machine Learning with TensorFlow Lite on Arduino](https://www.oreilly.com/library/view/tinyml/9781492052036/) — Pete Warden
- [TinyML Cookbook](https://www.packtpub.com/product/tinyml-cookbook/9781801814973) — Gian Marco Iodice
- [STM32 Edge AI Suite](https://www.st.com/content/st_com/en/st-edge-ai-suite.html)
- [X-Cube-AI Documentation](https://wiki.st.com/stm32mcu/wiki/Artificial_intelligence_intro)
- [TensorFlow Lite for Microcontrollers](https://www.tensorflow.org/lite/microcontrollers)
- [Edge Impulse](https://edgeimpulse.com)
- [ESP-DL - ESP32 Deep Learning Library](https://github.com/espressif/esp-dl)
