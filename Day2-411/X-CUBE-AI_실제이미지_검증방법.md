# X-CUBE-AI 실제 손글씨 이미지 검증 방법

> 작성 일시: 2026-11-20
> 대상: STM32F411 + `mnist_int8_quantized.tflite` (C 모델명 `network`)
> 도구: ST Edge AI Core v2.2.0-20266 (`stedgeai.exe`)

---

## 1. 기존 검증의 한계

이전 `network_output`의 "Validate on target" 결과는 **시드 42의 랜덤 노이즈 10장**을 사용했습니다.
따라서 `acc=100%`는 "MCU 출력 == PC 참조 모델 출력"이라는 상호 일치 지표일 뿐,
실제 숫자 판별 정확도(예: 97~98%)가 아니었습니다.

실제 MNIST 이미지를 넣으려면 `-vi/--valinput` 옵션으로 테스트 데이터를 제공하면 됩니다.

---

## 2. 검증 입력 파일 형식

`stedgeai validate --help` 및 공식 문서(`evaluation_metrics.html`) 확인 결과:

| 형식 | 규칙 |
|---|---|
| `.npy` | 단일 NumPy 배열, 형상 `(batch, -1)`. 로드 후 모델 입력 형상으로 자동 reshape |
| `.csv` | 한 줄 = 한 샘플, 쉼표 구분. 앞 5줄 주석에 `# dtype=int8` 또는 `# dtype=uint8` 태그. 없으면 float32로 해석 |
| `.npz` | 여러 배열. 키 쌍이 자동 인식됨: `x_test`/`y_test`, `inputs`/`outputs`, `in_0`/`out_0`, `m_inputs`/`m_outputs`, `m_inputs_1`/`m_outputs_1` 등 |
| `.pb` | TensorFlow TensorProto (`tf.make_tensor_proto`) |

관련 옵션:

```text
-vi / --valinput FILE       검증 입력 데이터 (지정하지 않으면 내부 랜덤 데이터)
-vo / --valoutput FILE      기대 출력(정답). npz에 입력/출력이 함께 있으면 생략 가능
-b  / --batch-size INT      사용할 샘플 수 (기본: 전체)
--classifier                ACC / 혼동행렬 강제 계산
--save-csv                  모든 입·출력 CSV로 저장
--seed, --range             랜덤 데이터 생성 시에만 적용
```

> 정답(ground truth)은 **one-hot** 형태여야 합니다. 정수 라벨은 지원되지 않습니다.
> 이전 검증처럼 정답이 없으면 PC의 원본 모델 출력을 참조로 삼아 X-cross metrics만 계산됩니다.
> 공식 문서도 검증 엔진은 학습/테스트 전체가 아니라 **대표성 있는 작은 부분집합**용이라고 명시합니다.

---

## 3. MNIST 테스트 데이터 만들기

이 PC에는 MNIST 데이터가 이미 캐시되어 있습니다: `C:\Users\user\.keras\datasets\mnist.npz`

```python
# make_mnist_val.py
import numpy as np

d = np.load(r'C:\Users\user\.keras\datasets\mnist.npz')
n = 100

# 모델 입력 기대값: float32 [0, 1] -> 도구가 자동으로 int8 양자화
x = d['x_test'][:n].astype(np.float32) / 255.0
# 정답은 one-hot
y = np.eye(10, dtype=np.float32)[d['y_test'][:n]]

np.savez(
    r'C:\Users\user\mnist_val.npz',
    x_test=x.reshape(-1, 28, 28, 1),
    y_test=y,
)
print('saved:', x.shape, y.shape)
```

실행:

```powershell
python make_mnist_val.py
```

---

## 4. 타깃 보드에서 검증 (Validate on target)

```powershell
& 'C:\Users\user\STM32Cube\Repository\Packs\STMicroelectronics\X-CUBE-AI\10.2.1\Utilities\windows\stedgeai.exe' validate `
  --target stm32f4 `
  --name network `
  -m C:/Users/user/mnist_int8_quantized.tflite `
  --compression none `
  --allocate-inputs --allocate-outputs `
  --mode target `
  --desc serial:COM6:115200 `
  -vi C:/Users/user/mnist_val.npz `
  -b 100 `
  --classifier `
  --verbosity 1
