# 05. 협업하기

GitHub에서 팀원과 함께 작업하는 방법을 알아봅니다.

---

## 1. Collaborator 초대하기

Private 리포지토리에서 팀원을 초대하는 방법입니다.

1. 리포지토리 페이지에서 **Settings** 탭 클릭
2. 왼쪽 메뉴에서 **Collaborators** 클릭
3. **Add people** 버튼 클릭
4. 팀원의 GitHub 사용자 이름 또는 이메일 입력
5. 초대하면 팀원의 이메일로 알림이 전송됨

> Public 리포지토리는 누구나 볼 수 있지만,  
> Collaborator로 등록되어야 **쓰기 권한**을 가집니다.

---

## 2. Organization 사용하기

여러 리포지토리를 팀 단위로 관리하려면 **Organization**을 만듭니다.

1. GitHub 우측 상단 **+** → **New organization**
2. 팀 이름 입력
3. 멤버 초대
4. 리포지토리 생성 시 Owner를 Organization으로 선택

**장점**:
- 팀 단위 권한 관리
- 여러 리포지토리를 한 곳에서 관리
- 팀 페이지 (`github.com/조직이름`)

---

## 3. 팀 협업 워크플로

### 상황

- A와 B가 같은 리포지토리에서 작업
- 각자 다른 기능 개발

### A의 작업

```bash
# 1. main 최신화
git checkout main
git pull

# 2. 기능 브랜치 생성
git checkout -b feature/sensor-read

# 3. 작업 후 커밋 및 푸시
git add .
git commit -m "센서 읽기 함수 구현"
git push -u origin feature/sensor-read
```

### B의 작업

```bash
# 1. main 최신화
git checkout main
git pull

# 2. 기능 브랜치 생성
git checkout -b feature/ble-send

# 3. 작업 후 커밋 및 푸시
git add .
git commit -m "BLE 데이터 전송 함수 구현"
git push -u origin feature/ble-send
```

---

## 4. 협업 시 주의사항

### 규칙 1: main에서 직접 작업하지 않기

```bash
# ❌ 나쁜 예
git checkout main
git add .
git commit -m "급한 수정"
git push

# ✅ 좋은 예
git checkout -b hotfix/typo
git add .
git commit -m "오타 수정"
git push
```

### 규칙 2: push 전에 항상 pull

```bash
# ❌ 나쁜 예
git push  # 바로 push하면 충돌 위험

# ✅ 좋은 예
git pull --rebase
git push
```

### 규칙 3: 커밋 메시지 통일하기

팀에서 커밋 메시지 규칙을 정하면 좋습니다.

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 변경
refactor: 코드 리팩토링
style: 코드 포맷팅
chore: 빌드 설정 변경
```

---

## 5. Fork — 다른 사람의 리포지토리에 기여하기

오픈소스 프로젝트나 다른 사람의 리포지토리에 기여할 때 사용합니다.

1. 기여하려는 리포지토리 페이지에서 **Fork** 버튼 클릭
2. 내 GitHub 계정으로 리포지토리가 복사됨
3. 내 리포지토리를 clone

```bash
git clone https://github.com/내계정/원본리포지토리.git
```

4. 변경 후 내 리포지토리에 push
5. 원본 리포지토리에 **Pull Request** 보내기

> Fork한 리포지토리는 원본과 독립적입니다.  
> 원본의 최신 변경사항을 받으려면 upstream 설정이 필요합니다.

```bash
git remote add upstream https://github.com/원본소유자/원본리포지토리.git
git pull upstream main
```

---

## 요약

| 방식 | 설명 |
|:-----|:------|
| **Collaborator** | 같은 리포지토리에 직접 초대 |
| **Organization** | 팀 단위 리포지토리 관리 |
| **Fork** | 타인 리포지토리에 기여 (오픈소스) |
| **Branch** | 각자 브랜치에서 작업 후 병합 |

---

[다음 → 06. Pull Request](06-pull-request.md)
