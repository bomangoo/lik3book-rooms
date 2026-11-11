#!/bin/bash
# 자동 실행 서비스와 Funnel 공개를 해제합니다. (코드와 Tailscale 앱은 그대로 둡니다)
source "$(dirname "$0")/common.sh"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && ok "서비스 중지" || true
rm -f "$PLIST" && ok "자동 실행 해제"
TS="$(find_tailscale)"
if [ -n "$TS" ]; then
  "$TS" funnel --https=443 off 2>/dev/null || "$TS" funnel reset 2>/dev/null || true
  ok "Funnel 공개 해제"
fi
