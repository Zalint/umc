# Blank & Spoiled Ballots + Registered Voters Management

## ✅ Implementation Complete!

The system now supports blank ballots, spoiled ballots, and allows Members/Managers to update registered voters.

---

## 🎯 What Was Implemented

### **1. Blank & Spoiled Ballots**
- ✅ Added `blank_ballots` and `spoiled_ballots` columns to database
- ✅ Can be filled/updated at station level
- ✅ Aggregated at all levels (Station → Constituency → Region → Country)
- ✅ Displayed on all result pages
- ✅ Included in fake data generation

### **2. Access Control Updates**
- ✅ **Admin**: Full access to update all fields
- ✅ **Manager**: Can update registered voters, blank ballots, spoiled ballots for ANY station
- ✅ **Member**: Can update for their ASSIGNED stations only
- ✅ **Reader**: View only (no updates)

### **3. Database Schema**
```sql
ALTER TABLE station_metadata 
ADD COLUMN blank_ballots INTEGER DEFAULT 0,
ADD COLUMN spoiled_ballots INTEGER DEFAULT 0;
```

---

## 📊 What Are These Fields?

### **Blank Ballots**
- Ballots cast with **no selection** made
- Valid ballots that were intentionally left blank
- Counted towards turnout but not for any candidate

### **Spoiled Ballots**
- **Invalid or damaged** ballots
- Multiple selections, torn, unclear marks
- Cannot be counted for anyone

### **Registered Voters**
- Total number of people **registered to vote** at the station
- Imported from official CSV
- Now editable by Admin/Manager/Member

---

## 🚀 How to Use

### **For Admin/Manager/Member:**

1. **Navigate to Submit Results:**
   - Go to **"Submit Results"** page
   - Select a station
   - Click **"Load Station"**

2. **Update Station Metadata:**
   - See "Station Metadata" card at top
   - Edit:
     - **Registered Voters**: Total registered at station
     - **Blank Ballots**: Count of blank ballots
     - **Spoiled Ballots**: Count of spoiled ballots
   - Click **"Update Station Metadata"**
   - ✅ Updates instantly!

3. **Enter Vote Counts:**
   - Fill in votes for each participant
   - Click **"Submit Results"**

4. **Upload Photo:**
   - Upload procès verbal photo
   - Click **"Upload Photo"**

### **For Readers:**
- View all fields (read-only)
- See aggregated totals at all levels

---

## 📈 Aggregation at All Levels

### **Station Level:**
```
Station: 22nd July Square
- Registered Voters: 2,505
- Total Votes: 1,878 (75% turnout)
- Blank Ballots: 15
- Spoiled Ballots: 8
- UMC: 976 (52%)
- UDP: 845 (45%)
- Others: 57 (3%)
```

### **Constituency Level:**
```
Constituency: Banjul Central
- Total Stations: 6
- Registered Voters: 8,371 (sum of all stations)
- Total Votes: 6,278
- Blank Ballots: 45 (sum of all stations)
- Spoiled Ballots: 23 (sum of all stations)
```

### **Region Level:**
```
Region: Banjul
- Total Stations: 18
- Registered Voters: 17,248
- Total Votes: 12,936
- Blank Ballots: 92
- Spoiled Ballots: 47
```

### **Country Level:**
```
National Results
- Total Stations: 730
- Registered Voters: 962,157
- Total Votes: 720,000
- Blank Ballots: 5,124
- Spoiled Ballots: 2,847
```

---

## 🎨 UI Display

### **Submit Results Page (Admin/Manager/Member):**
```
┌────────────────────────────────────┐
│  Station Metadata                  │
├────────────────────────────────────┤
│  Registered Voters                 │
│  [2505            ]                │
│  Current: 2,505                    │
│                                    │
│  Blank Ballots                     │
│  [15              ]                │
│  Ballots cast with no selection    │
│                                    │
│  Spoiled Ballots                   │
│  [8               ]                │
│  Invalid or damaged ballots        │
│                                    │
│  [Update Station Metadata]         │
└────────────────────────────────────┘
```

### **Results Page (All Users):**
```
┌────────────────────────────────────┐
│  22nd July Square                  │
├────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐│
│  │ 2,505  │ │ 1,878  │ │  75%   ││
│  │Register│ │  Votes │ │Turnout ││
│  └────────┘ └────────┘ └────────┘│
│  ┌────────┐ ┌────────┐           │
│  │   15   │ │   8    │           │
│  │ Blank  │ │Spoiled │           │
│  └────────┘ └────────┘           │
└────────────────────────────────────┘
```

---

## 🔐 Access Control Matrix

| Role | Registered Voters | Blank Ballots | Spoiled Ballots | Scope |
|------|------------------|---------------|-----------------|-------|
| **Admin** | ✅ Update | ✅ Update | ✅ Update | All stations |
| **Manager** | ✅ Update | ✅ Update | ✅ Update | All stations |
| **Member** | ✅ Update | ✅ Update | ✅ Update | Assigned stations only |
| **Reader** | 👁️ View | 👁️ View | 👁️ View | All stations |

---

## 🧪 Fake Data Generation

### **Updated Script:**
```powershell
npm run test:fill
```

