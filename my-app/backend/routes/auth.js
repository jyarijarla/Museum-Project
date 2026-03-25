import express from "express";
import { db } from "../db.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Health check - quick DB connectivity test
router.get('/health', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT 1 as ok')
    res.json({ ok: true, rows })
  } catch (err) {
    console.error('Health check failed:', err && err.stack ? err.stack : err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// Debug: fetch a user account row by username (temporary)
router.get('/debug/user/:username', async (req, res) => {
  const { username } = req.params
  try {
    const [rows] = await db.execute('SELECT * FROM UserAccount WHERE Username = ?', [username])
    res.json({ found: rows.length, rows })
  } catch (err) {
    console.error('Debug user lookup failed:', err && err.stack ? err.stack : err)
    res.status(500).json({ error: String(err) })
  }
})

//
// 🔹 SIGNUP (Visitor by default)
//
router.post("/signup", async (req, res) => {
  const { username, firstName, lastName, phone, email, dob, address, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into UserAccount - new signups should be Visitors by default
    const [result] = await db.execute(
      "INSERT INTO UserAccount (Username, PasswordHash, Role) VALUES (?, ?, 'Visitor')",
      [username, hashedPassword]
    );

    const createdUserId = result && result.insertId ? result.insertId : null;

    // Try to insert Visitor row linking to UserAccount.UserID when possible.
    // Some DBs may have a Visitor.UserID column; if present, use it. Otherwise
    // fall back to inserting without UserID.
    let visitorId = null;
    try {
      const [vRes] = await db.execute(
        `INSERT INTO Visitor (UserID, FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [createdUserId, firstName, lastName, phone, email, dob, address]
      );
      visitorId = vRes && vRes.insertId ? vRes.insertId : null;
    } catch (vErr) {
      // If column doesn't exist, insert without UserID
      if (vErr && (vErr.code === 'ER_BAD_FIELD_ERROR' || vErr.code === 'ER_UNKNOWN_COLUMN')) {
        const [vRes2] = await db.execute(
          `INSERT INTO Visitor (FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [firstName, lastName, phone, email, dob, address]
        );
        visitorId = vRes2 && vRes2.insertId ? vRes2.insertId : null;
      } else {
        throw vErr;
      }
    }

    res.json({ success: true, userId: createdUserId, visitorId });

  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

//
// 🔹 LOGIN
//
router.post("/login", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    console.log('[auth] login request body:', req.body);
    const identifier = username || email;
    console.log('[auth] login attempt for identifier:', identifier);

    if (!identifier) {
      return res.status(400).json({ error: 'Missing username/email' });
    }

    // lookup by username and include Visitor info when available
    const [rows] = await db.execute(
      `SELECT ua.*, v.FirstName, v.LastName, v.Email as VisitorEmail
       FROM UserAccount ua
       LEFT JOIN Visitor v ON v.UserID = ua.UserID
       WHERE ua.Username = ?`,
      [identifier]
    );

    console.log('[auth] useraccount query returned rows:', rows.length, ' rows=', rows);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = rows[0];
    console.log('[auth] found user:', { UserID: user.UserID, Username: user.Username, Role: user.Role, pwHashLength: user.PasswordHash ? user.PasswordHash.length : 0 });
    console.log('[auth] password provided length:', password ? password.length : 0);
    const valid = await bcrypt.compare(password, user.PasswordHash || '');

    if (!valid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({
      userId: user.UserID,
      username: user.Username,
      role: user.Role,
      firstName: user.FirstName || null,
      lastName: user.LastName || null,
      email: user.VisitorEmail || null
    });

  } catch (err) {
    console.error('Login error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;

// DEBUG: fetch visitor by user id (tries UserID then VisitorID)
router.get('/visitor/:id', async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await db.execute(
      `SELECT * FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1`,
      [id, id]
    )
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ visitor: rows[0] })
  } catch (err) {
    console.error('Visitor lookup failed:', err)
    res.status(500).json({ error: String(err) })
  }
})