# 📊 Phase 5: Performance Benchmarks

**Status:** Ready for execution  
**Created:** March 23, 2026  
**Purpose:** Ensure new component maintains or improves performance

---

## 🎯 Browser DevTools Performance Testing

### Test Environment
- Browser: Chrome / Edge / Firefox (latest)
- Network: Fast 3G or throttled to simulate real conditions
- Device: Desktop (laptop)
- Cache: Disabled during testing

---

## ⚡ Performance Metrics

### 1. Component Bundle Size

**Measurement Tool:** Webpack Bundle Analyzer

```bash
# Install if not already present
npm install --save-dev webpack-bundle-analyzer

# Build and analyze
npm run build
npm run analyze
```

**Expected Results:**

| Package | Old Size | New Size | Target | Status |
|---------|----------|----------|--------|--------|
| SalesInvoice.jsx | ~85KB | [MEASURE] | < 85KB | ✅/❌ |
| Services Layer | - | ~20KB | - | ✅/❌ |
| Hooks | - | ~15KB | - | ✅/❌ |
| Total Delta | - | [MEASURE] | -5% | ✅/❌ |

**Measurement Steps:**
1. Build old version: `npm run build 2>&1 | grep -i "sales"`
2. Note: SalesInvoice.jsx bundle size
3. Build new version with both components
4. Compare sizes in bundle analyzer
5. Document improvement or regression

---

### 2. Initial Page Load Time

**Measurement Tool:** Chrome DevTools > Performance

**Test Steps:**
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Check "Disable cache" option
4. Navigate to `/sales-invoice` (old) and record:
   - Time to First Paint (FP)
   - Time to First Contentful Paint (FCP)
   - Time to Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
5. Navigate to `/sales-invoice-refactored` (new) and repeat
6. Compare metrics

**Expected Results:**

| Metric | Old (ms) | New (ms) | Target | Status |
|--------|----------|----------|--------|--------|
| FCP | [MEASURE] | [MEASURE] | ≤ old | ✅/❌ |
| LCP | [MEASURE] | [MEASURE] | ≤ old | ✅/❌ |
| CLS | [MEASURE] | [MEASURE] | < 0.1 | ✅/❌ |

**Recording Note:**
- Perform 3 runs each, calculate average
- FCP < 2500ms is good
- LCP < 4000ms is good
- CLS < 0.1 is good

---

### 3. Add Item Performance

**Objective:** Test "add item" action speed

**Test Steps (DevTools Performance Tab):**
1. Navigate to `/sales-invoice`
2. Create invoice, select customer
3. Start recording Performance
4. Click "Add Item" button or press Ctrl+N
5. Type product name "Laptop"
6. Select from dropdown
7. Stop recording
8. Measure time from action to UI update

**Expected Results:**

| Action | Old (ms) | New (ms) | Target | Status |
|--------|----------|----------|--------|--------|
| Type product name | < 100 | [MEASURE] | ≤ old | ✅/❌ |
| Show dropdown | < 200 | [MEASURE] | ≤ old | ✅/❌ |
| Select item | < 150 | [MEASURE] | ≤ old | ✅/❌ |
| Add to grid | < 300 | [MEASURE] | ≤ old | ✅/❌ |

---

### 4. Save Invoice Performance

**Test Steps:**
1. Create invoice with 10 items
2. Start recording Performance
3. Click Save button
4. Wait for API response
5. Stop recording
6. Measure:
   - Time to API call completion
   - Time to UI update (success message)
   - Time to form reset (if applicable)

**Expected Results:**

| Phase | Old (ms) | New (ms) | Target | Status |
|-------|----------|----------|--------|--------|
| Save action start | [MEASURE] | [MEASURE] | ≤ old | ✅/❌ |
| API request sent | < 50 | [MEASURE] | ≤ old | ✅/❌ |
| API response received | < 500 | [MEASURE] | ≤ 500ms | ✅/❌ |
| UI update | < 100 | [MEASURE] | ≤ old | ✅/❌ |
| Total time | < 650 | [MEASURE] | ≤ old | ✅/❌ |

---

### 5. Memory Usage

**Test Steps (DevTools Memory Tab):**
1. Open Chrome DevTools > Memory tab
2. Take heap snapshot (old component)
3. Perform 5 typical workflows:
   - Create invoice
   - Add 5 items
   - Change customer
   - Apply discounts
   - Save invoice
4. Take another heap snapshot
5. Compare heap sizes
6. Check for memory leaks (should plateau, not grow continuously)
7. Repeat for new component

**Expected Results:**

| Metric | Old | New | Target | Status |
|--------|-----|-----|--------|--------|
| Initial heap | [MB] | [MB] | - | |
| After workflow | [MB] | [MB] | - | |
| Heap delta | [MB] | [MB] | < 5MB | ✅/❌ |
| Memory leaks | ✅/❌ | ✅/❌ | None | ✅/❌ |

