# ESP32-CAM Edge Impulse 추론 코드 수정

## 문제

Edge Impulse 분류(Classification) 모델(`stm32_case1`)을 ESP32-CAM에서 실행했을 때, 객체 탐지(Object Detection) 전용 출력만 표시되어 분류 결과가 나타나지 않음.

**원인:** `#include <stm32_case1_inferencing.h>`에서 `EI_CLASSIFIER_OBJECT_DETECTION`이 `1`로 정의되어 있음. 원본 Edge Impulse 예제 코드는 이 매크로에 따라 객체 탐지 출력(`bounding_boxes`) **또는** 분류 출력(`classification`)만 선택적으로 표시함. 분류 모델인데 객체 탐지 분기만 실행되어 아무 결과도 출력되지 않음.

## 수정 내용

`loop()` 함수 내 출력 로직을 다음과 같이 변경:

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 분류 결과 | `#else` 분기에만 있음 (OD=1이면 미출력) | **항상 출력** (`#if` 밖) |
| OD 박스 없음 | 아무 메시지 없음 | `"(no detections)"` 출력 |

## 수정된 코드

```cpp
// 항상 분류 결과 출력
ei_printf("Classification:\r\n");
for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
    ei_printf("  %s: %.5f\r\n",
        ei_classifier_inferencing_categories[i],
        result.classification[i].value);
}

// 객체 탐지 결과 (해당 모델만)
#if EI_CLASSIFIER_OBJECT_DETECTION == 1
    ei_printf("Object detection bounding boxes:\r\n");
    if (result.bounding_boxes_count == 0) {
        ei_printf("  (no detections)\r\n");
    }
    for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
        ...
    }
#endif
```

## 출력 예시

수정 후 시리얼 모니터 출력:

```
Predictions (DSP: 7 ms., Classification: 680 ms., Anomaly: 0 ms.): 
Classification:
  cat: 0.92340
  dog: 0.05120
  person: 0.02540
Object detection bounding boxes:
  (no detections)
```

## 대상 파일

- **경로:** `C:\Users\Administrator\Documents\Arduino\esp32_camera\esp32_camera.ino`
- **변경 라인:** 189-216 (출력 섹션 전체 교체)

## 참고

- `ei_classifier_inferencing_categories` 배열은 모델 헤더(`stm32_case1_inferencing.h`)에 자동 생성됨
- Edge Impulse의 원본 예제는 OD/분류 겸용으로 설계되었으나, 실제로는 **둘 중 하나만** 유효함
- `run_classifier()`는 항상 `result.classification[]`을 채우므로 분류 결과는 항상 읽을 수 있음


![](edge_impulse_setting/001.png)

![](edge_impulse_setting/002.png)

![](edge_impulse_setting/003.png)

![](edge_impulse_setting/004.png)

![](edge_impulse_setting/005.png)

![](edge_impulse_setting/006.png)

![](edge_impulse_setting/007.png)

![](edge_impulse_setting/008.png)


