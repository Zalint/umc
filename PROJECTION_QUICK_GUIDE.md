# Quick Guide: Election Projection System

## 🚀 **Getting Started (5 Minutes)**

### **Step 1: Setup Sample Stations (Admin Only)**

1. Login as **Admin**
2. Go to **Menu → Projections → Setup**
3. Click **"Auto-Select Sample Stations"**
4. System selects 74 stations (10% of 730) stratified by region
5. Review and adjust if needed

**Or manually:**
- Browse stations by region
- Click checkbox to mark/unmark as sample station
- Aim for ~10% per region

---

### **Step 2: Election Day Priority**

**Sample stations count FIRST:**
- 74 projection stations report results immediately
- Remaining 656 stations counted after projection

**Workflow:**
1. Polls close (5:00 PM)
2. Projection stations count (5:00 - 6:30 PM)
3. Results submitted to system
4. **Projection available** (7:00 PM - 2 hours after close)
5. Remaining stations continue normal counting

---

### **Step 3: View Projection**

**All Users:**
1. Go to **Menu → Projections → Results**
2. See live projection as sample stations report

**Dashboard shows:**
- Current leader
- Percentage with confidence interval
- Sample coverage (e.g., 68/74 stations = 92%)
- Regional breakdown

---

## 📊 **Understanding the Results**

### **Example Display:**

```
United Movement for Change (UMC)
54.5% (±3.2%)
Confidence: [51.3%, 57.7%]
Projected Votes: 368,450

Sample Coverage: 70/74 (94.6%)
Confidence Level: 95%
```

**What it means:**
- UMC is projected to get **54.5%** of votes
- True result likely between **51.3% and 57.7%**
- Based on **70 of 74** sample stations
- **95% confidence** this projection is accurate

---

## 🎯 **When Can You Call a Winner?**

### **High Confidence (Can Project Winner):**
✅ Sample coverage: >90% (67+ of 74 stations)  
✅ Lead bigger than 2× margin of error  
✅ Consistent across all regions

**Example:**
```
UMC: 54.5% (±3.2%)
UDP: 38.2% (±3.1%)
Gap: 16.3% >> 6.4% (2× MoE)
→ UMC is the projected winner ✓
```

### **Too Close to Call:**
⚠️ Lead smaller than margin of error  
⚠️ Sample coverage <70%  
⚠️ Conflicting regional results

**Example:**
```
UMC: 48.2% (±3.5%)
UDP: 46.8% (±3.4%)
Gap: 1.4% < 3.5% (MoE)
→ Wait for more data ⏳
```

---

## 🔢 **Sample Distribution**

| Region          | Total | Sample | %     |
|-----------------|-------|--------|-------|
| Banjul          | 32    | 3      | 9.4%  |
| Kanifing        | 98    | 10     | 10.2% |
| Western         | 120   | 12     | 10.0% |
| Lower River     | 95    | 10     | 10.5% |
| North Bank      | 78    | 8      | 10.3% |
| Central River   | 160   | 16     | 10.0% |
| Upper River     | 147   | 15     | 10.2% |
| **TOTAL**       | **730** | **74** | **10.1%** |

**Each region represented proportionally!**

---

## ✅ **Reliability Checklist**

Before trusting the projection, verify:

- [ ] Sample stations selected randomly (or auto-selected)
- [ ] All 7 regions represented
- [ ] At least 67 of 74 stations reported (90%+)
- [ ] Results consistent across regions
- [ ] Winner's lead > 2× margin of error
- [ ] No reports of irregularities

---

## ⚠️ **Important Notes**

### **Projection ≠ Final Result**

- Projection is **statistical estimate**
- Final result comes from **all 730 stations**
- Projection usually accurate within ±3-4%
- Close races may need full count

### **When NOT to Use:**

❌ Less than 50 sample stations reported  
❌ Lead within margin of error  
❌ Irregular turnout patterns  
❌ Reports of fraud or manipulation

---

## 📱 **User Roles & Access**

| Role    | Can View Projection | Can Setup Sample | Can Submit Results |
|---------|---------------------|------------------|---------------------|
| Admin   | ✅ Yes              | ✅ Yes           | ✅ Yes              |
| Manager | ✅ Yes              | ❌ No            | ✅ Yes              |
| Member  | ✅ Yes              | ❌ No            | ✅ Yes (assigned)   |
| Reader  | ✅ Yes              | ❌ No            | ❌ No               |

---

## 🎓 **Key Concepts**

### **Stratified Sampling:**
- Divide country into regions (strata)
- Sample proportionally from each
- Ensures all areas represented

### **Margin of Error (MoE):**
- Range of uncertainty
- Example: 54% ±3% = [51%, 57%]
- Smaller = more accurate

### **Confidence Level:**
- 95% = 95 times out of 100, projection will be correct
- Higher confidence = wider margin of error

### **Sample Coverage:**
- Percentage of sample stations that reported
- Higher coverage = more reliable projection
- Aim for 90%+ (67+ stations)

---

## 🚨 **Troubleshooting**

**"Sample coverage too low"**
→ Wait for more stations to report
→ Target: 67+ of 74 (90%)

**"Too close to call"**
→ Candidates within margin of error
→ Wait for final count

**"Conflicting regional results"**
→ Check for data entry errors
→ Verify unusual patterns

**"Projection not available"**
→ Ensure sample stations are selected
→ Check that projection is activated (Settings)

---

## 📞 **Quick Commands**

### **Admin - Setup:**
```
1. Menu → Projections → Setup
2. Click "Auto-Select Sample Stations"
3. Review selection
4. Activate projection
```

### **All Users - View:**
```
1. Menu → Projections → Results
2. View live projection
3. Check sample coverage
4. Review confidence intervals
```

### **Priority Counting:**
```
1. Go to "Submit Results"
2. Sample stations marked with ⭐
3. Submit these FIRST on election day
4. System auto-calculates projection
```

---

## 📊 **Expected Timeline**

```
Election Day:
17:00  Polls close
17:30  Sample stations start counting
18:30  First results submitted
19:00  Projection available (50% coverage)
19:30  Projection refined (80% coverage)
20:00  High confidence projection (90%+ coverage)
23:00  Final results available (all 730 stations)
```

---

## ✨ **Best Practices**

1. **Setup Early:** Select sample stations 1 week before election
2. **Publish List:** Announce sample stations publicly
3. **Train Staff:** Ensure sample stations know they're priority
4. **Monitor Coverage:** Watch dashboard for reporting rates
5. **Communicate Clearly:** Always say "projection" not "final result"
6. **Wait for Confidence:** Don't call winner until 90%+ coverage
7. **Update Regularly:** Refresh projection as more stations report

---

## 🎯 **Success Indicators**

**Green Light (Reliable):**  
✅ 90%+ coverage  
✅ Lead > 2× MoE  
✅ Regional consistency

**Yellow Light (Cautious):**  
⚠️ 70-89% coverage  
⚠️ Lead = 1-2× MoE  
⚠️ Some variance

**Red Light (Wait):**  
❌ <70% coverage  
❌ Lead < MoE  
❌ High variance

---

## 📚 **Related Documentation**

- **[PROJECTION_MATH_EXPLAINED.md](PROJECTION_MATH_EXPLAINED.md)** - 🧮 Why the math works (Law of Large Numbers, Central Limit Theorem, etc.)
- **[PROJECTION_METHODOLOGY.md](PROJECTION_METHODOLOGY.md)** - 📊 Full technical methodology and implementation
- **API Documentation:** `/api/projections/*` - API endpoints reference

