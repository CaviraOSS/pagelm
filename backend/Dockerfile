FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY backend/ ./backend/
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]