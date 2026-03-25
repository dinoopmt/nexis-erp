# 👥 Phase 7: User Acceptance Testing (UAT)

**Status:** Ready to execute  
**Created:** March 23, 2026  
**Duration:** 2-4 hours  
**Participants:** End users, QA, Product managers

---

## 📋 UAT Objective

End users test the new component as if it were production, reporting:
- ✅ What works well?
- 👎 What's confusing?
- 🐛 What bugs did you find?
- 💡 Any suggestions?

---

## 🎯 UAT Test Script

### Introduction (5 min)

> "Thank you for testing our new Sales Invoice system. We've refactored the code for better maintainability, but the functionality remains the same. Please use this system as you normally would for creating 5-10 invoices. Try all the features you typically use. When you encounter anything unexpected, take a screenshot and note it."

**Test URL:** `http://localhost:3000/sales-invoice-refactored`

---

## ✅ UAT Test Scenarios

### Scenario 1: Create Simple Invoice (20 min)

**Job Title:** Sales Officer  
**Task:** "Create and print a simple invoice for a customer"

**Steps:**
1. Go to the Sales Invoice page
2. Create a new invoice
3. Select a regular customer (not new)
4. Add 2-3 products (search by name)
5. Verify totals look correct
6. Save the invoice
7. Print the invoice
8. Review printout

**Success Criteria:**
- [ ] Form loads quickly
- [ ] Customer selection easy
- [ ] Product search works
- [ ] Numbers add up correctly
- [ ] Print looks professional
- [ ] No errors encountered

**Questions for User:**
- Did the form feel responsive?
- Was finding the customer easy?
- Did the product search work well?
- Were the totals clear?

---

### Scenario 2: Complex Invoice with Discounts (30 min)

**Job Title:** Senior Sales Officer  
**Task:** "Create a complex invoice with discounts and multiple items"

**Steps:**
1. Create new invoice
2. Select customer with tax rate ≠ 18%
3. Add 5+ different products
4. Apply per-item line discounts on 2 items
5. Apply invoice-level discount (10% or ₹500)
6. Verify profit margin shown
7. Edit one item's quantity
8. Remove one item
9. Save and view saved invoice
10. Navigate via keyboard (Tab to move between cells)

**Success Criteria:**
- [ ] Discounts applied correctly
- [ ] Totals recalculate after changes
- [ ] Keyboard navigation works
- [ ] Edit/delete operations smooth
- [ ] No calculation errors
- [ ] Interface feels natural

**Questions for User:**
- Was applying discounts intuitive?
- Did numbers update correctly?
- Were keyboard shortcuts helpful?
- Any calculations seemed wrong?

---

### Scenario 3: High-Volume Entry (30 min)

**Job Title:** Warehouse Invoice Operator  
**Task:** "Quickly enter a rush order with many items"

**Steps:**
1. Create invoice
2. Scan barcodes for 20+ items (use barcode scanner or paste codes)
3. Adjust quantities using keyboard
4. Use Ctrl+N shortcut to add rows quickly
5. Apply bulk discount
6. Save invoice

**Success Criteria:**
- [ ] Barcode scanning works
- [ ] Keyboard shortcuts effective
- [ ] No slowdowns with many items
- [ ] Can complete in < 5 minutes

**Questions for User:**
- Did barcode scanning work smoothly?
- Keyboard shortcuts helpful?
- Any performance lag?
- Time to complete: ___ minutes

---

### Scenario 4: Troubleshooting & Edge Cases (20 min)

**Job Title:** QA/Power User  
**Task:** "Find edge cases and potential issues"

**Steps:**
1. Try to save without customer → Verify error message
2. Try to save with zero quantity items → Verify error
3. Try negative discounts → Verify rejected
4. Add item with insufficient stock → Verify warning
5. Edit same cell multiple times → Verify changes persist
6. Close browser dev tools → Verify console clean
7. Switch between customers → Verify form updates
8. Try very long product names → Verify display

**Success Criteria:**
- [ ] Validation prevents bad data
- [ ] Error messages clear
- [ ] No console errors
- [ ] Edge cases handled gracefully

**Questions for User:**
- Did error messages help troubleshoot?
- Found any unexpected behaviors?
- Any bugs to report?

---

### Scenario 5: Comparison Test (Optional, 20 min)

**Job Title:** QA Lead  
**Task:** "Compare old and new versions side by side"

