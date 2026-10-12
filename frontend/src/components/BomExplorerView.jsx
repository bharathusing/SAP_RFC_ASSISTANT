import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  Search,
  Layers,
  Factory,
  Hash,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  GitBranch,
  RefreshCw,
  Clock,
  ChevronRight
} from 'lucide-react';
import { readBom, explodeBomHierarchy } from '../services/api';

export default function BomExplorerView({ systemKey = 'DEV', onBack, onNavigateHome }) {
  const [searchParams, setSearchParams] = useState({
    material: '',
    plant: '',
    bomUsage: '1',
    alternativeBom: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [bomData, setBomData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState('items'); // 'items' | 'hierarchy'

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (!searchParams.material.trim() || !searchParams.plant.trim()) {
      setErrorMessage('Please enter both Material and Plant to inspect the BOM.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setBomData(null);

    const payload = {
      material: searchParams.material.trim().toUpperCase(),
      plant: searchParams.plant.trim().toUpperCase(),
      bomUsage: searchParams.bomUsage.trim() || '1',
      alternativeBom: searchParams.alternativeBom.trim() || undefined
    };

    try {
      let res;
      if (viewMode === 'hierarchy') {
        res = await explodeBomHierarchy(payload);
      } else {
        res = await readBom(payload);
      }

      if (!res.success) {
        setErrorMessage(res.message || 'BOM not found in SAP for given parameters.');
      } else if (!res.bomExists && res.bomExists !== undefined) {
        setErrorMessage(`No BOM exists for Material ${payload.material} in Plant ${payload.plant} (Usage ${payload.bomUsage}).`);
      } else {
        setBomData(res);
      }
    } catch (err) {
      console.error('Error querying BOM in SAP:', err);
      const text = err.response?.data?.message || err.message || 'Error communicating with SAP RFC service.';
      setErrorMessage(text);
    } finally {
      setIsLoading(false);
    }
  };

  const components = bomData?.components || bomData?.items || [];
  const filteredComponents = components.filter((item) => {
    if (!filterText) return true;
    const term = filterText.toLowerCase();
    const compMat = (item.component || item.material || item.IDNRK || '').toLowerCase();
    const compDesc = (item.description || item.OJTXP || item.MAKTX || '').toLowerCase();
    return compMat.includes(term) || compDesc.includes(term);
  });

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
          <span className="fiori-bc-current">BOM Hierarchy Explorer</span>
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
            <ChevronLeft size={18} />
          </button>
          <h1 className="fiori-ph-title">BOM Hierarchy Explorer (CS03)</h1>
        </div>
        <p className="fiori-ph-subtitle">
          Inspect live Material BOM headers and component structures directly from SAP tables (MAST / STAS / STPO) via CSAP_MAT_BOM_READ.
        </p>
      </div>

      <div className="fiori-view-body wide">
        {/* Error Notice */}
        {errorMessage && (
          <div className="sap-alert sap-alert-error" style={{ maxWidth: 540, width: '100%', marginBottom: 14 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Small Compact Search Card (2 rows x 2 columns) */}
        <div className="sap-structured-form-card" style={{ maxWidth: 540, width: '100%', marginBottom: 16 }}>
          <form onSubmit={handleSearch}>
            <div className="sap-form-grid" style={{ gridTemplateColumns: '1fr 1fr', padding: '14px 16px', gap: '10px 14px' }}>
            <div className="sap-form-group">
              <label className="sap-form-label" style={{ fontSize: '11px', marginBottom: 2 }}>
                Material Number <span className="sap-required-star" style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="sap-form-input-wrapper">
                <Layers size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="e.g. 100001"
                  value={searchParams.material}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, material: e.target.value }))}
                />
              </div>
            </div>

            <div className="sap-form-group">
              <label className="sap-form-label" style={{ fontSize: '11px', marginBottom: 2 }}>
                Plant Code <span className="sap-required-star" style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="sap-form-input-wrapper">
                <Factory size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="e.g. 1000"
                  value={searchParams.plant}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, plant: e.target.value }))}
                />
              </div>
            </div>

            <div className="sap-form-group">
              <label className="sap-form-label" style={{ fontSize: '11px', marginBottom: 2 }}>
                BOM Usage
              </label>
              <div className="sap-form-input-wrapper">
                <Hash size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="1 (Production)"
                  value={searchParams.bomUsage}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, bomUsage: e.target.value }))}
                />
              </div>
            </div>

            <div className="sap-form-group">
              <label className="sap-form-label" style={{ fontSize: '11px', marginBottom: 2 }}>
                Alternative BOM
              </label>
              <div className="sap-form-input-wrapper">
                <Hash size={13} className="input-icon" />
                <input
                  type="text"
                  className="sap-form-input"
                  placeholder="e.g. 01 (optional)"
                  value={searchParams.alternativeBom}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, alternativeBom: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--sap-border-subtle)', background: '#fafbfc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className={`sap-btn ${viewMode === 'items' ? 'sap-btn-secondary active-mode' : 'sap-btn-ghost'}`}
                onClick={() => setViewMode('items')}
                style={{ height: 28, fontSize: '11px', padding: '0 8px' }}
              >
                <span>Single Level Items</span>
              </button>
              <button
                type="button"
                className={`sap-btn ${viewMode === 'hierarchy' ? 'sap-btn-secondary active-mode' : 'sap-btn-ghost'}`}
                onClick={() => setViewMode('hierarchy')}
                style={{ height: 28, fontSize: '11px', padding: '0 8px' }}
              >
                <FolderTree size={13} />
                <span>Multi-Level Hierarchy</span>
              </button>
            </div>

            <button
              type="submit"
              className="sap-btn sap-btn-primary"
              disabled={isLoading}
              style={{ height: 28, fontSize: '11.5px', padding: '0 12px' }}
            >
              {isLoading ? (
                <>
                  <span className="sap-spinner" style={{ width: 12, height: 12 }} />
                  <span>Reading from SAP...</span>
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Read BOM via RFC</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* BOM Data View */}
      {bomData && (
        <div className="sap-bom-explorer-results">
          {/* Header Metadata Card */}
          <div className="sap-result-meta-grid" style={{ marginBottom: 16 }}>
            <div className="sap-result-meta-item">
              <span className="sap-result-meta-label">BOM Number (STLNR)</span>
              <strong className="sap-result-meta-val">{bomData.header?.bomNumber || bomData.header?.stlnr || '-'}</strong>
            </div>
            <div className="sap-result-meta-item">
              <span className="sap-result-meta-label">Alternative (STLAL)</span>
              <span className="sap-badge sap-badge-primary" style={{ fontSize: '13px', padding: '3px 8px' }}>
                {bomData.header?.alternative || bomData.header?.stlal || '01'}
              </span>
            </div>
            <div className="sap-result-meta-item">
              <span className="sap-result-meta-label">Base Quantity</span>
              <strong className="sap-result-meta-val">
                {bomData.header?.baseQty || '1'} {bomData.header?.baseUnit || 'ST'}
              </strong>
            </div>
            <div className="sap-result-meta-item">
              <span className="sap-result-meta-label">Total Components</span>
              <strong className="sap-result-meta-val" style={{ color: '#0070f2' }}>
                {components.length}
              </strong>
            </div>
          </div>

          {/* Components Table with In-Table Filter */}
          <div className="sap-table-card">
            <div className="sap-table-toolbar" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--sap-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={16} color="#0070f2" />
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Components List</h4>
                <span className="sap-badge sap-badge-neutral">{filteredComponents.length} items</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Filter components..."
                  className="sap-form-input"
                  style={{ width: 220, height: 32, fontSize: '12px' }}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </div>
            </div>

            <div className="sap-table-container">
              {filteredComponents.length > 0 ? (
                <table className="sap-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Component Material</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Category</th>
                      <th>Valid From</th>
                      <th>Sub-BOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComponents.map((item, idx) => {
                      const hasSubBom = Boolean(item.hasSubBom || item.subBomExists || item.isSubAssembly);
                      return (
                        <tr key={idx}>
                          <td>{item.itemNo || item.POSNR || (idx + 1) * 10}</td>
                          <td>
                            <strong>{item.component || item.IDNRK || item.material || '-'}</strong>
                          </td>
                          <td>{item.description || item.OJTXP || item.MAKTX || '-'}</td>
                          <td>{item.quantity || item.MENGE || '-'}</td>
                          <td>{item.unit || item.MEINS || '-'}</td>
                          <td>{item.itemCategory || item.POSTP || 'L'}</td>
                          <td>{item.validFrom || item.DATUV || '-'}</td>
                          <td>
                            {hasSubBom ? (
                              <span className="sap-badge sap-badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <GitBranch size={11} />
                                <span>Sub-BOM</span>
                              </span>
                            ) : (
                              <span style={{ color: 'var(--sap-text-muted)', fontSize: '12px' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
                  <p>No components match your search filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
