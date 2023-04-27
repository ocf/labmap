FROM node:20-alpine
COPY package.json package-lock.json ./
RUN NODE_ENV=production npm ci
COPY . .
RUN npm run build

FROM lipanski/docker-static-website:2.1.0
COPY --from=0 /dist ./
