# 🚀 Phase 9: Cutover to Production

**Status:** Final deployment procedure  
**Created:** March 23, 2026  
**Duration:** 30 minutes - 2 hours (depending on strategy)  
**Risk Level:** LOW (with rollback available)

---

## 📋 Pre-Cutover Verification (5 min)

**Execute 5 minutes before cutover:**

```bash
# 1. Verify both components still accessible via test routes
curl -s http://localhost:3000/sales-invoice | grep -q "SalesInvoice"
curl -s http://localhost:3000/sales-invoice-refactored | grep -q "SalesInvoiceNew"
echo "✅ Both routes accessible"

# 2. Verify database backup
ls -lh /backups/nexis_db_$(date +%Y%m%d).sql
echo "✅ Backup available"

# 3. Verify monitoring alerts active
curl -s http://monitoring-dashboard.local/health
echo "✅ Monitoring active"

# 4. Verify team on standby
# Confirm via Slack: "Team, cutover beginning in 5 minutes"
```

---

## 🎯 Cutover Strategies

Choose ONE strategy based on your risk tolerance:

---

## **Strategy 1: Hard Switch (30 min, Recommended for Green Signal)**

**Use if:** All validation passed 100%, full confidence in new component

### Procedure

```bash
# Step 1: Backup current App.jsx
cp /client/src/pages/Home.jsx /backups/Home.jsx.backup.$(date +%s)

# Step 2: Update routing to use new component
# Edit: /client/src/pages/Home.jsx

# CHANGE FROM:
#   <Route path="/sales-invoice" element={<SalesInvoice />} />
#
# CHANGE TO:
#   <Route path="/sales-invoice" element={<SalesInvoiceNew />} />
#   {/* OLD COMPONENT RETIRED */}
#   {/* <Route path="/sales-invoice" element={<SalesInvoice />} /> */}
```

**File Edit:**
```javascript
// OLD
<Route path="/sales-invoice" element={<SalesInvoice />} />

// NEW
<Route path="/sales-invoice" element={<SalesInvoiceNew />} />
```

### Verification Steps
1. Build: `npm run build`
2. Deploy built files to production
3. Clear browser cache (or set cache-busting headers)
4. Test route: `http://localhost:3000/sales-invoice`
5. Verify: Should load new component (SalesInvoiceNew.jsx)
6. Run smoke test: Create test invoice, save, verify success

**Pros:** Simple, fast, clean  
**Cons:** No rollback from route level (must revert code)

**Rollback:**
```bash
# Revert Home.jsx to backup
cp /backups/Home.jsx.backup /client/src/pages/Home.jsx
npm run build
npm run deploy  # or restart app
```

---

## **Strategy 2: Feature Flag (1-2 hours, Safest)**

**Use if:** Want instant rollback without redeploying

### Prerequisites
```bash
# Must have feature flag infrastructure
# Example: LaunchDarkly, Unleash, or custom solution

# Install feature flag library (if not present)
npm install unleash-client
```

### Procedure

**Step 1: Add Feature Flag Check**

Edit `/client/src/pages/Home.jsx`:

```javascript
import { useFlag } from './hooks/useFeatureFlag';

function Home() {
  const useNewSalesInvoice = useFeatureFlag('use_new_sales_invoice');
  
  return (
    <Routes>
      {/* Sales & Distribution */}
      <Route 
        path="/sales-invoice" 
        element={useNewSalesInvoice ? <SalesInvoiceNew /> : <SalesInvoice />} 
      />
      {/* ... rest of routes */}
    </Routes>
  );
}
```

**Step 2: Initialize Feature Flag Service**

Create `/client/src/hooks/useFeatureFlag.js`:

```javascript
import { useContext } from 'react';
import { FeatureFlagContext } from '../context/FeatureFlagContext';

export function useFeatureFlag(flagName) {
  const flags = useContext(FeatureFlagContext);
  return flags?.[flagName] ?? false; // Default to false (safe)
}
```

**Step 3: Turn on Feature Flag**

Option A: Admin Dashboard
```
1. Go to Feature Flags admin
2. Find: "use_new_sales_invoice"
3. Set to: TRUE
4. Apply
5. Wait for propagation (usually < 30 sec)
```

Option B: API Call (for CLI-based flags)
```bash
curl -X POST http://feature-flags-server/api/flags \
  -d '{"name": "use_new_sales_invoice", "enabled": true}'
```

Option C: Environment Variable
```bash
# Add to .env
REACT_APP_USE_NEW_SALES_INVOICE=true

# Rebuild
npm run build
npm run deploy
```

### Verification
1. Refresh browser (not hard refresh)
2. `/sales-invoice` should load new component
3. Test create and save
4. Verify success

**Pros:** Instant rollback (toggle flag off)  
**Cons:** Requires feature flag infrastructure

**Rollback:**
```bash
# Simply turn flag OFF
# Flag: use_new_sales_invoice = FALSE
# Takes effect in < 30 seconds
# No redeploy needed
```

