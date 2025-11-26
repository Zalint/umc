# Gambia Election Results Collection System

A simple MVC application for collecting and aggregating election results in The Gambia.

## Features

- **Role-based access control**: Admin, Manager, Member (Level 1/2/3), Reader
- **Geographic hierarchy**: Country → Region → Constituency → Station
- **Real-time aggregation**: Results automatically aggregate from stations up to country level
- **Flexible participants**: Support for political parties, movements, coalitions, and custom categories
- **📊 Election Projections**: Stratified Random Sampling + PVT Hybrid methodology
  - Early projections with 95% confidence level
  - ±3-4% margin of error
  - Based on representative sample of 74 stations (10%)
  - Reliable results within 1-2 hours of poll closing

## Architecture

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Pattern**: MVC (Model-View-Controller)
- **Auth**: JWT-based authentication

## Setup

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env` and update with your database credentials

4. Create database:
   ```bash
   createdb gambia_election
   ```

5. Run schema:
   ```bash
   npm run db:schema
   ```

6. Import geographic data and seed initial data:
   ```bash
   npm run db:seed
   ```

7. Start the server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Default Users

After seeding, default users are created. Passwords should be changed on first login.

- **Admin**: admin@election.gm (password set during seeding)
- **Manager**: manager@election.gm (password set during seeding)
- **Member**: member@election.gm (password set during seeding)
- **Reader**: reader@election.gm (password set during seeding)

**Note:** Use the password update script to set custom passwords:
```bash
npm run db:update-passwords
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/register` - Register new user (admin only)

### Users
- `GET /api/users/me` - Get current user info
- `GET /api/users` - List all users (admin/manager only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Geographic Data
- `GET /api/regions` - List all regions
- `GET /api/constituencies` - List constituencies (filter by region)
- `GET /api/stations` - List stations (filter by constituency)

### Participants
- `GET /api/participants` - List all participants
- `POST /api/participants` - Create participant (admin only)
- `PUT /api/participants/:id` - Update participant (admin only)
- `DELETE /api/participants/:id` - Delete participant (admin only)

### Results
- `POST /api/results` - Submit results for a station
- `GET /api/results/station/:id` - Get results for a station
- `GET /api/results/constituency/:id` - Get aggregated results for a constituency
- `GET /api/results/region/:id` - Get aggregated results for a region
- `GET /api/results/country` - Get national results

## Project Structure

```
project-root/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # HTTP server start
│   ├── config/                # Configuration
│   │   ├── db.js              # PostgreSQL connection pool
│   │   └── auth.js            # JWT configuration
│   ├── models/                # Data access layer
│   ├── controllers/           # Business logic
│   ├── routes/                # Route definitions
│   ├── middleware/            # Auth and error handling
│   └── views/                 # HTML templates
├── public/                    # Static assets
│   ├── css/
│   ├── js/
│   └── assets/
├── db/                        # Database files
│   ├── schema.sql
│   └── seed.js
└── package.json
```

## 📚 Documentation

### **Quick Guides:**
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed installation and configuration
- **[QUICK_START.md](QUICK_START.md)** - 5-minute quick start guide
- **[SERVER_COMMANDS.md](SERVER_COMMANDS.md)** - Server control commands

### **Feature Guides:**
- **[PROJECTION_QUICK_GUIDE.md](PROJECTION_QUICK_GUIDE.md)** - 📊 **START HERE** for projections
- **[PROJECTION_MATH_EXPLAINED.md](PROJECTION_MATH_EXPLAINED.md)** - 🧮 **Mathematical foundation explained**
- **[PROJECTION_METHODOLOGY.md](PROJECTION_METHODOLOGY.md)** - Technical deep dive: Stratified Sampling + PVT
- **[ADD_PHOTO_UPLOAD.md](ADD_PHOTO_UPLOAD.md)** - Photo upload feature (procès verbal)
- **[REGISTERED_VOTERS.md](REGISTERED_VOTERS.md)** - Registered voters management
- **[BLANK_SPOILED_BALLOTS.md](BLANK_SPOILED_BALLOTS.md)** - Blank and spoiled ballots tracking
- **[AUDIT_AND_SECURITY.md](AUDIT_AND_SECURITY.md)** - Audit logs, system lock, user management
- **[EXPORT_RESULTS.md](EXPORT_RESULTS.md)** - Excel export functionality
- **[TESTING.md](TESTING.md)** - Fake data generation for testing

### **Election Projection System:**

The system implements a **Stratified Random Sampling + PVT Hybrid** methodology for reliable early projections:

- **Sample Size**: 74 stations (10.1% of 730 total)
- **Methodology**: Proportional stratification by region
- **Confidence Level**: 95%
- **Margin of Error**: ±3-4%
- **Accuracy**: 90-98% (based on global PVT data)
- **Speed**: Results within 1-2 hours of poll closing

**Quick Start:**
1. Admin: Go to **Projections → Setup**
2. Click **"Auto-Select Sample Stations"**
3. Election day: Sample stations report first
4. View projection: **Projections → Results**

**Documentation:**
- 📖 **Quick Guide**: `PROJECTION_QUICK_GUIDE.md` (5-minute read)
- 📘 **Full Methodology**: `PROJECTION_METHODOLOGY.md` (technical details)

## License

MIT

