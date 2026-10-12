import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Layers,
  Factory,
  Hash,
  Copy,
  ArrowRight
} from 'lucide-react';
import { validateSourceBom } from '../services/api';

export default function ValidateBomView({ systemKey = 'DEV', onBack, onNavigateToCopy, onNavigateToExplorer }) {
  const [formData, setFormData] = useState({
    material: '',
    plant: '',
    bomUsage: '1',
    alternativeBom: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!formData.material.trim() || !formData.plant.trim()) {
      setErrorMsg('Please enter both Material and Plant to validate.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await validateSourceBom({
        material: formData.material.trim().toUpperCase(),
        plant: formData.plant.trim().toUpperCase(),
        bomUsage: formData.bomUsage.trim() || '1',
        alternativeBom: formData.alternativeBom.trim() || undefined
      });
      setResult(res);
      if (!res.success) {
        setErrorMsg(res.message || 'BOM validation returned errors.');
      }
    } catch (err) {
      console.error('BOM validation error:', err);
      const text = err.response?.data?.message || err.message || 'Error communicating with SAP validation service.';
      setErrorMsg(text);
    } finally {
      setIsLoading(false);
    }
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
        <span className="sap-view-current">Validate Material BOM</span>
        <span className="sap-view-system-pill">{systemKey}</span>
      </div>

      {/* Main Form Card (Unified Half-Width Card) */}
      <div className="sap-structured-form-card" style={{ maxWidth: 640, width: '100%', marginBottom: 16 }}>
        <div className="sap-form-header">
          <div className="sap-form-header-title">
            <div className="sap-form-header-icon" style={{ backgroundColor: '#fff8f2', color: '#e9730c' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4>Validate Material BOM</h4>
              <p>Pre-flight verification in SAP via RFC. Checks MAST, STAS, and STPO table records before production planning or copying.</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="sap-form-alert sap-form-alert-error" style={{ margin: '0 14px 12px' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleValidate}>
          <div className="sap-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="sap-form-group">
              <label className="sap-form-label">
                Material <span className="sap-required-star">*</span>
              </label>
              <div className="sap-form-input-wrapper">
                <Layers size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="e.g. 100001"
                  value={formData.material}
                  onChange={(e) => setFormData((p) => ({ ...p, material: e.target.value }))}
                  autoFocus
                />
              </div>
            </div>

            <div className="sap-form-group">
              <label className="sap-form-label">
                Plant <span className="sap-required-star">*</span>
              </label>
              <div className="sap-form-input-wrapper">
                <Factory size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="e.g. 1000"
                  value={formData.plant}
                  onChange={(e) => setFormData((p) => ({ ...p, plant: e.target.value }))}
                />
              </div>
            </div>

            <div className="sap-form-group">
              <label className="sap-form-label">BOM Usage</label>
              <div className="sap-form-input-wrapper">
                <Hash size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="1 (Production)"
                  value={formData.bomUsage}
                  onChange={(e) => setFormData((p) => ({ ...p, bomUsage: e.target.value }))}
                />
              </div>
            </div>

            <div className="sap-form-group">
              <label className="sap-form-label">Alternative BOM (optional)</label>
              <div className="sap-form-input-wrapper">
                <Hash size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="e.g. 01"
                  value={formData.alternativeBom}
                  onChange={(e) => setFormData((p) => ({ ...p, alternativeBom: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="sap-form-actions">
            <button
              type="button"
              className="sap-btn sap-btn-secondary"
              onClick={onBack}
            >
              Launchpad
            </button>
            <button
              type="submit"
              className="sap-btn sap-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="sap-spinner" style={{ width: 12, height: 12 }} />
                  <span>Validating in SAP...</span>
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Validate in SAP</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Validation Result Box */}
      {result && result.success && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: result.bomExists ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${result.bomExists ? '#86efac' : '#fde68a'}`,
            boxShadow: 'var(--sap-shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {result.bomExists ? (
              <CheckCircle2 size={16} color="#15803d" />
            ) : (
              <AlertTriangle size={16} color="#b45309" />
            )}
            <strong style={{ fontSize: '13px', color: result.bomExists ? '#15803d' : '#b45309' }}>
              {result.bomExists ? 'BOM Exists in SAP' : 'No BOM Found'}
            </strong>
          </div>
          <p style={{ fontSize: '11.5px', color: '#334155', marginBottom: 10 }}>{result.message}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, fontSize: '11px', background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div>Material: <strong>{result.material || formData.material}</strong></div>
            <div>Plant: <strong>{result.plant || formData.plant}</strong></div>
            <div>Components: <strong>{result.componentCount || 0}</strong></div>
            <div>Alternatives: <strong>{(result.availableAlternatives || []).join(', ') || '01'}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
