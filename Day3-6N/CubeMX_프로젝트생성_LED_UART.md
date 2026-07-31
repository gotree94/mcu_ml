# CubeMX로 STM32N6 LED + UART 프로젝트 만들기

**환경**: STM32CubeMX 6.18.0 / STM32CubeIDE 2.2.0
**보드**: NUCLEO-N657X0-Q (STM32N657X0H3Q, Cortex-M55)

---

## 개요

STM32N6는 **TrustZone**을 지원하는 Cortex-M55 기반 MCU입니다. 일반 STM32(F4/F7/H7)와 달리 프로젝트가 **FSBL**(Secure Bootloader)과 **Appli**(Non-Secure Application)로 분리됩니다.

> **처음부터 만들기보다 STM32CubeN6 공식 예제로 시작하는 것을 권장합니다.**
> 이 문서는 예제 없이 직접 만들 때의 전체 과정을 설명합니다.

---

## 1. CubeMX에서 새 프로젝트 생성

### 1.1 Board Selector

1. **STM32CubeMX 실행** → **File → New Project**
2. **Board Selector** 탭
3. 검색창에 `N6570` 입력
4. `NUCLEO-N657X0-Q` 선택 → **Start Project**
5. **Yes** (초기화 확인)

### 1.2 불필요한 기본 주변장치 해제

보드 템플릿에 ETH1, I2C, LPUART 등이 기본 활성화되어 있습니다.
LED+UART 테스트에는 불필요하므로 **먼저 해제**합니다.

- **Connectivity → ETH1** → Mode를 `Disabled`로 변경
  - 해제하지 않으면 RIF(Resource Isolation Framework) 관련 코드가 생성되어 빌드 오류 발생
- **Connectivity → I2C1**, **I2C2** → 필요 없으면 Disabled
- **Connectivity → LPUART1** → `Asynchronous` 유지 (UART 예제로 사용)

### 1.3 Secure Boot 설정 (SYS_S)

TrustZone 프로젝트는 Secure/Non-Secure 영역을 구분해야 합니다.

1. **System Core → SYS_S** 클릭
2. `First Stage Boot Loader` **체크**
   - FSBL: Secure 영역에서 실행되는 부트로더
   - CubeMX가 자동 생성하며 클럭 · 외부 메모리 · MPU 등 HW 초기화 담당
3. `Application` **체크**
   - Non-Secure 영역에서 실행될 사용자 애플리케이션
   - 우리가 코드를 작성할 곳
4. **Timebase Source**: `SysTick` 유지
5. 확인 후 좌측 메뉴에 **Initializer** 항목이 새로 생김

### 1.4 Initializer에서 컨텍스트 선택

1. **Initializer** 클릭
2. `Select initialized context` 드롭다운 → **Application** 선택
   - `First stage boot loader`: FSBL용 설정
   - `Application`: Non-Secure 애플리케이션용 설정 ← **선택**
   - `External Memory Loader`: 외부 메모리 로더
3. 이후 모든 주변장치 설정은 Application 컨텍스트에 적용됨

### 1.5 Clock Configuration

1. **Clock Configuration** 탭으로 이동
   - 기본 HCLK가 800MHz가 아닐 수 있음
   - USART 추가 시 빨간색 오류가 뜰 수 있음
2. **Solve** 버튼 클릭 → PLL 설정 자동 조정
3. HCLK가 **800MHz**인지 확인
4. 다시 **Pinout & Configuration** 탭으로 이동

### 1.6 LPUART1 설정 (UART)

1. **Connectivity → LPUART1**
2. **Mode**: `Asynchronous`
3. **Parameter Settings**:
   - **Baud Rate**: `115200`
   - **Word Length**: `8` (기본)
   - **Parity**: `None` ← **기본값 ODD → 반드시 NONE으로 변경**
   - **Stop Bits**: `1`
4. 하단 **LPUART1 Mode and Configuration** 창 → **FSBL / Application / External** 체크박스
   - **Application** 체크 (Non-Secure printf 출력용)
   - **FSBL**도 체크하면 부트로더에서도 UART 출력 가능 (선택)

> 자동 할당된 TX/RX 핀을 확인하세요. LPUART1 TX는 일반적으로 PG7, RX는 PG6입니다.