```
Sketch uses 452797 bytes (14%) of program storage space. Maximum is 3145728 bytes.
Global variables use 41916 bytes (12%) of dynamic memory, leaving 285764 bytes for local variables. Maximum is 327680 bytes.
esptool v5.3.1
Serial port COM10:
Connecting.....
Connected to ESP32 on COM10:
Chip type:          ESP32-D0WD (revision v1.0)
Features:           Wi-Fi, BT, Dual Core + LP Core, 240MHz, Vref calibration in eFuse, Coding Scheme None
Warning: Detected crystal freq 41.13 MHz is quite different to normalized freq 40 MHz. Unsupported crystal in use?
Crystal frequency:  40MHz
MAC:                24:a1:60:c5:83:e0

Uploading stub flasher...
Running stub flasher...
Stub flasher running.
Changing baud rate to 460800...
Changed.

Configuring flash size...

Writing 'C:\Users\Administrator\AppData\Local\arduino\sketches\3DAC79ECC357292BF699295497376A97/esp32_camera.ino.bootloader.bin' at 0x00001000...
Flash will be erased from 0x00001000 to 0x00007fff...
Compressed 24992 bytes to 16001...

Writing at 0x00001000 [                              ]   0.0% 0/16001 bytes... 

Writing at 0x000071a0 [==============================] 100.0% 16001/16001 bytes... 
Wrote 24992 bytes (16001 compressed) at 0x00001000 in 0.8 seconds (262.0 kbit/s).
Verifying written data...
Hash of data verified.

Writing 'C:\Users\Administrator\AppData\Local\arduino\sketches\3DAC79ECC357292BF699295497376A97/esp32_camera.ino.partitions.bin' at 0x00008000...
Flash will be erased from 0x00008000 to 0x00008fff...
Compressed 3072 bytes to 137...

Writing at 0x00008000 [                              ]   0.0% 0/137 bytes... 

Writing at 0x00008c00 [==============================] 100.0% 137/137 bytes... 
Wrote 3072 bytes (137 compressed) at 0x00008000 in 0.2 seconds (99.0 kbit/s).
Verifying written data...
Hash of data verified.

Writing 'C:\Users\Administrator\AppData\Local\Arduino15\packages\esp32\hardware\esp32\3.3.11/tools/partitions/boot_app0.bin' at 0x0000e000...
Flash will be erased from 0x0000e000 to 0x0000ffff...
Compressed 8192 bytes to 47...

Writing at 0x0000e000 [                              ]   0.0% 0/47 bytes... 

Writing at 0x00010000 [==============================] 100.0% 47/47 bytes... 
Wrote 8192 bytes (47 compressed) at 0x0000e000 in 0.2 seconds (263.2 kbit/s).
Verifying written data...
Hash of data verified.

Writing 'C:\Users\Administrator\AppData\Local\arduino\sketches\3DAC79ECC357292BF699295497376A97/esp32_camera.ino.bin' at 0x00010000...
Flash will be erased from 0x00010000 to 0x0007efff...
Compressed 452944 bytes to 274865...

Writing at 0x00010000 [                              ]   0.0% 0/274865 bytes... 

Writing at 0x0001d5aa [>                             ]   6.0% 16384/274865 bytes... 

Writing at 0x00021eb8 [==>                           ]  11.9% 32768/274865 bytes... 

Writing at 0x00027b85 [====>                         ]  17.9% 49152/274865 bytes... 

Writing at 0x00030b81 [======>                       ]  23.8% 65536/274865 bytes... 

Writing at 0x00036229 [=======>                      ]  29.8% 81920/274865 bytes... 

Writing at 0x0003b909 [=========>                    ]  35.8% 98304/274865 bytes... 

Writing at 0x00041040 [===========>                  ]  41.7% 114688/274865 bytes... 

Writing at 0x000463fc [=============>                ]  47.7% 131072/274865 bytes... 

Writing at 0x0004b80c [===============>              ]  53.6% 147456/274865 bytes... 

Writing at 0x00052b4d [================>             ]  59.6% 163840/274865 bytes... 

Writing at 0x0005853b [==================>           ]  65.6% 180224/274865 bytes... 

Writing at 0x0005eb0e [====================>         ]  71.5% 196608/274865 bytes... 

Writing at 0x00066c4c [======================>       ]  77.5% 212992/274865 bytes... 

Writing at 0x0006ec8c [========================>     ]  83.5% 229376/274865 bytes... 

Writing at 0x000745d3 [=========================>    ]  89.4% 245760/274865 bytes... 

Writing at 0x00079f8d [===========================>  ]  95.4% 262144/274865 bytes... 

Writing at 0x0007e950 [==============================] 100.0% 274865/274865 bytes... 
Wrote 452944 bytes (274865 compressed) at 0x00010000 in 8.9 seconds (409.3 kbit/s).
Verifying written data...
Hash of data verified.

Hard resetting via RTS pin...

```
