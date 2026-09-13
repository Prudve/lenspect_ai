import React from 'react';
import { Eye, AlertCircle, FileText } from 'lucide-react';
import ProductStatusBadge from './ProductStatusBadge';
import './ProductsTable.css';

function ProductsTable({ products, onViewDetails }) {
  if (!products || products.length === 0) {
    return (
      <div className="table-empty-state">
        <AlertCircle size={40} className="empty-icon" />
        <h4 className="empty-title">No Scanned Products Found</h4>
        <p className="empty-desc">
          No records match your active search terms or filter criteria. Try clearing filters or revising your query.
        </p>
      </div>
    );
  }

  return (
    <div className="products-table-container">
      <div className="table-scroll-wrapper">
        <table className="products-data-table">
          <thead>
            <tr>
              <th>Inspection ID</th>
              <th>Commodity / Product</th>
              <th>Category</th>
              <th>Manufacturer / Packer</th>
              <th>Field Inspector</th>
              <th>Inspection Date</th>
              <th>Compliance Status</th>
              <th className="action-th">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((item) => (
              <tr key={item.inspectionId} className="product-row">
                <td className="inspection-id-cell">
                  <div className="id-badge-wrap">
                    <FileText size={14} className="id-icon" />
                    <span>{item.inspectionId}</span>
                  </div>
                </td>

                <td className="product-cell-main">
                  <div className="product-name-block">
                    <span className="product-title">{item.productName}</span>
                    <span className="product-subtext">
                      MRP: {item.mrp} &bull; Net Qty: {item.netQuantity}
                    </span>
                  </div>
                </td>

                <td>
                  <span className="category-pill">{item.category}</span>
                </td>

                <td className="manufacturer-cell">
                  <span>{item.manufacturer}</span>
                </td>

                <td>
                  <div className="inspector-info-wrap">
                    <span className="inspector-name">{item.inspector}</span>
                    <span className="inspector-code">{item.inspectorId}</span>
                  </div>
                </td>

                <td className="date-cell">
                  <span>{item.displayDate}</span>
                </td>

                <td>
                  <div className="status-badge-cell">
                    <ProductStatusBadge status={item.status} />
                    {item.violationCount > 0 && (
                      <span className="violation-count-pill" title={`${item.violationCount} statutory breach(es) flagged`}>
                        {item.violationCount} breach{item.violationCount > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </td>

                <td className="action-td">
                  <button
                    type="button"
                    className="view-details-btn"
                    onClick={() => onViewDetails(item)}
                    title={`View verification dossier for ${item.inspectionId}`}
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductsTable;
