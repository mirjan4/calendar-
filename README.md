# Markaz Student Registration & Calendar Distribution System

A full-stack, responsive, database-driven student registration and calendar distribution management system inspired by `https://fr.markaz.in/`, designed for **Jamia Markaz**.

---

## Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS 3, React Router 6, Lucide React, Recharts
- **Backend**: Node.js 22, Express.js 4, REST API
- **Database**: MySQL 8.x / MariaDB 10.4+ (InnoDB engine with row-level locks and transactions)
- **Database Driver**: `mysql2/promise` with connection pooling
- **Authentication & Security**: JWT (JSON Web Tokens), `bcryptjs` password hashing, Helmet, Express Rate Limiting
- **File Upload & Processing**: Multer, ExcelJS (for .xlsx parsing & streaming exports), `csv-parser`

---

## Key Features

### 1. Public Registration Portal
- **Automatic Dual-Identifier Student Lookup**:
  - Search by **Admission Number** or **Registration Number** (e.g., `1602`).
  - Fetches student master record from MySQL: `SL`, `CLASS`, `HN`, `REG`, `CANDIDATE NAME`, `PLACE`, `MOBILE`.
  - Displays verified student information card.
  - Automatically prevents duplicate submissions if already registered.
- **Inside Kerala Registration Workflow**:
  - Four-tier dynamic hierarchy: **District → Zone → Circle → Unit**.
  - Checkbox groups with real-time in-box text filtering and scrolling.
  - Distinct styling:
    - District background: `#CCE1F2`
    - Zone background: `#CCE1F2`
    - Circle background: `#CCE1F2`
    - Unit background: `#FBF7D5`
  - **Strict Unit Concurrency Rule**:
    - Each unit can be assigned to only one student at a time.
    - Active confirmed units are hidden from the available selection list.
    - MySQL transactions with row-level locking (`FOR UPDATE`) prevent race conditions under concurrent submissions.
    - If another student claims a unit concurrently, returns:
      `"This unit has already been selected by another student. Please select another available unit."`
  - Fixed quota indicator: 100 Calendars (*"ഓരോ വിദ്യാർത്ഥിക്കും 100 കലണ്ടർ ലഭിക്കും."*).
  - Mandatory confirmation checkbox: *"Complete and make sure all details before submit"*
- **Outside Kerala Registration Workflow**:
  - Preserves original form fields: **State** (dropdown with all Indian States & UTs), **District** (text input), **Zone** (text input), **Circle** (text input), **Unit** (text input).
  - Text input entry without imposing Kerala's checkbox hierarchy.
- **Printable Registration Slip**:
  - Displays verified Student Registration Number (`REG`) and Admission Number.
  - Printable acknowledgment receipt for calendar collection.

### 2. Admin Console & Security
- **Authentication**:
  - Secure bcrypt password verification and JWT token issuance.
  - Rate limiting on login attempts and lookup endpoints.
  - Server-side role authorization (`super_admin`, `admin`).
- **Dashboard**:
  - 8 KPI summary cards: Total Students, Total Registrations, Pending, Completed, Inside Kerala, Outside Kerala, Assigned Units, Available Units.
  - Interactive Recharts: Registrations by Class, Category Pie Chart, Daily Trends, Unit Availability by District.
- **Student Master Management (with Integrated Excel & CSV Import Engine)**:
  - **Students Directory**: Server-side pagination, search by reg/admn/name/mobile, filter by class/place/status, Add/Edit student modals, Active/Inactive toggle.
  - **Integrated Import Engine**: Seamlessly embedded within Student Master Management (avoided in the sidebar) with tab-based navigation.
    - Upload `.xlsx`, `.xls`, or `.csv` files (up to 15MB).
    - Automatic column mapping for `SL`, `CLASS`, `HN`, `REG`, `CANDIDATE NAME`, `PLACE`, `MOBILE`.
    - Comprehensive pre-import validation: duplicate detection, mobile format validation, missing fields.
    - 3 Import Modes: *Insert New Students Only*, *Update Existing Students Only*, and *Insert New & Update Existing Students*.
    - Transaction-safe database execution with detailed summary report and one-click transition back to the updated directory.
    - Download rejected rows with specific error reasons in Excel format.
- **Location & Unit Management**:
  - Full CRUD management for Districts, Zones, Circles, and Units.
  - View unit status (Available vs. Claimed with assigned student).
- **Place Management (Combined Unified View)**:
  - ONE combined table displaying **District**, **Zone**, **Circle**, **Unit**, and **Assigned Student Name**.
  - Dynamic SQL `LEFT JOIN` linking `units`, `circles`, `zones`, `districts`, `unit_assignments` (`status = 'active'`), and `students`.
  - Displays actual assigned student from `students` master table, or `"Unassigned"` when available.
  - Multi-criteria live search across unit, circle, zone, district, student name, and reg no.
  - Cascading location dropdown filters (District → Zone → Circle) and status filter (All, Assigned, Unassigned).
  - Bidirectional column sorting, pagination controls, CSV export, and instant assignment release modal.
- **Unit Assignment Management**:
  - Full assignment history tracking.
  - **Release Unit Assignment**: Authorizes admins to release a unit with mandatory justification reason, returning it to the available pool.
- **Institutional Reports & Exports**:
  - 16 report views (Student List, Overall Registrations, Inside Kerala, Outside Kerala, Unit Assignments, Available Units, Class-wise, District-wise, etc.).
  - One-click streaming export to **Excel (.xlsx)** via ExcelJS, **CSV**, or **Print View**.

---

## Project Structure

