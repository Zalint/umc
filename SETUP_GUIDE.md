# Gambia Election Results Collection System - Setup Guide

## Overview

This is a complete election results collection system with:
- ✅ **Mobile-first responsive design** - Works perfectly on phones, tablets, and desktops
- ✅ **Role-based access control** - Admin, Manager, Member (Level 1/2/3), Reader
- ✅ **Real-time result aggregation** - Station → Constituency → Region → Country
- ✅ **Simple MVC architecture** - Node.js + Express + PostgreSQL + Vanilla JS

## Prerequisites

1. **Node.js** (v14 or higher)
   ```bash
   node --version
   ```

2. **PostgreSQL** (v12 or higher)
   ```bash
   psql --version
   ```

3. **Git** (optional, for version control)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- express
- pg (PostgreSQL client)
- jsonwebtoken (JWT authentication)
- bcryptjs (Password hashing)
- dotenv (Environment variables)

### 2. Configure Database

Create a PostgreSQL database:

```bash
# Using psql command line
createdb gambia_election

# Or using psql shell
psql -U postgres
CREATE DATABASE gambia_election;
\q
```

Update the `.env` file with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gambia_election
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# JWT Secret (IMPORTANT: Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Create Database Schema

Run the SQL schema to create all tables:

```bash
# Option 1: Using psql
psql -U your_username -d gambia_election -f db/schema.sql

# Option 2: Using npm script (if DATABASE_URL is set)
npm run db:schema
```

This creates:
- Users table
- Geographic hierarchy (regions, constituencies, stations)
- Participant categories and participants
- Results table
- Member assignments
- Aggregation views

### 4. Import Data and Create Initial Users

Run the seed script to:
- Import geographic data from CSV
- Create default users
- Create participant categories
- Add sample political parties

```bash
npm run db:seed
```

**Default user accounts created:**
```
Admin:   admin@election.gm (password set during seeding)
Manager: manager@election.gm (password set during seeding)
Member:  member@election.gm (password set during seeding)
Reader:  reader@election.gm / reader123
```

### 5. Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload using nodemon)
npm run dev
```

The server will start on: `http://localhost:3000`

### 6. Access the Application

Open your web browser (or mobile device) and navigate to:
```
http://localhost:3000
```

Or if accessing from a mobile device on the same network:
```
http://your-computer-ip:3000
```

## Mobile Access

### Testing on Mobile Devices

1. **Find your computer's local IP address:**
   
   **Windows:**
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)
   
   **Mac/Linux:**
   ```bash
   ifconfig | grep inet
   ```

2. **Ensure firewall allows connections on port 3000**

3. **Access from mobile browser:**
   ```
   http://192.168.1.100:3000
   ```
   (Replace with your actual IP)

### Mobile-Friendly Features

- ✅ Touch-friendly buttons (minimum 44px tap targets)
- ✅ Responsive tables that convert to cards on mobile
- ✅ Side navigation drawer with overlay
- ✅ Large, readable text and form inputs
- ✅ Optimized for both portrait and landscape orientations
- ✅ Fast loading with no heavy frameworks

## User Roles and Permissions

### 🔴 Admin
- Full access to everything
- Create/manage users
- Create/manage participants and categories
- Assign members to geographic areas
- Submit results for any station
- View all results

### 🟡 Manager
- View all results (aggregated and detailed)
- Submit results for any station
- Cannot manage users or participants

### 🟢 Member (Level 1/2/3)
**Level 1 - Station:** Access to specific station(s)
**Level 2 - Constituency:** Access to all stations in constituency
**Level 3 - Region:** Access to all stations in region

- Submit results only for assigned areas
- View results

### 🔵 Reader
- View-only access to all results
- Cannot submit or modify anything

## Common Operations

### Assigning Members to Geographic Areas

**Example: Assign a member to Banjul Central constituency (Level 2)**

1. Login as admin
2. Navigate to "Users" menu
3. Find the member user
4. Click "Assign" (via API: POST /api/users/:id/assignments)
5. Select:
   - Level: 2 (Constituency)
   - Constituency: Banjul Central

Now this member can submit results for ALL stations under Banjul Central:
- 22nd July Square
- Banjul City Council
- Bethel Church
- Odeon Cinema
- Sam Jack Terrace
- Wellesley Macdonald St. Junc.

### Submitting Results

**As a member:**

1. Login with member credentials
2. Navigate to "Submit Results"
3. Select your assigned station
4. Click "Load Station"
5. Enter vote counts for each participant
6. Click "Submit Results"

Results are immediately available in aggregated views!

### Viewing Aggregated Results

**View national results:**
1. Go to "Dashboard" (shows country-level results)

**View regional/constituency/station results:**
1. Navigate to "View Results"
2. Select level (Country/Region/Constituency/Station)
3. Choose specific area (if applicable)
4. Click "View Results"

See:
- Total votes vs registered voters
- Turnout percentage
- Votes by participant with visual bars
- Reporting progress (stations reported vs total)

