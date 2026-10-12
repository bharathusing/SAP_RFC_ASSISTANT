import React, { useState } from 'react';
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import DeleteBomForm from './DeleteBomForm';
import ConfirmationCard from './ConfirmationCard';
import { sendChatMessage, confirmChatAction, cancelChatAction } from '../services/api';

export default function DeleteBomView({ systemKey = 'DEV', onBack }) {
  const [proposedAction, setProposedAction] = useState(null);
  const [actionStatus, setActionStatus] = useState('pending');
  const [executionResult, setExecutionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedForm, setLastSubmittedForm] = useState(null);

  const handleFormSubmit = async (formData) => {
    setErrorMessage('');
    setExecutionResult(null);
    setProposedAction(null);
    setIsSubmitting(true);
    setLastSubmittedForm(formData);

    const summaryText = `Delete BOM for Material ${formData.material} in plant ${formData.plant} (Alternative BOM ${formData.alternativeBom}, Usage ${formData.bomUsage})`;

    try {
      const response = await sendChatMessage(
        summaryText,
        [],
        systemKey,
        { actionType: 'delete_bom', deleteBomParams: formData }
      );

      if (response.error) {
        setErrorMessage(response.reply || response.error || 'Failed to generate Delete BOM proposal.');
      } else if (response.proposedAction) {
        setProposedAction(response.proposedAction);
        setActionStatus('pending');
      } else {
        setErrorMessage(response.reply || 'Unexpected response from SAP.');
      }
    } catch (err) {
      console.error('Error proposing Delete BOM:', err);
      const text = err.response?.data?.reply || err.response?.data?.error || err.message || 'Unable to submit Delete BOM request.';
      setErrorMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async (actionId, options = {}) => {
    setActionStatus('executing');
    setErrorMessage('');

    try {
      const response = await confirmChatAction(actionId, {
        ...options,
        systemKey
      });

      if (response.error) {
        setActionStatus('failed');
        setErrorMessage(response.reply || response.error || 'Delete BOM execution failed.');
      } else {
        setActionStatus('confirmed');
        setExecutionResult(response);
      }
    } catch (err) {
      console.error('Error confirming Delete BOM:', err);
      setActionStatus('failed');
      const text = err.response?.data?.reply || err.response?.data?.error || err.message || 'Failed to execute Delete BOM action.';
      setErrorMessage(text);
    }
  };

  const handleCancelAction = async (actionId) => {
    try {
      await cancelChatAction(actionId);
    } catch {
      // Ignore cancel network error
    }
    setProposedAction(null);
    setActionStatus('cancelled');
    setLastSubmittedForm(null);
  };

  const handleReset = () => {
    setProposedAction(null);
    setActionStatus('pending');
    setExecutionResult(null);
    setErrorMessage('');
    setLastSubmittedForm(null);
  };

  return (
    <div className="sap-fiori-view-container">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="sap-fiori-view-nav">
        <button
          type="button"
          className="sap-btn sap-btn-ghost sap-back-btn"
          onClick={onBack}
          title="Return to Bill of Materials"
        >
          <ArrowLeft size={13} />
          <span>Bill of Materials</span>
        </button>
        <span className="sap-view-divider">/</span>
        <span className="sap-view-current">Delete Material BOM (CS02)</span>
        <span className="sap-view-system-pill">{systemKey}</span>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="sap-alert sap-alert-error" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="sap-fiori-view-body">
        {/* Step 1: Form View */}
        {!proposedAction && !executionResult && (
          <div className="sap-form-view-section">
            {isSubmitting ? (
              <div className="sap-loading-card">
                <span className="sap-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <h4>Verifying BOM Existence in SAP...</h4>
                <p>Checking material and plant records prior to deletion proposal.</p>
              </div>
            ) : (
              <DeleteBomForm
                onSubmit={handleFormSubmit}
                onCancel={onBack}
                initialValues={lastSubmittedForm || {}}
              />
            )}
          </div>
        )}

        {/* Step 2: Confirmation Proposal Gate */}
        {proposedAction && !executionResult && (
          <div className="sap-proposal-view-section">
            <div className="sap-proposal-header-card danger">
              <ShieldCheck size={20} color="#bb0000" />
              <div>
                <h4>Safety Gate: Confirm Permanent BOM Deletion</h4>
                <p>Deleting a BOM removes the alternative from SAP master records. Review carefully before confirming.</p>
              </div>
            </div>

            <ConfirmationCard
              action={proposedAction}
              status={actionStatus}
              onConfirm={handleConfirmAction}
              onCancel={handleCancelAction}
            />
          </div>
        )}

        {/* Step 3: Success Execution Result Card */}
        {executionResult && (
          <div className="sap-result-view-section">
            <div className="sap-result-success-card">
              <div className="sap-result-success-header">
                <div className="sap-result-success-icon">
                  <CheckCircle2 size={32} color="#107e3e" />
                </div>
                <div>
                  <h3 className="sap-result-success-title">BOM Deleted Successfully</h3>
                  <p className="sap-result-success-message">{executionResult.reply}</p>
                </div>
              </div>

              {/* Result Meta Cards */}
              <div className="sap-result-meta-grid">
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Material</span>
                  <strong className="sap-result-meta-val">{lastSubmittedForm?.material || '-'}</strong>
                </div>
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Plant</span>
                  <strong className="sap-result-meta-val">{lastSubmittedForm?.plant || '-'}</strong>
                </div>
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Alternative Deleted</span>
                  <span className="sap-badge sap-badge-danger" style={{ fontSize: '13px', padding: '3px 8px' }}>
                    {lastSubmittedForm?.alternativeBom || '01'}
                  </span>
                </div>
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Status</span>
                  <span className="sap-badge sap-badge-success" style={{ fontSize: '13px', padding: '3px 8px' }}>
                    DELETED
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="sap-result-actions">
                <button
                  type="button"
                  className="sap-btn sap-btn-secondary"
                  onClick={onBack}
                >
                  <ArrowLeft size={15} />
                  <span>Return to Launchpad</span>
                </button>
                <button
                  type="button"
                  className="sap-btn sap-btn-primary"
                  onClick={handleReset}
                >
                  <Trash2 size={15} />
                  <span>Delete Another BOM</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
