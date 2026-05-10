FROM node:24.15.0-alpine3.22

RUN apk add --no-cache docker-cli docker-compose git bash mc

RUN git config --global --add safe.directory /workspace

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
