# 03. 기본 Git 명령어

Git은 파일의 변경 이력을 관리하는 **버전 관리 시스템**입니다.  
가장 자주 사용하는 명령어 7가지만 익히면 협업의 80%가 가능합니다.

---

## 1. git clone — 리포지토리 복사

GitHub의 원격 리포지토리를 내 PC로 복사합니다.

```bash
git clone https://github.com/사용자이름/리포지토리이름.git
cd 리포지토리이름
```

> **비유**: ZIP 파일 다운로드 + Git 연결까지 한 번에

---

## 2. git status — 현재 상태 확인

가장 자주 쓰는 명령어입니다. 어떤 파일이 변경되었는지, 커밋할 준비가 되었는지 확인합니다.

```bash
git status
```

출력 예시:

```
On branch main
Changes not staged for commit:
  modified:   src/main.c

Untracked files:
  new_file.txt
```

---

## 3. git add — 변경 사항 스테이징

커밋할 파일들을 **스테이징 영역**에 올립니다.

```bash
# 특정 파일만 추가
git add src/main.c

# 모든 변경 파일 추가
git add .

# 현재 폴더의 모든 변경 파일 추가
git add -A
```

---

## 4. git commit — 변경 사항 저장

**스테이징된 파일들**을 하나의 기록(스냅샷)으로 저장합니다.

```bash
git commit -m "커밋 메시지: 무엇을 변경했는지 간결하게"
```

좋은 커밋 메시지 예시:

```
git commit -m "UART 수신 버퍼 크기를 256으로 변경"
git commit -m "BLE 연결 끊김 시 재연결 로직 추가"
git commit -m "README에 핀맵 테이블 추가"
```

> **규칙**: 명령형 문장, 영어 또는 한글로 간결하게

---

## 5. git push — GitHub에 업로드

로컬에 저장된 커밋들을 GitHub에 업로드합니다.

```bash
# 최초 푸시 (브랜치 연결)
git push -u origin main

# 이후 푸시
git push
```

---

## 6. git pull — GitHub에서 다운로드

팀원이 올린 최신 변경 사항을 내 PC로 내려받습니다.

```bash
git pull
```

> **중요**: `git push`를 하기 전에 항상 `git pull`을 먼저 실행하세요.  
> 그래야 충돌을 예방할 수 있습니다.

---

## 7. git log — 변경 이력 확인

커밋 히스토리를 확인합니다.

```bash
# 전체 로그
git log

# 한 줄 요약
git log --oneline

# 그래프 형태
git log --oneline --graph --all
```

출력 예시:

```
e3a1b2c (HEAD -> main) README에 핀맵 테이블 추가
a4b5c6d BLE 연결 끊김 시 재연결 로직 추가
f6g7h8i UART 수신 버퍼 크기를 256으로 변경
```

---

## 실전 워크플로

하루 작업의 기본 흐름입니다.

```bash
# 1. 최신 상태로 업데이트
git pull

# 2. 코드 수정
# (파일 편집기로 작업)

# 3. 변경 확인
git status

# 4. 스테이징
git add .

# 5. 커밋
git commit -m "GPIO 인터럽트 핸들러 구현"

# 6. 업로드
git push
```

---

## 요약

| 명령어 | 역할 | 사용 빈도 |
|:-------|:-----|:---------:|
| `git clone` | 원격 저장소 복사 | 가끔 |
| `git status` | 현재 상태 확인 | **매우 자주** |
| `git add` | 스테이징 | **매우 자주** |
| `git commit` | 변경 저장 | **매우 자주** |
| `git push` | GitHub로 업로드 | **매일** |
| `git pull` | GitHub에서 다운로드 | **매일** |
| `git log` | 이력 확인 | 가끔 |

---

[다음 → 04. 브랜치와 병합](04-branch.md)
