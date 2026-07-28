# TinyML 핵심: 가중치 곱의 합(MAC) 연산부터 하드웨어 가속, RTOS 통합까지

> 작성일: 2026-07-20
> 범위: 신경망 기본 연산(MAC) → F4xx/F7xx/N6 세대별 하드웨어 가속 진화 → FreeRTOS 기반 OS 통합
> 이전 문서: `TinyML_역사와_마이크로컨트롤러_ML생태계.md` 의 후속/심화 자료

---

## 목차

1. 뉴런의 기본 연산: 가중치 곱의 합(MAC)
2. 순수 C 구현 (float → int8 양자화)
3. 레이어 단위 확장 (행렬-벡터 곱)
4. 하드웨어 진화 3단계: ONLY CPU → DSP/FPU → NPU
5. F4xx(M4) → F7xx(M7) → N6(M55+Neural-ART) 상세 비교
6. 실측 벤치마크 설계 (DWT 사이클 카운터)
7. OS/RTOS 관점: Bare-metal → FreeRTOS → 그 이상
8. FreeRTOS + NPU 통합 설계 패턴
9. Mbed OS EOL 이슈와 RTOS 선택 가이드
10. 커리큘럼 적용 로드맵 총정리

---

## 1. 뉴런의 기본 연산: 가중치 곱의 합(MAC)

모든 신경망 연산의 핵심은 **가중치 곱의 합(Weighted Sum)**, 즉 **곱-누산(Multiply-Accumulate, MAC)** 연산이다.

```
뉴런 하나의 출력:

    y = f( Σ(wᵢ · xᵢ) + b )
           i=1..n

    x₁ ─── w₁ ──┐
    x₂ ─── w₂ ──┤
    x₃ ─── w₃ ──┼──▶ Σ ──▶ +b ──▶ f(·) ──▶ y
     ⋮           │
    xₙ ─── wₙ ──┘

  x : 입력(이전 레이어 출력 or 센서값)
  w : 가중치(학습된 파라미터)
  b : 편향(bias)
  f : 활성화함수(ReLU, Sigmoid 등)
```

이 MAC 연산이 신경망 전체 연산량의 99% 이상을 차지하며, "AI 가속기"란 결국
**이 MAC을 얼마나 병렬로, 얼마나 낮은 전력으로 반복 처리하느냐**의 문제로 귀결된다.

---

## 2. 순수 C 구현 (float → int8 양자화)

### 2-1. float32 버전 (개념 이해용)

```c
float neuron_forward_f32(const float *x, const float *w, int n, float b)
{
    float acc = b;
    for (int i = 0; i < n; i++) {
        acc += w[i] * x[i];      // MAC 연산
    }
    return acc;
}

static inline float relu(float x) { return x > 0.0f ? x : 0.0f; }
```

### 2-2. 왜 MCU에서는 int8을 쓰는가 (양자화)

```
float32 (4바이트/값)          →      int8 (1바이트/값)
──────────────────────              ──────────────────────
메모리 4배 더 사용                    메모리 1/4로 절감
FPU 없으면 소프트웨어 에뮬레이션      정수 ALU만으로 처리 가능
연산당 전력 소비 큼                   연산당 전력 소비 작음
                                     (NPU가 INT8 MAC 전용으로 설계된 이유)

양자화 공식: q = round(r / scale) + zero_point
예: scale=0.05, zero_point=0, r=3.2 → q = round(3.2/0.05) = 64
```

### 2-3. int8 양자화 버전 (실전 MCU 코드 형태)

```c
#include <stdint.h>

int32_t neuron_forward_q8(const int8_t *x, const int8_t *w,
                           int n, int32_t bias)
{
    int32_t acc = bias;          // 누산기는 반드시 32비트 이상
    for (int i = 0; i < n; i++) {
        acc += (int32_t)w[i] * (int32_t)x[i];   // MAC
    }
    return acc;   // 이후 re-quantization 후 다음 레이어로 전달
}
```

**핵심**: 입력/가중치는 8비트로 줄이되, **누산기는 반드시 더 큰 비트폭(32비트)**을 사용해야
오버플로우를 방지할 수 있다 (127×127×256 ≈ 411만 → int8/int16 범위 초과).

