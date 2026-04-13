-- Migration: add Status column to TicketPurchase
-- Run once against the live database.
ALTER TABLE TicketPurchase
  ADD COLUMN Status VARCHAR(20) NOT NULL DEFAULT 'Active'
    CONSTRAINT TicketPurchaseStatusCheck CHECK (Status IN ('Active','Cancelled'));
