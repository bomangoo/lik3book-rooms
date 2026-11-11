#!/bin/bash
# 서버 상태, 접속 인원, 공개 주소, 최근 로그를 보여 줍니다.
source "$(dirname "$0")/common.sh"
say "서버"
if curl -fsS "http://127.0.0.1:$PORT/health"; then echo; ok "켜져 있음"; else warn "응답 없음"; fi
TS="$(find_tailscale)"
if [ -n "$TS" ]; then
  say "Tailscale Funnel"
  "$TS" funnel status || true
fi
say "최근 로그 ($LOG_FILE)"
tail -n 15 "$LOG_FILE" 2>/dev/null || echo "(로그 없음)"
