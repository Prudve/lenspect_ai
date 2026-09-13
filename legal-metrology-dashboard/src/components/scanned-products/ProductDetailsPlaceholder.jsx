import React from 'react';
import { ArrowLeft, FileText, Info, CheckCircle2, AlertOctagon, Clock } from 'lucide-react';
import './ProductDetailsPlaceholder.css';

function ProductDetailsPlaceholder({ product, onBack }) {
  if (!product) return null;

  return (
    <div className="product-details-shell">
      {/* Navigation breadcrumb & Back Button */}
      <div className="details-header-bar">
        <button 
          type="button" 
          className="back-btn" 
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>Back to Scanned Products</span>
        </button>

        <span className="details-step-badge">Prepared for Step 5: Product Details</span>
      </div>

      {/* Overview Card of Selected Commodity */}
      <div className="selected-product-overview-card">
        <div className="product-identity-row">
          <div>
            <div className="id-tag-row">
              <span className="inspection-id-pill">
                <FileText size={14} />
                <span>{product.inspectionId}</span>
              </span>
              <span className="category-tag">{product.category}</span>
            </div>
            <h2 className="selected-product-name">{product.productName}</h2>
            <p className="selected-manufacturer">Manufacturer / Packer: <strong>{product.manufacturer}</strong></p>
          </div>

          <div className="product-status-box">
            {product.status === 'Compliant' && (
              <span className="badge badge-compliant">
                <CheckCircle2 size={14} />
                <span>Compliant</span>
              </span>
            )}
            {product.status === 'Non-Compliant' && (
              <span className="badge badge-non-compliant">
                <AlertOctagon size={14} />
                <span>Non-Compliant ({product.violationCount} Breaches)</span>
              </span>
            )}
            {product.status === 'Under Review' && (
              <span className="badge badge-warning">
                <Clock size={14} />
                <span>Under Review</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick parameters grid */}
        <div className="product-quick-specs">
          <div className="spec-card">
            <span className="spec-label">MRP (Declared)</span>
            <span className="spec-val">{product.mrp}</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Net Quantity</span>
            <span className="spec-val">{product.netQuantity}</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Batch Code</span>
            <span className="spec-val">{product.batchNumber}</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Inspecting Officer</span>
            <span className="spec-val">{product.inspector} ({product.inspectorId})</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Inspection Timestamp</span>
            <span className="spec-val">{product.displayDate}</span>
          </div>
        </div>

        {/* Informative Roadmap Notice for Step 5 */}
        <div className="details-roadmap-box">
          <div className="roadmap-title-row">
            <Info size={16} />
            <h4>Step 5 Product Details Integration Shell</h4>
          </div>
          <p>
            You have selected commodity <strong>{product.productName}</strong> (Inspection ID: <code>{product.inspectionId}</code>).
          </p>
          <p>
            In <strong>Step 5 (Product Details Page)</strong>, this view will be developed into the full deep-dive verification report featuring:
          </p>
          <ul className="roadmap-features-list">
            <li>High-resolution scanned evidence images with interactive zoom/crop</li>
            <li>Side-by-side OCR extracted label declarations vs. Legal Metrology statutory requirements</li>
            <li>Rule-by-rule compliance checklist under Legal Metrology (Packaged Commodities) Rules, 2011</li>
            <li>Detailed violation rationale and official supervisor action / endorsement tools</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsPlaceholder;
