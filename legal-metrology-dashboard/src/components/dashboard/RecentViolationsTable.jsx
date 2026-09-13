import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './RecentViolationsTable.css';

function getSeverityBadge(severity) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <span className="severity-badge severity-critical">Critical</span>;
    case 'high':
      return <span className="severity-badge severity-high">High</span>;
    case 'medium':
      return <span className="severity-badge severity-medium">Medium</span>;
    case 'low':
    default:
      return <span className="severity-badge severity-low">Low</span>;
  }
}

function RecentViolationsTable({ violations }) {
  if (!violations || violations.length === 0) return null;

  return (
    <div className="violations-table-card">
      <div className="table-card-header">
        <div className="table-title-wrap">
          <div className="table-icon-box icon-alert">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="table-title">Recent Flagged Violations</h3>
            <span className="table-subtitle">Mandatory declaration breaches requiring supervisory review</span>
          </div>
        </div>
        <span className="violation-count-tag">{violations.length} Critical Actions</span>
      </div>

      <div className="table-responsive-wrapper">
        <table className="enforcement-table">
          <thead>
            <tr>
              <th>Commodity</th>
              <th>Breach Description & Rule</th>
              <th>Severity</th>
              <th>Reporting Officer</th>
              <th>Timestamp</th>
              <th>Enforcement Action</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="product-cell">
                    <span className="product-name">{item.product}</span>
                    <span className="violation-id-tag">{item.id}</span>
                  </div>
                </td>
                <td>
                  <div className="violation-cell">
                    <span className="violation-text">{item.violation}</span>
                    <span className="rule-tag">{item.ruleBreached}</span>
                  </div>
                </td>
                <td>{getSeverityBadge(item.severity)}</td>
                <td className="text-secondary">{item.inspector}</td>
                <td className="date-cell">{item.timestamp}</td>
                <td>
                  <span className="action-pill">{item.actionStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentViolationsTable;
