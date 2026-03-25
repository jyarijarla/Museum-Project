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
-- Table structure for table `Artifact`
--

DROP TABLE IF EXISTS `Artifact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Artifact` (
  `ArtifactID` int NOT NULL AUTO_INCREMENT,
  `ExhibitID` int DEFAULT NULL,
  `Name` varchar(120) DEFAULT NULL,
  `Description` varchar(400) DEFAULT NULL,
  `EntryDate` date DEFAULT NULL,
  PRIMARY KEY (`ArtifactID`),
  KEY `ExhibitID` (`ExhibitID`),
  CONSTRAINT `ArtifactInExhibitFK` FOREIGN KEY (`ExhibitID`) REFERENCES `Exhibit` (`ExhibitID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Curator`
--

DROP TABLE IF EXISTS `Curator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Curator` (
  `EmployeeID` int NOT NULL,
  `GalleryID` int NOT NULL,
  PRIMARY KEY (`EmployeeID`, `GalleryID`),
  KEY `GalleryID` (`GalleryID`),
  CONSTRAINT `CuratorIsEmployeeFK` FOREIGN KEY (`EmployeeID`) REFERENCES `Employee` (`EmployeeID`) ON DELETE RESTRICT,
  CONSTRAINT `CuratorCuratesGalleryFK` FOREIGN KEY (`GalleryID`) REFERENCES `Gallery` (`GalleryID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Department`
--

DROP TABLE IF EXISTS `Department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Department` (
  `DepartmentID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(40) NOT NULL,
  `Description` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`DepartmentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DepartmentManager`
--

DROP TABLE IF EXISTS `DepartmentManager`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DepartmentManager` (
  `DepartmentID` int NOT NULL,
  `DepartmentManagerID` int NOT NULL,
  PRIMARY KEY (`DepartmentID`, `DepartmentManagerID`),
  CONSTRAINT `DepartmentManagerManagesDepartmentFK` FOREIGN KEY (`DepartmentID`) REFERENCES `Department` (`DepartmentID`) ON DELETE RESTRICT,
  CONSTRAINT `DepartmentManagerIsEmployeeFK` FOREIGN KEY (`DepartmentManagerID`) REFERENCES `Staff` (`EmployeeID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Event`
--

DROP TABLE IF EXISTS `Event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Event` (
  `EventID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(120) NOT NULL,
  `Description` varchar(400) DEFAULT NULL,
  `RoomNumber` int DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `TicketPrice` decimal(8,2) DEFAULT NULL,
  `TicketPriceMembers` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`EventID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Exhibit`
--

DROP TABLE IF EXISTS `Exhibit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Exhibit` (
  `ExhibitID` int NOT NULL AUTO_INCREMENT,
  `GalleryID` int NOT NULL,
  `Name` varchar(40) NOT NULL,
  `Description` varchar(500) DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  PRIMARY KEY (`ExhibitID`),
  KEY `GalleryID` (`GalleryID`),
  CONSTRAINT `ExhibitInGalleryFK` FOREIGN KEY (`GalleryID`) REFERENCES `Gallery` (`GalleryID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Gallery`
--

DROP TABLE IF EXISTS `Gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Gallery` (
  `GalleryID` int NOT NULL AUTO_INCREMENT,
  `RoomNumber` int NOT NULL,
  `Name` varchar(40) NOT NULL,
  `Description` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`GalleryID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `GeneralAdmissionPrices`
--

DROP TABLE IF EXISTS `GeneralAdmissionPrices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GeneralAdmissionPrices` (
  `GeneralAdmissionPricesID` int NOT NULL AUTO_INCREMENT,
  `GeneralAdmissionPrice` decimal(8,2) DEFAULT NULL,
  `GeneralAdmissionMemberPrice` decimal(8,2) DEFAULT NULL,
  `ButterflyCenterAdmissionPrice` decimal(8,2) DEFAULT NULL,
  `ButterflyCenterAdmissionMemberPrice` decimal(8,2) DEFAULT NULL,
  `PlanetariumAdmissionPrice` decimal(8,2) DEFAULT NULL,
  `PlanetariumAdmissionMemberPrice` decimal(8,2) DEFAULT NULL,
  `TheatreAdmissionPrice` decimal(8,2) DEFAULT NULL,
  `TheatreAdmissionMemberPrice` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`GeneralAdmissionPricesID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `GeneralAdmissionPricesOnDate`
--

DROP TABLE IF EXISTS `DailyGeneralAdmissionPrices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DailyGeneralAdmissionPrices` (
  `Date` date NOT NULL,
  `GeneralAdmissionPricesID` int NOT NULL,
  PRIMARY KEY (`Date`, `GeneralAdmissionPricesID`),
  CONSTRAINT `GeneralAdmissionPricesOnDateFK` FOREIGN KEY (`GeneralAdmissionPricesID`) REFERENCES `GeneralAdmissionPrices` (`GeneralAdmissionPricesID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Job`
--

DROP TABLE IF EXISTS `Job`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Job` (
  `JobID` int NOT NULL AUTO_INCREMENT,
  `Name` int NOT NULL,
  `Description` varchar(300),
  PRIMARY KEY (`JobID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Membership`
--

DROP TABLE IF EXISTS `Membership`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Membership` (
  `MembershipID` int NOT NULL AUTO_INCREMENT,
  `VisitorID` int NOT NULL,
  `IsExpired` bit(1) DEFAULT 0,
  `StartDate` date NOT NULL,
  `ExpirationDate` date NOT NULL,
  PRIMARY KEY (`MembershipID`),
  UNIQUE KEY `VisitorID` (`VisitorID`),
  CONSTRAINT `MembershipVisitorFK` FOREIGN KEY (`VisitorID`) REFERENCES `Visitor` (`VisitorID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Product`
--

DROP TABLE IF EXISTS `Product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Product` (
  `ProductID` int NOT NULL AUTO_INCREMENT,
  `DepartmentID` int NOT NULL,
  `Name` varchar(40) DEFAULT NULL,
  `Description` varchar(300) DEFAULT NULL,
  `RetailPrice` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`ProductID`),
  UNIQUE KEY `DepartmentID` (`DepartmentID`),
  CONSTRAINT `ProductDepartmentFK` FOREIGN KEY (`DepartmentID`) REFERENCES `department` (`DepartmentID`),
  CONSTRAINT `ProductCheckRetailPrice` CHECK (`RetailPrice` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Staff`
--

DROP TABLE IF EXISTS `Staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Staff` (
  `EmployeeID` int NOT NULL AUTO_INCREMENT,
  `UserID` int DEFAULT NULL,
  `DepartmentID` int NOT NULL,
  `SupervisorID` int DEFAULT NULL,
  `JobID` int DEFAULT NULL,
  `Salary` decimal(10,2) DEFAULT NULL,
  `FirstName` varchar(40) NOT NULL,
  `LastName` varchar(40) NOT NULL,
  `Address` varchar(400) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `PhoneNumber` varchar(11) DEFAULT NULL,
  `HireDate` date NOT NULL,
  PRIMARY KEY (`EmployeeID`),
  UNIQUE KEY `UserID` (`UserID`),
  KEY `DepartmentID` (`DepartmentID`),
  KEY `SupervisorID` (`SupervisorID`),
  KEY `JobID` (`JobID`),
  CONSTRAINT `StaffUserID` FOREIGN KEY (`UserID`) REFERENCES `UserAccount` (`UserID`),
  CONSTRAINT `StaffDepartment` FOREIGN KEY (`DepartmentID`) REFERENCES `Department` (`DepartmentID`),
  CONSTRAINT `StaffSupervisor` FOREIGN KEY (`SupervisorID`) REFERENCES `Staff` (`EmployeeID`),
  CONSTRAINT `StaffJob` FOREIGN KEY (`JobID`) REFERENCES `Job` (`JobID`),
  CONSTRAINT `StaffCheckSalaryAboveZero` CHECK (`Salary` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Ticket`
--

DROP TABLE IF EXISTS `Ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Ticket` (
  `TicketID` int NOT NULL AUTO_INCREMENT,
  `VisitorID` int NOT NULL,
  `VisitDate` date NOT NULL,
  `ButterflyCenterAdmission` bit(1) DEFAULT 0,
  `PlanetariumAdmission` bit(1) DEFAULT 0,
  `TheatreAdmission` bit(1) DEFAULT 0,
  `EventAdmission` int DEFAULT NULL,
  PRIMARY KEY (`TicketID`),
  KEY `VisitorID` (`VisitorID`),
  CONSTRAINT `TicketVisitorFK` FOREIGN KEY (`VisitorID`) REFERENCES `Visitor` (`VisitorID`) ON DELETE RESTRICT,
  CONSTRAINT `TicketEventAdmissionFK` FOREIGN KEY(`EventAdmission`) REFERENCES `Event` (`EventID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TransactionProduct`
--

DROP TABLE IF EXISTS `TransactionProduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TransactionProduct` (
  `TransactionID` int NOT NULL,
  `ProductID` int NOT NULL,
  `Quantity` int NOT NULL,
  PRIMARY KEY (`TransactionID`, `ProductID`),
  CONSTRAINT `TransactionProductRecordFK` FOREIGN KEY (`TransactionID`) REFERENCES `TransactionRecord` (`TransactionID`) ON DELETE RESTRICT,
  CONSTRAINT `TransactionProductProductFK` FOREIGN KEY (`ProductID`) REFERENCES `Product` (`ProductID`) ON DELETE RESTRICT,
  CONSTRAINT `TransactionProductCheckQuantity` CHECK (`Quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TransactionRecord`
--

DROP TABLE IF EXISTS `TransactionRecord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TransactionRecord` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `DepartmentID` int NOT NULL,
  `Date` date NOT NULL,
  `Revenue` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`TransactionID`),
  KEY `DepartmentID` (`DepartmentID`),
  CONSTRAINT `TransactionDepartmentFK` FOREIGN KEY (`DepartmentID`) REFERENCES `Department` (`DepartmentID`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserAccount`
--

DROP TABLE IF EXISTS `UserAccount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserAccount` (
  `UserID` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Role` enum('Admin', 'Gift_Shop_Manager', 'Employee', 'Visitor') NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Visitor`
--

DROP TABLE IF EXISTS `Visitor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Visitor` (
  `VisitorID` int NOT NULL AUTO_INCREMENT,
  `FirstName` varchar(40) NOT NULL,
  `LastName` varchar(40) NOT NULL,
  `DateOfBirth` date DEFAULT NULL,
  `PhoneNumber` varchar(11) NOT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Address` varchar(400) DEFAULT NULL,
  PRIMARY KEY (`VisitorID`)
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