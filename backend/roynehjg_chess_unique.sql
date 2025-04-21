-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 19, 2025 at 11:20 AM
-- Server version: 8.0.40-0ubuntu0.22.04.1
-- PHP Version: 8.4.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `roynehjg_chess_unique`
--

-- --------------------------------------------------------

--
-- Table structure for table `games`
--

CREATE TABLE `games` (
  `game_id` int NOT NULL,
  `game_state` enum('starting','running','waiting','active','checkmate','aborted','abandoned','draw') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `player1` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `player2` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `reward` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bet_status` tinyint(1) DEFAULT '0',
  `player_amount` decimal(18,8) DEFAULT NULL,
  `transaction_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `game_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `entire_game` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `duration` bigint NOT NULL DEFAULT '5000',
  `move_history` json DEFAULT NULL,
  `current_fen` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `time_difference` varchar(10000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `addon` text COLLATE utf8mb4_general_ci,
  `start_date` datetime DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `games`
--

INSERT INTO `games` (`game_id`, `game_state`, `player1`, `player2`, `reward`, `bet_status`, `player_amount`, `transaction_id`, `game_hash`, `entire_game`, `duration`, `move_history`, `current_fen`, `time_difference`, `addon`, `start_date`, `timestamp`) VALUES
(1, 'running', 'player1_wallet', 'player2_wallet', 'winner_wallet', 0, NULL, NULL, '', '', 5000, NULL, NULL, NULL, NULL, '2025-04-15 10:09:57', '2025-04-15 09:09:57'),
(2, 'starting', 'player1_wallet', '', NULL, 0, NULL, NULL, '', '', 5000, NULL, NULL, NULL, NULL, '2025-04-15 23:06:40', '2025-04-15 22:06:40'),
(3, 'starting', 'player1_wallet', '', NULL, 0, NULL, NULL, '1bea748d-8c5e-4b03-b482-48c51e9d56f5', NULL, 5000, NULL, NULL, NULL, NULL, '2025-04-17 15:49:33', '2025-04-17 14:49:33'),
(4, 'waiting', 'player_2ohrwdca', '', NULL, 0, NULL, NULL, '1957e142-55fb-41b4-ae3b-bfbbb7cea562', NULL, 300000, NULL, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 10:51:30', '2025-04-19 09:51:30'),
(5, 'waiting', '', 'player_mk1l1s07', NULL, 0, NULL, NULL, '13640872-1185-4bba-a079-be53a21801c9', NULL, 300000, NULL, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 10:53:49', '2025-04-19 09:53:48'),
(6, 'waiting', '', 'player_vt68h2p1', NULL, 0, NULL, NULL, '34c5fa5e-8460-409a-a7cb-4429ae9579f3', NULL, 300000, NULL, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 11:12:20', '2025-04-19 10:12:20'),
(7, 'waiting', 'player_m4oihio4', '', NULL, 0, NULL, NULL, '434faaaf-e4bb-45c0-ae90-bba0d9fa8ca6', NULL, 300000, NULL, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 11:13:34', '2025-04-19 10:13:34'),
(8, 'waiting', '', 'player_9xzhhgmh', NULL, 0, NULL, NULL, '2d9d64c8-a104-49cc-b057-bf44746b7804', NULL, 300000, NULL, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 11:17:59', '2025-04-19 10:17:58'),
(9, 'waiting', 'player_6a0xvm0w', '', NULL, 0, NULL, NULL, '1b3dd3f2-601e-4b02-a110-2c976ff43a84', NULL, 300000, '[\"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1\", \"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1\", \"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1\", \"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1\"]', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 11:24:03', '2025-04-19 10:24:03'),
(10, 'waiting', '', 'player_aykfo2qb', NULL, 0, NULL, NULL, '3440990a-985d-4f6c-bf60-a30bb58399a9', NULL, 300000, NULL, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', NULL, NULL, '2025-04-19 11:37:41', '2025-04-19 10:37:40');

-- --------------------------------------------------------

--
-- Table structure for table `game_data`
--

CREATE TABLE `game_data` (
  `id` int NOT NULL,
  `game_id` int NOT NULL,
  `fen_state` text COLLATE utf8mb4_general_ci NOT NULL,
  `move` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `time_left` int DEFAULT NULL,
  `client_time` bigint DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `client` enum('player1','player2') COLLATE utf8mb4_general_ci NOT NULL,
  `addon` text COLLATE utf8mb4_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `game_data`
--

INSERT INTO `game_data` (`id`, `game_id`, `fen_state`, `move`, `time_left`, `client_time`, `timestamp`, `client`, `addon`) VALUES
(3, 1, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', NULL, NULL, 20250417071146, '2025-04-17 06:11:46', 'player1', NULL),
(4, 1, '8/2k5/8/8/3K4/8/8/6Q1 b - - 0 1', NULL, NULL, 20250417080536, '2025-04-17 07:05:36', 'player1', NULL),
(5, 1, '8/2k5/8/8/3K4/8/8/6Q1 w - - 0 1', NULL, NULL, 20250417080610, '2025-04-17 07:06:10', 'player2', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `margin`
--

CREATE TABLE `margin` (
  `id` int NOT NULL,
  `profit` decimal(18,8) DEFAULT NULL,
  `loss` decimal(18,8) DEFAULT NULL,
  `addon` text COLLATE utf8mb4_general_ci,
  `date` date DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `id` int NOT NULL,
  `wallet_address` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` enum('human','ai') COLLATE utf8mb4_general_ci DEFAULT 'human',
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `username` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rating` int DEFAULT '1000',
  `addon` text COLLATE utf8mb4_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `games`
--
ALTER TABLE `games`
  ADD PRIMARY KEY (`game_id`);

--
-- Indexes for table `game_data`
--
ALTER TABLE `game_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `game_id` (`game_id`);

--
-- Indexes for table `margin`
--
ALTER TABLE `margin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `wallet_address` (`wallet_address`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `games`
--
ALTER TABLE `games`
  MODIFY `game_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `game_data`
--
ALTER TABLE `game_data`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `margin`
--
ALTER TABLE `margin`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `game_data`
--
ALTER TABLE `game_data`
  ADD CONSTRAINT `game_data_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
