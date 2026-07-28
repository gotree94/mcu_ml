# TinyML의 역사, 발전 방향, 그리고 마이크로컨트롤러 ML 생태계

> 작성일: 2026-07-20
> 범위: (1) TinyML 역사·발전 방향, (2) MCU向 ML(추론) 적용의 역사·현황·미래·벤더/하드웨어 계보

---

## 목차

1. TinyML이란 무엇인가
2. TinyML의 역사 타임라인
3. TinyML을 가능하게 한 3대 축 (알고리즘/소프트웨어/하드웨어)
4. 마이크로컨트롤러 + ML 적용의 역사
5. 현재 상황: 벤더 및 하드웨어 총정리
6. 벤더 간 관계도 및 생태계 계보
7. 소프트웨어 스택 지형도
8. 시장 및 산업 현황 데이터
9. 미래 발전 방향 예상
10. 참고문헌 (출처)

---

## 1. TinyML이란 무엇인가

TinyML은 **밀리와트(mW) 이하, 심지어 마이크로와트(µW) 수준의 초저전력**에서 센서 데이터를
기기 자체(온-디바이스)에서 처리하는 머신러닝 기술을 의미한다. 클라우드로 데이터를 보내지 않고
**엣지(Edge)의 가장 끝단인 MCU급 하드웨어**에서 추론을 수행하는 것이 핵심이다.

```
[클라우드 AI]  ← 수백W~수kW, 데이터센터 GPU/TPU
      │  (다운스케일)
[엣지 AI]      ← 수W~수십W, Jetson/RK3588/Hailo 등 SoC
      │  (다운스케일)
[TinyML]       ← 1mW ~ 수백mW, MCU(Cortex-M) + micro-NPU
      │  (다운스케일)
[초저전력 Always-on] ← 수 µW, 웨이크워드/이상탐지 전용 ASIC
```

TinyML은 <br>
* <cite index="1-1">비전과 오디오 등 이미 상용화 단계에 접어든 응용 분야,  <br>
* 새롭게 등장하는 저전력 상용 응용과 시스템 개념,  <br>
* 100KB 이하로 경량화된 알고리즘/네트워크/모델의 발전,  <br>
* 극한의 에너지 효율과 하드 리얼타임을 위한 최적화된 하드웨어 플랫폼 <br>
이라는 네 가지 축에 의해 성장하는 분야</cite>로 정의된다.

---

## 2. TinyML의 역사 타임라인

