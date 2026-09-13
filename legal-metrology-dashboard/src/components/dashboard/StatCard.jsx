import React from 'react';
import { 
  Package, 
  CheckCircle2, 
  AlertOctagon, 
  Percent, 
  UserCheck 
} from 'lucide-react';
import './StatCard.css';

const ICON_MAP = {
  Package,
  CheckCircle2,
  AlertOctagon,
  Percent,
  UserCheck
};

function StatCard({ item }) {
  const Icon = ICON_MAP[item.iconName] || Package;

  return (
    <div className={`stat-card stat-card-${item.id}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{item.title}</span>
        <div 
          className="stat-card-icon-wrapper" 
          style={{ backgroundColor: `${item.accentColor}14`, color: item.accentColor }}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{item.value}</div>
        <div className="stat-card-footer">
          <span className={`stat-card-trend trend-${item.trendType}`}>
            {item.trend}
          </span>
          <span className="stat-card-subtext">{item.subtext}</span>
        </div>
      </div>
    </div>
  );
}

export default StatCard;
