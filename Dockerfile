FROM peaceiris/hugo:v0.110.0-full  

COPY ./app /src

#WORKDIR /src
#ENTRYPOINT [ "/usr/bin/hugo" ]