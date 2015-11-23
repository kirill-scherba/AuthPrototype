-- --------------------------------------------------------
-- Хост:                         10.15.56.124
-- Версия сервера:               10.0.15-MariaDB-1~wheezy-log - mariadb.org binary distribution
-- ОС Сервера:                   debian-linux-gnu
-- HeidiSQL Версия:              9.3.0.5004
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Дамп структуры для таблица authPrototype.accessTokens
CREATE TABLE IF NOT EXISTS `accessTokens` (
  `token` varchar(128) NOT NULL,
  `userId` varchar(50) NOT NULL,
  `clientId` varchar(50) NOT NULL,
  `expirationDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `FK_accessTokens_users` (`userId`),
  KEY `FK_accessTokens_clients` (`clientId`),
  CONSTRAINT `FK_accessTokens_clients` FOREIGN KEY (`clientId`) REFERENCES `clients` (`clientId`),
  CONSTRAINT `FK_accessTokens_users` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.clients
CREATE TABLE IF NOT EXISTS `clients` (
  `clientId` varchar(50) NOT NULL,
  `clientSecret` varchar(50) NOT NULL,
  `registerDate` datetime NOT NULL,
  `data` blob COMMENT 'json',
  PRIMARY KEY (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.emailRestore
CREATE TABLE IF NOT EXISTS `emailRestore` (
  `email` varchar(50) NOT NULL,
  `token` varchar(128) NOT NULL,
  `dtCreate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.emailValidation
CREATE TABLE IF NOT EXISTS `emailValidation` (
  `email` varchar(50) NOT NULL,
  `token` varchar(128) NOT NULL,
  `dtCreate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.refreshTokens
CREATE TABLE IF NOT EXISTS `refreshTokens` (
  `token` varchar(128) NOT NULL,
  `userId` varchar(50) NOT NULL,
  `clientId` varchar(50) NOT NULL,
  PRIMARY KEY (`token`),
  KEY `FK_refreshTokens_users` (`userId`),
  KEY `FK_refreshTokens_clients` (`clientId`),
  CONSTRAINT `FK_refreshTokens_clients` FOREIGN KEY (`clientId`) REFERENCES `clients` (`clientId`),
  CONSTRAINT `FK_refreshTokens_users` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.socialTemporaryTokens
CREATE TABLE IF NOT EXISTS `socialTemporaryTokens` (
  `token` varchar(128) NOT NULL,
  `social` varchar(50) NOT NULL,
  `expirationDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `profile` blob COMMENT 'json',
  `accessToken` varchar(256) NOT NULL,
  `refreshToken` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.temporaryTokens
CREATE TABLE IF NOT EXISTS `temporaryTokens` (
  `token` varchar(128) NOT NULL,
  `userId` varchar(50) NOT NULL,
  `clientId` varchar(50) NOT NULL,
  `expirationDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `FK_temporaryTokens_users` (`userId`),
  KEY `FK_temporaryTokens_clients` (`clientId`),
  CONSTRAINT `FK_temporaryTokens_clients` FOREIGN KEY (`clientId`) REFERENCES `clients` (`clientId`),
  CONSTRAINT `FK_temporaryTokens_users` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для таблица authPrototype.users
CREATE TABLE IF NOT EXISTS `users` (
  `userId` varchar(50) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `hashPassword` char(128) DEFAULT NULL COMMENT 'sha512',
  `registerDate` datetime NOT NULL,
  `data` blob COMMENT 'json',
  `facebook` varchar(50) DEFAULT NULL,
  `twoFactor` blob COMMENT 'json',
  `deactivated` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `facebook` (`facebook`),
  KEY `deactivated` (`deactivated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Экспортируемые данные не выделены.


-- Дамп структуры для процедура authPrototype.spDeleteUser
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `spDeleteUser`(IN `_userId` VARCHAR(50))
BEGIN
	delete from accessTokens where userId = _userId;
	delete from refreshTokens where userId = _userId;
	delete from temporaryTokens where userId = _userId;
	delete from users where userId = _userId;
END//
DELIMITER ;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
