import React from 'react';
import { CheckCircle2, AlertOctagon, Clock } from 'lucide-react';

function ProductStatusBadge({ status }) {
  switch (status) {
    case 'Compliant':
      return (
        <span className="badge badge-compliant">
          <CheckCircle2 size={13} strokeWidth={2.2} />
          <span>Compliant</span>
        </span>
      );
    case 'Non-Compliant':
      return (
        <span className="badge badge-non-compliant">
          <AlertOctagon size={13} strokeWidth={2.2} />
          <span>Non-Compliant</span>
        </span>
      );
    case 'Under Review':
    default:
      return (
        <span className="badge badge-warning">
          <Clock size={13} strokeWidth={2.2} />
          <span>Under Review</span>
        </span>
      );
  }
}

export default ProductStatusBadge;