**Steps (Two Browsers/Tabs):**
1. Open old version: `/sales-invoice`
2. Open new version: `/sales-invoice-refactored`
3. Side-by-side test the same workflow:
   - Create invoice
   - Add customer
   - Add items
   - Apply discount
   - Save
4. Compare results
5. Note any differences

**Differences to Report:**
- [ ] Behavior differences
- [ ] UI differences
- [ ] Response time differences
- [ ] Data differences

---

## 📝 UAT Feedback Form

**User:** ________________  
**Date:** ________________  
**Duration:** _____ minutes  
**Scenarios Completed:** ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ 5

---

### Positive Feedback

**What worked well?**
```
[User enters positive observations]
1. 
2. 
3. 
```

**Were there any surprises (good)?**
```
1. 
2. 
```

---

### Issues & Problems

**What was confusing?**
```
1. [Issue] [Impact: High/Med/Low]
2. [Issue] [Impact: High/Med/Low]
```

**Did you encounter any bugs?**
```
1. [Bug Description] [Steps to reproduce]
2. [Bug Description] [Steps to reproduce]
```

**Any errors or crashes?**
```
1. [Error message] [When it occurred]
```

---

### Suggestions for Improvement

**Any feature requests?**
```
1. 
2. 
```

**Anything we should remove/change?**
```
1. 
2. 
```

---

### Overall Assessment

**On a scale of 1-10, how would you rate this version?** _____ / 10

**Explanation:** __________________________________________________________

**Would you use this over the old version?** ☐ Yes ☐ No ☐ Maybe

**Why?** _________________________________________________________________

---

### Comparison (If Applicable)

**Compared to old version:**
- [ ] New is better
- [ ] Old is better
- [ ] About the same
- [ ] Didn't notice much difference

**How?** __________________________________________________________________

---

## 📊 UAT Results Summary

### Participant Scores

| Participant | Role | Scenario 1 | Scenario 2 | Scenario 3 | Scenario 4 | Issues | Overall |
|---|---|---|---|---|---|---|---|
| User 1 | [Role] | ✅ | ✅ | ✅ | ✅ | 0 | 10/10 |
| User 2 | [Role] | ✅ | ✅ | ⚠️ | ✅ | 1 | 9/10 |
| User 3 | [Role] | ✅ | ✅ | ✅ | ✅ | 0 | 10/10 |

**Average Score:** ______ / 10

**Pass Criteria:** ≥ 8/10 overall OR no critical issues

---

### Issues Summary

#### Critical (Block UAT)
- [ ] [Issue] — [Status] [Owner]

#### Major (Should Fix Before Cutover)
- [ ] [Issue] — [Status] [Owner]

#### Minor (Document, Can Fix Later)
- [ ] [Issue] — [Status] [Owner]

---

## ✅ UAT Sign-Off

- [ ] All 5 scenarios completed
- [ ] Feedback collected from ≥ 3 users
- [ ] Average score ≥ 8/10
- [ ] No critical issues
- [ ] Users comfortable with new version
- [ ] Ready for Phase 8 (Sign-off)

---

## 📋 UAT Participant Checklist

**Before UAT:**
- [ ] Test environment is stable
- [ ] Both old and new components accessible
- [ ] API endpoints working
- [ ] Sample data available (products, customers)
- [ ] Printers configured (for print testing)

**During UAT:**
- [ ] Monitor for errors in console
- [ ] Take screenshots of any issues
- [ ] Record any unexpected behavior
- [ ] Time how long workflows take

**After UAT:**
- [ ] Collect all feedback forms
- [ ] Screenshot any bugs found
- [ ] Create issues in tracking system
- [ ] Prioritize fixes
- [ ] Schedule next session if needed

---

## 📞 Support During UAT

**If user encounters issue:**
1. Ask them to screenshot/describe problem
2. Try to reproduce
3. Document for the development team
4. Continue with other test scenarios
5. Don't stop UAT for single issue

**Critical issue during UAT?**
- Pause that scenario
- Move to next scenario
- Investigate after UAT
- May require Phase 3/4 regression

---

## 🎓 UAT Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Participants | ≥ 3 users | [   ] |
| Avg. Score | ≥ 8/10 | [   ] |
| Completion Rate | ≥ 80% | [   ] |
| Critical Issues | 0 | [   ] |
| Major Issues | ≤ 2 | [   ] |
| User Confidence | "Would use new" | [   ] |

**Pass if:** All targets met → Proceed to Phase 8

---

**Next:** Phase 8 (Sign-off Validation)  
**Timeline:** 2-4 hours testing + 1 hour analysis = ~3-5 hours total
