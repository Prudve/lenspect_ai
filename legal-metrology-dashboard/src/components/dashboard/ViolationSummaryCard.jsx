import React from 'react';
import { PieChart, ShieldAlert } from 'lucide-react';
import './ViolationSummaryCard.css';

function ViolationSummaryCard({ categories }) {
  if (!categories || categories.length === 0) return null;

  const totalViolations = categories.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="violation-summary-card">
      <div className="summary-card-header">
        <div className="summary-title-wrap">
          <div className="summary-icon-box">
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="summary-title">Violation Category Breakdown</h3>
            <span className="summary-subtitle">Statutory non-compliance distribution (Total: {totalViolations})</span>
          </div>
        </div>

        <span className="summary-rule-tag">PC Rules, 2011</span>
      </div>

      <div className="summary-list">
        {categories.map((item) => (
          <div key={item.category} className="summary-item">
            <div className="summary-item-info">
              <div className="summary-item-text">
                <span className="summary-item-name">{item.category}</span>
                <span className="summary-item-rule">{item.rule}</span>
              </div>
              <div className="summary-item-metrics">
                <span className="summary-item-count">{item.count}</span>
                <span className="summary-item-pct">({item.percentage}%)</span>
              </div>
            </div>

            <div className="summary-progress-bg">
              <div 
                className={`summary-progress-bar severity-bar-${item.severity.toLowerCase()}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="summary-footer">
        <ShieldAlert size={14} color="var(--color-non-compliant)" />
        <span>Primary Enforcement Focus: <strong>MRP & Net Quantity Declarations</strong> account for 59.5% of total breaches.</span>
      </div>
    </div>
  );
}

export default ViolationSummaryCard;
