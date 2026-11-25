# FE(React) 빌드 → Nginx 이미지에 정적 파일과 설정을 넣어요. 빌드 컨텍스트: WSID_FE 레포 루트
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

FROM nginx:1.28.0-alpine
RUN apk add --no-cache openssl
COPY --from=build /src/dist /usr/share/nginx/html
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 deploy/nginx/15-wsid-ssl.sh /docker-entrypoint.d/15-wsid-ssl.sh