```
2008  ─── Qualcomm, "미래의 스마트폰" 컨셉 영상 공개
          → <cite index="7-1">임베디드 시스템과 결합된 TinyML이 열 수 있는 새로운 가능성을 보여주는 만우절 영상</cite>
          (지금 보면 TinyML의 예언적 프로토타입으로 회자됨)

2014  ─┐
       │  학계에서 "초소형 디바이스 + 딥러닝" 관련 논문 증가 시작
2016  ─┤  <cite index="6-1">2014~2024 기간 TinyML 관련 연구 논문 수가 매년 증가하는 추세</cite>
       │  - Google, MCU용 신경망 압축 연구 시작
2017  ─┤  - ARM CMSIS-NN 발표 (Cortex-M용 신경망 커널)
       │
2018  ─┤  - TensorFlow Lite for Microcontrollers(TFLM) 프로젝트 시작
       │  - "TinyML" 용어가 업계 컨퍼런스명으로 채택되기 시작
       │  - tinyML Summit 최초 개최 (실리콘밸리)
       │
2019  ─┤  - TFLM 정식 공개, Arduino Nano 33 BLE Sense 등과 함께 데모
       │  - Pete Warden, Vijay Janapa Reddi 등이 "TinyML" 저서/용어 정립
       │
2020  ─┤  <cite index="2-1">"TinyML"이라는 용어가 임베디드 AI의 융합이 커지면서 본격적으로 주목받기 시작한 해</cite>
       │  - Edge Impulse 창립 (엣지 ML 개발 플랫폼)
       │  - STM32Cube.AI(X-CUBE-AI) 확산
       │
2021  ─┤  - Arm Ethos-U55 micro-NPU 발표 (Cortex-M 옆에 붙는 최초의 상용 micro-NPU)
       │  - tinyML Foundation 비영리기구로 확장, 지역 챕터 확산
       │
2022  ─┤  - Ethos-U65 발표 (Cortex-A까지 지원 확장)
       │  - GreenWaves GAP9(RISC-V 기반) 양산
       │  - MAX78000(CNN 가속기 내장 Cortex-M4) 확산
       │
2023  ─┤  <cite index="3-1">웨어러블, 스마트 스피커, 비전 기반 홈 디바이스용 TinyML 칩 개발사에 4억 달러 이상 투자</cite>
       │  - EU "AIoT Edge" 프로젝트 등 정부 주도 사업 확대
       │
2024  ─┤  <cite index="3-1">30개 이상의 기업이 256KB 이하 메모리의 초저전력 AI 전용 MCU를 출시</cite>
       │  - STM32N6(Neural-ART NPU) 발표 — ST 최초의 자체 NPU 내장 MCU
       │  - "TinyML → TinyDL(Tiny Deep Learning)"로 확장 논의 본격화
       │
2025  ─┤  <cite index="4-1">TinyDL은 자원이 극도로 제한된 하드웨어에 딥러닝 모델을 배포하는 패러다임 전환으로 부상</cite>
       │  - tinyML Research Symposium → "EDGE AI Research Symposium"으로 개칭
       │  - Nordic nRF54L 시리즈에 Axon NPU 통합
       │
2026  ─┴─ - TI MSPM0/AM13Ex에 TinyEngine NPU 통합 (범용 Cortex-M0+/M33까지 NPU 표준화)
          - "MCU에 NPU가 없는 게 예외" 수준으로 확산
          - Visual Wake Word, 상시 이상탐지 등이 산업 표준 패턴으로 정착
```

### 연도별 연구논문 추세 (개념도, ASCII 막대그래프)

```
논문 수
  │                                                        ▇▇▇
  │                                                    ▇▇▇ ▇▇▇
  │                                                ▇▇▇ ▇▇▇ ▇▇▇
  │                                            ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇
  │                                        ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇
  │                                    ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇
  │                            ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇
  │        ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇ ▇▇▇
  └────────────────────────────────────────────────────────────
   2014 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025 2026
                                ↑
                     "TinyML" 용어 본격 확산 시점
```
(<cite index="6-1">2014~2024년 기간 동안 매년 발표된 TinyML 관련 논문 수가 증가하는 추세를 보임</cite>을 개념적으로 도식화)

---

## 3. TinyML을 가능하게 한 3대 축

```
        ┌─────────────────────────────────────────────┐
        │                  TinyML                       │
        └─────────────────────────────────────────────┘
                 ▲                ▲                ▲
                 │                │                │
        ┌────────┴───────┐ ┌──────┴──────┐ ┌───────┴────────┐
        │  모델/알고리즘   │ │  소프트웨어   │ │    하드웨어      │
        │  경량화          │ │  툴체인/런타임│ │  MCU + micro-NPU│
        ├─────────────────┤ ├─────────────┤ ├────────────────┤
        │ 양자화(INT8/4)   │ │ TFLite Micro │ │ Cortex-M0~M85   │
        │ 가지치기(Pruning)│ │ LiteRT       │ │ Ethos-U55/65/85 │
        │ 지식증류         │ │ Edge Impulse │ │ RISC-V 기반 NPU │
        │ NAS(신경망구조탐색)│ │ ONNX Runtime │ │ 전용 ASIC(NDP 등)│
        │ 100KB 이하 모델화 │ │ Apache TVM   │ │ 아날로그 컴퓨팅  │
        └─────────────────┘ └─────────────┘ └────────────────┘
```

---

## 4. 마이크로컨트롤러 + ML 적용의 역사

MCU에 ML을 적용하려는 시도는 "MCU가 통계적 신호처리를 하던 시절"에서 출발해
"딥러닝 추론 전용 가속기를 내장하는 시대"로 이어진다.