### 1.7 사용자 LED — BSP가 자동 관리

NUCLEO-N657X0-Q의 **BSP(Board Support Package)**가 세 개의 사용자 LED를 이미 관리합니다.

| 회로도 | ST 명칭 | 핀 | 색상 |
|--------|---------|-----|------|
| LED1 | LD7 | PG8 | 파랑 |
| LED2 | LD5 | PG10 | 빨강 |
| LED3 | LD6 | PG0 | 녹색 |

- 핀 뷰에서 PG0/PG8/PG10이 회색으로 표시되고 `BSP under control` 메시지가 보이면 정상
- 별도 GPIO 설정 없이 `BSP_LED_Init()` / `BSP_LED_Toggle()` API로 제어 가능
- **Active LOW**: 핀 LOW일 때 켜짐, HIGH일 때 꺼짐

### 1.8 Project Manager 설정

1. **Project Manager** 탭
2. **Project Name**: `nucleo_n6570_led_uart`
3. **Project Location**: 적절한 폴더 선택
4. **Toolchain / IDE**: `STM32CubeIDE`
5. **Generate Under the root**: 체크
6. **Generate Code** 버튼 클릭

### 1.9 생성된 프로젝트 구조

```
nucleo_n6570_led_uart/
├── FSBL/                        ← Secure 부트로더 (수정 불필요)
│   ├── Core/Src/main.c
│   └── Core/Inc/
├── Appli/                       ← 사용자 애플리케이션 ← **여기에 코드 작성**
│   ├── Core/Src/main.c
│   └── Core/Inc/
├── Drivers/                     ← 공유 드라이버
│   ├── BSP/STM32N6xx_Nucleo/    ← BSP (LED, COM 등)
│   ├── STM32N6xx_HAL_Driver/
│   └── CMSIS/
└── Secure_nsclib/               ← Secure ↔ Non-Secure 인터페이스
```

---

## 2. LED 깜빡임 + UART 출력 코드

### 2.1 Appli/main.c 수정

`Appli/Core/Src/main.c`를 열고 다음 코드를 추가합니다.

**① include (USER CODE BEGIN 0)**

```c
/* USER CODE BEGIN 0 */
#include <stdio.h>
#include "stm32n6xx_nucleo.h"

/* printf → LPUART1 (ST-Link VCP) */
int _write(int file, char *ptr, int len)
{
    HAL_UART_Transmit(&hlpuart1, (uint8_t *)ptr, len, HAL_MAX_DELAY);
    return len;
}
/* USER CODE END 0 */
```

> `hlpuart1` 핸들은 CubeMX가 LPUART1 활성화 시 자동 생성합니다.

**② 초기화 코드 (USER CODE BEGIN 2)**

```c
  /* USER CODE BEGIN 2 */
  BSP_LED_Init(LED3);
  printf("STM32N6 CubeMX Project Boot OK!\r\n");
  /* USER CODE END 2 */
```

**③ 메인 루프 (USER CODE BEGIN WHILE)**

```c
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    BSP_LED_Toggle(LED3);
    printf("LED Toggle\r\n");
    HAL_Delay(500);
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
```

### 2.2 Include Paths 추가 (필수)

빌드 시 BSP 헤더와 FSBL 설정 헤더를 찾지 못하는 오류가 발생합니다.
Appli 프로젝트에 include paths를 수동으로 추가해야 합니다.

**Appli 프로젝트** 우클릭 → **Properties**
→ **C/C++ Build → Settings → MCU GCC Compiler → Include paths**
→ 아래 2줄을 **각각 Add**:

```
../../Drivers/BSP/STM32N6xx_Nucleo
../../FSBL/Core/Inc
```

> **Workspace path가 아닌 File system path**로 추가하세요.
> Workspace: `${workspace_loc:/${ProjName}/../../Drivers/BSP/STM32N6xx_Nucleo}`

---

## 3. 빌드 및 플래싱

### 3.1 Build

TrustZone 프로젝트는 **FSBL(Secure) → Appli(Non-Secure)** 순서로 빌드됩니다.

