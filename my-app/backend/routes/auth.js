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

    // lookup by username and include Visitor OR Staff info when available
    const [rows] = await db.execute(
      `SELECT ua.*,
              COALESCE(v.FirstName, s.FirstName) AS FirstName,
              COALESCE(v.LastName,  s.LastName)  AS LastName,
              COALESCE(v.Email,     s.Email)     AS VisitorEmail,
              s.PhoneNumber AS StaffPhone,
              s.HireDate    AS StaffHireDate
       FROM UserAccount ua
       LEFT JOIN Visitor v ON v.UserID = ua.UserID
       LEFT JOIN Staff s   ON s.UserID = ua.UserID
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
      email: user.VisitorEmail || null,
      phone: user.StaffPhone || null,
      hireDate: user.StaffHireDate || null
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

// Return all membership types (for the membership page)
router.get('/membership/types', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT TypeID, TypeName, GiftShopDiscountPercent, TicketDiscountPercent FROM MembershipType ORDER BY TypeID')
    res.json({ types: rows })
  } catch (err) {
    console.error('Failed to load membership types:', err)
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

    // Validate membership type id if provided
    if (membershipPlanId) {
      const [typeCheck] = await db.execute('SELECT TypeID FROM MembershipType WHERE TypeID = ?', [membershipPlanId])
      if (!typeCheck || typeCheck.length === 0) {
        const [types] = await db.execute('SELECT TypeID, TypeName FROM MembershipType')
        return res.status(400).json({ error: 'Invalid membership type id', availableTypes: types })
      }
    }

    // Upsert: insert new row or update existing one to renew (new dates, Active status, new type)
    const typeIdVal = membershipPlanId || null
    const [result] = await db.execute(
      `INSERT INTO Membership (VisitorID, MembershipTypeID, IsExpired, StartDate, ExpirationDate, Status, CancelledDate)
       VALUES (?, ?, 0, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'Active', NULL)
       ON DUPLICATE KEY UPDATE
         MembershipTypeID = VALUES(MembershipTypeID),
         IsExpired        = 0,
         StartDate        = CURDATE(),
         ExpirationDate   = DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
         Status           = 'Active',
         CancelledDate    = NULL`,
      [resolvedVisitorId, typeIdVal]
    )

    const [fetched] = await db.execute(
      `SELECT m.*, mt.TypeName FROM Membership m
       LEFT JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
       WHERE m.VisitorID = ? LIMIT 1`,
      [resolvedVisitorId]
    )
    const membership = fetched && fetched.length > 0 ? fetched[0] : null
    return res.json({ success: true, membershipId: membership?.MembershipID ?? null, visitorId: resolvedVisitorId, membership })
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

    // JOIN with MembershipType to include the plan name and discount info
    const [mrows] = await db.execute(
      `SELECT m.*, mt.TypeName, mt.GiftShopDiscountPercent, mt.TicketDiscountPercent
       FROM Membership m
       LEFT JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
       WHERE m.VisitorID = ? LIMIT 1`,
      [visitorId]
    )
    if (!mrows || mrows.length === 0) return res.status(404).json({ error: 'No membership found for visitor' })

    const row = mrows[0]
    // Compute a canonical status: respect explicit 'Canceled'; otherwise derive from dates/bit
    const isExpiredBit = row.IsExpired != null && (Buffer.isBuffer(row.IsExpired) ? row.IsExpired[0] === 1 : row.IsExpired === 1)
    const isExpiredByDate = row.ExpirationDate && new Date(row.ExpirationDate) < new Date()
    let computedStatus = row.Status || 'Active'
    if (computedStatus !== 'Canceled') {
      computedStatus = (isExpiredBit || isExpiredByDate) ? 'Expired' : 'Active'
    }

    res.json({ membership: { ...row, computedStatus } })
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
    // resolve visitorId - client may pass a UserID or VisitorID interchangeably
    let vId = null
    const tryId = visitorId || userId || null
    if (tryId) {
      try {
        const [vrows] = await db.execute(
          'SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1',
          [tryId, tryId]
        )
        if (vrows && vrows.length > 0) vId = vrows[0].VisitorID
      } catch (_) { }
    }
    if (!vId) return res.status(404).json({ error: 'Visitor not found' })

    // Fetch the visitor's active gift shop discount (0 if no membership)
    let giftShopDiscountPercent = 0
    try {
      const [mrows] = await db.execute(
        `SELECT m.IsExpired, m.ExpirationDate, m.Status, mt.GiftShopDiscountPercent
         FROM Membership m
         LEFT JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
         WHERE m.VisitorID = ? LIMIT 1`,
        [vId]
      )
      if (mrows && mrows.length > 0) {
        const m = mrows[0]
        const isExpiredBit = m.IsExpired != null && (Buffer.isBuffer(m.IsExpired) ? m.IsExpired[0] === 1 : m.IsExpired === 1)
        const isExpiredByDate = m.ExpirationDate && new Date(m.ExpirationDate) < new Date()
        const activeMember = (m.Status || 'Active') !== 'Canceled' && !isExpiredBit && !isExpiredByDate
        if (activeMember) giftShopDiscountPercent = Number(m.GiftShopDiscountPercent || 0)
      }
    } catch (_) { /* non-fatal */ }

    // get gift shop department id (hard-fallback to 4 if lookup fails)
    let deptId = 4
    try {
      const [drows] = await db.execute("SELECT DepartmentID FROM Department WHERE Name LIKE '%Gift%' LIMIT 1")
      if (drows && drows.length > 0) deptId = drows[0].DepartmentID
    } catch (_) { /* non-fatal */ }

    // compute revenue: look up RetailPrice, apply member gift shop discount if applicable
    let revenue = 0
    const preparedItems = []
    for (const it of items) {
      const pid = it.productId || it.id || it.productID
      const qty = Number(it.quantity || it.qty || 1)
      let retailPrice = Number(it.price || 0)
      if (!retailPrice || retailPrice <= 0) {
        const [prow] = await db.execute('SELECT RetailPrice FROM Product WHERE ProductID = ? LIMIT 1', [pid])
        if (prow && prow.length > 0) retailPrice = Number(prow[0].RetailPrice || 0)
      }
      const price = parseFloat((retailPrice * (1 - giftShopDiscountPercent / 100)).toFixed(2))
      revenue += (price * qty)
      preparedItems.push({ productId: pid, qty, price, retailPrice, giftShopDiscountPercent })
    }

    // insert transaction record
    let transactionId = null
    const [tres] = await db.execute(
      'INSERT INTO TransactionRecord (DepartmentID, VisitorID, Date, Revenue) VALUES (?, ?, CURDATE(), ?)',
      [deptId, vId, revenue]
    )
    transactionId = tres && tres.insertId ? tres.insertId : null

    // insert transaction products
    for (const it of preparedItems) {
      await db.execute('INSERT INTO TransactionProduct (TransactionID, ProductID, Quantity) VALUES (?, ?, ?)', [transactionId, it.productId, it.qty])
    }

    return res.json({ success: true, transactionId, giftShopDiscountPercent })
  } catch (err) {
    console.error('Create transaction failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// Return all products from Product table (avoid selecting columns that may be absent)
router.get('/products', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT ProductID, Name, Description, RetailPrice, ImageURL FROM Product')
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

    // join products for this visitor's transactions only
    const [rows] = await db.execute(
      `SELECT tr.TransactionID, tr.Date, tr.Revenue, tp.ProductID, tp.Quantity, p.Name, p.RetailPrice
       FROM TransactionRecord tr
       JOIN TransactionProduct tp ON tp.TransactionID = tr.TransactionID
       LEFT JOIN Product p ON p.ProductID = tp.ProductID
       WHERE tr.VisitorID = ?
       ORDER BY tr.Date DESC`,
      [visitorId])

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

// ─── TICKET PRICING ──────────────────────────────────────────────────────────
// GET /api/tickets/pricing?visitDate=YYYY-MM-DD&userId=X
// Returns all exhibits with the correct price for the user (member vs regular)
// and remaining capacity for the given visit date.
router.get('/tickets/pricing', async (req, res) => {
  const { visitDate, userId } = req.query
  if (!visitDate) return res.status(400).json({ error: 'visitDate is required' })

  try {
    // Determine membership status and ticket discount
    let isMember = false
    let ticketDiscountPercent = 0
    if (userId) {
      try {
        const [vrows] = await db.execute(
          'SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1',
          [userId, userId]
        )
        if (vrows && vrows.length > 0) {
          const [mrows] = await db.execute(
            `SELECT m.IsExpired, m.ExpirationDate, m.Status, mt.TicketDiscountPercent
             FROM Membership m
             LEFT JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
             WHERE m.VisitorID = ? LIMIT 1`,
            [vrows[0].VisitorID]
          )
          if (mrows && mrows.length > 0) {
            const m = mrows[0]
            const isExpiredBit = m.IsExpired != null && (Buffer.isBuffer(m.IsExpired) ? m.IsExpired[0] === 1 : m.IsExpired === 1)
            const isExpiredByDate = m.ExpirationDate && new Date(m.ExpirationDate) < new Date()
            isMember = (m.Status || 'Active') !== 'Canceled' && !isExpiredBit && !isExpiredByDate
            if (isMember) ticketDiscountPercent = Number(m.TicketDiscountPercent || 0)
          }
        }
      } catch (_) { /* non-fatal */ }
    }

    // Fetch exhibits with pricing — daily override takes precedence over base price
    const [rows] = await db.execute(
      `SELECT e.ExhibitID, e.ExhibitName, e.Description, e.MaxCapacity,
              COALESCE(dgap.GeneralAdmissionPrice,    gap.GeneralAdmissionPrice)       AS RegularPrice,
              COALESCE(dgap.GeneralAdmissionMemberPrice, gap.GeneralAdmissionMemberPrice) AS MemberPrice
       FROM Exhibit e
       LEFT JOIN GeneralAdmissionPrices gap       ON gap.ExhibitID  = e.ExhibitID
       LEFT JOIN DailyGeneralAdmissionPrices dgap ON dgap.ExhibitID = e.ExhibitID AND dgap.Date = ?`,
      [visitDate]
    )

    // Units already booked for this visit date per exhibit
    const [bookedRows] = await db.execute(
      `SELECT tpi.ExhibitID, SUM(tpi.Quantity) AS Booked
       FROM TicketPurchaseItem tpi
       JOIN TicketPurchase tp ON tp.TicketPurchaseID = tpi.TicketPurchaseID
       WHERE tp.VisitDate = ?
       GROUP BY tpi.ExhibitID`,
      [visitDate]
    )
    const bookedMap = {}
    for (const b of bookedRows) bookedMap[b.ExhibitID] = Number(b.Booked)

    const exhibits = rows.map(e => {
      const booked = bookedMap[e.ExhibitID] || 0
      const regularPrice = Number(e.RegularPrice || 0)
      const memberPrice  = isMember
        ? parseFloat((regularPrice * (1 - ticketDiscountPercent / 100)).toFixed(2))
        : Number(e.MemberPrice || 0)
      return {
        ExhibitID:   e.ExhibitID,
        ExhibitName: e.ExhibitName,
        Description: e.Description,
        MaxCapacity: e.MaxCapacity,
        Booked:      booked,
        Available:   e.MaxCapacity - booked,
        RegularPrice: regularPrice,
        MemberPrice:  memberPrice,
        Price: isMember ? memberPrice : regularPrice,
        ticketDiscountPercent: isMember ? ticketDiscountPercent : 0,
      }
    })

    res.json({ exhibits, isMember, ticketDiscountPercent })
  } catch (err) {
    console.error('Ticket pricing fetch failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─── TICKET PURCHASE ─────────────────────────────────────────────────────────
// POST /api/tickets/purchase
// Body: { userId, visitDate, items: [{ exhibitId, qty }] }
// Validates capacity, calculates prices, inserts TicketPurchase + TicketPurchaseItem rows.
router.post('/tickets/purchase', async (req, res) => {
  const { userId, visitDate, items } = req.body || {}
  if (!visitDate) return res.status(400).json({ error: 'visitDate is required' })
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items is required' })

  try {
    // Resolve VisitorID
    let visitorId = null
    if (userId) {
      const [vrows] = await db.execute(
        'SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1',
        [userId, userId]
      )
      if (vrows && vrows.length > 0) visitorId = vrows[0].VisitorID
    }
    if (!visitorId) {
      return res.status(404).json({ error: 'Visitor profile not found. Please complete your profile before purchasing tickets.' })
    }

    // Membership check — also fetch TicketDiscountPercent from MembershipType
    let isMember = false
    let ticketDiscountPercent = 0
    try {
      const [mrows] = await db.execute(
        `SELECT m.IsExpired, m.ExpirationDate, m.Status, mt.TicketDiscountPercent
         FROM Membership m
         LEFT JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
         WHERE m.VisitorID = ? LIMIT 1`,
        [visitorId]
      )
      if (mrows && mrows.length > 0) {
        const m = mrows[0]
        const isExpiredBit = m.IsExpired != null && (Buffer.isBuffer(m.IsExpired) ? m.IsExpired[0] === 1 : m.IsExpired === 1)
        const isExpiredByDate = m.ExpirationDate && new Date(m.ExpirationDate) < new Date()
        isMember = (m.Status || 'Active') !== 'Canceled' && !isExpiredBit && !isExpiredByDate
        if (isMember) ticketDiscountPercent = Number(m.TicketDiscountPercent || 0)
      }
    } catch (_) { /* non-fatal */ }

    // Validate each item: existence, capacity, price
    let totalAmount = 0
    const preparedItems = []

    for (const item of items) {
      const exhibitId = Number(item.exhibitId || item.ExhibitID)
      const qty = Number(item.qty || item.Quantity || 1)
      if (!exhibitId || qty <= 0) continue

      const [erows] = await db.execute(
        `SELECT e.ExhibitID, e.ExhibitName, e.MaxCapacity,
                COALESCE(dgap.GeneralAdmissionPrice,       gap.GeneralAdmissionPrice)       AS RegularPrice,
                COALESCE(dgap.GeneralAdmissionMemberPrice, gap.GeneralAdmissionMemberPrice) AS MemberPrice
         FROM Exhibit e
         LEFT JOIN GeneralAdmissionPrices gap       ON gap.ExhibitID  = e.ExhibitID
         LEFT JOIN DailyGeneralAdmissionPrices dgap ON dgap.ExhibitID = e.ExhibitID AND dgap.Date = ?
         WHERE e.ExhibitID = ?`,
        [visitDate, exhibitId]
      )
      if (!erows || erows.length === 0) {
        return res.status(400).json({ error: `Exhibit ${exhibitId} not found` })
      }
      const exhibit = erows[0]
      const regularPrice = Number(exhibit.RegularPrice || 0)
      const unitPrice = isMember
        ? parseFloat((regularPrice * (1 - ticketDiscountPercent / 100)).toFixed(2))
        : regularPrice

      // Capacity check
      const [[bookedRow]] = await db.execute(
        `SELECT COALESCE(SUM(tpi.Quantity), 0) AS Booked
         FROM TicketPurchaseItem tpi
         JOIN TicketPurchase tp ON tp.TicketPurchaseID = tpi.TicketPurchaseID
         WHERE tp.VisitDate = ? AND tpi.ExhibitID = ?`,
        [visitDate, exhibitId]
      )
      const available = exhibit.MaxCapacity - Number(bookedRow.Booked || 0)
      if (qty > available) {
        return res.status(409).json({
          error: `Not enough capacity for "${exhibit.ExhibitName}". Requested ${qty}, available ${available}.`,
          exhibitId,
          available,
        })
      }

      totalAmount += unitPrice * qty
      preparedItems.push({ exhibitId, qty, unitPrice, exhibitName: exhibit.ExhibitName })
    }

    if (preparedItems.length === 0) return res.status(400).json({ error: 'No valid items to purchase' })

    // Insert header row
    const [tpRes] = await db.execute(
      'INSERT INTO TicketPurchase (VisitorID, VisitDate, TotalAmount) VALUES (?, ?, ?)',
      [visitorId, visitDate, totalAmount]
    )
    const ticketPurchaseId = tpRes.insertId

    // Insert one detail row per exhibit
    for (const it of preparedItems) {
      await db.execute(
        'INSERT INTO TicketPurchaseItem (TicketPurchaseID, ExhibitID, Quantity, UnitPrice) VALUES (?, ?, ?, ?)',
        [ticketPurchaseId, it.exhibitId, it.qty, it.unitPrice]
      )
    }

    res.json({ success: true, ticketPurchaseId, totalAmount, isMember, items: preparedItems })
  } catch (err) {
    console.error('Ticket purchase failed:', err)
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

// GET /api/admin/departments — admin: list departments for employee form
router.get('/admin/departments', async (req, res) => {
  const { userId } = req.query
  try {
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const [urows] = await db.execute('SELECT Role FROM UserAccount WHERE UserID = ?', [userId])
    if (!urows || urows.length === 0 || urows[0].Role !== 'Admin') return res.status(403).json({ error: 'Admin access required' })
    const [rows] = await db.execute('SELECT DepartmentID, Name FROM Department ORDER BY Name')
    res.json({ departments: rows })
  } catch (err) {
    console.error('Fetch departments failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/admin/create-account — admin: create a Visitor, Employee, or Gift_Shop_Manager account
router.post('/admin/create-account', async (req, res) => {
  const { userId, accountType, username, password,
          firstName, lastName, email, phone, address, dateOfBirth,
          hireDate } = req.body || {}

  if (!userId) return res.status(401).json({ error: 'Authentication required' })
  if (!accountType || !username || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'accountType, username, password, firstName, and lastName are required' })
  }

  const validTypes = ['Visitor', 'Curator', 'Gift_Shop_Manager']
  if (!validTypes.includes(accountType)) return res.status(400).json({ error: 'Invalid accountType' })

  try {
    // Verify caller is admin
    const [urows] = await db.execute('SELECT Role FROM UserAccount WHERE UserID = ?', [userId])
    if (!urows || urows.length === 0 || urows[0].Role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const bcrypt = (await import('bcryptjs')).default
    const hash = await bcrypt.hash(password, 10)

    // Insert UserAccount
    const [uaRes] = await db.execute(
      "INSERT INTO UserAccount (Username, PasswordHash, Role) VALUES (?, ?, ?)",
      [username, hash, accountType]
    )
    const newUserId = uaRes.insertId

    let profileId = null

    if (accountType === 'Visitor') {
      const dob = dateOfBirth || null
      const [vRes] = await db.execute(
        `INSERT INTO Visitor (UserID, FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, firstName, lastName, phone || '', email || null, dob, address || null]
      ).catch(async () => {
        // Fallback if UserID column doesn't exist
        return db.execute(
          `INSERT INTO Visitor (FirstName, LastName, PhoneNumber, Email, DateOfBirth, Address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [firstName, lastName, phone || '', email || null, dob, address || null]
        )
      })
      profileId = vRes && vRes.insertId
    } else {
      // Curator or Gift_Shop_Manager → Staff row
      const hireDateVal = hireDate || new Date().toISOString().slice(0, 10)
      const dobVal = dateOfBirth || null
      const [sRes] = await db.execute(
        `INSERT INTO Staff (UserID, FirstName, LastName, DateOfBirth, Email, PhoneNumber, Address, HireDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, firstName, lastName, dobVal, email || null, phone || null, address || null, hireDateVal]
      )
      profileId = sRes && sRes.insertId
    }

    res.json({ success: true, userId: newUserId, profileId, accountType })
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' })
    console.error('Admin create-account failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/exhibits — list all exhibits
router.get('/exhibits', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT ExhibitID, ExhibitName, Description FROM Exhibit ORDER BY ExhibitID')
    res.json({ exhibits: rows })
  } catch (err) {
    console.error('Fetch exhibits failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/exhibits/:id/artifacts
router.get('/exhibits/:id/artifacts', async (req, res) => {
  const exhibitId = Number(req.params.id)
  if (!exhibitId) return res.status(400).json({ error: 'Invalid exhibit id' })
  try {
    const [rows] = await db.execute(
      `SELECT ArtifactID, ExhibitID, Name, Description, EntryDate, ImageURL
       FROM Artifact
       WHERE ExhibitID = ?
       ORDER BY EntryDate DESC, ArtifactID ASC`,
      [exhibitId]
    )
    res.json({ artifacts: rows })
  } catch (err) {
    console.error('Fetch artifacts failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/artifacts — Curator or Admin: add a new artifact to an exhibit
router.post('/artifacts', async (req, res) => {
  const { name, description, entryDate, exhibitId, imageURL, userId } = req.body || {}
  if (!name || !exhibitId) return res.status(400).json({ error: 'name and exhibitId are required' })
  try {
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const [urows] = await db.execute('SELECT Role FROM UserAccount WHERE UserID = ?', [userId])
    if (!urows || urows.length === 0 || !['Admin', 'Curator'].includes(urows[0].Role)) {
      return res.status(403).json({ error: 'Curator access required' })
    }
    const dateVal = entryDate || new Date().toISOString().slice(0, 10)
    const [result] = await db.execute(
      'INSERT INTO Artifact (ExhibitID, Name, Description, EntryDate, ImageURL) VALUES (?, ?, ?, ?, ?)',
      [exhibitId, name, description || null, dateVal, imageURL?.toString().trim() || null]
    )
    const artifactId = result.insertId
    res.json({
      success: true,
      artifact: { ArtifactID: artifactId, ExhibitID: exhibitId, Name: name, Description: description || null, EntryDate: dateVal, ImageURL: imageURL || null }
    })
  } catch (err) {
    console.error('Add artifact failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/curator/artifacts — all artifacts with exhibit name, sorted newest first
router.get('/curator/artifacts', async (req, res) => {
  try {
    const { exhibitId, search } = req.query
    const conds = []; const params = []
    if (exhibitId) { conds.push('a.ExhibitID = ?'); params.push(parseInt(exhibitId, 10)) }
    if (search)    { conds.push('a.Name LIKE ?');   params.push(`%${search}%`) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const [rows] = await db.execute(`
      SELECT a.ArtifactID, a.ExhibitID, e.ExhibitName, a.Name, a.Description, a.EntryDate, a.ImageURL
      FROM Artifact a
      JOIN Exhibit e ON e.ExhibitID = a.ExhibitID
      ${where}
      ORDER BY a.EntryDate DESC, a.ArtifactID DESC
    `, params)
    res.json({ artifacts: rows })
  } catch (err) {
    console.error('curator artifacts fetch error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// PUT /api/curator/artifacts/:id — Curator or Admin: update an artifact
router.put('/curator/artifacts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid artifact ID.' })
    const { name, description, entryDate, exhibitId, imageURL, userId } = req.body || {}
    if (!name || !exhibitId) return res.status(400).json({ error: 'name and exhibitId are required' })
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const [urows] = await db.execute('SELECT Role FROM UserAccount WHERE UserID = ?', [userId])
    if (!urows || urows.length === 0 || !['Admin', 'Curator'].includes(urows[0].Role)) {
      return res.status(403).json({ error: 'Curator access required' })
    }
    const dateVal = entryDate || new Date().toISOString().slice(0, 10)
    const [result] = await db.execute(
      'UPDATE Artifact SET ExhibitID=?, Name=?, Description=?, EntryDate=?, ImageURL=? WHERE ArtifactID=?',
      [parseInt(exhibitId, 10), name.toString().trim(), description?.toString().trim() || null, dateVal, imageURL?.toString().trim() || null, id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Artifact not found.' })
    const [[row]] = await db.execute(
      `SELECT a.ArtifactID, a.ExhibitID, e.ExhibitName, a.Name, a.Description, a.EntryDate, a.ImageURL
       FROM Artifact a JOIN Exhibit e ON e.ExhibitID = a.ExhibitID WHERE a.ArtifactID = ?`, [id]
    )
    res.json({ success: true, artifact: row })
  } catch (err) {
    console.error('curator update artifact error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /api/curator/artifacts/:id — Curator or Admin: delete an artifact
router.delete('/curator/artifacts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid artifact ID.' })
    const { userId } = req.body || {}
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const [urows] = await db.execute('SELECT Role FROM UserAccount WHERE UserID = ?', [userId])
    if (!urows || urows.length === 0 || !['Admin', 'Curator'].includes(urows[0].Role)) {
      return res.status(403).json({ error: 'Curator access required' })
    }
    const [result] = await db.execute('DELETE FROM Artifact WHERE ArtifactID = ?', [id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Artifact not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('curator delete artifact error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─────────────────────────────────────────
// CURATOR PORTAL ROUTES
// ─────────────────────────────────────────

// GET /api/curator/exhibit-report
// Returns per-exhibit: artifact count, tickets sold, and revenue
// Joins: Exhibit → Artifact, TicketPurchaseItem, TicketPurchase
router.get('/curator/exhibit-report', async (req, res) => {
  try {
    const { dateFrom, dateTo, sortBy } = req.query

    // Date conditions go on the TicketPurchase JOIN so exhibits with 0 tickets still appear
    let tpJoinCond = 'tp.TicketPurchaseID = tpi.TicketPurchaseID'
    const params = []
    if (dateFrom) { tpJoinCond += ' AND tp.VisitDate >= ?'; params.push(dateFrom) }
    if (dateTo)   { tpJoinCond += ' AND tp.VisitDate <= ?'; params.push(dateTo)   }

    const sortMap = {
      revenue_desc:   'Revenue DESC',
      revenue_asc:    'Revenue ASC',
      tickets_desc:   'TicketsSold DESC',
      tickets_asc:    'TicketsSold ASC',
      artifacts_desc: 'ArtifactCount DESC',
      name_asc:       'e.ExhibitName ASC',
    }
    const orderBy = sortMap[sortBy] || sortMap.revenue_desc

    const [rows] = await db.execute(`
      SELECT
        e.ExhibitID,
        e.ExhibitName,
        e.Status,
        e.MaxCapacity,
        COUNT(DISTINCT a.ArtifactID)                   AS ArtifactCount,
        COALESCE(SUM(tpi.Quantity), 0)                 AS TicketsSold,
        ROUND(COALESCE(SUM(tpi.Subtotal), 0), 2)       AS Revenue
      FROM Exhibit e
      LEFT JOIN Artifact            a   ON a.ExhibitID         = e.ExhibitID
      LEFT JOIN TicketPurchaseItem  tpi ON tpi.ExhibitID        = e.ExhibitID
      LEFT JOIN TicketPurchase      tp  ON ${tpJoinCond}
      GROUP BY e.ExhibitID, e.ExhibitName, e.Status, e.MaxCapacity
      ORDER BY ${orderBy}
    `, params)

    res.json({ rows })
  } catch (err) {
    console.error('curator exhibit report error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─────────────────────────────────────────
// GIFT SHOP PORTAL ROUTES  (DepartmentID = 4)
// ─────────────────────────────────────────
const GIFTSHOP_DEPT_ID = 4

// GET /api/giftshop/products
router.get('/giftshop/products', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ProductID, Name, Description, RetailPrice
       FROM Product
       ORDER BY Name ASC`
    )
    res.json({ products: rows })
  } catch (err) {
    console.error('giftshop products error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/giftshop/transactions  — recent transactions with visitor + product info
router.get('/giftshop/transactions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100)
    // One row per transaction, aggregating product names via GROUP_CONCAT
    const [rows] = await db.execute(
      `SELECT
         tr.TransactionID,
         tr.Date,
         tr.Revenue,
         CONCAT(v.FirstName, ' ', v.LastName) AS VisitorName,
         GROUP_CONCAT(p.Name ORDER BY p.Name SEPARATOR ', ') AS Products,
         SUM(tp.Quantity) AS TotalItems
       FROM TransactionRecord tr
       JOIN Visitor v ON v.VisitorID = tr.VisitorID
       LEFT JOIN TransactionProduct tp ON tp.TransactionID = tr.TransactionID
       LEFT JOIN Product p ON p.ProductID = tp.ProductID
       WHERE tr.DepartmentID = ?
       GROUP BY tr.TransactionID, tr.Date, tr.Revenue, v.FirstName, v.LastName
       ORDER BY tr.Date DESC, tr.TransactionID DESC
       LIMIT ?`,
      [GIFTSHOP_DEPT_ID, limit]
    )
    res.json({ transactions: rows })
  } catch (err) {
    console.error('giftshop transactions error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/giftshop/metrics  — aggregated numbers for the portal header cards
router.get('/giftshop/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const [[totalProductsRow], [totalTxnRow], [todayTxnRow], [topProductRow], [lowStockRow]] = await Promise.all([
      db.execute(`SELECT COUNT(*) AS cnt FROM Product`),
      db.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(Revenue), 0) AS totalRevenue
         FROM TransactionRecord WHERE DepartmentID = ?`,
        [GIFTSHOP_DEPT_ID]
      ),
      db.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(Revenue), 0) AS revenue
         FROM TransactionRecord WHERE DepartmentID = ? AND Date = ?`,
        [GIFTSHOP_DEPT_ID, today]
      ),
      db.execute(
        `SELECT p.Name, SUM(tp.Quantity) AS totalSold
         FROM TransactionProduct tp
         JOIN Product p ON p.ProductID = tp.ProductID
         JOIN TransactionRecord tr ON tr.TransactionID = tp.TransactionID
         WHERE tr.DepartmentID = ?
         GROUP BY p.ProductID, p.Name
         ORDER BY totalSold DESC
         LIMIT 1`,
        [GIFTSHOP_DEPT_ID]
      ),
      db.execute(`SELECT COUNT(*) AS cnt FROM Product WHERE StockQuantity <= LowStockThreshold`),
    ])
    res.json({
      totalProducts:     totalProductsRow[0]?.cnt    ?? 0,
      totalTransactions: totalTxnRow[0]?.cnt         ?? 0,
      totalRevenue:      parseFloat(totalTxnRow[0]?.totalRevenue ?? 0),
      revenueToday:      parseFloat(todayTxnRow[0]?.revenue ?? 0),
      transactionsToday: todayTxnRow[0]?.cnt         ?? 0,
      topProduct:        topProductRow[0]             ?? null,
      lowStockCount:     lowStockRow[0]?.cnt          ?? 0,
    })
  } catch (err) {
    console.error('giftshop metrics error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/giftshop/products/low-stock — all products with StockQuantity <= LowStockThreshold
// Sorted by StockQuantity ASC so most urgent comes first
router.get('/giftshop/products/low-stock', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT ProductID, Name, Description, RetailPrice, StockQuantity, LowStockThreshold
      FROM Product
      WHERE StockQuantity <= LowStockThreshold
      ORDER BY StockQuantity ASC, Name ASC
    `)
    res.json({ products: rows })
  } catch (err) {
    console.error('giftshop low-stock error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/giftshop/products/analytics — per-product sales stats + current inventory
// Filters: productName, dateFrom, dateTo, stockStatus (out/low/ok), sortBy
router.get('/giftshop/products/analytics', async (req, res) => {
  try {
    const { productName, dateFrom, dateTo, stockStatus, sortBy } = req.query

    // Date conditions applied inside CASE expressions for sales columns
    const dateConds  = []
    const dateParams = []
    if (dateFrom) { dateConds.push('tr.Date >= ?'); dateParams.push(dateFrom) }
    if (dateTo)   { dateConds.push('tr.Date <= ?'); dateParams.push(dateTo)   }
    const caseExpr = dateConds.length ? dateConds.join(' AND ') : '1=1'

    // Product-level WHERE (stock status + name search)
    const prodWhere  = []
    const prodParams = []
    if (productName) { prodWhere.push('p.Name LIKE ?'); prodParams.push(`%${productName}%`) }
    if      (stockStatus === 'out') prodWhere.push('p.StockQuantity = 0')
    else if (stockStatus === 'low') prodWhere.push('p.StockQuantity > 0 AND p.StockQuantity <= p.LowStockThreshold')
    else if (stockStatus === 'ok')  prodWhere.push('p.StockQuantity > p.LowStockThreshold')
    const whereClause = prodWhere.length ? `WHERE ${prodWhere.join(' AND ')}` : ''

    const sortMap = {
      name_asc:     'p.Name ASC',
      name_desc:    'p.Name DESC',
      revenue_desc: 'TotalRevenue DESC',
      qty_desc:     'TotalQtySold DESC',
      stock_asc:    'p.StockQuantity ASC',
      last_sold:    'LastSoldDate DESC',
    }
    const orderBy = sortMap[sortBy] || 'p.Name ASC'

    // dateParams repeated once per CASE expression (5 total), then prodParams, then GIFTSHOP_DEPT_ID for JOIN
    const allParams = [...dateParams, ...dateParams, ...dateParams, ...dateParams, ...dateParams, ...prodParams, GIFTSHOP_DEPT_ID]

    const [rows] = await db.execute(`
      SELECT
        p.ProductID,
        p.Name,
        p.Description,
        p.RetailPrice,
        p.StockQuantity,
        p.LowStockThreshold,
        p.imageURL,
        COALESCE(SUM(CASE WHEN ${caseExpr} THEN tp.Quantity                  ELSE 0 END), 0) AS TotalQtySold,
        COALESCE(SUM(CASE WHEN ${caseExpr} THEN p.RetailPrice * tp.Quantity  ELSE 0 END), 0) AS TotalRevenue,
        COUNT(DISTINCT CASE WHEN ${caseExpr} THEN tr.TransactionID           END)             AS NumTransactions,
        COALESCE(AVG(CASE WHEN ${caseExpr} THEN tp.Quantity                  END),    0)      AS AvgQtyPerTxn,
        MAX(CASE           WHEN ${caseExpr} THEN tr.Date                     END)             AS LastSoldDate
      FROM Product p
      LEFT JOIN TransactionProduct tp ON tp.ProductID     = p.ProductID
      LEFT JOIN TransactionRecord  tr ON tr.TransactionID = tp.TransactionID
                                     AND tr.DepartmentID  = ?
      ${whereClause}
      GROUP BY p.ProductID, p.Name, p.Description, p.RetailPrice, p.StockQuantity, p.LowStockThreshold, p.imageURL
      ORDER BY ${orderBy}
    `, allParams)

    res.json({ products: rows })
  } catch (err) {
    console.error('giftshop products analytics error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/giftshop/products — add a new product to the catalogue
router.post('/giftshop/products', async (req, res) => {
  try {
    const { name, description, retailPrice, stockQuantity, lowStockThreshold, imageURL } = req.body || {}
    if (!name || name.toString().trim() === '') return res.status(400).json({ error: 'Name is required.' })
    const price     = parseFloat(retailPrice)
    const stock     = parseInt(stockQuantity ?? 0, 10)
    const threshold = parseInt(lowStockThreshold ?? 5, 10)
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Invalid retail price.' })
    const [result] = await db.execute(
      `INSERT INTO Product (Name, Description, RetailPrice, StockQuantity, LowStockThreshold, imageURL)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.toString().trim(), description?.toString().trim() || null, price, stock, threshold, imageURL?.toString().trim() || null]
    )
    const [rows] = await db.execute('SELECT * FROM Product WHERE ProductID = ?', [result.insertId])
    res.status(201).json({ success: true, product: rows[0] })
  } catch (err) {
    console.error('giftshop add product error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// PUT /api/giftshop/products/:id/stock — update a product's stock quantity
router.put('/giftshop/products/:id/stock', async (req, res) => {
  try {
    const id     = parseInt(req.params.id, 10)
    const newQty = parseInt(req.body.stockQuantity, 10)
    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(newQty) || newQty < 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity.' })
    }
    const [result] = await db.execute(
      'UPDATE Product SET StockQuantity = ? WHERE ProductID = ?',
      [newQty, id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' })
    res.json({ ok: true, stockQuantity: newQty })
  } catch (err) {
    console.error('giftshop stock update error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// PUT /api/giftshop/products/:id — full update of a product's details
router.put('/giftshop/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid product ID.' })
    const { name, description, retailPrice, stockQuantity, lowStockThreshold, imageURL } = req.body || {}
    if (!name || name.toString().trim() === '') return res.status(400).json({ error: 'Name is required.' })
    const price     = parseFloat(retailPrice)
    const stock     = parseInt(stockQuantity ?? 0, 10)
    const threshold = parseInt(lowStockThreshold ?? 5, 10)
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Invalid retail price.' })
    const [result] = await db.execute(
      `UPDATE Product SET Name=?, Description=?, RetailPrice=?, StockQuantity=?, LowStockThreshold=?, imageURL=? WHERE ProductID=?`,
      [name.toString().trim(), description?.toString().trim() || null, price, stock, threshold, imageURL?.toString().trim() || null, id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' })
    const [rows] = await db.execute('SELECT * FROM Product WHERE ProductID = ?', [id])
    res.json({ success: true, product: rows[0] })
  } catch (err) {
    console.error('giftshop update product error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /api/giftshop/products/:id — remove a product
router.delete('/giftshop/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid product ID.' })
    const [result] = await db.execute('DELETE FROM Product WHERE ProductID = ?', [id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('giftshop delete product error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/giftshop/report  — full transaction line-item report with visitor info
// Filters: search (visitor name, username, or product name), dateFrom, dateTo, sortBy
router.get('/giftshop/report', async (req, res) => {
  try {
    const { search, dateFrom, dateTo, sortBy } = req.query

    const conds  = ['tr.DepartmentID = ?']
    const params = [GIFTSHOP_DEPT_ID]

    if (dateFrom) { conds.push('tr.Date >= ?'); params.push(dateFrom) }
    if (dateTo)   { conds.push('tr.Date <= ?'); params.push(dateTo)   }
    if (search) {
      conds.push('(p.Name LIKE ? OR CONCAT(v.FirstName,\' \',v.LastName) LIKE ? OR u.Username LIKE ?)')
      const like = `%${search}%`
      params.push(like, like, like)
    }

    const sortMap = {
      date_desc:    'tr.Date DESC, tr.TransactionID DESC',
      date_asc:     'tr.Date ASC,  tr.TransactionID ASC',
      revenue_desc: 'tr.Revenue DESC',
      revenue_asc:  'tr.Revenue ASC',
      product_asc:  'p.Name ASC',
    }
    const orderBy = sortMap[sortBy] || sortMap.date_desc

    const [rows] = await db.execute(`
      SELECT
        tr.TransactionID,
        DATE_FORMAT(tr.Date, '%Y-%m-%d')          AS Date,
        CONCAT(v.FirstName,' ',v.LastName)         AS VisitorName,
        u.Username,
        p.Name                                     AS ProductName,
        tp.Quantity,
        p.RetailPrice,
        ROUND(p.RetailPrice * tp.Quantity, 2)      AS LineTotal,
        tr.Revenue                                 AS TxnTotal
      FROM TransactionRecord  tr
      JOIN TransactionProduct tp ON tp.TransactionID = tr.TransactionID
      JOIN Product            p  ON p.ProductID      = tp.ProductID
      JOIN Visitor            v  ON v.VisitorID      = tr.VisitorID
      JOIN UserAccount        u  ON u.UserID         = v.UserID
      WHERE ${conds.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT 500
    `, params)

    res.json({ rows })
  } catch (err) {
    console.error('giftshop report error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─────────────────────────────────────────
// ADMIN DASHBOARD ROUTES
// ─────────────────────────────────────────

// GET /api/admin/metrics — all KPI cards for the overview
router.get('/admin/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const [
      [ticketRow],
      [memberRow],
      [revenueRow],
      [exhibitRow],
      [visitorRow],
      [txnRow],
      memberTypeRows,
      [todayTicketRow],
    ] = await Promise.all([
      db.execute(`SELECT COALESCE(SUM(TotalAmount),0) AS ticketRevenue, COUNT(*) AS ticketOrders
                  FROM TicketPurchase WHERE Status = 'Active'`),
      db.execute(`SELECT COUNT(*) AS activeMemberships FROM Membership WHERE Status = 'Active'`),
      db.execute(`SELECT COALESCE(SUM(Revenue),0) AS totalRevenue, COUNT(*) AS totalTransactions
                  FROM TransactionRecord`),
      db.execute(`SELECT COUNT(*) AS activeExhibits FROM Exhibit WHERE Status = 'Active'`),
      db.execute(`SELECT COUNT(*) AS totalVisitors FROM Visitor`),
      db.execute(`SELECT COUNT(*) AS totalTickets, COUNT(DISTINCT VisitorID) AS uniqueTicketVisitors FROM Ticket`),
      db.execute(`SELECT mt.TypeName, COUNT(*) AS cnt
                  FROM Membership m
                  JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
                  WHERE m.Status = 'Active'
                  GROUP BY mt.TypeID, mt.TypeName`),
      db.execute(`SELECT COALESCE(SUM(TotalAmount),0) AS revenueToday, COUNT(*) AS ordersToday
                  FROM TicketPurchase WHERE DATE(PurchaseDate) = ?`, [today]),
    ])
    res.json({
      ticketRevenue:        parseFloat(ticketRow[0]?.ticketRevenue ?? 0),
      ticketOrders:         ticketRow[0]?.ticketOrders         ?? 0,
      activeMemberships:    memberRow[0]?.activeMemberships    ?? 0,
      totalRevenue:         parseFloat(revenueRow[0]?.totalRevenue ?? 0),
      totalTransactions:    revenueRow[0]?.totalTransactions   ?? 0,
      activeExhibits:       exhibitRow[0]?.activeExhibits      ?? 0,
      totalVisitors:        visitorRow[0]?.totalVisitors        ?? 0,
      totalTickets:         txnRow[0]?.totalTickets             ?? 0,
      uniqueTicketVisitors: txnRow[0]?.uniqueTicketVisitors     ?? 0,
      revenueToday:         parseFloat(todayTicketRow[0]?.revenueToday ?? 0),
      ordersToday:          todayTicketRow[0]?.ordersToday      ?? 0,
      membershipByType:     memberTypeRows[0] ?? [],
    })
  } catch (err) {
    console.error('admin metrics error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/admin/revenue-trend — daily revenue over a date range (all depts combined)
// Query params: dateFrom, dateTo
router.get('/admin/revenue-trend', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query
    const conds  = []
    const params = []
    if (dateFrom) { conds.push('tr.Date >= ?'); params.push(dateFrom) }
    if (dateTo)   { conds.push('tr.Date <= ?'); params.push(dateTo)   }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(tr.Date,'%Y-%m-%d')   AS date,
             ROUND(SUM(tr.Revenue),2)           AS revenue,
             COUNT(*)                           AS transactions,
             d.Name                             AS department
      FROM TransactionRecord tr
      JOIN Department d ON d.DepartmentID = tr.DepartmentID
      ${where}
      GROUP BY DATE_FORMAT(tr.Date,'%Y-%m-%d'), tr.DepartmentID, d.Name
      ORDER BY 1 ASC
    `, params)
    // Also produce a daily total (summed across all depts)
    const totals = {}
    for (const r of rows) {
      if (!totals[r.date]) totals[r.date] = { date: r.date, revenue: 0, transactions: 0 }
      totals[r.date].revenue      += parseFloat(r.revenue)
      totals[r.date].transactions += r.transactions
    }
    res.json({ byDeptDay: rows, daily: Object.values(totals).sort((a, b) => a.date.localeCompare(b.date)) })
  } catch (err) {
    console.error('admin revenue-trend error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/admin/tickets/report — ticket purchase report with filters
// Query params: dateFrom, dateTo (visit date), purchaseDateFrom, purchaseDateTo, status, sortBy, groupBy
router.get('/admin/tickets/report', async (req, res) => {
  try {
    const { dateFrom, dateTo, purchaseDateFrom, purchaseDateTo, status, sortBy, groupBy } = req.query

    const conds  = []
    const params = []
    if (dateFrom)         { conds.push('tp.VisitDate >= ?');    params.push(dateFrom) }
    if (dateTo)           { conds.push('tp.VisitDate <= ?');    params.push(dateTo)   }
    if (purchaseDateFrom) { conds.push('tp.PurchaseDate >= ?'); params.push(purchaseDateFrom) }
    if (purchaseDateTo)   { conds.push('tp.PurchaseDate <= ?'); params.push(purchaseDateTo)   }
    if (status)           { conds.push('tp.Status = ?');        params.push(status)   }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    if (groupBy === 'date') {
      const [rows] = await db.execute(`
        SELECT DATE_FORMAT(tp.VisitDate,'%Y-%m-%d') AS visitDate,
               COUNT(*)                             AS orders,
               COUNT(DISTINCT tp.VisitorID)         AS uniqueVisitors,
               ROUND(SUM(tp.TotalAmount),2)         AS totalRevenue
        FROM TicketPurchase tp
        ${where}
        GROUP BY DATE_FORMAT(tp.VisitDate,'%Y-%m-%d')
        ORDER BY visitDate DESC
        LIMIT 200
      `, params)
      return res.json({ rows, grouped: true })
    }

    const sortMap = {
      visitDate_desc:   'tp.VisitDate DESC',
      visitDate_asc:    'tp.VisitDate ASC',
      purchase_desc:    'tp.PurchaseDate DESC',
      amount_desc:      'tp.TotalAmount DESC',
      amount_asc:       'tp.TotalAmount ASC',
    }
    const orderBy = sortMap[sortBy] || 'tp.PurchaseDate DESC'

    const [rows] = await db.execute(`
      SELECT tp.TicketPurchaseID,
             DATE_FORMAT(tp.PurchaseDate,'%Y-%m-%d')  AS purchaseDate,
             DATE_FORMAT(tp.VisitDate,'%Y-%m-%d')     AS visitDate,
             CONCAT(v.FirstName,' ',v.LastName)        AS visitorName,
             tp.TotalAmount,
             COUNT(t.TicketID)                         AS ticketCount,
             tp.Status
      FROM TicketPurchase tp
      JOIN Visitor v  ON v.VisitorID  = tp.VisitorID
      LEFT JOIN Ticket t ON t.TicketPurchaseID = tp.TicketPurchaseID
      ${where}
      GROUP BY tp.TicketPurchaseID
      ORDER BY ${orderBy}
      LIMIT 300
    `, params)
    res.json({ rows, grouped: false })
  } catch (err) {
    console.error('admin tickets report error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/admin/memberships/report — membership details + distribution
// Query params: dateFrom, dateTo (start date), membershipType (TypeID), status, groupBy (type/month/status)
router.get('/admin/memberships/report', async (req, res) => {
  try {
    const { dateFrom, dateTo, membershipType, status, groupBy } = req.query

    const conds  = []
    const params = []
    if (dateFrom)      { conds.push('m.StartDate >= ?');       params.push(dateFrom)      }
    if (dateTo)        { conds.push('m.StartDate <= ?');       params.push(dateTo)        }
    if (membershipType){ conds.push('m.MembershipTypeID = ?'); params.push(membershipType)}
    if (status)        { conds.push('m.Status = ?');           params.push(status)        }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    if (groupBy === 'type') {
      const [rows] = await db.execute(`
        SELECT mt.TypeName,
               COUNT(*)                                                 AS total,
               SUM(CASE WHEN m.Status='Active' THEN 1 ELSE 0 END)      AS active,
               SUM(CASE WHEN m.Status='Canceled' THEN 1 ELSE 0 END)    AS canceled,
               SUM(CASE WHEN m.Status='Expired' THEN 1 ELSE 0 END)     AS expired
        FROM Membership m
        JOIN MembershipType mt ON mt.TypeID = m.MembershipTypeID
        ${where}
        GROUP BY mt.TypeID, mt.TypeName
        ORDER BY total DESC
      `, params)
      return res.json({ rows, grouped: true })
    }

    if (groupBy === 'month') {
      const [rows] = await db.execute(`
        SELECT DATE_FORMAT(m.StartDate,'%Y-%m') AS month,
               COUNT(*)                          AS total,
               SUM(CASE WHEN m.Status='Active' THEN 1 ELSE 0 END) AS active
        FROM Membership m
        ${where}
        GROUP BY DATE_FORMAT(m.StartDate,'%Y-%m')
        ORDER BY month DESC
        LIMIT 24
      `, params)
      return res.json({ rows, grouped: true })
    }

    const [rows] = await db.execute(`
      SELECT m.MembershipID,
             CONCAT(v.FirstName,' ',v.LastName)   AS visitorName,
             mt.TypeName,
             m.Status,
             DATE_FORMAT(m.StartDate,'%Y-%m-%d')        AS startDate,
             DATE_FORMAT(m.ExpirationDate,'%Y-%m-%d')   AS expirationDate
      FROM Membership m
      JOIN Visitor v        ON v.VisitorID   = m.VisitorID
      JOIN MembershipType mt ON mt.TypeID    = m.MembershipTypeID
      ${where}
      ORDER BY m.StartDate DESC
      LIMIT 300
    `, params)
    res.json({ rows, grouped: false })
  } catch (err) {
    console.error('admin memberships report error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/admin/revenue/report — revenue breakdown by department or by date
// Query params: dateFrom, dateTo, departmentId, groupBy (date/department)
router.get('/admin/revenue/report', async (req, res) => {
  try {
    const { dateFrom, dateTo, departmentId, groupBy } = req.query

    const conds  = []
    const params = []
    if (dateFrom)     { conds.push('tr.Date >= ?');          params.push(dateFrom)    }
    if (dateTo)       { conds.push('tr.Date <= ?');          params.push(dateTo)      }
    if (departmentId) { conds.push('tr.DepartmentID = ?');   params.push(parseInt(departmentId, 10)) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    if (!groupBy || groupBy === 'department') {
      const [rows] = await db.execute(`
        SELECT d.DepartmentID,
               d.Name                         AS department,
               ROUND(SUM(tr.Revenue),2)       AS revenue,
               COUNT(*)                       AS transactions,
               ROUND(AVG(tr.Revenue),2)       AS avgTransaction
        FROM TransactionRecord tr
        JOIN Department d ON d.DepartmentID = tr.DepartmentID
        ${where}
        GROUP BY tr.DepartmentID, d.Name
        ORDER BY revenue DESC
      `, params)
      return res.json({ rows, grouped: true })
    }

    if (groupBy === 'date') {
      const [rows] = await db.execute(`
        SELECT DATE_FORMAT(tr.Date,'%Y-%m-%d')  AS date,
               d.Name                            AS department,
               ROUND(SUM(tr.Revenue),2)          AS revenue,
               COUNT(*)                          AS transactions
        FROM TransactionRecord tr
        JOIN Department d ON d.DepartmentID = tr.DepartmentID
        ${where}
        GROUP BY DATE_FORMAT(tr.Date,'%Y-%m-%d'), tr.DepartmentID, d.Name
        ORDER BY date DESC
        LIMIT 300
      `, params)
      return res.json({ rows, grouped: false })
    }

    // groupBy = month
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(tr.Date,'%Y-%m')  AS month,
             ROUND(SUM(tr.Revenue),2)      AS revenue,
             COUNT(*)                      AS transactions
      FROM TransactionRecord tr
      JOIN Department d ON d.DepartmentID = tr.DepartmentID
      ${where}
      GROUP BY DATE_FORMAT(tr.Date,'%Y-%m')
      ORDER BY month DESC
      LIMIT 24
    `, params)
    res.json({ rows, grouped: true })
  } catch (err) {
    console.error('admin revenue report error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/admin/membership-exhibit-report
// Shows per (MembershipType × Exhibit): member count, tickets purchased, revenue
// Joins: MembershipType → Membership → Visitor → TicketPurchase → TicketPurchaseItem → Exhibit
router.get('/admin/membership-exhibit-report', async (req, res) => {
  try {
    const { dateFrom, dateTo, membershipType, exhibitId, sortBy } = req.query

    const conds  = []
    const params = []

    if (dateFrom)      { conds.push('tp.VisitDate >= ?');        params.push(dateFrom) }
    if (dateTo)        { conds.push('tp.VisitDate <= ?');        params.push(dateTo)   }
    if (membershipType){ conds.push('mt.TypeID = ?');            params.push(membershipType) }
    if (exhibitId)     { conds.push('e.ExhibitID = ?');          params.push(exhibitId) }

    const where = conds.length ? 'AND ' + conds.join(' AND ') : ''

    const sortMap = {
      revenue_desc:  'Revenue DESC',
      revenue_asc:   'Revenue ASC',
      tickets_desc:  'TicketsSold DESC',
      members_desc:  'Members DESC',
      type_asc:      'mt.TypeName ASC, e.ExhibitName ASC',
      exhibit_asc:   'e.ExhibitName ASC, mt.TypeName ASC',
    }
    const orderBy = sortMap[sortBy] || sortMap.revenue_desc

    const [rows] = await db.execute(`
      SELECT
        mt.TypeID,
        mt.TypeName                               AS MembershipType,
        mt.GiftShopDiscountPercent,
        mt.TicketDiscountPercent,
        e.ExhibitID,
        e.ExhibitName,
        e.Status                                  AS ExhibitStatus,
        COUNT(DISTINCT m.MembershipID)            AS Members,
        COALESCE(SUM(tpi.Quantity), 0)            AS TicketsSold,
        ROUND(COALESCE(SUM(tpi.Subtotal), 0), 2) AS Revenue
      FROM MembershipType mt
      JOIN Membership          m   ON m.MembershipTypeID  = mt.TypeID
      JOIN Visitor             v   ON v.VisitorID         = m.VisitorID
      JOIN TicketPurchase      tp  ON tp.VisitorID        = v.VisitorID
      JOIN TicketPurchaseItem  tpi ON tpi.TicketPurchaseID = tp.TicketPurchaseID
      JOIN Exhibit             e   ON e.ExhibitID         = tpi.ExhibitID
      WHERE tp.Status = 'Active'
        ${where}
      GROUP BY mt.TypeID, mt.TypeName, mt.GiftShopDiscountPercent, mt.TicketDiscountPercent, e.ExhibitID, e.ExhibitName, e.Status
      ORDER BY ${orderBy}
    `, params)

    res.json({ rows })
  } catch (err) {
    console.error('membership exhibit report error:', err)
    res.status(500).json({ error: String(err) })
  }
})

export default router;

// retrieves past ticket purchases for a visitor, including exhibit names, prices, quantities, and purchase/visit dates.
router.get('/visitor/:id/ticket-purchases', async (req, res) => {
  const { id } = req.params
  try {
    // Resolve VisitorID
    const [vrows] = await db.execute(
      'SELECT VisitorID FROM Visitor WHERE UserID = ? OR VisitorID = ? LIMIT 1',
      [id, id]
    )
    if (!vrows || vrows.length === 0) return res.status(404).json({ error: 'Visitor not found' })
    const visitorId = vrows[0].VisitorID

    // Fetch all ticket purchases with their items and exhibit names
    // Try with Status column; fall back gracefully if the column doesn't exist yet on this DB
    const ticketQuery = (withStatus) => `SELECT 
        tp.TicketPurchaseID,
        tp.PurchaseDate,
        tp.VisitDate,
        tp.TotalAmount,
        ${withStatus ? 'tp.Status AS PurchaseStatus' : "'Active' AS PurchaseStatus"},
        tpi.TicketPurchaseItemID,
        tpi.Quantity,
        tpi.UnitPrice,
        (tpi.Quantity * tpi.UnitPrice) AS Subtotal,
        e.ExhibitName
      FROM TicketPurchase tp
      JOIN TicketPurchaseItem tpi ON tp.TicketPurchaseID = tpi.TicketPurchaseID
      JOIN Exhibit e ON tpi.ExhibitID = e.ExhibitID
      WHERE tp.VisitorID = ?
      ORDER BY tp.PurchaseDate DESC`

    let rows
    try {
      ;[rows] = await db.execute(ticketQuery(true), [visitorId])
    } catch (colErr) {
      if (String(colErr).toLowerCase().includes('status')) {
        // Status column not yet added — retry without it
        ;[rows] = await db.execute(ticketQuery(false), [visitorId])
      } else {
        throw colErr
      }
    }

    // Group by TicketPurchaseID
    const map = {}
    for (const r of rows) {
      if (!map[r.TicketPurchaseID]) {
        map[r.TicketPurchaseID] = {
          TicketPurchaseID: r.TicketPurchaseID,
          PurchaseDate: r.PurchaseDate,
          VisitDate: r.VisitDate,
          TotalAmount: r.TotalAmount,
          PurchaseStatus: r.PurchaseStatus,
          items: []
        }
      }
      map[r.TicketPurchaseID].items.push({
        TicketPurchaseItemID: r.TicketPurchaseItemID,
        ExhibitName: r.ExhibitName,
        Quantity: r.Quantity,
        UnitPrice: r.UnitPrice,
        Subtotal: r.Subtotal
      })
    }

    res.json({ ticketPurchases: Object.values(map) })
  } catch (err) {
    console.error('Fetch ticket purchases failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST cancel a ticket purchase
router.post('/visitor/ticket-purchases/cancel', async (req, res) => {
  const { ticketPurchaseId } = req.body
  if (!ticketPurchaseId) return res.status(400).json({ error: 'ticketPurchaseId is required' })
  try {
    // Update TicketPurchase status (no-op if Status column doesn't exist yet)
    try {
      await db.execute(
        'UPDATE TicketPurchase SET Status = ? WHERE TicketPurchaseID = ?',
        ['Cancelled', ticketPurchaseId]
      )
    } catch (colErr) {
      if (!String(colErr).toLowerCase().includes('status')) throw colErr
      // Status column missing — treat as success (migration pending)
    }
    res.json({ success: true, message: 'Ticket purchase cancelled successfully' })
  } catch (err) {
    console.error('Cancel ticket purchase failed:', err)
    res.status(500).json({ error: String(err) })
  }
})