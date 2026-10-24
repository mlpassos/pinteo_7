#!/usr/bin/env bash
# Retirada da PRIMEIRA publicação. Não restaura dados nem reativa PHP.
# --check valida sem alterar serviços; --execute retira a publicação.
set -euo pipefail
[[ $(id -u) == 0 ]]
mode=${1:---check}
[[ "$mode" == --check || "$mode" == --execute ]]
echo 'ee28f1b841f901656150cc53638d9c25758cb4f4a2c0d4d4d3e2ba75e3a827f9  /etc/caddy/Caddyfile' | sha256sum -c -
echo '16576bbb15659ee677867d42af4d8d478cdbad7f660395566fc3cfafe40b92a8  /var/backups/pinteo7-deploy/20261024T170424Z/Caddyfile.before' | sha256sum -c -
caddy validate --config /var/backups/pinteo7-deploy/20261024T170424Z/Caddyfile.before --adapter caddyfile
[[ -d /var/lib/pinteo7 && -d /var/backups/pinteo7 ]]
if [[ "$mode" == --check ]]; then
  echo 'Recuperação conferida; nenhum serviço alterado.'
  exit 0
fi
systemctl stop pinteo7
# Se o backup falhar, manter a publicação atual disponível.
trap 'systemctl start pinteo7' ERR
cd /srv/pinteo7/current
runuser -u pinteo7 -- env PINTEO7_DATA_DIR=/var/lib/pinteo7 PINTEO7_PUBLIC_ORIGIN=https://pinteo7.instadev.com.br /opt/pinteo7/node/bin/node dist/api/server/admin.js backup "/var/backups/pinteo7/antes-retirada-$(date -u +%Y%m%dT%H%M%SZ)"
cp /etc/caddy/Caddyfile /var/backups/pinteo7-deploy/20261024T170424Z/Caddyfile.before-withdrawal
install -o root -g root -m 0644 /var/backups/pinteo7-deploy/20261024T170424Z/Caddyfile.before /etc/caddy/Caddyfile.t069
mv -T /etc/caddy/Caddyfile.t069 /etc/caddy/Caddyfile
if ! systemctl reload caddy; then
  cp /var/backups/pinteo7-deploy/20261024T170424Z/Caddyfile.before-withdrawal /etc/caddy/Caddyfile
  systemctl reload caddy
  systemctl start pinteo7
  exit 1
fi
systemctl disable pinteo7
trap - ERR
echo 'Publicação retirada; releases, dados e backups preservados.'
