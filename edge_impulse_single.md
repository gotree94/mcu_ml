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

```python
import tensorflow as tf
from tensorflow import keras
import edgeimpulse as ei

# API 키 설정 (환경변수 EI_API_KEY 또는 직접 지정)
# ei.API_KEY = "ei_your_api_key_here"

# 1. 데이터 로드
(x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
x_train = x_train.reshape(-1, 784).astype('float32') / 255.0
x_test = x_test.reshape(-1, 784).astype('float32') / 255.0

# 2. 간단한 신경망 학습
model = keras.Sequential([
    keras.layers.Input(shape=(784,)),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
model.fit(x_train, y_train, epochs=5, batch_size=32)

# 3. MCU 타겟 프로파일링 (하드웨어 없이!)
# ※ API 키 없으면 MissingApiKeyException 발생
try:
    devices = ei.model.list_profile_devices()
    print("사용 가능한 타겟:", devices)

    # Cortex-M4F 80MHz 기준으로 프로파일링
    profile = ei.model.profile(model=model, device='cortex-m4f-80mhz')
    print(profile.summary())
    # → RAM, ROM, 추론 시간 등 출력

    # 4. C++ 라이브러리로 배포
    labels = [str(i) for i in range(10)]
    deploy_bytes = ei.model.deploy(
        model=model,
        model_output_type=ei.model.output_type.Classification(labels=labels),
        model_input_type=ei.model.input_type.OtherInput(),
        deploy_target='zip'  # C++ 라이브러리
    )

    if deploy_bytes:
        with open('my_model_cpp.zip', 'wb') as f:
            f.write(deploy_bytes.getvalue())
        print("C++ 라이브러리 다운로드 완료")

except ei.exceptions.MissingApiKeyException:
    print("""
    ⚠ API 키가 설정되지 않았습니다.

    해결 방법:
    1. https://studio.edgeimpulse.com/studio/profile 에서 API 키 복사
    2. 실행 전 환경변수 설정:
       set EI_API_KEY=ei_xxxx...
    3. 또는 코드 상단에 직접 입력:
       ei.API_KEY = "ei_xxxx..."
    """)
except Exception as e:
    print(f"""
    ⚠ Edge Impulse API 오류: {e}

    일반적인 원인:
    1. API 키 권한 부족: profile()/deploy()는 admin 역할 필요
       → https://studio.edgeimpulse.com/studio/profile 에서 키 생성 시 Role=Admin 선택
    2. 네트워크 연결 문제
    3. Edge Impulse 서버 상태 (https://status.edgeimpulse.com)
    """)
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

#### profile() 성공 시 예상 출력 (admin 권한 키 사용)

```
RAM: 12.2 KB | ROM: 48.5 KB | 추론 시간: 3.2 ms (Cortex-M4F @ 80MHz)
→ MCU에 충분히 탑재 가능한 크기입니다.
```

### 학습 포인트
- 동일한 모델이 Cortex-M4(MCU)에서 차지하는 RAM/ROM을 시뮬레이션
- 모델 크기와 정확도의 트레이드오프 실험
- 양자화(Quantization) 전후 비교

---

## 3. Renode (MCU 시뮬레이터) - 가장 현실적인 시뮬레이션

**URL**: https://renode.io | **GitHub**: https://github.com/renode/renode

Renode는 실제 MCU 하드웨어를 시뮬레이션하는 오픈소스 프레임워크입니다.
TFLite Micro와 연동되어, **실제 바이너리**를 가상 MCU에서 실행할 수 있습니다.

### 지원 플랫폼
- Arduino Nano 33 BLE Sense (nRF52840)
- LiteX VexRiscv (RISC-V)
- STM32 시리즈
- ESP32 (제한적)

### 빠른 시작 (Google Colab에서 실행)

```python
# Colab에서 Renode + TFLite Micro 실행
# Harvard edX TinyML 코스에서 사용되는 방식

# 1. Renode 설치
!wget https://github.com/renode/renode/releases/download/v1.13.0/renode-1.13.0-linux-portable.zip
!unzip renode-1.13.0-linux-portable.zip

# 2. 매직 원드 데모 실행 (가속도계 제스처 인식)
!git clone https://github.com/antmicro/litex-vexriscv-tensorflow-lite-demo
%cd litex-vexriscv-tensorflow-lite-demo/renode
!./renode litex-vexriscv-tflite.resc -e "start"
```

### 실습 가능 항목

| 실습 | 내용 |
|------|------|
| Magic Wand | 가속도계 제스처 인식 (원, 기울기 등) |
| Person Detection | 사람 감지 (이미지 분류) |
| Speech Detection | 음성 감지 |
| 시리얼 UART 출력 | 가상 센서 데이터 → 추론 결과 확인 |
| 메모리 분석 | MCU 메모리 사용량 실시간 관찰 |

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
