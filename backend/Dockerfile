FROM node:18-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --production

# Copy source
COPY backend/src ./src
COPY backend/*.js ./

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "node", "src/index.js" ]
