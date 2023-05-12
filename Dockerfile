FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM nginx:1.19.0-alpine
COPY --from=0 /app/build /usr/share/nginx/html
EXPOSE 80
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
CMD ["nginx", "-g", "daemon off;"]