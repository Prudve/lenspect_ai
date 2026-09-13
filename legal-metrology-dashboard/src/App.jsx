import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/layout/MainLayout';
import OverviewPage from './pages/OverviewPage';
import ScannedProductsPage from './pages/ScannedProductsPage';
import InspectorsPage from './pages/InspectorsPage';
import ViolationsPage from './pages/ViolationsPage';
import ComplianceReportsPage from './pages/ComplianceReportsPage';
import InspectionHistoryPage from './pages/InspectionHistoryPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ViolationHeatmap from './components/dashboard/ViolationHeatmap';

import {
  LayoutDashboard,
  Flame,
  PackageCheck,
  AlertTriangle,
  FileBarChart,
  Users,
  History
} from 'lucide-react';

const SECTIONS_CONFIG = {
  overview: {
    title: 'Overview',
    subtitle: 'Compliance monitoring and inspection overview',
    headline: 'Supervisor Dashboard',
    description: 'Real-time compliance monitoring and inspection overview across designated jurisdictions.',
    stepInfo: 'Enforcement Portal',
    details: 'This section houses high-level compliance metrics, statutory violation distribution, and recent scans feed.',
    icon: LayoutDashboard
  },

  'hotspot-map': {
    title: 'Hotspot Analytics',
    subtitle: 'Geographical distribution of Legal Metrology non-compliance & violation hotspots',
    headline: 'Jurisdiction Hotspot Surveillance',
    description: 'Real-time GPS heatmap tracking high-offence pin codes and rule violation frequencies under PC Rules, 2011.',
    stepInfo: 'Enforcement Portal',
    details: 'Interactive Leaflet GIS map displaying concentrated areas of non-compliance (Rule 6(11), Rule 9, Rule 6(1)(e), etc.) with live pin code drill-downs.',
    icon: Flame
  },

  'scanned-products': {
    title: 'Scanned Products',
    subtitle: 'Enforcement records of packaged commodities inspected by field officers',
    headline: 'Scanned Products Directory',
    description: 'Searchable repository of all commodities scanned by mobile field inspectors.',
    stepInfo: 'Enforcement Portal',
    details: 'Displays tabular and filterable views of scanned packages, commodity categories, brands, manufacturers, and immediate compliance statuses.',
    icon: PackageCheck
  },

  violations: {
    title: 'Violations',
    subtitle: 'Detailed breakdown of Legal Metrology declaration breaches',
    headline: 'Violations & Enforcement Actions',
    description: 'Enforcement tracking for missing or non-compliant mandatory declarations under PC Rules, 2011.',
    stepInfo: 'Enforcement Portal',
    details: 'Tracks missing declarations (MRP, Net Quantity, Mfg Date, Consumer Care, Manufacturer details) and repeat-offender patterns.',
    icon: AlertTriangle
  },

  'compliance-reports': {
    title: 'Compliance Reports',
    subtitle: 'Statutory reporting and audit summaries under PC Rules, 2011',
    headline: 'Compliance Reports & Analytics',
    description: 'Official enforcement analytics and exportable compliance summaries.',
    stepInfo: 'Enforcement Portal',
    details: 'Enables supervisors to generate official compliance reports, zone summaries, and audit exports for the Department of Consumer Affairs.',
    icon: FileBarChart
  },

  inspectors: {
    title: 'Inspectors',
    subtitle: 'Field inspector workforce deployment and scanning performance',
    headline: 'Field Inspector Monitoring',
    description: 'Field officer directory, active inspection locations, and scanning productivity.',
    stepInfo: 'Enforcement Portal',
    details: 'Tracks field inspectors, their assigned districts/markets, total scans performed, and verification accuracy.',
    icon: Users
  },

  'inspection-history': {
    title: 'Inspection History',
    subtitle: 'Chronological audit trail of all commodity scans and verification actions',
    headline: 'Inspection Audit Trail',
    description: 'Complete chronological history and timestamped audit logs of all past inspections.',
    stepInfo: 'Enforcement Portal',
    details: 'Provides a tamper-evident record of all historical scans, supervisor reviews, and enforcement actions taken.',
    icon: History
  }
};

/**
 * Product Details Route Adapter
 */
function ProductDetailsWrapper() {
  const { inspectionId } = useParams();
  const navigate = useNavigate();

  return (
    <ProductDetailsPage
      product={{ inspectionId }}
      onBack={() => navigate('/inspection-history')}
    />
  );
}

/**
 * Protected Dashboard Shell with MainLayout and React Router
 */
function DashboardShell({ children, currentSection }) {
  const navigate = useNavigate();

  const activeMeta = SECTIONS_CONFIG[currentSection] || SECTIONS_CONFIG.overview;

  const handleSelectSection = (sectionId) => {
    navigate(`/${sectionId}`);
  };

  return (
    <MainLayout
      currentSection={currentSection}
      onSelectSection={handleSelectSection}
      sectionMeta={activeMeta}
    >
      {children}
    </MainLayout>
  );
}

/**
 * Main Application Root with Authentication and Route Guarding
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/overview" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="overview">
                  <OverviewPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          {/* New Action Item: Hotspot Analytics with Leaflet Heatmap */}
          <Route
            path="/hotspot-map"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="hotspot-map">
                  <ViolationHeatmap />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/scanned-products"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="scanned-products">
                  <ScannedProductsPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/violations"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="violations">
                  <ViolationsPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/compliance-reports"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="compliance-reports">
                  <ComplianceReportsPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspectors"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="inspectors">
                  <InspectorsPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspection-history"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="inspection-history">
                  <InspectionHistoryPage
                    onViewInspection={(id) => (window.location.href = `/product-details/${id}`)}
                  />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/product-details/:inspectionId"
            element={
              <ProtectedRoute>
                <DashboardShell currentSection="inspection-history">
                  <ProductDetailsWrapper />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;