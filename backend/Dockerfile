FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

# prisma CLI is a devDependency — install all, generate client, then prune
RUN npm ci && npx prisma generate && npm prune --omit=dev

COPY src ./src
COPY .env.example ./.env.example

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]
