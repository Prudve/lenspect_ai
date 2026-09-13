import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Eye,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';
import api from '../services/api';
import './InspectionHistoryPage.css';

function StatusBadge({ status }) {
  const className = status
    .toLowerCase()
    .replace('-', '')
    .replace(' ', '-');

  return (
    <span className={`history-status ${className}`}>
      {status}
    </span>
  );
}

function InspectionHistoryPage({ onViewInspection }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const HISTORY_STATUSES = ['All', 'Compliant', 'Non-Compliant', 'Under Review'];
  const HISTORY_CATEGORIES = ['All', 'Food', 'FMCG', 'Electronics', 'Pharma', 'Other'];

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/inspections?limit=100&page=1');
        const inspections = response?.data?.inspections || response?.inspections || [];

        const mappedHistory = inspections.map(ins => ({
          id: ins._id,
          product: ins.extractedData?.commodity_name || 'Unknown Product',
          category: 'Other',
          inspector: ins.inspector?.fullName || ins.inspector?.username || 'Unknown',
          inspectorId: ins.inspector?._id,
          date: new Date(ins.createdAt).toLocaleString('en-GB'),
          status: ins.complianceStatus === 'COMPLIANT' ? 'Compliant' : ins.complianceStatus === 'NEEDS_REVIEW' ? 'Under Review' : 'Non-Compliant'
        }));
        setHistoryData(mappedHistory);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    return historyData.filter((inspection) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        inspection.id.toLowerCase().includes(searchText) ||
        inspection.product.toLowerCase().includes(searchText) ||
        inspection.inspector.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === 'All' ||
        inspection.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'All' ||
        inspection.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [historyData, search, statusFilter, categoryFilter]);

  return (
    <div className="history-page">
      <div className="history-page-header">
        <div>
          <div className="history-title-row">
            <ClipboardList size={22} />
            <h1>Inspection History</h1>
          </div>

          <p>
            Review and track previous package inspections conducted by
            enforcement officers.
          </p>
        </div>

        <div className="history-count">
          {filteredHistory.length} inspections
        </div>
      </div>

      <div className="history-filters">
        <div className="history-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search inspection ID, product or inspector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="history-filter-group">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {HISTORY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="history-filter-group">
          <label>Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {HISTORY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-summary">
        <div className="history-summary-card">
          <span>Total Inspections</span>
          <strong>{historyData.length}</strong>
        </div>

        <div className="history-summary-card compliant">
          <span>Compliant</span>
          <strong>
            {
              historyData.filter(
                (item) => item.status === 'Compliant'
              ).length
            }
          </strong>
        </div>

        <div className="history-summary-card non-compliant">
          <span>Non-Compliant</span>
          <strong>
            {
              historyData.filter(
                (item) => item.status === 'Non-Compliant'
              ).length
            }
          </strong>
        </div>

        <div className="history-summary-card review">
          <span>Under Review</span>
          <strong>
            {
              historyData.filter(
                (item) => item.status === 'Under Review'
              ).length
            }
          </strong>
        </div>
      </div>

      <div className="history-table-card">
        <div className="history-table-header">
          <div>
            <h2>Inspection Records</h2>
            <span>Latest inspection activity</span>
          </div>

          <CalendarDays size={20} />
        </div>

        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Inspection ID</th>
                <th>Product</th>
                <th>Category</th>
                <th>Inspector</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((inspection) => (
                  <tr key={inspection.id}>
                    <td>
                      <strong className="inspection-id">
                        {inspection.id}
                      </strong>
                    </td>

                    <td>
                      <div className="history-product">
                        <strong>{inspection.product}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="history-category">
                        {inspection.category}
                      </span>
                    </td>

                    <td>
                      <div className="history-inspector">
                        <div className="history-avatar">
                          {inspection.inspector.charAt(0)}
                        </div>

                        <div>
                          <strong>{inspection.inspector}</strong>
                          <span>{inspection.inspectorId}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="history-date">
                        {inspection.date}
                      </span>
                    </td>

                    <td>
                      <StatusBadge status={inspection.status} />
                    </td>

                    <td>
                      <button
                        className="history-view-button"
                        onClick={() =>
                          onViewInspection(inspection.id)
                        }
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="history-empty"
                  >
                    No inspection records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InspectionHistoryPage;