# 👥 Session Tracking & Monitoring

## Overview

The session tracking system allows **Admin** and **Manager** roles to monitor who is currently logged into the application, when they logged in, and their last activity.

**Note:** Admin users are excluded from session tracking for security reasons.

---

## Features

### 📊 **Real-Time Dashboard**
- **Active Users**: Count of currently logged-in users (excluding admin)
- **Active Sessions**: Total number of active sessions
- **Total Users**: All-time unique users who have logged in

### 📋 **Session Details**
For each active session, you can see:
- **Username**: User's login name (before @)
- **Full Name**: User's full name
- **Role**: User's role (Manager, Member, Reader)
- **Login Time**: When the user logged in
- **Last Activity**: How long ago the user last made a request
- **IP Address**: User's IP address
- **Status**: Active (✅) or Idle (⏸️) if inactive for >5 minutes
- **Actions**: Ability to terminate user sessions

### 🔒 **Security Features**
- Admin sessions are **NOT tracked** for security
- Only Admin and Manager can view sessions
- Session tokens are hashed before storage
- IP addresses are logged for audit purposes
- Automatic cleanup of old inactive sessions (30+ days)

---

## Access

### Who Can Access:
- ✅ **Admin**: Full access to view and terminate sessions
- ✅ **Manager**: Full access to view and terminate sessions
- ❌ **Member**: No access
- ❌ **Reader**: No access

### How to Access:
1. Log in as Admin or Manager
2. Click **"Active Sessions"** in the menu
3. View real-time session data

---

## Usage

### View Active Sessions
1. Navigate to **Active Sessions**
2. See statistics at the top:
   - Active Users
   - Active Sessions
   - Total Unique Users
3. Scroll down to see detailed session table

### Terminate a Session
1. Find the user in the Active Sessions table
2. Click **❌ Terminate** button
3. Confirm the action
4. User will be logged out immediately on their next request

### Understand Session Status
- **✅ Active**: User made a request in the last 5 minutes
- **⏸️ Idle**: User hasn't made a request for >5 minutes
- Sessions remain active until:
  - User logs out
  - Token expires (24 hours by default)
  - Admin/Manager terminates the session
  - User account is deactivated

---

## Database

### Tables Created
- **`user_sessions`**: Stores all user sessions
  - `id`: Primary key
  - `user_id`: Foreign key to users table
  - `token_hash`: SHA-256 hash of JWT token
  - `ip_address`: User's IP address
  - `user_agent`: User's browser/device info
  - `login_time`: When user logged in
  - `last_activity`: Last request timestamp
  - `is_active`: Boolean flag for active sessions
  - `created_at`: Record creation timestamp

### Setup Command
```bash
npm run db:add-sessions
```

---

## API Endpoints

### Get Active Sessions
```
GET /api/sessions
Authorization: Bearer <token>
Roles: admin, manager
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "user_id": 5,
        "email": "manager@election.gm",
        "full_name": "Manager User",
        "role": "manager",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "login_time": "2025-11-26T10:30:00Z",
        "last_activity": "2025-11-26T10:35:00Z",
        "idle_seconds": 120
      }
    ]
  }
}
```

### Get Session Statistics
```
GET /api/sessions/stats
Authorization: Bearer <token>
Roles: admin, manager
```

**Response:**
```json
{
  "success": true,
  "data": {
    "active_users": 3,
    "active_sessions": 3,
    "total_unique_users": 10,
    "total_sessions": 45,
    "most_recent_login": "2025-11-26T10:30:00Z"
  }
}
```

### Terminate User Sessions
```
POST /api/sessions/:userId/terminate
Authorization: Bearer <token>
Roles: admin, manager
```

**Response:**
```json
{
  "success": true,
  "message": "User sessions terminated successfully"
}
```

---

## Technical Details

### Session Lifecycle
1. **Login**: Session created with token hash, IP, user agent
2. **Request**: `last_activity` updated on every authenticated request
3. **Logout**: Session marked as `is_active = FALSE`
4. **Expiry**: Token expiration handled by JWT (24h default)
5. **Cleanup**: Old inactive sessions deleted after 30 days

### Security Considerations
- Tokens are hashed using SHA-256 before storage
- Admin sessions are excluded from tracking
- IP addresses logged for audit trail
- Session termination logs user out immediately
- Failed login attempts are NOT tracked (only successful logins)

### Performance
- Indexed on `user_id`, `is_active`, and `token_hash`
- Automatic cleanup prevents table bloat
- Lightweight updates on each request (single UPDATE query)

---

## Troubleshooting

### Sessions not appearing
- Check if user is Admin (admins are excluded)
- Verify database table exists: `npm run db:add-sessions`
- Restart server after database changes

### Old sessions not cleaning up
- Run manual cleanup (future feature)
- Check database for old records

### Session shows as idle but user is active
- Browser may be caching requests
- Hard refresh the page (Ctrl+Shift+R)
- Check network tab for API calls

---

## Future Enhancements

Potential improvements:
- [ ] Export session logs to CSV
- [ ] Session duration graphs/charts
- [ ] Real-time session updates (WebSocket)
- [ ] Session timeout warnings
- [ ] Geo-location mapping of IP addresses
- [ ] Device type classification
- [ ] Multiple concurrent session limits per user

