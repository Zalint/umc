# Audit Log & Security Features

## ✅ Implementation Complete!

The system now includes comprehensive audit logging, system lock/unlock functionality, and user access control.

---

## 🎯 Features Implemented

### **1. Comprehensive Audit Log**
- ✅ Tracks all INSERT, UPDATE, DELETE operations
- ✅ Records user ID, action, timestamp, IP address
- ✅ Captures entity type and details
- ✅ Exportable to CSV for analysis

### **2. System Lock/Unlock**
- ✅ Admin can lock system to prevent writes
- ✅ Only Admin and Manager can write when locked
- ✅ Members and readers are blocked from submitting
- ✅ Perfect for finalizing results

### **3. User Access Control**
- ✅ Admin can activate/deactivate users
- ✅ Deactivated users cannot log in
- ✅ Active sessions are immediately revoked
- ✅ Audit trail of all status changes

---

## 📊 What Gets Logged

### **User Actions:**
- `LOGIN` - User login
- `INSERT` - Creating new records (results, users, etc.)
- `UPDATE` - Modifying existing records
- `DELETE` - Removing records
- `USER_ACTIVATE` - Activating a user account
- `USER_DEACTIVATE` - Deactivating a user account
- `SYSTEM_LOCK` - Locking the system
- `SYSTEM_UNLOCK` - Unlocking the system

### **Logged Information:**
```javascript
{
  id: 1234,
  user_id: 5,
  user_name: "John Doe",
  user_email: "john@election.gm",
  action: "INSERT",
  entity_type: "results",
  entity_id: 42,
  details: "Submitted results for station 22nd July Square with 8 participants",
  ip_address: "192.168.1.100",
  created_at: "2024-01-15 18:30:45"
}
```

---

## 🔐 API Endpoints

### **Audit Log Management:**

#### **Get Audit Logs (Admin Only)**
```http
GET /api/audit/logs?limit=100&offset=0
GET /api/audit/logs?user_id=5
GET /api/audit/logs?action=INSERT
GET /api/audit/logs?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1234,
        "user_name": "John Doe",
        "action": "INSERT",
        "entity_type": "results",
        "details": "Submitted results...",
        "ip_address": "192.168.1.100",
        "created_at": "2024-01-15T18:30:45.000Z"
      }
    ],
    "count": 1
  }
}
```

#### **Get Audit Statistics (Admin Only)**
```http
GET /api/audit/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_actions": 5432,
    "unique_users": 45,
    "inserts": 2100,
    "updates": 1500,
    "deletes": 50,
    "last_24h": 234,
    "last_action": "2024-01-15T18:30:45.000Z"
  }
}
```

#### **Export Audit Logs to CSV (Admin Only)**
```http
GET /api/audit/export?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <admin_token>
```

Downloads CSV file with all audit records.

---

### **System Lock/Unlock:**

#### **Get System Lock Status (All Users)**
```http
GET /api/audit/system-lock
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "locked": false
  }
}
```

#### **Lock System (Admin Only)**
```http
POST /api/audit/system-lock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "locked": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "System locked successfully",
  "data": {
    "locked": true
  }
}
```

#### **Unlock System (Admin Only)**
```http
POST /api/audit/system-lock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "locked": false
}
```

---

### **User Access Control:**

#### **Deactivate User (Admin Only)**
```http
PUT /api/users/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "member@election.gm",
      "is_active": false
    }
  }
}
```

#### **Activate User (Admin Only)**
```http
PUT /api/users/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "is_active": true
}
```

---

## 🔒 System Lock Behavior

### **When System is UNLOCKED:**
| Role | Can Submit Results | Can Update Metadata | Can Upload Photos |
|------|-------------------|---------------------|-------------------|
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Manager** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Member** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Reader** | ❌ No | ❌ No | ❌ No |

### **When System is LOCKED:**
| Role | Can Submit Results | Can Update Metadata | Can Upload Photos |
|------|-------------------|---------------------|-------------------|
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Manager** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Member** | ❌ **BLOCKED** | ❌ **BLOCKED** | ❌ **BLOCKED** |
| **Reader** | ❌ No | ❌ No | ❌ No |

**Error Message when Locked:**
```json
{
  "success": false,
  "message": "System is locked. Results submission is currently disabled. Only administrators and managers can make changes."
}
```

---

## 👤 User Access Control

### **Active User:**
- ✅ Can log in
- ✅ Can access system
- ✅ Can perform role-based actions

### **Inactive User:**
- ❌ Cannot log in
- ❌ Existing sessions immediately revoked
- ❌ All API requests blocked

**Error Message for Inactive Users:**
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact an administrator."
}
```

---

## 📋 Use Cases

### **Use Case 1: Election Day**
```
6:00 AM  - System UNLOCKED, all users active
         - Members start submitting results
         
