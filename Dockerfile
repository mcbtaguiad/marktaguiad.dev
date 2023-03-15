FROM nginx:alpine

WORKDIR /app

COPY ./app/public/ .

COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
