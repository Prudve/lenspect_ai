import React from 'react';
import { GitCommit, Check, Clock, AlertTriangle } from 'lucide-react';
import './InspectionTimeline.css';

function getTimelineIcon(status) {
  switch (status) {
    case 'completed':
      return <Check size={12} strokeWidth={2.8} />;
    case 'alert':
      return <AlertTriangle size={12} strokeWidth={2.5} />;
    case 'pending':
    default:
      return <Clock size={12} strokeWidth={2} />;
  }
}

function InspectionTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="timeline-card">
      <div className="timeline-header">
        <div className="timeline-title-wrap">
          <div className="timeline-icon-box">
            <GitCommit size={18} />
          </div>
          <div>
            <h3 className="timeline-title">Inspection Process Workflow</h3>
            <span className="timeline-subtitle">Sequential audit trail from field capture to supervisor verification</span>
          </div>
        </div>

        <span className="workflow-status-badge">Automated Traceability</span>
      </div>

      <div className="timeline-body">
        <div className="timeline-track">
          {timeline.map((item, idx) => (
            <div 
              key={item.step} 
              className={`timeline-step-item status-${item.status}`}
            >
              {/* Node indicator */}
              <div className="step-node-wrapper">
                <div className={`step-node node-${item.status}`}>
                  {getTimelineIcon(item.status)}
                </div>
                {idx < timeline.length - 1 && <div className="step-line" />}
              </div>

              {/* Step info */}
              <div className="step-content">
                <div className="step-top-row">
                  <span className="step-name">{item.step}</span>
                  <span className="step-time">{item.time}</span>
                </div>
                <span className="step-actor">Executed by: <strong>{item.actor}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InspectionTimeline;
