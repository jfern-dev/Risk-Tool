import React, { useMemo } from "react";
import RiskMatrix from "./RiskMatrix";
import RiskTimeline from "./RiskTimeline";
import { runMonteCarloSimulation } from "../utils/mcEngine";

export const SAMPLE_BRIEFING_RISK = {
  id: 101,
  userRiskId: "R-101",
  title: "Flight Software Timing Latency",
  itemType: "Risk",
  level: "Program",
  likelihood: 3,
  impact: 4,
  initialLikelihood: 4,
  initialImpact: 4,
  riskCategory: ["Technical", "Schedule"],
  handlingStrategy: ["Mitigate/Execute"],
  description: "<p>High bus utilization on primary computer may cause <strong>telemetry latency</strong> during peak staging.</p>",
  mitigationPlan: "<p>Refactor DMA buffer transfers and test on engineering hardware.</p>",
  impactStatement: "<p>Potential telemetry loss during staging.</p>",
  closureCriteria: "<p>Demonstrate &lt; 8ms latency over 100 flight test profiles.</p>",
  gpocs: "Maj. Alex Rivera (SPO)",
  cpocs: "Dr. Sarah Chen (Chief Eng)",
  discoveredDate: "2026-02-15",
  approvedDate: "2026-03-01",
  closedDate: null,
  impactCost: "$120K reserve",
  impactSchedule: "3 wks delay",
  impactPerformance: "15ms latency",
  resourceCostNeeded: "$45K labor",
  resourceScheduleNeeded: "10 eng days",
  planRealism: "High (SIL verified)",
  isSpof: true,
  spofDescription: "Primary controller has no secondary failover.",
  mcMinCost: 50000,
  mcMostLikelyCost: 120000,
  mcMaxCost: 250000,
  mcMinSchedule: 10,
  mcMostLikelySchedule: 21,
  mcMaxSchedule: 45,
  mcDistribution: "Triangular",
  custom_WorkPackage: "WP-3.4 Flight Software",
  custom_IPT_Lead: "J. Doe (Avionics)",
  custom_Subcontractor: "AeroDynamics Corp",
  statusLogs: [
    { id: 1, date: "2026-03-10", update: "Initial profiling completed on SIL testbed." },
    { id: 2, date: "2026-04-05", update: "DMA buffer optimization algorithm drafted." }
  ],
  burndownSteps: [
    { id: 1, description: "SIL bus profiling", targetDate: "2026-03-15", completedAt: "2026-03-12", isCompleted: true, likelihoodReduction: 1, impactReduction: 0 },
    { id: 2, description: "DMA buffer optimization", targetDate: "2026-05-01", completedAt: "2026-04-28", isCompleted: true, likelihoodReduction: 0, impactReduction: 0 },
    { id: 3, description: "100 simulated test runs", targetDate: "2026-07-15", completedAt: null, isCompleted: false, likelihoodReduction: 1, impactReduction: 1 },
    { id: 4, description: "Final qualification review", targetDate: "2026-08-30", completedAt: null, isCompleted: false, likelihoodReduction: 1, impactReduction: 1 }
  ]
};

const formatCurrency = (val) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

