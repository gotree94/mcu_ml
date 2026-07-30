# 04. 브랜치와 병합

브랜치(Branch)는 코드의 **독립적인 작업 공간**입니다.  
한 프로젝트에서 여러 기능을 동시에 개발할 수 있게 해줍니다.

---

## 1. 브랜치란?

나무의 가지처럼 **기본 코드(main)에서 분기**하여 각자 작업하고,  
완성되면 다시 합치는(merge) 방식입니다.

```
main:    ──●────●────●────●───
               \        /
feature:        ●──●──●
```

- **main 브랜치**: 항상 정상 동작하는 안정적인 코드
- **feature 브랜치**: 새로운 기능을 개발하는 공간

---

## 2. 브랜치 관련 명령어

### 브랜치 목록 보기

```bash
git branch
# * main   (현재 작업 중인 브랜치에 * 표시)
```

### 새 브랜치 만들기

```bash
git branch feature/ble-add
```

### 브랜치 전환하기

```bash
git checkout feature/ble-add
# 또는 최신 명령어
git switch feature/ble-add
```

### 만들면서 전환하기

```bash
git checkout -b feature/ble-add
# 또는
git switch -c feature/ble-add
```

---

## 3. 실전: 기능 개발 브랜치 워크플로

```bash
# 1. main 브랜치로 이동
git checkout main

# 2. 최신 상태로 업데이트
git pull

# 3. 새 기능 브랜치 생성 및 전환
git checkout -b feature/pwm-control

# 4. 코드 작업 후 커밋
git add .
git commit -m "PWM 제어 함수 구현"

# 5. GitHub에 브랜치 푸시
git push -u origin feature/pwm-control
```

---

## 4. 병합 (Merge)

기능 개발이 완료되면 main 브랜치로 병합합니다.

```bash
# 1. main 브랜치로 전환
git checkout main

# 2. 최신 상태로 업데이트
git pull

# 3. feature 브랜치 병합
git merge feature/pwm-control

# 4. GitHub에 업로드
git push
```

---

## 5. 충돌 (Conflict) 해결하기

두 사람이 같은 파일의 같은 부분을 수정하면 **충돌**이 발생합니다.

### 충돌 메시지 예시

```
Auto-merging src/main.c
CONFLICT (content): Merge conflict in src/main.c
Automatic merge failed; fix conflicts and then commit the result.
```

### 충돌 난 파일 열어보기

```c
<<<<<<< HEAD
    HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);
=======
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
>>>>>>> feature/blink
```

- `<<<<<<< HEAD` : 현재 브랜치(main)의 코드
- `=======` : 두 버전의 경계
- `>>>>>>> feature/blink` : 병합하려는 브랜치의 코드

### 해결 방법

1. 충돌 부분을 **수동으로** 편집합니다.
2. `<<<<<<<`, `=======`, `>>>>>>>` 표시를 **삭제**합니다.
3. 원하는 코드만 남깁니다.

```c
// 충돌 해결 후
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
```

4. 저장 후 커밋합니다.

```bash
git add src/main.c
git commit -m "충돌 해결: TogglePin으로 통일"
```

---

## 6. 브랜치 전략 (Branching Strategy)

팀에서 사용하는 대표적인 브랜치 전략:

### GitHub Flow (간단함, 추천)

```
main ──●──────────●──────────●──
         \        / \        /
feature   ●──●──●   ●──●──●
```

- `main`은 항상 배포 가능 상태 유지
- 기능 단위로 브랜치 생성 → PR → main 병합

### Git Flow (복잡함, 대규모 프로젝트)

```
main ──●──────────────●── (배포)
         \            /
develop   ●──●──●──●──
              \    /
feature        ●──●
```

- `develop`: 개발 중인 코드
- `feature/*`: 개별 기능
- `release/*`: 배포 준비
- `hotfix/*`: 긴급 수정

> **초보자**는 **GitHub Flow**로 시작하는 것을 추천합니다.

---

## 요약

| 명령어 | 설명 |
|:-------|:-----|
| `git branch` | 브랜치 목록 확인 |
| `git branch 이름` | 새 브랜치 생성 |
| `git checkout 이름` | 브랜치 전환 |
| `git checkout -b 이름` | 생성 + 전환 |
| `git merge 이름` | 브랜치 병합 |
| `git branch -d 이름` | 브랜치 삭제 |

충돌이 두렵지 않습니다. 천천히 읽고 수동으로 고치면 됩니다.

---

[다음 → 05. 협업하기](05-collaboration.md)
