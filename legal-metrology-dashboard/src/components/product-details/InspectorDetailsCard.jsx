import React from 'react';
import { UserCheck, MapPin, Calendar, Clock, Smartphone, Shield } from 'lucide-react';
import './InspectorDetailsCard.css';

function InspectorDetailsCard({ detail }) {
  if (!detail) return null;

  return (
    <div className="inspector-card">
      <div className="inspector-card-header">
        <div className="inspector-title-wrap">
          <div className="inspector-icon-box">
            <UserCheck size={18} />
          </div>
          <div>
            <h3 className="inspector-title">Field Inspector Information</h3>
            <span className="inspector-subtitle">Enforcement officer responsible for commodity verification</span>
          </div>
        </div>

        <span className="inspector-verified-badge">
          <Shield size={12} />
          <span>Officer Verified</span>
        </span>
      </div>

      <div className="inspector-body">
        <div className="inspector-profile-row">
          <div className="inspector-avatar-box">
            {detail.inspector.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="inspector-meta-text">
            <span className="inspector-name-bold">{detail.inspector}</span>
            <span className="inspector-designation">Legal Metrology Inspector &bull; ID: <code>{detail.inspectorId}</code></span>
          </div>
        </div>

        <div className="inspector-data-grid">
          <div className="data-item">
            <div className="data-label-row">
              <Calendar size={13} />
              <span>Inspection Date</span>
            </div>
            <span className="data-val">{detail.inspectionDate}</span>
          </div>

          <div className="data-item">
            <div className="data-label-row">
              <Clock size={13} />
              <span>Timestamp</span>
            </div>
            <span className="data-val">{detail.inspectionTime}</span>
          </div>

          <div className="data-item">
            <div className="data-label-row">
              <MapPin size={13} />
              <span>Enforcement Circle</span>
            </div>
            <span className="data-val" dangerouslySetInnerHTML={{ __html: detail.jurisdiction }} />
          </div>

          <div className="data-item">
            <div className="data-label-row">
              <Smartphone size={13} />
              <span>Field Hardware</span>
            </div>
            <span className="data-val">{detail.deviceModel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InspectorDetailsCard;
