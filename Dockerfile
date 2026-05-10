FROM node:24.15.0-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  docker.io docker-compose git bash mc \
  && rm -rf /var/lib/apt/lists/*

RUN git config --global --add safe.directory /workspace

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
