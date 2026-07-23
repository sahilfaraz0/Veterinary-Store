# 🐾 Veterinary Store & Clinic - POS Management System

![License: Proprietary](https://img.shields.io/badge/License-Proprietary%20(Portfolio)-emerald.svg)
![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-0284c7.svg)
![Deployment: Vercel](https://img.shields.io/badge/Deployment-Vercel-black.svg)
![Tech: Vanilla JS / Tailwind / Supabase](https://img.shields.io/badge/Tech-Vanilla%20JS%20%7C%20Tailwind%20%7C%20Supabase-3b82f6.svg)

**Veterinary Store & Clinic** is a state-of-the-art, full-stack Point of Sale (POS) and Veterinary Clinic Management Single-Page Application (SPA). Engineered with a stunning **Liquid Glassmorphism UI**, offline-first Progressive Web App (PWA) resilience, and cloud database synchronization, this platform streamlines high-speed retail checkout, inventory tracking, clinical patient relationship management (CRM), and business intelligence.

  👉 **[View Live Application](https://veterinary-store.vercel.app)**
* Email:`admin@vetstore.com`
* Password:`vetstore123`

---

## 📸 System Preview
**Login Welcome Screen**
![Login Welcome](./assets/login.gif)

**Admin Dashboard**

<video src="https://github.com/user-attachments/assets/54b8fa2e-274d-4281-8c99-1bb68b0db524" autoplay loop width="100%"></video>

*(Add a secondary screenshot of the metrics or dashboard)*
![Admin Dashboard](./assets/admin-dashboard.png)

---

## 💻 Tech Stack

* **Frontend Architecture:** Pure Vanilla JavaScript (ES6+ Modular Pattern) with zero heavy framework bloat for maximum performance and instant load times.
* **Styling & Aesthetics:** **Tailwind CSS** paired with custom Vanilla CSS (`style.css`), featuring a responsive **Liquid Glass UI (Glassmorphism)** with rotating, multi-colored light-refracting background shapes (`#liquid-bg`), crisp high-contrast typography, and an interactive macOS/iOS-inspired floating pill navigation dock (`no-scrollbar`).
* **Cloud Database & Backend:** **Supabase PostgreSQL** cloud backend providing real-time data persistence across products, stock batches, multi-item transactions, CRM clients, and audit ledgers.
* **Security & Authorization:** **Row Level Security (RLS)** policies enforced directly at the database tier alongside strict **Role-Based Access Control (RBAC)** separating executive Administrator controls from Cashier checkout operations.
* **Hardware & Hardware-Free Scanning:** Integrated camera-based Barcode & QR Code scanning (`html5-qrcode`) for instant product checkout, plus on-device client-side image compression (`browser-image-compression`).
* **Data Visualization:** High-octane financial and stock charts powered by **Chart.js**.

---

## ✨ Key Features

### 1. Offline Service Worker & PWA Capabilities (`sw.js`)
* **True Offline-First Operation:** Designed for veterinary clinics requiring uninterrupted checkout capabilities during internet outages. The custom Service Worker caches static assets, product tables, and core UI files.
* **Local State Synchronization:** If cloud connectivity is temporarily lost, transactions and stock adjustments fall back cleanly to persistent local state (`appState` + `localStorage`), automatically keeping the clinic operational.

### 2. Role-Based Access Control (Admin vs. Cashier)
* **Administrator Tier (`Admin`):** Unlocks the executive Control Center, full inventory CRUD (with batch-level expiry date tracking and supplier management), staff account creation, system-wide audit logs, financial reports (`Chart.js`), and stock loss/wastage reporting.
* **Cashier Tier (`Cashier`):** Optimized for high-speed counter operations. Cashiers access the interactive POS Register, live product search, barcode scanner, and customer lookup without administrative clutter or sensitive financial settings.

### 3. Transactional Stock Reversal & Batch Tracking Logic
* **FIFO Batch Depletion:** When a POS checkout is completed, the SQL database (`process_pos_checkout`) and local state dynamically deduct quantities from active stock batches ordered by expiration date (First-In-First-Out).
* **Stock Reversal & Audit Accountability:** Every transaction is logged with itemized unit costs, profit margins, and cashier IDs. Any manual adjustments or stock losses (`expired`, `damaged`, `theft`) trigger immediate inventory reconciliation and leave immutable trace records in the System Audit Log (`#btn-header-audit`).

### 4. Liquid Glassmorphism & macOS/iOS Floating Dock
* **Dynamic Refraction:** Softly blurred shapes rotate slowly behind frosted glass panels, casting vibrant gradients through translucent cards.
* **Zero-Clip Floating Dock:** Bottom-anchored pill navigation dock (`#floating-dock`) with responsive `w-fit justify-start` alignment, guaranteeing zero left-side clipping on mid-sized screens while enabling smooth horizontal swipe navigation.
* **High-Contrast Dark / Light Themes:** Crisp contrast ratios preserved across both deep slate dark mode and bright crystal light mode with instant theme toggling.

---

## 🗂️ Project Structure & Static Deployment (Vercel)

The repository is organized with a clean, flat architecture tailored for instant static hosting on **Vercel** (`vercel.json` included):

```text
├── index.html            # Single-Page Application Root View
├── login.html            # Dedicated Security & Portal Authentication View
├── vercel.json           # Vercel SPA Routing Rewrites & Static Caching Headers
├── sw.js                 # Offline Progressive Web App (PWA) Service Worker
├── manifest.json         # PWA Manifest & Mobile Installation Config
├── assets/
│   └── login.gif         # Welcome Screen and Login Form
├── css/
│   ├── style.css         # Liquid Glassmorphism Tokens & Responsive Layout Utilities
│   └── print.css         # Clean Invoice & Receipt Print Styles
├── js/
│   ├── app.js            # Core App Lifecycle, SPA Navigation & Modal Handlers
│   ├── config.js         # Supabase Client Initialization, State & Utility Functions
│   ├── auth.js           # RBAC Authentication, Session Management & Passwordless Fallbacks
│   ├── login.js          # Dedicated Authentication Portal Handlers & Password Toggling
│   ├── pos.js            # Interactive POS Register & Dynamic Checkout Engine
│   ├── inventory.js      # Product Catalog & Batch Management CRUD
│   ├── dashboard.js      # Executive Metrics, Alert Cards & Activity Feeds
│   ├── sales.js          # Transaction Ledger, Audit History & Receipt Export
│   ├── reports.js        # Financial & Analytics Visualizations (Chart.js)
│   ├── admin.js          # Control Center, Staff Accounts & Security Audit Logs
│   └── scanner.js        # Camera Barcode/QR Code Reader Integration
└── sql/
    ├── schema.sql        # Supabase PostgreSQL Tables, Functions, Triggers & RLS Policies
    └── seed_data.sql     # Generic Sanitized Demonstration Seed Records
