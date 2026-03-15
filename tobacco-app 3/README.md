# 🌿 Elite Tobacco – Buying Management System

A full-stack web application for managing tobacco buying operations.  
**React + Vite** frontend · **Node.js + Express** backend · **MySQL** database

---

## 📦 Prerequisites

Make sure you have these installed:

- **Node.js** v18 or later → https://nodejs.org
- **VS Code** (recommended) → https://code.visualstudio.com
- **Git** (optional)

---

## 🚀 Quick Start

### 1. Open in VS Code

```
File → Open Folder → select the `tobacco-app` folder
```

### 2. Open the Terminal in VS Code

```
Terminal → New Terminal   (or Ctrl + `)
```

### 3. Install dependencies

```bash
npm install
```

> ⚠️ This installs React, Vite, Express, mysql2, dotenv and all other packages.
> First install may take 1–2 minutes.

### 4. Run the app

```bash
npm run dev
```

This starts **two servers** at once:
- 🌐 Frontend (React):  http://localhost:5173
- 🔧 Backend (Express): http://localhost:3001

Open **http://localhost:5173** in your browser.

---

## 🔑 Login Credentials

| Role  | Username / Code | Password  |
|-------|-----------------|-----------|
| Admin | `admin`         | `admin123`|
| Buyer | `B001`          | `B001`    |
| Buyer | `B002`          | `B002`    |
| Buyer | `B003`          | `B003`    |

---

## 🗄️ Database

Backend uses **MySQL** connection parameters from environment variables.

Use `.env.example` (copy to `.env`) or `server/database.properties` as key-value reference:

```properties
DB_HOST=194.238.17.174
DB_PORT=3306
DB_USER=eliteTadmin
DB_PASSWORD=<your-password>
DB_NAME=EliteTobacco
DB_CONNECTION_LIMIT=10
DB_AUTO_CREATE=false
DB_CLEAN_SETUP=false
```

`DB_CLEAN_SETUP=true` will truncate core tables on startup and reseed defaults.

### Tables

| Table      | Description                        |
|------------|------------------------------------|
| `buyers`   | Buyer accounts and login credentials|
| `qr_codes` | QR codes with buyer assignments    |
| `bags`     | All bag purchase records           |

### View the database

**Option A – In the app** (Admin login → 🗄️ Database tab):
- Browse any table with full data
- Run custom SELECT queries
- Quick query buttons for common reports

**Option B – SQL client / extension**:
1. Connect to MySQL using your DB env values
2. Open schema `DB_NAME`
3. Browse and run read-only queries

---

## 📁 Project Structure

```
tobacco-app/
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies & scripts
│
├── server/
│   ├── index.js                # Express API server
│   ├── start.js                # Loads .env then starts server
│   └── database.properties     # Key-value DB config reference
│
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # Root component
    ├── api.js                  # All API calls
    ├── styles.js               # Shared styles
    ├── index.css               # Global CSS
    │
    ├── components/
    │   ├── LoginPage.jsx       # Login screen
    │   ├── BuyingForm.jsx      # Bag entry form (buyer)
    │   ├── BuyerDashboard.jsx  # Buyer portal
    │   ├── AdminDashboard.jsx  # Admin portal
    │   ├── DatabaseViewer.jsx  # Live DB browser
    │   └── QRCode.jsx          # QR code renderer
    │
    └── utils/
        ├── printQR.js          # Print QR sheet
        └── exportCSV.js        # CSV export
```

---

## ✨ Features

### Buyer Portal
- ✅ Login with buyer code + password
- ✅ Enter bag data (FCV/NON-FCV, unique code, APF, weight, grade, date, location)
- ✅ Scan QR code or enter manually
- ✅ FCV toggle — both enabled first, disables other after selection
- ✅ Date & location carry over between bags
- ✅ View all saved bags in table
- ✅ Export bags to CSV (opens in Excel)
- ✅ View assigned QR codes with status
- ✅ Print QR code sheet (A4, 4 per row)

### Admin Portal
- ✅ Overview dashboard with stats
- ✅ Add new buyers
- ✅ Generate QR codes (batch, assign to buyer)
- ✅ View all QR codes with buyer assignments
- ✅ Print QR sheets
- ✅ View all bags across all buyers
- ✅ Export all bags to CSV
- ✅ **Live database viewer** — browse tables, run custom SELECT queries

---

## 🛠️ Available Scripts

| Command         | Description                        |
|-----------------|------------------------------------|
| `npm run dev`   | Start both frontend + backend      |
| `npm run client`| Start frontend only (port 5173)    |
| `npm run server`| Start backend only  (port 3001)    |
| `npm run build` | Build frontend for production      |
| `npm run build:mobile` | Build frontend for mobile mode |
| `npm run cap:sync` | Sync `dist` assets to Android project |
| `npm run cap:open` | Open Android Studio project |
| `npm run android:build` | Build mobile assets + sync Android |

---

## 📱 Mobile Deployment

See complete Android deployment steps in:

`MOBILE_DEPLOYMENT.md`

---

## 🔧 Customisation

### Change admin password
Edit `server/index.js` line:
```js
if (code === 'admin' && password === 'admin123') {
```

### Change default seed data
Edit the seed section in `server/index.js` (buyers and QR codes inserted on first run).

### Add more fields to bag form
1. Add the field to `BuyingForm.jsx`
2. Add the column to `bags` table in `server/index.js`
3. Add it to the `POST /api/bags` handler

---

## 📞 Support

For issues or questions, check the console output in VS Code terminal.  
Backend logs every SQL query — useful for debugging.
