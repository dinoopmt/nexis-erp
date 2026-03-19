import { useState, useMemo } from 'react';

/**
 * Hook for managing product search, filtering, and pagination
 * Handles: search, filters, pagination, filtered results
 */
export function useProductFilters(products = []) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedForPrint, setSelectedForPrint] = useState([]);
  
  const [advancedFilters, setAdvancedFilters] = useState({
    vendor: '',
    minCost: '',
    maxCost: '',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
    category: '',
    subCategory: '',
  });

  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    let result = products.filter((prod) =>
      (prod.name?.toLowerCase?.() || '').includes(search.toLowerCase()) ||
      (prod.barcode?.toLowerCase?.() || '').includes(search.toLowerCase()) ||
      (prod.itemcode?.toLowerCase?.() || '').includes(search.toLowerCase())
    );

    // Apply advanced filters
    if (Object.values(advancedFilters).some((v) => v)) {
      result = result.filter((prod) => {
        if (advancedFilters.vendor && prod.vendor !== advancedFilters.vendor) {
          return false;
        }

        if (
          advancedFilters.minCost &&
          parseFloat(prod.cost) < parseFloat(advancedFilters.minCost)
        ) {
          return false;
        }

        if (
          advancedFilters.maxCost &&
          parseFloat(prod.cost) > parseFloat(advancedFilters.maxCost)
        ) {
          return false;
        }

        if (
          advancedFilters.minPrice &&
          parseFloat(prod.price) < parseFloat(advancedFilters.minPrice)
        ) {
          return false;
        }

        if (
          advancedFilters.maxPrice &&
          parseFloat(prod.price) > parseFloat(advancedFilters.maxPrice)
        ) {
          return false;
        }

        if (
          advancedFilters.minStock &&
          parseInt(prod.stock) < parseInt(advancedFilters.minStock)
        ) {
          return false;
        }

        if (
          advancedFilters.maxStock &&
          parseInt(prod.stock) > parseInt(advancedFilters.maxStock)
        ) {
          return false;
        }

        if (advancedFilters.category && prod.categoryId !== advancedFilters.category) {
          return false;
        }

        if (advancedFilters.subCategory && prod.groupingId !== advancedFilters.subCategory) {
          return false;
        }

        return true;
      });
    }

    return result;
  }, [products, search, advancedFilters]);

  // Reset advanced filters
  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      vendor: '',
      minCost: '',
      maxCost: '',
      minPrice: '',
      maxPrice: '',
      minStock: '',
      maxStock: '',
      category: '',
      subCategory: '',
    });
    setCurrentPage(1);
  };

  // Pagination calculations
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  return {
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    advancedFilters,
    setAdvancedFilters,
    showAdvancedSearch,
    setShowAdvancedSearch,
    filteredProducts,
    currentProducts,
    totalPages,
    itemsPerPage,
    selectedForPrint,
    setSelectedForPrint,
    resetAdvancedFilters,
  };
}


