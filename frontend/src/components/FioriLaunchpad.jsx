import React, { useState } from 'react';
import {
  Layers,
  Wrench,
  TrendingUp,
  Package,
  Search,
  Copy,
  FileSpreadsheet,
  ShieldCheck,
  Trash2,
  ChevronLeft
} from 'lucide-react';

export default function FioriLaunchpad({
  onOpenAction,
  sapSession,
  systemKey = 'DEV',
  subView = 'home',
  onSubViewChange
}) {
  const [internalView, setInternalView] = useState(subView || 'home');
  const currentView = subView !== undefined ? subView : internalView;

  const handleSetView = (view) => {
    setInternalView(view);
    if (onSubViewChange) {
      onSubViewChange(view);
    }
  };

  // Level 1: Launchpad Home Modules
  const homeGroups = [
    {
      name: 'Production Planning',
      modules: [
        {
          id: 'bom',
          title: 'Bill of Materials',
          desc: 'Create, copy, change, display and delete BOMs',
          icon: Layers,
          kpiNum: '5',
          kpiLabel: 'apps',
          onClick: () => handleSetView('bom_operations')
        },
        {
          id: 'rout',
          title: 'Routing',
          desc: 'Task lists and operations',
          icon: Wrench,
          soon: true
        },
        {
          id: 'prod',
          title: 'Production Orders',
          desc: 'Order release and confirmation',
          icon: TrendingUp,
          soon: true
        }
      ]
    },
    {
      name: 'Master Data',
      modules: [
        {
          id: 'mat',
          title: 'Material Master',
          desc: 'Material data maintenance',
          icon: Package,
          soon: true
        }
      ]
    }
  ];

  // Level 2: Bill of Materials Operations (Our 5 Apps)
  const bomOperations = [
    {
      id: 'display',
      title: 'Display BOM',
      desc: 'Read BOM header and components',
      icon: Search,
      fm: 'CSAP_MAT_BOM_READ',
      action: 'bom_explorer'
    },
    {
      id: 'copy',
      title: 'Copy BOM',
      desc: 'Copy a BOM from source to target',
      icon: Copy,
      fm: 'CSAP_MAT_BOM_CREATE',
      action: 'copy_bom'
    },
    {
      id: 'bulk',
      title: 'Bulk Copy BOM',
      desc: 'Excel mass upload & batch sequential RFC',
      icon: FileSpreadsheet,
      fm: 'BATCH RFC',
      action: 'bulk_bom'
    },
    {
      id: 'validate',
      title: 'Validate BOM',
      desc: 'Pre-flight validation of material and BOM in SAP',
      icon: ShieldCheck,
      fm: 'CSAP_MAT_BOM_READ',
      action: 'validate_bom'
    },
    {
      id: 'delete',
      title: 'Delete BOM',
      desc: 'Delete a BOM (confirmation required)',
      icon: Trash2,
      fm: 'CSAP_MAT_BOM_DELETE',
      danger: true,
      action: 'delete_bom'
    }
  ];

  return (
    <div className="fiori-launchpad-root">
      {currentView === 'home' ? (
        /* ================= LEVEL 1: MY HOME ================= */
        <>
          <div className="fiori-ph">
            <div className="fiori-bc">
              <span className="fiori-bc-current">Home</span>
            </div>
            <h1 className="fiori-ph-title">My Home</h1>
            <p className="fiori-ph-subtitle">Fiori launchpad · SAP RFC toolkit</p>
          </div>

          <div className="fiori-body">
            {homeGroups.map((group) => (
              <div key={group.name} style={{ marginBottom: 24 }}>
                <div className="fiori-group-title">{group.name}</div>
                <div className="fiori-tiles-grid">
                  {group.modules.map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        className={`fiori-tile ${mod.soon ? 'off' : ''}`}
                        disabled={mod.soon}
                        onClick={mod.onClick}
                      >
                        {mod.soon && (
                          <span className="fiori-tile-top-pill">Coming soon</span>
                        )}
                        <div className="fiori-tile-title">{mod.title}</div>
                        <div className="fiori-tile-desc">{mod.desc}</div>
                        <div className="fiori-tile-bottom">
                          <div className="fiori-tile-icon">
                            <Icon size={32} strokeWidth={1.7} />
                          </div>
                          {mod.kpiNum && (
                            <div className="fiori-tile-kpi">
                              {mod.kpiNum}
                              <small>{mod.kpiLabel}</small>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ================= LEVEL 2: BILL OF MATERIALS OPERATIONS ================= */
        <>
          <div className="fiori-ph">
            <div className="fiori-bc">
              <button
                type="button"
                className="fiori-bc-link"
                onClick={() => handleSetView('home')}
              >
                Home
              </button>
              <span className="fiori-bc-sep">›</span>
              <span className="fiori-bc-current">Bill of Materials</span>
            </div>
            <div className="fiori-ph-title-row">
              <button
                type="button"
                className="fiori-ph-back"
                onClick={() => handleSetView('home')}
                title="Back to Home"
                aria-label="Back to Home"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="fiori-ph-title">Bill of Materials</h1>
            </div>
            <p className="fiori-ph-subtitle">Choose an operation</p>
          </div>

          <div className="fiori-body">
            <div className="fiori-group-title">Operations</div>
            <div className="fiori-tiles-grid">
              {bomOperations.map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.id}
                    type="button"
                    className="fiori-tile"
                    onClick={() => onOpenAction(op.action)}
                  >
                    <div className="fiori-tile-title">{op.title}</div>
                    <div className="fiori-tile-desc">{op.desc}</div>
                    <div className="fiori-tile-bottom">
                      <div className={`fiori-tile-icon ${op.danger ? 'danger' : ''}`}>
                        <Icon size={32} strokeWidth={1.7} />
                      </div>
                      <div className="fiori-tile-tech">{op.fm}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
