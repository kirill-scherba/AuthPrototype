# Authentication server setup

## Setup MariaDB

#### Use docker to setup MariaDB:
```
$ docker run -it --name mariadb -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 -d mariadb
```
*Note: change my-secret-pw to your password*
  
#### Install database schema:
```
https://github.com/green13/AuthPrototype/blob/master/server/db/mysql/schema.sql
```

#### Create database user:
```
CREATE USER 'authUser'@'%' IDENTIFIED BY '123';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE on authPrototype.* to 'authUser'@'%';
```
*Note: change 123 to your password and use this password in ```server/config.json``` config file*

## Setup node

Use docker to setup Node:
```
docker run -it --rm --name node node bash
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

## Run tests
```
mocha
```

## Run server
```
node bin/www --port 1234
```
