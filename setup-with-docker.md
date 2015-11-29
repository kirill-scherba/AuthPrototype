# Authentication server setup

## Setup MariaDB

#### Use docker to setup MariaDB:
```
$ docker run --name mariadb -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 -d mariadb
```
*Note: change my-secret-pw to your password*
  
#### Install database schema:
  
https://github.com/green13/AuthPrototype/blob/master/server/db/mysql/schema.sql


#### Create database user:
```
CREATE USER 'authUser'@'%' IDENTIFIED BY '123';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE on authPrototype.* to 'authUser'@'%';
```
*Note: change 123 to your password and use this password in node ```server/config.json``` config file*

## Setup node

Use docker to setup Node:
```
docker run -it --rm --name node -p 1234:1234 node bash
```

## Install project
```
npm install mocha -g  
mkdir ~/Projects
cd ~/Projects
git clone https://github.com/green13/AuthPrototype.git
cd AuthPrototype
cd server
npm install  
```

## Edit config file

Edit node server config file to change ```mysql server host``` to *172.17.0.1* and ```mysql user password``` to 123:
```
apt-get update
apt-get install -y vim
vi config.json
```

## Run tests
```
mocha
```

## Run server
```
node bin/www --port 1234
```
Press Ctrl+p Ctrl+q to leave nodes container running  
  
## Test access to your Authentication server  
  
This link shoul show "Hellow world text":  
http://172.17.0.3:1234/
  
Run this in command line:
```
curl --data "param1=value1&param2=value2" http://172.17.0.3:1234/api/auth/register-client
```
