# --- Build stage ---
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

# Apply pending migrations then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
