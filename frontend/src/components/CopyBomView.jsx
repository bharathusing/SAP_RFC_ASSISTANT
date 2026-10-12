import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileCheck,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import CreateBomForm from './CreateBomForm';
import ConfirmationCard from './ConfirmationCard';
import { sendChatMessage, confirmChatAction, cancelChatAction } from '../services/api';

export default function CopyBomView({ systemKey = 'DEV', onBack, onNavigateHome }) {
  const [proposedAction, setProposedAction] = useState(null);
  const [actionStatus, setActionStatus] = useState('pending'); // 'pending' | 'executing' | 'confirmed' | 'cancelled' | 'failed'
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

    const tgtAltText = formData.targetAltBom ? `, Alt ${formData.targetAltBom}` : '';
    const srcAltText = formData.sourceAltBom ? `, Alt ${formData.sourceAltBom}` : '';
    const summaryText = `Create new BOM for ${formData.targetMaterial} in plant ${formData.targetPlant} (Usage ${formData.targetUsage}${tgtAltText}) by copying from reference BOM ${formData.sourceMaterial} in plant ${formData.sourcePlant} (Usage ${formData.sourceUsage}${srcAltText})`;

    try {
      const response = await sendChatMessage(
        summaryText,
        [],
        systemKey,
        { actionType: 'copy_bom', copyBomParams: formData }
      );

      if (response.error) {
        setErrorMessage(response.reply || response.error || 'Failed to generate Copy BOM proposal.');
      } else if (response.proposedAction) {
        setProposedAction(response.proposedAction);
        setActionStatus('pending');
      } else {
        setErrorMessage(response.reply || 'Unexpected response from SAP.');
      }
    } catch (err) {
      console.error('Error proposing Copy BOM:', err);
      const text = err.response?.data?.reply || err.response?.data?.error || err.message || 'Unable to submit Copy BOM request.';
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
        setErrorMessage(response.reply || response.error || 'Copy BOM execution failed.');
      } else {
        setActionStatus('confirmed');
        setExecutionResult(response);
      }
    } catch (err) {
      console.error('Error confirming Copy BOM:', err);
      setActionStatus('failed');
      const text = err.response?.data?.reply || err.response?.data?.error || err.message || 'Failed to execute Copy BOM action.';
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
    <div className="fiori-app-view-root">
      {/* Full-width Fiori Horizon Header (Identical to Homepage / Operations Header) */}
      <div className="fiori-ph">
        <div className="fiori-bc">
          <button type="button" className="fiori-bc-link" onClick={onNavigateHome || onBack}>
            Home
          </button>
          <span className="fiori-bc-sep">›</span>
          <button type="button" className="fiori-bc-link" onClick={onBack}>
            Bill of Materials
          </button>
          <span className="fiori-bc-sep">›</span>
          <span className="fiori-bc-current">Copy Material BOM</span>
          <span className="sap-view-system-pill" style={{ marginLeft: 6 }}>{systemKey}</span>
        </div>
        <div className="fiori-ph-title-row">
          <button
            type="button"
            className="fiori-ph-back"
            onClick={onBack}
            title="Back to Bill of Materials"
            aria-label="Back to Bill of Materials"
          >
            <ChevronLeft size={16} />
          </button>
          <h1 className="fiori-ph-title">Copy Material BOM (CS01)</h1>
        </div>
        <p className="fiori-ph-subtitle">
          CS01 Reference BOM Copy with automatic Alternative BOM generation (Rule 1) and recursive multi-level sub-assembly replication (Rule 2).
        </p>
      </div>

      <div className="fiori-view-body">
        {/* Error Notice */}
        {errorMessage && (
          <div className="sap-alert sap-alert-error" style={{ maxWidth: 680, width: '100%', margin: '0 auto 14px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{errorMessage}</div>
          </div>
        )}
        {/* Step 1: Form View (when no proposal is pending and not yet confirmed) */}
        {!proposedAction && !executionResult && (
          <div className="sap-form-view-section" style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
            {isSubmitting ? (
              <div className="sap-loading-card" style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
                <span className="sap-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <h4>Validating with SAP via RFC...</h4>
                <p>Checking source BOM in MAST/STAS/STPO and determining target alternative.</p>
              </div>
            ) : (
              <CreateBomForm
                onSubmit={handleFormSubmit}
                onCancel={onBack}
                initialValues={lastSubmittedForm || {}}
                hideHeader={true}
                style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}
              />
            )}
          </div>
        )}

        {/* Step 2: Confirmation Proposal Gate */}
        {proposedAction && !executionResult && (
          <div className="sap-proposal-view-section" style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
            <div className="sap-proposal-header-card">
              <ShieldCheck size={20} color="#0070f2" />
              <div>
                <h4>Human Confirmation Gate: Verify BOM Copy Proposal</h4>
                <p>Review the source and target parameters below. Confirming will execute the copy via direct SAP RFC.</p>
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
          <div className="sap-result-view-section" style={{ maxWidth: 680, width: '100%', margin: '0 auto' }}>
            <div className="sap-result-success-card">
              <div className="sap-result-success-header">
                <div className="sap-result-success-icon">
                  <CheckCircle2 size={32} color="#107e3e" />
                </div>
                <div>
                  <h3 className="sap-result-success-title">BOM Copied Successfully</h3>
                  <p className="sap-result-success-message">{executionResult.reply}</p>
                </div>
              </div>

              {/* Result Meta Cards */}
              <div className="sap-result-meta-grid">
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Target Material</span>
                  <strong className="sap-result-meta-val">{lastSubmittedForm?.targetMaterial || '-'}</strong>
                </div>
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Target Plant</span>
                  <strong className="sap-result-meta-val">{lastSubmittedForm?.targetPlant || '-'}</strong>
                </div>
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Alternative Created</span>
                  <span className="sap-badge sap-badge-primary" style={{ fontSize: '13px', padding: '3px 8px' }}>
                    {executionResult.createdAlternative || executionResult.executedAction?.alternative || '01'}
                  </span>
                </div>
                <div className="sap-result-meta-item">
                  <span className="sap-result-meta-label">Components Copied</span>
                  <strong className="sap-result-meta-val">
                    {executionResult.data?.length || executionResult.executedAction?.componentCount || 'All'}
                  </strong>
                </div>
              </div>

              {/* Copied Components Table */}
              {executionResult.data && executionResult.data.length > 0 && (
                <div className="sap-result-components-table-wrap">
                  <h4 className="sap-table-section-title">Copied BOM Components</h4>
                  <div className="sap-table-container">
                    <table className="sap-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Component</th>
                          <th>Description</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Category</th>
                          <th>Valid From</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executionResult.data.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.itemNo || item.POSNR || (idx + 1) * 10}</td>
                            <td><strong>{item.component || item.IDNRK || item.material || '-'}</strong></td>
                            <td>{item.description || item.OJTXP || item.MAKTX || '-'}</td>
                            <td>{item.quantity || item.MENGE || '-'}</td>
                            <td>{item.unit || item.MEINS || '-'}</td>
                            <td>{item.itemCategory || item.POSTP || 'L'}</td>
                            <td>{item.validFrom || item.DATUV || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                  <Copy size={15} />
                  <span>Copy Another BOM</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
