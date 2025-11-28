# Production Deployment Checklist - Groups & Members Feature

## 🚀 Pre-Deployment Checklist

### ✅ Code Changes
- [x] Groups and Members feature implemented
- [x] Database migration script created (`db/migrate-groups-members.sql`)
- [x] Backend models, controllers, and routes added
- [x] Frontend tab system and member registration form implemented
- [x] Phone validation for Gambia format added
- [x] User group assignment in user creation/update

### 📋 Files to Commit
- [ ] `db/add-groups-and-members.js` - Migration script (Node.js)
- [ ] `db/migrate-groups-members.sql` - Migration script (SQL)
- [ ] `src/models/group.model.js` - Group model
- [ ] `src/models/member.model.js` - Member model (includes assignments)
- [ ] `src/models/index.js` - Updated exports
- [ ] `src/controllers/group.controller.js` - Group controller
- [ ] `src/controllers/member.controller.js` - Member controller
- [ ] `src/controllers/user.controller.js` - Updated to include groups
- [ ] `src/controllers/auth.controller.js` - Updated to return groups
- [ ] `src/utils/phoneValidator.js` - Phone validation utility
- [ ] `src/routes/group.routes.js` - Group routes
- [ ] `src/routes/member.routes.js` - Member routes
- [ ] `src/routes/index.js` - Updated route mounting
- [ ] `public/index.html` - Updated with tabs
- [ ] `public/css/main.css` - Tab styles
- [ ] `public/js/main.js` - Tab system and member registration

---

## 🔄 Deployment Steps

### Step 1: Commit and Push to GitHub

```bash
# Check status
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Add Groups and Members feature with tab system and member registration"

# Push to main branch
git push origin main
```

### Step 2: Run Database Migration on Production

**Option A: Using Render Database Shell (Recommended)**

1. Go to your Render dashboard → Database → Shell tab
2. Copy the entire contents of `db/migrate-groups-members.sql`
3. Paste into the shell and execute
4. Verify success - should see no errors

**Option B: Using psql from Local Machine**

```bash
# Get External Database URL from Render dashboard
psql "YOUR_EXTERNAL_DATABASE_URL" -f db/migrate-groups-members.sql
```

**Option C: Using Node.js Migration Script**

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="YOUR_EXTERNAL_DATABASE_URL"

# Run migration
node db/add-groups-and-members.js
```

### Step 3: Verify Migration

Run these queries in Render Database Shell to verify:

```sql
-- Check groups table
SELECT * FROM groups;

-- Check user_groups table
SELECT u.email, g.name 
FROM users u 
JOIN user_groups ug ON u.id = ug.user_id 
JOIN groups g ON ug.group_id = g.id 
ORDER BY u.email, g.name;

-- Check members table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'members';
```

**Expected Results:**
- 2 groups: "Election" and "Membership"
- All existing users should have groups assigned
- Members table should exist

### Step 4: Deploy Web Service

1. Go to Render dashboard → Web Service
2. The service should auto-deploy from GitHub push
3. If not, click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deployment to complete (~3-5 minutes)

### Step 5: Test in Production

1. **Login as Admin:**
   - Should see both "Election" and "Membership" tabs
   - Can switch between tabs
   - Can see groups column in user list
   - Can update user groups

2. **Test Member Registration:**
   - Switch to "Membership" tab
   - Click "Member" menu item
   - Fill out registration form
   - Submit and verify success

3. **Test User Creation:**
   - Go to Users (Election tab)
   - Create new user with group selection
   - Verify groups are assigned correctly

4. **Test Phone Validation:**
   - Try invalid phone formats (should reject)
   - Try valid Gambia formats: `+2207123456`, `2207123456`, `7123456`
   - Verify normalization to `+220XXXXXXXX`

---

## 🐛 Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution:** The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: Users don't have groups after migration
**Solution:** Run the migration again - the DO block will assign groups to any users missing them.

### Issue: Tabs not showing
**Solution:** 
- Check browser console for errors
- Verify user has groups in database: `SELECT * FROM user_groups WHERE user_id = YOUR_USER_ID`
- Clear browser cache and reload

### Issue: Member registration form not loading
**Solution:**
- Check API endpoint: `/api/members` should return 200
- Verify user has "Membership" group access
- Check browser console for API errors

---

## 📝 Post-Deployment Notes

### For Fresh Deployments (New Database)
If deploying to a completely new database, update `db/render-deployment.sql` to include the groups and members tables. The migration script is only needed for existing databases.

### For Existing Deployments
Run `db/migrate-groups-members.sql` on your existing production database. This will:
- Add the new tables
- Seed the groups
- Assign default groups to existing users
- Not affect existing data

---

## ✅ Success Criteria

- [ ] Migration runs without errors
- [ ] All existing users have groups assigned
- [ ] Admin users can see both tabs
- [ ] Users with only one group see appropriate content
- [ ] Member registration form works
- [ ] Phone validation works correctly
- [ ] User group assignment works
- [ ] No console errors in browser

---

## 📞 Support

If you encounter issues:
1. Check Render deployment logs
2. Check browser console for errors
3. Verify database tables exist
4. Verify user groups are assigned correctly