---

## **Strategy 3: Gradual Rollout (2+ hours, Most Conservative)**

**Use if:** Want to test with real users before full switch

### Procedure (Canary Deployment)

**Phase 1: 10% Users (30 min)**
```javascript
// Route decides who gets new component
if (getUserHash() % 100 < 10) {
  // 10% of users see new component
  element={<SalesInvoiceNew />}
} else {
  // 90% use old component
  element={<SalesInvoice />}
}
```

**Phase 2: Monitor (30-60 min)**
- Error rate: Should be ≤ old component
- Completion rate: Should be ≥ old component
- Response time: Should be ≤ old component

**Phase 3: 50% Users (if Phase 2 good)**
```javascript
// Increase to 50% if no critical issues
if (getUserHash() % 100 < 50) {
  element={<SalesInvoiceNew />}
}
```

**Phase 4: Monitor (30-60 min)**
- Same metrics as Phase 2
- Watch for any issues

**Phase 5: 100% Users (if Phase 3-4 good)**
```javascript
// Go live to everyone
element={<SalesInvoiceNew />}
```

**Rollback (any phase):**
```javascript
// Simply revert percentage
if (getUserHash() % 100 < 5) {  // Back to 5%
  element={<SalesInvoiceNew />}
}
// Users see old component immediately
```

---

## **Recommended: Strategy 1 + Strategy 2 Hybrid**

**Best practice approach:**

1. **Immediate Action:** Hard switch to new component (Strategy 1)
2. **Backup Plan:** Keep feature flag ready (Strategy 2)
3. **Monitoring:** Watch for issues for 2 hours
4. **Decision:** If all good, complete cutover; if bad, feature flag rollback

---

## 🔔 Cutover Timeline (Strategy 1: Hard Switch)

```
T-00:05 ┌─ Final verification
        ├─ Backup database
        └─ Notify team
        
T+00:00 ┌─ Deploy new route config
        ├─ Build production bundle
        └─ Deploy to production
        
T+00:05 ┌─ Clear cache / restart servers
        ├─ Verify new component loads
        └─ Smoke test: Create invoice
        
T+00:15 ┌─ Monitor for errors
        ├─ Check error logs
        ├─ Monitor API response times
        └─ Monitor user feedback
        
T+00:30 ┌─ All clear / Minor issues check
        └─ CUTOVER COMPLETE
        
T+01:00 ┌─ Extended monitoring
        └─ Watch for patterns
        
T+02:00 ┌─ Final verification
        └─ Consider retiring old component files
```

---

## ⚠️ Go/No-Go Cutover Checklist

**BEFORE you switch, verify ALL:**

### Pre-Switch Checks (Execute Now)
- [ ] Database backup created
- [ ] Backup location verified: ________________
- [ ] Rollback procedure tested successfully
- [ ] Monitoring alerts armed and tested
- [ ] Error tracking (Sentry/LogRocket) active
- [ ] Load balancer configured (if applicable)
- [ ] All stakeholders aware
- [ ] Team on standby with laptop
- [ ] Communication channel open (Slack/Teams)

### Data Readiness
- [ ] No pending data migrations
- [ ] Database schema compatible
- [ ] API endpoints verified working
- [ ] All microservices up and healthy

### Code Readiness
- [ ] No uncommitted changes
- [ ] All tests passing (npm test)
- [ ] Build successful (npm run build)
- [ ] No console errors in build
- [ ] Deployment artifacts ready

### Network Readiness
- [ ] Production environment accessible
- [ ] SSL certificates valid
- [ ] CDN/Cache configured
- [ ] DNS propagated (if applicable)

---

## 🚀 EXECUTE CUTOVER (Choose ONE Strategy)

### ✅ GO DECISION

**If ALL checkboxes above are checked:**

**Proceed with cutover using chosen strategy → → →**

---

### ❌ NO-GO DECISION

**If ANY issues found:**

**STOP. Do NOT proceed. Instead:**
1. Document issue
2. Fix in development environment
3. Restart from Phase 7 (UAT)
4. Reschedule cutover for next window

---

## 📊 Post-Cutover Monitoring (Critical!)

**For 2 hours after switch, monitor continuously:**

### Error Monitoring
```
Dashboard: Error Rate
Alert threshold: > 2% above baseline
Action if triggered: Immediate rollback
```

### Performance Monitoring
```
Dashboard: Page Load Time
Alert threshold: > 20% slower than baseline
Action if triggered: Investigate performance
```

### User Activity
```
Dashboard: Active Users
Alert threshold: Sudden drop > 30%
Action if triggered: Check for UI blockers
```

### API Health
```
Dashboard: API Response Time
Alert threshold: > 1000ms (slow)
Action if triggered: Check backend services
```

### Common Issues & Responses

