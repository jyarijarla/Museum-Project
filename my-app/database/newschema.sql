CREATE TABLE UserAccount (
  UserID INT NOT NULL AUTO_INCREMENT,
  Username VARCHAR(50) NOT NULL,
  PasswordHash VARCHAR(255) NOT NULL,
  Role ENUM('Admin', 'Visitor') NOT NULL,
  PRIMARY KEY (UserID),
  UNIQUE KEY (Username)
);

CREATE TABLE Visitor (
  VisitorID INT NOT NULL AUTO_INCREMENT,
  UserID INT DEFAULT NULL,
  FirstName VARCHAR(40) NOT NULL,
  LastName VARCHAR(40) NOT NULL,
  DateOfBirth DATE DEFAULT NULL,
  PhoneNumber VARCHAR(11) NOT NULL,
  Email VARCHAR(255) DEFAULT NULL,
  Address VARCHAR(400) DEFAULT NULL,
  PRIMARY KEY (VisitorID),
  UNIQUE KEY (UserID),
  CONSTRAINT VisitorUserFK
    FOREIGN KEY (UserID) REFERENCES UserAccount(UserID)
    ON DELETE SET NULL
);

-- =========================
-- MEMBERSHIP SYSTEM
-- =========================

CREATE TABLE MembershipType (
  TypeID INT NOT NULL AUTO_INCREMENT,
  TypeName VARCHAR(50) NOT NULL,
  GiftShopDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  TicketDiscountPercent   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (TypeID),
  UNIQUE KEY (TypeName),
  CONSTRAINT MembershipTypeGiftShopDiscountCheck CHECK (GiftShopDiscountPercent BETWEEN 0 AND 100),
  CONSTRAINT MembershipTypeTicketDiscountCheck   CHECK (TicketDiscountPercent   BETWEEN 0 AND 100)
);

-- Basic: 5% gift shop, 10% ticket discount
-- Premium: 10% gift shop, 50% ticket discount
-- Patron: 20% gift shop, 100% ticket discount (free admission)
INSERT INTO MembershipType (TypeID, TypeName, GiftShopDiscountPercent, TicketDiscountPercent) VALUES
  (1, 'Basic',   5.00,  10.00),
  (2, 'Premium', 10.00, 50.00),
  (3, 'Patron',  20.00, 100.00);

CREATE TABLE Membership (
  MembershipID INT NOT NULL AUTO_INCREMENT,
  VisitorID INT NOT NULL,
  MembershipTypeID INT NOT NULL,
  IsExpired BIT(1) DEFAULT b'0',
  StartDate DATE NOT NULL,
  ExpirationDate DATE NOT NULL,
  PRIMARY KEY (MembershipID),
  UNIQUE KEY (VisitorID),
  CONSTRAINT MembershipVisitorFK
    FOREIGN KEY (VisitorID) REFERENCES Visitor(VisitorID)
    ON DELETE RESTRICT,
  CONSTRAINT MembershipTypeFK
    FOREIGN KEY (MembershipTypeID) REFERENCES MembershipType(TypeID)
    ON DELETE RESTRICT,
  CONSTRAINT MembershipDateCheck
    CHECK (ExpirationDate > StartDate)
);

-- =========================
-- EXHIBITS / ARTIFACTS
-- =========================

CREATE TABLE Exhibit (
  ExhibitID INT NOT NULL AUTO_INCREMENT,
  ExhibitName VARCHAR(100) NOT NULL,
  Description VARCHAR(500) DEFAULT NULL,
  StartDate DATE DEFAULT NULL,
  EndDate DATE DEFAULT NULL,
  MaxCapacity INT NOT NULL DEFAULT 100,
  PRIMARY KEY (ExhibitID),
  UNIQUE KEY (ExhibitName),
  CHECK (MaxCapacity > 0)
);

UPDATE Exhibit SET MaxCapacity = 100 WHERE ExhibitID = 1; -- Space
UPDATE Exhibit SET MaxCapacity = 80 WHERE ExhibitID = 2;  -- Natural History
UPDATE Exhibit SET MaxCapacity = 60 WHERE ExhibitID = 3;  -- Ancient Civilizations

INSERT INTO Exhibit (ExhibitID, ExhibitName, Description, StartDate, EndDate) VALUES
  (1, 'Space', 'Space science and astronomy', NULL, NULL),
  (2, 'Natural History', 'Fossils, wildlife, and Earth history', NULL, NULL),
  (3, 'Ancient Civilizations', 'Ancient cultures and societies', NULL, NULL);

CREATE TABLE Artifact (
  ArtifactID INT NOT NULL AUTO_INCREMENT,
  ExhibitID INT DEFAULT NULL,
  Name VARCHAR(120) DEFAULT NULL,
  Description VARCHAR(400) DEFAULT NULL,
  EntryDate DATE DEFAULT NULL,
  PRIMARY KEY (ArtifactID),
  KEY (ExhibitID),
  CONSTRAINT ArtifactInExhibitFK
    FOREIGN KEY (ExhibitID) REFERENCES Exhibit(ExhibitID)
    ON DELETE RESTRICT
);

-- =========================
-- EXHIBIT PRICING
-- =========================

