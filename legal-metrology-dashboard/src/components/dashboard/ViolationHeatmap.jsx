import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Flame,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Search,
  Scale,
  FileWarning,
  Building2,
  FileText
} from 'lucide-react';
import analyticsService from '../../services/analyticsService';
import './ViolationHeatmap.css';

// Pan / Zoom Controller for Leaflet Map
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export function ViolationHeatmap() {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([22.5, 78.9]); // Center of India
  const [mapZoom, setMapZoom] = useState(5);

  const fetchHotspotData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getViolationsMap();
      setHotspots(data.hotspots || []);
    } catch (err) {
      console.error('Failed to load violation map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspotData();
  }, []);

  // Filter hotspots based on user selections
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((item) => {
      // Filter by Severity
      if (selectedSeverity !== 'ALL') {
        if (selectedSeverity === 'HIGH_ONLY') {
          if (item.offenceSeverity !== 'HIGH' && item.offenceSeverity !== 'CRITICAL') {
            return false;
          }
        } else if (item.offenceSeverity !== selectedSeverity) {
          return false;
        }
      }

      // Filter by Rule (Rule 6(11), Rule 9, etc.)
      if (selectedRule !== 'ALL') {
        const hasRule = item.ruleBreakdown?.some((r) => r.rule.includes(selectedRule));
        if (!hasRule && !item.mostCommonViolation?.includes(selectedRule)) {
          return false;
        }
      }

      // Filter by Pin Code or Region search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pinMatch = item.pinCode?.toLowerCase().includes(q);
        const regionMatch = item.region?.toLowerCase().includes(q);
        const stateMatch = item.state?.toLowerCase().includes(q);
        if (!pinMatch && !regionMatch && !stateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [hotspots, selectedSeverity, selectedRule, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalZones = hotspots.length;
    const highOffence = hotspots.filter(
      (h) => h.offenceSeverity === 'HIGH' || h.offenceSeverity === 'CRITICAL'
    ).length;
    const totalInfractions = hotspots.reduce(
      (acc, curr) => acc + (curr.totalViolations || 0),
      0
    );

    // Calculate most widespread rule across all hotspots
    const ruleCounter = {};
    hotspots.forEach((h) => {
      h.ruleBreakdown?.forEach((rb) => {
        ruleCounter[rb.rule] = (ruleCounter[rb.rule] || 0) + rb.count;
      });
    });

    const dominantRule =
      Object.entries(ruleCounter).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'Rule 6(11)';

    return { totalZones, highOffence, totalInfractions, dominantRule };
  }, [hotspots]);

  // Focus on searched hotspot if exact pin match
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    const match = hotspots.find((h) => h.pinCode === val.trim());
    if (match && match.coordinates) {
      setMapCenter(match.coordinates);
      setMapZoom(11);
    }
  };

  const getMarkerStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          color: '#b91c1c',
          fillColor: '#dc2626',
          radius: 22,
          weight: 3,
          fillOpacity: 0.85
        };
      case 'HIGH':
        return {
          color: '#dc2626',
          fillColor: '#ef4444',
          radius: 18,
          weight: 2.5,
          fillOpacity: 0.8
        };
      case 'MEDIUM':
        return {
          color: '#d97706',
          fillColor: '#f59e0b',
          radius: 14,
          weight: 2,
          fillOpacity: 0.75
        };
      case 'LOW':
      default:
        return {
          color: '#059669',
          fillColor: '#10b981',
          radius: 12,
          weight: 2,
          fillOpacity: 0.7
        };
    }
  };

  return (
    <div className="violation-heatmap-container">
      {/* Header & Controls Strip */}
      <div className="heatmap-header-card">
        <div className="heatmap-title-row">
          <div className="heatmap-title-group">
            <div className="heatmap-icon-badge">
              <Flame size={24} />
            </div>
            <div>
              <h2 className="heatmap-title">Geographical Non-Compliance Heatmap</h2>
              <p className="heatmap-subtitle">
                Senior supervisory monitoring under Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            </div>
          </div>

          <div className="heatmap-actions">
            <button
              type="button"
              className="refresh-btn"
              onClick={fetchHotspotData}
              disabled={loading}
              title="Refresh live hotspot data"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Live Map'}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="heatmap-stats-strip">
          <div className="heatmap-stat-pill">
            <div className="stat-pill-icon red">
              <Flame size={20} />
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-value">{metrics.highOffence}</span>
              <span className="stat-pill-label">High-Offence Zones (Red)</span>
            </div>
          </div>

          <div className="heatmap-stat-pill">
            <div className="stat-pill-icon amber">
              <FileWarning size={20} />
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-value">{metrics.dominantRule}</span>
              <span className="stat-pill-label">Dominant Infraction</span>
            </div>
          </div>

          <div className="heatmap-stat-pill">
            <div className="stat-pill-icon blue">
              <MapPin size={20} />
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-value">{metrics.totalZones}</span>
              <span className="stat-pill-label">Monitored Pin Codes</span>
            </div>
          </div>

          <div className="heatmap-stat-pill">
            <div className="stat-pill-icon purple">
              <Scale size={20} />
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-value">{metrics.totalInfractions}</span>
              <span className="stat-pill-label">Total Recorded Breaches</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="heatmap-filters-bar">
          <div className="filters-group-left">
            <label htmlFor="filter-rule" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Statutory Rule:
            </label>
            <select
              id="filter-rule"
              className="filter-select"
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
            >
              <option value="ALL">All Statutory Rules</option>
              <option value="Rule 6(11)">Rule 6(11) — E-Commerce Digital Declarations & QR</option>
              <option value="Rule 9">Rule 9 — Font Size & Manner of Declaration</option>
              <option value="Rule 6(1)(e)">Rule 6(1)(e) — Maximum Retail Price (MRP)</option>
              <option value="Rule 6(1)(f)">Rule 6(1)(f) — Net Quantity Standards</option>
              <option value="Rule 6(1)(a)">Rule 6(1)(a) — Manufacturer & Packer Identification</option>
            </select>

            <label htmlFor="filter-severity" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginLeft: '0.5rem' }}>
              Offence Level:
            </label>
            <select
              id="filter-severity"
              className="filter-select"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <option value="ALL">All Offence Levels</option>
              <option value="HIGH_ONLY">High Offence & Critical Only (Red)</option>
              <option value="CRITICAL">Critical Zones Only</option>
              <option value="MEDIUM">Medium Offence</option>
              <option value="LOW">Low / Compliant Zones</option>
            </select>
          </div>

          <div className="search-input-wrapper">
            <Search size={15} className="search-icon-inside" />
            <input
              type="text"
              className="pincode-search-input"
              placeholder="Search Pin Code (e.g. 110001)..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search pin code or region"
            />
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="heatmap-map-card">
        <div className="map-leaflet-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <MapViewController center={mapCenter} zoom={mapZoom} />

            {/* CartoDB Voyager Tile Layer for clean, readable governmental map */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {filteredHotspots.map((hotspot) => {
              const markerStyle = getMarkerStyle(hotspot.offenceSeverity);
              const isHighOffence =
                hotspot.offenceSeverity === 'CRITICAL' ||
                hotspot.offenceSeverity === 'HIGH';

              return (
                <React.Fragment key={hotspot.id}>
                  {/* Outer pulsating ring for High Offence areas */}
                  {isHighOffence && (
                    <CircleMarker
                      center={hotspot.coordinates}
                      radius={markerStyle.radius + 10}
                      pathOptions={{
                        color: '#ef4444',
                        weight: 1.5,
                        fillColor: '#ef4444',
                        fillOpacity: 0.2,
                        dashArray: '4, 4'
                      }}
                    />
                  )}

                  {/* Primary Hotspot Marker */}
                  <CircleMarker
                    center={hotspot.coordinates}
                    radius={markerStyle.radius}
                    pathOptions={{
                      color: markerStyle.color,
                      fillColor: markerStyle.fillColor,
                      fillOpacity: markerStyle.fillOpacity,
                      weight: markerStyle.weight
                    }}
                  >
                    {/* Hover Tooltip */}
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        Pin Code {hotspot.pinCode} &bull; {hotspot.region}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isHighOffence ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                        {hotspot.offenceSeverity} OFFENCE ZONE &bull; {hotspot.totalViolations} Violations
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                        Most common: <strong>{hotspot.mostCommonViolation}</strong>
                      </div>
                    </Tooltip>

                    {/* Click Popup with Legal Metrology Breakdown */}
                    <Popup maxWidth={320}>
                      <div className="hotspot-popup">
                        <div className="popup-header">
                          <div className="popup-pincode">
                            <span>Pin Code: {hotspot.pinCode}</span>
                            <span className={`popup-badge ${hotspot.offenceSeverity.toLowerCase()}`}>
                              {hotspot.offenceSeverity} OFFENCE
                            </span>
                          </div>
                          <div className="popup-region">
                            <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                            {hotspot.region} {hotspot.state ? `(${hotspot.state})` : ''}
                          </div>
                        </div>

                        <div className="popup-metrics-grid">
                          <div className="popup-metric-item">
                            <span className="popup-metric-label">Total Inspected</span>
                            <span className="popup-metric-val">{hotspot.totalInspections}</span>
                          </div>
                          <div className="popup-metric-item">
                            <span className="popup-metric-label">Infractions</span>
                            <span className="popup-metric-val danger">{hotspot.totalViolations}</span>
                          </div>
                          <div className="popup-metric-item">
                            <span className="popup-metric-label">Non-Compliant</span>
                            <span className="popup-metric-val danger">{hotspot.nonCompliantCount}</span>
                          </div>
                          <div className="popup-metric-item">
                            <span className="popup-metric-label">Compliance Rate</span>
                            <span className="popup-metric-val">{hotspot.complianceRate}%</span>
                          </div>
                        </div>

                        <div className="popup-violations-section">
                          <div className="popup-violations-title">
                            <span>Common Rule Breaches in Pin Code</span>
                            <FileText size={13} />
                          </div>

                          {hotspot.ruleBreakdown && hotspot.ruleBreakdown.length > 0 ? (
                            hotspot.ruleBreakdown.slice(0, 4).map((rb, idx) => (
                              <div key={idx} className="popup-violation-row">
                                <span className="violation-rule-name" title={rb.description}>
                                  {rb.rule}
                                </span>
                                <span className="violation-rule-count">
                                  {rb.count} case{rb.count > 1 ? 's' : ''}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="popup-violation-row">
                              <span className="violation-rule-name">General LMPC non-compliance</span>
                              <span className="violation-rule-count">{hotspot.totalViolations}</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="popup-action-btn"
                          onClick={() => {
                            window.location.hash = 'violations';
                          }}
                        >
                          <ShieldAlert size={14} />
                          <span>Initiate Area Enforcement Audit</span>
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Map Legend Overlay */}
        <div className="map-legend-overlay">
          <span className="legend-title">Non-Compliance Severity</span>
          <div className="legend-item">
            <span className="legend-dot critical" />
            <span>Critical Hotspot (High Offence)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot high" />
            <span>High Non-Compliance (Red)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot medium" />
            <span>Medium / Under Review</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot low" />
            <span>Low Offence / Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViolationHeatmap;