### **What Gets Generated:**
- **Registered Voters**: Actual data from CSV (962,157 total)
- **Total Votes**: 60-85% turnout
- **UMC**: 52% of votes
- **UDP**: 45% of votes
- **Others**: 3% of votes
- **Blank Ballots**: 0.5-1.5% of registered voters
- **Spoiled Ballots**: 0.3-1.0% of registered voters

### **Example for One Station:**
```
Station: 22nd July Square
- Registered: 2,505 (from CSV)
- Turnout: 75% → 1,878 votes
- UMC: 976 (52%)
- UDP: 845 (45%)
- Others: 57 (3%)
- Blank: 13 (0.5%)
- Spoiled: 8 (0.3%)
```

---

## 📋 API Endpoints

### **Update Station Metadata:**
```http
PUT /api/results/station/:stationId/metadata
Authorization: Bearer <token>
Content-Type: application/json

{
  "registered_voters": 2505,
  "blank_ballots": 15,
  "spoiled_ballots": 8
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Station metadata updated successfully"
}
```

### **Get Station Results (includes blank/spoiled):**
```http
GET /api/results/station/:stationId
```

### **Response:**
```json
{
  "success": true,
  "data": {
    "station_id": 1,
    "station_name": "22nd July Square",
    "registered_voters": 2505,
    "blank_ballots": 15,
    "spoiled_ballots": 8,
    "total_votes": 1878,
    "results": [...]
  }
}
```

---

## ✅ Validation Rules

1. ✅ All values must be **≥ 0**
2. ✅ Only **Admin/Manager/Member** can update
3. ✅ **Members** restricted to assigned stations
4. ✅ Changes logged with user ID and timestamp
5. ✅ Aggregations update automatically

---

## 📊 Complete Workflow Example

### **Election Day at 22nd July Square:**

**8:00 AM - Setup:**
```
Member logs in
Goes to Submit Results
Selects "22nd July Square"
Confirms registered voters: 2,505
```

**6:00 PM - Polls Close:**
```
Counting begins...
Total ballots cast: 1,901
```

**7:30 PM - Counting Complete:**
```
Member enters results:
- UMC: 976 votes
- UDP: 845 votes
- NPP: 31 votes
- APRC: 18 votes
- Others: 8 votes
- Blank: 15 ballots
- Spoiled: 8 ballots

Total: 976 + 845 + 31 + 18 + 8 + 15 + 8 = 1,901 ✓

Click "Submit Results"
Upload procès verbal photo
Done!
```

**8:00 PM - Results Visible:**
```
Station ✓ → Constituency ✓ → Region ✓ → Country ✓
All aggregations updated automatically
```

---

## 🎯 Benefits

### **1. Completeness**
- Accounts for **every ballot**
- Nothing missing from count

### **2. Transparency**
- Shows **exactly** what happened
- Blank vs Spoiled visible

### **3. Validation**
- **Total ballots** = Votes + Blank + Spoiled
- Easy to verify accuracy

### **4. Flexibility**
- Members can update their own stations
- No bottleneck waiting for admin

### **5. Aggregation**
- **Automatic** roll-up to all levels
- Real-time national picture

---

## 🔧 Troubleshooting

### **Problem: Can't update metadata**
**Solution:**
- Check your role (Admin/Manager/Member)
- Members: Verify you're assigned to this station
- Readers cannot update

### **Problem: Numbers don't add up**
**Example:**
```
Registered: 2,505
Votes: 1,878
Blank: 15
Spoiled: 8
Total cast: 1,901 (76% turnout) ✓
```

### **Problem: Blank ballots not showing**
**Solution:**
- Ensure database migration ran
- Check: `node db/add-blank-spoiled-ballots.js`
- Restart server

---

## 📝 Files Changed

### **New Files:**
- `db/add-blank-spoiled-ballots.js` - Database migration
- `BLANK_SPOILED_BALLOTS.md` - This documentation

### **Modified Files:**
- `src/models/result.model.js` - Added blank/spoiled to queries
- `src/controllers/result.controller.js` - Updated access control
- `src/routes/result.routes.js` - Changed endpoint
- `public/js/main.js` - Added UI fields and display
- `db/fill-fake-data.js` - Generate blank/spoiled ballots

---

## 🎉 Success!

Your election system now has:
- ✅ Blank ballots tracking
- ✅ Spoiled ballots tracking
- ✅ Member/Manager can update registered voters
- ✅ Aggregation at all levels (Station → Constituency → Region → Country)
- ✅ Beautiful UI for data entry
- ✅ Complete audit trail
- ✅ Realistic fake data for testing

---

## 📞 Quick Commands

| Task | Command |
|------|---------|
| Add columns | `node db/add-blank-spoiled-ballots.js` |
| Import voters | `npm run db:import-voters` |
| Fill fake data | `npm run test:fill` |
| Clear data | `npm run test:clear` |
| Restart server | `npm run restart` |

---

## 🚀 Ready for Election Day!

**Test the new features:**
1. Login as member
2. Select your assigned station
3. Update registered voters, blank, spoiled ballots
4. Submit vote counts
5. View aggregated results at all levels

**Perfect! 🎉📊✅**

