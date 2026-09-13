import React from 'react';
import { ArrowLeft, FileText, CheckCircle2, AlertOctagon, Clock } from 'lucide-react';
import './InspectionHeader.css';

function InspectionHeader({ detail, onBack, backLabel = 'Scanned Products' }) {
  if (!detail) return null;

  return (
    <div className="inspection-header-container">
      {/* 1. Breadcrumb & Navigation */}
      <div className="details-breadcrumb-bar">
        <div className="breadcrumb-links">
          <button type="button" className="breadcrumb-crumb link" onClick={onBack}>
          {backLabel} 
          </button>
          <span className="breadcrumb-sep">&rarr;</span>
          <span className="breadcrumb-crumb current">Inspection Details</span>
          <span className="breadcrumb-sep">&bull;</span>
          <span className="breadcrumb-id">{detail.inspectionId}</span>
        </div>

        <button type="button" className="back-nav-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to {backLabel}</span>
        </button>
      </div>

      {/* 2. Top Summary Card */}
      <div className="inspection-summary-card">
        <div className="summary-left">
          <div className="summary-tags-row">
            <span className="inspection-id-chip">
              <FileText size={14} />
              <span>Inspection ID: <strong>{detail.inspectionId}</strong></span>
            </span>
            <span className="category-chip">{detail.category}</span>
            <span className="score-chip">{detail.overallScore}</span>
          </div>

          <h2 className="summary-product-name">{detail.productName}</h2>
          <p className="summary-manufacturer">
            Manufacturer / Packer: <strong>{detail.manufacturer}</strong>
          </p>
          <p className="summary-address">{detail.packerAddress}</p>
        </div>

        <div className="summary-right">
          <div className="status-badge-container">
            <span className="status-label">Overall Compliance Result</span>
            {detail.status === 'Compliant' && (
              <div className="status-banner banner-compliant">
                <CheckCircle2 size={20} strokeWidth={2.2} />
                <span>COMPLIANT</span>
              </div>
            )}
            {detail.status === 'Non-Compliant' && (
              <div className="status-banner banner-non-compliant">
                <AlertOctagon size={20} strokeWidth={2.2} />
                <span>NON-COMPLIANT</span>
              </div>
            )}
            {detail.status === 'Under Review' && (
              <div className="status-banner banner-warning">
                <Clock size={20} strokeWidth={2.2} />
                <span>UNDER REVIEW</span>
              </div>
            )}
          </div>

          <div className="violation-count-box">
            <span className="v-count-label">Violation Count:</span>
            <span className={`v-count-number ${detail.violationCount > 0 ? 'has-violations' : 'zero-violations'}`}>
              {detail.violationCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InspectionHeader;
