#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd /opt/databases/campus
exec 9>/run/lock/campus-database-backup.lock
flock -n 9 || exit 0
node scripts/backup.mjs create
