# NUCLEO-F411RE + X-CUBE-AI MNIST 검증 가이드

PC에서 학습한 MNIST 모델을 TFLite로 변환한 뒤, STM32CubeMX의 X-CUBE-AI에서
`Validation on desktop` / `Validation in target`로 검증하는 절차.

> 대상 보드: NUCLEO-F411RE (STM32F411RE, 512 KB Flash / 128 KB RAM)
> 사용 모델: `mnist_int8_quantized.tflite` (입력 `(1, 28, 28, 1)`, int8)

---

## 1. 현재까지의 파이프라인

| 단계 | 스크립트 | 결과물 |
|---|---|---|
| 1. PC 학습 (float32) | `mnist_pc_train.py` | `mnist_pc_model.h5` |
| 2. TFLite 변환/양자화 | `mnist_to_tflite.py` | `mnist_float32.tflite`, `mnist_int8_quantized.tflite` |
| 3. PC 추론 비교 | `mnist_tflite_eval.py` | float32 vs int8 정확도/추론시간 비교 |
| 4. **검증 데이터 생성** | 아래 2절 코드 | `validation_float32.npz`, `validation_int8.npz` |
| 5. X-CUBE-AI 검증 | STM32CubeMX GUI | desktop / target 검증 결과 |

`mnist_to_tflite.py`는 calibration에 100장만 사용하고,
`mnist_tflite_eval.py`는 입력 scale/zero_point로 float → int8 변환을 수행합니다.
**X-CUBE-AI 검증 데이터도 반드시 같은 방식으로 전처리해야 합니다.**

---

## 2. 검증용 데이터 파일 만들기

X-CUBE-AI는 이미지 파일(PNG/JPG)을 직접 읽지 않습니다.
학습 때와 동일하게 전처리된 **텐서 배열(.npy/.npz, 또는 .csv)** 를 넣어야 합니다.

새 파일 `make_validation_data.py`를 만들어 아래를 실행하세요.

```python
import numpy as np
import tensorflow as tf

N = 200  # target 검증은 200~500개 권장 (10000개는 CubeMX가 멈출 수 있음)

(_, _), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x = x_test.astype(np.float32) / 255.0          # 학습 때와 동일: [0, 1]
y = np.eye(10, dtype=np.float32)[y_test]       # 정답은 one-hot (정수 라벨 미지원)

# --- Float32 모델용 ---
np.savez("validation_float32.npz", x_test=x[:N], y_test=y[:N])

# --- Int8 모델용: TFLite 입력 quantization 파라미터 적용 ---
interpreter = tf.lite.Interpreter(model_path="mnist_int8_quantized.tflite")
interpreter.allocate_tensors()

inp = interpreter.get_input_details()[0]
scale = inp["quantization_parameters"]["scales"][0]
zero_point = inp["quantization_parameters"]["zero_points"][0]

x_int8 = np.clip(np.round(x[:N] / scale + zero_point), -128, 127).astype(np.int8)
np.savez("validation_int8.npz", x_test=x_int8, y_test=y[:N])

print("입력 shape:", x_int8.shape, "dtype:", x_int8.dtype)
print("scale:", scale, "zero_point:", zero_point)
```

생성되는 `x_test`의 형태는 `(N, 28, 28, 1)`입니다.
TFLite 모델 입력이 NHWC이므로 채널이 마지막에 있어야 합니다.

### 주의할 점

- 툴은 리사이즈/정규화를 **하지 않습니다**. `/255`, int8 변환을 미리 끝내두세요.
- int8 모델에 float32 `[0, 1]` 데이터를 넣으면 검증이 실패하거나 의미 없는 결과가 나옵니다.
- `.npz`에 `x_test`와 `y_test`가 같이 있으면 **Validation inputs 칸에만** 지정하면 됩니다.
  (별도 `-vo`에 해당하는 Validation outputs는 비워도 됨)

---

## 3. STM32CubeMX 설정

1. **Board Selector**에서 `NUCLEO-F411RE` 선택 → 프로젝트 생성
2. **Software Packs → Select Components** 에서
   - `X-CUBE-AI: Core` 체크
   - **Device Application: `Validation` 체크** ← target 검증에 필수
   - 경고가 뜨면 `Resolve`를 눌러 의존성 설치 (최대 클럭 설정 적용)
3. **Pinout & Configuration → X-CUBE-AI** 메뉴 열기
4. **Add network** 클릭
   - Framework: `TFLite`
   - Model: `mnist_int8_quantized.tflite`
   - `Analyze` → 초록색 체크 확인 (메모리/Flash 사용량 확인)
