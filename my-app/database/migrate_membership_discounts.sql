-- ============================================================
-- Migration: Split membership discount into two separate columns
-- GiftShopDiscountPercent and TicketDiscountPercent
-- Run once against the live database.
-- ============================================================

-- 1. Add new columns (ignore error if they already exist)
ALTER TABLE MembershipType
  ADD COLUMN GiftShopDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN TicketDiscountPercent   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD CONSTRAINT MembershipTypeGiftShopDiscountCheck CHECK (GiftShopDiscountPercent BETWEEN 0 AND 100),
  ADD CONSTRAINT MembershipTypeTicketDiscountCheck   CHECK (TicketDiscountPercent   BETWEEN 0 AND 100);

-- 2. Set discount values per tier
UPDATE MembershipType SET GiftShopDiscountPercent =  5.00, TicketDiscountPercent =  10.00 WHERE TypeName = 'Basic';
UPDATE MembershipType SET GiftShopDiscountPercent = 10.00, TicketDiscountPercent =  50.00 WHERE TypeName = 'Premium';
UPDATE MembershipType SET GiftShopDiscountPercent = 20.00, TicketDiscountPercent = 100.00 WHERE TypeName = 'Patron';

-- 3. (Optional) Drop legacy column if it exists
-- ALTER TABLE MembershipType DROP COLUMN DiscountPercent;
-- ALTER TABLE MembershipType DROP COLUMN BenefitsDescription;
