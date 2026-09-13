import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import './ViolationDetails.css';

function getSeverityBadge(severity) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <span className="v-severity-badge severity-critical">Critical</span>;
    case 'high':
      return <span className="v-severity-badge severity-high">High</span>;
    case 'medium':
      return <span className="v-severity-badge severity-medium">Medium</span>;
    case 'low':
    default:
      return <span className="v-severity-badge severity-low">Low</span>;
  }
}

function ViolationDetails({ violations, isCompliant }) {
  if (isCompliant || !violations || violations.length === 0) {
    return (
      <div className="no-violations-card">
        <div className="no-violations-inner">
          <CheckCircle2 size={32} className="no-v-icon" />
          <div className="no-v-text">
            <h4 className="no-v-title">No Statutory Breaches Detected</h4>
            <p className="no-v-desc">
              All mandatory declarations comply with Legal Metrology (Packaged Commodities) Rules, 2011 norms.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="violations-card">
      <div className="violations-header">
        <div className="violations-title-wrap">
          <div className="violations-icon-box">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="violations-title">Detected Statutory Violations ({violations.length})</h3>
            <span className="violations-subtitle">
              Mandatory declaration non-conformities identified during field image inspection
            </span>
          </div>
        </div>

        <span className="violation-flag-badge">
          Action Required
        </span>
      </div>

      <div className="violations-list">
        {violations.map((item, index) => (
          <div key={item.id || index} className="violation-item-card">
            <div className="violation-item-top">
              <div className="violation-title-group">
                <AlertTriangle size={17} className="item-alert-icon" />
                <h4 className="violation-item-title">{item.title}</h4>
              </div>

              <div className="violation-meta-group">
                {getSeverityBadge(item.severity)}
                <span className="violation-status-pill">{item.status}</span>
              </div>
            </div>

            <div className="violation-rule-row">
              <span className="rule-label">Applicable Rule Reference:</span>
              <span className="rule-value">{item.ruleReference}</span>
            </div>

            <p className="violation-explanation">{item.explanation}</p>

            <div className="violation-disclaimer-note">
              <Info size={13} />
              <span>{item.demonstrationNote || 'Applicable rule reference: Mock data for demonstration purposes.'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ViolationDetails;