---

## 3. 레이어 단위 확장 (행렬-벡터 곱)

```
      W (m x n 가중치 행렬)         x (n x 1 입력벡터)      y (m x 1 출력벡터)

  ┌ w11 w12 w13 ... w1n ┐     ┌ x1 ┐              ┌ y1 ┐
  │ w21 w22 w23 ... w2n │  ×  │ x2 │      =       │ y2 │
  │  ⋮                   │     │ x3 │              │  ⋮  │
  └ wm1 wm2 wm3 ... wmn ┘     │  ⋮  │              └ ym ┘
                               └ xn ┘

  각 yⱼ = Σᵢ(wji · xi) + bj   ← 뉴런 하나의 연산이 m번 반복
```

```c
void dense_layer_q8(const int8_t *x, const int8_t *W, const int32_t *bias,
                     int32_t *y, int m, int n)
{
    for (int j = 0; j < m; j++) {              // 출력 뉴런 m개 순회
        int32_t acc = bias[j];
        const int8_t *w_row = &W[j * n];
        for (int i = 0; i < n; i++) {
            acc += (int32_t)w_row[i] * (int32_t)x[i];   // MAC
        }
        y[j] = acc;
    }
}
// 총 연산량 = m x n 번의 MAC → "GOPS(Giga Ops/sec)" 스펙의 근거
```

---

## 4. 하드웨어 진화 3단계: ONLY CPU → DSP/FPU → NPU

```
1세대: ONLY CPU (정수 ALU만)
──────────────────────────────────────
Cortex-M0 / M0+ / M1 / M3
  - 순수 정수 연산, MAC도 1개씩 순차 처리
  - float은 소프트웨어 에뮬레이션 (매우 느림)

2세대: DSP 확장 추가 (SIMD + MAC 명령어)
──────────────────────────────────────
Cortex-M4 ★ 핵심 분기점
  - DSP 명령어 세트 추가: SMLAD(듀얼 MAC), SIMD 등
  - 옵션으로 FPU(단정밀도) 탑재 가능 (M4F)
Cortex-M7
  - DSP + FPU(단/배정밀도) 모두 기본 강화, 캐시 내장

3세대: micro-NPU 결합 (CPU 옆에 별도 가속기)
──────────────────────────────────────
Cortex-M33/M55 + Ethos-U55/U65/U85
  - M55는 Helium(MVE, 벡터 DSP 확장)까지 추가
  - CPU는 "제어+전/후처리", NPU는 "MAC 폭탄 처리"로 역할 분리
```

> **FPU ≠ DSP 구분**: FPU는 부동소수점 연산을 가속(정확도/편의성),
> DSP(SIMD/MAC 명령어)는 정수 연산의 처리량을 가속(속도).
> **양자화된 int8 추론에서는 FPU를 거의 쓰지 않으므로, TinyML 성능에는 DSP가 더 결정적이다.**

### 왜 이 순서가 당연한 진화였는가

```
ONLY CPU  → 저렴, 범용, 신경망 못 돌림
CPU+DSP   → 비용 소폭 증가, 여전히 범용, 신경망도 "느리지만" 돌아감
             ← 이 단계가 오래 지속된 이유
CPU+NPU   → 비용 증가 뚜렷, NPU는 범용성 없음, 신경망 성능은 압도적

→ "신경망 수요가 확실히 커졌다"는 시장의 확신이 생긴 뒤에야
  전용 실리콘(NPU) 투자 명분이 생김 = 2020년 전후
```

---

## 5. F4xx(M4) → F7xx(M7) → N6(M55+Neural-ART) 상세 비교

### 5-1. 아키텍처 개요

```
              F4xx (Cortex-M4)      F7xx (Cortex-M7)       N6 (Cortex-M55 + Neural-ART)
────────────────────────────────────────────────────────────────────────────────────────
파이프라인    3-stage                6-stage (super-pipe)   M55: 4-stage + Helium
클럭          ~168~180MHz            ~216~480MHz             M55: 800MHz / NPU: 1GHz
DSP 확장      SMLAD 등 기본 DSP      SMLAD + 확장 캐시        Helium(MVE, 벡터 128bit)
캐시          없음/소량 SRAM         I/D 캐시 내장 (16KB~)    I/D 캐시 + NPU 전용 SRAM
전용 NPU      없음                   없음                     Neural-ART (최대 600GOPS)
MAC 처리단위  1~2 MAC/cycle          2~4 MAC/cycle           NPU: 수백~수천 MAC/cycle
```

