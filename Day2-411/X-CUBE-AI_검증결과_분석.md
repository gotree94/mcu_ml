# X-CUBE-AI "Validate on target" 결과 분석

> 분석 폴더: `C:\Users\user\.stm32cubemx\network_output`
> 분석 일시: 2026-11-20
> 대상 보드: STM32F411xC/E @ 100 MHz (Device ID 0x431)
> 검증 방식: `validate --mode target --desc serial:115200` (UART COM6)

---

## 1. 이 폴더는 무엇인가

STM32CubeMX의 **"Validate on target"** 기능이 만들어낸 검증 결과입니다.
PC에서 모델을 시뮬레이션한 것이 아니라, **실제 MCU에 검증용 펌웨어를 올리고
시리얼(UART)로 입력을 보내 추론 결과를 회신받은 기록**입니다.

근거 (리포트 3행, 131~151행):

```text
Parameters : validate ... --mode target --desc serial:115200
Running the ST.AI c-model (AI RUNNER)...(name=network, mode=TARGET)
Proto-buffer driver v2.0 (msg v3.1) (Serial driver v1.0 - COM6:115200)
runtime lib : v10.1.0-ae536891 compiled with GCC 12.3.1 (GCC)
device.desc : stm32 family - 0x431 - STM32F411xC/E @100/100MHz
```

즉 PC(ST Edge AI Core 2.2.0) ↔ MCU(AI runner + proto-buffer UART 드라이버) 구조로
통신하며, 벤치마크용 CPU 사이클까지 측정했습니다.

---

## 2. 파일 구성 (12개)

| 파일 | 크기 | 의미 |
|---|---:|---|
| `network_validate_report.txt` | 23,887 B | 검증 전체 리포트 (명령어, 모델 구조, 프로파일링, 정확도) |
| `network_c_info.json` | 29,416 B | 생성 모델 메타데이터 + 검증 메트릭 (재생성됨) |
| `network_val_io.npz` | 16,914 B | 입·출력 묶음 (아래 4개 배열 포함) |
| `network_val_c_inputs_1.npy` | 7,968 B | C 모델(타깃 MCU)로 보낸 입력 |
| `network_val_m_inputs_1.npy` | 7,968 B | 원본 모델(PC)에 넣은 입력 |
| `network_val_c_outputs_1.npy` | 228 B | MCU가 회신한 출력 |
| `network_val_m_outputs_1.npy` | 228 B | PC 참조 모델의 출력 |
| `network_val_c_inputs_1.csv` | 282 B | C 입력의 헤더 정보 (데이터는 용량 초과로 생략) |
| `network_val_m_inputs_1.csv` | 262 B | M 입력의 헤더 정보 |
| `network_val_c_outputs_1.csv` | 2,792 B | MCU 출력 10행 (10샘플 × 10클래스) |
| `network_val_m_outputs_1.csv` | 2,766 B | 참조 모델 출력 10행 |
| `LICENSE.txt` | 10,708 B | ST 소프트웨어 라이선스 SLA0104 Rev1/June 2024 |

> CSV의 `Note: w/o data, number of item by sample is exceeded: 784 > 512`는
> 샘플당 원소가 784개로 CSV 표시 한도(512)를 넘어 값을 생략했다는 뜻입니다.
> 실제 데이터는 `.npy` / `.npz`에 온전히 들어 있습니다.

---

## 3. 검증 입력 데이터

```text
generating random data, size=10, seed=42, range=(0, 1)
I[1]: (10, 28, 28, 1)/float32, min/max=[0.000012, 0.999718], mean/std=[0.495359, 0.288935]
c/I[1] conversion [Q(0.00392157,-128)] -> int8, min/max=[-128, 127], mean/std=[-1.680740, 73.678841]
no output/reference samples are provided
```

- **10개 샘플**, 난수 시드 42, 값 범위 0~1의 **무작위 노이즈 이미지**입니다.
- 실제 MNIST 손글씨 이미지가 아닙니다. (참조 출력은 PC에서 TFLite 모델을 돌려 얻음)
- 입력 양자화: scale `0.003921569`, zero-point `-128` → int8
- C 입력과 M 입력은 **비트 단위로 동일**함을 확인했습니다 (`np.array_equal = True`).

---

## 4. 최종 비교 결과

### 4.1 출력값 일치 여부 (직접 확인)

`network_val_io.npz`를 Python으로 읽어 검증한 결과:

```text
m_outputs_1 : (10, 10)       int8     (PC 참조 모델)
c_outputs_1 : (10, 1, 1, 10) int8     (MCU 결과)
형상 재배열 후 완전 일치: True
최대 절대 오차: 0
예시(샘플 0): [-128,-128,-128, 127,-128,-128,-128,-128,-128,-128]
=> 3번 클래스가 최고값
```

- 10개 샘플 전부 **argmax = 3** (C 모델과 참조 모델 모두 동일)
- 혼동행렬도 `C3 → 10개`, 나머지 0으로 완전 일치

### 4.2 메트릭 (리포트 200행, JSON `validation` 섹션)

