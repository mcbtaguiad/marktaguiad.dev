FROM docker.io/alpine:latest as builder

RUN apk add --update hugo

WORKDIR /site

COPY ./app/ .

RUN hugo

FROM docker.io/nginx:alpine

WORKDIR /etc/nginx/templates

COPY --from=builder /site/public/ .


COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
