#!/usr/bin/env bash
# EC2(Ubuntu 24.04)를 처음 켰을 때 한 번 실행: Docker 설치, 스왑 2GB, 레포 3개 받기
# 사용: sudo bash setup-server.sh
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# 메모리가 잠깐 모자랄 때(빌드 등) 버티도록 스왑 2GB
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/wsid
cd /opt/wsid
clone() { # 레포 브랜치
  if [ ! -d "$1" ]; then git clone --branch "$2" "https://github.com/geumsappa/$1.git"; fi
}
command -v git-lfs >/dev/null 2>&1 || apt-get install -y git-lfs
clone WSID_FE "${FE_BRANCH:-new-main}"
git -C WSID_FE lfs install --local && git -C WSID_FE lfs pull
clone WSID_BE "${BE_BRANCH:-develop}"
clone WSID_AI "${AI_BRANCH:-develop}"

docker --version
docker compose version
echo "완료: /opt/wsid 에 레포 3개를 받았어요."