| 지표 | 값 |
|---|---|
| Accuracy (X-cross #1) | **100.00%** |
| RMSE | 0.000000000 |
| MAE | 0.000000000 |
| L2 relative error | 0.000000000 |
| Mean / Std error | 0.000000 / 0.000000 |
| NSE / Cosine similarity | 1.000000 / 1.000000 |
| `val_error` | 0.0 |

**결론: MCU에서 실행된 C 모델의 출력이 PC의 원본 TFLite 모델 출력과 완전히 동일합니다.**
양자화 변환 과정에서 정확도 손실이 없었음을 의미합니다.

---

## 5. 실시간 성능 프로파일링

```text
nb sample(s)   : 10
duration       : 3.067 ms / sample (min 3.066 / max 3.068 / std 0.001)
macc           : 109,536
cycles/MACC    : 2.80
CPU cycles     : 306,744
used stack/heap: not monitored / 0 bytes
```

| c_id | 레이어 | 시간 | 비율 | CPU 사이클 |
|---:|---|---:|---:|---:|
| 0 | Dense (gemm_4) | 2.716 ms | 88.5% | 271,561 |
| 1 | Dense (gemm_5) | 0.277 ms | 9.0% | 27,700 |
| 2 | Dense (gemm_6) | 0.034 ms | 1.1% | 3,425 |
| 3 | Softmax (nl_7) | 0.041 ms | 1.3% | 4,058 |
| | **합계** | **3.067 ms** | 100% | **306,744** |

- 1번 레이어(128→64 Dense)가 전체 시간의 **88.5%**를 차지합니다.
- 연산 타입: `smul_s8_s8` 109,386회(99.9%), `op_s8_s8` 150회(0.1%).
- 약 **326회/초** 추론이 가능한 수준입니다 (단순 계산: 1000 / 3.067).

---

## 6. 모델 및 메모리 정보 (리포트 기준)

| 항목 | 값 |
|---|---:|
| 원본 모델 | `mnist_int8_quantized.tflite` (118,304 B) |
| 모델 해시 | `0x9ad3759281428d97c396640a746dee61` (MD5 일치 확인) |
| C 모델명 | `network` |
| 입력 | `int8(1×28×28×1)`, 784 B, QLinear(s=0.003921569, zp=-128) |
| 출력 | `int8(1×10)`, 10 B, QLinear(s=0.003906250, zp=-128) |
| 파라미터 | 109,386개 (107.41 KiB) |
| 가중치(FLASH) | 109,992 B |
| 활성화(RAM) | 3,760 B |
| MACC | 109,536 |
| 생성 시각 | 2026-11-20T15:16:03+0900 (`network_c_info.json`) |

> 검증 명령의 모델 경로는 `C:/Users/user/mnist_int8_quantized.tflite`이며,
> 최초 코드 생성 시 사용한 `C:/mnist_int8_quantized.tflite`와 **MD5가 동일**합니다.
> 즉 같은 모델로 생성·검증이 이루어졌습니다.

---

## 7. 최종 결론

1. **검증 성공.** STM32F411 보드에서 실행한 결과가 PC 참조 모델과 10개 샘플 모두
   완전 일치(정확도 100%, RMSE 0)했습니다. 변환 및 런타임 동작은 정상입니다.
2. **성능.** 추론 1회당 약 3.07 ms, 30만 사이클. 병목은 첫 Dense 레이어입니다.
3. **메모리.** FLASH 약 110 KB(가중치), RAM 3.76 KB(활성화)로 F411RETx에서 충분히 여유 있습니다.

### 반드시 유의할 점

- 이 `100%`는 **"MCU 출력 == PC 참조 모델 출력"**이라는 위상 일치 지표입니다.
  실제 MNIST 테스트셋에 대한 분류 정확도(**예: 98% 같은 수치**)가 아닙니다.
- 입력이 **랜덤 데이터**이므로 모든 샘플의 argmax가 3으로 동일합니다.
  숫자 0~9를 실제로 구분할 수 있는지 보여주는 결과는 아닙니다.
- 검증은 **전용 검증 펌웨어(AI runner + 시리얼 프로토콜)**로 수행되었습니다.
  현재 프로젝트의 `main.c` / 센서 코드가 실행된 것이 아니며,
  아직 `MX_X_CUBE_AI_Process()`도 호출되지 않습니다.
- 따라서 실제 애플리케이션에서 카메라/이미지 → 28×28 int8 전처리 →
  `ai_network_run()` → 결과 출력까지 연결하는 작업은 별도로 필요합니다.

---

## 8. 다음 단계 제안

- [ ] 실제 MNIST 테스트 이미지 10~100개를 `network_val_*` 대신 넣어 정확도 재측정
- [ ] `acquire_and_process_data()`에 이미지 전처리(28×28 그레이, scale/zp 양자화) 구현
- [ ] `post_process()`에서 argmax digit 출력 (UART 등)
- [ ] `MX_X_CUBE_AI_Process()`를 태스크 또는 메인 루프에서 호출
- [ ] CubeIDE Clean → Rebuild 후 실제 펌웨어에서도 동일 출력/지연 시간 확인
