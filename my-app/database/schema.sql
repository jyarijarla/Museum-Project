-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: museum_database
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `artifact`
--

DROP TABLE IF EXISTS `artifact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artifact` (
  `ArtifactID` int NOT NULL AUTO_INCREMENT,
  `ExhibitID` int NOT NULL,
  `ArtifactName` varchar(100) NOT NULL,
  `ArtifactDescription` varchar(400) NOT NULL,
  `CategoryCode` int DEFAULT NULL,
  `EntryDate` date DEFAULT NULL,
  PRIMARY KEY (`ArtifactID`),
  KEY `ExhibitID` (`ExhibitID`),
  CONSTRAINT `artifact_ibfk_1` FOREIGN KEY (`ExhibitID`) REFERENCES `exhibit` (`ExhibitID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `DepartmentID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) NOT NULL,
  `Description` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`DepartmentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exhibit`
--

DROP TABLE IF EXISTS `exhibit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exhibit` (
  `ExhibitID` int NOT NULL AUTO_INCREMENT,
  `GalleryID` int NOT NULL,
  `ExhibitName` varchar(50) NOT NULL,
  `ExhibitDescription` varchar(500) DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `TicketCost` decimal(8,2) DEFAULT NULL,
  `TicketCostMembers` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`ExhibitID`),
  KEY `GalleryID` (`GalleryID`),
  CONSTRAINT `exhibit_ibfk_1` FOREIGN KEY (`GalleryID`) REFERENCES `gallery` (`GalleryID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gallery`
--

DROP TABLE IF EXISTS `gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gallery` (
  `GalleryID` int NOT NULL AUTO_INCREMENT,
  `RoomNumber` int NOT NULL,
  `Name` varchar(50) NOT NULL,
  `Description` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`GalleryID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `giftshop`
--

DROP TABLE IF EXISTS `giftshop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giftshop` (
  `ProductID` int NOT NULL AUTO_INCREMENT,
  `DepartmentID` int NOT NULL,
  `ProductDescription` varchar(80) DEFAULT NULL,
  `RetailPrice` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`ProductID`),
  KEY `DepartmentID` (`DepartmentID`),
  CONSTRAINT `giftshop_ibfk_1` FOREIGN KEY (`DepartmentID`) REFERENCES `department` (`DepartmentID`),
  CONSTRAINT `giftshop_chk_1` CHECK ((`RetailPrice` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `giftshoptransaction`
--

DROP TABLE IF EXISTS `giftshoptransaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giftshoptransaction` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `DepartmentID` int NOT NULL,
  `TransactionDate` date NOT NULL,
  `TransactionType` varchar(40) DEFAULT NULL,
  `Revenue` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`TransactionID`),
  KEY `DepartmentID` (`DepartmentID`),
  CONSTRAINT `giftshoptransaction_ibfk_1` FOREIGN KEY (`DepartmentID`) REFERENCES `department` (`DepartmentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `membership`
--

DROP TABLE IF EXISTS `membership`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membership` (
  `MembershipID` int NOT NULL AUTO_INCREMENT,
  `VisitorID` int DEFAULT NULL,
  `MembershipLevel` varchar(40) DEFAULT NULL,
  `IsExpired` tinyint(1) DEFAULT '0',
  `StartDate` date NOT NULL,
  `ExpirationDate` date NOT NULL,
  PRIMARY KEY (`MembershipID`),
  UNIQUE KEY `VisitorID` (`VisitorID`),
  CONSTRAINT `membership_ibfk_1` FOREIGN KEY (`VisitorID`) REFERENCES `visitor` (`VisitorID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `EmployeeID` int NOT NULL,
  `UserID` int DEFAULT NULL,
  `DepartmentID` int NOT NULL,
  `FirstName` varchar(40) NOT NULL,
  `LastName` varchar(40) NOT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `PhoneNumber` int DEFAULT NULL,
  `HireDate` date NOT NULL,
  PRIMARY KEY (`EmployeeID`),
  UNIQUE KEY `UserID` (`UserID`),
  UNIQUE KEY `Email` (`Email`),
  UNIQUE KEY `PhoneNumber` (`PhoneNumber`),
  KEY `DepartmentID` (`DepartmentID`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `useraccount` (`UserID`),
  CONSTRAINT `staff_ibfk_2` FOREIGN KEY (`DepartmentID`) REFERENCES `department` (`DepartmentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket` (
  `TicketID` int NOT NULL AUTO_INCREMENT,
  `VisitorID` int NOT NULL,
  `VisitDate` date NOT NULL,
  `ButterflyCenterAdmission` tinyint(1) DEFAULT '0',
  `PlanetariumAdmission` tinyint(1) DEFAULT '0',
  `TheatreAdmission` tinyint(1) DEFAULT '0',
  `EventAdmission` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`TicketID`),
  KEY `VisitorID` (`VisitorID`),
  CONSTRAINT `ticket_ibfk_1` FOREIGN KEY (`VisitorID`) REFERENCES `visitor` (`VisitorID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transactionproduct`
--

DROP TABLE IF EXISTS `transactionproduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactionproduct` (
  `TransactionID` int NOT NULL,
  `ProductID` int NOT NULL,
  `Quantity` int DEFAULT NULL,
  PRIMARY KEY (`TransactionID`,`ProductID`),
  KEY `ProductID` (`ProductID`),
  CONSTRAINT `transactionproduct_ibfk_1` FOREIGN KEY (`TransactionID`) REFERENCES `transactionrecord` (`TransactionID`) ON DELETE CASCADE,
  CONSTRAINT `transactionproduct_ibfk_2` FOREIGN KEY (`ProductID`) REFERENCES `giftshop` (`ProductID`),
  CONSTRAINT `transactionproduct_chk_1` CHECK ((`Quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transactionrecord`
--

DROP TABLE IF EXISTS `transactionrecord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactionrecord` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `DepartmentID` int NOT NULL,
  `TransactionDate` date NOT NULL,
  `TransactionType` varchar(40) DEFAULT NULL,
  `Revenue` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`TransactionID`),
  KEY `DepartmentID` (`DepartmentID`),
  CONSTRAINT `transactionrecord_ibfk_1` FOREIGN KEY (`DepartmentID`) REFERENCES `department` (`DepartmentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `useraccount`
--

DROP TABLE IF EXISTS `useraccount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `useraccount` (
  `UserID` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Role` enum('Admin','GIFT_SHOP_MANAGER','EMPLOYEE','VISITOR') NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitor`
--

DROP TABLE IF EXISTS `visitor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitor` (
  `VisitorID` int NOT NULL AUTO_INCREMENT,
  `UserID` int DEFAULT NULL,
  `FirstName` varchar(40) NOT NULL,
  `LastName` varchar(40) NOT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `DOB` date DEFAULT NULL,
  PRIMARY KEY (`VisitorID`),
  UNIQUE KEY `UserID` (`UserID`),
  UNIQUE KEY `Email` (`Email`),
  CONSTRAINT `visitor_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `useraccount` (`UserID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-05 22:26:24
