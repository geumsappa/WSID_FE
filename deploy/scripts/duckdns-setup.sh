#!/usr/bin/env bash
# BE 서버에서 한 번 실행: 5분마다 DuckDNS에 이 서버의 공인 IP를 알려 줘요.
# (EC2를 껐다 켜면 공인 IP가 바뀌기 때문)
# 사용: sudo bash duckdns-setup.sh   → 서브도메인 이름과 토큰을 물어봐요(토큰은 화면에 안 보여요)
set -euo pipefail

read -rp "DuckDNS 서브도메인 이름 (예: wsid): " SUB
read -rsp "DuckDNS 토큰: " TOKEN; echo
# 웹 터미널에서 붙여 넣을 때 섞이는 보이지 않는 문자(붙여넣기 제어 문자, \r 등)를 지워요
SUB=$(printf '%s' "$SUB" | tr -cd 'A-Za-z0-9-' | tr 'A-Z' 'a-z')
TOKEN=$(printf '%s' "$TOKEN" | tr -cd 'A-Za-z0-9-')
[ -n "$SUB" ] && [ -n "$TOKEN" ] || { echo "이름 또는 토큰이 비어 있어요"; exit 1; }

umask 077
printf 'DUCKDNS_SUB=%s\nDUCKDNS_TOKEN=%s\n' "$SUB" "$TOKEN" > /etc/duckdns.env

# systemd EnvironmentFile 대신 셸이 읽게 해요 (웹 터미널 붙여넣기 문자에 덜 민감)
cat > /usr/local/bin/duckdns-update <<'SH'
#!/bin/sh
. /etc/duckdns.env
curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_SUB}&token=${DUCKDNS_TOKEN}&ip=" | grep -q OK
SH
chmod 700 /usr/local/bin/duckdns-update

cat > /etc/systemd/system/duckdns.service <<'UNIT'
[Unit]
Description=Update DuckDNS IP
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/duckdns-update
UNIT

cat > /etc/systemd/system/duckdns.timer <<'UNIT'
[Unit]
Description=Update DuckDNS IP every 5 minutes

[Timer]
OnBootSec=30s
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now duckdns.timer
systemctl start duckdns.service && echo "DuckDNS 갱신 성공: ${SUB}.duckdns.org → $(curl -fsS https://checkip.amazonaws.com)"
