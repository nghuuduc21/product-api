FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "src/healthcheck.js"]

CMD ["node", "src/server.js"]