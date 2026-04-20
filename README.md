# City Museum Management System

A full-stack web application for managing a city museum — including exhibits, tickets, memberships, a gift shop, and role-based staff portals. Built as a group project for COSC 3380.

## Live Demo

Deployed on Vercel: https://museum-project-umber.vercel.app/

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 19, React Router 6, Vite 7 |
| Backend   | Node.js                           |
| Database  | MySQL 8.0                         |
| Auth      | bcryptjs (hashed passwords)       |
| Hosting   | Vercel (frontend + serverless) Render (backend) AWS (database)    |

## Features

### Visitor-Facing
- **Home page** with hero section and quick links
- **Exhibits gallery** — 3 permanent exhibits (Space, Natural History, Ancient Civilizations) plus dynamic curator-created exhibits
- **Exhibit detail pages** with live artifact galleries pulled from the database
- **Ticket purchasing** — select exhibits, pick a visit date, view capacity, member discounts applied at checkout
- **Membership plans** — purchase or renew memberships with tiered pricing; 20% renewal discount
- **Gift Shop** — browse and purchase museum merchandise
- **Shopping cart** — unified cart for tickets, memberships, and gift shop products
- **Visitor dashboard** — view profile, purchase history, and manage tickets
- **Notifications** — bell icon alerts for membership expiry warnings and ticket reschedule requirements

### Staff Portals
- **Admin Portal** — manage user accounts (CRUD with soft delete), employees, exhibits, and view dashboard analytics
- **Curator Portal** — manage artifacts (add/edit/delete), cancel exhibits for specific dates, filter and paginate artifact lists
- **Gift Shop Manager Portal** — manage products and inventory

### Notification System
- **MySQL triggers:**
  - `MembershipExpiringSoon` — notifies visitors when membership expires within 30 days
  - `ExhibitChangeNotification` — notifies affected ticket holders when an exhibit is cancelled for a date; auto-cancels conflicting tickets
  - `TicketPurchaseStatusSync` — keeps ticket status in sync with purchase status
- **Startup backfill** — catches pre-existing expiring memberships and exhibit conflicts on server boot
- **Auto-dismiss** — notifications are marked as read when the visitor renews their membership or reschedules their tickets

### Backend
- Role-based access control (Admin, Visitor, Curator, Gift Shop Manager)
- Password hashing with bcryptjs
- Soft delete for user accounts (IsActive flag)
- Automatic schema migrations on server startup (adds missing columns, creates tables/triggers)
- Capacity validation for ticket purchases
- Transaction support for ticket rescheduling

## Database Schema

| Table | Description |
|-------|-------------|
| `UserAccount` | Login credentials, role, soft-delete flag |
| `Visitor` | Visitor profile (name, contact, DOB) |
| `Staff` | Employee records linked to departments |
| `Department` | Museum departments |
| `MembershipType` | Membership tiers and pricing |
| `Membership` | Active memberships per visitor |
| `Exhibit` | Exhibits with capacity, status, off-dates |
| `Artifact` | Items within exhibits |
| `TicketPurchase` | Ticket orders with visit date and status |
| `TicketPurchaseItem` | Line items linking purchases to exhibits |
| `Ticket` | Individual issued tickets |
| `Product` | Gift shop products |
| `TransactionRecord` | Gift shop sales |
| `TransactionProduct` | Line items for gift shop transactions |
| `GeneralAdmissionPrices` | Pricing tiers for admissions |
| `DailyGeneralAdmissionPrices` | Date-specific pricing |
| `Notification` | User notifications (expiry, reschedule, etc.) |
| `Gallery` | Physical gallery rooms |
| `Curator` | Curator-gallery assignments |
| `Event` | Special events |

## Project Structure

```
my-app/
├── backend/
│   ├── server.js          # Express server, migrations, triggers
│   ├── db.js              # MySQL connection pool
│   ├── router.js          # Route mounting
│   └── routes/
│       └── auth.js        # All API endpoints
├── frontend/
│   ├── Home/              # Landing page
│   ├── Exhibits/          # Exhibits gallery
│   ├── Tickets/           # Ticket purchasing
│   ├── Membership/        # Membership plans
│   ├── Giftshop/          # Gift shop storefront
│   ├── Cart/              # Shopping cart & checkout
│   ├── Visitor/           # Visitor dashboard
│   ├── Login/             # Login & account creation
│   ├── components/        # Shared components (ProfileMenu, notifications)
│   ├── Portals/
│   │   ├── Admin/         # Admin management portal
│   │   ├── Curator/       # Curator artifact management
│   │   └── GiftShopManager/
│   ├── _SpaceExhibit/     # Space exhibit detail page
│   ├── _NaturalExhibit/   # Natural history detail page
│   └── _AncientExhibit/   # Ancient civilizations detail page
├── database/
│   ├── schema.sql         # Original DB schema
│   └── newschema.sql      # Updated schema with all tables
├── src/
│   ├── App.jsx            # React Router setup
│   ├── AuthContext.jsx     # Auth state provider
│   ├── CartContext.jsx     # Cart state provider
│   ├── api.js             # API base URL helper
│   └── main.jsx           # App entry point
└── public/                # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/3380Project.git
cd 3380Project/my-app
```

### 2. Set up the database
```sql
CREATE DATABASE museum_project;
USE museum_project;
SOURCE database/newschema.sql;
```

### 3. Configure environment variables
Create `my-app/backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=museum_project
```

### 4. Install dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 5. Start the application
```bash
# Terminal 1 — Backend
cd backend
node server.js

# Terminal 2 — Frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:5000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user |
| POST | `/api/register` | Create account |
| GET | `/api/exhibits` | List all exhibits |
| GET | `/api/exhibits/:id` | Exhibit details + artifacts |
| POST | `/api/curator/exhibit` | Create exhibit (curator) |
| PUT | `/api/curator/exhibit/:id` | Update exhibit (curator) |
| POST | `/api/curator/exhibit/:id/cancel` | Cancel exhibit for a date |
| POST | `/api/membership/purchase` | Purchase membership |
| POST | `/api/membership/renew` | Renew membership |
| POST | `/api/membership/cancel` | Cancel membership |
| POST | `/api/tickets/purchase` | Purchase tickets |
| POST | `/api/visitor/ticket-purchases/reschedule` | Reschedule tickets |
| GET | `/api/notifications/:userId` | Get unread notifications |
| POST | `/api/notifications/mark-read` | Dismiss notifications |
| GET | `/api/admin/users` | List users (admin) |
| GET | `/api/admin/dashboard` | Dashboard analytics (admin) |
| GET | `/api/giftshop/products` | List gift shop products |
| POST | `/api/transaction/create` | Gift shop purchase |

## Team

COSC 3380 — University of Houston
