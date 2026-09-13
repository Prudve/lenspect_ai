import React, { useRef, useState, useEffect } from 'react';
import InspectionHeader from '../components/product-details/InspectionHeader';
import EvidenceViewer from '../components/product-details/EvidenceViewer';
import ExtractedInformation from '../components/product-details/ExtractedInformation';
import DeclarationChecklist from '../components/product-details/DeclarationChecklist';
import ViolationDetails from '../components/product-details/ViolationDetails';
import InspectorDetailsCard from '../components/product-details/InspectorDetailsCard';
import InspectionTimeline from '../components/product-details/InspectionTimeline';
import SupervisorActionArea from '../components/product-details/SupervisorActionArea';

import api from '../services/api.js';
import './ProductDetailsPage.css';

function ProductDetailsPage({ product, onBack }) {
  const evidenceRef = useRef(null);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product?.inspectionId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [inspectionRes, noticesRes] = await Promise.all([
          api.get(`/inspections/${product.inspectionId}`).catch(() => null),
          api.get(`/notices/inspection/${product.inspectionId}`).catch(() => null)
        ]);

        // Since interceptor strips wrapper, the response itself might be the data or have .data depending on version.
        const data = inspectionRes?.data || inspectionRes;
        const noticesData = (noticesRes?.data?.notices || noticesRes?.notices) || [];

        if (data) {
          const isCompliant = data.complianceStatus === 'COMPLIANT';
          const isUnderReview = data.complianceStatus === 'NEEDS_REVIEW';

          const mappedDetail = {
            inspectionId: data._id,
            productName: data.extractedData?.commodity_name || 'Unknown Product',
            category: 'Other',
            manufacturer: data.extractedData?.manufacturer_name || data.extractedData?.country_origin || 'Unknown',
            packerAddress: data.extractedData?.packer_address || 'Not extracted',
            inspector: data.inspector?.fullName || data.inspector?.username || 'Unknown Inspector',
            inspectorId: data.inspector?._id || 'Unknown',
            jurisdiction: 'National Enforcement Grid',
            inspectionDate: new Date(data.createdAt).toLocaleDateString('en-GB'),
            inspectionTime: new Date(data.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: isCompliant ? 'Compliant' : isUnderReview ? 'Under Review' : 'Non-Compliant',
            violationCount: data.violations?.length || 0,
            evidenceImage: data.imageUrl,

            extractedData: {
              productName: data.extractedData?.commodity_name || 'Unknown',
              manufacturer: data.extractedData?.manufacturer_name || 'Unknown',
              mrp: data.extractedData?.mrp_val ? `₹${data.extractedData.mrp_val}` : 'Missing',
              netQuantity: data.extractedData?.net_quantity || 'Missing',
              unitOfMeasurement: data.extractedData?.unit_symbol || '',
              consumerCare: data.extractedData?.consumer_care_email || data.extractedData?.consumer_care_phone || 'Missing',
              dateOfPacking: data.extractedData?.mfg_date || 'Missing',
              batchNumber: 'N/A',
              unitSalePrice: 'N/A'
            },

            checklist: [
              {
                declaration: 'Maximum Retail Price (MRP)',
                ruleReference: 'Rule 6(1)(e)',
                extractedValue: data.extractedData?.mrp_val || 'Missing',
                status: data.extractedData?.mrp_val ? 'Present' : 'Missing',
                remarks: data.extractedData?.mrp_val ? 'Found' : 'Requires review'
              },
              {
                declaration: 'Net Quantity',
                ruleReference: 'Rule 6(1)(f)',
                extractedValue: data.extractedData?.net_quantity || 'Missing',
                status: data.extractedData?.net_quantity ? 'Present' : 'Missing',
                remarks: 'Checked'
              }
            ],

            violations: data.violations?.map((v, idx) => ({
              id: `VIO-${data._id}-${idx}`,
              title: v.description || 'Mandatory Declaration Discrepancy',
              severity: 'High',
              ruleReference: v.rule || 'PC Rules, 2011',
              explanation: v.description,
              status: 'Pending Review'
            })) || [],

            timeline: [
              { step: 'Field Inspection Initiated', time: new Date(data.createdAt).toLocaleString(), actor: data.inspector?.fullName || data.inspector?.username, status: 'completed' },
              { step: 'AI Analysis Complete', time: new Date(data.createdAt).toLocaleString(), actor: 'System', status: 'completed' },
              { step: 'Supervisor Review', time: 'Awaiting Action', actor: 'Supervisor', status: 'pending' }
            ],

            notices: noticesData
          };
          setDetail(mappedDetail);
        }
      } catch (err) {
        console.error("Error fetching detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [product]);

  const scrollToEvidence = () => {
    evidenceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>Loading Inspection Details...</div>;
  }

  if (!detail) return null;

  const isCompliant = detail.status === 'Compliant';

  return (
    <div className="product-details-page">
      {/* TOP & ROW 1: Breadcrumb, Inspection ID, Product Identity & Compliance Status */}
      <InspectionHeader
        detail={detail}
        onBack={onBack}
        backLabel="Inspection History"
      />

      {/* ROW 2: Package Evidence Viewer & Extracted Package Information */}
      <div className="details-grid-two-col" ref={evidenceRef}>
        <div className="grid-evidence-col">
          <EvidenceViewer detail={detail} />
        </div>
        <div className="grid-extracted-col">
          <ExtractedInformation
            extractedData={detail.extractedData}
            isCompliant={isCompliant}
          />
        </div>
      </div>

      {/* ROW 3: Mandatory Declaration Compliance Checklist */}
      <div className="details-full-row">
        <DeclarationChecklist checklist={detail.checklist} />
      </div>

      {/* ROW 4: Detected Violations Section */}
      <div className="details-full-row">
        <ViolationDetails
          violations={detail.violations}
          isCompliant={isCompliant}
        />
      </div>

      {/* ROW 5: Field Inspector Information & Process Timeline */}
      <div className="details-grid-two-col">
        <div className="grid-inspector-col">
          <InspectorDetailsCard detail={detail} />
        </div>
        <div className="grid-timeline-col">
          <InspectionTimeline timeline={detail.timeline} />
        </div>
      </div>

      {/* BOTTOM: Supervisory Action Area */}
      <div className="details-full-row">
        <SupervisorActionArea
          detail={detail}
          onBack={onBack}
          onScrollToEvidence={scrollToEvidence}
          onNoticeGenerated={(newNotice) => {
            setDetail(prev => prev ? { ...prev, notices: [...prev.notices, newNotice] } : prev);
          }}
        />
      </div>
    </div>
  );
}

export default ProductDetailsPage;
