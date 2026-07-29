# Edge Impulse 웹 기반 가이드

> **최종 업데이트:** 2026-07-29  
> **공식 문서:** https://docs.edgeimpulse.com/  
> **SDK 버전:** edgeimpulse Python SDK (최신), Edge Impulse Studio (2026)

---

## 목차

1. [Edge Impulse 개요](#1-edge-impulse-개요)
2. [계정 및 프로젝트](#2-계정-및-프로젝트)
3. [Studio 대시보드](#3-studio-대시보드)
4. [데이터 수집 (Data Acquisition)](#4-데이터-수집-data-acquisition)
5. [Impulse 디자인](#5-impulse-디자인)
6. [처리 블록 (Processing Blocks)](#6-처리-블록-processing-blocks)
7. [학습 블록 (Learning Blocks)](#7-학습-블록-learning-blocks)
8. [EON Tuner](#8-eon-tuner)
9. [모델 테스트](#9-모델-테스트)
10. [배포 (Deployment)](#10-배포-deployment)
11. [EON Compiler](#11-eon-compiler)
12. [Python SDK](#12-python-sdk)
13. [API 참조](#13-api-참조)
14. [하드웨어 지원](#14-하드웨어-지원)
15. [자주 묻는 질문](#15-자주-묻는-질문)

---

## 1. Edge Impulse 개요

Edge Impulse는 엣지 디바이스(마이크로컨트롤러부터 CPU, GPU, NPU까지)에서 실행되는 머신러닝 모델을 구축, 학습, 최적화 및 배포하기 위한 플랫폼입니다.

### 주요 워크플로우

```
데이터 수집 → Impulse 설계 → DSP 특성 추출 → 모델 학습 → 모델 테스트 → 배포
```

### 지원하는 데이터 유형

| 데이터 유형 | 설명 |
|-----------|------|
| **시계열 (Time series)** | 가속도계, 자이로, 진동 센서 등 |
| **오디오 (Audio)** | 음성 명령, 키워드 스포팅, 소리 분류 |
| **이미지 (Image)** | 이미지 분류, 객체 탐지, 이상 탐지 |
| **비디오 (Video)** | 연속 프레임 기반 분석 |

### 요금제

| 구분 | Developer | Enterprise |
|------|-----------|------------|
| 가격 | 무료 | 별도 문의 |
| 프로젝트 수 | 제한적 | 무제한 |
| 데이터 용량 | 제한적 | 확장 가능 |
| 커스텀 블록 | ❌ | ✅ |
| EON Compiler (RAM 최적화) | ❌ | ✅ |
| 전담 지원 | ❌ | ✅ |

---

## 2. 계정 및 프로젝트

### 2.1 계정 생성

1. https://edgeimpulse.com/signup 방문
2. 이메일, GitHub, Google 계정 중 선택하여 가입
3. **Developer (무료)** 또는 **Enterprise** 플랜 선택

### 2.2 새 프로젝트 만들기

1. 로그인 후 **Create new project** 클릭
2. 프로젝트 이름 입력
3. 프로젝트 유형 선택 (선택사항):
   - Accelerometer data
   - Audio (sound)
   - Images
   - Object detection (bounding boxes)

### 2.3 프로젝트 구성 요소

| 요소 | 설명 |
|------|------|
| **대시보드 (Dashboard)** | 프로젝트 개요, 설정, API 키 관리 |
| **디바이스 (Devices)** | 연결된 하드웨어 관리 |
| **데이터 수집 (Data acquisition)** | 데이터 업로드/수집/라벨링 |
| **Impulse 디자인** | ML 파이프라인 구성 |
| **EON Tuner** | 하드웨어 자원 기반 최적화 탐색 |
| **Live classification** | 실시간 분류 테스트 |
| **Model testing** | 홀드아웃 데이터셋 평가 |
| **Deployment** | 타겟 디바이스용 패키징 |

### 2.4 API 키 관리

**Dashboard → Keys** 탭에서 관리

| 역할 | 권한 |
|------|------|
| **Admin (full access)** | API 키 관리, 프로젝트 설정, 데이터, 학습, 배포 등 모든 권한 |
| **Ingestion + deployment** | 데이터 추가, 원격 관리, 데이터 읽기, 배포 |
| **Ingestion** | 데이터 추가, 원격 관리, 데이터 읽기 |
| **Read-only** | 데이터 및 Impulse 상태 읽기 전용 |

> ⚠ **CLI 사용 시:** 반드시 **Set as development key** 체크 필요.  
> CLI에서 "You don't have any development keys set" 오류 발생 시 이 옵션을 활성화한 키 생성.

---

## 3. Studio 대시보드

### 3.1 주요 탭

| 탭 | 설명 |
|-----|------|
| **Dataset** | 데이터셋 현황 (train/test 분할 비율, 라벨 분포 시각화) |
| **Data explorer** | 2D 특성 공간에서 데이터 클러스터 시각화 |
| **Data sources** | 외부 저장소 연결, 자동 데이터 파이프라인 구축 |
| **Synthetic data** | 내장 생성 모델로 합성 데이터 생성 |
| **Labeling queue** | 객체 탐지 프로젝트의 라벨링 워크플로우 |
| **AI labeling** | AI 모델을 활용한 자동 라벨링 |
| **CSV Wizard** | 대용량 CSV/TXT/Parquet 데이터 가져오기 |

### 3.2 타겟 디바이스 설정

**Dashboard → Target device**에서 설정:

1. **개발 보드 선택**: 공식 지원 보드 목록에서 선택
2. **커스텀**: 보드가 목록에 없으면 직접 RAM/ROM/클럭 속도 입력
3. **프로파일링에 사용**: EON Tuner와 배포 시 리소스 추정 기준

---

## 4. 데이터 수집 (Data Acquisition)

### 4.1 데이터 업로드 방법

| 방법 | 설명 |
|------|------|
| **웹 업로더** | Studio 웹 UI에서 직접 파일 업로드 (드래그 & 드롭) |
| **Ingestion API** | HTTP POST로 프로그래밍 방식 업로드 |
| **Edge Impulse CLI** | CLI를 통해 디바이스에서 데이터 수집 |
| **Data Sources** | S3, GCS 등 외부 저장소 연동 (Enterprise) |
| **데이터 캠페인** | 조직 단위 데이터 수집 워크플로우 |

### 4.2 지원 파일 형식

| 데이터 유형 | 확장자 | 비고 |
|-----------|--------|------|
| 센서 (시계열) | `.json`, `.cbor`, `.csv`, `.parquet` | 특정 포맷 준수 필요 |
| 오디오 | `.wav` | |
| 이미지 | `.jpg`, `.png` | |
| 비디오 | `.mp4`, `.avi` | 업로드 후 프레임 분할 가능 |
| 라벨 | `.labels` | 객체 탐지 바운딩 박스 포함 |

### 4.3 Ingestion API로 업로드 (Python)

```python
import requests

api_key = 'ei_121...'
files = ['image1.jpg', 'image2.jpg']
label = 'cat'

res = requests.post(
    url='https://ingestion.edgeimpulse.com/api/training/files',
    headers={
        'x-label': label,
        'x-api-key': api_key,
        'x-metadata': '{"site":"field-A"}'
    },
    files=[('data', (f, open(f, 'rb'), 'image/png')) for f in files]
)

print(res.status_code, res.content)
```

### 4.4 데이터셋 분할

| 데이터셋 | 용도 | 기본 비율 |
|---------|------|----------|
| **Training** | 모델 학습 | 80% |
| **Validation** | 하이퍼파라미터 튜닝 (선택) | (training에서 분할) |
| **Testing** | 최종 평가 | 20% |

> **Dataset → Splits**에서 세부 조정 가능.  
> **Metadata 기반 분할**: 특정 메타데이터 키로 그룹 누출 방지 가능.

---

## 5. Impulse 디자인

**Impulse**는 ML 파이프라인의 청사진입니다. 3가지 주요 블록으로 구성됩니다.

### 5.1 입력 블록 (Input Block)

데이터 유형에 따른 입력 설정:

**시계열 데이터:**
| 필드 | 설명 |
|------|------|
| Input axes | 학습 데이터에서 참조할 축 |
| Window size | 특성 추출에 사용할 원시 데이터 윈도우 크기 |
| Window increase | 다음 윈도우 시작점 결정 |
| Frequency (Hz) | 샘플링 주파수 (자동 계산, 변경 시 업/다운 샘플링) |
| Zero-pad data | 윈도우 크기 부족 시 제로 패딩 |

**이미지 데이터:**
| 필드 | 설명 |
|------|------|
| Image width/height | 리사이즈 대상 크기 |
| Resize mode | `Fit longest axis` (레터박스), `Fit shortest axis` (크롭), `Squash` (왜곡) |

### 5.2 처리 블록 (Processing Block) = DSP 특성 추출기

데이터 유형별 권장 블록 (별표 표시):

| 데이터 유형 | 권장 처리 블록 |
|-----------|---------------|
| 가속도계/자이로 | **Spectral Analysis** |
| 오디오 | **MFCC** 또는 **MFE** |
| 이미지 | **Image** (픽셀 데이터 그대로 사용) |
| 생체 신호 (PPG/ECG) | **HR/HRV** |

처리 블록 부족 시 **커스텀 처리 블록** 생성 가능 (Enterprise).

### 5.3 학습 블록 (Learning Block)

처리 블록 다음에 추가:

- **분류 (Classification)**: Keras 기반 분류기
- **회귀 (Regression)**: 연속값 예측
- **이상 탐지 (Anomaly Detection)**: K-means 또는 GMM
- **시각적 이상 탐지 (FOMO-AD)**: 이미지 기반 이상 탐지
- **이미지 분류 (Transfer Learning)**: MobileNet 등 사전 학습 모델
- **키워드 스포팅 (Transfer Learning)**: 오디오 전이 학습
- **객체 탐지**: MobileNetV2 SSD FPN, FOMO, YOLO-Pro
- **Classical ML**: 결정 트리, 랜덤 포레스트 등

---

## 6. 처리 블록 (Processing Blocks)

### 6.1 Spectral Analysis (스펙트럼 분석)

- 가속도계/자이로 데이터에 최적
- FFT 기반 주파수 특성 추출
- 설정 가능 파라미터: FFT 길이, 윈도우 함수, 오버랩

### 6.2 MFCC / MFE (오디오)

- **MFCC**: 음성 인식에 전통적으로 사용
- **MFE**: Mel-filterbank 에너지, 최신 음성 모델에 선호
- 공통 파라미터: 주파수 범위, 필터 뱅크 개수, FFT 길이

### 6.3 Image (이미지)

- 이미지 픽셀을 그대로 신경망에 전달
- color depth: RGB 또는 Grayscale

### 6.4 Flatten

- 시계열 데이터를 1D 벡터로 평탄화
- 단순한 패턴 인식에 사용

### 6.5 기타

| 블록 | 용도 |
|------|------|
| Raw Data | 전처리 없이 원시 데이터 전달 |
| Spectrogram | 오디오 스펙트로그램 생성 |
| HR/HRV | PPG 신호에서 심박수/심박변이도 추출 |
| EEG | 뇌파 데이터 특성 추출 |

---

## 7. 학습 블록 (Learning Blocks)

### 7.1 분류 (Classification)

Keras 기반 신경망 분류기:

```
Input → Dense → Dropout → Dense → Softmax
```

**신경망 설정:**
| 파라미터 | 설명 |
|---------|------|
| Number of training cycles (epochs) | 전체 데이터셋 학습 반복 횟수 |
| Learning rate | 학습률 (과적합 시 감소) |
| Validation set size | 검증 세트 비율 (기본 20%) |
| Batch size | 미니배치 크기 |
| Auto-weight classes | 클래스 불균형 처리 |
| Profile int8 model | 양자화 모델 프로파일링 (비활성화 시 속도 향상) |
| Training processor | CPU 또는 GPU 선택 |

**데이터 증강 (Data Augmentation):**
- **오디오**: SpecAugment (시간/주파수 마스킹, 워핑), 가우시안 노이즈
- **이미지**: 수평 뒤집기, 줌, 크롭, 밝기 변화
- **객체 탐지**: FOMO는 수평 뒤집기, 회전 등 지원

### 7.2 전이 학습 (Transfer Learning)

**이미지 분류:**
| 모델 | 입력 크기 | 특징 |
|-----|----------|------|
| MobileNetV1 96x96 0.25 | 96x96 | 가장 작고 빠름 |
| MobileNetV1 0.5 | 96x96 | 중간 균형 |
| MobileNetV2 96x96 | 96x96 | 더 정확 |
| FOMO MobileNetV2 0.35 | 96x96 | 객체 탐지용 |
| SSD MobileNetV2 | 320x320 | 높은 정확도 |

**키워드 스포팅:**
- DSCNN (Depthwise Separable Convolutional Neural Network)

### 7.3 객체 탐지 (Object Detection)

| 모델 | 특징 | 적합한 환경 |
|-----|------|------------|
| **FOMO** (Faster Objects, More Objects) | 초경량, MCU 실행 가능 | 제한된 리소스 |
| **MobileNetV2 SSD FPN** | 더 정확, 더 많은 리소스 | Linux, 고성능 MCU |
| **YOLO-Pro** | 최신 YOLO 아키텍처 | GPU, NPU 가속 |

### 7.4 Expert Mode (전문가 모드)

Keras에 익숙하다면 **Expert Mode** 전환으로:
- 사용자 정의 아키텍처 (Functional API)
- 손실 함수 변경 (`categorical_crossentropy`, `mse` 등)
- 옵티마이저 변경 (`Adam`, `SGD` 등)
- Early stopping, ModelCheckpoint 콜백
- 학습률 스케줄링

---

## 8. EON Tuner

### 8.1 개요

EON Tuner는 주어진 하드웨어 자원 제약 내에서 최적의 Impulse 구성을 **자동 탐색**합니다.

**특징:**
- DSP 특성 추출 + 모델 하이퍼파라미터 동시 최적화
- 대상 디바이스의 RAM, ROM, 추론 시간 고려
- 베이지안 최적화 알고리즘 사용 (이전 버전: 무작위 탐색)

### 8.2 설정

1. **Experiments → EON Tuner** 탭 이동
2. **New run** 버튼 클릭
3. 설정:
   - **Run name**: 실행 이름
   - **Compute time limit**: 최대 연산 시간
   - **Objectives (목표)**: `Accuracy` / `Latency` / `RAM` / `Flash` 우선순위 지정
   - **Search space (탐색 공간)**: 입력 블록, 처리 블록, 학습 블록 파라미터 범위 정의

### 8.3 결과 확인

- 각 Trial은 Impulse 구성 + 결과 (정확도, 지연 시간, RAM, Flash) 표시
- 필터/정렬: Trial 상태, 처리 블록, ML 모델 기준
- **Add** 버튼으로 실험 목록에 Trial 추가 가능
- **Extend search**로 추가 Trial 실행

---

## 9. 모델 테스트

**Model testing** 페이지에서 홀드아웃 테스트 데이터셋으로 모델 성능 평가:

| 지표 | 설명 |
|------|------|
| **Accuracy** | 전체 정확도 |
| **F1 score** | 클래스별 F1 점수 |
| **Confusion matrix** | 혼동 행렬 |
| **Precision / Recall** | 정밀도 / 재현율 |
| **Data Explorer** | 2D 특성 공간에서 분류 결과 시각화 |

> **Performance calibration**: 모델의 최적 임계값 찾기 (정밀도-재현율 트레이드오프)

---

## 10. 배포 (Deployment)

### 10.1 배포 옵션

| 옵션 | 설명 | 대상 |
|------|------|------|
| **C++ Library** | 독립형 C++ 라이브러리, 외부 의존성 없음 | 모든 MCU |
| **Arduino Library** | Arduino IDE 호환 라이브러리 | Arduino 보드 |
| **WebAssembly** | 브라우저 또는 Node.js에서 실행 | 웹 브라우저 |
| **Cube.MX CMSIS-PACK** | STM32CubeMX 통합 | STM32 MCU |
| **Linux .eim binary** | Linux C++ SDK 바이너리 | Linux (x86_64, ARM) |
| **Docker container** | HTTP 추론 서버 컨테이너 | 서버/게이트웨이 |
| **Pre-built firmware** | 즉시 사용 가능한 바이너리 | 공식 지원 보드 |
| **Zephyr Module** | Zephyr RTOS 통합 | Zephyr 지원 보드 |
| **TensorRT Library** | NVIDIA Jetson GPU 가속 | Jetson |

### 10.2 모델 최적화

**Deployment 페이지**에서 다음 옵션 선택 가능:

| 옵션 | 설명 |
|------|------|
| **Model version** | `Quantized (int8)` 또는 `Unoptimized (float32)` |
| **Compiler** | `TFLite` 또는 `EON Compiler` |
| **EON Compiler (RAM optimized)** | RAM 추가 절감 (Enterprise 전용) |

### 10.3 리소스 추정

배포 전 예상 리소스 확인:

```
┌───────────────┬──────────┬──────────┬──────────┐
│  Compiler     │ Latency  │  RAM     │  Flash   │
├───────────────┼──────────┼──────────┼──────────┤
│ TFLite        │   5 ms   │  8.8 KB  │ 462.5 KB │
│ EON Compiler  │   5 ms   │  6.2 KB  │ 411.1 KB │
│ EON (RAM opt) │   5 ms   │  3.8 KB  │ 520.3 KB │
└───────────────┴──────────┴──────────┴──────────┘
```

### 10.4 배포 파일 구조 (C++ Library 예시)

```
my_model_cpp/
├── src/
│   ├── model-parameters/     # 모델 가중치 및 파라미터
│   ├── tflite-model/         # TFLite flatbuffer
│   ├── edge-impulse/         # Edge Impulse 런타임
│   └── sensors/              # 센서 드라이버 (선택)
├── CMakeLists.txt
├── Makefile
└── README.md
```

---

## 11. EON Compiler

### 11.1 개요

EON (Edge Optimized Neural) Compiler는 머신러닝 모델을 고효율 C++ 소스 코드로 컴파일합니다.

**주요 장점:**
- RAM 25~65% 절감
- Flash 10~35% 절감
- TFLite와 동일한 정확도
- 더 빠른 추론

### 11.2 동작 방식

```
TFLite Flatbuffer → EON Compiler (서버 측) → .cpp + .h 파일
```

- 서버가 Flatbuffer 읽기, 그래프 구성, 메모리 할당 계획 수행
- 생성된 C++는 Init/Prepare/Invoke 함수만 포함
- 디바이스 부담 최소화

### 11.3 지원 연산자

TFLite Micro 연산자의 서브셋을 지원:
- Conv2D, DepthwiseConv2D
- FullyConnected (Dense)
- MaxPool2D, AveragePool2D
- Softmax, ReLU, Tanh
- Add, Mul, Concatenation
- Reshape, Transpose 등

> 전체 연산자 매트릭스: https://docs.edgeimpulse.com/studio/projects/deployment/eon-compiler-operator-matrix-2-19

### 11.4 제한 사항

| 제한 | 설명 |
|------|------|
| **지원되지 않는 연산자** | 특정 복잡 연산자 사용 시 EON Compiler 비활성화 |
| **Residual layers** | MobileNet 스타일 잔차 연결만 지원 |
| **RAM optimized** | 특정 아키텍처에서만 활성화 가능 |

---

## 12. Python SDK

### 12.1 설치

```bash
python -m pip install edgeimpulse
```

### 12.2 기본 사용법

```python
import edgeimpulse as ei

# API 키 설정 (Dashboard → Keys)
ei.API_KEY = "ei_dae27..."

# 1. 프로파일링 가능 디바이스 확인
devices = ei.model.list_profile_devices()
print(devices)
# ['alif-he', 'cortex-m4f-80mhz', 'cortex-m7-216mhz', 'espressif-esp32', ...]

# 2. 모델 프로파일링
profile = ei.model.profile(
    model=my_keras_model,  # Keras Model / TFLite / ONNX / SavedModel
    device='cortex-m4f-80mhz'
)
print(profile.summary())

# 세부 정보 접근
print(f"RAM: {profile.model.profile_info.float32.memory.tflite.ram}")
print(f"ROM: {profile.model.profile_info.float32.memory.tflite.rom}")
print(f"Latency: {profile.model.profile_info.float32.time_per_inference_ms}ms")

# 3. 배포
deploy_result = ei.model.deploy(
    model=my_keras_model,
    model_input_type=ei.model.input_type.OtherInput(),
    model_output_type=ei.model.output_type.Classification(),
    deploy_target='zip',  # 'zip', 'arduino', 'cubemx', 'wasm', ...
    output_directory='.'
)

# 4. 양자화 포함 배포
import numpy as np

# 대표 데이터 샘플 (numpy array, shape = model input shape)
representative_data = np.random.randn(100, 96, 96, 3)

ei.model.deploy(
    model=my_keras_model,
    model_output_type=ei.model.output_type.Classification(),
    representative_data_for_quantization=representative_data,
    output_directory='.'
)
```

### 12.3 지원 입력 형식

| 형식 | 설명 |
|------|------|
| **Keras Model** | `tf.keras.Model` 인스턴스 |
| **TensorFlow SavedModel** | 디렉토리 또는 ZIP 경로 |
| **TFLite** | `.lite` 또는 `.tflite` 파일 (메모리에서 직접 가능) |
| **ONNX** | ONNX 모델 (PyTorch → `torch.onnx.export()` 필요) |

### 12.4 배포 타겟 목록

```python
ei.model.list_deployment_targets()
# ['zip', 'arduino', 'cubemx', 'wasm', 'runner-linux-x86_64', 
#  'jetson-tensorrt', 'zephyr', ...]
```

> **참고:** `model_input_type`과 `model_output_type`에 따라 사용 가능한 타겟이 달라짐.

---

## 13. API 참조

### 13.1 Studio API

- 엔드포인트: https://studio.edgeimpulse.com/v1/api
- 용도: 프로젝트 생성, 데이터 관리, 학습 트리거, 배포 자동화
- 인증: API Key (헤더: `x-api-key`)

### 13.2 Ingestion API

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/training/files` | 학습 데이터 업로드 |
| `POST /api/testing/files` | 테스트 데이터 업로드 |
| `POST /api/validation/files` | 검증 데이터 업로드 (명시적 검증셋 활성화 시) |
| `POST /api/split/files` | 자동 분할 업로드 (프로젝트 설정 비율 기준) |

**헤더:**
| 헤더 | 설명 |
|------|------|
| `x-api-key` | API 키 (필수) |
| `x-label` | 라벨 (선택, 미지정 시 파일명에서 추론) |
| `x-metadata` | 메타데이터 JSON (선택) |
| `x-disallow-duplicates` | 중복 검사 (선택) |

**응답 코드:**
| 코드 | 의미 |
|------|------|
| 200 | 저장 성공 |
| 400 | 잘못된 요청 |
| 401 | API 키 누락 또는 무효 |
| 500 | 서버 오류 |

### 13.3 Python API Bindings

```python
# edgeimpulse-api 패키지 (SDK 설치 시 자동 포함)
from edgeimpulse_api import ProjectsApi, ApiClient

# Studio API의 모든 기능을 Python 메서드로 호출 가능
# 참고: https://docs.edgeimpulse.com/tools/libraries/api-bindings/studio/python
```

---

## 14. 하드웨어 지원

### 14.1 공식 지원 보드

**MCU 보드:**

| 제조사 | 보드 |
|--------|------|
| Arduino | Nano 33 BLE Sense, Nicla Vision, Portenta H7, Nicla Voice |
| Espressif | ESP-EYE, ESP32-S3 |
| STMicroelectronics | STM32N6570-DK, B-L475E-IOT01A |
| Nordic Semi | nRF52840 DK, nRF5340 DK, nRF54L15 DK |
| Raspberry Pi | Pico, Pi 4, Pi 5 |
| Seeed | Wio Terminal, XIAO nRF52840 Sense, XIAO ESP32S3 Sense |
| SparkFun | Artemis, Edge |
| SiLabs | Thunderboard Sense 2, xG24 Dev Kit |

**Linux 보드:**

| 제조사 | 보드 |
|--------|------|
| NVIDIA | Jetson (전 모델) |
| Raspberry Pi | Pi 4, Pi 5 |
| Qualcomm | RB3 Gen 2, IQ-8275, IQ-9075 |
| Renesas | RZ/V2L, RZ/V2H |
| TI | SK-AM62, SK-TDA4VM |
| Seeed | reComputer Jetson |

**NPU/가속기:**
- Alif Ensemble
- Arm Ethos-U
- BrainChip AKD1000 (Neuromorphic)
- Himax WE-I Plus, WiseEye2
- MemryX MX3
- Syntiant TinyML Board
- Synaptics Katana EVK

### 14.2 배포 런타임

| 런타임 | 설명 |
|--------|------|
| **C++ library** | 모든 MCU, 커스텀 보드, 데스크톱, Android |
| **Arduino library** | Arduino IDE 2.0 / 1.18 |
| **Linux EIM** | Edge Impulse for Linux SDK |
| **WebAssembly** | 브라우저 및 Node.js |
| **Docker** | HTTP 추론 서버 |
| **Zephyr Module** | Zephyr RTOS 통합 |
| **OpenMV** | OpenMV 카메라 |
| **Cube.MX CMSIS-PACK** | STM32CubeMX |

---

## 15. 자주 묻는 질문

### Q1: 무료 플랜으로 얼마나 많은 데이터를 사용할 수 있나요?

Developer 플랜은 제한된 데이터 용량을 제공합니다. 정확한 수치는 https://edgeimpulse.com/pricing 참조.

### Q2: 학습된 모델을 내 하드웨어에서 어떻게 실행하나요?

1. **Deployment** 페이지에서 대상에 맞는 라이브러리 선택
2. 빌드 및 다운로드
3. 해당 플랫폼 가이드에 따라 통합:
   - MCU: https://docs.edgeimpulse.com/hardware/deployments/run-cpp
   - Arduino: https://docs.edgeimpulse.com/hardware/deployments/run-arduino-2-0
   - Linux: https://docs.edgeimpulse.com/hardware/deployments/run-linux-eim

### Q3: EON Compiler와 TFLite의 차이는?

EON Compiler가 RAM 25~65%, Flash 10~35% 더 적게 사용하며, 정확도는 동일합니다.

### Q4: 양자화(int8)를 사용하면 정확도가 떨어지나요?

일반적으로 약간의 정확도 감소가 있을 수 있습니다. 모델 테스트로 float32와 int8의 정확도를 비교한 후 결정하세요.

### Q5: 내 모델이 타겟 디바이스에 맞을지 어떻게 확인하나요?

1. **Target device** 설정
2. **EON Tuner**로 최적 구성 탐색
3. **Deployment** 페이지에서 리소스 추정 확인
4. Python SDK의 `profile()` 함수로 프로그래밍 방식 확인

### Q6: CLI 도구는 어떻게 설치하나요?

```bash
npm install -g edge-impulse-linux
edge-impulse-linux
edge-impulse-daemon
edge-impulse-run-impulse
```

### Q7: Edge Impulse Studio의 UI가 이전과 다른데요?

2025-2026년에 걸쳐 UI가 대폭 업데이트되었습니다:
- **Data Acquisition** → 여러 탭으로 분할 (Dataset, Data Explorer, Data Sources 등)
- **EON Tuner** → 베이지안 최적화 도입, UI 개선
- **Deployment** → 검색 기반 선택 UI, 모델 최적화 옵션 통합
- **새로운 기능**: EON Compiler (RAM optimized), YOLO-Pro, Zephyr Module 등

최신 정보는 항상 공식 문서(https://docs.edgeimpulse.com/)를 참조하세요.

---

## 참고 링크

| 리소스 | URL |
|--------|-----|
| 공식 문서 | https://docs.edgeimpulse.com/ |
| Python SDK PyPI | https://pypi.org/project/edgeimpulse/ |
| 포럼 | https://forum.edgeimpulse.com |
| Discord | https://discord.gg/edgeimpulse |
| GitHub | https://github.com/edgeimpulse |
| 요금제 | https://edgeimpulse.com/pricing |
| 프로젝트 예제 | https://edgeimpulse.com/projects/overview |
| 튜토리얼 | https://docs.edgeimpulse.com/tutorials |
