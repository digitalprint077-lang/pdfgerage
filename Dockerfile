# PDF Gerage — production: Vite frontend + Express API on one port
FROM node:20-bookworm-slim

WORKDIR /app

# Native deps for sharp, canvas, better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    build-essential \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt ./server/requirements.txt
RUN pip3 install -r server/requirements.txt || true

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
