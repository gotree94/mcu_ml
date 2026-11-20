# X-CUBE-AI 생성 코드 분석 (F411_LAB)

> 분석 대상: `C:\Users\user\F411_LAB\X-CUBE-AI`
> 분석 일시: 2026-11-20
> 모델 원본: `C:\mnist_int8_quantized.tflite`

---

## 1. 개요

STM32CubeMX에서 X-CUBE-AI 10.2.1을 통해 MNIST int8 양자화 모델을 변환하여
STM32F411(Cortex-M4)용 C 코드를 생성한 결과입니다.

| 항목 | 값 |
|---|---|
| 생성 C 모델명 | `network` |
| 원본 모델명 | `mnist_int8_quantized` |
| 모델 해시 (MD5) | `9AD3759281428D97C396640A746DEE61` |
| 변환 도구 | ST Edge AI Core v2.2.0-20266 |
| 타깃 | `stm32f4` (Cortex-M4, GCC) |
| 압축 | 없음 (`--compression none`) |
| 생성 시각 | 2026-11-20T14:43:45+0900 |

**모델 구조**

```
28×28×1 입력 → Reshape → Dense(128) → Dense(64) → Dense(10) → Softmax
```

- 입력: `int8`, 784 bytes (`1×28×28×1`)
- 출력: `int8`, 10 bytes (`1×10`)
- 연산량: 109,536 MACC
- 노드 수: 4 (Dense ×3 + Softmax ×1)

---

## 2. 생성 폴더 구조

`C:\Users\user\F411_LAB\X-CUBE-AI` 전체: **2개 폴더, 11개 파일, 약 360 KiB**

```
X-CUBE-AI/
├── constants_ai.h                  1,005 B   (비어 있는 상수 헤더)
└── App/
    ├── app_x-cube-ai.c             6,089 B   (CubeMX 앱 글루 코드)
    ├── app_x-cube-ai.h             1,168 B   (진입점 선언)
    ├── network.c                  27,859 B   (신경망 그래프 구현)
    ├── network.h                   9,362 B   (공개 API/형상 정의)
    ├── network_config.h            1,553 B   (버전/호환성 매크로)
    ├── network_data.c              3,518 B   (버퍼 맵 바인딩)
    ├── network_data.h              2,331 B   (파라미터 접근 선언)
    ├── network_data_params.c     297,682 B   (가중치 C 배열 ← 최대 용량)
    ├── network_data_params.h       1,768 B   (메모리 크기 정의)
    └── network_generate_report.txt 18,608 B   (생성 리포트)
```

