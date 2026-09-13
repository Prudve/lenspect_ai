import React, { useMemo, useState } from 'react';
import {
  FileBarChart,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users
} from 'lucide-react';

import api from '../services/api';
import './ComplianceReportsPage.css';

function ComplianceReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 7 Days');
  const [loading, setLoading] = useState(true);

  // States for analytics data
  const [reportSummary, setReportSummary] = useState({
    totalInspections: 0,
    compliant: 0,
    nonCompliant: 0,
    complianceRate: 0,
    activeInspectors: 0
  });
  const [trendData, setTrendData] = useState([]);
  const [violationCategories, setViolationCategories] = useState([]);
  const [inspectorReport, setInspectorReport] = useState([]);

  const REPORT_PERIODS = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Year to Date'];

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        let days = 7;
        if (selectedPeriod === 'Last 30 Days') days = 30;
        else if (selectedPeriod === 'Last 90 Days') days = 90;
        else if (selectedPeriod === 'Year to Date') days = 365;

        const [rateRes, trendRes, topVioRes, leaderRes] = await Promise.all([
          api.get('/analytics/compliance-rate').catch(() => ({ data: {} })),
          api.get(`/analytics/compliance-trend?days=${days}`).catch(() => ({ data: [] })),
          api.get('/analytics/top-violations').catch(() => ({ data: [] })),
          api.get('/analytics/inspector-leaderboard?limit=10').catch(() => ({ data: [] }))
        ]);

        const rateData = rateRes?.data || rateRes || {};
        setReportSummary({
          totalInspections: rateData.total || 0,
          compliant: rateData.compliant || 0,
          nonCompliant: rateData.nonCompliant || 0,
          complianceRate: rateData.complianceRate || 0,
          activeInspectors: leaderRes?.data?.length || leaderRes?.length || 0
        });

        const trendArray = trendRes?.data || trendRes || [];
        setTrendData(trendArray.map(item => ({
          date: item.date,
          inspections: (item.COMPLIANT || 0) + (item.NON_COMPLIANT || 0) + (item.NEEDS_REVIEW || 0),
          compliant: item.COMPLIANT || 0
        })));

        const viosArray = topVioRes?.data || topVioRes || [];
        const totalVios = viosArray.reduce((acc, v) => acc + (v.count || 0), 0);
        setViolationCategories(viosArray.map(v => ({
          category: v.rule,
          count: v.count,
          percentage: totalVios > 0 ? Math.round((v.count / totalVios) * 100) : 0
        })));

        const leaderArray = leaderRes?.data || leaderRes || [];
        setInspectorReport(leaderArray.map(l => {
          const t = l.totalScans || 0;
          const c = l.compliantScans || 0;
          return {
            id: l.inspector?._id || 'ID',
            name: l.inspector?.fullName || l.inspector?.username || 'Unknown',
            inspections: t,
            compliant: c,
            nonCompliant: l.nonCompliantScans || 0,
            complianceRate: t > 0 ? Math.round((c / t) * 100) : 0
          };
        }));
      } catch (e) {
        console.error("Failed to fetch reports", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedPeriod]);

  const trendTotal = useMemo(() => trendData.reduce((total, item) => total + item.inspections, 0), [trendData]);
  const trendCompliant = useMemo(() => trendData.reduce((total, item) => total + item.compliant, 0), [trendData]);
  const trendRate = trendTotal > 0 ? ((trendCompliant / trendTotal) * 100).toFixed(1) : "0.0";
  const handleExport = () => {
    const rows = [
      ['Legal Metrology Compliance Report'],
      ['Report Period', selectedPeriod],
      [],
      ['Summary'],
      ['Total Inspections', reportSummary.totalInspections],
      ['Compliant', reportSummary.compliant],
      ['Non-Compliant', reportSummary.nonCompliant],
      ['Compliance Rate', `${reportSummary.complianceRate}%`],
      ['Active Inspectors', reportSummary.activeInspectors],
      [],
      ['Violation Category', 'Count', 'Percentage'],
      ...violationCategories.map(item => [
        item.category,
        item.count,
        `${item.percentage}%`
      ]),
      [],
      ['Inspector Performance'],
      ['Inspector ID', 'Inspector Name', 'Inspections', 'Compliant', 'Non-Compliant', 'Compliance Rate'],
      ...inspectorReport.map(item => [
        item.id,
        item.name,
        item.inspections,
        item.compliant,
        item.nonCompliant,
        `${item.complianceRate}%`
      ]),
      [],
      ['Manufacturer Compliance Summary'],
      ['Manufacturer', 'Inspections', 'Violations', 'Status'],
      ...MANUFACTURER_REPORT_DATA.map(item => [
        item.name,
        item.inspections,
        item.violations,
        item.status
      ])
    ];

    const csvContent = rows
      .map(row =>
        row
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `legal-metrology-report-${selectedPeriod
      .toLowerCase()
      .replace(/\s+/g, '-')}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page">
      {/* Page Header */}
      <div className="reports-page-header">
        <div>
          <div className="reports-title-row">
            <div className="reports-title-icon">
              <FileBarChart size={21} />
            </div>
            <div>
              <h2>Compliance Reports</h2>
              <p>
                Generate compliance summaries and enforcement reports
                from field inspection data.
              </p>
            </div>
          </div>
        </div>

        <div className="reports-actions">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {REPORT_PERIODS.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>

          <button className="export-report-button" onClick={handleExport}>
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="report-summary-grid">
        <div className="report-summary-card">
          <div className="report-card-icon total">
            <FileBarChart size={19} />
          </div>
          <div>
            <span>Total Inspections</span>
            <strong>{reportSummary.totalInspections.toLocaleString()}</strong>
            <small>All recorded inspections</small>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-card-icon compliant">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <span>Compliant</span>
            <strong>{reportSummary.compliant.toLocaleString()}</strong>
            <small>Packages meeting requirements</small>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-card-icon non-compliant">
            <AlertTriangle size={19} />
          </div>
          <div>
            <span>Non-Compliant</span>
            <strong>{reportSummary.nonCompliant.toLocaleString()}</strong>
            <small>Inspections requiring attention</small>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-card-icon rate">
            <TrendingUp size={19} />
          </div>
          <div>
            <span>Compliance Rate</span>
            <strong>{reportSummary.complianceRate}%</strong>
            <small>Overall recorded rate</small>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-card-icon inspectors">
            <Users size={19} />
          </div>
          <div>
            <span>Active Inspectors</span>
            <strong>{reportSummary.activeInspectors}</strong>
            <small>Currently assigned officers</small>
          </div>
        </div>
      </div>

      {/* Trend + Violation Distribution */}
      <div className="reports-two-column">
        <section className="report-panel">
          <div className="report-panel-header">
            <div>
              <h3>Compliance Trend</h3>
              <p>Inspection results recorded over the selected reporting period.</p>
            </div>
            <span className="trend-rate">{trendRate}%</span>
          </div>

          <div className="trend-chart">
            <div className="chart-y-labels">
              <span>220</span>
              <span>165</span>
              <span>110</span>
              <span>55</span>
              <span>0</span>
            </div>

            <div className="chart-area">
              <div className="chart-grid-line line-1" />
              <div className="chart-grid-line line-2" />
              <div className="chart-grid-line line-3" />
              <div className="chart-grid-line line-4" />

              <div className="bars">
                {trendData.map((item) => {
                  const totalHeight = (item.inspections / 220) * 100;
                  const compliantHeight =
                    (item.compliant / item.inspections) * totalHeight;

                  return (
                    <div className="chart-bar-group" key={item.date}>
                      <div className="chart-bar-container">
                        <div
                          className="chart-bar total-bar"
                          style={{ height: `${totalHeight}%` }}
                          title={`${item.inspections} inspections`}
                        >
                          <div
                            className="chart-bar-compliant"
                            style={{ height: `${compliantHeight}%` }}
                          />
                        </div>
                      </div>
                      <span>{item.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-box compliant-box" />
              Compliant
            </span>
            <span>
              <i className="legend-box non-compliant-box" />
              Non-Compliant
            </span>
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel-header">
            <div>
              <h3>Violations by Category</h3>
              <p>Distribution of detected declaration issues.</p>
            </div>
          </div>

          <div className="violation-distribution">
            {violationCategories.map((item) => (
              <div className="distribution-row" key={item.category}>
                <div className="distribution-info">
                  <span>{item.category}</span>
                  <strong>{item.count}</strong>
                </div>

                <div className="distribution-bar">
                  <div
                    className="distribution-fill"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <span className="distribution-percent">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Inspector Performance */}
      <section className="report-panel full-width-panel">
        <div className="report-panel-header">
          <div>
            <h3>Inspector Performance Summary</h3>
            <p>
              Inspection volume and compliance results by field inspector.
            </p>
          </div>
        </div>

        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Inspector</th>
                <th>Inspector ID</th>
                <th>Total Inspections</th>
                <th>Compliant</th>
                <th>Non-Compliant</th>
                <th>Compliance Rate</th>
              </tr>
            </thead>

            <tbody>
              {inspectorReport.map((inspector) => (
                <tr key={inspector.id}>
                  <td>
                    <div className="person-cell">
                      <div className="person-icon">
                        <Users size={15} />
                      </div>
                      <strong>{inspector.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="report-id">{inspector.id}</span>
                  </td>
                  <td>{inspector.inspections}</td>
                  <td>
                    <span className="table-positive">
                      {inspector.compliant}
                    </span>
                  </td>
                  <td>
                    <span className="table-negative">
                      {inspector.nonCompliant}
                    </span>
                  </td>
                  <td>
                    <div className="rate-cell">
                      <span>{inspector.complianceRate}%</span>
                      <div className="mini-progress">
                        <div
                          style={{
                            width: `${inspector.complianceRate}%`
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

export default ComplianceReportsPage;