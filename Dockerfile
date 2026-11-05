FROM node:22.13.1-bookworm-slim

WORKDIR /workspace

COPY site ./site
COPY build.sh ./build.sh

RUN chmod +x ./build.sh && cd site && npm ci

ENTRYPOINT ["./build.sh"]
