# Multi-stage build: build with Node, serve static files with Nginx
FROM node:18-alpine AS build
WORKDIR /app

# install dependencies
COPY frontend/package*.json ./
RUN npm ci --silent

# copy source and build
COPY frontend/ ./
RUN npm run build

## Production image
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback to index.html
RUN rm /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
