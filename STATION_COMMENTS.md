# 📝 Station Comments & Issue Tracking

## Overview

This feature allows members, managers, and admins to report issues and add comments/notes when submitting station results. This is useful for documenting irregularities, observations, or any special circumstances during the voting process.

---

## Features

### ✅ **Issue Reporting Checkbox**
- Simple checkbox: "Report an Issue"
- Marks the station if any irregularities occurred
- Triggers mandatory comment requirement

### 📝 **Comment/Notes Field**
- **Long text field** (textarea) for detailed descriptions
- Can contain multiple paragraphs
- Validation rules:
  - ✅ **Issue checkbox CHECKED** → Comment is **REQUIRED**
  - ⬜ **Issue checkbox NOT CHECKED** → Comment is **OPTIONAL** (but allowed)

---

## Use Cases

### **1. Reporting Issues (Checkbox Checked)**
**Example:**
```
☑️ Report an Issue
Comment: "There was a power outage for 2 hours during voting. 
          Some voters left without casting their ballots. 
          Voting period was extended by 1 hour."
```

### **2. Adding Notes Without Issues (Checkbox Not Checked)**
**Example:**
```
☐ Report an Issue
Comment: "High turnout in the morning. Process went smoothly. 
          No incidents reported."
```

### **3. No Comment Needed (Checkbox Not Checked)**
```
☐ Report an Issue
Comment: (empty - this is fine!)
```

---

## How to Use

### **For Members/Managers/Admins:**

1. Go to **Submit Results**
2. Select a station
3. Fill in the **Station Metadata** section
4. **If there was an issue:**
   - ✅ Check "Report an Issue"
   - Enter detailed description in the comment field
   - Comment is now **REQUIRED** (you'll get a warning if empty)
5. **If everything was normal:**
   - ⬜ Leave "Report an Issue" unchecked
   - Optionally add notes if you want
   - Or leave comment empty
6. Click **Update Station Metadata**

### **For Readers:**

- Can view if an issue was reported (⚠️ icon)
- Can read the comments/notes
- Cannot edit or add comments

---

## Validation Logic

```javascript
if (hasIssue === true) {
  if (comment.isEmpty()) {
    → Show error: "Please provide a comment describing the issue"
    → Comment field is highlighted
  }
} else {
  // No validation - comment can be empty or filled
}
```

---

## Display

### **In Submit Results Form:**
```
Station Metadata
━━━━━━━━━━━━━━━━━
Registered Voters: [651]
Blank Ballots: [3]
Spoiled Ballots: [3]

☑️ Report an Issue

Comments / Issue Description *
┌─────────────────────────────┐
│ Power outage for 2 hours... │
│                             │
└─────────────────────────────┘
Comment is required when an issue is reported

[Update Station Metadata]
```

### **In Dashboard/Results View (Read-Only):**
```
Station Metadata
━━━━━━━━━━━━━━━━━
Registered Voters: 651
Blank Ballots: 3
Spoiled Ballots: 3
⚠️ Issue Reported

Comments:
┌─────────────────────────────┐
│ Power outage for 2 hours... │
│ Some voters left...         │
└─────────────────────────────┘
```

---

## Database

### **Columns Added:**
- `has_issue` (BOOLEAN, DEFAULT FALSE)
- `issue_comment` (TEXT, NULL allowed)

### **Setup Command:**
```bash
npm run db:add-comments
```

---

## API Changes

### **Update Station Metadata Endpoint:**
```
PUT /api/results/station/:stationId/metadata
```

**Request Body:**
```json
{
  "registered_voters": 651,
  "blank_ballots": 3,
  "spoiled_ballots": 3,
  "has_issue": true,
  "issue_comment": "Power outage for 2 hours during voting..."
}
```

**Validation:**
- If `has_issue = true` and `issue_comment` is empty → **400 Bad Request** (optional: can add backend validation)
- Frontend validates before sending

---

## Security

- Only **Admin**, **Manager**, and **Member** can add/edit comments
- **Reader** can only view comments
- Comments are stored as plain text (no HTML)
- Audit log tracks when comments are added/updated
- IP address logged for accountability

---

## Benefits

1. **Transparency**: Document any irregularities
2. **Accountability**: Track who reported what and when
3. **Context**: Provide additional information for result interpretation
4. **Flexibility**: Can add notes even without issues
5. **Validation**: Ensures issues are properly described

---

## Future Enhancements

Possible improvements:
- [ ] Filter/search results by "has issues"
- [ ] Export comments to Excel/CSV
- [ ] Add comment timestamps
- [ ] Support attachments with comments
- [ ] Comment history/versioning
- [ ] Admin dashboard showing all issues

