# TinyML 및 MCU 기반 ML/RTOS 기술 흐름 정리 노트

## 1. TinyML의 전체적인 기술 트렌드

### (1) 개발 방식 (Workflow)
* **Python의 역할:** PC/클라우드 환경(PyTorch, TensorFlow)에서 모델 설계 및 학습 진행.
* **C/C++의 역할:** 학습된 모델을 C/C++ 정적 바이너리로 변환하여 MCU에서 추론(Inference) 실행.
* **오해하기 쉬운 지점:** MicroPython 등 파이썬 경량화도 발전했으나, 실제 MCU 상의 ML 추론 연산은 메모리와 속도 문제로 C/C++ 실행 파일로 동작함.

### (2) 하드웨어 트렌드 (MCU Architecture)
* **1세대:** 범용 MCU Core (Cortex-M4/M7)의 순수 소프웨어 연산.
* **2세대:** DSP/SIMD 가속기(Arm Helium, CMSIS-NN) + INT8 양자화 적용.
* **3세대 (현재):** Dedicated Micro-NPU(Arm Ethos-U55, ST NPU, NXP eIQ Neutron 등)를 내장한 최신 MCU 등장.

### (3) RTOS 및 임베디드 OS 트렌드
* **Mbed OS:** Arm의 지원 종료(EOL, 2026년 7월)로 시장에서 퇴출 수순.
* **Zephyr RTOS:** Linux Foundation 산하의 멀티 벤더 지원, 모듈화, 강력한 드라이버 생태계를 바탕으로 차세대 표준 RTOS로 급부상.
* **FreeRTOS:** 가벼운 가상화/멀티태스킹용으로 여전히 많이 쓰이나, 복잡한 AIoT 기기는 Zephyr로 이주하는 추세.

---

## 2. MCU 레벨에서 ML과 OS(RTOS)의 관계

> **핵심:** 단순 "센싱 → 추론 → O/X 판단"만 하는 기기는 OS 없는 베어메탈(Bare-metal)로도 가능함. 그러나 **[센싱 + ML 판단 + 실시간 제어 + 통신]**이 완결된 소형 스마트 시스템을 단 1개의 저렴한 MCU로 구현하기 위해 RTOS가 필요함.

1. **실시간 제어 (Real-time Scheduling):**
   * ML 추론 연산은 CPU를 오래 점유하는 '무거운 작업'임.
   * RTOS는 제어/안전 인터럽트에 높은 우선순위를 부여하고, ML 연산은 백그라운드 태스크로 돌려 판단 중에도 실시간 동작 제어가 가능하게 만듦.
2. **메모리 관리 (Memory Isolation):**
   * 극도로 제한된 SRAM 상에서 텐서 버퍼(Tensor Arena)와 OS 태스크 스택 영역을 안전하게 분리 및 관리.
3. **하드웨어 가속기(NPU) 드라이버 추상화:**
   * OS가 NPU 제어용 Standard API/Driver Layer를 제공하여 레지스터 레벨 제어 부담 완화.
4. **저전력 관리 (Power Management):**
   * Tickless Idle 및 Deep Sleep 모드를 구동하여 판단이 필요 없을 때 극저전력 대기 상태 유지.

---

## 3. TinyML을 가능하게 한 핵심 연산 경량화 기술

1. **INT8 양자화 (Quantization):**
   * 32비트 실수(`FP32`) 연산을 8비트 정수(`INT8`) 연산으로 변환.
   * 정확도 손실 1~2% 미만으로 모델 크기 75% 감소 및 ALU 기반 빠른 정수 연산 실현.
2. **가지치기 (Pruning) & 압축 (Distillation):**
   * 불필요한 가중치를 제거하여 연산 수식 자체를 최소화.
3. **초경량 런타임 & 최적화 라이브러리:**
   * **TensorFlow Lite for Microcontrollers (TFLM):** 16~22KB 수준의 극소형 런타임.
   * **CMSIS-NN:** Cortex-M 코어의 정수 SIMD/DSP 인스트럭션 최적화 C 커널.