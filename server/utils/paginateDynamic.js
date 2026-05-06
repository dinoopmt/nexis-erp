/**
 * Dynamic Pagination Engine for Multi-Page Invoices
 * Measures row heights and intelligently splits items across pages
 * 
 * Flow:
 * 1. Render template in hidden DOM
 * 2. Measure each row height
 * 3. Calculate page breaks based on available space
 * 4. Return page objects with items, broughtForward, carryForward
 */

/**
 * Production-grade Dynamic Pagination Engine (Tally-style safe)
 * 
 * Intelligently splits items across pages with proper:
 * - Dynamic header/footer measurement
 * - Reserved space for Brought Forward / Carry Forward rows
 * - Global serial indexing (continuous across pages)
 * - Minimum rows per page protection
 * - Accurate row height measurement (210mm width match)
 */
async function paginateDynamic(page, items, config = {}) {
  const {
    pageHeight = 1120,
    headerSelector = '.page-header',
    footerSelector = '.page-footer',
    defaultRowHeight = 28,
    summaryHeight = 180,
    reserveBuffer = 10
  } = config;

  return await page.evaluate(
    (items, pageHeight, headerSelector, footerSelector, defaultRowHeight, summaryHeight, reserveBuffer) => {

      // ============ STEP 1: Measure header/footer dynamically ============
      const getHeight = (selector, fallback) => {
        const el = document.querySelector(selector);
        return el ? el.offsetHeight : fallback;
      };

      const headerHeight = getHeight(headerSelector, 280);
      const footerHeight = getHeight(footerSelector, 140);

      const USABLE_HEIGHT = pageHeight - headerHeight - footerHeight;

      let pages = [];
      let currentPageItems = [];
      let currentHeight = 0;
      let globalTotal = 0;
      let pageIndex = 0;
      let globalIndex = 0;

      // ============ STEP 2: Create temporary measurement container ============
      const temp = document.createElement('div');
      temp.style.position = 'absolute';
      temp.style.visibility = 'hidden';
      temp.style.width = '210mm';  // Match A4 width exactly
      document.body.appendChild(temp);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      temp.appendChild(table);

      // ============ STEP 3: Height caching for performance ============
      const heightCache = new Map();

      const measureRow = (item) => {
        // Create cache key from item properties
        const key = `${item.itemName || ''}-${item.itemCode || ''}-${item.quantity || 1}`;

        if (heightCache.has(key)) {
          return heightCache.get(key);
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:6px;font-size:9px;">1</td>
          <td style="padding:6px;font-size:9px;">${item.itemName || ''}</td>
          <td style="padding:6px;font-size:9px;">${item.itemCode || '-'}</td>
          <td style="padding:6px;font-size:9px;">${item.quantity || 1}</td>
          <td style="padding:6px;font-size:9px;">${item.unit || ''}</td>
          <td style="padding:6px;font-size:9px;text-align:right;">${item.unitPrice || 0}</td>
          <td style="padding:6px;font-size:9px;text-align:center;">${item.discountPercentage || '-'}</td>
          <td style="padding:6px;font-size:9px;text-align:right;">${item.total || 0}</td>
        `;

        table.appendChild(tr);
        const h = tr.getBoundingClientRect().height || defaultRowHeight;
        tr.remove();

        heightCache.set(key, h);
        return h;
      };

      // ============ STEP 4: Calculate page usable height (reserve for BF/CF/summary) ============
      const pageUsableHeight = USABLE_HEIGHT - summaryHeight - reserveBuffer;

      // ============ STEP 5: Process each item and build pages ============
      items.forEach((item, index) => {

        // Add global index for continuous serial numbering across pages
        item.globalSerialNumber = globalIndex++;

        const rowHeight = measureRow(item);
        const isLastItem = index === items.length - 1;

        // ============ STEP 6: Pure height-based page break (no fixed row assumptions) ============
        if (currentHeight + rowHeight > pageUsableHeight && currentPageItems.length > 0) {
          // Calculate page total
          const pageTotal = currentPageItems.reduce(
            (s, i) => s + (Number(i.total) || 0),
            0
          );

          // Calculate brought forward (from previous pages)
          const broughtForward = globalTotal;

          // Add this page
          pages.push({
            pageNumber: pageIndex + 1,
            items: currentPageItems,
            itemCount: currentPageItems.length,
            pageTotal: pageTotal,
            broughtForward: broughtForward,
            carryForward: globalTotal + pageTotal,
            isFirstPage: pageIndex === 0,
            isLastPage: false,
            totalPages: 0  // Will be set later
          });

          // Reset for next page
          currentPageItems = [];
          currentHeight = 0;
          pageIndex++;
          globalTotal += pageTotal;  // Update global total
        }

        // Add item to current page
        currentPageItems.push(item);
        currentHeight += rowHeight;
      });

      // ============ STEP 7: Add final page ============
      if (currentPageItems.length > 0) {
        const pageTotal = currentPageItems.reduce(
          (s, i) => s + (Number(i.total) || 0),
          0
        );

        const broughtForward = globalTotal;

        pages.push({
          pageNumber: pageIndex + 1,
          items: currentPageItems,
          itemCount: currentPageItems.length,
          pageTotal: pageTotal,
          broughtForward: broughtForward,
          carryForward: globalTotal + pageTotal,
          isFirstPage: pageIndex === 0,
          isLastPage: true,
          totalPages: 0  // Will be set below
        });
      }

      // ============ STEP 8: Set page metadata (assign once, no redundant loops) ============
      if (pages.length) {
        pages.forEach((p, idx) => {
          p.totalPages = pages.length;
          p.pageNumber = idx + 1;
          p.isFirstPage = idx === 0;
          p.isLastPage = idx === pages.length - 1;
        });
      }

      // ============ STEP 9: Cleanup temporary container ============
      temp.remove();

      return pages;
    },
    items,
    pageHeight,
    headerSelector,
    footerSelector,
    defaultRowHeight,
    summaryHeight,
    reserveBuffer
  );
}

export { paginateDynamic };