```
1단계 (~2016)  순수 CPU 추론 시대
  ─ MCU(Cortex-M0/M3/M4)가 부동소수점/정수 연산만으로 소규모 신경망을 직접 실행
  ─ 예: 간단한 선형회귀, 소형 결정트리, KNN 등 "고전 ML" 위주
  ─ 한계: RAM 수십KB, Flash 수백KB로 CNN/RNN은 사실상 불가능

2단계 (2017~2020) 커널 최적화 + 양자화 시대
  ─ ARM CMSIS-NN: Cortex-M 명령어(SIMD, MAC)를 활용한 신경망 커널 최적화
  ─ TensorFlow Lite Micro 등장 → INT8 양자화로 모델 크기/연산량 대폭 감소
  ─ ST X-CUBE-AI, NanoEdge AI Studio 같은 "모델을 MCU 코드로 변환"하는
    벤더 툴체인이 본격화
  ─ 여전히 NPU 없이 "CPU + 최적화 커널"만으로 추론 (순수 소프트웨어 가속)

3단계 (2021~2023) micro-NPU 결합 시대
  ─ Arm이 Ethos-U55를 발표하며 "Cortex-M 옆에 붙는 전용 NPU" 개념 확립
  ─ MAX78000(CNN 가속기 내장 Cortex-M4), GreenWaves GAP9(RISC-V + 다중 클러스터)
    등 벤더별 독자 가속기 등장
  ─ Syntiant는 아예 "항상 켜짐(always-on)" 오디오 전용 NDP 칩을 별도 라인업으로 개발

4단계 (2024~현재) NPU 내장 MCU 표준화 시대
  ─ STM32N6: ST 자체설계 Neural-ART NPU를 MCU에 최초로 통합
  ─ Nordic nRF54L: Axon NPU 통합한 무선 SoC
  ─ TI MSPM0/AM13Ex: 저가 범용 MCU(Cortex-M0+)에도 TinyEngine NPU 탑재
  ─ "AI 가속기가 옵션이 아니라 기본 사양"이 되는 흐름
```

### 세대별 성능/전력 비교 (개념적 ASCII)

```
                CPU-only          CPU+최적화커널        NPU 통합 MCU
              (~2016)            (2017~2020)          (2021~현재)
추론 지연     ██████████ (기준)   ██████ (약 3~5배 개선)  █ (최대 90배 개선*)
소비 전력     ██████████ (기준)   ███████ (소폭 개선)     █ (최대 120배 개선*)
가능한 모델   선형/소형 트리       소형 CNN/RNN            MobileNet급 CNN,
                                                         소형 Transformer/KWS
```
(* <cite index="9-1">TI는 TinyEngine NPU가 가속기 없는 유사 MCU 대비 최대 90배 낮은 지연시간과 120배 이상 낮은 추론당 에너지 소비를 달성한다고 주장</cite>)

---

## 5. 현재 상황: 벤더 및 하드웨어 총정리

### 5-1. CPU 코어 IP 벤더 (명령어셋/코어 설계)

| 벤더 | 대표 코어 | 특징 |
|---|---|---|
| Arm | Cortex-M0/M0+/M3/M4/M33/M55/M85 | 업계 표준. M55/M85는 Helium(MVE) DSP 확장으로 ML 연산 가속 |
| RISC-V 진영 | RV32IMC 기반 커스텀 코어 | GreenWaves, Espressif(P4), 각종 스타트업이 오픈 ISA로 독자 NPU/DSP 결합 |

### 5-2. micro-NPU / AI 가속기 IP·칩 벤더