const MonteCarloWidget = ({ risk, isPreview }) => {
  const mcResults = useMemo(() => {
    if (!risk) return null;
    return runMonteCarloSimulation([risk], {}, 5000);
  }, [risk]);

  if (!mcResults) return null;

  return (
    <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", height: "100%", overflowY: "auto" }}>
      <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>Monte Carlo (50% / 80% / 90%)</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isPreview ? "0.35rem" : "0.75rem", fontSize: isPreview ? "0.75rem" : "0.85rem" }}>
        <div style={{ background: "var(--glass-bg)", padding: "0.4rem", borderRadius: "4px" }}>
          <strong style={{ display: "block", marginBottom: "0.2rem", color: "var(--info)", fontSize: isPreview ? "0.7rem" : "0.8rem" }}>Cost</strong>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>P50:</span> <strong>{formatCurrency(mcResults.costStats.p50)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>P80:</span> <strong>{formatCurrency(mcResults.costStats.p80)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>P90:</span> <strong>{formatCurrency(mcResults.costStats.p90)}</strong></div>
        </div>
        <div style={{ background: "var(--glass-bg)", padding: "0.4rem", borderRadius: "4px" }}>
          <strong style={{ display: "block", marginBottom: "0.2rem", color: "var(--warning)", fontSize: isPreview ? "0.7rem" : "0.8rem" }}>Schedule</strong>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>P50:</span> <strong>{Math.round(mcResults.scheduleStats.p50)}d</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>P80:</span> <strong>{Math.round(mcResults.scheduleStats.p80)}d</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>P90:</span> <strong>{Math.round(mcResults.scheduleStats.p90)}d</strong></div>
        </div>
      </div>
    </div>
  );
};