### 5-2. F4xx — SMLAD의 시작점

```c
#if defined(ARM_MATH_DSP)
int32_t dense_row_m4(const int8_t *w_row, const int8_t *x, int n, int32_t bias)
{
    int32_t acc = bias;
    int i = 0;
    for (; i <= n - 4; i += 4) {
        int32_t w_packed = *(int32_t *)&w_row[i];
        int32_t x_packed = *(int32_t *)&x[i];
        acc = __SMLAD(w_packed, x_packed, acc);   // MAC 2쌍을 1cycle에
    }
    for (; i < n; i++) acc += w_row[i] * x[i];
    return acc;
}
#endif
```

```
SMLAD 명령어 개념도:
              ┌────────────┬────────────┐
        Rn =  │  w[i+1]    │   w[i]     │  (32bit 레지스터에 int16 2개)
              └────────────┴────────────┘
              ┌────────────┬────────────┐
        Rm =  │  x[i+1]    │   x[i]     │
              └────────────┴────────────┘
                    │              │
              (w[i+1]*x[i+1])  (w[i]*x[i])
                    └──────┬───────┘
                    Rd = 합 + Ra(누산기)   ← 1 cycle
```

### 5-3. F7xx — 캐시와 듀얼 이슈 파이프라인

M7의 핵심 차이는 SMLAD 자체보다 **캐시 + 듀얼 이슈로 루프 처리량이 늘어난다는 점**이다.

```
M4 파이프라인 (3-stage, 싱글 이슈):
    [F][D][E]
          [F][D][E]
                [F][D][E]   → 순차 진행

M7 파이프라인 (6-stage, 듀얼 이슈):
    [F][D][E1][E2][WB]
    [F][D][E1][E2][WB]      → 두 명령어가 거의 동시 진행
    + I/D-Cache로 Flash wait state 문제 해소
    → 같은 SMLAD 루프라도 M4 대비 실질 처리량 2배 이상 가능
```

### 5-4. N6 — M55(Helium) + Neural-ART NPU 이중 도약

**(1) Helium(MVE) — SMLAD의 벡터 확장판**

```
SMLAD (M4/M7):    32bit 레지스터에 16bit 2개 → MAC 2개/명령어
Helium/MVE (M55): 128bit 벡터 레지스터에 8bit 16개 → MAC 16개/명령어

        ┌──┬──┬──┬──┬───────────────┬──┐
  Q0 =  │x0│x1│x2│x3│  ... (int8 16개) │x15│
        └──┴──┴──┴──┴───────────────┴──┘
                    × (element-wise)
        ┌──┬──┬──┬──┬───────────────┬──┐
  Q1 =  │w0│w1│w2│w3│  ...            │w15│
        └──┴──┴──┴──┴───────────────┴──┘
                    │
          VMLADAV.S8 (누산+수평합) 1개 명령어
                    ▼
               acc (32bit)
```

```c
#include "arm_mve.h"

int32_t dense_row_m55_mve(const int8_t *w_row, const int8_t *x, int n, int32_t bias)
{
    int32_t acc = bias;
    int i = 0;
    for (; i <= n - 16; i += 16) {
        int8x16_t vx = vld1q_s8(&x[i]);
        int8x16_t vw = vld1q_s8(&w_row[i]);
        acc += vmladavaq_s8(0, vx, vw);        // 16개 MAC + 수평합
    }
    for (; i < n; i++) acc += w_row[i] * x[i];
    return acc;
}
```

**(2) Neural-ART NPU — CPU 루프 자체가 사라짐**

