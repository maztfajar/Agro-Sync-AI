FROM node:20-alpine

WORKDIR /app

# Copy server & web app (zero external npm dependencies)
COPY package.json server.js ./
COPY public ./public
RUN mkdir -p /app/data

ENV PORT=3080
ENV HOST=0.0.0.0
ENV TZ=Asia/Jakarta

EXPOSE 3080

CMD ["node", "server.js"]
