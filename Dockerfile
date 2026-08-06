# HomeSmart.ca — Astro SSR web app (also used for the RSS worker with a
# different command; see docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/backend ./backend
COPY --from=build /app/db ./db
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
