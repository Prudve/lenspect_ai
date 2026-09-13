import React from 'react';
import { PackageSearch, CheckCircle, XCircle, Clock } from 'lucide-react';
import './RecentInspectionsTable.css';

function getStatusBadge(status) {
  switch (status) {
    case 'Compliant':
      return (
        <span className="badge badge-compliant">
          <CheckCircle size={12} />
          <span>Compliant</span>
        </span>
      );
    case 'Non-Compliant':
      return (
        <span className="badge badge-non-compliant">
          <XCircle size={12} />
          <span>Non-Compliant</span>
        </span>
      );
    case 'Under Review':
    default:
      return (
        <span className="badge badge-warning">
          <Clock size={12} />
          <span>Under Review</span>
        </span>
      );
  }
}

function RecentInspectionsTable({ inspections }) {
  if (!inspections || inspections.length === 0) return null;

  return (
    <div className="inspections-table-card">
      <div className="table-card-header">
        <div className="table-title-wrap">
          <div className="table-icon-box">
            <PackageSearch size={18} />
          </div>
          <div>
            <h3 className="table-title">Recent Commodity Inspections</h3>
            <span className="table-subtitle">Live stream of mobile officer verifications & scans</span>
          </div>
        </div>
        <span className="record-count-tag">{inspections.length} Recent Records</span>
      </div>

      <div className="table-responsive-wrapper">
        <table className="enforcement-table">
          <thead>
            <tr>
              <th>Commodity / Product</th>
              <th>Manufacturer / Brand</th>
              <th>Field Inspector</th>
              <th>Inspection Date</th>
              <th>Compliance Status</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="product-cell">
                    <span className="product-name">{item.product}</span>
                    <span className="product-cat">{item.category} &bull; {item.id}</span>
                  </div>
                </td>
                <td className="text-secondary">{item.manufacturer}</td>
                <td>
                  <div className="inspector-cell">
                    <span className="inspector-name">{item.inspector}</span>
                    <span className="inspector-id">{item.inspectorId}</span>
                  </div>
                </td>
                <td className="date-cell">{item.timestamp}</td>
                <td>{getStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentInspectionsTable;
