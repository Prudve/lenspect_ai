import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, BookmarkPlus, Download, Info, FileText } from 'lucide-react';
import { inspectionService, noticeService } from '../../services/api';
import './SupervisorActionArea.css';

function SupervisorActionArea({ detail, onBack, onScrollToEvidence, onNoticeGenerated }) {
  const [reviewStatus, setReviewStatus] = useState(detail.status === 'Compliant' ? 'endorsed' : null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMarkForReview = async () => {
    try {
      setLoading(true);
      await inspectionService.updateInspection(detail.inspectionId, { complianceStatus: 'NEEDS_REVIEW' });
      setReviewStatus('marked');
      setFeedbackMessage(`Inspection ${detail.inspectionId} flagged for review.`);
    } catch (err) {
      setFeedbackMessage('Failed to flag inspection.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  const handleEndorseRecord = async () => {
    try {
      setLoading(true);
      await inspectionService.updateInspection(detail.inspectionId, { complianceStatus: 'COMPLIANT' });
      setReviewStatus('endorsed');
      setFeedbackMessage(`Inspection ${detail.inspectionId} verified and endorsed.`);
    } catch (err) {
      setFeedbackMessage('Failed to endorse inspection.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  const handleGenerateNotice = async () => {
    try {
      setLoading(true);
      const res = await noticeService.generateNotice(detail.inspectionId, { notes: 'Statutory Notice generated via dashboard.' });
      const newNotice = res?.data?.notice || res?.notice || { _id: Date.now().toString() };
      if (onNoticeGenerated) onNoticeGenerated(newNotice);
      setFeedbackMessage(`Statutory Notice generated for ${detail.inspectionId}.`);
    } catch (err) {
      setFeedbackMessage('Failed to generate notice.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  const handleDownloadNotice = async (noticeId) => {
    try {
      setLoading(true);
      const blob = await noticeService.downloadNotice(noticeId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Notice-${noticeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setFeedbackMessage('Download complete.');
    } catch (err) {
      setFeedbackMessage('Failed to download PDF.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  return (
    <div className="supervisor-actions-card">
      <div className="actions-header">
        <h4 className="actions-title">Supervisory Disposition & Actions</h4>
        <span className="actions-mock-note">Demonstration Console &bull; UI State Only</span>
      </div>

      {feedbackMessage && (
        <div className="action-feedback-toast">
          <Info size={15} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="actions-row">
        <div className="actions-left-group">
          {detail.status === 'Non-Compliant' || detail.status === 'Under Review' ? (
            <>
              <button
                type="button"
                className={`act-btn act-primary ${reviewStatus === 'marked' ? 'act-active' : ''}`}
                onClick={handleMarkForReview}
                disabled={loading}
                title="Flag record for formal compounding / explanation memo"
              >
                <BookmarkPlus size={16} />
                <span>{reviewStatus === 'marked' ? '✓ Flagged for Supervisor Hearing' : 'Mark for Supervisory Review'}</span>
              </button>
              
              <button
                type="button"
                className="act-btn act-secondary"
                onClick={handleGenerateNotice}
                disabled={loading}
                title="Generate statutory notice PDF"
              >
                <FileText size={15} />
                <span>Generate Notice</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`act-btn act-success ${reviewStatus === 'endorsed' ? 'act-active' : ''}`}
              onClick={handleEndorseRecord}
              disabled={loading}
              title="Endorse and archive compliant inspection record"
            >
              <CheckCircle2 size={16} />
              <span>{reviewStatus === 'endorsed' ? '✓ Record Endorsed by Officer' : 'Endorse Inspection Record'}</span>
            </button>
          )}

          <button
            type="button"
            className="act-btn act-secondary"
            onClick={onScrollToEvidence}
            title="Jump to high-resolution evidence viewer"
          >
            <span>View Scanned Evidence</span>
          </button>

          {detail.notices && detail.notices.length > 0 && (
            <button
              type="button"
              className="act-btn act-secondary"
              onClick={() => handleDownloadNotice(detail.notices[0]._id)}
              disabled={loading}
              title="Download Statutory Notice"
            >
              <Download size={15} />
              <span>Download Notice PDF</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="act-btn act-back"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>Return to Scanned Products</span>
        </button>
      </div>
    </div>
  );
}

export default SupervisorActionArea;
