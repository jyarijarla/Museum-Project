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
     // Try inserting with the appropriate membership-type column. Many schemas
     // name this `MembershipTypeID` (foreign key to MembershipType), some use
     // `PlanID` or similar. Try the most specific first, then fall back.
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

// Purchase membership: creates a Membership row for a Visitor with 1-year expiry
router.post('/membership/purchase', async (req, res) => {
  // Accept either a VisitorID or a UserID (some deployments store Visitor linked to UserAccount differently)
  const { visitorId, userId, membershipPlanId } = req.body

  let resolvedVisitorId = visitorId || null

  try {
    // If caller provided userId but not visitorId, attempt to resolve it.
    if (!resolvedVisitorId && userId) {
      // First try: maybe frontend accidentally sent a VisitorID as userId
      let [rows] = await db.execute('SELECT VisitorID FROM Visitor WHERE VisitorID = ? LIMIT 1', [userId])
      if (rows && rows.length > 0) {
        resolvedVisitorId = rows[0].VisitorID
      } else {
        // Second try: some schemas have Visitor.UserID column — try that but ignore column-errors
        try {
          const [rows2] = await db.execute('SELECT VisitorID FROM Visitor WHERE UserID = ? LIMIT 1', [userId])
          if (rows2 && rows2.length > 0) resolvedVisitorId = rows2[0].VisitorID
        } catch (colErr) {
          // ignore: Visitor.UserID may not exist in this schema
        }
      }
    }

      if (!resolvedVisitorId && userId) {
      // If caller provided a userId, attempt to auto-create a minimal Visitor row
      if (userId) {
        try {
          // Try inserting with UserID column if it exists, otherwise insert without it.
          try {
            const [ins] = await db.execute(
              `INSERT INTO Visitor (UserID, FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [userId, 'Unknown', `User${userId}`, '', null, null, null]
            )
            resolvedVisitorId = ins && ins.insertId ? ins.insertId : null
          } catch (vErr) {
            // If Visitor.UserID column doesn't exist, insert without it
            if (vErr && (vErr.code === 'ER_BAD_FIELD_ERROR' || vErr.code === 'ER_UNKNOWN_COLUMN')) {
              const [ins2] = await db.execute(
                `INSERT INTO Visitor (FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Unknown', `User${userId}`, '', null, null, null]
              )
              resolvedVisitorId = ins2 && ins2.insertId ? ins2.insertId : null
            } else {
              throw vErr
            }
          }
        } catch (createErr) {
          console.error('Auto-create Visitor failed:', createErr && createErr.stack ? createErr.stack : createErr)
          return res.status(500).json({ error: 'Failed to create visitor profile automatically' })
        }
      }

      if (!resolvedVisitorId) {
        return res.status(404).json({ error: 'Visitor not found for provided identifier. Please complete your visitor profile before purchasing.' })
      }
    }

    // Try inserting membership. Support optional membershipPlanId which may map
    // to either `MembershipTypeID` or `PlanID` depending on the schema. If the
    // provided id doesn't exist in the membership types table, return a helpful
    // 400 with available types so the frontend can map correctly.
    const tryInsertWithColumn = async (colName) => {
      const sql = `INSERT INTO Membership (VisitorID, ${colName}, IsExpired, StartDate, ExpirationDate)
                   VALUES (?, ?, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))`
      return db.execute(sql, [resolvedVisitorId, membershipPlanId])
    }

    let result = null
    try {
      if (membershipPlanId) {
        // try MembershipTypeID first
        try {
          const [r] = await tryInsertWithColumn('MembershipTypeID')
          result = r
        } catch (e1) {
          // Log error details for debugging
          console.error('tryInsertWithColumn MembershipTypeID failed:', { code: e1 && e1.code, errno: e1 && e1.errno, message: e1 && e1.message })
          // FK error: provided id doesn't exist in MembershipType
          if (e1 && (e1.code === 'ER_NO_REFERENCED_ROW_2' || e1.errno === 1452)) {
            try {
              const [types] = await db.execute('SELECT TypeID, TypeName FROM MembershipType')
              return res.status(400).json({ error: 'Invalid membership type id', availableTypes: types })
            } catch (tErr) {
              return res.status(400).json({ error: 'Invalid membership type id' })
            }
          }

          // If column doesn't exist, try PlanID next
          if (e1 && (e1.code === 'ER_BAD_FIELD_ERROR' || e1.code === 'ER_UNKNOWN_COLUMN')) {
            try {
              const [r2] = await tryInsertWithColumn('PlanID')
              result = r2
            } catch (e2) {
              console.error('tryInsertWithColumn PlanID failed:', { code: e2 && e2.code, errno: e2 && e2.errno, message: e2 && e2.message })
              if (e2 && (e2.code === 'ER_BAD_FIELD_ERROR' || e2.code === 'ER_UNKNOWN_COLUMN')) {
                // No type column present, fall back to a plain insert
                const [r3] = await db.execute(
                  `INSERT INTO Membership (VisitorID, IsExpired, StartDate, ExpirationDate)
                   VALUES (?, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))`,
                  [resolvedVisitorId]
                )
                result = r3
              } else if (e2 && (e2.code === 'ER_NO_REFERENCED_ROW_2' || e2.errno === 1452)) {
                try {
                  const [types] = await db.execute('SELECT TypeID, TypeName FROM MembershipType')
                  return res.status(400).json({ error: 'Invalid membership type id for PlanID column', availableTypes: types })
                } catch (tErr) {
                  return res.status(400).json({ error: 'Invalid membership type id for PlanID column' })
                }
              } else {
                throw e2
              }
            }
          } else {
            throw e1
          }
        }
      } else {
        // No membershipPlanId provided — basic membership row
        const [r] = await db.execute(
          `INSERT INTO Membership (VisitorID, IsExpired, StartDate, ExpirationDate)
           VALUES (?, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))`,
          [resolvedVisitorId]
        )
        result = r
      }

      const membershipId = result && result.insertId ? result.insertId : null
      return res.json({ success: true, membershipId, visitorId: resolvedVisitorId })
    } catch (insertErr) {
      // If the visitor already has a membership (unique constraint), fetch and return it
      if (insertErr && insertErr.code === 'ER_DUP_ENTRY') {
        const [existing] = await db.execute('SELECT * FROM Membership WHERE VisitorID = ? LIMIT 1', [resolvedVisitorId])
        if (existing && existing.length > 0) {
          return res.json({ success: true, message: 'Membership already exists', membership: existing[0] })
        }
      }
      throw insertErr
    }
  } catch (err) {
    console.error('Membership purchase failed:', err && err.stack ? err.stack : err)
    // If this failed due to a missing referenced membership type, return
    // the available types so the frontend can present a correct mapping.
    if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452 || (err.message && /foreign key|referenced/i.test(err.message)))) {
      try {
        const [types] = await db.execute('SELECT TypeID, TypeName FROM MembershipType')
        return res.status(400).json({ error: 'Invalid membership type id', availableTypes: types })
      } catch (tErr) {
        console.error('Failed to load membership types after FK error:', tErr)
        return res.status(400).json({ error: 'Invalid membership type id' })
      }
    }

    res.status(500).json({ error: String(err) })
  }
})