5. net 탭(`network` 탭)에서
   - **Validation inputs**: `validation_int8.npz`
   - **Validation outputs**: 비움 (npz에 `y_test` 포함)
   - float32 모델을 검증할 때는 `validation_float32.npz`로 교체

> F411은 RAM이 128 KB뿐이므로 int8 모델 사용을 권장합니다.
> `mnist_to_tflite.py`에서 만든 int8 모델이 약 109 KB로 Flash에 들어갑니다.

---

## 4. Validation on desktop

- net 탭의 **Validation on desktop** 클릭
- 실제 보드 없이 **원본 TFLite 모델**과 **생성된 C 모델**에 같은 입력을 넣고 출력을 비교합니다.
- 확인 지표: `ACC` (분류 정확도), `RMSE`, `MAE`, `L2r` (상대 L2 오차)
- 보통 원본 대비 1% 이상 차이가 나면 Failure가 뜹니다.

실패 시 확인 순서:

1. 입력 dtype/shape 불일치 (int8 모델에 float 데이터를 넣지 않았는지)
2. 전처리 불일치 (`/255` 여부, 채널 순서)
3. unsupported operator → `mnist_int8_quantized.tflite`의 op 확인
4. 양자화 손실이 큰 경우 → calibration 데이터(100장)를 늘려 재양자화

---

## 5. Validation in target

### 사전 준비

- 보드를 USB로 PC에 연결 (ST-LINK VCP가 COM 포트로 잡혀야 함)
- 아래 두 방법 중 하나:
  - **Automatic compilation and download** 체크 → 툴체인(STM32CubeIDE/IAR/Keil) 선택 → OK
    (빌드 → 플래시 → 실행까지 자동)
  - 또는 `Generate Code` → IDE에서 빌드/플래시 → 보드 리셋 →
    `Validation on target` 클릭 (COM 포트 직접 선택 가능)

### 실행

1. `Validation on target` 클릭
2. COM 포트 자동 감지 또는 ST-LINK VCP 수동 선택
3. 결과 창/로그에서 확인:
   - 장치 ID, 클럭, 임베디드 네트워크 시그니처(모델 일치 여부)
   - 레이어별 추론 시간, CPU 사이클, Flash/RAM/스택/힙 사용량
   - 마지막 출력층에 대한 L2 에러

> 전송 속도 때문에 target 검증은 **최 출력층 기준** L2만 계산됩니다.
> 정확도(ACC)는 desktop에서 먼저 계산하고, target에서는 동작/성능 확인용으로 쓰세요.

---

## 6. 자주 나오는 문제

| 증상 | 원인 / 조치 |
|---|---|
| `number of data files is not enough` | 입력 개수가 모델 input 수와 다름. `.npy`/`.npz` 사용 확인 |
| Validation Failure (desktop) | 전처리 또는 dtype 불일치, 양자화 오차 |
| `no connected board / invalid firmware` | Validation 앱이 플래시되지 않음 → 보드 리셋 후 재시도 |
| `embedded model does not match the C model` | 다른 모델을 플래시함 → 다시 생성/플래시 |
| target 검증이 멈춤 | 샘플 수가 너무 많음 → `N=200` 정도로 줄임 |
| ACC가 이상하게 나옴 | int8 모델에 `y_test`로 one-hot 대신 TFLite 추론 결과(int8)를 저장해 비교해 볼 것 |

---

## 7. 이미지를 실시간으로 넣어보고 싶다면

이 검증 메뉴는 "파일 기반 배치 검증"입니다.
PC 카메라/이미지를 실시간으로 보내려면:

- `ai_runner` Python 모듈로 validation 앱의 UART 인터페이스에 데이터 주입
- 또는 직접 애플리케이션 작성 (이미지 캡처 → 전처리 → `ai_invoke()` → 결과 UART/Display)

참고로 2026년 현재 X-CUBE-AI는 **STM32Cube AI Studio**로 대체되는 추세이며,
Studio에서는 `.npz` / `.csv` 입력 데이터와 On host / On target 검증을 동일한 개념으로 지원합니다.

---

## 요약 체크리스트

- [ ] `mnist_pc_model.h5` → `mnist_int8_quantized.tflite` 생성 확인
- [ ] `validation_int8.npz` 생성 (int8 + scale/zero_point 적용, `(N,28,28,1)`)
- [ ] X-CUBE-AI Core + **Validation** 애플리케이션 활성화
- [ ] net 탭에 Validation inputs 지정 후 `Analyze`
- [ ] `Validation on desktop` 성공 (정확도 확인)
- [ ] 보드 연결 → `Validation on target` 성공 (동작/시간 확인)
