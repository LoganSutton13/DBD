FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["npm", "start"]

