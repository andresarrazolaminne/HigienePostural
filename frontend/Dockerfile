FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL=
ARG VITE_BASE=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE=$VITE_BASE

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache bind-tools
RUN mkdir -p /etc/nginx/conf.d /etc/nginx/snippets
COPY docker-nginx-entrypoint.sh /docker-nginx-entrypoint.sh
RUN sed -i 's/\r$//' /docker-nginx-entrypoint.sh && chmod +x /docker-nginx-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=90s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

ENTRYPOINT ["/docker-nginx-entrypoint.sh"]
