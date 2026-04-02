import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Edit2 } from 'lucide-react';

const VirtualizedProductTable = ({
  productsMap = {},
  totalProducts = 0,
  onPageChange = () => {},
  isLoading = false,
  onEdit = () => {},
  itemsPerPage = 50,
  rowHeight = 24,
  containerHeight = 600,
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lastFetchedPageRef = useRef(null);

  const visibleItemsPerScreen = Math.ceil(containerHeight / rowHeight);
  const virtualStartIndex = Math.floor(scrollTop / rowHeight);
  const virtualEndIndex = virtualStartIndex + visibleItemsPerScreen;

  // Get visible products directly from sparse map
  const visibleProducts = [];
  for (let i = virtualStartIndex; i < virtualEndIndex; i++) {
    visibleProducts.push({ index: i, product: productsMap[i] || null });
  }
  
  // DEBUG: Log what's rendering
  const visibleProductCount = visibleProducts.filter(v => v.product).length;
  if (visibleProducts.length > 0) {
    console.log(`✅ RENDER: ${visibleProductCount}/${visibleProducts.length} visible (indices ${virtualStartIndex}-${virtualEndIndex - 1}), mapSize=${Object.keys(productsMap).length}`);
  }

  const handleScroll = (e) => setScrollTop(e.target.scrollTop);

  // SMART FETCH: intelligent page loading based on scroll position
  useEffect(() => {
    if (isLoading) return;

    const totalLoadedItems = Object.keys(productsMap).length;
    const hasMore = totalLoadedItems < totalProducts;
    if (!hasMore) return;

    const gap = virtualStartIndex - totalLoadedItems;

    // 🚀 Jump Scroll: far ahead (gap > 1000 items)
    if (gap > 1000) {
      const targetPageIndex = Math.floor(virtualStartIndex / itemsPerPage);
      const targetPage = targetPageIndex + 1; // Convert from 0-indexed to 1-indexed for API
      
      // Only fetch if we haven't just fetched this page (debounce repeated jumps)
      if (lastFetchedPageRef.current !== targetPage) {
        lastFetchedPageRef.current = targetPage;
        console.log(`🚀 JUMP SCROLL: virtualStartIndex=${virtualStartIndex}, targetPage=${targetPage}, fetching ${targetPage}-${targetPage + 2}`);

        // Fetch target + 2 pages immediately (parallel, no stagger)
        for (let i = 0; i <= 2; i++) {
          const page = targetPage + i;
          if (page * itemsPerPage < totalProducts) {
            onPageChange(page); // Hook tracks what's already fetched internally
          }
        }
      }
      return;
    }

    // 📥 Normal Scroll: near end of loaded items
    if (virtualEndIndex >= totalLoadedItems - 25) {
      const nextPageIndex = Math.floor(totalLoadedItems / itemsPerPage);
      const nextPage = nextPageIndex + 1; // Convert from 0-indexed to 1-indexed for API
      console.log(`📥 NORMAL SCROLL: fetching page ${nextPage}`);
      onPageChange(nextPage);
    }
  }, [virtualStartIndex, virtualEndIndex, isLoading, onPageChange, itemsPerPage, totalProducts, productsMap]);

  // Product Row - shows instantly when available, no fade delay
  const ProductRow = ({ product, index }) => {
    return (
      <div
        className="flex items-center gap-2 px-4 py-0 border-b hover:bg-blue-50 transition-colors duration-300"
        style={{ height: rowHeight }}
      >
        <div className="w-[5%] flex justify-end font-mono text-sm pb font-semibold truncate">{product?.itemcode || '-'}</div>
        <div className="w-[32%] flex justify-start truncate text-sm">{product?.name || '-'}</div>
        <div className="w-[12%] flex justify-start text-sm text-gray-600 truncate">
          {typeof product?.categoryId === 'object' ? product.categoryId?.name || '-' : '-'}
        </div>
        <div className="w-[12%] flex justify-start text-sm text-gray-600 truncate">
          {typeof product?.vendor === 'object' ? product.vendor?.name || '-' : '-'}
        </div>
        <div className="w-[26%] flex justify-end font-sm font-semibold text-xs text-gray-500" title={product?.barcode || '-'}>{product?.barcode || '-'}</div>
        <div className="w-[5%] flex justify-end text-sm">{parseFloat(product?.cost || 0).toFixed(2)}</div>
        <div className="w-[5%] flex justify-end text-sm font-semibold text-green-600">{parseFloat(product?.price || 0).toFixed(2)}</div>
        <div className="w-[5%] flex justify-end text-sm font-semibold" title={`Total: ${product?.currentStock?.totalQuantity || 0}, Available: ${product?.currentStock?.availableQuantity || 0}`}>{product?.currentStock?.availableQuantity || 0}</div>
        <div className="w-[5%] flex gap-1 justify-end">
          <button onClick={() => onEdit(product)} className="p-1 hover:bg-blue-100 rounded transition" title="Edit">
            <Edit2 size={16} className="text-blue-600" />
          </button>
        </div>
      </div>
    );
  };

  // Skeleton row
  const SkeletonRow = () => (
    <div className="flex items-center gap-2 px-4 py-0 border-b bg-gray-50 animate-pulse" style={{ height: rowHeight }}>
      {[...Array(9)].map((_, i) => <div key={i} className={`h-4 bg-gray-300 rounded ${i === 1 ? 'w-[40%]' : i === 2 || i === 3 ? 'w-[15%]' : i === 4 ? 'w-[10%]' : 'w-[5%]'}`}></div>)}
    </div>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-1 bg-gray-100 border-b font-semibold sticky top-0 z-10 text-sm bg-gray-200">
        <div className="w-[5%] flex justify-end">Code</div>
        <div className="w-[37%] flex justify-start">Product Name</div>
        <div className="w-[14%] flex justify-start">Department</div>
        <div className="w-[14%] flex justify-start">Vendor</div>
        <div className="w-[10%] flex justify-end">Barcode</div>
        <div className="w-[5%] flex justify-center">Cost</div>
        <div className="w-[5%] flex justify-center">Price</div>
        <div className="w-[5%] flex justify-center">Stock</div>
        <div className="w-[5%] flex justify-center">Actions</div>
      </div>

      {/* Virtualized Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-scroll"
        style={{
          height: containerHeight,
          position: 'relative',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // Smooth momentum scrolling on iOS
        }}
      >
        <div style={{
          height: Math.max(totalProducts * rowHeight, containerHeight),
          position: 'relative',
          pointerEvents: 'none',
          minHeight: containerHeight,
        }}>
          {visibleProducts.map(({ index, product }) => (
            <div key={index} style={{ position: 'absolute', top: index * rowHeight, left: 0, right: 0, height: rowHeight, pointerEvents: 'auto' }}>
              {product ? <ProductRow product={product} index={index} /> : (isLoading ? <SkeletonRow /> : null)}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center px-4 py-1 bg-gray-50 border-t text-xs text-gray-600 justify-between">
        <div>
          {(() => {
            const actualProducts = Object.values(productsMap).filter(p => p);
            console.log('📊 FOOTER DEBUG:', {
              mapKeys: Object.keys(productsMap).length,
              mapValues: Object.values(productsMap),
              actualCount: actualProducts.length,
              totalProducts,
            });
            return `Showing ${actualProducts.length.toLocaleString()} of ${totalProducts.toLocaleString()} products`;
          })()}
        </div>
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Loading...</span>
            {(() => {
              console.log(`🔴 FOOTER SPINNER VISIBLE: isLoading=${isLoading}, productsMap size=${Object.keys(productsMap).length}, totalProducts=${totalProducts}`);
              return null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedProductTable;
