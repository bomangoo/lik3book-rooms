#!/bin/bash
# 겨울 서재 실시간 서버를 맥미니에 설치합니다.
# - 로그인하면 자동으로 켜지고, 꺼지면 다시 살아나는 백그라운드 서비스(launchd)로 등록
# - Tailscale Funnel 로 인터넷에 공개 (포트포워딩 불필요, 무료, https/wss 자동)
set -euo pipefail
source "$(dirname "$0")/common.sh"

say "1/4 Node.js 확인"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  if command -v brew >/dev/null 2>&1; then
    brew install node
    NODE_BIN="$(command -v node)"
  else
    warn "Node.js 가 없습니다. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."
    exit 1
  fi
fi
NODE_MAJOR="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  warn "Node.js 20 이상이 필요합니다 (지금: $("$NODE_BIN" -v)). 업데이트 후 다시 실행해 주세요."
  exit 1
fi
ok "Node.js $("$NODE_BIN" -v) ($NODE_BIN)"

say "2/4 서버 의존성 설치"
cd "$REPO_DIR"
npm ci --omit=dev --no-audit --no-fund
ok "설치 완료"

say "3/4 자동 실행 서비스 등록 ($LABEL)"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$REPO_DIR/server/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>PORT</key><string>$PORT</string>
    <key>HOST</key><string>127.0.0.1</string>
    <key>ALLOWED_ORIGINS</key><string>$ALLOWED_ORIGINS</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_FILE</string>
  <key>StandardErrorPath</key><string>$LOG_FILE</string>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 2
if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null; then
  ok "서버가 켜졌습니다: http://127.0.0.1:$PORT/health"
else
  warn "서버가 응답하지 않습니다. 로그를 확인해 주세요: $LOG_FILE"
  tail -n 20 "$LOG_FILE" || true
  exit 1
fi

say "4/4 Tailscale Funnel 로 인터넷에 공개"
TS="$(find_tailscale)"
if [ -z "$TS" ]; then
  warn "Tailscale 이 없습니다. https://tailscale.com/download/mac 에서 설치하고 로그인한 뒤,"
  warn "이 스크립트를 다시 실행하거나 아래 명령을 실행해 주세요:"
  echo "    tailscale funnel --bg $PORT"
  exit 0
fi
echo "처음 한 번은 브라우저에서 Funnel 사용을 허락하라는 링크가 나올 수 있어요. 링크를 열어 승인해 주세요."
"$TS" funnel --bg "$PORT"
DNS="$("$TS" status --json | "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write((j.Self&&j.Self.DNSName||"").replace(/\.$/,""))})')"
echo
ok "설치가 끝났습니다!"
if [ -n "$DNS" ]; then
  echo
  echo "  공개 주소 확인:  https://$DNS/health"
  echo "  GitHub 에 넣을 WS_URL 값:"
  echo
  printf '      \033[1mwss://%s/ws\033[0m\n' "$DNS"
  echo
  echo "  → 저장소 Settings → Secrets and variables → Actions → Variables 에 WS_URL 로 저장한 뒤"
  echo "    Actions 탭에서 'Deploy to GitHub Pages' 를 다시 실행하세요."
fi
