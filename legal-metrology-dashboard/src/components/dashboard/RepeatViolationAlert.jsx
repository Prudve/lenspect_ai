import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import './RepeatViolationAlert.css';

function RepeatViolationAlert({ alertData }) {
  if (!alertData) return null;

  return (
    <div className="repeat-alert-card">
      <div className="repeat-alert-banner">
        <div className="repeat-alert-title-wrap">
          <div className="repeat-alert-icon-box">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="repeat-alert-badge-group">
              <span className="repeat-badge-label">Statutory Enforcement Alert</span>
              <span className="repeat-badge-count">{alertData.violationCount} Infractions Flagged</span>
            </div>
            <h3 className="repeat-alert-headline">
              Repeat Non-Compliance Detected &bull; {alertData.manufacturer}
            </h3>
          </div>
        </div>

        <div className="repeat-alert-meta-pill">
          <span className="severity-indicator-dot" />
          <span>Severity: <strong>{alertData.severity}</strong></span>
        </div>
      </div>

      <div className="repeat-alert-content">
        <p className="repeat-alert-desc">
          <strong>{alertData.manufacturer}</strong> has been associated with{' '}
          <strong>{alertData.violationCount} non-compliant inspections</strong> during the{' '}
          {alertData.monitoringPeriod}.
        </p>

        <div className="repeat-alert-grid">
          <div className="repeat-grid-item">
            <span className="grid-label">Affected Commodity Series:</span>
            <span className="grid-value">{alertData.product}</span>
          </div>
          <div className="repeat-grid-item">
            <span className="grid-label">Primary Breaches:</span>
            <span className="grid-value">{alertData.primaryBreaches}</span>
          </div>
          <div className="repeat-grid-item">
            <span className="grid-label">Last Inspection Date:</span>
            <span className="grid-value">{alertData.lastInspectionDate}</span>
          </div>
          <div className="repeat-grid-item">
            <span className="grid-label">Statutory Provision:</span>
            <span className="grid-value">{alertData.statutoryReference}</span>
          </div>
        </div>

        <div className="repeat-alert-actions">
          <div className="repeat-action-note">
            <AlertTriangle size={15} color="var(--color-warning)" />
            <span>Recommended: {alertData.recommendedAction}</span>
          </div>
          <button 
            type="button" 
            className="repeat-action-btn"
            title="Initiate escalation memo under Section 51"
          >
            <span>Review Enforcement Dossier</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RepeatViolationAlert;
