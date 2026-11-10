# ❄ 겨울 서재 · lik3book rooms

눈 내리는 겨울 밤, 벽난로가 타닥타닥 타는 산방 서재에 모여 **책을 읽거나 조용히 사색하는** 2D 온라인 공간입니다.
바람의 나라 같은 2등신 픽셀 캐릭터로 입장하고, 한 방(호실)에 최대 5명이 함께 머물 수 있습니다.

## 주요 기능

- **캐릭터 선택 & 이름 짓기**: 선비 도령, 댕기 낭자, 동자승, 아기 호랑이, 눈토끼, 털모자 아이 (6종, 모두 코드로 그린 픽셀 아트)
- **세션 스토리지 저장**: 캐릭터·이름은 `sessionStorage`에 저장되어, 같은 탭으로 다시 오면(새로고침 포함) 입장 화면 없이 바로 서재로 들어갑니다.
  메뉴(☰) → "캐릭터·이름 바꾸기"로 다시 고를 수 있습니다.
- **실시간 함께하기**: WebSocket으로 위치·자세·말풍선·이모트를 동기화합니다. 방이 5명으로 차면 자동으로 다음 호실(2호실, 3호실…)로 안내합니다.
  서버에 연결되지 않으면 '혼자 모드'로 계속 이용할 수 있고, 자동으로 재접속을 시도합니다.
- **겨울 인테리어**: 벽난로(불꽃·불티 애니메이션), 깜빡이는 크리스마스 트리, 눈 내리는 창문, 책장 4개와 곳곳의 책 더미, 러그와 안락의자, 족자(讀·靜), 촛불·스탠드 조명 효과
- **책 읽기**: 책장/책 더미를 누르면 책을 골라 읽을 수 있습니다. (윤동주·김소월·정지용·이육사·한용운의 시, 도덕경·논어·장자·금강경 풀이, 서재지기의 산문과 겨울 이야기)
- **사색하기**: 의자에 앉아 호흡 가이드와 함께 생각거리를 천천히 곱씹는 모드
- **반응형 전체 화면**: PC·모바일 모두 화면을 가득 채웁니다. 세로 화면에서는 방 위아래가 서까래(청사초롱)와 눈 쌓인 마당으로 이어집니다.
- **장작 소리**: Web Audio로 합성한 벽난로 소리 (🔈 버튼)

## 조작법

| 동작 | PC | 모바일 |
| --- | --- | --- |
| 이동 | 바닥 클릭, 방향키/WASD | 바닥 터치 |
| 상호작용 (책장·의자·벽난로·트리·책 더미) | 클릭, 또는 바라보고 Space/E | 터치 |
| 말하기 | Enter | 💬 말하기 |

## 시작하기

```bash
npm install
npm run dev        # 웹(vite, :5173) + 실시간 서버(:8787) 동시 실행
```

브라우저에서 http://localhost:5173 을 열면 됩니다. 창을 여러 개 띄우면 함께 있는 모습을 확인할 수 있습니다.

### 배포

```bash
npm run build      # dist/ 생성
npm start          # dist 정적 파일 + WebSocket(/ws)을 한 서버(:PORT, 기본 8787)에서 제공
```

Node 서버를 띄울 수 있는 곳(Render, Fly.io, Railway, VPS 등)에 그대로 올리면 됩니다.
프론트엔드만 정적 호스팅에 따로 올릴 경우 `.env.example`을 참고해 `VITE_WS_URL`에 서버의 WebSocket 주소를 지정하세요.
서버 상태는 `GET /health`에서 확인할 수 있습니다.

### GitHub Pages

`main`에 푸시하면 `.github/workflows/deploy-pages.yml`이 빌드해서 GitHub Pages에 올립니다.
처음 한 번은 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정해야 합니다.

GitHub Pages는 정적 호스팅이라 실시간 서버를 실행할 수 없어서, 그대로 두면 **혼자 모드**(이동·책 읽기·사색은 모두 가능)로 동작합니다.
여럿이 함께 쓰려면 `server/index.js`를 Node 호스팅에 따로 띄우고, 저장소 **Settings → Secrets and variables → Actions → Variables**에
`WS_URL`(예: `wss://my-server.onrender.com/ws`)을 추가한 뒤 다시 배포하세요.

## 구조

```
server/index.js            WebSocket 중계 서버 (호실 배정, 정원 5명, 입력 검증)
src/
  App.jsx                  세션 스토리지 프로필 → 입장 화면 / 서재
  components/
    EntryScreen.jsx        캐릭터 선택 + 이름 입력
    LibraryRoom.jsx        서재 화면, HUD, 네트워크 연결
    BookModal.jsx          책장 / 책 읽기
    ThinkOverlay.jsx       사색 모드
  game/
    engine.js              게임 루프, 입력, 길찾기 이동, 조명, 렌더링
    map.js                 24×16 타일 배치도, 충돌, 의자, 광원
    characters.js          픽셀 캐릭터 스프라이트 생성
    furniture.js           가구 스프라이트 생성
    background.js          바닥·벽·창문·러그, 천장/마당 확장 영역
  content/books.js         책 내용과 사색 문장
  net/client.js            자동 재접속 WebSocket 클라이언트
  audio/ambience.js        장작 소리 합성
```

> 참고: `sessionStorage`는 탭 단위 저장소라 탭을 완전히 닫으면 지워집니다. 브라우저를 닫은 뒤에도 기억하게 하려면 `src/lib/storage.js`에서 `localStorage`로 바꾸면 됩니다.
