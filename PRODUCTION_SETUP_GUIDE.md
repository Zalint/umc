# Production Deployment Guide - Render

Complete step-by-step guide for deploying the Gambia Election Results System to production on Render.

---

## 📋 Prerequisites

- GitHub repository: https://github.com/Zalint/umc.git
- Render account: https://render.com
- CSV files: `REGRISTRATION DEMOGRAPHICS_STATIC.csv` and `REGRISTRATION DEMOGRAPHICS.csv`

---

## 🚀 Deployment Steps

### **Step 1: Create PostgreSQL Database**

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `gambia-election-db`
   - **Database**: `gambia_election`
   - **Region**: `Frankfurt (EU Central)` or closest to users
   - **PostgreSQL Version**: 16
   - **Plan**: Choose based on needs (Free or Starter $7/mo)
4. Click **"Create Database"**
5. **Copy the Internal Database URL** (you'll need it later)

---

### **Step 2: Run Database Schema**

#### Option A: Using Render Dashboard Shell (Recommended)

1. In your database dashboard, click **"Shell"** tab
2. Copy the entire contents of `db/render-deployment.sql` from GitHub
3. Paste into the shell and press Enter
4. Wait for success message (~1 minute)

#### Option B: Using psql from Local Machine

```bash
# Copy External Database URL from Render
psql "YOUR_EXTERNAL_DATABASE_URL" -f db/render-deployment.sql
```

✅ **Verify**: Run this query to check all tables were created:
```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```
Should return: **14 tables**

---

### **Step 3: Create Web Service**

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub and select: `Zalint/umc`
3. Configure:
   - **Name**: `gambia-election`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter $7/mo

#### 3.1: Environment Variables

Add these in the **Environment** section:

```bash
# Database Connection
DB_HOST=<from Internal Database URL>
DB_PORT=5432
DB_NAME=gambia_election
DB_USER=<from Internal Database URL>
DB_PASSWORD=<from Internal Database URL>

# JWT Authentication (GENERATE A STRONG SECRET!)
JWT_SECRET=<generate random string - see below>
JWT_EXPIRES_IN=7d

# Server Port
PORT=3000
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Click **"Create Web Service"**
5. Wait for deployment (~3-5 minutes)

---

### **Step 4: Seed Geographic Data**

After deployment, go to your **Web Service** dashboard → **Shell** tab

```bash
# Seed regions, constituencies, stations (962 stations)
npm run db:seed
```

This creates:
- ✓ 7 Regions
- ✓ 53 Constituencies
- ✓ 962 Polling Stations
- ✓ 2 Participant Categories
- ✓ 7 Default Participants (UDP, APRC, GDC, NRP, PDOIS, UMC, Independent)

**Note**: This also creates test users. For production-only users, see Step 5.

---

### **Step 5: Create Production Users (Admin, Manager)**

In the **Shell** tab, run:

```bash
npm run db:seed-prod
```

This creates **3 essential users**:

| Role | Username | Temporary Password | Access Level |
|------|----------|-------------------|--------------|
| **Admin** | `admin` | `Admin@2024!Change` | Full system access |
| **Manager** | `manager` | `Manager@2024!Change` | Country-wide data access |
| **Reader** | `reader` | `Reader@2024!View` | Read-only access |

⚠️ **CRITICAL**: These are **temporary passwords**. You MUST change them immediately after first login!

---

### **Step 6: Import Registered Voters**

Still in the **Shell** tab:

```bash
npm run db:import-voters
```

This imports registered voter counts for all 962 stations from the CSV file.

✅ **Verify**: Check total registered voters:
```sql
SELECT SUM(registered_voters) as total FROM station_metadata;
```
Should return: **~962,000** (actual number from your CSV)

---

### **Step 7: First Login & Security Setup**

1. Open your application: `https://gambia-election.onrender.com`
2. Login as admin:
   - **Username**: `admin`
   - **Password**: `Admin@2024!Change`

3. **Immediately change the password**:
   - Go to **"Manage Users"**
   - Click on **System Administrator**
   - Click **"Edit"** or **"Update Password"**
   - Set a strong new password
   - Save

4. **Repeat for manager and reader accounts**

5. **Create additional users** as needed through the UI

---

### **Step 8: Configure Participants (Optional)**

If you need to modify the default political parties:

1. Login as **admin**
2. Go to **"Manage Participants"**
3. Add, edit, or remove participants as needed
4. Set display order for dashboard appearance

Default participants created:
- United Democratic Party (UDP)
- Alliance for Patriotic Reorientation and Construction (APRC)
- Gambia Democratic Congress (GDC)
- National Reconciliation Party (NRP)
- People's Democratic Organisation for Independence and Socialism (PDOIS)
- United Movement for Change (UMC)
- Independent Candidates

---

### **Step 9: Create Member Users**

For station-level, constituency-level, or region-level members:

1. Go to **"Manage Users"**
2. Click **"Create User"**
3. Fill in details:
   - Email
   - Full Name
   - Password
   - Role: **Member**
4. Save
5. Assign geographic area:
   - **Level 1**: Specific station
   - **Level 2**: Entire constituency
   - **Level 3**: Entire region
6. Select the area from dropdown
7. Save assignment

---

### **Step 10: Test the System**

#### For Testing with Fake Data (Optional):

```bash
# Fill all stations with realistic fake data
npm run test:fill

# View results on dashboard
# Clear fake data when ready for real elections
npm run test:clear
```

#### For Production (No Fake Data):

- **Skip the test:fill command**
- Members can start submitting real results directly
- Monitor submissions through the dashboard

---

## 🔒 Security Checklist

- [ ] Changed admin default password
- [ ] Changed manager default password
- [ ] Changed reader default password
- [ ] Generated strong JWT_SECRET (not default)
- [ ] All environment variables secured
- [ ] Database password is strong
- [ ] HTTPS enabled (automatic on Render)
- [ ] Only necessary users have admin/manager access
- [ ] Test user accounts deleted (if any)

---

## 📊 Post-Deployment Configuration

### Enable Audit Logging

1. Login as **admin**
2. Go to **"System Settings"**
3. Toggle **"Audit Logging"** ON
4. All user actions will now be logged

### Set Up Election Projections

1. Go to **"Projection Setup"** (Admin menu)
2. Click **"Auto-Select Sample Stations"**
3. Review stratified sample (~74 stations, 10%)
4. Save selection
5. Activate projections when ready

### Monitor Active Sessions

1. Go to **"Active Sessions"** (Admin/Manager menu)
2. View all logged-in users
3. See login times, last activity, IP addresses
4. Terminate sessions if needed

---

## 🔄 Maintenance Commands

### View Application Logs
```bash
# In Render Web Service dashboard
# Go to "Logs" tab
```

### Database Backup
```bash
# From local machine with External Database URL
pg_dump "EXTERNAL_DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

### Update Application
```bash
# Push changes to GitHub
git push origin main

# Render will auto-deploy (if auto-deploy enabled)
# Or manually trigger deploy in Render dashboard
```

---

## 📞 Default Login Credentials (Production)

**After running `npm run db:seed-prod`:**

```
Admin:
  Username: admin
  Password: Admin@2024!Change
  Email: admin@election.gm

Manager:
  Username: manager
  Password: Manager@2024!Change
  Email: manager@election.gm

Reader:
  Username: reader
  Password: Reader@2024!View
  Email: reader@election.gm
```

**⚠️ CHANGE ALL PASSWORDS IMMEDIATELY AFTER FIRST LOGIN!**

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Verify environment variables match Internal Database URL
- Check database is running in Render dashboard
- Ensure DB_HOST, DB_USER, DB_PASSWORD are correct

### "Port already in use"
- Ensure `PORT` environment variable is set to `3000`
- Render assigns ports automatically; code handles this

### "Participants not found" error
- Run `npm run db:seed` to create default participants
- Or create participants manually through Admin UI

### Login fails with correct password
- Clear browser cache and cookies
- Try incognito/private browsing mode
- Check user is `is_active = true` in database

### File uploads not persisting
- Render free tier has ephemeral storage
- Consider external storage (S3, Cloudinary) or upgrade plan

---

## 📈 Monitoring & Metrics

### Database Metrics
- Go to PostgreSQL dashboard in Render
- View: Connections, CPU, Memory, Storage usage
- Set up alerts for high usage

### Application Metrics
- View response times in Logs
- Monitor error rates
- Track active user sessions via UI

---

## 💰 Cost Estimate

### Free Tier:
- PostgreSQL: 1 GB storage, 90 days retention
- Web Service: 512 MB RAM, sleeps after 15 min inactivity
- **Total**: $0/month

### Production Tier (Recommended):
- PostgreSQL Starter: 256 MB RAM, 1 GB storage - $7/mo
- Web Service Starter: 512 MB RAM, no sleeping - $7/mo
- **Total**: $14/month

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Application loads at your Render URL
- ✅ Admin can login with new password
- ✅ Dashboard shows 962 stations
- ✅ Registered voters total is correct (~962,000)
- ✅ Members can submit results
- ✅ Results aggregate correctly at all levels
- ✅ Audit logging works (if enabled)
- ✅ Session tracking works
- ✅ File uploads work (proces verbale photos)

---

## 📝 Quick Reference Commands

```bash
# Production setup sequence
npm run db:seed           # Seed geography + default data
npm run db:seed-prod      # Create admin, manager, reader users
npm run db:import-voters  # Import registered voters

# Testing (optional)
npm run test:fill         # Fill fake data
npm run test:clear        # Clear fake data

# Maintenance
npm start                 # Start application
npm run dev              # Development mode with auto-reload
```

---

**Deployment Date**: 2025-11-27  
**Version**: 1.0.0  
**Deployed By**: Unite Movement Gambia  
**Repository**: https://github.com/Zalint/umc.git