원본 `.tflite`는 프로젝트 안에 없고 `C:\` 루트에 있습니다.
프로젝트에는 변환된 가중치가 C 배열로 포함되어 있습니다.

---

## 3. 파일별 역할

### 3.1 앱 진입점 — `App/app_x-cube-ai.c/.h`

CubeMX가 생성하는 사용자 템플릿으로, `main.c`와 생성된 네트워크 API 사이를 연결합니다.

```c
void MX_X_CUBE_AI_Init(void);      // 초기화
void MX_X_CUBE_AI_Process(void);   // 추론 루프
```

내부 구성:

- 활성화 버퍼: `AI_ALIGNED(32) static uint8_t pool0[3760]`
- `ai_boostrap()` → `ai_network_create_and_init()` 호출 (※ 오타는 생성 코드 원래 표기)
- `ai_run()` → `ai_network_run()` 호출, 반환 배치 수가 1인지 검사
- `acquire_and_process_data()` / `post_process()` → **빈 스텁 (`return 0`)**

### 3.2 네트워크 정의 — `App/network.h/.c`

`network.h`에 모델 정의가 집중되어 있습니다.

```c
#define AI_NETWORK_MODEL_NAME        "network"
#define AI_NETWORK_ORIGIN_MODEL_NAME "mnist_int8_quantized"
#define AI_NETWORK_IN_1_FORMAT       AI_BUFFER_FORMAT_S8
#define AI_NETWORK_IN_1_SIZE         (784)
#define AI_NETWORK_OUT_1_FORMAT      AI_BUFFER_FORMAT_S8
#define AI_NETWORK_OUT_1_SIZE        (10)
```

`network.c`에는 텐서 배열, 양자화 파라미터, 레이어 정의가 들어 있습니다.

| 레이어 | 타입 | 함수 | 출력 |
|---|---|---|---|
| `gemm_4` | Dense | `forward_dense_integer_SSSA_ch` | 128 |
| `gemm_5` | Dense | `forward_dense_integer_SSSA_ch` | 64 |
| `gemm_6` | Dense | `forward_dense_integer_SSSA_ch` | 10 |
| `nl_7` | Softmax | `forward_sm_integer` | 10 |

양자화 예시: 입력 scale `0.003921568859368563`, zero-point `-128` /
최종 출력 scale `0.00390625`, zero-point `-128`. 가중치는 per-channel scale로 저장됩니다.

### 3.3 가중치 저장 — `App/network_data_params.c`

```c
AI_ALIGNED(32)
const ai_u64 s_network_weights_array_u64[13749] = { ... };
```

- 13,749 × 8 bytes = **109,992 bytes**, `const` + 32-byte 정렬 → FLASH(rodata)
- 가중치/바이어스 오프셋은 `network_configure_weights()`에서 지정

| 파라미터 | 오프셋 |
|---|---:|
| `gemm_4_weights` | 0 |
| `gemm_4_bias` | 100,352 |
| `gemm_5_weights` | 100,864 |
| `gemm_5_bias` | 109,056 |
| `gemm_6_weights` | 109,312 |
| `gemm_6_bias` | 109,952 |

### 3.4 데이터 바인딩 — `network_data.c/.h`

`ai_network_data_params_get()`이 가중치 맵과 활성화 맵을
`ai_platform_bind_network_params()`로 런타임에 묶어줍니다.

```c
ai_bool ai_network_data_params_get(ai_network_params* params);
```

### 3.5 리포트 — `network_generate_report.txt`

실제 실행된 명령어, 메모리 추정치, 생성 파일 MD5 서명이 기록되어 있습니다.

---

## 4. 메모리 사용량

| 항목 | 크기 |
|---|---:|
| 가중치 (FLASH) | 109,992 B (107.41 KiB) |
| 활성화 (RAM) | 3,760 B (3.67 KiB) |
| 런타임 RAM | 2,008 B |
| **모델 RAM 합계** | **5,768 B** |
| **FLASH/ro 총계 (리포트 추정)** | **124,491 B** |

> `.ioc`의 `ActivationBufferSizeList=5768`은 실제 활성화 풀(3,760)이 아니라
> 모델 RAM 전체(5,768)를 가리키는 것으로 보입니다. 명명이 혼동스럽습니다.

---

## 5. 주요 API

**애플리케이션 계층**

- `MX_X_CUBE_AI_Init()`, `MX_X_CUBE_AI_Process()`
- `acquire_and_process_data()`, `post_process()` (사용자 구현 필요)

**생성된 네트워크 API**

- `ai_network_create()` / `ai_network_create_and_init()`
- `ai_network_init()` / `ai_network_destroy()`
- `ai_network_run()` / `ai_network_forward()`
- `ai_network_inputs_get()` / `ai_network_outputs_get()`
- `ai_network_get_error()` / `ai_network_get_report()`

**런타임 계층** (`Middlewares/ST/AI`)

- `ai_platform_network_create/init/post_init/process`
- `ai_platform_inputs_get()`, `ai_platform_outputs_get()`
- `ai_platform_bind_network_params()`
- `NetworkRuntime1020_CM4_GCC.a` (958,490 B), 헤더 93개

> `ai_init()`이라는 함수는 없습니다. 가장 가까운 것은
> `MX_X_CUBE_AI_Init()`, `ai_network_create_and_init()`, `ai_network_init()`입니다.

---

## 6. STM32Cube 프로젝트 통합 상태

| 파일 | 상태 |
|---|---|
| `F411_LAB.ioc` | X-CUBE-AI 10.2.1 설정, 모델 경로/압축/MACC/메모리 기록됨 |
| `.cproject` | `X-CUBE-AI/App`, `Middlewares/ST/AI/Inc` 포함 경로 / `NetworkRuntime1020_CM4_GCC.a` 링크 |
| `.mxproject` | 생성 파일 목록에 AI 앱 소스/헤더 등록 |
| `Core/Inc/RTE_Components.h` | `#define AI_ApplicationTemplate` |
| `Core/Src/main.c` | `#include "app_x-cube-ai.h"` 및 `MX_X_CUBE_AI_Init()` 호출 |
| `.ai/.ldupdatedone` | 링커 스크립트 갱신 마커 (0 B) |
| `STM32F411RETX_FLASH.ld` | Heap/Stack 각각 `0x800` (IOC 설정과 일치) |

---

## 7. 확인된 문제점 및 후속 작업

1. **`MX_X_CUBE_AI_Process()` 미호출**
   `main.c`는 초기화만 하고 추론은 실행하지 않습니다. 현재 FreeRTOS 태스크는
   센서/DHT 초음파 및 UART 출력용이며 MNIST 입력과 무관합니다.

2. **데이터 후킹 함수가 비어 있음**
   `acquire_and_process_data()`와 `post_process()`가 `return 0`만 합니다.
   실제 이미지 획득 → 28×28 int8 전처리 → 결과 digit 출력 로직을 구현해야 합니다.

3. **`Debug/` 빌드 산출물이 오래됨**
   ELF 타임스탬프(10:50)가 AI 생성 시각(14:43)보다 빠르고,
   `objects.list` / `makefile`에 X-CUBE-AI 오브젝트가 없습니다.
   → CubeIDE에서 **Clean + Rebuild** 필요합니다.

4. **원본 모델이 프로젝트 밖에 있음**
   `C:\mnist_int8_quantized.tflite`가 삭제/이동되어도 빌드는 가능하지만,
   CubeMX에서 모델 재분석 시 경로가 깨집니다. 프로젝트 내부로 복사하는 것을 권장합니다.

5. **롱 패스 이슈 (초기 오류)**
   X-CUBE-AI 분석 단계에서 Windows 경로 길이 제한(260자) 오류가 발생했습니다.
   `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1` 설정이
   관리자 권한으로 필요했으며, 설정 후 CubeMX를 재시작해야 반영됩니다.

---

## 8. 다음 단계 체크리스트

- [ ] 관리자 PowerShell에서 `LongPathsEnabled = 1` 적용 확인
- [ ] `C:\mnist_int8_quantized.tflite`을 프로젝트 폴더로 복사 후 IOC 경로 갱신
- [ ] `acquire_and_process_data()`에 28×28 그레이스케일 → int8 변환 구현
- [ ] `post_process()`에 Softmax 결과(10클래스) 해석/UART 출력 구현
- [ ] `main.c` 또는 태스크에서 `MX_X_CUBE_AI_Process()` 호출 (1회 또는 주기적)
- [ ] CubeIDE Clean → Rebuild 후 ELF에 `network.o`, `network_data.o`, 런타임 라이브러리 포함 확인
- [ ] FLASH 사용량 ~124 KB, RAM ~5.8 KB가 STM32F411RETx 여유 범위 내인지 최종 확인