```
[Arm]  Ethos-U55 ── Cortex-M 전용, 최초의 상용 micro-NPU (2021)
       Ethos-U65 ── Cortex-A까지 지원 확장 (2022)
       Ethos-U85 ── Transformer 연산 지원 강화 (최신)
       └ IP 라이선스 형태로 ST/NXP/Alif 등 다수 벤더가 채택

[STMicroelectronics]
       Neural-ART Accelerator ── 자체설계 NPU, STM32N6에 탑재
       <cite index="15-1">Cortex-M55 코어 800MHz + Neural-ART 1GHz, 최대 600GOPS</cite>

[Texas Instruments]
       TinyEngine NPU ── <cite index="9-1">MSPM0G5187(Cortex-M0+)와 AM13Ex(Cortex-M33)에 탑재,
       80MHz에서 2.56GOPS</cite>

[Nordic Semiconductor]
       Axon NPU ── <cite index="9-1">nRF54LM20B 무선 SoC에 128MHz로 통합된 초효율 NPU</cite>

[Maxim Integrated → ADI]
       MAX78000/MAX78002 ── <cite index="14-1">Cortex-M4 기반 SoC에 CNN 가속기 내장</cite>

[GreenWaves Technologies]
       GAP9 ── <cite index="13-1">RISC-V 기반, 임베디드 오디오/센서 퓨전에 최적화, 히어러블·엣지 오디오 분석에 강점</cite>

[Syntiant]
       NDP101/NDP120/NDP250 (Neural Decision Processor)
       ── <cite index="13-1">상시 켜짐(always-on) 오디오/센서 응용에 특화, 웨이크워드 탐지·환경음 분류에 극도로 효율적</cite>

[Google]
       Edge TPU (Coral) ── <cite index="14-1">Edge TPU 코프로세서 기반 하드웨어/SW 플랫폼</cite> (MCU보다는 SBC급에 가까움)

[Gyrfalcon Technology]
       Lightspeeur 시리즈 ── <cite index="14-1">엣지 컴퓨팅에 최적화된 칩 패밀리</cite>
```

### 5-3. MCU 완제품 벤더 (SoC 레벨)

| 벤더 | 대표 제품군 | AI 가속 방식 | 비고 |
|---|---|---|---|
| STMicroelectronics | STM32N6, STM32H7, STM32F4/F7 | Neural-ART NPU(N6) / X-CUBE-AI(SW) | <cite index="11-1">STM32H7 + MEMS 가속도계 조합으로 1KB급 오토인코더가 배터리 하나로 6개월 이상 상시 구동하는 베어링 이상탐지 사례</cite> |
| Texas Instruments | MSPM0 시리즈, AM13Ex | TinyEngine NPU | 저가 범용 MCU까지 NPU 확산 |
| Nordic Semiconductor | nRF52840, nRF54L 시리즈 | Axon NPU(신모델) | BLE 기반 웨어러블 강세 |
| Espressif | ESP32-S3 | <cite index="14-1">AI 가속 지원 SoC(전용 NPU는 아니나 벡터 명령어 지원)</cite> | Wi-Fi/BLE 내장, 저가형 진입점으로 인기 |
| Ambiq | Apollo4 시리즈 | SPOT(서브threshold) 저전력 기술 | <cite index="15-1">MRAM 구동 시 5µA/MHz의 초저전력</cite>, NPU보다 "초저전력 CPU" 전략 |
| Analog Devices(Maxim) | MAX78000/78002 | CNN 가속기 내장 | 초기 CNN 전용 가속 MCU |
| Renesas | RA8 시리즈(M85 코어) | Helium(MVE) DSP 확장 | <cite index="15-1">오디오/ML 연산에 강점을 갖는 "중간 지점" 포지션</cite> |
| NXP | i.MX RT, MCX 시리즈 | eIQ 소프트웨어 + Ethos-U(일부) | 산업/자동차向 강세 |
| Alif Semiconductor | Ensemble 시리즈 | Ethos-U55/U65 탑재 | Cortex-M55+A32 결합형 |
| Sipeed | K230 | 자체 NPU(KPU) | RISC-V 기반, 저가 비전 특화 |

### 5-4. 개발 보드/키트 (교육·프로토타이핑 진입점)

