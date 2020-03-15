FROM docker.ocf.berkeley.edu/theocf/debian:buster

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        nginx \
        python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


COPY www /srv/www
COPY nginx.conf /srv/

USER nobody

CMD ["nginx", "-c", "/srv/nginx.conf", "-p", "/tmp"]