```

- `--desc serial:COM6:115200` → 이전 검증에서 사용한 포트/보드레이트와 동일
- 보드에는 **기존과 동일한 옵션(`--compression none` 등)으로 만든 검증 펌웨어**가 들어 있어야 합니다.
  옵션이 다르면 사전 체크에서 거부되며, 디버그 목적일 때만 `--no-check`로 완화할 수 있습니다.
- 결과물은 기본적으로 `C:\Users\user\.stm32cubemx\network_output\`에 다시 기록됩니다.

### CubeMX GUI에서 하는 경우

X-CUBE-AI 설정 화면의 **Validate on target** 패널에서
입력 데이터 항목에 위 `.npz` 파일을 지정한 뒤 검증을 실행하면 됩니다.
(CLI의 `-vi`와 동일한 기능)

---

## 5. 호스트 모드 사전 확인 (보드 없이)

보드 없이 데이터 형식과 정확도를 먼저 확인하려면:

```powershell
& '...\stedgeai.exe' validate `
  --target stm32 --name network `
  -m C:/Users/user/mnist_int8_quantized.tflite `
  --mode host `
  -vi C:/Users/user/mnist_val.npz `
  -b 100 --classifier --verbosity 1
```

---

## 6. 실제 시험 결과 (이 PC에서 수행)

임시로 MNIST 테스트 **20장**을 만들어 호스트 모드로 실행했습니다.

입력 처리 과정 (도구 로그):

```text
loading file: mnist_val_test.npz
  available entries: ['x_test', 'y_test']
  selected entries: x_test/y_test
  samples are reshaped: (20, 10) -> (20, 1, 1, 10)
  I[1]: (20, 28, 28, 1)/float32, min/max=[0.000000, 1.000000]
   c/I[1] conversion [Q(0.00392157,-128)]-> int8, min/max=[-128, 127]
   m/I[1] conversion [Q(0.00392157,-128)]-> int8, min/max=[-128, 127]
  O[1]: (20, 1, 1, 10)/float32, min/max=[0.000000, 1.000000]
```

→ float32 `[0,1]` 이미지를 넣으면 도구가 **입력 scale/zero-point로 자동 양자화**하여
C 모델과 원본 모델 양쪽에 동일하게 넣어줍니다. 별도 수동 int8 변환이 필요 없습니다.

결과:

| 지표 | 값 |
|---|---:|
| C 모델 정확도 (실제 정답 against) | **95.00%** (20/20 중 19개 정답) |
| 원본 모델 정확도 | **95.00%** |
| X-cross (C 모델 vs 원본 모델) | **100.00%**, RMSE 0 |

즉, 실제 손글씨에서도 C 모델은 원본 모델과 완전히 같은 출력을 내고,
정답 기준 정확도는 약 95%로 측정되었습니다. (표본이 20장이라 통계적 오차가 큼)

---

## 7. 정리

- 랜덤 데이터 검증: 변환 충실도(C 모델 == 원본 모델)만 확인
- **실제 이미지 검증**: `-vi`로 MNIST 데이터셋을 넣으면 정답 기준 진짜 정확도까지 확인 가능
- 데이터는 `x_test`/`y_test` NPZ가 가장 간단하며, float32 `[0,1]`로 주면 양자화는 도구가 처리
- 타깃 검증 시에는 보드의 검증 펌웨어 옵션과 CLI 옵션을 일치시킬 것
- 전체 10,000장 대신 대표성 있는 100~1,000장 정도 사용 권장 (도구も 작은 부분집합 권장)

---

## 8. 참고 파일/경로

| 항목 | 경로 |
|---|---|
| stedgeai 실행 파일 | `C:\Users\user\STM32Cube\Repository\Packs\STMicroelectronics\X-CUBE-AI\10.2.1\Utilities\windows\stedgeai.exe` |
| MNIST 원본 데이터 | `C:\Users\user\.keras\datasets\mnist.npz` |
| 기존 TFLite 모델 | `C:\Users\user\mnist_int8_quantized.tflite` |
| 검증 결과 기본 출력 | `C:\Users\user\.stm32cubemx\network_output` |
| 공식 문서 | `...\X-CUBE-AI\10.2.1\Documentation\evaluation_metrics.html` (Input validationFiles 항목) |
| ai_runner MNIST 예제 | `...\X-CUBE-AI\10.2.1\scripts\ai_runner\examples\mnist\readme.md` |
