FROM docker.io/ubuntu:22.04 as builder

RUN apt-get update -y && apt-get upgrade -y

RUN apt-get install -y hugo

WORKDIR /site

COPY ./app/ .

RUN hugo

FROM docker.io/nginx:1.25.5-bookworm

WORKDIR /app

COPY --from=builder /site/public/ .


COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 80


# FROM docker.io/httpd:latest

# COPY --from=builder /srv/jekyll/_site/ /usr/local/apache2/htdocs/
# COPY --from=builder /site/public/*  /usr/local/apache2/htdocs/

