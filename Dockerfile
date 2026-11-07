# syntax=docker/dockerfile:1

# ── 1) Compilación ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Ejecuta los tests antes de compilar: si fallan, no se genera la imagen.
# Genera dist/ (la app) y dist-server/index.js (servidor con todo incluido).
RUN npm test && npm run build

# ── 2) Ejecución: solo Node + archivos compilados (sin node_modules) ──
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/app/dist \
    SEED_DEMO_DATA=false
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# La base de datos SQLite vive en /data (móntalo como volumen para no perderla).
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "dist-server/index.js"]
