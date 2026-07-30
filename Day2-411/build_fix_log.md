# STM32F411_AIexam 빌드 오류 해결 기록

## 프로젝트 정보
- **경로**: `C:\Users\Administrator\STM32CubeIDE\workspace_2.2.0\STM32F411_AIexam`
- **타겟**: NUCLEO-F411RE (STM32F411RET6, Cortex-M4F @84MHz)
- **X-Cube-AI**: v2.2.0 (network_config.h 확인)
- **모델**: ppg_model_i8.tflite (int8 양자화)

---

## 오류 1: `app_x_cube_ai.h: No such file or directory`

### 증상
```
../Core/Src/main.c:24:10: fatal error: app_x_cube_ai.h: No such file or directory
   24 | #include "app_x_cube_ai.h"
```

### 원인
README.md 4.5절의 코드는 **예전 버전 X-Cube-AI** 기준으로 작성됨.  
현재 설치된 **X-Cube-AI v2.2.0**에서는 `app_x_cube_ai.h` 파일을 **생성하지 않음**.

실제 생성된 파일들 (`X-CUBE-AI/App/`):
```
network_config.h        ← 버전 정보
network.h / network.c   ← 신경망 API (create, init, run 등)
network_data.h / .c     ← 데이터 접근 (activations, weights)
network_data_params.h / .c  ← 설정 (AI_NETWORK_DATA_CONFIG 등)
```

### 해결
`#include "app_x_cube_ai.h"` 를 제거하고, 대신 `AI_NETWORK_DATA_CONFIG`을 제공하는 `network_data_params.h`를 include.

**변경 전:**
```c
#include "app_x_cube_ai.h"
#include "network.h"
#include <stdio.h>
```

**변경 후:**
```c
#include "network.h"
#include "network_data_params.h"
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
```

---

## 오류 2: X-Cube-AI v2.2.0 API 변경으로 인한 타입 불일치

### 증상
```
error: incompatible types when assigning to type 'ai_error' from type 'ai_bool'
error: invalid initializer  (ai_buffer input_buff = ai_network_inputs_get(...))
```

### 원인
READEME의 코드는 예전 X-Cube-AI API 기준. v2.2.0에서 변경된 API:

| 함수 | README 코드 (잘못됨) | 실제 API (v2.2.0) |
|------|---------------------|-------------------|
| `ai_network_init()` | `ai_error err = ai_network_init(...)` | `ai_bool ai_network_init(...)` |
| `ai_network_inputs_get()` | `ai_buffer buf = ai_network_inputs_get(...)` | `ai_buffer* ai_network_inputs_get(...)` |
| `ai_network_outputs_get()` | `ai_buffer buf = ai_network_outputs_get(...)` | `ai_buffer* ai_network_outputs_get(...)` |

### 해결
```c
// 변경 전 (README)
ai_error err;
err = ai_network_init(network, NULL);  // ai_bool을 ai_error에 대입 → 오류
ai_buffer input_buff = ai_network_inputs_get(network, NULL);  // 포인터를 구조체에 대입 → 오류

// 변경 후 (v2.2.0)
if (!ai_network_init(network, NULL)) {  // ai_bool 반환
    printf("Network init error\r\n");
    Error_Handler();
}
ai_buffer *input_buff = ai_network_inputs_get(network, NULL);  // 포인터 반환
input_buff->data = AI_HANDLE_PTR(&ai_input);  // 포인터로 접근
batch = ai_network_run(network, input_buff, output_buff);  // 포인터 전달
```

---

## 오류 3: `sinf()`, `rand()`, `RAND_MAX` undeclared

### 증상
```
error: implicit declaration of function 'sinf'
error: implicit declaration of function 'rand'
error: 'RAND_MAX' undeclared
```

### 원인
`<math.h>`와 `<stdlib.h>`가 include되지 않음. README 코드에서 누락.

### 해결
```c
#include <math.h>    // sinf() 사용
#include <stdlib.h>  // rand(), RAND_MAX 사용
```

---

## 최종 빌드 결과

```
arm-none-eabi-size  STM32F411_AIexam.elf
   text    data     bss     dec     hex filename
  39420    2832    5264   47516    b99c STM32F411_AIexam.elf
```

- **text (Flash 코드)**: 39,420 bytes (~38.5 KB) / 512 KB = 7.5%
- **data (초기화된 데이터)**: 2,832 bytes (~2.8 KB)
- **bss (초기화 안된 데이터)**: 5,264 bytes (~5.1 KB)
- **Flash 합계**: ~41 KB / 512 KB (8%)
- **SRAM 합계**: ~8 KB / 128 KB (6.3%)

✅ **빌드 성공!**

---

## 추가 참고: 모델 데이터 타입 문제

현재 모델은 **int8 양자화** 모델(`AI_NETWORK_IN_1_FORMAT = AI_BUFFER_FORMAT_S8`).  
그러나 main.c는 `float ai_input[...]`를 사용. 이는 데이터 타입 불일치로 **추론 결과가 정확하지 않을 수 있음**.

올바른 사용을 위해서는:
- `ai_i8` (int8) 타입 배열로 변경
- 또는 float32 모델(`ppg_model_f32.tflite`)로 CubeMX에서 재생성

```
AI_NETWORK_IN_1_SIZE = 128 (int8 → 128 bytes)
float ai_input[128]   = 512 bytes (네트워크는 128바이트만 읽음 → 값 왜곡)
```
