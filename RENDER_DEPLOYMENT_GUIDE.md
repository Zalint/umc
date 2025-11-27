# Render Deployment Guide

This guide will help you deploy the Gambia Election Results Collection System to Render.

## Prerequisites

- A GitHub account (code already pushed to https://github.com/Zalint/umc.git)
- A Render account (sign up at https://render.com)

---

## Step 1: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in the details:
   - **Name**: `gambia-election-db` (or your preferred name)
   - **Database**: `gambia_election`
   - **User**: (auto-generated, keep it)
   - **Region**: Choose closest to your users (e.g., `Frankfurt (EU Central)` or `Ohio (US East)`)
   - **PostgreSQL Version**: 16 (or latest stable)
   - **Plan**: Free (or paid based on your needs)
4. Click **"Create Database"**
5. Wait for the database to be provisioned (~2-3 minutes)

### 1.1: Get Database Connection Details

Once created, you'll see:
- **Internal Database URL**: Use this for the web service
- **External Database URL**: Use this for running SQL queries from your local machine

Copy the **Internal Database URL** - you'll need it later.

---

## Step 2: Run the Database Schema

### Option A: Using Render Dashboard (Recommended)

1. In your database dashboard, click on the **"Shell"** tab
2. Copy the entire contents of `db/render-deployment.sql` from your repository
3. Paste it into the shell and press Enter
4. Wait for all tables to be created successfully

### Option B: Using Local psql Client

1. Install PostgreSQL client on your machine if not already installed
2. Copy the **External Database URL** from Render
3. Open terminal and run:
   ```bash
   psql "YOUR_EXTERNAL_DATABASE_URL"
   ```
4. Copy and paste the contents of `db/render-deployment.sql`
5. Press Enter and wait for completion

### Verify Tables Were Created

Run this query to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 14 tables:
- audit_log
- constituencies
- member_assignments
- participant_categories
- participants
- projection_settings
- regions
- result_attachments
- results
- station_metadata
- stations
- system_settings
- user_sessions
- users

---

## Step 3: Create Web Service on Render

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account if not already connected
3. Select the repository: `Zalint/umc`
4. Fill in the details:
   - **Name**: `gambia-election` (or your preferred name)
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: (leave blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid based on your needs)

### 3.1: Add Environment Variables

In the **Environment Variables** section, add the following:

| Key | Value |
|-----|-------|
| `DB_HOST` | (copy from Internal Database URL - the host part) |
| `DB_PORT` | `5432` |
| `DB_NAME` | `gambia_election` |
| `DB_USER` | (copy from Internal Database URL - the username) |
| `DB_PASSWORD` | (copy from Internal Database URL - the password) |
| `JWT_SECRET` | (generate a strong random string - see below) |
| `JWT_EXPIRES_IN` | `7d` |
| `PORT` | `3000` |

**To generate a strong JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**OR use the Internal Database URL directly:**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (paste the full Internal Database URL) |
| `JWT_SECRET` | (your generated secret) |
| `JWT_EXPIRES_IN` | `7d` |
| `PORT` | `3000` |

> **Note**: If you use `DATABASE_URL`, you'll need to modify `src/config/db.js` to parse it. The individual variables method is recommended.

### 3.2: Deploy

1. Click **"Create Web Service"**
2. Wait for the deployment to complete (~3-5 minutes)
3. Watch the logs for any errors

---

## Step 4: Seed the Database

After deployment succeeds, you need to populate the database with initial data.

### Option 1: Using Render Shell

1. Go to your **Web Service** dashboard
2. Click on **"Shell"** tab
3. Run the following commands:

```bash
npm run db:seed
npm run db:import-voters
```

### Option 2: Using Local Machine with External Database URL

1. In your local project, create a `.env.render` file:
   ```bash
   DB_HOST=your-render-db-host
   DB_PORT=5432
   DB_NAME=gambia_election
   DB_USER=your-render-db-user
   DB_PASSWORD=your-render-db-password
   ```

2. Run the seed scripts:
   ```bash
   # Temporarily use .env.render
   cp .env .env.backup
   cp .env.render .env
   
   # Run seeds
   npm run db:seed
   npm run db:import-voters
   
   # Restore original .env
   cp .env.backup .env
   ```

---

## Step 5: Verify Deployment

1. Open your Render service URL: `https://gambia-election.onrender.com` (or your custom domain)
2. You should see the login page
3. Try logging in with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123` (or the password set in `db/seed.js`)

### Update Admin Password

For security, update the admin password immediately:

1. Log in as admin
2. Go to **"Manage Users"**
3. Click on the admin user
4. Update the password
5. Save

---

## Step 6: Configure Custom Domain (Optional)

1. In your Web Service dashboard, click **"Settings"**
2. Scroll to **"Custom Domain"**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `election.unitemovementgambia.org`)
5. Follow the instructions to add DNS records to your domain registrar
6. Wait for DNS propagation (~5-60 minutes)

---

## Database Summary

### Tables Created (14 total):

1. **users** - User accounts (admin, manager, member, reader)
2. **regions** - 7 regions of The Gambia
3. **constituencies** - Electoral constituencies
4. **stations** - 962 polling stations
5. **participant_categories** - Categories (party, movement, etc.)
6. **participants** - Political parties and movements
7. **station_metadata** - Registered voters, blank/spoiled ballots
8. **results** - Vote counts per station per participant
9. **member_assignments** - User geographic access assignments
10. **result_attachments** - Photos of procès verbal
11. **audit_log** - Audit trail of user actions
12. **system_settings** - Global configuration
13. **projection_settings** - Election projection configuration
14. **user_sessions** - Active session tracking

### Views Created (4 total):
1. **v_station_results** - Station-level aggregation
2. **v_constituency_results** - Constituency-level aggregation
3. **v_region_results** - Region-level aggregation
4. **v_country_results** - Country-level aggregation

### Default Users Created (by seed script):
- **admin@election.gm** / `admin123` - Full access
- **manager@election.gm** / `manager123` - Country-wide access
- **member@election.gm** / `member123` - Assigned area access
- **reader@election.gm** / `reader123` - Read-only access

---

## Troubleshooting

### Build Fails

**Error**: `Cannot find module 'xyz'`
- **Solution**: Make sure `package.json` lists all dependencies
- Check build logs and run `npm install` locally to verify

### Database Connection Fails

**Error**: `connection refused` or `authentication failed`
- **Solution**: Double-check environment variables
- Ensure you're using the **Internal Database URL** (not External)
- Verify the database is running in the Render dashboard

### Application Crashes on Start

**Error**: `Port already in use` or similar
- **Solution**: Render automatically assigns ports; don't hardcode `PORT=3000` in production
- Use `process.env.PORT || 3000` in `src/server.js` (already implemented)

### Seed Script Fails

**Error**: `relation "regions" already exists`
- **Solution**: This is normal if you run the seed script multiple times
- The script should handle this gracefully with `ON CONFLICT` clauses

### Cannot Upload Files

**Error**: File uploads fail or files disappear
- **Solution**: Render's free tier has ephemeral storage
- Consider using external storage (AWS S3, Cloudinary, etc.) for production
- Or upgrade to a paid plan with persistent disk

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Generated strong JWT_SECRET (not using default)
- [ ] Environment variables set correctly (not exposed in logs)
- [ ] Database password is strong
- [ ] HTTPS enabled (automatic on Render)
- [ ] Regular backups configured (Render PostgreSQL includes automatic backups)

---

## Monitoring & Maintenance

### View Logs
1. Go to your Web Service dashboard
2. Click **"Logs"** tab
3. Watch real-time logs or search historical logs

### Database Backups
- **Automatic**: Render PostgreSQL includes daily backups (retained for 7 days on free tier)
- **Manual**: Use `pg_dump` with External Database URL:
  ```bash
  pg_dump "EXTERNAL_DATABASE_URL" > backup.sql
  ```

### Database Metrics
1. Go to your PostgreSQL database dashboard
2. View metrics: CPU, Memory, Connections, Storage

---

## Cost Estimate

### Free Tier:
- **PostgreSQL**: 1 GB storage, 90 days retention
- **Web Service**: 512 MB RAM, automatic sleep after 15 min inactivity
- **Total**: $0/month

### Recommended Paid (for production):
- **PostgreSQL Starter**: 256 MB RAM, 1 GB storage - $7/month
- **Web Service Starter**: 512 MB RAM - $7/month
- **Total**: ~$14/month

---

## Support

For issues specific to:
- **Render Platform**: https://render.com/docs or support@render.com
- **This Application**: Check the GitHub repository issues or README.md

---

## Next Steps After Deployment

1. Import registered voters: `npm run db:import-voters` (if not done already)
2. Create participant categories and participants (via Admin UI)
3. Create member users and assign them to stations/constituencies/regions
4. Test the application thoroughly
5. Train users on how to use the system
6. Set up projection sampling (Admin → Projection Setup)
7. Monitor active sessions (Admin → Active Sessions)
8. Enable audit logging when needed (Admin → System Settings)

---

**Deployment Date**: 2025-11-27
**Version**: 1.0.0
**Deployed By**: Unite Movement Gambia

