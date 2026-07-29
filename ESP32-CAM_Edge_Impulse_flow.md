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
