#!/usr/bin/env bash
# BE 서버에서 한 번 실행: 5분마다 DuckDNS에 이 서버의 공인 IP를 알려 줘요.
# (EC2를 껐다 켜면 공인 IP가 바뀌기 때문)
# 사용: sudo bash duckdns-setup.sh   → 서브도메인 이름과 토큰을 물어봐요(토큰은 화면에 안 보여요)
set -euo pipefail

read -rp "DuckDNS 서브도메인 이름 (예: wsid): " SUB
read -rsp "DuckDNS 토큰: " TOKEN; echo

install -m 600 /dev/null /etc/duckdns.env
printf 'DUCKDNS_SUB=%s\nDUCKDNS_TOKEN=%s\n' "$SUB" "$TOKEN" > /etc/duckdns.env

cat > /etc/systemd/system/duckdns.service <<'UNIT'
[Unit]
Description=Update DuckDNS IP
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/duckdns.env
ExecStart=/bin/sh -c 'curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_SUB}&token=${DUCKDNS_TOKEN}&ip=" | grep -q OK'
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