```
저가/입문                                              고성능/전문
    │                                                        │
Arduino Nano 33 BLE Sense ─ Seeed XIAO ESP32-S3 ─ Grove Vision AI V2(Ethos-U55)
    │                              │                          │
NUCLEO(STM32) ─────────────── Arduino Nicla Vision ─── STM32N6 평가보드
    │
    └ <cite index="10-1">Seeed XIAO ESP32-S3 Sense: 듀얼코어 240MHz, 8MB PSRAM, 8MB Flash,
      OV2640 카메라, 디지털 마이크 탑재, 약 15달러</cite> — "TinyML 대중화의 상징적 보드"
```

---

## 6. 벤더 간 관계도 및 생태계 계보

### 6-1. IP 라이선싱 관계 (Arm 코어 중심)

```
                         ┌───────────────┐
                         │   Arm Holdings │
                         │ (코어+NPU IP)  │
                         └───────┬────────┘
                 ┌───────────────┼───────────────────┐
                 │               │                    │
          Cortex-M 코어    Ethos-U micro-NPU     Helium(MVE) DSP확장
                 │               │                    │
      ┌──────────┼──────────┐    │              (M55/M85 내장)
      │          │          │    │
      ▼          ▼          ▼    ▼
   STMicro     Nordic      NXP  Alif Semi
  (자체 NPU    (자체 NPU   (Ethos-U (Ethos-U55/65
   병행 개발)   Axon 병행)  일부채택) 채택)
      │
      └─ STM32N6: Cortex-M55(Arm) + Neural-ART(자체설계) 결합
```
많은 벤더가 **Arm 코어는 라이선스로 공통 사용**하되, **NPU/가속기는 자체 설계(ST, Nordic, TI)
하거나 Arm의 Ethos-U를 그대로 채택(NXP, Alif)** 하는 두 갈래로 분화되어 있다.

### 6-2. RISC-V 진영의 독자 노선

```
              RISC-V International (오픈 ISA, 무상)
                        │
        ┌───────────────┼────────────────┐
        │                │                │
   GreenWaves(GAP9)  Espressif(P4)    Sipeed(K230)
   오디오/센서퓨전     비전+Wi-Fi 결합   저가 비전 NPU
```
RISC-V는 라이선스 비용 없이 **자체 명령어 확장(커스텀 벡터/DSP 명령어)** 을 붙일 수 있어,
GAP9처럼 오디오·센서퓨전에 특화된 극단적 저전력 설계가 가능하다.

### 6-3. "always-on 전용 ASIC" 별도 계보

```
Syntiant(NDP101/120/250)  ── 웨이크워드/음향 이벤트 전용
Ambiq(Apollo4 + SPOT)     ── 범용 초저전력 CPU 전략(가속기 최소화, 전력 최적화 극대화)
```
이 둘은 "NPU를 얹어 속도를 높이는" 주류 전략과 달리, **"애초에 트랜지스터 자체를
서브threshold로 굴려 전력을 극한으로 낮추는"** 전혀 다른 접근으로 분화된 사례다.

### 6-4. 소프트웨어 레이어의 벤더 중립화

```
             ┌────────────────────────────────────┐
             │   모델 학습 (PC/서버, 벤더 무관)      │
             │   PyTorch / TensorFlow / Keras       │
             └───────────────┬──────────────────────┘
                              │ 변환/양자화
             ┌────────────────────────────────────┐
             │  벤더 중립 런타임/포맷                 │
             │  TFLite Micro / LiteRT / ONNX        │
             └───────────────┬──────────────────────┘
                              │ 벤더별 컴파일러
        ┌─────────────┬───────┴───────┬─────────────┐
        ▼             ▼               ▼             ▼
   ST X-CUBE-AI   NXP eIQ      TI TinyEngine   Edge Impulse
   (STM32 전용)   (i.MX/MCX)   (MSPM0 전용)    (멀티 벤더 지원)
```
초기에는 벤더마다 완전히 다른 툴체인을 요구했지만, 현재는 **TFLite
Micro/ONNX 같은 중간 표준 포맷 → 각 벤더의 하드웨어 전용 컴파일러**로
내려가는 2단 구조가 사실상 업계 표준이 되었다. Edge Impulse 같은
플랫폼은 여러 벤더 보드를 동시에 지원하며 이 파편화를 완화하는 역할을 한다.

