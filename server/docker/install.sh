#!/bin/sh
# 
# File:   install.sh
# Author: Tereshchenko Vladimir
#
# Created on Mar 18 2016 13:02:17 GMT+0300
#


# Install dependencies:
sudo apt-get update
sudo apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs


cd /root/Projects/auth
npm install


echo "Done"