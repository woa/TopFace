-- phpMyAdmin SQL Dump
-- version 3.3.10
-- http://www.phpmyadmin.net
--
-- Хост: localhost
-- Время создания: Мар 25 2012 г., 00:06
-- Версия сервера: 5.0.95
-- Версия PHP: 5.3.10

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

--
-- База данных: `test`
--

-- --------------------------------------------------------

--
-- Структура таблицы `_dialogs`
--

CREATE TABLE IF NOT EXISTS `_dialogs` (
  `did` int(11) NOT NULL auto_increment,
  `is_active` int(1) NOT NULL,
  PRIMARY KEY  (`did`),
  KEY `is_active` (`is_active`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

--
-- Дамп данных таблицы `_dialogs`
--


-- --------------------------------------------------------

--
-- Структура таблицы `_messages_to_dialogs`
--

CREATE TABLE IF NOT EXISTS `_messages_to_dialogs` (
  `mid` int(11) NOT NULL auto_increment,
  `did` int(11) NOT NULL,
  PRIMARY KEY  (`mid`),
  KEY `did` (`did`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

--
-- Дамп данных таблицы `_messages_to_dialogs`
--


-- --------------------------------------------------------

--
-- Структура таблицы `_messages_x_x`
--

CREATE TABLE IF NOT EXISTS `_messages_x_x` (
  `mid` int(11) NOT NULL,
  `did` int(11) NOT NULL,
  `uid` int(11) NOT NULL,
  `out` tinyint(1) NOT NULL default '0',
  `read_state` int(1) NOT NULL,
  `type` int(1) NOT NULL,
  `date` int(11) NOT NULL,
  `text` text NOT NULL,
  PRIMARY KEY  (`mid`,`did`,`uid`),
  KEY `did` (`did`,`uid`),
  KEY `date` (`date`),
  KEY `type` (`type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Дамп данных таблицы `_messages_x_x`
--


-- --------------------------------------------------------

--
-- Структура таблицы `_users`
--

CREATE TABLE IF NOT EXISTS `_users` (
  `uid` int(10) NOT NULL auto_increment,
  `pass` varchar(32) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `average_mark` float(4,2) NOT NULL default '0.00',
  `marks_count` int(11) NOT NULL default '0',
  `country` varchar(50) NOT NULL,
  `city` varchar(50) NOT NULL,
  `age` int(1) NOT NULL,
  `sex` int(1) NOT NULL,
  `photo` varchar(255) character set latin1 NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY  (`uid`),
  KEY `sex` (`sex`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10 ;

--
-- Дамп данных таблицы `_users`
--

INSERT INTO `_users` (`uid`, `pass`, `first_name`, `average_mark`, `marks_count`, `country`, `city`, `age`, `sex`, `photo`, `last_activity`) VALUES
(1, '', 'Егор', 9.12, 41, 'Россия', 'Питер', 19, 2, 'http://cs4427.userapi.com/u20220417/d_c79618de.jpg', 1332554965),
(2, '', 'Виктор', 0.00, 0, 'Россия', 'Питер', 18, 2, 'http://cs9628.userapi.com/u23756958/d_5802eb6c.jpg', 1332041343),
(3, '', 'Маша', 10.00, 0, 'Россия', 'Питер', 18, 1, 'http://cs303609.userapi.com/u12472209/d_777adfa6.jpg', 1332037342),
(4, '', 'Ира', 0.00, 0, 'Россия', 'Питер', 28, 1, 'http://cs5783.userapi.com/u89971486/d_a0ae43a6.jpg', 1332037344),
(5, '', 'Алена', 7.90, 19, 'Россия', 'Питер', 21, 1, 'http://cs11183.userapi.com/u9886739/d_1748eb83.jpg', 1332619533),
(6, '', 'Алёна', 0.00, 0, 'Россия', 'Питер', 24, 1, 'http://cs9860.userapi.com/u21792532/d_39a28749.jpg', 1332463166),
(7, '', 'Юлия', 0.00, 0, 'Россия', 'Питер', 21, 1, 'http://cs4921.userapi.com/u4709027/d_6bf2dba7.jpg', 1332197819),
(8, '', 'Максим', 0.00, 0, 'Россия', 'Питер', 22, 2, 'http://cs913.userapi.com/u34540486/d_b6872706.jpg', 1331854484),
(9, '', 'Михаил', 0.00, 0, 'Россия', 'Питер', 28, 2, 'http://cs11242.userapi.com/u3951867/d_ad9c8800.jpg', 1332040940);

-- --------------------------------------------------------

--
-- Структура таблицы `_users_to_dialogs_x_x`
--

CREATE TABLE IF NOT EXISTS `_users_to_dialogs_x_x` (
  `id` int(11) NOT NULL auto_increment,
  `uid` int(11) NOT NULL,
  `rid` int(11) NOT NULL,
  `did` int(11) NOT NULL,
  `new` int(11) NOT NULL,
  `is_active` int(1) NOT NULL default '1',
  PRIMARY KEY  (`id`),
  UNIQUE KEY `uid_2_did` (`uid`,`did`),
  KEY `is_active` (`is_active`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

--
-- Дамп данных таблицы `_users_to_dialogs_x_x`
--


-- --------------------------------------------------------

--
-- Структура таблицы `_users_to_friends_x_x`
--

CREATE TABLE IF NOT EXISTS `_users_to_friends_x_x` (
  `id` int(11) NOT NULL auto_increment,
  `uid` int(11) NOT NULL,
  `fid` int(11) NOT NULL,
  PRIMARY KEY  (`id`),
  UNIQUE KEY `uid` (`uid`,`fid`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=9 ;

--
-- Дамп данных таблицы `_users_to_friends_x_x`
--

INSERT INTO `_users_to_friends_x_x` (`id`, `uid`, `fid`) VALUES
(2, 9, 5),
(5, 5, 7),
(6, 5, 1);