---

## 7. 소프트웨어 스택 지형도

```
┌───────────────────────────────────────────────────────────┐
│                     응용 개발자 계층                          │
│   Edge Impulse Studio / ST NanoEdge AI Studio / Keras     │
└───────────────────────────┬───────────────────────────────┘
┌───────────────────────────┴───────────────────────────────┐
│                     모델 최적화 계층                          │
│   양자화(PTQ/QAT), 가지치기, 지식증류, NAS                    │
└───────────────────────────┬───────────────────────────────┘
┌───────────────────────────┴───────────────────────────────┐
│                     추론 런타임 계층                          │
│  TensorFlow Lite Micro / LiteRT / ONNX Runtime / Apache TVM │
└───────────────────────────┬───────────────────────────────┘
┌───────────────────────────┴───────────────────────────────┐
│                     하드웨어 추상화 계층                      │
│   CMSIS-NN(Arm) / 벤더 커널 라이브러리                        │
└───────────────────────────┬───────────────────────────────┘
┌───────────────────────────┴───────────────────────────────┐
│              실제 MCU + micro-NPU (Bare-metal/RTOS)         │
└───────────────────────────────────────────────────────────┘
```

<cite index="13-1">TensorFlow Lite for Microcontrollers(TFLM)는 여전히 가장 널리 쓰이는 오픈소스 런타임</cite>이며,
<cite index="13-1">TFLM, LiteRT, Edge Impulse, ONNX Runtime, Apache TVM 등 소프트웨어 생태계가 지속적으로 성숙</cite>하고 있다.

---

## 8. 시장 및 산업 현황 데이터

```
TinyML 시장 규모 (백만 달러, 추정치)
2024  │ ██████████████████████ 1,125
2025  │ ████████████████████████ 1,236
  ...
2033  │ ████████████████████████████████████████████████████████████████████████████████ 4,605 (전망)
```
<cite index="3-1">TinyML 시장 규모는 2024년 약 11억 2,545만 달러였으며 2025년 약 12억 3,577만 달러로 성장이 전망되고, 2033년까지 약 46억 545만 달러를 넘어설 것으로 예상되며 연평균성장률(CAGR)은 9.8%</cite>로 추정된다.

**주요 동인 및 제약:**
- <cite index="3-1">배터리로 구동되는 IoT 기기와 센서가 클라우드 연결 없이도 스스로 판단해야 하는 수요가 급증하는 것이 핵심 성장 동인이며, 매년 출하되는 수십억 개의 마이크로컨트롤러 중 점점 더 많은 비중이 이런 초소형 모델을 구동할 수 있게 되는 중</cite>
- <cite index="3-1">극도로 제약된 하드웨어에서 동작할 수 있도록 효율적인 AI 모델을 개발하는 것 자체가 여전히 상당한 난제이며, 복잡한 모델을 축소하는 작업은 쉽지 않음</cite>

**정부/지역 사업:**
- <cite index="3-1">인도 정부 주도 "AI on the Edge" 사업으로 7개 주에 200만 개 이상의 TinyML 기반 농업 센서가 배치되었고 투자액은 1억 달러를 상회</cite>
- <cite index="3-1">EU의 "AIoT Edge" 프로젝트는 2023년 기준 2억 5천만 달러 이상의 R&D 자금을 지원했으며 2025년까지 1,000만 개의 스마트 산업 센서 설치를 목표</cite>

---

## 9. 미래 발전 방향 예상

