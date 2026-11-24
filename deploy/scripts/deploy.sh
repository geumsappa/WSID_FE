#!/usr/bin/env bash
# GitHub Actions가 SSM으로 서버에서 실행하는 배포 스크립트.
# 사용: deploy.sh <be|fe|ai> <브랜치>
#   1) 대상 레포를 해당 브랜치 최신으로 맞추고
#   2) AWS Parameter Store(/wsid/<be|ai>/env)에서 .env를 내려받아
#   3) 해당 서비스만 다시 빌드해서 띄워요.
# (.env 원본은 각 레포의 GitHub Secrets → Actions가 Parameter Store에 저장)
set -euo pipefail
SERVICE="${1:?be, fe, ai 중 하나}"
BRANCH="${2:?브랜치 이름}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-southeast-2}"
ROOT=/opt/wsid
KIT="$ROOT/WSID_FE/deploy"

case "$SERVICE" in
  be) REPO=WSID_BE; STACK=be; PARAM=/wsid/be/env; TARGET=be ;;
  fe) REPO=WSID_FE; STACK=be; PARAM=/wsid/be/env; TARGET=web ;;
  ai) REPO=WSID_AI; STACK=ai; PARAM=/wsid/ai/env; TARGET=ai ;;
  *) echo "알 수 없는 서비스: $SERVICE" >&2; exit 2 ;;
esac

echo "== [1/3] $REPO → $BRANCH"
git config --global --add safe.directory "$ROOT/$REPO" 2>/dev/null || true
git -C "$ROOT/$REPO" fetch -q origin "$BRANCH"
git -C "$ROOT/$REPO" reset -q --hard FETCH_HEAD
git -C "$ROOT/$REPO" log --oneline -1

echo "== [2/3] .env ← Parameter Store $PARAM"
command -v aws >/dev/null 2>&1 || snap install aws-cli --classic >/dev/null
umask 077
aws ssm get-parameter --name "$PARAM" --with-decryption --query Parameter.Value --output text > "$KIT/$STACK/.env.new"
mv "$KIT/$STACK/.env.new" "$KIT/$STACK/.env"
echo "   .env $(grep -c '=' "$KIT/$STACK/.env") 줄 반영 (값은 출력하지 않아요)"

echo "== [3/3] docker compose: $TARGET 다시 빌드"
cd "$KIT/$STACK"
docker compose up -d --build "$TARGET"
docker compose up -d            # 나머지 서비스가 꺼져 있으면 켜기 (이미 떠 있으면 그대로)
docker image prune -f >/dev/null
docker compose ps
echo "== 배포 완료: $SERVICE ($BRANCH)"
