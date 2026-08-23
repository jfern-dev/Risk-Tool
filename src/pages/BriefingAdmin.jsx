import React, { useState, useEffect, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { toast } from 'react-hot-toast';
import { Save, Layout, CheckSquare, Plus, X, LayoutGrid } from 'lucide-react';

import { apiFetch } from '../utils/api';
import { normalizeBriefingLayout } from '../utils/layoutUtils';
import BriefingWidgetContent, { SAMPLE_BRIEFING_RISK } from '../components/BriefingWidgetContent';

const WIDGET_TYPES = [
  { id: 'title', label: 'Title & Core Details', defaultW: 4, defaultH: 4 },
  { id: 'matrix', label: 'Risk Matrix', defaultW: 4, defaultH: 4 },
  { id: 'scores', label: 'Calculated Scores (Initial, Current, Target)', defaultW: 4, defaultH: 4 },
  { id: 'description', label: 'Description', defaultW: 4, defaultH: 4 },
  { id: 'mitigation', label: 'Mitigation Plan', defaultW: 4, defaultH: 4 },
  { id: 'impact', label: 'Impact Statement', defaultW: 4, defaultH: 4 },
  { id: 'closure', label: 'Closure Criteria', defaultW: 4, defaultH: 4 },
  { id: 'categoryHandling', label: 'Category & Strategy', defaultW: 4, defaultH: 4 },
  { id: 'gpocsCpocs', label: 'GPOCs & CPOCs', defaultW: 4, defaultH: 4 },
  { id: 'dates', label: 'Important Dates', defaultW: 4, defaultH: 4 },
  { id: 'impactDetails', label: 'Impact (Cost/Schedule/Perf)', defaultW: 4, defaultH: 4 },
  { id: 'resourceDetails', label: 'Resources & Plan Realism', defaultW: 4, defaultH: 4 },
  { id: 'customFields', label: 'Custom Fields', defaultW: 4, defaultH: 4 },
  { id: 'spof', label: 'SPOF Alert', defaultW: 4, defaultH: 4 },
  { id: 'statusLogs', label: 'Status Logs', defaultW: 4, defaultH: 4 },
  { id: 'burndownPlot', label: 'Burndown Plot (Timeline Chart)', defaultW: 4, defaultH: 4 },
  { id: 'actionList', label: 'Action List (Burndown Table)', defaultW: 4, defaultH: 4 },
  { id: 'burndown', label: 'Burndown Plot & Actions (Full View)', defaultW: 4, defaultH: 4 },
  { id: 'monteCarlo', label: 'Monte Carlo Summary', defaultW: 4, defaultH: 4 }
];

export default function BriefingAdmin() {
  const [risks, setRisks] = useState([]);
  const [config, setConfig] = useState({ selectedItems: [], layout: [], gridCols: 24, rowHeight: 15 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('layout'); // 'layout' or 'selection'
  
  const [width, setWidth] = useState(800);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchData();
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth - 32);
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const risksRes = await apiFetch('/api/risks');
      const risksData = await risksRes.json();
      setRisks(risksData || []);

      const configRes = await apiFetch('/api/briefingConfig');
      const configData = await configRes.json();
      setConfig(normalizeBriefingLayout(configData));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load briefing configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = { ...config, gridCols: 24, rowHeight: 15 };
      await apiFetch('/api/briefingConfig', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      toast.success('Briefing configuration saved!');
    } catch (err) {
      toast.error('Failed to save configuration');
    }
  };

  const onLayoutChange = (newLayout) => {
    const updated = newLayout.map(item => ({
      ...item,
      minW: 1,
      minH: 1
    }));
    setConfig(prev => ({ ...prev, layout: updated }));
  };

  const handleTileGrid = () => {
    if (!config.layout || config.layout.length === 0) {
      toast.error('No widgets in layout to arrange');
      return;
    }
    const tiled = config.layout.map((item, idx) => {
      const colIdx = idx % 6;
      const rowIdx = Math.floor(idx / 6);
      return {
        ...item,
        x: colIdx * 4,
        y: rowIdx * 4,
        w: 4,
        h: 4,
        minW: 1,
        minH: 1
      };
    });
    setConfig(prev => ({ ...prev, layout: tiled }));
    toast.success('Arranged all widgets in a 6-across (4x4) grid');
  };

  const addWidget = (widgetId) => {
    if (config.layout.find(l => l.i === widgetId)) {
      toast.error('Widget already added to layout');
      return;
    }
    const widgetDef = WIDGET_TYPES.find(w => w.id === widgetId);
    const w = widgetDef?.defaultW || 4;
    const h = widgetDef?.defaultH || 4;

    // Smart 6-across positioning (slots: x=0, 4, 8, 12, 16, 20)
    let nextX = 0;
    let nextY = 0;
    if (config.layout && config.layout.length > 0) {
      const lastItem = config.layout[config.layout.length - 1];
      if (lastItem.x + lastItem.w + w <= 24) {
        nextX = lastItem.x + lastItem.w;
        nextY = lastItem.y;
      } else {
        nextX = 0;
        let maxY = 0;
        config.layout.forEach(l => { if (l.y + l.h > maxY) maxY = l.y + l.h; });
        nextY = maxY;
      }
    }

    const newItem = {
      i: widgetId,
      x: nextX,
      y: nextY,
      w: w,
      h: h,
      minW: 1,
      minH: 1
    };
    setConfig(prev => ({ ...prev, layout: [...prev.layout, newItem] }));
  };

  const removeWidget = (widgetId) => {
    setConfig(prev => ({ ...prev, layout: prev.layout.filter(l => l.i !== widgetId) }));
  };

  const toggleItemSelection = (id) => {
    setConfig(prev => {
      const selectedItems = prev.selectedItems || [];
      if (selectedItems.includes(id)) {
        return { ...prev, selectedItems: selectedItems.filter(i => i !== id) };
      } else {
        return { ...prev, selectedItems: [...selectedItems, id] };
      }
    });
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Briefing Admin</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Configure the layout and selected items for the Briefing presentation.
          </p>
        </div>
        <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Save size={16} /> Save Configuration
        </button>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button 
          onClick={() => setActiveTab('layout')}
          style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: activeTab === 'layout' ? 'var(--primary)' : 'var(--text)', borderBottom: activeTab === 'layout' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: 500 }}
        >
          <Layout size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Layout Builder
        </button>
        <button 
          onClick={() => setActiveTab('selection')}
          style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: activeTab === 'selection' ? 'var(--primary)' : 'var(--text)', borderBottom: activeTab === 'selection' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: 500 }}
        >
          <CheckSquare size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Item Selection
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: 'var(--background)' }}>
        {activeTab === 'layout' && (
          <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
            
            <div style={{ width: '250px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Available Widgets</h3>
              {WIDGET_TYPES.map(widget => {
                const isAdded = (config.layout || []).find(l => l.i === widget.id);
                return (
                  <button
                    key={widget.id}
                    onClick={() => !isAdded && addWidget(widget.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem',
                      background: isAdded ? 'var(--background)' : 'var(--glass-bg)',
                      border: '1px solid var(--border)', borderRadius: '6px', cursor: isAdded ? 'not-allowed' : 'pointer',
                      color: isAdded ? 'var(--text-muted)' : 'var(--text)', textAlign: 'left'
                    }}
                    disabled={isAdded}
                  >
                    {widget.label} {!isAdded && <Plus size={14} />}
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '8px', padding: '1rem', overflowY: 'auto' }} ref={containerRef}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem 0.85rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.25)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                  💡 <strong>High-Precision Grid:</strong> Drag title bars (<strong>⋮⋮</strong>) to move &nbsp;|&nbsp; Drag corner (<strong>◢</strong>) to resize in 15px increments.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleTileGrid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.65rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    title="Re-tile all current widgets into 6-across (4x4) compact boxes"
                  >
                    <LayoutGrid size={13} color="var(--primary)" /> Tile 6-Across (4x4)
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                    24 Cols • 4x4 (6-Across)
                  </span>
                </div>
              </div>
              <div style={{ 
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)', 
                backgroundSize: '16px 16px',
                backgroundColor: 'var(--background)',
                minHeight: '500px', 
                borderRadius: '6px', 
                border: '1px solid var(--border)',
                padding: '4px'
              }}>
                {width > 0 && (
                  <GridLayout
                    className="layout"
                    layout={config.layout || []}
                    gridConfig={{
                      cols: 24,
                      rowHeight: 15,
                      margin: [8, 8]
                    }}
                    dragConfig={{
                      draggableHandle: '.drag-handle'
                    }}
                    cols={24}
                    rowHeight={15}
                    margin={[8, 8]}
                    width={width}
                    onLayoutChange={onLayoutChange}
                    draggableHandle=".drag-handle"
                  >
                    {(config.layout || []).map(l => {
                      const widgetDef = WIDGET_TYPES.find(w => w.id === l.i);
                      return (
                        <div key={l.i} style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                          <div className="drag-handle" style={{ background: 'var(--glass-bg)', padding: '0.25rem 0.5rem', cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', userSelect: 'none', borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⋮⋮ {widgetDef?.label || l.i}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeWidget(l.i); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}>
                              <X size={12} />
                            </button>
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden', pointerEvents: 'none', background: 'rgba(0,0,0,0.1)' }}>
                            <BriefingWidgetContent widgetId={l.i} risk={SAMPLE_BRIEFING_RISK} isPreview={true} />
                          </div>
                        </div>
                      );
                    })}
                  </GridLayout>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'selection' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Select items</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => setConfig(p => ({ ...p, selectedItems: risks.map(r => r.id) }))} style={{ fontSize: '0.8rem' }}>Select All</button>
                <button className="btn-secondary" onClick={() => setConfig(p => ({ ...p, selectedItems: [] }))} style={{ fontSize: '0.8rem' }}>Deselect All</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {risks.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No items found.</div> : 
                risks.map(risk => {
                  const isSelected = (config.selectedItems || []).includes(risk.id);
                  return (
                    <label key={risk.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleItemSelection(risk.id)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                        <span style={{ fontWeight: 600, minWidth: '80px' }}>{risk.userRiskId || `R-${risk.id}`}</span>
                        <span style={{ color: 'var(--text-muted)', flex: 1 }}>{risk.title}</span>
                        <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border)' }}>{risk.itemType || 'Risk'}</span>
                      </div>
                    </label>
                  );
                })
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
