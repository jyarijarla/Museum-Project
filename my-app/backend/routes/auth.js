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

    // Insert into Visitor (schema does not include a UserID column in this DB)
    await db.execute(
      `INSERT INTO Visitor (FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, phone, email, dob, address]
    );

    res.json({ success: true });

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

    // lookup by username (the DB stores credentials on UserAccount.Username)
    const [rows] = await db.execute(
      `SELECT * FROM UserAccount WHERE Username = ?`,
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
      role: user.Role
    });

  } catch (err) {
    console.error('Login error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;