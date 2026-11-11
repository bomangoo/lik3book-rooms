#!/bin/bash
# 최신 코드로 업데이트하고 서버를 다시 시작합니다.
set -euo pipefail
source "$(dirname "$0")/common.sh"
cd "$REPO_DIR"
say "최신 코드 받기"
git pull --ff-only
say "의존성 설치"
npm ci --omit=dev --no-audit --no-fund
say "서버 다시 시작"
launchctl kickstart -k "gui/$(id -u)/$LABEL"
sleep 2
curl -fsS "http://127.0.0.1:$PORT/health" && echo && ok "업데이트 완료"
