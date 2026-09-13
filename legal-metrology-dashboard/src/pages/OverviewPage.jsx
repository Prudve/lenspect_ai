import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowUpRight, Loader2 } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import ComplianceTrendChart from '../components/dashboard/ComplianceTrendChart';
import RecentInspectionsTable from '../components/dashboard/RecentInspectionsTable';
import api from '../services/api.js';

import './OverviewPage.css';

function OverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          complianceRateRes,
          trendRes,
          topViolationsRes,
          mapRes,
          inspectionsRes
        ] = await Promise.all([
          api.get('/analytics/compliance-rate').catch(err => { console.error("Rate Error:", err); return null; }),
          api.get('/analytics/compliance-trend').catch(err => { console.error("Trend Error:", err); return null; }),
          api.get('/analytics/top-violations').catch(err => { console.error("Violations Error:", err); return null; }),
          api.get('/analytics/violations-map').catch(err => { console.error("Map Error:", err); return null; }),
          api.get('/inspections?limit=7').catch(err => { console.error("Inspections Error:", err); return null; })
        ]);

        const complianceData = complianceRateRes?.data || { total: 0, compliant: 0, nonCompliant: 0, needsReview: 0, complianceRate: 0 };

        // Construct KPI data to match UI
        const kpiData = [
          {
            id: 'scanned-total',
            title: 'Total Products Scanned',
            value: complianceData.total.toLocaleString(),
            subtext: 'Across all monitored zones',
            trend: 'Live Data',
            trendType: 'neutral',
            iconName: 'Package',
            accentColor: '#1e3a8a'
          },
          {
            id: 'compliant-count',
            title: 'Compliant Products',
            value: complianceData.compliant.toLocaleString(),
            subtext: 'Meets mandatory declarations',
            trend: 'Live Data',
            trendType: 'positive',
            iconName: 'CheckCircle2',
            accentColor: '#16a34a'
          },
          {
            id: 'non-compliant-count',
            title: 'Non-Compliant Products',
            value: complianceData.nonCompliant.toLocaleString(),
            subtext: 'Flagged for statutory rule violations',
            trend: 'Live Data',
            trendType: 'negative',
            iconName: 'AlertOctagon',
            accentColor: '#dc2626'
          },
          {
            id: 'compliance-rate',
            title: 'Compliance Rate',
            value: `${complianceData.complianceRate}%`,
            subtext: 'Target threshold: 85.0%',
            trend: 'Live Data',
            trendType: complianceData.complianceRate >= 85 ? 'positive' : 'negative',
            iconName: 'Percent',
            accentColor: '#2563eb'
          }
        ];

        // Format Trend Data
        const trendData = (trendRes?.data || []).map((t, i) => {
          const d = new Date(t.date);
          const total = (t.COMPLIANT || 0) + (t.NON_COMPLIANT || 0) + (t.NEEDS_REVIEW || 0);
          const nonCompliant = t.NON_COMPLIANT || 0;
          const rate = total > 0 ? ((total - nonCompliant) / total) * 100 : 0;
          return {
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
            date: `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`,
            rate: Math.round(rate),
            totalScanned: total,
            nonCompliant: nonCompliant
          };
        });

        // Format Violations Summary
        const totalTopVio = (topViolationsRes?.data || []).reduce((acc, v) => acc + v.count, 0);
        const violationSummaryData = (topViolationsRes?.data || []).map(v => ({
          category: v.rule,
          rule: v.rule,
          count: v.count,
          percentage: totalTopVio > 0 ? ((v.count / totalTopVio) * 100).toFixed(1) : 0,
          severity: 'High'
        }));

        // Format Recent Inspections
        const recentInspectionsData = (inspectionsRes?.data?.inspections || []).map(item => {
          const dateObj = new Date(item.createdAt);
          return {
            id: item._id,
            product: item.extractedData?.commodity_name || 'Unknown Product',
            category: 'Monitored Product',
            manufacturer: item.extractedData?.manufacturer_name || item.extractedData?.country_origin || 'Unknown',
            inspector: item.inspector?.fullName || item.inspector?.username || 'Unknown Inspector',
            inspectorId: item.inspector?._id || 'Unknown',
            timestamp: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: item.complianceStatus === 'COMPLIANT' ? 'Compliant' : item.complianceStatus === 'NON_COMPLIANT' ? 'Non-Compliant' : 'Under Review'
          };
        });

        // Format Hotspots
        const hotspotsData = (mapRes?.data?.hotspots || []).slice(0, 3).map(h => ({
          id: h.id,
          name: `${h.region} (${h.pinCode})`,
          stat: `${h.totalViolations} Violations • ${h.mostCommonViolation}`,
          color: h.offenceSeverity === 'CRITICAL' ? 'red' : h.offenceSeverity === 'HIGH' ? 'orange' : 'amber'
        }));

        // Extract Violations for recent violations table (mocked from recent non-compliant inspections)
        const recentViolationsData = (inspectionsRes?.data?.inspections || [])
          .filter(i => i.complianceStatus === 'NON_COMPLIANT')
          .slice(0, 5)
          .map(item => ({
            id: `VIO-${item._id.substring(item._id.length - 6)}`,
            product: item.extractedData?.commodity_name || 'Unknown Product',
            violation: item.violations?.[0]?.description || 'Statutory Rule Violation',
            ruleBreached: item.violations?.[0]?.rule || 'Multiple Rules',
            severity: 'High',
            inspector: item.inspector?.fullName || item.inspector?.username || 'Unknown Inspector',
            timestamp: new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            actionStatus: 'Under Review'
          }));

        setData({
          kpiData,
          complianceTrendData: trendData.length > 0 ? trendData : [],
          violationSummaryData: violationSummaryData,
          recentInspectionsData,
          recentViolationsData,
          hotspotsData,
          repeatViolationAlert: null // No direct endpoint for this right now
        });
      } catch (error) {
        console.error('Failed to fetch overview data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="overview-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={32} />
        <span style={{ marginLeft: '12px' }}>Loading Dashboard Data...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="overview-page">
      {/* 1. TOP: KPI Summary Cards */}
      <section className="overview-section" aria-label="Key Performance Indicators">
        <div className="kpi-grid">
          {data.kpiData.map((kpi) => (
            <StatCard key={kpi.id} item={kpi} />
          ))}
        </div>
      </section>

      {/* 2. MIDDLE: Compliance Trend */}
      <section className="overview-section middle-grid" aria-label="Compliance Analytics">
        <div className="trend-column">
          <ComplianceTrendChart data={data.complianceTrendData} />
        </div>
      </section>

      {/* 3. BOTTOM: Recent Inspection Activity */}
      <section className="overview-section bottom-grid" aria-label="Recent Operational Activity">
        <div className="table-column">
          <RecentInspectionsTable inspections={data.recentInspectionsData} />
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
