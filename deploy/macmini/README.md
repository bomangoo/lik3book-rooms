# 맥미니로 실시간 서버 켜기 (무료)

GitHub Pages 에 올라간 서재 화면이 맥미니의 실시간 서버에 붙으면, 한 방에 5명까지 함께 머물 수 있어요.
맥미니에서 서버를 돌리고 **Tailscale Funnel** 로 인터넷에 공개합니다.

- 비용: 0원 (맥미니 전기료만. 대기 시 몇 W 수준)
- 공유기 포트포워딩 필요 없음, `https://` / `wss://` 보안 연결 자동
- 주소가 바뀌지 않는 고정 주소 (`https://맥미니이름.tailnet이름.ts.net`)

```
방문자 브라우저 ──▶ GitHub Pages (화면)
        │
        └─ wss ──▶ Tailscale Funnel ──▶ 맥미니 :8787 (server/index.js)
```

---

## 1. 맥미니가 계속 켜져 있도록 (한 번만)

**시스템 설정 → 에너지** (또는 *에너지 절약*)
- "디스플레이가 꺼져 있을 때 자동으로 잠자기 방지" **켜기**
- "정전 후 자동으로 시동" **켜기**

**시스템 설정 → 사용자 및 그룹 → 자동 로그인** 을 내 계정으로 설정
(서버와 Tailscale 이 로그인한 사용자 아래에서 돌기 때문이에요. FileVault 가 켜져 있으면 자동 로그인이 막혀서, 재부팅 후 한 번은 직접 로그인해야 합니다.)

터미널로 하려면:

```bash
sudo pmset -a sleep 0 autorestart 1
```

## 2. Tailscale 설치 (한 번만)

1. https://tailscale.com/download/mac 에서 설치하고, 메뉴 막대의 Tailscale 아이콘에서 로그인 (개인 무료 플랜)
2. https://login.tailscale.com/admin/dns 에서 **HTTPS Certificates** 를 **Enable**
3. Funnel 권한은 설치 스크립트를 처음 실행할 때 나오는 링크에서 승인하면 됩니다.

## 3. 코드 받고 설치 (한 번만)

```bash
git clone https://github.com/bomangoo/lik3book-rooms.git ~/lik3book-rooms
```

```bash
~/lik3book-rooms/deploy/macmini/install.sh
```

저장소가 비공개라면 clone 할 때 GitHub 로그인이 필요해요 (`brew install gh && gh auth login` 후 다시 clone).

설치 스크립트가 하는 일:

1. Node.js 20 이상 확인 (없고 Homebrew 가 있으면 자동 설치)
2. 서버에 필요한 패키지 설치
3. 로그인하면 자동으로 켜지고, 꺼지면 다시 살아나는 서비스로 등록 (`~/Library/LaunchAgents/com.lik3book.rooms.plist`)
4. Tailscale Funnel 로 공개하고, GitHub 에 넣을 **WS_URL** 값을 알려 줌

끝나면 이런 줄이 보여요:

```
  GitHub 에 넣을 WS_URL 값:
      wss://mac-mini.tail1234.ts.net/ws
```

## 4. GitHub Pages 에 서버 주소 알려 주기 (한 번만)

1. https://github.com/bomangoo/lik3book-rooms/settings/variables/actions 에서 **New repository variable**
   - Name: `WS_URL`
   - Value: 위에서 나온 `wss://…/ws`
2. **Actions** 탭 → **Deploy to GitHub Pages** → **Run workflow**
3. https://bomangoo.github.io/lik3book-rooms/ 에 들어가서 왼쪽 위에 **초록 점 + "1호실"** 이 보이면 연결 성공!

## 관리 명령

| 하고 싶은 일 | 명령 |
| --- | --- |
| 상태·공개 주소·최근 로그 보기 | `~/lik3book-rooms/deploy/macmini/status.sh` |
| 최신 코드로 업데이트 후 재시작 | `~/lik3book-rooms/deploy/macmini/update.sh` |
| 자동 실행·공개 해제 | `~/lik3book-rooms/deploy/macmini/uninstall.sh` |
| 로그 파일 | `~/Library/Logs/lik3book-rooms.log` |

## 설정 바꾸기

설치할 때 환경 변수로 바꿀 수 있어요.

```bash
ALLOWED_ORIGINS="https://bomangoo.github.io,https://내도메인.com" PORT=8787 ~/lik3book-rooms/deploy/macmini/install.sh
```

- `ALLOWED_ORIGINS`: 이 서버에 접속할 수 있는 웹사이트 주소. 기본값은 GitHub Pages 와 로컬 개발 주소예요. 다른 사이트가 이 서버를 몰래 쓰지 못하게 막아 줍니다. 나중에 도메인을 연결하면 여기에 추가하세요.
- `PORT`: 서버 포트 (기본 8787). 바꾸면 Funnel 도 같은 포트로 다시 켜야 해요.

## 문제 해결

- **Pages 에서 계속 "혼자 모드"** → `status.sh` 로 서버가 켜져 있는지, Funnel 이 켜져 있는지 확인. 브라우저에서 `https://…ts.net/health` 가 열리는지 보세요. `WS_URL` 을 바꾼 뒤에는 Pages 를 다시 배포해야 반영됩니다.
- **`/health` 는 열리는데 연결이 안 됨** → `ALLOWED_ORIGINS` 에 지금 접속한 사이트 주소가 들어 있는지 확인하세요 (끝에 `/` 없이).
- **재부팅 후 안 켜짐** → 자동 로그인이 되어 있는지, Tailscale 앱이 로그인 항목에 있는지 확인하세요.
- 방은 5명이 차면 자동으로 2호실, 3호실…로 나뉘어요. 동시 접속은 최대 100명으로 제한해 두었습니다 (`MAX_CONNECTIONS`).