```
c:/xampp/htdocs/calendar/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection pool & env config
│   │   ├── controllers/     # Business logic & transaction handling
│   │   ├── middleware/      # Auth, rate limiters, upload, error handling
│   │   ├── routes/          # REST API endpoints
│   │   ├── app.js           # Express app setup & CORS
│   │   └── server.js        # Server bootstrapper
│   ├── tests/
│   │   └── unit_tests.js    # Automated test suite (11 test suites)
│   ├── uploads/
│   │   └── imports/         # Temporary uploaded spreadsheets
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/         # AuthContext
│   │   ├── layouts/         # PublicLayout & AdminLayout
│   │   ├── pages/
│   │   │   ├── public/      # HomePage, RegistrationPage, ConfirmationPage
│   │   │   └── admin/       # Dashboard, Students, Import, Registrations,
│   │   │                    # Locations, Places, UnitAssignments, Reports
│   │   ├── services/        # Axios API client
│   │   ├── App.jsx          # React Router route registry
│   │   ├── main.jsx         # React root
│   │   └── index.css        # Tailwind design system & print styles
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── database/
│   ├── database.sql         # MySQL 8 schema with InnoDB constraints & indexes
│   └── seed.sql             # Sample students, admin, locations, and units
├── sample_data/
│   └── sample_students.csv  # Sample student spreadsheet for testing import
└── README.md
```

---

## Local Installation & Setup

### Prerequisites
1. **Node.js** (v18+ or v22 LTS recommended)
2. **XAMPP** (or MySQL 8.0+ server running on port 3306)

---

### Step 1: Database Initialization
1. Ensure MySQL is running in XAMPP on port 3306.
2. Open terminal in the workspace and load the schema and seed data:
```powershell
# Import Database Schema
Get-Content database\database.sql | & "C:\xampp\mysql\bin\mysql.exe" -h 127.0.0.1 -u root

# Import Seed Data (Admin account, Kerala locations, sample students)
Get-Content database\seed.sql | & "C:\xampp\mysql\bin\mysql.exe" -h 127.0.0.1 -u root
```

---

### Step 2: Configure & Start Backend
1. Navigate to the `backend/` directory:
```bash
cd backend
```
2. Verify `.env` configuration (created automatically):
```ini
PORT=5000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=markaz_calendar
JWT_SECRET=super_secret_jwt_key_32chars
CLIENT_URL=http://localhost:5173
```
3. Run the automated test suite to verify everything:
```bash
npm test
```
4. Start the backend development server:
```bash
npm run dev
# Server running at http://localhost:5000
```

---

### Step 3: Configure & Start Frontend
1. In a separate terminal, navigate to `frontend/`:
```bash
cd frontend
```
2. Start the Vite development server:
```bash
npm run dev
# Vite server running at http://localhost:5173
```
3. Open your browser and navigate to:
```
http://localhost:5173
```

---

## Default Administrator Credentials

- **URL**: `http://localhost:5173/admin/login`
- **Username**: `admin`
- **Password**: `admin123`

---

## Sample Testing Scenarios

### Scenario 1: Student Search & Verification
1. Navigate to `http://localhost:5173/register`.
2. Enter Admission Number / Registration Number: `1602`.
3. Click **Search Student**.
4. The system retrieves and displays **JAMALUDDEEN ABDUL HAMEED**, Class: **THQ**, Place: **MANI**, Mobile: **9632679895**.

### Scenario 2: Inside Kerala Checkbox Selection
1. Select **Inside Kerala**.
2. Select **Kozhikode** from District checkbox group.
3. Select **Feroke** from Zone checkbox group.
4. Select **Feroke Town** from Circle checkbox group.
5. Notice that Unit **1 (Feroke Petta)** is not listed under available units because it was already confirmed by student 1600.
6. Select an available unit (e.g., **Chungam**).
7. Check *"Complete and make sure all details before submit"*.
8. Click **Submit Registration**.
9. The registration acknowledgment slip is generated displaying the verified student registration details and allotted unit.

### Scenario 3: Concurrency Protection Test
- If two students attempt to submit for the same unit simultaneously, MySQL row-level lock (`FOR UPDATE`) immediately rejects the second request with HTTP 409 Conflict:
  *"This unit has already been selected by another student. Please select another available unit."*

### Scenario 4: Outside Kerala Text Input Registration
1. Navigate to `http://localhost:5173/register?type=outside_kerala`.
2. Enter student `1603`.
3. Select State: `Karnataka`.
4. Type District: `Dakshina Kannada`, Zone: `Mangalore`, Circle: `Ullal`, Unit: `Kotekar`.
5. Check confirmation and submit.

### Scenario 5: Excel / CSV Student Import
1. Log in to Admin Portal (`/admin/login`).
2. Go to **Excel & CSV Import**.
3. Select `sample_data/sample_students.csv`.
4. Click **Preview Spreadsheet** to review validated rows and duplicate analysis.
5. Select **Insert New & Update Existing**.
6. Check authorization box and click **Execute Safe Import**.
7. The new students are safely imported within a database transaction.


---

## Production Deployment & Backup

### Production Build
```bash
# Build frontend bundle
cd frontend
npm run build
# Output generated in frontend/dist/
```

### Database Backup
```powershell
# Create SQL dump of database and data
& "C:\xampp\mysql\bin\mysqldump.exe" -h 127.0.0.1 -u root markaz_calendar > "C:\xampp\htdocs\calendar\backup_markaz_calendar.sql"
```

### Database Restore
```powershell
Get-Content backup_markaz_calendar.sql | & "C:\xampp\mysql\bin\mysql.exe" -h 127.0.0.1 -u root markaz_calendar
```
