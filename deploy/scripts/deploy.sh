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
# SSM(자동 실행)에는 HOME과 /snap/bin 경로가 없어서 직접 맞춰 줘요
export HOME="${HOME:-/root}"
export PATH="$PATH:/snap/bin:/usr/local/bin"
ROOT=/opt/wsid
KIT="$ROOT/WSID_FE/deploy"

case "$SERVICE" in
  be) REPO=WSID_BE; STACK=be; PARAM=/wsid/be/env; TARGET=be ;;
  fe) REPO=WSID_FE; STACK=fe; PARAM=/wsid/fe/env; TARGET=web ;;
  ai) REPO=WSID_AI; STACK=ai; PARAM=/wsid/ai/env; TARGET=ai ;;
  *) echo "알 수 없는 서비스: $SERVICE" >&2; exit 2 ;;
esac

echo "== [1/3] $REPO → $BRANCH"
git config --global --add safe.directory "$ROOT/$REPO" 2>/dev/null || true
git -C "$ROOT/$REPO" fetch -q origin "$BRANCH"
git -C "$ROOT/$REPO" reset -q --hard FETCH_HEAD
git -C "$ROOT/$REPO" log --oneline -1
# 이미지 등을 Git LFS로 관리하는 레포(WSID_FE)는 실제 파일을 따로 받아야 해요. 안 받으면 로고가 깨져요
if grep -qs "filter=lfs" "$ROOT/$REPO/.gitattributes"; then
  command -v git-lfs >/dev/null 2>&1 || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git-lfs >/dev/null; }
  git -C "$ROOT/$REPO" lfs install --local >/dev/null
  git -C "$ROOT/$REPO" lfs pull
  LEFT=$(git -C "$ROOT/$REPO" lfs ls-files 2>/dev/null | grep -c ' - ' || true)
  if [ "$LEFT" -gt 0 ]; then echo "!! LFS 파일 ${LEFT}개를 받지 못했어요" >&2; exit 1; fi
  echo "   Git LFS 파일 받기 완료"
fi

echo "== [2/3] .env ← Parameter Store $PARAM"
command -v aws >/dev/null 2>&1 || snap install aws-cli --classic >/dev/null
echo "   aws: $(command -v aws) / $(aws --version 2>&1 | cut -d' ' -f1)"
# umask 077 상태에서는 snap으로 설치된 aws가 빈 결과를 낼 수 있어서, 값은 변수로 받고 파일 권한은 따로 지정해요
ENV_VALUE=$(aws ssm get-parameter --name "$PARAM" --with-decryption --query Parameter.Value --output text)
install -m 600 /dev/null "$KIT/$STACK/.env.new"
printf '%s\n' "$ENV_VALUE" > "$KIT/$STACK/.env.new"
unset ENV_VALUE
LINES=$(grep -c '=' "$KIT/$STACK/.env.new" || true)
if [ "$LINES" -eq 0 ]; then
  echo "!! Parameter Store에서 받은 .env가 비어 있어요 ($PARAM). 기존 .env를 그대로 두고 멈춰요." >&2
  rm -f "$KIT/$STACK/.env.new"; exit 1
fi
mv "$KIT/$STACK/.env.new" "$KIT/$STACK/.env"
echo "   .env ${LINES}줄 반영 (값은 출력하지 않아요)"

echo "== [3/3] docker compose: $TARGET 다시 빌드"
cd "$KIT/$STACK"
docker compose up -d --build "$TARGET"
docker compose up -d            # 나머지 서비스가 꺼져 있으면 켜기 (이미 떠 있으면 그대로)
docker image prune -f >/dev/null
docker compose ps
echo "== 배포 완료: $SERVICE ($BRANCH)"
