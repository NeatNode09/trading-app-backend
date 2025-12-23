FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=${NODE_ENV}
ENV PGUSER=${PGUSER}
ENV PGPASSWORD=${PGPASSWORD}
ENV PGHOST=${PGHOST}
ENV PGPORT=${PGPORT}
ENV PGDATABASE=${PGDATABASE}
ENV JWT_SECRET=${JWT_SECRET}
ENV JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENV EMAIL_USER=${EMAIL_USER}
ENV EMAIL_PASS=${EMAIL_PASS}
ENV NEONDB_URL=${NEONDB_URL}

RUN addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# create writable upload directories
RUN mkdir -p /app/uploads/chat/images \
 && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 5000

CMD ["node", "dist/index.js"]
