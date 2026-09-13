import React, { useState } from 'react';
import { TrendingUp, Target, Calendar } from 'lucide-react';
import './ComplianceTrendChart.css';

function ComplianceTrendChart({ data }) {
  const [activePoint, setActivePoint] = useState(null);

  if (!data || data.length === 0) return null;

  // Chart coordinate geometry
  const width = 640;
  const height = 240;
  const padLeft = 50;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Scale: 65% to 85%
  const minY = 65;
  const maxY = 85;

  const getY = (val) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + chartH - ((clamped - minY) / (maxY - minY)) * chartH;
  };

  const getX = (index) => {
    return padLeft + (index / (data.length - 1)) * chartW;
  };

  // Build points for polyline and area
  const points = data.map((d, i) => `${getX(i)},${getY(d.rate)}`).join(' ');
  const areaPoints = `${getX(0)},${padTop + chartH} ${points} ${getX(data.length - 1)},${padTop + chartH}`;

  // Grid line levels
  const yTicks = [70, 75, 80, 85];
  const targetY = getY(85);

  return (
    <div className="compliance-chart-card">
      <div className="chart-header">
        <div className="chart-title-wrap">
          <div className="chart-icon-box">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="chart-title">7-Day Compliance Rate Trajectory</h3>
            <span className="chart-subtitle">Daily verification consistency across mobile inspection units</span>
          </div>
        </div>

        <div className="chart-meta-legend">
          <div className="legend-item">
            <span className="legend-line line-actual" />
            <span>Observed Rate (%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-line line-target" />
            <span>Target Threshold (85%)</span>
          </div>
        </div>
      </div>

      <div className="chart-svg-container">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="chart-svg" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick} className="grid-group">
                <line 
                  x1={padLeft} 
                  y1={y} 
                  x2={width - padRight} 
                  y2={y} 
                  className="grid-line" 
                />
                <text 
                  x={padLeft - 10} 
                  y={y + 4} 
                  className="grid-text"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Statutory 85% Target Line */}
          <line 
            x1={padLeft} 
            y1={targetY} 
            x2={width - padRight} 
            y2={targetY} 
            className="target-line" 
          />

          {/* Area Fill */}
          <polygon points={areaPoints} fill="url(#areaGradient)" />

          {/* Line Chart */}
          <polyline 
            points={points} 
            className="trend-line" 
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.rate);
            const isHovered = activePoint?.day === d.day;

            return (
              <g 
                key={d.day} 
                className="point-group"
                onMouseEnter={() => setActivePoint(d)}
                onMouseLeave={() => setActivePoint(null)}
              >
                {/* Invisible hover target */}
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={14} 
                  fill="transparent" 
                  style={{ cursor: 'pointer' }}
                />
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={isHovered ? 6 : 4.5} 
                  className={`data-circle ${isHovered ? 'active' : ''}`} 
                />
                {/* X-axis label */}
                <text 
                  x={cx} 
                  y={height - padBottom + 18} 
                  className="axis-label-day"
                >
                  {d.day}
                </text>
                <text 
                  x={cx} 
                  y={height - padBottom + 32} 
                  className="axis-label-date"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip */}
        {activePoint && (
          <div className="chart-tooltip-floating">
            <div className="tooltip-row">
              <span className="tooltip-day">{activePoint.day}, {activePoint.date}</span>
              <span className="tooltip-rate">{activePoint.rate}%</span>
            </div>
            <div className="tooltip-sub">
              <span>Scanned: {activePoint.totalScanned} units</span>
              <span className="tooltip-breach">{activePoint.nonCompliant} breaches</span>
            </div>
          </div>
        )}
      </div>

      <div className="chart-footer-bar">
        <div className="footer-stat">
          <Calendar size={14} />
          <span>Period: 06 Sep &ndash; 12 Sep 2026</span>
        </div>
        <div className="footer-stat">
          <Target size={14} />
          <span>Weekly Peak: <strong>81.0% (Sat)</strong> &bull; Average: <strong>77.3%</strong></span>
        </div>
      </div>
    </div>
  );
}

export default ComplianceTrendChart;