// Return the membership row for a given visitor (resolve by UserID or VisitorID)
router.get('/visitor/:id/membership', async (req, res) => {
  const { id } = req.params
  try {
    // Resolve visitor id by either VisitorID or UserID
    const [vrows] = await db.execute('SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1', [id, id])
    if (!vrows || vrows.length === 0) return res.status(404).json({ error: 'Visitor not found' })
    const visitorId = vrows[0].VisitorID
    const [mrows] = await db.execute('SELECT * FROM Membership WHERE VisitorID = ? LIMIT 1', [visitorId])
    if (!mrows || mrows.length === 0) return res.status(404).json({ error: 'No membership found for visitor' })
    res.json({ membership: mrows[0] })
  } catch (err) {
    console.error('Visitor membership lookup failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// Create a transaction (order) for a visitor and add products to TransactionProduct
router.post('/transaction/create', async (req, res) => {
  const { visitorId, userId, items } = req.body || {}
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items provided' })

  try {
    // resolve visitorId if needed
    let vId = visitorId || null
    if (!vId && userId) {
      try {
        const [vrows] = await db.execute('SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1', [userId, userId])
        if (vrows && vrows.length > 0) vId = vrows[0].VisitorID
      } catch (e) { }
    }
    if (!vId) return res.status(404).json({ error: 'Visitor not found' })

    // determine department id for gift shop if possible
    let deptId = 1
    try {
      const [drows] = await db.execute("SELECT DepartmentID FROM Department WHERE Name LIKE '%Gift%' LIMIT 1")
      if (drows && drows.length > 0) deptId = drows[0].DepartmentID
    } catch (e) { /* ignore */ }

    // compute revenue: if item.price provided use it, otherwise lookup Product.RetailPrice
    let revenue = 0
    const preparedItems = []
    for (const it of items) {
      const pid = it.productId || it.id || it.productID
      const qty = Number(it.quantity || it.qty || 1)
      let price = Number(it.price || 0)
      if (!price || price <= 0) {
        const [prow] = await db.execute('SELECT RetailPrice FROM Product WHERE ProductID = ? LIMIT 1', [pid])
        if (prow && prow.length > 0) price = Number(prow[0].RetailPrice || 0)
      }
      revenue += (price * qty)
      preparedItems.push({ productId: pid, qty, price })
    }

    // insert transaction record — include VisitorID when available in schema
    let transactionId = null
    try {
      // try insert with VisitorID column
      const [tres] = await db.execute('INSERT INTO TransactionRecord (DepartmentID, VisitorID, Date, Revenue) VALUES (?, ?, CURDATE(), ?)', [deptId, vId, revenue])
      transactionId = tres && tres.insertId ? tres.insertId : null
    } catch (tErr) {
      // if VisitorID column missing, try without it
      if (tErr && (tErr.code === 'ER_BAD_FIELD_ERROR' || tErr.code === 'ER_UNKNOWN_COLUMN')) {
        const [tres2] = await db.execute('INSERT INTO TransactionRecord (DepartmentID, Date, Revenue) VALUES (?, CURDATE(), ?)', [deptId, revenue])
        transactionId = tres2 && tres2.insertId ? tres2.insertId : null
      } else {
        throw tErr
      }
    }

    // insert transaction products
    for (const it of preparedItems) {
      await db.execute('INSERT INTO TransactionProduct (TransactionID, ProductID, Quantity) VALUES (?, ?, ?)', [transactionId, it.productId, it.qty])
    }

    return res.json({ success: true, transactionId })
  } catch (err) {
    console.error('Create transaction failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// Return all products from Product table (avoid selecting columns that may be absent)
router.get('/products', async (req, res) => {
  try {
    // Some schemas may not include DepartmentID on Product; select common columns only
    const [rows] = await db.execute('SELECT ProductID, Name, Description, RetailPrice FROM Product')
    res.json({ products: rows })
  } catch (err) {
    console.error('Fetch products failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// Get transactions for a visitor (transaction header + products)
router.get('/visitor/:id/transactions', async (req, res) => {
  const { id } = req.params
  try {
    const [vrows] = await db.execute('SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1', [id, id])
    if (!vrows || vrows.length === 0) return res.status(404).json({ error: 'Visitor not found' })
    const visitorId = vrows[0].VisitorID

    const [trs] = await db.execute('SELECT * FROM TransactionRecord WHERE DepartmentID IS NOT NULL ORDER BY Date DESC')
    // join products for visitor's transactions by TransactionID via TransactionProduct
    const [rows] = await db.execute(
      `SELECT tr.TransactionID, tr.Date, tr.Revenue, tp.ProductID, tp.Quantity, p.Name, p.RetailPrice
       FROM TransactionRecord tr
       JOIN TransactionProduct tp ON tp.TransactionID = tr.TransactionID
       LEFT JOIN Product p ON p.ProductID = tp.ProductID
       WHERE tr.TransactionID IN (SELECT TransactionID FROM TransactionProduct)
       ORDER BY tr.Date DESC`)

    // Group by TransactionID
    const map = {}
    for (const r of rows) {
      if (!map[r.TransactionID]) map[r.TransactionID] = { TransactionID: r.TransactionID, Date: r.Date, Revenue: r.Revenue, items: [] }
      map[r.TransactionID].items.push({ ProductID: r.ProductID, Name: r.Name, Quantity: r.Quantity, Price: r.RetailPrice })
    }
    const result = Object.values(map)
    res.json({ transactions: result })
  } catch (err) {
    console.error('Fetch transactions failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// exported at end of file

// Mark a membership as expired (cancel request).
// Accepts either `membershipId`, or `visitorId`, or `userId` in the body.
router.post('/membership/cancel', async (req, res) => {
  const { membershipId, visitorId, userId } = req.body || {}

  try {
    console.log('[auth] cancel request body:', req.body)
    let targetMembershipId = membershipId || null
    let targetVisitorId = visitorId || null

    // If userId provided, try to resolve VisitorID
    if (!targetVisitorId && userId) {
      try {
        const [vrows] = await db.execute('SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1', [userId, userId])
        if (vrows && vrows.length > 0) targetVisitorId = vrows[0].VisitorID
      } catch (e) {
        // ignore
      }
    }

    // If we have a visitor id but not membership id, try to fetch membership id
    if (!targetMembershipId && targetVisitorId) {
      const [mrows] = await db.execute('SELECT MembershipID FROM Membership WHERE VisitorID = ? LIMIT 1', [targetVisitorId])
      if (mrows && mrows.length > 0) targetMembershipId = mrows[0].MembershipID
    }

    if (!targetMembershipId) {
      return res.status(404).json({ error: 'Membership not found for provided identifier' })
    }

    // Ensure schema has `Status` and `CancelledDate` columns (best-effort)
    try {
      await db.execute("ALTER TABLE Membership ADD COLUMN Status VARCHAR(20) NULL")
    } catch (colErr) {
      // errno 1060 = duplicate column name, ignore; otherwise log
      if (!(colErr && colErr.errno === 1060)) console.warn('ALTER TABLE add Status failed:', colErr && colErr.message)
    }
    try {
      await db.execute("ALTER TABLE Membership ADD COLUMN CancelledDate DATE NULL")
    } catch (colErr) {
      if (!(colErr && colErr.errno === 1060)) console.warn('ALTER TABLE add CancelledDate failed:', colErr && colErr.message)
    }

    // Update membership to mark canceled.
    // Do NOT force ExpirationDate to today — preserve original expiry.
    // Set Status and CancelledDate. Keep IsExpired = 1 only if ExpirationDate already passed.
    const [r] = await db.execute(
      'UPDATE Membership SET Status = ?, CancelledDate = CURDATE(), IsExpired = IF(ExpirationDate <= CURDATE(), 1, 0) WHERE MembershipID = ?',
      ['Canceled', targetMembershipId]
    )
    console.log('[auth] cancel update result:', r)
    if (r && r.affectedRows && r.affectedRows > 0) {
      const [updated] = await db.execute('SELECT * FROM Membership WHERE MembershipID = ? LIMIT 1', [targetMembershipId])
      console.log('[auth] updated membership row:', (updated && updated[0]) || null)
      return res.json({ success: true, membership: (updated && updated[0]) || null })
    }

    return res.status(500).json({ error: 'Failed to cancel membership' })
  } catch (err) {
    console.error('Cancel membership failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

export default router;
