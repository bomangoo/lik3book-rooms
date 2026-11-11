# Render 무료 플랜으로 실시간 서버 켜기 (맥미니 없이)

저장소 루트의 `render.yaml` 이 서버 설정을 모두 담고 있어서, 클릭 몇 번이면 됩니다. 비용 0원.

## 1. 서버 만들기 (한 번만)

1. https://render.com 에 GitHub 계정으로 가입
2. 대시보드 → **New** → **Blueprint** → `bomangoo/lik3book-rooms` 선택
   (저장소가 안 보이면 *Configure GitHub App* 에서 이 저장소 접근을 허락)
3. `render.yaml` 내용대로 **lik3book-rooms** (Free, Singapore) 가 보이면 **Apply**
4. 배포가 끝나면 서비스 주소가 생깁니다. 예: `https://lik3book-rooms.onrender.com`
   브라우저에서 `https://lik3book-rooms.onrender.com/health` 가 열리면 성공

## 2. 서재 화면에 서버 주소 알려 주기 (한 번만)

1. https://github.com/bomangoo/lik3book-rooms/settings/variables/actions → **New repository variable**
   - Name: `WS_URL`
   - Value: `wss://lik3book-rooms.onrender.com/ws` (실제 주소로)
2. **Actions** 탭 → **Deploy to GitHub Pages** → **Run workflow**
3. https://lik3book.p-e.kr 왼쪽 위에 **초록 점 + "1호실"** 이 보이면 연결 성공

## 알아 둘 점

- 15분 동안 아무도 없으면 서버가 잠들어요. 다음 손님이 오면 깨어나는 데 최대 1분쯤 걸리고,
  그동안 화면에는 **"서버 깨우는 중…"** 이 보이다가 깨어나면 자동으로 합류합니다.
  (화면을 여는 순간 서버를 미리 깨우도록 해 두었어요.)
- 누군가 접속해 있는 동안은 잠들지 않아요. 무료 시간(월 750시간)은 서비스 하나를 한 달 내내 켜 둘 만큼입니다.
- `main` 에 푸시하면 서버도 자동으로 다시 배포됩니다.
- 접속 가능한 사이트는 `render.yaml` 의 `ALLOWED_ORIGINS` 로 정해요 (지금: `https://lik3book.p-e.kr`, GitHub Pages 주소).
