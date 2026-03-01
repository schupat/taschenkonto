#!/bin/sh
set -e

if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: CRON_SECRET environment variable is required"
  exit 1
fi

# Ensure backup directory exists
mkdir -p /backups

# Inject secrets into the crontab
sed -i "s|CRON_SECRET_PLACEHOLDER|${CRON_SECRET}|g" /etc/crontabs/app
sed -i "s|PGPASSWORD_PLACEHOLDER|${POSTGRES_PASSWORD:-taschenkonto}|g" /etc/crontabs/app

echo "Starting cron (TZ=${TZ:-UTC})..."
exec crond -f -l 2