| Issue | Detection | Response |
|-------|-----------|----------|
| 404 errors spike | Error dashboard | Verify routes configured |
| Slow load times | Performance dashboard | Check bundle size |
| Users can't save | Error dashboard + support | Verify API endpoint |
| UI elements missing | Error dashboard + screenshot | Check CSS/assets |
| Data inconsistency | Data audit queries | Rollback immediately |

---

## 📝 Cutover Execution Log

**Date:** ________________  
**Time:** ________________  
**Strategy:** ☐ Strategy 1 (Hard)  ☐ Strategy 2 (Flag)  ☐ Strategy 3 (Gradual)

### Pre-Cutover (5 min)
- [ ] Backup created: ________
- [ ] Monitoring active: ________
- [ ] Team notified: ________

### Cutover (Execution)
**Start Time:** ________

**Action:** Deploy new route config
**Duration:** ________ minutes
**Status:** ✅ SUCCESS / ❌ FAILED

**Action:** Build and deploy
**Duration:** ________ minutes
**Status:** ✅ SUCCESS / ❌ FAILED

**Action:** Verify new component active
**Duration:** ________ minutes
**Status:** ✅ SUCCESS / ❌ FAILED

**Action:** Smoke test (create invoice)
**Duration:** ________ minutes
**Status:** ✅ SUCCESS / ❌ FAILED

**End Time:** ________  
**Total Duration:** ________ minutes

### Post-Cutover (Next 2 hours)

**T+00:15**
- [ ] Error rate: ______ % (target < 2%)
- [ ] Page load: ______ ms (baseline: ______)
- [ ] API response: ______ ms (target < 1000ms)
- [ ] Issues: ________________

**T+00:30**
- [ ] Error rate: ______ %
- [ ] Page load: ______ ms
- [ ] API response: ______ ms
- [ ] Issues: ________________

**T+01:00**
- [ ] Error rate: ______ %
- [ ] Page load: ______ ms
- [ ] API response: ______ ms
- [ ] Issues: ________________

**T+02:00**
- [ ] Error rate: ______ %
- [ ] Page load: ______ ms
- [ ] API response: ______ ms
- [ ] Issues: ________________

### Final Status
```
✅ CUTOVER SUCCESSFUL - All systems nominal
✅ New component stable - No critical issues
✅ Monitoring normal - No alerts triggered
✅ Users happy - Positive feedback

APPROVED FOR: Retire old component or keep as backup
```

---

## 🎉 Post-Cutover Actions (Day +1)

**Next day, verify everything still working:**

- [ ] No overnight errors
- [ ] Data integrity verified
- [ ] Reports generated correctly
- [ ] Backup procedure confirmed working
- [ ] Monitoring alerts normal
- [ ] Team confidence high

---

## 📋 Sign-Off: Cutover Complete

**Cutover execution completed successfully.**

I confirm that:
- ✅ New component deployed to production
- ✅ Old component moved to fallback rotation
- ✅ No critical issues encountered
- ✅ All monitoring normal
- ✅ Performance acceptable
- ✅ Users can use system normally

**By:** ________________ (Deployment Lead)  
**Date:** ________________  
**Time:** ________________

---

## ✨ REFACTORING PROJECT COMPLETE

```
✅ Phase 1: Routes configured
✅ Phase 2: Feature parity tested
✅ Phase 3: Regression tested
✅ Phase 4: Automated tests passing
✅ Phase 5: Performance verified
✅ Phase 6: API compatibility confirmed
✅ Phase 7: UAT approved
✅ Phase 8: Sign-off complete
✅ Phase 9: LIVE IN PRODUCTION

🎊 NEW MODULAR ARCHITECTURE DEPLOYED 🎊
🎊 REFACTORING SUCCESSFUL 🎊
```

---

## 📚 Decommissioning Old Component (Optional)

Once new component stable for 2+ weeks, optionally:

```bash
# Delete old SalesInvoice.jsx
rm /client/src/components/sales/SalesInvoice.jsx

# Delete old imports from Home.jsx
# Remove: import SalesInvoice from ...

# Delete old route from Home.jsx
# Remove: <Route path="/sales-invoice-old" element={<SalesInvoice />} />

# Commit changes
git commit -m "Retire old SalesInvoice component (refactored)"
git push
```

**Backup:** Archive old file in `/backups/components/SalesInvoice.jsx`

---

## 🏁 Final Word

**Congratulations!** You've successfully:

✅ Refactored a 2822-line monolithic component into modular architecture  
✅ Created reusable services, hooks, and state management  
✅ Maintained 100% feature parity with old version  
✅ Passed comprehensive testing (regression, performance, UAT)  
✅ Deployed to production with zero critical issues  

**Your codebase is now:**
- ✅ More maintainable
- ✅ Better tested
- ✅ More reusable
- ✅ Production ready

---

**Thank you for following Option B (Parallel Development).**

**This approach ensured safe, validated deployment with minimal business risk.**

---

**Project Completion Date:** ________________  
**Next Phase:** Monitor production, gather feedback for v2 enhancements