```
현재 (2026)                          →        가까운 미래 (2027~2029 예상)
─────────────────────────────────────────────────────────────────────
NPU는 "고급 옵션"                      →        NPU는 MCU의 "기본 내장 사양"
                                                (TI의 저가 M0+에도 탑재된 흐름 지속)

Vision Wake Word 250KB 모델           →        Transformer 계열 소형 모델
(MobileNet-V2 경량 변형)                        (Ethos-U85 등 Transformer 연산 지원 확대)

TinyML = 추론(Inference) 전용         →        TinyDL: 온디바이스 미세조정/
                                                지속학습(On-device Continual Learning)
                                                로 무게중심 이동

개별 센서 단위 판단                    →        분산 TinyML 네트워크
                                                (여러 MCU가 협업 추론 + 연합학습)

수동 모델 압축(양자화/가지치기)         →        NAS 자동화 + 하드웨어-소프트웨어
                                                공동설계(Co-design) 툴체인 고도화

RTOS/Bare-metal 개별 최적화            →        표준 런타임(LiteRT/ONNX) 위에서
                                                "모델만 바꾸면 이식 가능"한 수준의
                                                포터빌리티 확보
```

**핵심 관찰 포인트:**
1. **가격 하방 확산** — NPU가 고급 SoC 전유물에서 저가 범용 MCU(Cortex-M0+)까지 내려오는 추세가
   TI MSPM0 사례처럼 뚜렷해지고 있어, 향후 "AI 미탑재 MCU가 오히려 특수 사례"가 될 가능성이 있다.
2. **오디오/비전 중심에서 진동·환경 센서로 확산** — <cite index="11-1">산업용 진동 이상탐지처럼 저용량(1KB급) 모델이 6개월 이상 배터리 하나로 상시 구동되는 사례</cite>가 늘며, 산업 IoT/예지보전(Predictive Maintenance) 영역이 다음 성장축이 될 전망이다.
3. **TinyML → TinyDL로의 개념 확장** — <cite index="4-1">단순 추론 중심이던 초기 TinyML에서, 자원이 극도로 제한된 하드웨어에 딥러닝 모델 자체를 배포하는 TinyDL로 패러다임이 전환</cite>되는 중이며, 양자화·가지치기·NAS 등 모델 압축 기법과 컴파일러/툴체인이 이 흐름의 핵심 연구 대상이다.
4. **RISC-V의 입지 확대** — 로열티 부담이 없고 커스텀 명령어 확장이 자유로운 RISC-V가 GreenWaves, Sipeed 등을 통해 Arm 독점 구도를 조금씩 잠식하고 있다.
5. **극저전력 회로 설계 자체의 혁신** — Ambiq의 서브threshold 기법처럼, "가속기를 얹는" 접근이 아니라 "회로 자체를 초저전력화"하는 근본적으로 다른 접근도 병행 발전 중이다.

---

## 10. 참고문헌 (출처)

- tinyML Research Symposium 2024/2025 — https://conf.researchr.org/series/tinyml-symp
- ScienceDirect, "Tiny Machine Learning (TinyML): Research trends and future application opportunities"
- Market Growth Reports, "Tiny Machine Learning (TinyML) Market Size, Share & Analysis 2035"
- ACM Computing Surveys, "From Tiny Machine Learning to Tiny Deep Learning: A Survey"
- IAENG IJCS, "A Comprehensive Systematic Review of TinyML for Person Detection"
- SIGARCH Blog, "TinyML: Why the Future of Machine Learning is Tiny and Bright" (2024)
- ICTP SustainableDev 2024 Workshop
- CNX Software, tinyml 뉴스 아카이브 (2026)
- Microcontrollers Lab, "Best TinyML and Edge AI Development Kits in 2026"
- Chaos and Order Blog, "Edge AI & TinyML 2026 Deep-Dive Guide"
- Hackster.io, "STMicroelectronics' STM32N6 Brings Its In-House Neural-ART NPU"
- Aree Blog, "TinyML and Edge AI on Resource-Constrained Devices"
- GitHub crespum/edge-ai README
- Kynix Blog, "Best MCUs for Low-Power IoT Designs in 2026"

---

*이 문서는 나무 선생님의 STM32/임베디드 AI 커리큘럼 자료(G:\BOOK\[TinyML])용으로 작성되었습니다.
모든 다이어그램은 이미지/표 없이 ASCII 텍스트로만 표현했습니다.*
