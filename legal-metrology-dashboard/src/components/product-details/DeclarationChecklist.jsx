import React from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import './DeclarationChecklist.css';

function getChecklistBadge(status) {
  switch (status) {
    case 'Present':
      return (
        <span className="check-badge badge-present">
          <CheckCircle2 size={13} strokeWidth={2.2} />
          <span>✓ Present</span>
        </span>
      );
    case 'Missing':
      return (
        <span className="check-badge badge-missing">
          <XCircle size={13} strokeWidth={2.2} />
          <span>✕ Missing</span>
        </span>
      );
    case 'Needs Review':
    default:
      return (
        <span className="check-badge badge-review">
          <AlertTriangle size={13} strokeWidth={2.2} />
          <span>⚠ Needs Review</span>
        </span>
      );
  }
}

function DeclarationChecklist({ checklist }) {
  if (!checklist || checklist.length === 0) return null;

  return (
    <div className="checklist-card">
      <div className="checklist-header">
        <div className="checklist-title-wrap">
          <div className="checklist-icon-box">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <h3 className="checklist-title">Mandatory Declarations Compliance Checklist</h3>
            <span className="checklist-subtitle">
              Statutory verification under Legal Metrology (Packaged Commodities) Rules, 2011 &bull; Chapter II
            </span>
          </div>
        </div>

        <span className="checklist-stat-tag">
          {checklist.filter(c => c.status === 'Present').length} / {checklist.length} Declarations Verified
        </span>
      </div>

      <div className="checklist-table-wrapper">
        <table className="checklist-table">
          <thead>
            <tr>
              <th>Mandatory Declaration</th>
              <th>Statutory Rule Reference</th>
              <th>Extracted Value / Evidence</th>
              <th>Requirement Status</th>
              <th>Compliance Audit Remarks</th>
            </tr>
          </thead>
          <tbody>
            {checklist.map((item) => (
              <tr 
                key={item.declaration} 
                className={`checklist-row ${item.status === 'Missing' ? 'row-missing' : item.status === 'Needs Review' ? 'row-review' : ''}`}
              >
                <td className="dec-name-cell">
                  <span className="dec-title">{item.declaration}</span>
                </td>

                <td className="rule-ref-cell">
                  <span className="rule-pill">{item.ruleReference}</span>
                </td>

                <td className="extracted-val-cell">
                  <span className={`extracted-text ${item.status === 'Missing' ? 'missing-val' : ''}`}>
                    {item.extractedValue}
                  </span>
                </td>

                <td className="status-badge-cell">
                  {getChecklistBadge(item.status)}
                </td>

                <td className="remarks-cell">
                  <span className="remarks-text">{item.remarks}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DeclarationChecklist;
