FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY src/assets ./assets
RUN mkdir -p /data
VOLUME ["/data"]
ENV PORT=3000
ENV DB_PATH=/data/olive.db
EXPOSE 3000
CMD ["node", "dist/index.js"]
