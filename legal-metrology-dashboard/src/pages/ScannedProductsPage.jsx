import React, { useState, useMemo, useEffect } from 'react';
import ProductFilters from '../components/scanned-products/ProductFilters';
import ProductsTable from '../components/scanned-products/ProductsTable';
import Pagination from '../components/scanned-products/Pagination';
import ProductDetailsPage from './ProductDetailsPage';
import { Package, CheckCircle2, AlertOctagon, Clock, Loader2 } from 'lucide-react';
import api from '../services/api';
import './ScannedProductsPage.css';

const ITEMS_PER_PAGE = 8;

function ScannedProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from the real backend API
        const response = await api.get('/inspections?limit=500&page=1');

        if (response.success && response.data && response.data.inspections) {
          // Map backend Inspection model to frontend table format
          const mappedData = response.data.inspections.map((item) => {
            const dateObj = new Date(item.createdAt);
            const displayDate = dateObj.toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
            });

            // Map complianceStatus (COMPLIANT, NON_COMPLIANT, NEEDS_REVIEW) to UI status
            let uiStatus = 'Under Review';
            if (item.complianceStatus === 'COMPLIANT') uiStatus = 'Compliant';
            if (item.complianceStatus === 'NON_COMPLIANT') uiStatus = 'Non-Compliant';

            return {
              inspectionId: item._id, // Using Mongo ID directly
              productName: item.extractedData?.commodity_name || 'Unknown Product',
              category: 'Other', // Model doesn't have a specific category
              manufacturer: item.extractedData?.manufacturer_name || item.extractedData?.country_origin || 'Unknown Manufacturer',
              inspector: item.inspector?.fullName || item.inspector?.username || 'Unknown Inspector',
              inspectorId: item.inspector?._id || 'Unknown',
              inspectionDate: item.createdAt,
              displayDate: displayDate,
              status: uiStatus,
              violationCount: item.violations ? item.violations.length : 0,
              mrp: item.extractedData?.mrp_val ? `₹${item.extractedData.mrp_val}` : 'N/A',
              netQuantity: item.extractedData?.net_quantity && item.extractedData?.unit_symbol
                ? `${item.extractedData.net_quantity} ${item.extractedData.unit_symbol}`
                : 'N/A',
              batchNumber: 'N/A' // Not present in the inspection model
            };
          });
          setProductsData(mappedData);
        }
      } catch (error) {
        console.error('Failed to fetch inspections', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return productsData.filter((item) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.productName.toLowerCase().includes(query);
        const matchesMfg = item.manufacturer.toLowerCase().includes(query);
        const matchesInsp = item.inspector.toLowerCase().includes(query);
        const matchesId = item.inspectionId.toLowerCase().includes(query);

        if (!matchesName && !matchesMfg && !matchesInsp && !matchesId) {
          return false;
        }
      }

      // 2. Status filter
      if (selectedStatus !== 'All' && item.status !== selectedStatus) {
        return false;
      }

      // 3. Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // 4. Period filter
      if (
        selectedPeriod === 'Today' &&
        !item.inspectionDate.startsWith('2026-09-12')
      ) {
        return false;
      }

      if (
        selectedPeriod === 'Last3Days' &&
        !item.inspectionDate.startsWith('2026-09-12') &&
        !item.inspectionDate.startsWith('2026-09-11') &&
        !item.inspectionDate.startsWith('2026-09-10')
      ) {
        return false;
      }

      if (
        selectedPeriod === 'Last7Days' &&
        !item.inspectionDate.startsWith('2026-09-12') &&
        !item.inspectionDate.startsWith('2026-09-11') &&
        !item.inspectionDate.startsWith('2026-09-10') &&
        !item.inspectionDate.startsWith('2026-09-09') &&
        !item.inspectionDate.startsWith('2026-09-08') &&
        !item.inspectionDate.startsWith('2026-09-07')
      ) {
        return false;
      }

      return true;
    });
  }, [
    productsData,
    searchTerm,
    selectedStatus,
    selectedCategory,
    selectedPeriod
  ]);

  // Reset pagination when search or filters change
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setSelectedStatus(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const handlePeriodChange = (val) => {
    setSelectedPeriod(val);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('All');
    setSelectedCategory('All');
    setSelectedPeriod('All');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedStatus !== 'All' ||
    selectedCategory !== 'All' ||
    selectedPeriod !== 'All'
  );

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Aggregate stats for the compact summary strip
  const summaryCounts = useMemo(() => {
    const total = productsData.length;

    const compliant = productsData.filter(
      (i) => i.status === 'Compliant'
    ).length;

    const nonCompliant = productsData.filter(
      (i) => i.status === 'Non-Compliant'
    ).length;

    const underReview = productsData.filter(
      (i) => i.status === 'Under Review'
    ).length;

    return {
      total,
      compliant,
      nonCompliant,
      underReview
    };
  }, [productsData]);

  if (loading) {
    return (
      <div className="scanned-products-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={32} />
        <span style={{ marginLeft: '12px' }}>Loading Scanned Products...</span>
      </div>
    );
  }

  // Show the actual Step 5 Product Details page
  if (selectedProduct) {
    return (
      <ProductDetailsPage
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <div className="scanned-products-page">

      {/* 1. Page Header with Record Count Badge */}
      <div className="page-header-row">
        <div>
          <h2 className="page-main-heading">Scanned Products</h2>

          <p className="page-sub-heading">
            Review packaged commodity inspections and compliance verification records.
          </p>
        </div>

        <div className="matched-counter-pill">
          <span>
            Displaying <strong>{totalItems}</strong> of{' '}
            <strong>{productsData.length}</strong> inspections
          </span>
        </div>
      </div>

      {/* 2. Compact Summary Strip */}
      <div className="compact-summary-strip">

        <div className="summary-pill pill-total">
          <Package size={15} />

          <span>
            Total Scanned: <strong>{summaryCounts.total}</strong>
          </span>
        </div>

        <div className="summary-pill pill-compliant">
          <CheckCircle2 size={15} />

          <span>
            Compliant: <strong>{summaryCounts.compliant}</strong>
          </span>
        </div>

        <div className="summary-pill pill-non-compliant">
          <AlertOctagon size={15} />

          <span>
            Non-Compliant: <strong>{summaryCounts.nonCompliant}</strong>
          </span>
        </div>

        <div className="summary-pill pill-warning">
          <Clock size={15} />

          <span>
            Under Review: <strong>{summaryCounts.underReview}</strong>
          </span>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <ProductFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 4. Scanned Products Data Table */}
      <ProductsTable
        products={paginatedProducts}
        onViewDetails={(item) => setSelectedProduct(item)}
      />

      {/* 5. Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

    </div>
  );
}

export default ScannedProductsPage;