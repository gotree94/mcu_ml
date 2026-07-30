# 06. Pull Request (PR)

Pull Request는 **내 변경 사항을 팀원에게 알리고, 리뷰를 받고, 병합하는** GitHub의 핵심 협업 기능입니다.

---

## 1. Pull Request란?

브랜치에서 작업한 내용을 main 브랜치에 병합하기 전에 **검토 요청**을 보내는 것입니다.

```
feature 브랜치 ───●──●──●
                    ↓ PR 요청
main 브랜치  ──●─────(리뷰 후 병합)
```

**PR의 역할**:
- "이 코드를 main에 넣어도 될까요?"
- 팀원이 코드를 리뷰하고 피드백
- 토론 후 최종 병합 결정

---

## 2. PR 만들기

### 방법 A: GitHub 웹사이트

1. 기능 브랜치를 GitHub에 push합니다.

```bash
git push -u origin feature/pwm-control
```

2. GitHub 리포지토리 페이지에 접속합니다.
3. 초록색 **Compare & pull request** 버튼이 나타납니다. (클릭)
4. 다음 항목을 작성합니다:

| 항목 | 설명 |
|:-----|:------|
| **base** | 병합 대상 (보통 `main`) |
| **compare** | 내 브랜치 (`feature/pwm-control`) |
| **Title** | PR 제목 (변경 내용 요약) |
| **Description** | 상세 설명, 왜 변경했는지, 테스트 방법 |
| **Reviewers** | 리뷰어 지정 |
| **Assignees** | 담당자 (보통 자신) |
| **Labels** | 라벨 (enhancement, bug 등) |

5. **Create pull request** 버튼 클릭

### 방법 B: gh CLI (터미널)

```bash
gh pr create --base main --title "PWM 제어 기능 추가" --body "PWM 주파수와 듀티 사이클을 설정하는 함수를 추가했습니다."
```

---

## 3. 좋은 PR 작성법

### 제목 예시

```
✅ PWM 제어 기능 추가
❌ feature/pwm-control

✅ UART 버퍼 오버플로우 버그 수정
❌ fix bug
```

### 설명 템플릿 예시

```markdown
## 변경 사항
- PWM 주파수 설정 함수 추가 (`pwm_set_frequency()`)
- 듀티 사이클 설정 함수 추가 (`pwm_set_duty()`)
- PWM 타이머 초기화 코드 리팩토링

## 테스트 방법
1. PA0 핀에 오실로스코프 연결
2. 1kHz, 50% 듀티로 설정
3. 정상 동작 확인 완료

## 관련 이슈
Closes #12
```

> `Closes #12`는 PR이 병합될 때 Issue #12가 자동으로 닫힙니다.

---

## 4. 코드 리뷰 (Code Review)

PR이 생성되면 팀원이 리뷰를 시작합니다.

### 리뷰어의 관점

- **코드 스타일**: 팀 컨벤션을 따르는가?
- **기능 정확성**: 의도대로 동작하는가?
- **에러 처리**: 예외 상황은 처리되었는가?
- **중복 코드**: 기존 코드와 중복되지 않는가?

### 리뷰 코멘트 예시

```
좋습니다! 그런데 HAL_Delay(500) 대신
비동기 타이머를 사용하는 건 어떨까요?
블로킹되지 않고 다른 작업을 수행할 수 있습니다.
```

### 수정 요청받았을 때

```bash
# 1. 같은 브랜치에서 수정
git checkout feature/pwm-control

# 2. 코드 수정 후 커밋
git add .
git commit -m "리뷰 반영: HAL_Delay → 타이머 인터럽트 방식으로 변경"

# 3. 다시 push (PR이 자동 업데이트됨)
git push
```

---

## 5. PR 병합 (Merge)

리뷰가 통과되면 **Merge pull request** 버튼으로 병합합니다.

### 병합 옵션

| 옵션 | 설명 | 히스토리 |
|:-----|:-----|:---------|
| **Create a merge commit** | 모든 커밋 유지 | 복잡하지만 상세 |
| **Squash and merge** | 여러 커밋을 하나로 압축 | 깔끔함 (추천) |
| **Rebase and merge** | 커밋을 main 위로 재배치 | 선형 히스토리 |

> **초보자**는 **Squash and merge**를 추천합니다.  
> "WIP", "fix", "test" 같은 의미 없는 커밋이 하나로 합쳐집니다.

---

## 6. PR 리뷰 체크리스트

PR을 보내기 전에 스스로 확인합니다.

- [ ] 불필요한 파일(`.log`, `build/`)이 포함되지 않았나요?
- [ ] 코드에 하드코딩된 값이 없나요? (매크로나 상수 사용)
- [ ] 커밋 메시지가 명확한가요?
- [ ] `.gitignore`에 추가할 파일이 있나요?
- [ ] 테스트해보았나요? (빌드, 실행)

---

## 요약

1. 기능 브랜치에서 작업 → push
2. GitHub에서 **Compare & pull request**
3. PR 설명 작성 (무엇을, 왜, 어떻게)
4. **리뷰어**가 코드 리뷰
5. 피드백 반영 후 추가 커밋
6. 승인되면 **Merge**

---

[다음 → 07. Issues와 Projects](07-issues.md)
