FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN apk --no-cache --virtual build-dependencies add python3 make g++ \
    && npm ci --omit=dev

COPY . .

RUN mkdir -p ./public ./data \
    && cd ./client \
    && npm ci \
    && npm run build \
    && cd .. \
    && mv ./client/build/* ./public \
    && rm -rf ./client

FROM node:20-alpine

COPY --from=builder /app /app

WORKDIR /app

EXPOSE 5005

ENV NODE_ENV=production

CMD ["node", "server.js"]
