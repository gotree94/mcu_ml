# 02. 리포지토리 만들기

리포지토리(Repository)는 프로젝트의 모든 파일과 변경 이력을 저장하는 공간입니다.

---

## 1. GitHub에서 새 리포지토리 생성하기

1. GitHub에 로그인합니다.
2. 우측 상단의 **+** 버튼 → **New repository**를 클릭합니다.
3. 다음 항목을 입력합니다:

| 항목 | 설명 | 예시 |
|:-----|:-----|:-----|
| **Repository name** | 리포지토리 이름 (필수) | `my-first-project` |
| **Description** | 설명 (선택) | "STM32 블루투스 프로젝트입니다" |
| **Public / Private** | 공개 / 비공개 설정 | Public 권장 (무료) |
| **README** | 리포지토리 소개 파일 | 체크 권장 |
| **.gitignore** | Git 추적 제외 파일 템플릿 | C 또는 Python 선택 |
| **License** | 라이선스 | MIT (오픈소스) |

4. **Create repository** 버튼을 클릭합니다.

---

## 2. 리포지토리 구성 파일

### README.md

리포지토리의 첫인상, 프로젝트 소개서입니다.  
GitHub에서 리포지토리에 접속하면 가장 먼저 보이는 파일입니다.

```markdown
# my-first-project

이 프로젝트는 STM32F103 블루투스 통신을 구현합니다.

## 기능

- UART를 통한 블루투스 모듈 제어
- 센서 데이터 수집 및 전송
- 저전력 모드 지원

## 사용법

\`\`\`bash
git clone https://github.com/사용자이름/my-first-project.git
\`\`\`
```

### .gitignore

Git이 추적하지 않을 파일/폴더를 지정합니다.

```gitignore
# 빌드 결과물
build/
*.elf
*.hex
*.bin

# IDE 설정 파일
.vscode/
.idea/
*.uvoptx
*.uvguix

# 임시 파일
*.log
*.tmp
```

### LICENSE

오픈소스 라이선스를 명시합니다.  
MIT 라이선스가 가장 간단하고 널리 사용됩니다.

---

## 3. 로컬에 리포지토리 연결하기 (clone)

GitHub에 만든 리포지토리를 내 PC로 가져옵니다.

```bash
git clone https://github.com/사용자이름/my-first-project.git
cd my-first-project
```

---

## 4. 기존 프로젝트를 GitHub에 올리기

이미 PC에서 작업 중인 프로젝트를 GitHub에 연결하는 방법입니다.

```bash
# 1. 프로젝트 폴더로 이동
cd C:\STM32F103\my-project

# 2. Git 저장소 초기화
git init

# 3. 모든 파일을 스테이징
git add .

# 4. 첫 커밋
git commit -m "첫 번째 커밋"

# 5. GitHub 리포지토리를 원격 저장소로 등록
git remote add origin https://github.com/사용자이름/my-project.git

# 6. GitHub에 업로드
git push -u origin main
```

---

## 5. 리포지토리 설정 팁

GitHub 리포지토리의 **Settings** 탭에서:

- **Collaborators** → 팀원 초대
- **Branches** → 브랜치 보호 규칙 설정
- **Webhooks** → 외부 서비스 연동
- **Pages** → GitHub Pages (웹사이트 호스팅)
- **Secrets and variables** → API 키 등 환경 변수 저장

---

## 요약

1. GitHub에서 **New repository** 생성
2. **README.md**로 프로젝트 소개
3. **.gitignore**로 불필요한 파일 제외
4. `git clone`으로 로컬에 복사
5. `git init` → `add` → `commit` → `remote` → `push` 순서로 기존 프로젝트 업로드

---

[다음 → 03. 기본 Git 명령어](03-basic-git.md)
