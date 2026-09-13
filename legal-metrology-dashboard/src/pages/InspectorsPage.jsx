import React, { useMemo, useState } from 'react';
import {
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  MapPin
} from 'lucide-react';
import api from '../services/api';
import './InspectorsPage.css';

function InspectorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [inspectorsData, setInspectorsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const INSPECTOR_DIVISIONS = ['All', 'North Division', 'South Division', 'East Division', 'West Division', 'Central Division'];
  const INSPECTOR_STATUSES = ['All', 'Active', 'On Leave', 'Suspended'];

  React.useEffect(() => {
    const fetchInspectors = async () => {
      try {
        const response = await api.get('/analytics/inspector-leaderboard?limit=100');
        const leaderboard = response?.data || response || [];

        const mappedData = leaderboard.map(item => {
          const total = item.totalScans || 0;
          const compliant = item.compliantScans || 0;
          const nonCompliant = item.nonCompliantScans || 0;
          const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;

          return {
            id: item.inspector?._id || 'Unknown',
            name: item.inspector?.fullName || item.inspector?.username || 'Field Inspector',
            division: 'Central Division',
            assignedArea: 'National Grid',
            inspections: total,
            compliant: compliant,
            nonCompliant: nonCompliant,
            complianceRate: rate,
            status: 'Active',
            lastInspection: total > 0 ? 'Recently' : 'Never',
            recentInspections: [],
            violationSummary: []
          };
        });
        setInspectorsData(mappedData);
      } catch (err) {
        console.error('Failed to fetch inspectors', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInspectors();
  }, []);

  const filteredInspectors = useMemo(() => {
    return inspectorsData.filter((inspector) => {
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        inspector.name.toLowerCase().includes(query) ||
        inspector.id.toLowerCase().includes(query) ||
        inspector.assignedArea.toLowerCase().includes(query);

      const matchesDivision =
        selectedDivision === 'All' ||
        inspector.division === selectedDivision;

      const matchesStatus =
        selectedStatus === 'All' ||
        inspector.status === selectedStatus;

      return matchesSearch && matchesDivision && matchesStatus;
    });
  }, [inspectorsData, searchTerm, selectedDivision, selectedStatus]);

  const summary = useMemo(() => {
    const total = inspectorsData.length;
    const active = inspectorsData.filter(
      (item) => item.status === 'Active'
    ).length;
    const onLeave = inspectorsData.filter(
      (item) => item.status === 'On Leave'
    ).length;

    const totalInspections = inspectorsData.reduce(
      (sum, item) => sum + item.inspections,
      0
    );

    const totalViolations = inspectorsData.reduce(
      (sum, item) => sum + item.nonCompliant,
      0
    );

    return {
      total,
      active,
      onLeave,
      totalInspections,
      totalViolations
    };
  }, [inspectorsData]);
  if (selectedInspector) {
    const detail = inspectorsData.find(i => i.id === selectedInspector) || inspectorsData[0];

    return (
      <div className="inspectors-page">
        <button
          className="back-to-inspectors"
          onClick={() => setSelectedInspector(null)}
        >
          ← Back to Inspectors
        </button>

        <div className="inspector-detail-card">
          <div className="inspector-detail-header">
            <div className="inspector-detail-avatar">
              {detail.name
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 2)}
            </div>

            <div>
              <h2>{detail.name}</h2>
              <p>{detail.id} • {detail.division}</p>
              <span className={`inspector-status status-${detail.status.toLowerCase().replace(' ', '-')}`}>
                {detail.status}
              </span>
            </div>
          </div>

          <div className="inspector-detail-location">
            <strong>Assigned Area</strong>
            <span>{detail.assignedArea}</span>
          </div>

          <div className="inspector-detail-stats">
            <div>
              <span>Total Inspections</span>
              <strong>{detail.totalInspections}</strong>
            </div>

            <div>
              <span>Compliant</span>
              <strong>{detail.compliant}</strong>
            </div>

            <div>
              <span>Non-Compliant</span>
              <strong>{detail.nonCompliant}</strong>
            </div>

            <div>
              <span>Compliance Rate</span>
              <strong>{detail.complianceRate}%</strong>
            </div>
          </div>

          <div className="inspector-detail-section">
            <h3>Recent Inspections</h3>

            <div className="recent-inspections-list">
              {detail.recentInspections.map((inspection) => (
                <div className="recent-inspection-row" key={inspection.id}>
                  <div>
                    <strong>{inspection.product}</strong>
                    <span>{inspection.id}</span>
                  </div>

                  <div>
                    <span>{inspection.date}</span>
                    <span className={`inspection-result ${inspection.status === 'Compliant' ? 'result-compliant' : 'result-non-compliant'}`}>
                      {inspection.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="inspector-detail-section">
            <h3>Violation Summary</h3>

            <div className="violation-summary-list">
              {detail.violationSummary.map((item) => (
                <div className="violation-summary-row" key={item.type}>
                  <span>{item.type}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="inspectors-page">

      <div className="inspectors-page-header">
        <div>
          <h2>Inspectors</h2>
          <p>
            Monitor field inspector activity, inspection performance and
            assigned enforcement areas.
          </p>
        </div>

        <div className="inspectors-count">
          <Users size={17} />
          <span>
            {filteredInspectors.length} of {inspectorsData.length} inspectors
          </span>
        </div>
      </div>

      <div className="inspector-summary-grid">

        <div className="inspector-summary-card">
          <div className="summary-icon">
            <Users size={20} />
          </div>
          <div>
            <span>Total Inspectors</span>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="inspector-summary-card">
          <div className="summary-icon">
            <UserCheck size={20} />
          </div>
          <div>
            <span>Active Inspectors</span>
            <strong>{summary.active}</strong>
          </div>
        </div>

        <div className="inspector-summary-card">
          <div className="summary-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>On Leave</span>
            <strong>{summary.onLeave}</strong>
          </div>
        </div>

        <div className="inspector-summary-card">
          <div className="summary-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Total Inspections</span>
            <strong>{summary.totalInspections}</strong>
          </div>
        </div>

        <div className="inspector-summary-card">
          <div className="summary-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>Non-Compliant Findings</span>
            <strong>{summary.totalViolations}</strong>
          </div>
        </div>

      </div>

      <div className="inspectors-filter-card">

        <div className="inspector-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by inspector name, ID or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
        >
          {INSPECTOR_DIVISIONS.map((division) => (
            <option key={division} value={division}>
              {division === 'All' ? 'All Divisions' : division}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {INSPECTOR_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === 'All' ? 'All Statuses' : status}
            </option>
          ))}
        </select>

      </div>

      <div className="inspectors-table-card">

        <div className="inspectors-table-header">
          <div>
            <h3>Field Inspector Directory</h3>
            <p>
              Inspection activity and compliance performance of field officers.
            </p>
          </div>
        </div>

        <div className="inspectors-table-wrapper">
          <table className="inspectors-table">
            <thead>
              <tr>
                <th>Inspector</th>
                <th>Division / Area</th>
                <th>Inspections</th>
                <th>Compliant</th>
                <th>Non-Compliant</th>
                <th>Compliance Rate</th>
                <th>Status</th>
                <th>Last Inspection</th>
              </tr>
            </thead>

            <tbody>
              {filteredInspectors.length > 0 ? (
                filteredInspectors.map((inspector) => (
                  <tr key={inspector.id}>

                    <td>
                      <div className="inspector-name-cell">
                        <div className="inspector-avatar">
                          {inspector.name
                            .split(' ')
                            .map((word) => word[0])
                            .join('')
                            .slice(0, 2)}
                        </div>

                        <div>
                          <button
                            className="inspector-name-button"
                            onClick={() => setSelectedInspector(inspector.id)}
                          >
                            {inspector.name}
                          </button>
                          <span>{inspector.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="area-cell">
                        <strong>{inspector.division}</strong>
                        <span>
                          <MapPin size={13} />
                          {inspector.assignedArea}
                        </span>
                      </div>
                    </td>

                    <td>{inspector.inspections}</td>

                    <td className="compliant-number">
                      {inspector.compliant}
                    </td>

                    <td className="non-compliant-number">
                      {inspector.nonCompliant}
                    </td>

                    <td>
                      <div className="rate-cell">
                        <strong>{inspector.complianceRate}%</strong>
                        <div className="rate-bar">
                          <div
                            style={{
                              width: `${inspector.complianceRate}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`inspector-status status-${inspector.status
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {inspector.status}
                      </span>
                    </td>

                    <td>
                      <span className="last-inspection">
                        {inspector.lastInspection}
                      </span>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-inspectors">
                    No inspectors found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}

export default InspectorsPage;