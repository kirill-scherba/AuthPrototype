# AuthServer Dockerfile

FROM ubuntu:latest
MAINTAINER Tereshchenko Vladimir <vdtereshchenko@gmail.com>

# Add install script
ADD docker/install.sh /root/

# Copy project
ADD . /root/Projects/auth/

# Install
WORKDIR /root/
RUN ./install.sh
RUN rm ./install.sh

# CMD ["/root/teonet_watch_run"]


# context will be /authprototype/server dir
# Dockerfile on windows don't understand home dir ~
# script must be run from /authprototype/server
#
# Build
# cd authprototype/server
# docker build --no-cache -t localhost:5000/auth -f docker/Dockerfile .
#
# Run watcher as an example
# docker run -it --name auth -p 1234:1234 -p 8443:8443 -w /root/Projects/auth localhost:5000/auth node bin/www --port 1234
#