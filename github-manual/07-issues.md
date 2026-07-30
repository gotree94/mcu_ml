# 07. Issues와 Projects

Issue는 버그, 기능 요청, 할 일 등을 관리하는 도구입니다.  
Projects는 여러 Issue를 칸반 보드 형태로 시각화합니다.

---

## 1. Issue란?

Issue는 프로젝트에서 해결해야 할 **작업 단위**입니다.

| 종류 | 예시 |
|:-----|:------|
| **버그 리포트** | "UART 수신 시 간헐적 데이터 손실" |
| **기능 요청** | "BLE OTA 업데이트 기능 추가" |
| **할 일** | "README에 API 문서 추가" |
| **질문** | "타이머 인터럽트 우선순위 설정 방법" |

---

## 2. Issue 생성하기

1. 리포지토리에서 **Issues** 탭 클릭
2. **New issue** 버튼 클릭
3. 제목과 내용 작성

```markdown
## 버그 설명
UART로 데이터 수신 시 100바이트 이상에서 간헐적으로 데이터가 손실됩니다.

## 재현 방법
1. 115200 baudrate 설정
2. 200바이트 전송
3. 수신 데이터 확인

## 예상 동작
모든 데이터가 정상 수신되어야 합니다.

## 실제 동작
중간 20~30바이트가 누락됩니다.

## 환경
- MCU: STM32F103C8T6
- IDE: STM32CubeIDE 1.15.0
- HAL Library: 1.11.3
```

4. 우측 패널에서 설정:
   - **Assignees**: 담당자 지정
   - **Labels**: `bug`, `enhancement`, `help wanted` 등
   - **Projects**: 연결할 프로젝트 보드
   - **Milestone**: 마일스톤 (버전 단위)

5. **Submit new issue** 클릭

---

## 3. Issue 라벨 활용

GitHub 기본 라벨 + 커스텀 라벨로 이슈를 분류합니다.

| 라벨 | 의미 | 색상 |
|:-----|:-----|:----:|
| `bug` | 버그 | 빨강 |
| `enhancement` | 기능 개선/추가 | 파랑 |
| `documentation` | 문서 작업 | 초록 |
| `good first issue` | 초보자 친화적 작업 | 보라 |
| `help wanted` | 도움 필요 | 주황 |
| `wontfix` | 수정하지 않음 | 회색 |

---

## 4. Projects (칸반 보드)

Projects는 Issue를 시각적으로 관리하는 **칸반 보드**입니다.

### 프로젝트 보드 만들기

1. 리포지토리에서 **Projects** 탭 클릭
2. **New project** 버튼 클릭
3. 템플릿 선택 (예: **Basic Kanban**)
4. 프로젝트 이름 입력

### 기본 컬럼 구성

| 컬럼 | 설명 |
|:-----|:------|
| **To do** | 앞으로 해야 할 작업 |
| **In progress** | 현재 작업 중 |
| **Done** | 완료된 작업 |

작업 흐름: **To do** → **In progress** → **Done**

### Issue를 Project에 연결하기

- Issue 페이지 우측 **Projects**에서 연결
- 또는 Project 보드에서 **+ Add cards**로 추가
- Issue를 드래그 앤 드롭으로 컬럼 이동

---

## 5. 마일스톤 (Milestones)

마일스톤은 특정 버전이나 릴리즈 목표를 관리합니다.

### 마일스톤 만들기

1. **Issues** 탭 → **Milestones** 클릭
2. **Create a milestone** 버튼
3. 정보 입력:
   - **Title**: `v1.0.0`, `v2.1-beta` 등
   - **Due date**: 마감일
   - **Description**: 릴리즈 노트 요약

### 마일스톤에 이슈 연결

Issue 우측 **Milestone**에서 선택합니다.  
마일스톤 페이지에서 진행률(%)을 한눈에 볼 수 있습니다.

---

## 6. 실전: 이슈 기반 개발 워크플로

```
1. 버그 발견 → Issue 생성 (label: bug)
2. 개발자 Issue 할당
3. 기능 브랜치 생성 (이슈 번호 포함)
   → `git checkout -b fix/12-uart-loss`
4. 수정 작업
5. PR 생성 시 "Closes #12" 포함
6. PR 병합 → Issue 자동 종료
```

---

## 7. Issue와 PR 연동 키워드

PR 설명에 다음 키워드를 사용하면 Issue와 자동 연결됩니다.

| 키워드 | 동작 |
|:-------|:------|
| `close #이슈번호` | PR 병합 시 Issue 닫힘 |
| `closes #이슈번호` | 동일 |
| `closed #이슈번호` | 동일 |
| `fix #이슈번호` | PR 병합 시 Issue 닫힘 |
| `fixes #이슈번호` | 동일 |
| `fixed #이슈번호` | 동일 |
| `resolve #이슈번호` | PR 병합 시 Issue 닫힘 |
| `resolves #이슈번호` | 동일 |
| `resolved #이슈번호` | 동일 |
| `ref #이슈번호` | Issue 참조만 함 (닫지 않음) |

---

## 요약

| 도구 | 용도 |
|:-----|:------|
| **Issue** | 버그, 기능, 할 일 추적 |
| **Labels** | Issue 분류 |
| **Projects** | 칸반 보드로 시각화 |
| **Milestones** | 버전 단위 목표 관리 |
| **Issue + PR 연결** | 자동 종료로 워크플로 간소화 |

---

## 전체 과정 요약

축하합니다! 모든 챕터를 완료했습니다.

GitHub 협업의 전체 흐름:

```
1. Issue 생성 (할 일 정의)
2. 브랜치 생성 (feature/xxx)
3. 코드 작업 (로컬)
4. Commit & Push
5. Pull Request 생성
6. 코드 리뷰
7. Merge → Issue 자동 종료
```

[처음으로 → 목차로 돌아가기](index.md)