export default function BriefingWidgetContent({ widgetId, risk = SAMPLE_BRIEFING_RISK, isPreview = false }) {
  const currentRisk = risk || SAMPLE_BRIEFING_RISK;

  const Field = ({ label, value, isHtml }) => (
    <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", height: "100%", overflowY: "auto" }}>
      <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", display: "block" }}>{label}</strong>
      {isHtml ? (
        <div className="quill-content" style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.2rem", whiteSpace: "pre-wrap", lineHeight: "1.3" }} dangerouslySetInnerHTML={{ __html: value || "N/A" }} />
      ) : (
        <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.2rem", lineHeight: "1.3" }}>{Array.isArray(value) ? value.join(", ") : (value || "N/A")}</div>
      )}
    </div>
  );

  switch(widgetId) {
    case "title":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ margin: 0, fontSize: isPreview ? "0.85rem" : "1.25rem", color: "var(--primary)", lineHeight: "1.2" }}>{currentRisk.userRiskId || `R-${currentRisk.id}`} - {currentRisk.title}</h2>
          <div style={{ fontSize: isPreview ? "0.7rem" : "0.85rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {currentRisk.itemType || "Risk"} | Level: {currentRisk.level || "N/A"}
          </div>
        </div>
      );

    case "matrix":
      return (
        <div style={{ padding: isPreview ? "0.35rem" : "0.75rem", height: "100%", display: "flex", flexDirection: "column" }}>
          <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Risk Heatmap</strong>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyItems: "center", overflow: "hidden" }}>
            <div style={{ transform: isPreview ? "scale(0.6)" : "scale(0.8)", transformOrigin: "top left" }}>
              <RiskMatrix risks={[currentRisk]} activeType={currentRisk.itemType || "Risk"} showMarkers={true} showCounts={false} />
            </div>
          </div>
        </div>
      );

    case "scores":
      const currentL = currentRisk.likelihood || 1;
      const currentI = currentRisk.impact || 1;
      const totalLReducCompleted = (currentRisk.burndownSteps || []).filter(s => s.isCompleted).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
      const totalIReducCompleted = (currentRisk.burndownSteps || []).filter(s => s.isCompleted).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
      const initL = currentRisk.initialLikelihood ?? Math.min(5, currentL + totalLReducCompleted);
      const initI = currentRisk.initialImpact ?? Math.min(5, currentI + totalIReducCompleted);
      
      const totalLReducAll = (currentRisk.burndownSteps || []).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
      const totalIReducAll = (currentRisk.burndownSteps || []).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
      const targetL = Math.max(1, initL - totalLReducAll);
      const targetI = Math.max(1, initI - totalIReducAll);

      return (
        <div style={{ padding: isPreview ? "0.35rem" : "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isPreview ? "0.25rem" : "0.5rem", height: "100%", textAlign: "center" }}>
          <div style={{ background: "var(--glass-bg)", padding: "0.3rem", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Initial</div>
            <div style={{ fontSize: isPreview ? "0.95rem" : "1.25rem", fontWeight: "bold" }}>{initL * initI}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>(P:{initL} C:{initI})</div>
          </div>
          <div style={{ background: "var(--glass-bg)", padding: "0.3rem", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "center", border: "1px solid var(--primary)" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--primary)", textTransform: "uppercase", fontWeight: 600 }}>Current</div>
            <div style={{ fontSize: isPreview ? "0.95rem" : "1.25rem", fontWeight: "bold" }}>{currentL * currentI}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>(P:{currentL} C:{currentI})</div>
          </div>
          <div style={{ background: "var(--glass-bg)", padding: "0.3rem", borderRadius: "4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Target</div>
            <div style={{ fontSize: isPreview ? "0.95rem" : "1.25rem", fontWeight: "bold" }}>{targetL * targetI}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>(P:{targetL} C:{targetI})</div>
          </div>
        </div>
      );

    case "description": return <Field label="Description" value={currentRisk.description} isHtml />;
    case "mitigation": return <Field label="Mitigation Plan" value={currentRisk.mitigationPlan} isHtml />;
    case "impact": return <Field label="Impact Statement" value={currentRisk.impactStatement} isHtml />;
    case "closure": return <Field label="Closure Criteria" value={currentRisk.closureCriteria} isHtml />;

    case "categoryHandling":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", height: "100%" }}>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Category</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{Array.isArray(currentRisk.riskCategory) ? currentRisk.riskCategory.join(", ") : (currentRisk.riskCategory || "N/A")}</div>
          </div>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Strategy</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{Array.isArray(currentRisk.handlingStrategy) ? currentRisk.handlingStrategy.join(", ") : (currentRisk.handlingStrategy || "N/A")}</div>
          </div>
        </div>
      );

    case "gpocsCpocs":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", height: "100%" }}>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>GPOCs</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.gpocs || "N/A"}</div>
          </div>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>CPOCs</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.cpocs || "N/A"}</div>
          </div>
        </div>
      );

    case "dates":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem", height: "100%" }}>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Discovered</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.discoveredDate || "N/A"}</div>
          </div>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Approved</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.approvedDate || "N/A"}</div>
          </div>
          <div>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Closed</strong>
            <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.closedDate || "N/A"}</div>
          </div>
        </div>
      );

    case "impactDetails":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem", height: "100%" }}>
          <div><strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Cost</strong><div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.impactCost || "N/A"}</div></div>
          <div><strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Schedule</strong><div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.impactSchedule || "N/A"}</div></div>
          <div><strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Performance</strong><div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.impactPerformance || "N/A"}</div></div>
        </div>
      );

    case "resourceDetails":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem", height: "100%" }}>
          <div><strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Res. Cost</strong><div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.resourceCostNeeded || "N/A"}</div></div>
          <div><strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Res. Sched</strong><div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.resourceScheduleNeeded || "N/A"}</div></div>
          <div><strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Realism</strong><div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{currentRisk.planRealism || "N/A"}</div></div>
        </div>
      );

    case "spof":
      if (!currentRisk.isSpof) return <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", color: "var(--text-muted)", fontStyle: "italic", fontSize: isPreview ? "0.75rem" : "0.875rem" }}>Not a SPOF item.</div>;
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", height: "100%", background: "rgba(239, 68, 68, 0.1)", borderLeft: "3px solid var(--danger)" }}>
          <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--danger)" }}>Single Point of Failure (SPOF)</strong>
          <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.2rem" }}>{currentRisk.spofDescription || "Marked as Single Point of Failure."}</div>
        </div>
      );

    case "statusLogs":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", overflowY: "auto", height: "100%" }}>
          <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Status Logs</strong>
          {currentRisk.statusLogs?.length > 0 ? (
            <ul style={{ paddingLeft: "1rem", margin: 0, fontSize: isPreview ? "0.75rem" : "0.85rem" }}>
              {currentRisk.statusLogs.slice().reverse().map(log => (
                <li key={log.id} style={{ marginBottom: "0.25rem" }}>
                  <strong>{new Date(log.date).toLocaleDateString()}</strong>: {log.update}
                </li>
              ))}
            </ul>
          ) : <span style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", color: "var(--text-muted)" }}>No logs recorded.</span>}
        </div>
      );

    case "burndownPlot":
      return (
        <div style={{ padding: isPreview ? "0.35rem" : "0.75rem", height: "100%", display: "flex", flexDirection: "column" }}>
          <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Burndown Plot</strong>
          <div style={{ flex: 1, minHeight: 0 }}>
            <RiskTimeline risk={currentRisk} showHeader={false} height="100%" />
          </div>
        </div>
      );

    case "actionList":
      return (
        <div style={{ padding: isPreview ? "0.35rem" : "0.75rem", height: "100%", overflowY: "auto" }}>
          <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Action Plan Steps</strong>
          {currentRisk.burndownSteps && currentRisk.burndownSteps.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isPreview ? "0.7rem" : "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "2px 0", width: "65%" }}>Action</th>
                  <th style={{ padding: "2px 0", width: "35%" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...currentRisk.burndownSteps].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map(step => (
                  <tr key={step.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "2px 0", paddingRight: "4px" }}>{step.description}</td>
                    <td style={{ padding: "2px 0", color: step.isCompleted ? "var(--success)" : "inherit", fontWeight: step.isCompleted ? "bold" : "normal" }}>
                      {step.isCompleted ? "Complete" : (step.targetDate ? new Date(step.targetDate).toLocaleDateString() : "N/A")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>No actions.</div>
          )}
        </div>
      );

    case "burndown":
      return (
        <div style={{ padding: isPreview ? "0.35rem" : "0.75rem", height: "100%", display: "grid", gridTemplateColumns: "60% 40%", gap: "0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Burndown Plot</strong>
            <div style={{ flex: 1, minHeight: 0 }}>
              <RiskTimeline risk={currentRisk} showHeader={false} height="100%" />
            </div>
          </div>
          <div style={{ height: "100%", overflowY: "auto", background: "rgba(0,0,0,0.2)", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid var(--glass-border)" }}>
            <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Action List</strong>
            {currentRisk.burndownSteps && currentRisk.burndownSteps.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isPreview ? "0.68rem" : "0.75rem" }}>
                <tbody>
                  {[...currentRisk.burndownSteps].map(step => (
                    <tr key={step.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "2px 0" }}>{step.description}</td>
                      <td style={{ padding: "2px 0", color: step.isCompleted ? "var(--success)" : "inherit" }}>
                        {step.isCompleted ? "✓" : (step.targetDate ? new Date(step.targetDate).toLocaleDateString(undefined, {month: "numeric", day: "numeric"}) : "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      );

    case "customFields":
      return (
        <div style={{ padding: isPreview ? "0.4rem" : "0.75rem", overflowY: "auto", height: "100%", display: "flex", flexWrap: "wrap", gap: isPreview ? "0.5rem" : "1rem" }}>
          {Object.keys(currentRisk).filter(k => k.startsWith("custom_")).map(([k, v]) => (
            <div key={k} style={{ minWidth: "45%" }}>
              <strong style={{ fontSize: isPreview ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>{k.replace("custom_", "")}</strong>
              <div style={{ fontSize: isPreview ? "0.75rem" : "0.875rem", marginTop: "0.15rem" }}>{v || "N/A"}</div>
            </div>
          ))}
        </div>
      );

    case "monteCarlo": return <MonteCarloWidget risk={currentRisk} isPreview={isPreview} />;

    default:
      return (
        <div style={{ padding: "0.5rem", color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center" }}>
          {widgetId}
        </div>
      );
  }
}
