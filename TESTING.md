# Testing Scripts for Election Results System

## 🧪 Fake Data Scripts

Two scripts are provided for testing purposes:

### 1. Fill Fake Data
Generates realistic election results for ALL stations with **United Movement for Change (UMC)** winning at **52%**.

### 2. Clear Fake Data
Removes all fake results and resets the database to a clean state.

---

## 📊 Fill Fake Data

### Command:
```powershell
npm run test:fill
```

### What it does:
- ✅ Processes all **730 polling stations**
- ✅ Generates random registered voters (500-2,000 per station)
- ✅ Simulates realistic turnout (60-85%)
- ✅ **UMC gets exactly 52% of total votes**
- ✅ Remaining 48% distributed among other participants
- ✅ Updates station metadata with registered voters
- ✅ Shows progress during generation

### Example Output:
```
==============================================
  Filling Fake Election Results
  United Movement for Change: 52% Winner
==============================================

✓ Found 730 stations
✓ Found 7 participants
✓ Target Winner: Unite Movement Gambia (UMG)

Generating fake results...
  Processed 50/730 stations...
  Processed 100/730 stations...
  ...

✅ Fake Data Generated Successfully!

Summary:
  Stations filled: 730
  Total votes: 850,234
  UMC votes: 442,122 (52.00%)
  Other votes: 408,112

Winner: 🏆 United Movement for Change (UMC)
```

### View Results:
After running, visit:
- Dashboard: http://localhost:3000
- You'll see UMC leading with 52%

---

## 🗑️ Clear Fake Data

### Command:
```powershell
npm run test:clear
```

### What it does:
- ✅ Shows current data counts
- ✅ Asks for confirmation (safety check)
- ✅ Deletes ALL results
- ✅ Deletes ALL station metadata
- ✅ Keeps attachments (photos) unless uncommented
- ✅ Resets database to clean state

### Example Output:
```
==============================================
  Clear All Election Results
==============================================

Current Data:
  Results: 5,110 records
  Station Metadata: 730 records
  Attachments: 0 files

⚠️  This will DELETE ALL results and metadata. Continue? (yes/no): yes

Clearing data...
✓ Results cleared
✓ Station metadata cleared

✅ All Data Cleared Successfully!

Database is now clean and ready for fresh data.
```

---

## 🔄 Complete Test Cycle

### Workflow:
```powershell
# 1. Fill with fake data
npm run test:fill

# 2. Test the application
# - View dashboard
# - Check results by region/constituency
# - Test member access
# - Try submitting new results

# 3. Clear fake data when done
npm run test:clear

# 4. Fill again with different scenario
npm run test:fill
```

---

## 📈 What Gets Generated

### Per Station:
- **Registered Voters**: Random between 500-2,000
- **Turnout**: Random between 60-85%
- **Total Votes**: Registered × Turnout

### Vote Distribution:
- **UMC (United Movement for Change)**: Exactly 52%
- **UDP**: ~10-15% (random)
- **APRC**: ~8-12% (random)
- **NPP**: ~8-12% (random)
- **GDC**: ~6-10% (random)
- **PDOIS**: ~4-8% (random)
- **Independent**: ~2-6% (random)

*(Percentages may vary slightly per station but aggregate to 52% for UMC nationally)*

---

## 🎯 Use Cases

### 1. **Demo/Presentation**
```powershell
npm run test:fill
# Show impressive results to stakeholders
```

### 2. **UI Testing**
```powershell
npm run test:fill
# Test how dashboard handles full data
# Check performance with 730 stations
```

### 3. **Member Access Testing**
```powershell
# Create member with station access
# Fill fake data
npm run test:fill
# Login as member to verify they only see their station
```

### 4. **Report Generation**
```powershell
npm run test:fill
# Test result exports
# Verify aggregations are correct
```

### 5. **Development**
```powershell
# Clear old data
npm run test:clear

# Make code changes

# Fill new data to test
npm run test:fill
```

---

## ⚠️ Important Notes

### Safety:
- ✅ Scripts only affect `results` and `station_metadata` tables
- ✅ Does NOT delete users, participants, or geographic data
- ✅ Clear script asks for confirmation before deleting
- ✅ Both scripts use transactions (rollback on error)

### Performance:
- ⏱️ Fill script takes ~10-30 seconds for 730 stations
- ⏱️ Clear script is instant

### Data Integrity:
- ✅ Results always sum to 100%
- ✅ Vote counts are realistic
- ✅ Turnout percentages are reasonable
- ✅ UMC always gets exactly 52% total

---

## 🔧 Customization

Want to change the winner or percentages? Edit `db/fill-fake-data.js`:

```javascript
// Line 72-73: Change winner percentage
const umcVotes = Math.floor(totalVotes * 0.52);  // Change 0.52 to 0.60 for 60%

// Line 17-20: Change voter range
const registeredVoters = randomInt(500, 2000);  // Change range

// Line 23-24: Change turnout range
const turnoutPercent = randomInt(60, 85) / 100;  // Change range
```

---

## 🎲 Randomization

The script ensures realistic variation:
- Each station has different registered voters
- Each station has different turnout
- Other participants' votes vary randomly
- But UMC always wins with 52% nationally

---

## 📊 Verification

After filling data, verify in the app:

1. **Dashboard**: Shows total votes and 52% for UMC
2. **View Results > Country**: UMC should have ~52%
3. **View Results > Region**: Results vary by region
4. **View Results > Station**: Each station has different counts

---

## 🚀 Quick Reference

| Task | Command |
|------|---------|
| Fill fake data | `npm run test:fill` |
| Clear all data | `npm run test:clear` |
| View results | Open http://localhost:3000 |

---

## 💡 Pro Tips

1. **Always clear before filling** to avoid duplicate data
2. **Run fill script before demos** for impressive dashboards
3. **Use clear script after testing** to start fresh
4. **Screenshots work great** with filled data
5. **Test mobile view** with realistic data

---

## 🎉 Happy Testing!

These scripts make it easy to test your election system with realistic data. Perfect for:
- Development
- Demos
- UI testing
- Performance testing
- Training sessions

Questions? Check the scripts:
- `db/fill-fake-data.js`
- `db/clear-fake-data.js`

