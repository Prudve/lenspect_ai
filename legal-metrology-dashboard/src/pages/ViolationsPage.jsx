import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Search,
  X
} from 'lucide-react';

import api from '../services/api';

import './ViolationsPage.css';

function ViolationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [violationsData, setViolationsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive filter options dynamically from data or keep static (we'll keep some static for UI)
  const VIOLATION_TYPES = ['All', 'Missing MRP', 'Unit Sale Price Omission', 'Net Quantity Format', 'Missing Manufacturer', 'Missing Pack Date'];
  const VIOLATION_SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const VIOLATION_STATUSES = ['All', 'Open', 'Under Review', 'Escalated', 'Resolved'];

  React.useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await api.get('/notices/?limit=200&page=1');
        const notices = response?.data?.notices || response?.notices || [];

        const mappedData = notices.map(notice => ({
          id: notice._id,
          inspectionId: notice.inspection?._id || 'Unknown',
          productName: notice.inspection?.extractedData?.commodity_name || 'Unknown Product',
          manufacturer: notice.inspection?.extractedData?.manufacturer_name || 'Unknown Manufacturer',
          inspector: notice.issuer?.fullName || notice.issuer?.username || 'System',
          violationType: 'Rule Violation',
          description: notice.notes || 'Notice generated',
          ruleReference: 'PC Rules, 2011',
          severity: 'High',
          status: notice.status === 'DRAFT' ? 'Under Review' : notice.status === 'ISSUED' ? 'Open' : 'Resolved',
          inspectionDate: notice.createdAt
        }));
        setViolationsData(mappedData);
      } catch (err) {
        console.error('Failed to fetch violations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const filteredViolations = useMemo(() => {
    return violationsData.filter((violation) => {
      const query = searchTerm.toLowerCase().trim();

      if (query) {
        const matches =
          violation.productName.toLowerCase().includes(query) ||
          violation.manufacturer.toLowerCase().includes(query) ||
          violation.inspector.toLowerCase().includes(query) ||
          violation.inspectionId.toLowerCase().includes(query) ||
          violation.violationType.toLowerCase().includes(query);

        if (!matches) {
          return false;
        }
      }

      if (
        selectedType !== 'All' &&
        violation.violationType !== selectedType
      ) {
        return false;
      }

      if (
        selectedSeverity !== 'All' &&
        violation.severity !== selectedSeverity
      ) {
        return false;
      }

      if (
        selectedStatus !== 'All' &&
        violation.status !== selectedStatus
      ) {
        return false;
      }

      return true;
    });
  }, [
    violationsData,
    searchTerm,
    selectedType,
    selectedSeverity,
    selectedStatus
  ]);

  const summary = useMemo(() => {
    return {
      total: violationsData.length,

      open: violationsData.filter(
        (item) => item.status === 'Open'
      ).length,

      underReview: violationsData.filter(
        (item) => item.status === 'Under Review'
      ).length,

      escalated: violationsData.filter(
        (item) => item.status === 'Escalated'
      ).length,

      resolved: violationsData.filter(
        (item) => item.status === 'Resolved'
      ).length
    };
  }, [violationsData]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('All');
    setSelectedSeverity('All');
    setSelectedStatus('All');
  };

  const hasFilters =
    searchTerm.trim() ||
    selectedType !== 'All' ||
    selectedSeverity !== 'All' ||
    selectedStatus !== 'All';

  return (
    <div className="violations-page">

      {/* Page Header */}
      <div className="violations-page-header">
        <div>
          <h2>Violations & Enforcement</h2>
          <p>
            Monitor detected declaration violations and enforcement status
            across field inspections.
          </p>
        </div>

        <div className="violations-count">
          {filteredViolations.length} of {violationsData.length} records
        </div>
      </div>

      {/* Summary Cards */}
      <div className="violation-summary-grid">

        <div className="violation-summary-card total">
          <div className="summary-icon">
            <AlertTriangle size={20} />
          </div>

          <div>
            <span>Total Violations</span>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="violation-summary-card open">
          <div className="summary-icon">
            <AlertOctagon size={20} />
          </div>

          <div>
            <span>Open</span>
            <strong>{summary.open}</strong>
          </div>
        </div>

        <div className="violation-summary-card review">
          <div className="summary-icon">
            <Clock size={20} />
          </div>

          <div>
            <span>Under Review</span>
            <strong>{summary.underReview}</strong>
          </div>
        </div>

        <div className="violation-summary-card escalated">
          <div className="summary-icon">
            <AlertOctagon size={20} />
          </div>

          <div>
            <span>Escalated</span>
            <strong>{summary.escalated}</strong>
          </div>
        </div>

        <div className="violation-summary-card resolved">
          <div className="summary-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Resolved</span>
            <strong>{summary.resolved}</strong>
          </div>
        </div>

      </div>

      {/* Filters */}
      <div className="violations-filter-card">

        <div className="violation-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search product, manufacturer, inspector or inspection ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {VIOLATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === 'All' ? 'All Violation Types' : type}
            </option>
          ))}
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
        >
          {VIOLATION_SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity === 'All'
                ? 'All Severity Levels'
                : severity}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {VIOLATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === 'All' ? 'All Statuses' : status}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            className="clear-violation-filters"
            onClick={clearFilters}
          >
            <X size={15} />
            Clear
          </button>
        )}

      </div>

      {/* Violations Table */}
      <div className="violations-table-card">

        <div className="table-card-header">
          <div>
            <h3>Detected Violations</h3>
            <p>
              Declaration issues identified during commodity inspections.
            </p>
          </div>
        </div>

        <div className="violations-table-wrapper">

          <table className="violations-table">

            <thead>
              <tr>
                <th>Inspection</th>
                <th>Product</th>
                <th>Violation</th>
                <th>Rule Reference</th>
                <th>Severity</th>
                <th>Inspector</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredViolations.length > 0 ? (
                filteredViolations.map((violation) => (
                  <tr key={violation.id}>

                    <td>
                      <span className="inspection-id">
                        {violation.inspectionId}
                      </span>
                    </td>

                    <td>
                      <div className="product-cell">
                        <strong>{violation.productName}</strong>
                        <span>{violation.manufacturer}</span>
                      </div>
                    </td>

                    <td>
                      <div className="violation-type-cell">
                        <strong>{violation.violationType}</strong>
                        <span>{violation.description}</span>
                      </div>
                    </td>

                    <td>
                      <span className="rule-reference">
                        {violation.ruleReference}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`severity-badge severity-${violation.severity.toLowerCase()}`}
                      >
                        {violation.severity}
                      </span>
                    </td>

                    <td>
                      <span className="inspector-name">
                        {violation.inspector}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        violation.inspectionDate
                      ).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${violation.status
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        {violation.status}
                      </span>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="no-violations"
                  >
                    No violations match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>

          </table>

        </div>

        <div className="violations-table-footer">
          Showing {filteredViolations.length} violation
          {filteredViolations.length !== 1 ? 's' : ''}
        </div>

      </div>

    </div>
  );
}

export default ViolationsPage;