import React, { useState, useEffect, useRef } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { toast } from "react-hot-toast";
import { Presentation, AlertCircle } from "lucide-react";

import { apiFetch } from "../utils/api";
import { normalizeBriefingLayout } from "../utils/layoutUtils";
import BriefingWidgetContent from "../components/BriefingWidgetContent";

export default function Briefing() {
  const [risks, setRisks] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedRiskId, setSelectedRiskId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [width, setWidth] = useState(800);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchData();
    const handleResize = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth - 32);
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchData = async () => {
    try {
      const risksRes = await apiFetch("/api/risks");
      const risksData = await risksRes.json();
      
      const configRes = await apiFetch("/api/briefingConfig");
      const configData = await configRes.json();
      
      setRisks(risksData || []);
      const normalized = normalizeBriefingLayout(configData);
      setConfig(normalized);
      
      if (normalized?.selectedItems?.length > 0) {
        setSelectedRiskId(normalized.selectedItems[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load briefing.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading Briefing...</div>;
  if (!config || !config.selectedItems || config.selectedItems.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <AlertCircle size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.5 }} />
        <h2>No Items Selected for Briefing</h2>
        <p>Go to Admin &gt; Briefing Admin to configure your layout and select items to brief.</p>
      </div>
    );
  }

  const selectedRisk = risks.find(r => r.id === selectedRiskId);
  const briefingRisks = risks.filter(r => config.selectedItems.includes(r.id));

  // The static layout prevents dragging/resizing during the actual presentation
  const staticLayout = (config.layout || []).map(l => ({ ...l, static: true }));

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Sidebar Navigation */}
      <div style={{ width: "250px", borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
          <Presentation size={18} color="var(--primary)" />
          Briefing Deck
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {briefingRisks.map(risk => (
            <div 
              key={risk.id}
              onClick={() => setSelectedRiskId(risk.id)}
              style={{
                padding: "0.75rem 1rem",
                margin: "0.25rem 0",
                borderRadius: "6px",
                cursor: "pointer",
                background: selectedRiskId === risk.id ? "var(--primary-glow)" : "transparent",
                border: `1px solid ${selectedRiskId === risk.id ? "var(--primary)" : "transparent"}`,
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem", color: selectedRiskId === risk.id ? "#FFF" : "var(--text)" }}>
                  {risk.userRiskId || `R-${risk.id}`}
                </span>
                <span style={{ fontSize: "0.7rem", padding: "1px 4px", background: "var(--background)", borderRadius: "3px" }}>
                  {risk.itemType || "Risk"}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: selectedRiskId === risk.id ? "#E2E8F0" : "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {risk.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, background: "var(--background)", overflowY: "auto", padding: "1.5rem" }} ref={containerRef}>
        {selectedRisk ? (
          <div style={{ minHeight: "600px" }}>
            {width > 0 && (
              <GridLayout
                className="layout"
                layout={staticLayout}
                gridConfig={{
                  cols: 24,
                  rowHeight: 15,
                  margin: [8, 8]
                }}
                dragConfig={{
                  enabled: false
                }}
                resizeConfig={{
                  enabled: false
                }}
                cols={24}
                rowHeight={15}
                margin={[8, 8]}
                width={width}
                isDraggable={false}
                isResizable={false}
              >
                {staticLayout.map(l => (
                  <div key={l.i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <BriefingWidgetContent widgetId={l.i} risk={selectedRisk} isPreview={false} />
                  </div>
                ))}
              </GridLayout>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: "4rem", color: "var(--text-muted)" }}>
            Select an item from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
}
