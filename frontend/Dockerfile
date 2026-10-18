FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/angular.json frontend/tsconfig.json frontend/proxy.conf.json ./
COPY frontend/src ./src
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