```
[M4/M7/M55 CPU 방식]                    [Neural-ART NPU 오프로드 방식]

CPU가 직접 for문을 순회하며               CPU: 연산 그래프를 NPU에 통째로 위임
  MAC 명령어를 fetch/decode/execute            │
for (row..) for (col..)                       ▼
  acc += w[row][col]*x[col]         ① 디스크립터(입력/가중치/출력 주소,
  (CPU가 사이클마다 직접 관여)              연산 종류) 설정 (1회)
                                              │
  → CPU 사이클 소비: O(m×n)                   ▼
                                    ② NPU 내부 MAC 어레이(수백~수천개)가
                                        자체 DMA로 SRAM 접근, 독립 연산
                                        (CPU는 다른 일 하거나 sleep)
                                              │
                                              ▼
                                    ③ 완료 인터럽트 → CPU가 결과 픽업
                                    → CPU 사이클 소비: O(1) (설정만)
```

```c
#include "ll_aton_runtime.h"   // ST Neural-ART 런타임 (개념 단순화)

void run_inference_on_npu(const int8_t *input_tensor)
{
    LL_ATON_RT_Init_Network(&NN_Instance_default);
    LL_ATON_RT_SetInputBuffer(input_tensor, 0);

    LL_ATON_RT_RetValues_t ret;
    do {
        ret = LL_ATON_RT_RunEpochBlock(&NN_Instance_default);
    } while (ret != LL_ATON_RT_DONE);

    int8_t *output = LL_ATON_RT_GetOutputBuffer(&NN_Instance_default, 0);
}
```

### 5-5. MAC 1개당 비용 총정리

```
                              MAC 1개당 필요한 CPU 개입
F4xx (M4, SMLAD)                = 명령어 0.5개 (2 MAC/명령어)
F7xx (M7, SMLAD+캐시+dual-issue) = 명령어 0.25개 (파이프라인 병렬화)
N6 M55코어 (Helium/MVE)          = 명령어 0.06개 (16 MAC/명령어)
N6 Neural-ART NPU                = 명령어 0개 (CPU는 설정만)

                              GOPS 스펙 환산 (개념적, 클럭 조건에 따라 상이)
F4xx  ─▶  수십~백여 MOPS 수준
F7xx  ─▶  수백 MOPS ~ 1GOPS대
M55(Helium, NPU 미사용) ─▶ 수 GOPS대
N6 Neural-ART NPU        ─▶ 최대 600 GOPS
```

---

## 6. 실측 벤치마크 설계 (DWT 사이클 카운터)

```c
#include "stm32f4xx_hal.h"   // 또는 f7xx / n6 계열 HAL

void dwt_init(void)
{
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->CYCCNT = 0;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
}

void benchmark_variant(const char *label,
                        int32_t (*kernel)(const int8_t*, const int8_t*, int, int32_t),
                        const int8_t *w, const int8_t *x, int n)
{
    uint32_t start = DWT->CYCCNT;
    int32_t acc = kernel(w, x, n, 0);
    uint32_t elapsed = DWT->CYCCNT - start;
    printf("[%s] %d MACs: %lu cycles (%.3f cycles/MAC), acc=%ld\r\n",
           label, n, elapsed, (float)elapsed / n, acc);
}

// 사용 예:
// benchmark_variant("F4 plain",   dense_row_plain, w, x, 256);
// benchmark_variant("F4 SMLAD",   dense_row_m4,    w, x, 256);
// benchmark_variant("F7 SMLAD",   dense_row_m7,    w, x, 256);
// benchmark_variant("M55 MVE",    dense_row_m55_mve, w, x, 256);
// N6는 NPU 오프로드 API의 왕복시간(latency)을 별도 측정
```

예상 결과 패턴 (참고용, 실측 필요):

```
F4  plain C      : ~4~6 cycles/MAC
F4  SMLAD        : ~1.5~2 cycles/MAC
F7  SMLAD        : ~0.8~1.2 cycles/MAC (캐시+dual-issue 효과)
M55 MVE(Helium)  : ~0.2~0.4 cycles/MAC
N6  NPU 오프로드  : "cycles/MAC" 개념 자체가 무의미
                   (설정 오버헤드 이후 NPU-CPU 완전 비동기 동작)
```

---

## 7. OS/RTOS 관점: Bare-metal → FreeRTOS → 그 이상

### 7-1. 왜 OS(스케줄러)가 필요한가

