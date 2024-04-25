FROM docker.io/alpine:latest as builder

RUN apk add --update hugo

WORKDIR /site

COPY ./app/ .

RUN hugo

# FROM docker.io/nginx:alpine

# WORKDIR /app

# COPY --from=builder /site/public/ .


# COPY ./nginx.conf /etc/nginx/nginx.conf

# EXPOSE 80


FROM docker.io/httpd:latest

# COPY --from=builder /srv/jekyll/_site/ /usr/local/apache2/htdocs/
COPY --from=builder /site/public/*  /usr/local/apache2/htdocs/

