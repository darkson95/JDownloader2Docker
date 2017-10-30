# Builds a docker gui image
FROM hurricane/dockergui:x11rdp1.3

MAINTAINER darkson95

# User/Group Id gui app will be executed as default are 99 and 100
ENV USER_ID=1024
ENV GROUP_ID=100
ENV APP_NAME="JDownloader2"
ENV WIDTH=1280
ENV HEIGHT=720
RUN locale-gen de_DE.UTF-8  
ENV LANG de_DE.UTF-8  
ENV LANGUAGE de_DE:de  
ENV LC_ALL de_DE.UTF-8
ENV TZ=Europe/Berlin
ENV JD_HOME=/config/jd2
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

CMD ["/sbin/my_init"]

# Installation
COPY /src/filebot_4.7.9_amd64.deb /tmp/filebot_4.7.9_amd64.deb
RUN \
echo 'deb http://archive.ubuntu.com/ubuntu trusty main universe restricted' > /etc/apt/sources.list && \
echo 'deb http://archive.ubuntu.com/ubuntu trusty-updates main universe restricted' >> /etc/apt/sources.list && \
mkdir -p /etc/my_init.d && \
export DEBCONF_NONINTERACTIVE_SEEN=true DEBIAN_FRONTEND=noninteractive && \
apt-get update && \
apt-get install -y firefox dos2unix default-jre && \
dpkg -i /tmp/filebot_4.7.9_amd64.deb 

# Install steps for X app
# Copy X app start script to right location
COPY startapp.sh /startapp.sh
RUN dos2unix /startapp.sh
COPY firstrun.sh /etc/my_init.d/firstrun.sh
RUN dos2unix /etc/my_init.d/firstrun.sh
COPY /src/jd2.tar /nobody/jd2.tar
RUN chmod +x /etc/my_init.d/firstrun.sh 

# Place whater volumes and ports you want exposed here:
VOLUME ["/config"]
EXPOSE 6969 8080