```
단일 추론만 있는 경우 → Bare-metal로 충분
main() { while(1) { read_sensor(); run_inference(); act_on_result(); } }

실제 제품에 가까운 경우 → RTOS 필요
- BLE/Wi-Fi 통신 스택 동시 구동
- 여러 센서를 각기 다른 주기로 샘플링
- 추론 결과에 따른 액추에이터의 정해진 타이밍 구동
- 절전을 위한 유휴시간 Sleep 진입
```

### 7-2. 3단계 비교

```
              Bare-metal              FreeRTOS                  Embedded Linux
────────────────────────────────────────────────────────────────────────────────────
스케줄링       없음(while문 순환)      Preemptive/Priority 기반    CFS, 리눅스 표준
메모리 관리    정적 할당 위주           힙 5가지 옵션(heap_1~5)      가상메모리, MMU 필요
실시간성       완전 결정적              준결정적(RTOS 오버헤드有)    소프트 리얼타임 위주
NPU 연동       polling(블로킹 대기)     세마포어/큐 기반 비동기      드라이버+커널모듈
필요 자원      RAM 수KB~수십KB          RAM 수십~수백KB              RAM 수십~수백MB
대표 보드      F103, F4xx 초기          F4xx/F7xx/M55 실전 프로젝트   N6(고사양 구성),
                                                                  i.MX/RK3588급
```

---

## 8. FreeRTOS + NPU 통합 설계 패턴

### 8-1. Task 구조

```
        ┌─────────────────────────────────────────────┐
        │              FreeRTOS Scheduler               │
        └─────────────────────────────────────────────┘
              │              │              │
     ┌────────┴───┐  ┌───────┴──────┐  ┌────┴─────────┐
     │ Task:Sensor │  │ Task:Inference│  │ Task:Actuator │
     │ (Priority 3)│  │ (Priority 2)  │  │ (Priority 4,  │
     │ 주기 10ms   │  │ 이벤트 기반   │  │  가장 높음)    │
     └──────┬──────┘  └───────┬──────┘  └───────────────┘
            │  xQueueSend()    │  xSemaphoreTake()
            ▼                  ▼
     ┌─────────────┐   ┌──────────────────┐
     │ SensorQueue  │──▶│ NPU/DSP 연산      │
     └─────────────┘   │ (완료 시 ISR에서   │
                        │  xSemaphoreGiveFromISR) │
                        └──────────────────┘
```

```c
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "semphr.h"

static QueueHandle_t     sensorQueue;
static SemaphoreHandle_t npuDoneSem;

// ── 센서 태스크 ──
void vSensorTask(void *pv)
{
    int8_t sample[FEATURE_LEN];
    for (;;) {
        read_sensor_int8(sample);
        xQueueSend(sensorQueue, sample, portMAX_DELAY);
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

// ── NPU 완료 ISR ──
void NPU_IRQHandler(void)
{
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    xSemaphoreGiveFromISR(npuDoneSem, &xHigherPriorityTaskWoken);
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}

// ── 추론 태스크 ──
void vInferenceTask(void *pv)
{
    int8_t sample[FEATURE_LEN];
    int32_t result[NUM_CLASSES];
    for (;;) {
        xQueueReceive(sensorQueue, sample, portMAX_DELAY);
        npu_start_inference(sample);                 // 논블로킹 시작
        xSemaphoreTake(npuDoneSem, portMAX_DELAY);    // 대기 중 CPU 양보
        npu_get_result(result);
        xQueueSend(actuatorQueue, result, portMAX_DELAY);
    }
}
```

> **핵심**: Bare-metal에서 NPU 완료를 polling하면 CPU는 그동안 아무것도 못 한다.
> FreeRTOS에서 `xSemaphoreTake()`로 대기하면 스케줄러가 다른 Task(센서 읽기, 통신 등)에게
> CPU를 넘겨준다.

### 8-2. Task 우선순위 설계 예시

```
Priority 4 (최고) ── 안전 관련 액추에이터 제어 (예: 배터리 과전압 시 즉시 회로 차단)
Priority 3        ── 센서 샘플링 (주기적, 데드라인 존재)
Priority 2        ── TinyML 추론 (이벤트 기반, 약간의 지연 허용)
Priority 1 (최저)  ── 통신(BLE/UART 로깅), SoC 계산 등 비긴급 작업
Idle Task (0)      ── Sleep 모드 진입 (Tickless Idle → 저전력)
```

