import React from 'react';
import { Cpu, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './ExtractedInformation.css';

function ExtractedInformation({ extractedData, isCompliant }) {
  if (!extractedData) return null;

  const fields = [
    { label: 'Product Name', value: extractedData.productName, highlight: false },
    { label: 'Manufacturer / Packer', value: extractedData.manufacturer, highlight: false },
    { 
      label: 'Maximum Retail Price (MRP)', 
      value: extractedData.mrp, 
      highlight: true, 
      isAlert: !isCompliant && extractedData.mrp.toLowerCase().includes('missing') 
    },
    { 
      label: 'Unit Sale Price (USP)', 
      value: extractedData.unitSalePrice || 'Declared', 
      highlight: true,
      isAlert: !isCompliant && (extractedData.unitSalePrice?.toLowerCase().includes('not') || extractedData.unitSalePrice?.toLowerCase().includes('pending'))
    },
    { label: 'Net Quantity', value: extractedData.netQuantity, highlight: false },
    { label: 'Unit of Measurement Standard', value: extractedData.unitOfMeasurement, highlight: false },
    { label: 'Batch / Lot Number', value: extractedData.batchNumber, highlight: false },
    { label: 'Date of Packing / Manufacture', value: extractedData.dateOfPacking, highlight: false },
    { label: 'Consumer Care Helpline & Email', value: extractedData.consumerCare, highlight: false }
  ];

  return (
    <div className="extracted-info-card">
      <div className="extracted-header">
        <div className="extracted-title-wrap">
          <div className="extracted-icon-box">
            <Cpu size={18} />
          </div>
          <div>
            <h3 className="extracted-title">Extracted Package Information</h3>
            <span className="extracted-subtitle">
              Declarations digitized via automated label parsing &bull; Mock OCR Result
            </span>
          </div>
        </div>

        <span className="ocr-disclaimer-badge">
          Mock OCR Extraction Data
        </span>
      </div>

      <div className="extracted-grid">
        {fields.map((field) => (
          <div 
            key={field.label} 
            className={`extracted-field-cell ${field.isAlert ? 'cell-alert' : ''}`}
          >
            <span className="field-label">{field.label}</span>
            <div className="field-value-row">
              {field.isAlert ? (
                <AlertCircle size={15} className="alert-icon" />
              ) : field.highlight ? (
                <CheckCircle2 size={15} className="success-icon" />
              ) : null}
              <span className={`field-value ${field.isAlert ? 'text-alert' : ''}`}>
                {field.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="extracted-notice-footer">
        <Info size={14} />
        <span>
          Note: Field values reflect label declarations extracted by field optical analysis for Legal Metrology compliance checks.
        </span>
      </div>
    </div>
  );
}

export default ExtractedInformation;
