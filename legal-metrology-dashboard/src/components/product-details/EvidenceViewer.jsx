import React, { useState } from 'react';
import { Camera, ZoomIn, ZoomOut, Layers, Shield } from 'lucide-react';
import './EvidenceViewer.css';

function EvidenceViewer({ detail }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);

  if (!detail) return null;

  const isCompliant = detail.status === 'Compliant';

  return (
    <div className="evidence-card">
      <div className="evidence-header">
        <div className="evidence-title-wrap">
          <div className="evidence-icon-box">
            <Camera size={18} />
          </div>
          <div>
            <h3 className="evidence-title">Inspection Evidence & Scanned Label</h3>
            <span className="evidence-subtitle">
              Evidence captured during field inspection &bull; Mobile high-resolution camera feed
            </span>
          </div>
        </div>

        {/* Viewer Controls */}
        <div className="viewer-controls">
          <button
            type="button"
            className={`control-btn ${showBoxes ? 'active' : ''}`}
            onClick={() => setShowBoxes(!showBoxes)}
            title="Toggle OCR Detection Bounding Boxes"
          >
            <Layers size={14} />
            <span>{showBoxes ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}</span>
          </button>

          <button
            type="button"
            className="control-btn"
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? 'Reset Zoom (1x)' : 'Zoom In (1.5x)'}
          >
            {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
            <span>{isZoomed ? 'Reset 1x' : 'Zoom 1.5x'}</span>
          </button>
        </div>
      </div>

      {/* Main Evidence Canvas Area */}
      <div className={`evidence-canvas-container ${isZoomed ? 'is-zoomed' : ''}`}>
        <div className="evidence-canvas">
          {/* Simulated Scanned Commodity Package Label with Vector Graphic */}
          <div className="simulated-label-package">
            {/* Top brand header band */}
            <div className="label-brand-banner">
              <span className="label-brand-tag">FIELD CAPTURE &bull; {detail.category.toUpperCase()}</span>
              <span className="label-brand-title">{detail.productName}</span>
            </div>

            {/* Label Body with Simulated Panels & Bounding Boxes */}
            <div className="label-body-grid">
              {/* Left Column: Principal Display Panel */}
              <div className="label-col-principal">
                <div className={`ocr-box ${showBoxes ? 'box-active' : ''}`}>
                  <span className="box-tag">OCR: BRAND_TITLE</span>
                  <div className="box-content-bold">{detail.productName}</div>
                </div>

                <div className="net-weight-row">
                  <div className={`ocr-box ${showBoxes ? 'box-active' : ''}`}>
                    <span className="box-tag">OCR: NET_QUANTITY [Rule 6(1)(f)]</span>
                    <div className="box-content">Net Content: <strong>{detail.extractedData.netQuantity}</strong></div>
                  </div>
                </div>

                {/* Price panel: Compliant vs Non-Compliant */}
                {isCompliant ? (
                  <div className={`ocr-box box-success ${showBoxes ? 'box-active' : ''}`}>
                    <span className="box-tag tag-success">OCR: MRP_DECLARED [Rule 6(1)(e)]</span>
                    <div className="box-content-highlight">
                      MRP ₹: <strong>{detail.extractedData.mrp}</strong>
                    </div>
                  </div>
                ) : (
                  <div className={`ocr-box box-error ${showBoxes ? 'box-active' : ''}`}>
                    <span className="box-tag tag-error">OCR ALERT: MANDATORY MRP MISSING</span>
                    <div className="box-content-alert">
                      [Price numeral absent from secondary panel]
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Statutory Declarations Panel */}
              <div className="label-col-statutory">
                <div className={`ocr-box ${showBoxes ? 'box-active' : ''}`}>
                  <span className="box-tag">OCR: PACKER_DETAILS [Rule 6(1)(a)]</span>
                  <div className="box-content-small">{detail.extractedData.manufacturer}</div>
                </div>

                <div className={`ocr-box ${showBoxes ? 'box-active' : ''}`}>
                  <span className="box-tag">OCR: BATCH & MFG [Rule 6(1)(d)]</span>
                  <div className="box-content-small">
                    Batch: <code>{detail.extractedData.batchNumber}</code> &bull; Pkd: {detail.extractedData.dateOfPacking}
                  </div>
                </div>

                <div className={`ocr-box ${showBoxes ? 'box-active' : ''}`}>
                  <span className="box-tag">OCR: CONSUMER_CARE [Rule 6(1)(n)]</span>
                  <div className="box-content-small">{detail.extractedData.consumerCare}</div>
                </div>
              </div>
            </div>

            {/* Simulated barcode / compliance seal */}
            <div className="label-seal-footer">
              <div className="barcode-mock">
                <div className="barcode-lines" />
                <span className="barcode-code">8 901030 910482</span>
              </div>
              <div className="stamp-mock">
                <Shield size={14} />
                <span>LEGAL METROLOGY VERIFICATION HASH: {detail.inspectionId.replace('-', '')}8A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="evidence-footer">
        <span className="evidence-meta-note">
          Evidence Capture Device: <strong>{detail.deviceModel}</strong> &bull; GPS: <strong>28.6139° N, 77.2090° E</strong> (Mock Geo-tag)
        </span>
        <span className="evidence-tamper-tag">Digitally Signed &bull; Audit Trail Recorded</span>
      </div>
    </div>
  );
}

export default EvidenceViewer;