> 배터리 모니터링 프로젝트라면, "전압 이상 감지 추론"보다
> "과전압 감지 시 즉시 알람 회로 구동"이 더 높은 우선순위여야 안전하다.

### 8-3. 메모리 파티셔닝 (RTOS 힙 vs Tensor Arena)

```
SRAM 전체
┌──────────────────────────────────────────────────────┐
│  FreeRTOS Heap (heap_4.c 등)                           │
│  - Task Stack, Queue, Semaphore 객체, 동적 할당 영역     │
├──────────────────────────────────────────────────────┤
│  TFLite Micro / CMSIS-NN "Tensor Arena"                │
│  - 정적으로 예약된 고정 크기 버퍼                          │
│  - RTOS 힙과 반드시 별도 영역! (겹치면 크래시)              │
├──────────────────────────────────────────────────────┤
│  NPU 전용 SRAM (N6의 Neural-ART 내부/근접 메모리)          │
│  - CPU가 직접 접근 안 하거나 DMA로만 접근                   │
└──────────────────────────────────────────────────────┘
```

```c
__attribute__((section(".tensor_arena"), aligned(16)))
static uint8_t tensor_arena[TENSOR_ARENA_SIZE];   // 예: 64KB
// 링커스크립트에서 별도 섹션으로 배치하여 RTOS 힙과 충돌 방지
```

### 8-4. F4/F7 vs N6 — RTOS 관점 차이

```
F4xx/F7xx + FreeRTOS
- 단일 코어, 단일 스케줄러
- NPU 없음 → CMSIS-NN 연산 자체가 "CPU를 점유하는 Task"
- 실시간성 예측이 비교적 쉬움 (연산 시간이 결정적)

N6(M55+Neural-ART) + FreeRTOS
- NPU가 별도 "가속기 리소스"로 존재
- 추론 Task는 대부분 시간을 Blocked 상태로 보냄 → CPU는 다른 Task 병행 처리
- 여러 Task가 NPU를 공유자원으로 요청 → Mutex/큐로 직렬화 필요
- ST는 ThreadX(Azure RTOS) 또는 FreeRTOS 포팅을 공식 지원
```

```c
static SemaphoreHandle_t npuMutex;

void vVisionTask(void *pv) {
    for (;;) {
        capture_frame(frame_buf);
        xSemaphoreTake(npuMutex, portMAX_DELAY);   // NPU 독점 획득
        run_vision_inference(frame_buf);
        xSemaphoreGive(npuMutex);
    }
}

void vAudioTask(void *pv) {
    for (;;) {
        capture_audio(audio_buf);
        xSemaphoreTake(npuMutex, portMAX_DELAY);   // 같은 NPU를 놓고 경쟁
        run_kws_inference(audio_buf);
        xSemaphoreGive(npuMutex);
    }
}
```

---

## 9. Mbed OS EOL 이슈와 RTOS 선택 가이드

### 9-1. Mbed OS 연혁 및 현재 상태

```
2009  ── Mbed 최초 출시 (Arduino IDE의 ARM 진영 대항마)
2016  ── Mbed OS 5.x (RTOS 기능 본격 통합)
2020  ── Mbed OS 6.x
2021~2022 ── 온라인 컴파일러 단계적 폐지
2024.07 ── Arm, EOL 공식 발표 (1년 유예)
2026.07 ── 공식 EOL (현재 시점)
```

Mbed 플랫폼은 2026년 7월 EOL을 맞으며, 웹사이트는 접근 불가능해지고 온라인 빌드 툴도 중단된다.
Mbed OS 자체는 오픈소스로 남지만 Arm이 더 이상 적극 유지보수하지 않는다.
Arduino는 선제적으로 대체제를 물색해 ZephyrOS를 채택했고 2023년 Zephyr 프로젝트에
실버 멤버로 합류했다. Arm은 상업적 사용자에게 FreeRTOS/Zephyr로의 이전을 권고하고 있으며,
교육 기관에는 Mbed를 교육 플랫폼으로 계속 쓰는 것을 재고하도록 권장하고 있다.

