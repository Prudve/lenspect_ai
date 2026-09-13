import React from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import './ProductFilters.css';

const COMMODITY_CATEGORIES = ['All', 'Food', 'FMCG', 'Electronics', 'Pharma', 'Other'];
const COMPLIANCE_STATUSES = ['All', 'Compliant', 'Non-Compliant', 'Under Review'];

function ProductFilters({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  selectedPeriod,
  onPeriodChange,
  onClearFilters,
  hasActiveFilters
}) {
  return (
    <div className="filters-container">
      {/* 1. Search Bar */}
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search by Product, Manufacturer, Inspector, or Inspection ID..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button 
            type="button" 
            className="search-clear-btn" 
            onClick={() => onSearchChange('')}
            title="Clear search text"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 2. Filter Controls Row */}
      <div className="filter-controls-row">
        <div className="filter-group">
          <div className="filter-label">
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <div className="select-wrapper">
            <label htmlFor="status-filter" className="sr-only">Compliance Status</label>
            <select
              id="status-filter"
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {COMPLIANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="select-wrapper">
            <label htmlFor="category-filter" className="sr-only">Commodity Category</label>
            <select
              id="category-filter"
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {COMMODITY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Inspection Period Filter */}
          <div className="select-wrapper">
            <label htmlFor="period-filter" className="sr-only">Inspection Period</label>
            <select
              id="period-filter"
              className="filter-select"
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
            >
              <option value="All">All Dates</option>
              <option value="Today">Today (12 Sep)</option>
              <option value="Last3Days">Past 3 Days</option>
              <option value="Last7Days">Past 7 Days</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={onClearFilters}
            title="Reset search and all active filters"
          >
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductFilters;
