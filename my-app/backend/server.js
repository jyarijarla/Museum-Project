import { createApp } from './lib/miniRouter.js'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import { db } from './db.js'

dotenv.config()

const app = createApp()

// ── Run any pending schema migrations on startup ──────────────────────────────
async function runMigrations() {
  // 1. TicketPurchase.Status column
  try {
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'TicketPurchase'
         AND COLUMN_NAME = 'Status'`
    );
    if (cols.length === 0) {
      await db.execute(
        `ALTER TABLE TicketPurchase
           ADD COLUMN Status VARCHAR(20) NOT NULL DEFAULT 'Active'`
      );
      console.log('[migration] added Status column to TicketPurchase');
    }
  } catch (err) {
    console.warn('[migration] TicketPurchase.Status warning:', err.message);
  }

  // 2. Membership.Status + CancelledDate columns
  try {
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Membership'
         AND COLUMN_NAME = 'Status'`
    );
    if (cols.length === 0) {
      await db.execute(`ALTER TABLE Membership ADD COLUMN Status VARCHAR(20) NOT NULL DEFAULT 'Active'`);
      console.log('[migration] added Status column to Membership');
    }
    const [cols2] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Membership'
         AND COLUMN_NAME = 'CancelledDate'`
    );
    if (cols2.length === 0) {
      await db.execute(`ALTER TABLE Membership ADD COLUMN CancelledDate DATE DEFAULT NULL`);
      console.log('[migration] added CancelledDate column to Membership');
    }
  } catch (err) {
    console.warn('[migration] Membership columns warning:', err.message);
  }

  // 3. Notification table
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Notification (
        NotificationID INT NOT NULL AUTO_INCREMENT,
        UserID         INT NOT NULL,
        Title          VARCHAR(120) NOT NULL,
        Message        TEXT NOT NULL,
        IsRead         TINYINT(1) NOT NULL DEFAULT 0,
        CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (NotificationID),
        KEY idx_notification_user (UserID),
        CONSTRAINT NotificationUserFK
          FOREIGN KEY (UserID) REFERENCES UserAccount(UserID)
          ON DELETE CASCADE
      )
    `);
    console.log('[migration] Notification table ready');
  } catch (err) {
    console.warn('[migration] Notification table warning:', err.message);
  }

  // 4. Membership expiry trigger (fires on UPDATE to Membership)
  try {
    await db.query(`DROP TRIGGER IF EXISTS MembershipExpiringSoon`);
    await db.query(`
      CREATE TRIGGER MembershipExpiringSoon
      AFTER UPDATE ON Membership
      FOR EACH ROW
      BEGIN
        IF NEW.IsExpired = b'0'
          AND NEW.Status = 'Active'
          AND NEW.ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          AND (
            SELECT COUNT(*) FROM Notification n
            JOIN Visitor v2 ON n.UserID = v2.UserID
            WHERE v2.VisitorID = NEW.VisitorID
              AND n.Title = 'Membership Expiring Soon'
              AND n.CreatedAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          ) = 0
        THEN
          INSERT INTO Notification (UserID, Title, Message)
          SELECT
            v.UserID,
            'Membership Expiring Soon',
            CONCAT(
              'Hi ', v.FirstName, '! Your membership expires in ',
              DATEDIFF(NEW.ExpirationDate, CURDATE()), ' days (',
              DATE_FORMAT(NEW.ExpirationDate, '%M %d, %Y'),
              '). Renew now and save 20% with promo code RENEW20!'
            )
          FROM Visitor v
          WHERE v.VisitorID = NEW.VisitorID;
        END IF;
      END
    `);
    console.log('[migration] MembershipExpiringSoon trigger registered');
  } catch (err) {
    console.warn('[migration] trigger warning:', err.message);
  }

  // 5. Exhibit cancellation/reschedule trigger for affected ticket holders
  try {
    await db.query(`DROP TRIGGER IF EXISTS ExhibitChangeNotification`);
    await db.query(`
      CREATE TRIGGER ExhibitChangeNotification
      AFTER UPDATE ON Exhibit
      FOR EACH ROW
      BEGIN
        IF NEW.ExhibitOffDate IS NOT NULL
          AND (
            OLD.ExhibitOffDate IS NULL
            OR NEW.ExhibitOffDate <> OLD.ExhibitOffDate
            OR NEW.Status <> OLD.Status
          )
        THEN
          INSERT INTO Notification (UserID, Title, Message)
          SELECT DISTINCT
            vis.UserID,
            'Ticket Reschedule Required',
            CONCAT(
              'Hi ', vis.FirstName,
              '! The ', NEW.ExhibitName,
              ' exhibit is unavailable on ',
              DATE_FORMAT(NEW.ExhibitOffDate, '%M %d, %Y'),
              '. You have a ticket for this date. Please log in and reschedule your visit.'
            )
          FROM TicketPurchase tp
          JOIN TicketPurchaseItem tpi
            ON tpi.TicketPurchaseID = tp.TicketPurchaseID
          JOIN Ticket t
            ON t.TicketPurchaseID = tp.TicketPurchaseID
          JOIN Visitor vis
            ON vis.VisitorID = tp.VisitorID
          WHERE tpi.ExhibitID = NEW.ExhibitID
            AND tp.VisitDate = NEW.ExhibitOffDate
            AND t.VisitDate = NEW.ExhibitOffDate
            AND LOWER(COALESCE(tp.Status, 'active')) NOT IN ('cancelled', 'canceled')
            AND LOWER(COALESCE(t.Status, 'active')) NOT IN ('cancelled', 'canceled')
            AND vis.UserID IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM Notification n
              WHERE n.UserID = vis.UserID
                AND n.Title = 'Ticket Reschedule Required'
                AND n.Message LIKE CONCAT('%', NEW.ExhibitName, '%')
                AND n.Message LIKE CONCAT('%', DATE_FORMAT(NEW.ExhibitOffDate, '%M %d, %Y'), '%')
                AND n.CreatedAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)
            );

          UPDATE TicketPurchase tp
          SET tp.Status = 'Cancelled'
          WHERE LOWER(COALESCE(tp.Status, 'active')) NOT IN ('cancelled', 'canceled')
            AND EXISTS (
              SELECT 1
              FROM TicketPurchaseItem tpi
              WHERE tpi.TicketPurchaseID = tp.TicketPurchaseID
                AND tpi.ExhibitID = NEW.ExhibitID
                AND tp.VisitDate = NEW.ExhibitOffDate
            );

          UPDATE Ticket t
          JOIN TicketPurchase tp ON tp.TicketPurchaseID = t.TicketPurchaseID
          SET t.Status = 'Cancelled'
          WHERE LOWER(COALESCE(t.Status, 'active')) NOT IN ('cancelled', 'canceled')
            AND t.VisitDate = NEW.ExhibitOffDate
            AND EXISTS (
              SELECT 1
              FROM TicketPurchaseItem tpi
              WHERE tpi.TicketPurchaseID = tp.TicketPurchaseID
                AND tpi.ExhibitID = NEW.ExhibitID
                AND tp.VisitDate = NEW.ExhibitOffDate
            );
        END IF;
      END
    `);
    console.log('[migration] ExhibitChangeNotification trigger registered');
  } catch (err) {
    console.warn('[migration] ExhibitChangeNotification warning:', err.message);
  }

  // 6. Keep Ticket rows synced when TicketPurchase status changes.
  try {
    await db.query(`DROP TRIGGER IF EXISTS TicketPurchaseStatusSync`);
    await db.query(`
      CREATE TRIGGER TicketPurchaseStatusSync
      AFTER UPDATE ON TicketPurchase
      FOR EACH ROW
      BEGIN
        IF LOWER(COALESCE(NEW.Status, '')) IN ('cancelled', 'canceled')
           AND LOWER(COALESCE(OLD.Status, '')) NOT IN ('cancelled', 'canceled')
        THEN
          UPDATE Ticket
          SET Status = 'Cancelled'
          WHERE TicketPurchaseID = NEW.TicketPurchaseID;
        ELSEIF LOWER(COALESCE(NEW.Status, '')) = 'active'
           AND LOWER(COALESCE(OLD.Status, '')) IN ('cancelled', 'canceled')
        THEN
          UPDATE Ticket
          SET Status = 'Active'
          WHERE TicketPurchaseID = NEW.TicketPurchaseID;
        END IF;
      END
    `);
    console.log('[migration] TicketPurchaseStatusSync trigger registered');
  } catch (err) {
    console.warn('[migration] TicketPurchaseStatusSync warning:', err.message);
  }

  // 7. Ensure legacy reverse-sync trigger is removed (it conflicts with MySQL trigger rules).
  try {
    await db.query(`DROP TRIGGER IF EXISTS TicketStatusBackSync`);
  } catch (err) {
    console.warn('[migration] TicketStatusBackSync cleanup warning:', err.message);
  }

  // 8. Backfill notifications for memberships already within 30 days at startup
  //    (the trigger only fires on future UPDATEs; this catches pre-existing rows)
  try {
    const [backfill] = await db.execute(`
      INSERT INTO Notification (UserID, Title, Message)
      SELECT
        v.UserID,
        'Membership Expiring Soon',
        CONCAT(
          'Hi ', v.FirstName, '! Your membership expires in ',
          DATEDIFF(m.ExpirationDate, CURDATE()), ' days (',
          DATE_FORMAT(m.ExpirationDate, '%M %d, %Y'),
          '). Renew now and save 20% with promo code RENEW20!'
        )
      FROM Membership m
      JOIN Visitor v ON m.VisitorID = v.VisitorID
      WHERE m.IsExpired = b'0'
        AND m.Status = 'Active'
        AND m.ExpirationDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND v.UserID NOT IN (
          SELECT n.UserID FROM Notification n
          WHERE n.Title = 'Membership Expiring Soon'
            AND n.IsRead = 0
            AND n.CreatedAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        )
    `);
    if (backfill.affectedRows > 0) {
      console.log(`[migration] backfilled ${backfill.affectedRows} expiry notification(s)`);
    }
  } catch (err) {
    console.warn('[migration] backfill notification warning:', err.message);
  }

  // 8b. Backfill exhibit off-date conflicts so existing active tickets are
  //     canceled and affected visitors receive a notification without needing
  //     another exhibit update.
  try {
    const [ticketConflictNotifications] = await db.execute(`
      INSERT INTO Notification (UserID, Title, Message)
      SELECT DISTINCT
        vis.UserID,
        'Ticket Reschedule Required',
        CONCAT(
          'Hi ', vis.FirstName,
          '! The ', e.ExhibitName,
          ' exhibit is unavailable on ',
          DATE_FORMAT(e.ExhibitOffDate, '%M %d, %Y'),
          '. You have a ticket for this date. Please log in and reschedule your visit.'
        )
      FROM TicketPurchase tp
      JOIN TicketPurchaseItem tpi ON tpi.TicketPurchaseID = tp.TicketPurchaseID
      JOIN Exhibit e ON e.ExhibitID = tpi.ExhibitID
      JOIN Visitor vis ON vis.VisitorID = tp.VisitorID
      WHERE e.ExhibitOffDate IS NOT NULL
        AND tp.VisitDate = e.ExhibitOffDate
        AND vis.UserID IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM Notification n
          WHERE n.UserID = vis.UserID
            AND n.Title = 'Ticket Reschedule Required'
            AND n.Message LIKE CONCAT('%', e.ExhibitName, '%')
            AND n.Message LIKE CONCAT('%', DATE_FORMAT(e.ExhibitOffDate, '%M %d, %Y'), '%')
            AND CAST(n.IsRead AS UNSIGNED) = 0
        )
    `);
    if (ticketConflictNotifications.affectedRows > 0) {
      console.log(`[migration] backfilled ${ticketConflictNotifications.affectedRows} exhibit conflict notification(s)`);
    }

    const [cancelPurchaseConflicts] = await db.execute(`
      UPDATE TicketPurchase tp
      SET tp.Status = 'Cancelled'
      WHERE LOWER(COALESCE(tp.Status, 'active')) NOT IN ('cancelled', 'canceled')
        AND EXISTS (
          SELECT 1
          FROM TicketPurchaseItem tpi
          JOIN Exhibit e ON e.ExhibitID = tpi.ExhibitID
          WHERE tpi.TicketPurchaseID = tp.TicketPurchaseID
            AND e.ExhibitOffDate IS NOT NULL
            AND e.ExhibitOffDate = tp.VisitDate
        )
    `);
    if (cancelPurchaseConflicts.affectedRows > 0) {
      console.log(`[migration] canceled ${cancelPurchaseConflicts.affectedRows} conflicting ticket purchase(s)`);
    }

    const [cancelTicketConflicts] = await db.execute(`
      UPDATE Ticket t
      JOIN TicketPurchase tp ON tp.TicketPurchaseID = t.TicketPurchaseID
      SET t.Status = 'Cancelled'
      WHERE LOWER(COALESCE(t.Status, 'active')) NOT IN ('cancelled', 'canceled')
        AND EXISTS (
          SELECT 1
          FROM TicketPurchaseItem tpi
          JOIN Exhibit e ON e.ExhibitID = tpi.ExhibitID
          WHERE tpi.TicketPurchaseID = tp.TicketPurchaseID
            AND e.ExhibitOffDate IS NOT NULL
            AND e.ExhibitOffDate = tp.VisitDate
        )
    `);
    if (cancelTicketConflicts.affectedRows > 0) {
      console.log(`[migration] canceled ${cancelTicketConflicts.affectedRows} conflicting ticket row(s)`);
    }
  } catch (err) {
    console.warn('[migration] exhibit conflict backfill warning:', err.message);
  }

  // 9. Remove legacy Ticket triggers that depend on VisitTime when that
  //    column no longer exists in the current Ticket schema.
  try {
    const [visitTimeCol] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Ticket'
         AND COLUMN_NAME = 'VisitTime'`
    );

    if (visitTimeCol.length === 0) {
      await db.query('DROP TRIGGER IF EXISTS normalize_visit_time');
      await db.query('DROP TRIGGER IF EXISTS normalize_visit_time_update');
      await db.query('DROP TRIGGER IF EXISTS limit_tickets_per_slot');
      console.log('[migration] dropped legacy Ticket VisitTime triggers');
    }
  } catch (err) {
    console.warn('[migration] Ticket trigger cleanup warning:', err.message);
  }

  // 10. Backfill missing Ticket rows for older TicketPurchase records
  //    where purchase/items exist but no Ticket rows were issued.
  try {
    const [ticketCols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Ticket'
         AND COLUMN_NAME IN ('TicketPurchaseID', 'Status')`
    );
    const colSet = new Set(ticketCols.map(c => c.COLUMN_NAME));
    const hasTicketPurchaseId = colSet.has('TicketPurchaseID');
    const hasTicketStatus = colSet.has('Status');

    if (!hasTicketPurchaseId) {
      console.warn('[migration] TicketPurchaseID column missing on Ticket; skipping ticket backfill');
    } else {
      const [missingPurchases] = await db.execute(`
        SELECT tp.TicketPurchaseID, tp.VisitorID, tp.VisitDate,
               COALESCE(SUM(tpi.Quantity), 0) AS TicketQty
        FROM TicketPurchase tp
        JOIN TicketPurchaseItem tpi ON tpi.TicketPurchaseID = tp.TicketPurchaseID
        LEFT JOIN Ticket t ON t.TicketPurchaseID = tp.TicketPurchaseID
        GROUP BY tp.TicketPurchaseID, tp.VisitorID, tp.VisitDate
        HAVING COUNT(t.TicketID) = 0 AND COALESCE(SUM(tpi.Quantity), 0) > 0
      `);

      let insertedTickets = 0;
      for (const purchase of missingPurchases) {
        const qty = Number(purchase.TicketQty || 0);
        if (qty <= 0) continue;

        const rows = [];
        for (let i = 0; i < qty; i++) {
          if (hasTicketStatus) {
            rows.push([purchase.VisitorID, purchase.VisitDate, 'Active', purchase.TicketPurchaseID]);
          } else {
            rows.push([purchase.VisitorID, purchase.VisitDate, purchase.TicketPurchaseID]);
          }
        }

        const placeholders = rows
          .map(() => (hasTicketStatus ? '(?, ?, ?, ?)' : '(?, ?, ?)'))
          .join(', ');
        const params = rows.flat();

        if (hasTicketStatus) {
          await db.execute(
            `INSERT INTO Ticket (VisitorID, VisitDate, Status, TicketPurchaseID) VALUES ${placeholders}`,
            params
          );
        } else {
          await db.execute(
            `INSERT INTO Ticket (VisitorID, VisitDate, TicketPurchaseID) VALUES ${placeholders}`,
            params
          );
        }

        insertedTickets += qty;
      }

      if (insertedTickets > 0) {
        console.log(`[migration] backfilled ${insertedTickets} missing ticket row(s)`);
      }
    }
  } catch (err) {
    console.warn('[migration] ticket backfill warning:', err.message);
  }

  // 11. Keep Ticket.Status aligned with TicketPurchase.Status for legacy rows.
  try {
    const [statusCols] = await db.execute(
      `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND (TABLE_NAME = 'Ticket' OR TABLE_NAME = 'TicketPurchase')
         AND COLUMN_NAME = 'Status'`
    );

    const hasTicketStatus = statusCols.some(c => c.TABLE_NAME === 'Ticket');
    const hasPurchaseStatus = statusCols.some(c => c.TABLE_NAME === 'TicketPurchase');

    if (hasTicketStatus && hasPurchaseStatus) {
      const [syncResult] = await db.execute(`
        UPDATE Ticket t
        JOIN TicketPurchase tp ON tp.TicketPurchaseID = t.TicketPurchaseID
        SET t.Status = 'Cancelled'
        WHERE LOWER(COALESCE(tp.Status, 'active')) IN ('cancelled', 'canceled')
          AND LOWER(COALESCE(t.Status, 'active')) NOT IN ('cancelled', 'canceled')
      `);
      if (syncResult.affectedRows > 0) {
        console.log(`[migration] synced ${syncResult.affectedRows} ticket status row(s) to Cancelled`);
      }
    }
  } catch (err) {
    console.warn('[migration] ticket status sync warning:', err.message);
  }

  console.log('[migration] schema check complete');
}

// middleware
// CLIENT_ORIGIN can be a comma-separated list of allowed origins.
// If not set, all origins are allowed (local dev).
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim())
  : null

// Configure allowed origins on the app (null = allow all)
app.setAllowedOrigins(allowedOrigins)

// routes
app.use('/api', authRoutes)

const PORT = process.env.PORT || 4000;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});