### 9-2. FreeRTOS vs Mbed OS 비교

```
                FreeRTOS                        Mbed OS
────────────────────────────────────────────────────────────────
아키텍처 지원   멀티벤더(Cortex-M/A, RISC-V 등)  Arm Cortex-M 전용
API 스타일      C 기반, 저수준 직접 제어           C++ 기반, 고수준 추상화
타겟 사용자     실전 제품 펌웨어 엔지니어           초보자/교육용, 빠른 프로토타이핑
생태계 규모     압도적 (칩벤더 대부분 기본 지원)    Arm 계열 보드 위주로 제한적
TinyML 연동     TFLite Micro/CMSIS-NN 예제 풍부    초기 예제 있었으나 FreeRTOS로 수렴 추세
2026년 상태     계속 권장, 업계 표준                EOL (신규 프로젝트 비권장)
```

### 9-3. RTOS 선택지 지형도 (2026년 기준)

```
경량 ─────────────────────────────────────────────────────── 중량

Bare-metal      FreeRTOS         Zephyr RTOS        ThreadX          Embedded Linux
(초경량,        (사실상 업계     (Mbed 이탈 수요      (Azure RTOS,     (N6 고사양,
 초기 실습용)   표준, MIT       흡수하는 신흥표준,     ST가 지원)       카메라+NPU+
               라이선스)        디바이스트리 기반)                    네트워크 동시구동)

Mbed OS ── 2026.07 EOL, 신규 프로젝트에는 비권장
```

### 9-4. 커리큘럼 반영 방향

```
1단계 (F4xx): Bare-metal MAC 벤치마크
2단계 (F7xx): FreeRTOS 도입 — Task/우선순위/세마포어로 실전 구조 체감
3단계 (N6):   FreeRTOS + NPU 비동기 오프로드 — 공유자원 뮤텍스 설계
심화 옵션:    Zephyr RTOS(멀티프로토콜 IoT 게이트웨이형) /
              Embedded Linux(고사양 비전 게이트웨이) 비교 토론
              ※ Mbed OS는 2026.07 EOL로 신규 커리큘럼에서 제외 권장
```

---

## 10. 커리큘럼 적용 로드맵 총정리

```
┌─────────────────────────────────────────────────────────────────┐
│  하드웨어 축                                                       │
│  ONLY CPU(M0/M3) → DSP(M4/F4xx) → 캐시+dual-issue(M7/F7xx)        │
│                  → Helium+NPU(M55/N6, Neural-ART)                 │
├─────────────────────────────────────────────────────────────────┤
│  소프트웨어/OS 축                                                  │
│  Bare-metal → FreeRTOS → (Zephyr / Embedded Linux 심화)            │
├─────────────────────────────────────────────────────────────────┤
│  두 축이 만나는 지점                                                │
│  "세마포어로 깨어나는 추론 Task"                                     │
│  = NPU가 백그라운드에서 MAC 연산을 수행하는 동안                       │
│    RTOS 스케줄러가 CPU를 다른 Task에 배분하는 구조                     │
└─────────────────────────────────────────────────────────────────┘
```

**실습 단계 제안:**

1. **F4xx**: `neuron_forward_q8()` / `dense_row_m4()` (SMLAD) 를 DWT로 사이클 실측
2. **F7xx**: 동일 커널을 캐시/dual-issue 환경에서 재측정, F4 대비 처리량 비교
3. **N6**: `dense_row_m55_mve()` (Helium) vs `LL_ATON_RT_*` (NPU 오프로드) 비교,
   FreeRTOS Task로 감싸 세마포어 기반 비동기 구조로 전환
4. **통합 실습**: 배터리 모니터링 프로젝트에 Task 우선순위(안전 > 센서 > 추론 > 통신) 적용,
   Tensor Arena와 RTOS 힙 메모리 파티셔닝 설계

---

*이 문서는 나무 선생님의 STM32/임베디드 AI 커리큘럼(F4xx/F7xx/N6 스코프) 자료로 작성되었습니다.
모든 다이어그램은 이미지/표 없이 ASCII 텍스트로만 표현했습니다.*
