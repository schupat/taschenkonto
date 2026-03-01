FROM alpine:3.21

RUN apk add --no-cache curl tzdata postgresql17-client

COPY crontab /etc/crontabs/app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
