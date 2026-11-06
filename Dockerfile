FROM node:22.13.1-bookworm-slim

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

COPY site ./site
COPY build.sh ./build.sh

RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
  && chmod +x ./build.sh \
  && cd site \
  && npm ci \
  && git config --global --unset-all url."https://github.com/".insteadOf

ENTRYPOINT ["./build.sh"]
