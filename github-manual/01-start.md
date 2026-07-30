# 01. GitHub 시작하기

GitHub는 Git 기반의 버전 관리 호스팅 플랫폼입니다.  
전 세계 개발자들이 소스 코드를 저장하고, 관리하며, 협업하는 공간입니다.

---

## 1. GitHub 회원가입

1. [github.com](https://github.com)에 접속합니다.
2. **Sign up** 버튼을 클릭합니다.
3. 이메일 주소, 비밀번호, 사용자 이름을 입력합니다.
4. 로봇이 아님을 인증합니다 (퍼즐 풀기).
5. 이메일로 전송된 인증 코드를 입력하면 가입 완료입니다.

> **팁**: 사용자 이름은 나중에 프로필 URL이 되므로 신중하게 정하세요.  
> `github.com/사용자이름`

---

## 2. Git 설치하기

GitHub를 사용하려면 먼저 PC에 Git 프로그램을 설치해야 합니다.

### Windows

1. [git-scm.com](https://git-scm.com)에서 다운로드합니다.
2. 설치 파일을 실행하고 기본 설정 그대로 **Next**를 계속 누릅니다.
3. 설치 완료 후 터미널(CMD 또는 PowerShell)에서 확인합니다.

```powershell
git --version
# 출력 예: git version 2.45.0.windows.1
```

### macOS

```bash
brew install git
# 또는 Xcode Command Line Tools에 포함되어 있음
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install git
```

---

## 3. Git 사용자 정보 설정

Git을 설치한 후 처음 **한 번만** 해주면 되는 설정입니다.  
커밋(변경 기록)에 이름과 이메일이 기록됩니다.

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

설정이 잘 되었는지 확인하려면:

```bash
git config --global --list
```

> GitHub에 가입한 이메일과 **동일하게** 설정하는 것이 좋습니다.  
> 그래야 커밋이 GitHub 프로필에 연결됩니다.

---

## 4. GitHub 용어 미리보기

| 용어 | 설명 |
|:-----|:-----|
| **Repository (리포지토리)** | 프로젝트 폴더, 코드 저장소 |
| **Commit (커밋)** | 변경 사항의 스냅샷, 저장 단위 |
| **Branch (브랜치)** | 독립적인 작업 공간 (가지) |
| **Push (푸시)** | 로컬 → 원격(GitHub) 업로드 |
| **Pull (풀)** | 원격(GitHub) → 로컬 다운로드 |
| **Pull Request (PR)** | 변경 요청, 코드 리뷰 단위 |
| **Issue (이슈)** | 버그, 기능 요청, 할 일 |

---

## 5. 첫 번째 저장소 둘러보기

가입 후 로그인하면 보이는 화면:

- **왼쪽**: 자신의 리포지토리 목록
- **가운데**: 피드 (팔로우하는 사람의 활동)
- **오른쪽**: 추천 리포지토리, 트렌딩

> **바로가기**: `github.com/사용자이름` — 내 프로필 페이지  
> `github.com/사용자이름?tab=repositories` — 내 리포지토리 목록

---

## 요약

- GitHub 가입 → Git 설치 → 사용자 정보 설정
- 앞으로 모든 Git 작업은 터미널(CMD/PowerShell)에서 실행
- 용어만 익혀두면 나머지는 따라 하면서 자연스럽게 학습

---

[다음 → 02. 리포지토리 만들기](02-repo.md)