11:00 PM - Final results coming in
         - All data being submitted
         
1:00 AM  - Admin reviews completeness
         - All 730 stations reported ✓
         
1:30 AM  - Admin LOCKS system
         - Members can no longer submit
         - Only Admin/Manager can make corrections
```

### **Use Case 2: Suspicious Activity**
```
Admin notices: User "John" submitting unusual data

1. Admin reviews audit logs:
   GET /api/audit/logs?user_id=5
   
2. Admin sees problematic submissions

3. Admin DEACTIVATES user:
   PUT /api/users/5/status
   { "is_active": false }
   
4. John's session immediately terminated
5. John cannot log in or access system
6. Admin reviews and corrects John's submissions
7. Once resolved, Admin can REACTIVATE John
```

### **Use Case 3: End of Election Investigation**
```
1. Export complete audit log:
   GET /api/audit/export?start_date=2024-01-15

2. Download CSV with all actions:
   - All logins
   - All result submissions  
   - All updates
   - All deletions
   
3. Import into Excel/Database for analysis

4. Generate reports:
   - Who submitted when
   - What was changed
   - Any suspicious patterns
```

---

## 📊 Database Schema

### **audit_log Table:**
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **system_settings Table:**
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **users Table (Updated):**
```sql
ALTER TABLE users 
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

---

## 🎯 Security Benefits

### **1. Complete Audit Trail**
- ✅ Know exactly what happened
- ✅ Track who did what when
- ✅ IP addresses for forensics
- ✅ Exportable for legal/compliance needs

### **2. System Integrity**
- ✅ Lock system after results finalized
- ✅ Prevent accidental/unauthorized changes
- ✅ Admin/Manager can still make corrections

### **3. User Access Control**
- ✅ Immediately revoke suspicious users
- ✅ Deactivate users who leave organization
- ✅ No need to delete accounts (audit trail preserved)

### **4. Compliance Ready**
- ✅ Full audit logs for transparency
- ✅ CSV export for reporting
- ✅ Timestamp and IP tracking
- ✅ Action accountability

---

## 🔧 Administration Tasks

### **Daily Monitoring:**
```bash
# Check recent activity
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/audit/stats

# View last 24 hours
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/audit/logs?limit=100
```

### **Lock System After Final Results:**
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"locked": true}' \
  http://localhost:3000/api/audit/system-lock
```

### **Deactivate Suspicious User:**
```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}' \
  http://localhost:3000/api/users/5/status
```

### **Export Monthly Audit:**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/audit/export?start_date=2024-01-01&end_date=2024-01-31" \
  > audit_january_2024.csv
```

---

## 📝 Files Created/Modified

### **New Files:**
- `db/add-audit-log.js` - Audit log database migration
- `db/add-user-active-status.js` - User active status migration
- `src/models/audit.model.js` - Audit log model
- `src/controllers/audit.controller.js` - Audit controller
- `src/routes/audit.routes.js` - Audit routes
- `src/middleware/systemLock.js` - System lock middleware
- `AUDIT_AND_SECURITY.md` - This documentation

### **Modified Files:**
- `src/middleware/auth.js` - Added active user check
- `src/controllers/result.controller.js` - Added audit logging
- `src/controllers/user.controller.js` - Added audit logging & status toggle
- `src/controllers/auth.controller.js` - Added login audit logging
- `src/routes/result.routes.js` - Added system lock middleware
- `src/routes/user.routes.js` - Added status toggle route
- `src/models/index.js` - Export audit model

---

## ✅ Testing Checklist

### **Test Audit Logging:**
- [ ] Submit results → Check audit log
- [ ] Update metadata → Check audit log
- [ ] Delete user → Check audit log
- [ ] Login → Check audit log
- [ ] Export CSV → Verify all records

### **Test System Lock:**
- [ ] Lock system as admin
- [ ] Try to submit as member → Should be blocked
- [ ] Try to submit as admin → Should work
- [ ] Unlock system
- [ ] Submit as member → Should work

### **Test User Deactivation:**
- [ ] Deactivate user as admin
- [ ] Try to login as deactivated user → Should fail
- [ ] Try API with existing token → Should fail
- [ ] Reactivate user
- [ ] Login again → Should work

---

## 🎉 Summary

Your election system now has:
- ✅ **Complete audit trail** of all actions
- ✅ **System lock** to finalize results
- ✅ **User deactivation** for security
- ✅ **IP address tracking** for forensics
- ✅ **CSV export** for reporting
- ✅ **Admin-only controls** for security
- ✅ **Immediate access revocation** for deactivated users

**Perfect for election integrity and transparency! 🔐📊✅**