**Leak Detection:**
- Perform workflow 10 times
- Compare heap size at start vs end
- If heap grows unbounded → memory leak detected

---

### 6. Render Count & Re-renders

**Test Steps (React DevTools):**
1. Install React DevTools extension if not present
2. Open extension in Chrome DevTools
3. Go to "Profiler" tab
4. Start recording
5. Perform single action: Add one item
6. Stop recording
7. Analyze:
   - How many components re-rendered?
   - Which components re-rendered unnecessarily?
   - What was render duration?

**Expected Results:**

| Metric | Old | New | Target | Status |
|--------|-----|-----|--------|--------|
| Total renders for "add item" | [COUNT] | [COUNT] | ≤ 15 | ✅/❌ |
| Unnecessary re-renders | [COUNT] | [COUNT] | 0 | ✅/❌ |
| Average render time | [ms] | [ms] | < 50ms | ✅/❌ |

---

### 7. Network Performance

**Test Steps:**
1. Open Chrome DevTools > Network tab
2. Set throttling to "Fast 3G"
3. Navigate to `/sales-invoice`
4. Perform full workflow:
   - Create invoice
   - Add customer
   - Add 3 items
   - Save invoice
5. Record:
   - Number of HTTP requests
   - Total data transferred
   - Time to complete
6. Repeat for new component

**Expected Results:**

| Metric | Old | New | Target | Status |
|-------|-----|-----|--------|--------|
| Total requests | [COUNT] | [COUNT] | ≤ old | ✅/❌ |
| Total data (KB) | [KB] | [KB] | ≤ old | ✅/❌ |
| Largest request (KB) | [KB] | [KB] | < 500KB | ✅/❌ |
| Time to complete (s) | [s] | [s] | ≤ old | ✅/❌ |

---

## 🔧 Automated Performance Testing (Lighthouse)

### Run Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install --save-dev @lhci/cli@^0.8.0 @lhci/config-builder

# Run audit on local server
# Make sure server is running on localhost:3000
lighthouse http://localhost:3000/sales-invoice --output-path ./lighthouse-old.html
lighthouse http://localhost:3000/sales-invoice-refactored --output-path ./lighthouse-new.html
```

### Lighthouse Metrics

| Category | Old Score | New Score | Target | Status |
|----------|-----------|-----------|--------|--------|
| Performance | [0-100] | [0-100] | ≥ 80 | ✅/❌ |
| Accessibility | [0-100] | [0-100] | ≥ 90 | ✅/❌ |
| Best Practices | [0-100] | [0-100] | ≥ 90 | ✅/❌ |
| SEO | [0-100] | [0-100] | ≥ 80 | ✅/❌ |

---

## 📈 Performance Regression Limits

**Acceptable Performance Changes:**

| Metric | Max Regression | Max Improvement |
|--------|---|---|
| Page Load (FCP) | +20% | Unlimited |
| Memory Usage | +10% | Unlimited |
| Add Item Time | +15% | Unlimited |
| Save Time | +10% | Unlimited |
| Bundle Size | -5% | +100KB |

**If regression exceeds limits:** File issue and optimize before proceeding to Phase 6

---

## 🧪 Load Testing (Optional - Advanced)

```bash
# Install Apache JMeter or use k6
npm install --save-dev k6

# Sample k6 load test
# See example below
```

**Example K6 Load Test** (`load-test.js`):
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const baseURL = 'http://localhost:3000/sales-invoice-refactored';
  
  // Simulate visiting page
  const res = http.get(baseURL);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'load time < 2s': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

Run: `k6 run load-test.js`

---

## 📊 Results Summary

**Performance Benchmark - [Date]**

### Overall Assessment

| Category | Result | Pass? |
|----------|--------|-------|
| Bundle Size | [MEASURE] | ✅/❌ |
| Page Load | [MEASURE] | ✅/❌ |
| Add Item | [MEASURE] | ✅/❌ |
| Save Invoice | [MEASURE] | ✅/❌ |
| Memory Usage | [MEASURE] | ✅/❌ |
| Renders | [MEASURE] | ✅/❌ |
| Network | [MEASURE] | ✅/❌ |
| Lighthouse Score | [MEASURE] | ✅/❌ |

**Pass Criteria:** 7/8 benchmarks pass (87.5%)

---

## 🚨 Performance Issues Found

### Critical (Must Fix)
- [Issue]: [Description] [Action]

### Major (Should Fix)
- [Issue]: [Description] [Action]

### Minor (Note)
- [Issue]: [Description] [Action]

---

## ✅ Sign-Off

- [ ] All benchmarks recorded
- [ ] 7/8 benchmarks passing
- [ ] No critical performance regressions
- [ ] Ready for Phase 6 (API Compatibility)

**Tester Name:** ________________  
**Date:** ________________  
**Signature:** ________________
