#!/bin/sh
# nginx 시작 전에 실행돼요(공식 이미지의 /docker-entrypoint.d).
# 진짜 인증서가 아직 없으면 임시(자체 서명) 인증서로 먼저 켜고,
# certbot이 진짜 인증서를 받으면 1분 안에 바꿔 끼우고 reload 해요. 이후 6시간마다 reload(갱신 반영).
set -e
LIVE="/etc/letsencrypt/live/${DOMAIN}"
DUMMY=/etc/nginx/dummy
mkdir -p /etc/nginx/ssl "$DUMMY"
if [ ! -f "$DUMMY/fullchain.pem" ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 7 -subj "/CN=${DOMAIN}" \
    -keyout "$DUMMY/privkey.pem" -out "$DUMMY/fullchain.pem" 2>/dev/null
fi
use() {
  ln -sf "$1/fullchain.pem" /etc/nginx/ssl/fullchain.pem
  ln -sf "$1/privkey.pem" /etc/nginx/ssl/privkey.pem
}
if [ -f "$LIVE/fullchain.pem" ]; then use "$LIVE"; else use "$DUMMY"; fi

(
  n=0
  while sleep 60; do
    n=$((n + 1))
    if [ -f "$LIVE/fullchain.pem" ] && [ "$(readlink /etc/nginx/ssl/fullchain.pem)" != "$LIVE/fullchain.pem" ]; then
      use "$LIVE" && nginx -s reload && echo "[wsid-ssl] Let's Encrypt 인증서로 교체"
    elif [ $((n % 360)) -eq 0 ]; then
      nginx -s reload
    fi
  done
) &
