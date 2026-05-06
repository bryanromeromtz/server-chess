FROM node:22-alpine

# instalar stockfish en el contenedor
RUN apk add --no-cache stockfish

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]