# ---------- Build Stage ----------
FROM oven/bun:1.3 AS build
WORKDIR /app

# install deps
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# copy source
COPY src ./src
COPY assets ./assets

# build bundle
RUN bun run build

# ---------- Runtime Stage ----------
FROM oven/bun:1.3-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Bangkok

USER bun

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets

EXPOSE 3000

ENTRYPOINT ["bun", "dist/index.js"]