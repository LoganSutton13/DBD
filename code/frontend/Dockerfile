# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ARG REACT_APP_API_BASE_URL=http://localhost:8001
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]
