FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# compila TypeScript a JavaScript
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]