CREATE TABLE GeneralAdmissionPrices (
  GeneralAdmissionPricesID INT NOT NULL AUTO_INCREMENT,
  ExhibitID INT NOT NULL,
  GeneralAdmissionPrice DECIMAL(8,2) NOT NULL,
  GeneralAdmissionMemberPrice DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (GeneralAdmissionPricesID),
  UNIQUE KEY (ExhibitID),
  CONSTRAINT GeneralAdmissionPricesExhibitFK
    FOREIGN KEY (ExhibitID) REFERENCES Exhibit(ExhibitID)
    ON DELETE RESTRICT,
  CONSTRAINT GeneralAdmissionPriceCheck
    CHECK (GeneralAdmissionPrice >= 0),
  CONSTRAINT GeneralAdmissionMemberPriceCheck
    CHECK (GeneralAdmissionMemberPrice >= 0)
);

INSERT INTO GeneralAdmissionPrices (
  GeneralAdmissionPricesID,
  ExhibitID,
  GeneralAdmissionPrice,
  GeneralAdmissionMemberPrice
) VALUES
  (1, 1, 15.00, 10.00),
  (2, 2, 12.00, 8.00),
  (3, 3, 14.00, 9.00);

CREATE TABLE DailyGeneralAdmissionPrices (
  Date DATE NOT NULL,
  ExhibitID INT NOT NULL,
  GeneralAdmissionPrice DECIMAL(8,2) NOT NULL,
  GeneralAdmissionMemberPrice DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (Date, ExhibitID),
  CONSTRAINT DailyGeneralAdmissionPricesExhibitFK
    FOREIGN KEY (ExhibitID) REFERENCES Exhibit(ExhibitID)
    ON DELETE RESTRICT,
  CONSTRAINT DailyGeneralAdmissionPriceCheck
    CHECK (GeneralAdmissionPrice >= 0),
  CONSTRAINT DailyGeneralAdmissionMemberPriceCheck
    CHECK (GeneralAdmissionMemberPrice >= 0)
);

-- =========================
-- TICKET PURCHASE SYSTEM
-- =========================

CREATE TABLE TicketPurchase (
  TicketPurchaseID INT NOT NULL AUTO_INCREMENT,
  VisitorID INT NOT NULL,
  PurchaseDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  VisitDate DATE NOT NULL,
  TotalAmount DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (TicketPurchaseID),
  KEY (VisitorID),
  CONSTRAINT TicketPurchaseVisitorFK
    FOREIGN KEY (VisitorID) REFERENCES Visitor(VisitorID)
    ON DELETE RESTRICT,
  CONSTRAINT TicketPurchaseTotalCheck
    CHECK (TotalAmount >= 0)
);

CREATE TABLE TicketPurchaseItem (
  TicketPurchaseItemID INT NOT NULL AUTO_INCREMENT,
  TicketPurchaseID INT NOT NULL,
  ExhibitID INT NOT NULL,
  Quantity INT NOT NULL,
  UnitPrice DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (TicketPurchaseItemID),
  KEY (TicketPurchaseID),
  KEY (ExhibitID),
  CONSTRAINT TicketPurchaseItemPurchaseFK
    FOREIGN KEY (TicketPurchaseID) REFERENCES TicketPurchase(TicketPurchaseID)
    ON DELETE CASCADE,
  CONSTRAINT TicketPurchaseItemExhibitFK
    FOREIGN KEY (ExhibitID) REFERENCES Exhibit(ExhibitID)
    ON DELETE RESTRICT,
  CONSTRAINT TicketPurchaseItemQuantityCheck
    CHECK (Quantity > 0),
  CONSTRAINT TicketPurchaseItemUnitPriceCheck
    CHECK (UnitPrice >= 0)
);

-- =========================
-- GIFT SHOP
-- =========================

CREATE TABLE Product (
  ProductID INT NOT NULL AUTO_INCREMENT,
  Name VARCHAR(80) NOT NULL,
  Description VARCHAR(300) DEFAULT NULL,
  RetailPrice DECIMAL(8,2) NOT NULL,
  StockQuantity INT NOT NULL DEFAULT 0,
  PRIMARY KEY (ProductID),
  CONSTRAINT ProductCheckRetailPrice
    CHECK (RetailPrice > 0),
  CONSTRAINT ProductCheckStockQuantity
    CHECK (StockQuantity >= 0)
);

CREATE TABLE TransactionRecord (
  TransactionID INT NOT NULL AUTO_INCREMENT,
  VisitorID INT DEFAULT NULL,
  Date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TotalAmount DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY (TransactionID),
  KEY (VisitorID),
  CONSTRAINT TransactionVisitorFK
    FOREIGN KEY (VisitorID) REFERENCES Visitor(VisitorID)
    ON DELETE SET NULL,
  CONSTRAINT TransactionTotalAmountCheck
    CHECK (TotalAmount IS NULL OR TotalAmount >= 0)
);

CREATE TABLE TransactionProduct (
  TransactionID INT NOT NULL,
  ProductID INT NOT NULL,
  Quantity INT NOT NULL,
  PRIMARY KEY (TransactionID, ProductID),
  CONSTRAINT TransactionProductRecordFK
    FOREIGN KEY (TransactionID) REFERENCES TransactionRecord(TransactionID)
    ON DELETE RESTRICT,
  CONSTRAINT TransactionProductProductFK
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID)
    ON DELETE RESTRICT,
  CONSTRAINT TransactionProductCheckQuantity
    CHECK (Quantity > 0)
);