### Managing Participants

**Add a new political party (Admin only):**

1. Navigate to "Participants" menu
2. In "Add New Participant" form:
   - Category: Political Party
   - Name: "New Party Name"
   - Short Name: "NPM" (optional)
3. Click "Add Participant"

The new participant will immediately appear in result submission forms.

## API Endpoints Quick Reference

### Authentication
```
POST /api/auth/login
POST /api/auth/register (admin only)
GET  /api/auth/me
```

### Results
```
POST /api/results (submit)
GET  /api/results/country
GET  /api/results/region/:id
GET  /api/results/constituency/:id
GET  /api/results/station/:id
GET  /api/results/my-stations (member)
```

### Geography
```
GET /api/geography/regions
GET /api/geography/constituencies?region_id=X
GET /api/geography/stations?constituency_id=X
```

### Participants
```
GET  /api/participants
POST /api/participants (admin)
GET  /api/participants/categories
POST /api/participants/categories (admin)
```

### Users
```
GET    /api/users (admin/manager)
PUT    /api/users/:id (admin)
DELETE /api/users/:id (admin)
POST   /api/users/:id/assignments (admin)
```

## Troubleshooting

### Database Connection Issues

**Error: "connection refused"**
- Ensure PostgreSQL is running: `pg_ctl status` or check services
- Verify credentials in `.env` file
- Check if PostgreSQL is listening on port 5432

**Error: "database does not exist"**
- Create the database: `createdb gambia_election`

### CSV Import Issues

**No geographic data imported:**
- Ensure `REGRISTRATION DEMOGRAPHICS_STATIC.csv` is in the project root
- Check file permissions
- Verify CSV format (Country, Region, Constituency, Station columns)

### Login Issues

**"Invalid email or password"**
- Verify you're using correct default credentials
- Run seed script again: `npm run db:seed`
- Check users table: `psql gambia_election -c "SELECT email, role FROM users;"`

### Mobile Access Issues

**Can't access from mobile device:**
- Ensure both devices are on same WiFi network
- Check firewall settings
- Try accessing with IP address instead of "localhost"
- Ensure server is running and listening on 0.0.0.0, not 127.0.0.1

### Performance Issues

**Slow aggregation queries:**
- Ensure indexes are created (check schema.sql)
- Consider materialized views for very large datasets
- Check PostgreSQL configuration

## Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Change all default user passwords
- [ ] Use HTTPS (SSL/TLS certificate)
- [ ] Set NODE_ENV=production
- [ ] Use environment variables for all secrets
- [ ] Enable PostgreSQL SSL connection
- [ ] Set up proper firewall rules
- [ ] Regular database backups
- [ ] Implement rate limiting
- [ ] Add CSRF protection for state-changing operations

### Deployment Options

**Option 1: Traditional Server (VPS)**
- Ubuntu/Debian server
- Nginx as reverse proxy
- PM2 for process management
- PostgreSQL installed locally or remote

**Option 2: Cloud Platform**
- Heroku (with Heroku Postgres)
- DigitalOcean App Platform
- AWS (EC2 + RDS)
- Google Cloud Platform

**Option 3: Containerized (Docker)**
- Create Dockerfile
- Use Docker Compose for multi-container setup
- Deploy to Kubernetes or Docker Swarm

## Support and Maintenance

### Database Backup

```bash
# Backup
pg_dump gambia_election > backup_$(date +%Y%m%d).sql

# Restore
psql gambia_election < backup_YYYYMMDD.sql
```

### Logs

Application logs are printed to console. In production, redirect to file:

```bash
npm start > logs/app.log 2>&1
```

### Updating Data

**Add new stations:**
1. Update CSV file with new stations
2. Run: `npm run db:seed`
3. New stations will be added (existing ones won't be duplicated)

**Add new regions/constituencies:**
Same process as stations - update CSV and re-run seed script.

## Date Format Configuration

As per your requirements, the system handles dates in these formats:
- YYYY-MM-DD (ISO standard)
- DD-MM-YYYY
- DD/MM/YYYY
- DD/MM/YY

Dates are stored in PostgreSQL TIMESTAMP format and can be formatted on display as needed.

## Project Structure

```
project-root/
├── db/
│   ├── schema.sql          # Database schema
│   └── seed.js             # Data import script
├── src/
│   ├── config/
│   │   ├── db.js           # Database connection
│   │   └── auth.js         # JWT configuration
│   ├── models/             # Data access layer
│   ├── controllers/        # Business logic
│   ├── routes/             # API routes
│   ├── middleware/         # Auth & error handling
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
├── public/
│   ├── css/main.css        # Mobile-first styles
│   ├── js/main.js          # Frontend JavaScript
│   └── index.html          # SPA entry point
├── package.json
├── .env                    # Configuration (not in git)
└── README.md
```

## License

MIT License - Feel free to modify and use for your needs.

## Credits

Built for **Unite Movement Gambia** election results collection.