1. **Project → Build All (Ctrl+B)**
2. 빌드 순서:
   - FSBL Debug 빌드
   - Appli Debug 빌드
   - Secure → Non-Secure 이미지 병합 (Post-build step)

### 3.2 Run

1. NUCLEO-N657X0-Q 보드를 USB-C로 PC에 연결
2. **Run → Run (Ctrl+F11)**
3. 처음 실행 시 **Edit Configuration** → **Debug** 선택
4. ST-Link가 자동으로 보드 인식 → 플래싱 진행

> STM32N6는 **내부 Flash가 없습니다**. 프로그램은 외부 Quad-SPI NOR Flash에 기록됩니다.
> 플래싱이 안 되면 **BOOT1 점퍼를 2-3**으로 연결하여 칩에 직접 써보세요.

### 3.3 시리얼 모니터 확인

1. Tera Term / PuTTY 실행
2. **Serial** → ST-Link VCP COM 포트 선택
3. **115200 baud, 8N1** (Parity None)
4. 출력 확인:

```
STM32N6 CubeMX Project Boot OK!
LED Toggle
LED Toggle
LED Toggle
...
```

> **500ms 간격으로 LED3(녹색)이 깜빡이고 시리얼에 로그가 출력되면 성공입니다.**

---

## 4. 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `stm32n6xx_nucleo.h: No such file or directory` | BSP include 경로 누락 | Appli include paths에 `../../Drivers/BSP/STM32N6xx_Nucleo` 추가 |
| `stm32n6xx_nucleo_conf.h: No such file or directory` | BSP 설정 헤더가 FSBL에만 있음 | Appli include paths에 `../../FSBL/Core/Inc`도 추가 |
| RIF 관련 빌드 에러 (`RIMC_MasterConfig_t` 등) | ETH1 등 불필요 주변장치 활성화 | CubeMX에서 ETH1 Disabled 후 재생성 |
| UART 출력 깨짐 | Parity ODD로 설정됨 | LPUART1 → Parameter Settings → Parity → **None** |
| `No ST-Link detected` | USB 케이블 데이터 전송 불가 | 데이터 케이블 사용, 다른 USB 포트 시도 |
| 플래싱 실패 | 외부 Flash 불량 | BOOT1 점퍼 2-3으로 직접 칩 프로그래밍 |
| printf 출력 안 됨 | VCP 포트 잘못 선택 | 장치 관리자에서 COM 포트 번호 확인 |
| `_write` 중복 정의 | syscalls.c와 충돌 | syscalls.c의 `_write`를 주석 처리 |

---

## 5. 추가 실습

### 5.1 버튼으로 LED 제어

GPIO_EXTI 예제 참고:

```c
/* USER CODE BEGIN 0 */
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
    if (GPIO_Pin == GPIO_PIN_13)  /* PC.13 = USER button */
    {
        BSP_LED_Toggle(LED1);
        printf("Button pressed!\r\n");
    }
}
/* USER CODE END 0 */
```

CubeMX에서 PC.13을 `GPIO_EXTI13`으로 설정, Falling edge 필요.

### 5.2 PWM으로 LED 밝기 제어

TIM PWMOutput 예제 참고:
- TIM2_CH1을 LED 핀과 연결
- `HAL_TIM_PWM_Start()` + `__HAL_TIM_SET_COMPARE()`로 듀티비 제어

### 5.3 ADC로 가변저항 읽기

ADC 예제 참고:
- ADC1, PA.01 핀
- `HAL_ADC_Start_DMA()`로 연속 변환
- UART로 전압 값 출력

---

## 6. 참고: 예제로 시작하는 방법

처음부터 위저드로 만들기 어렵다면 ST 공식 예제를 import해서 시작하세요.

```bash
# 예제 다운로드
git clone https://github.com/STMicroelectronics/STM32CubeN6.git
```

- **LED**: `STM32CubeN6/Projects/NUCLEO-N657X0-Q/Examples/GPIO/GPIO_IOToggle/STM32CubeIDE/`
- **UART**: `STM32CubeN6/Projects/NUCLEO-N657X0-Q/Examples/UART/UART_Printf/STM32CubeIDE/`

**File → Open Projects from File System...** 으로 열면 바로 빌드/실행 가능합니다.
