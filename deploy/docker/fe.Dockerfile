# FE(React) 빌드 → Caddy 이미지에 정적 파일로 넣어요. 빌드 컨텍스트: WSID_FE 레포 루트
FROM node:22-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# 운영 서버 주소. 비어 있으면 앱이 mock(가짜 데이터)으로 동작하므로 빌드를 멈춰요.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_USE_MOCK=false \
    VITE_AI_DEV_URL=
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL is empty" && exit 1)
RUN npm run build

FROM caddy:2.10.2-alpine
COPY --from=build /src/dist /srv
