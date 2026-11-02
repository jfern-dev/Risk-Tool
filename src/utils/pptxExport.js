import pptxgen from 'pptxgenjs';
import toast from 'react-hot-toast';

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Replicates RiskTimeline calculation to produce data points for native PPTX LineChart
 */
function calculateTimelinePoints(risk) {
  if (!risk || !risk.burndownSteps || risk.burndownSteps.length === 0) return null;

  const initialDate = (risk.discoveredDate ? new Date(risk.discoveredDate) : new Date(risk.createdAt || Date.now())).getTime();
  let initialL = risk.initialLikelihood;
  let initialI = risk.initialImpact;

  if (initialL === undefined) {
    const totalLReduction = risk.burndownSteps.filter(s => s.isCompleted).reduce((sum, s) => sum + (s.likelihoodReduction || 0), 0);
    const totalIReduction = risk.burndownSteps.filter(s => s.isCompleted).reduce((sum, s) => sum + (s.impactReduction || 0), 0);
    initialL = Math.min(5, (risk.likelihood || 1) + totalLReduction);
    initialI = Math.min(5, (risk.impact || 1) + totalIReduction);
  }

  let currentTargetL = initialL;
  let currentTargetI = initialI;

  const targetEvents = risk.burndownSteps.filter(s => s.targetDate).map(s => ({
    date: new Date(s.targetDate).getTime(),
    isTarget: true,
    step: s
  }));

  const actualEvents = risk.burndownSteps.filter(s => s.isCompleted && s.completedAt).map(s => ({
    date: new Date(s.completedAt).getTime(),
    isActual: true,
    step: s
  }));

  const today = Date.now();
  const allEvents = [...targetEvents, ...actualEvents].sort((a, b) => a.date - b.date);
  const earliestEventDate = allEvents.length > 0 ? allEvents[0].date : initialDate;
  const chartStartDate = Math.min(initialDate, earliestEventDate - (1000 * 60 * 60 * 24));

  const points = [];
  points.push({
    date: chartStartDate,
    dateLabel: new Date(chartStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    targetScore: currentTargetL * currentTargetI,
    actualScore: initialL * initialI
  });

  let currentActualL = initialL;
  let currentActualI = initialI;

  allEvents.forEach(event => {
    if (event.isTarget) {
      currentTargetL = Math.max(1, currentTargetL - (event.step.likelihoodReduction || 0));
      currentTargetI = Math.max(1, currentTargetI - (event.step.impactReduction || 0));
    }
    if (event.isActual) {
      currentActualL = event.step.actualLikelihood || Math.max(1, currentActualL - (event.step.likelihoodReduction || 0));
      currentActualI = event.step.actualImpact || Math.max(1, currentActualI - (event.step.impactReduction || 0));
    }

    points.push({
      date: event.date,
      dateLabel: new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      targetScore: currentTargetL * currentTargetI,
      actualScore: event.date > today ? null : currentActualL * currentActualI
    });
  });

  return points;
}

const matrixColors = {
  5: ['10B981', 'F59E0B', 'EF4444', 'EF4444', 'EF4444'],
  4: ['10B981', 'F59E0B', 'F59E0B', 'EF4444', 'EF4444'],
  3: ['10B981', '10B981', 'F59E0B', 'F59E0B', 'EF4444'],
  2: ['10B981', '10B981', '10B981', 'F59E0B', 'F59E0B'],
  1: ['10B981', '10B981', '10B981', '10B981', 'F59E0B']
};

/**
 * Builds a slide that matches PdfReport.jsx layout, typography, and elements exactly.
 */
export function addPdfMatchedRiskSlide(pptx, risk) {
  const slide = pptx.addSlide();
  // Pure white background matching print CSS
  slide.background = { color: 'FFFFFF' };

  const currentItemType = risk.itemType || 'Risk';
  const likelihood = Math.max(1, Math.min(5, risk.likelihood || 1));
  const impact = Math.max(1, Math.min(5, risk.impact || 1));

  // ==========================================
  // 1. HEADER SECTION (matching PdfReport.jsx)
  // ==========================================
  const badgeText = risk.userRiskId || `ID-${risk.id}`;
  const badgeWidth = Math.max(0.95, Math.min(1.7, badgeText.length * 0.11 + 0.3));

  // UserRiskId Badge: padding 4px 10px, background #3b82f6, color white, border-radius 6px, bold
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.35, y: 0.20, w: badgeWidth, h: 0.32,
    fill: { color: '3B82F6' },
    line: { color: '3B82F6', width: 0 },
    rectRadius: 0.05
  });
  slide.addText(badgeText, {
    x: 0.35, y: 0.20, w: badgeWidth, h: 0.32,
    bold: true, fontSize: 10, color: 'FFFFFF',
    align: 'center', valign: 'middle'
  });

  // Title: h2 style={{ margin: 0, fontSize: '1.4rem', color: 'black' }}
  slide.addText(risk.title || 'Untitled Item', {
    x: 0.35 + badgeWidth + 0.12, y: 0.18, w: 9.3 - badgeWidth - 0.12, h: 0.38,
    bold: true, fontSize: 14.5, color: '000000',
    valign: 'middle'
  });

  // Subtitle: span style={{ color: '#555', fontSize: '0.9rem' }}
  slide.addText(`${currentItemType} | Level: ${risk.level || 'N/A'}`, {
    x: 0.35, y: 0.58, w: 9.3, h: 0.22,
    fontSize: 9.5, color: '555555'
  });

  // Header bottom border: borderBottom: 2px solid #ccc
  slide.addShape(pptx.ShapeType.line, {
    x: 0.35, y: 0.84, w: 9.3, h: 0,
    line: { color: 'CCCCCC', width: 1.75 }
  });

  // ==========================================
  // 2. TOP SECTION: 70% Left, 30% Right
  // ==========================================
  // --- Left Column (70%, width: 6.35) ---
  // Fixed Fields: Category & Handling Strategy in 2 columns
  slide.addText('Category', {
    x: 0.35, y: 0.94, w: 3.1, h: 0.18,
    bold: true, fontSize: 8.5, color: '666666'
  });
  const cat = Array.isArray(risk.riskCategory) ? risk.riskCategory.join(', ') : (risk.riskCategory || 'N/A');
  slide.addText(cat, {
    x: 0.35, y: 1.12, w: 3.1, h: 0.22,
    fontSize: 9.5, color: '000000'
  });

  slide.addText('Handling Strategy', {
    x: 3.55, y: 0.94, w: 3.15, h: 0.18,
    bold: true, fontSize: 8.5, color: '666666'
  });
  const strat = Array.isArray(risk.handlingStrategy) ? risk.handlingStrategy.join(', ') : (risk.handlingStrategy || 'N/A');
  slide.addText(strat, {
    x: 3.55, y: 1.12, w: 3.15, h: 0.22,
    fontSize: 9.5, color: '000000'
  });

  // Description
  slide.addText('Description', {
    x: 0.35, y: 1.38, w: 6.35, h: 0.18,
    bold: true, fontSize: 8.5, color: '666666'
  });
  const descClean = stripHtml(risk.description) || 'No description provided.';
  slide.addText(descClean, {
    x: 0.35, y: 1.56, w: 6.35, h: 0.55,
    fontSize: 9, color: '000000', valign: 'top'
  });

  // Divider line: borderTop: 1px solid #ddd
  slide.addShape(pptx.ShapeType.line, {
    x: 0.35, y: 2.16, w: 6.35, h: 0,
    line: { color: 'DDDDDD', width: 1 }
  });

  // Configurable / Dynamic Fields
  const closure = stripHtml(risk.closureCriteria) || 'N/A';
  slide.addText('Closure Criteria', {
    x: 0.35, y: 2.22, w: 6.35, h: 0.16,
    bold: true, fontSize: 8.5, color: '666666'
  });
  slide.addText(closure, {
    x: 0.35, y: 2.38, w: 6.35, h: 0.22,
    fontSize: 9, color: '000000'
  });

  const gpocs = risk.gpocs || 'N/A';
  slide.addText('GPOCs', {
    x: 0.35, y: 2.64, w: 3.1, h: 0.16,
    bold: true, fontSize: 8.5, color: '666666'
  });
  slide.addText(gpocs, {
    x: 0.35, y: 2.80, w: 3.1, h: 0.20,
    fontSize: 9, color: '000000'
  });

  const cpocs = risk.cpocs || 'N/A';
  slide.addText('CPOCs', {
    x: 3.55, y: 2.64, w: 3.15, h: 0.16,
    bold: true, fontSize: 8.5, color: '666666'
  });
  slide.addText(cpocs, {
    x: 3.55, y: 2.80, w: 3.15, h: 0.20,
    fontSize: 9, color: '000000'
  });

  // --- Right Column (30%, width: 2.70, x: 6.95) ---
  if (currentItemType === 'Issue') {
    // 1x5 Issue Matrix (matching RiskMatrix.jsx exactly)
    slide.addText('Issue Matrix', {
      x: 6.95, y: 0.94, w: 2.70, h: 0.20,
      bold: true, fontSize: 10, color: '000000', align: 'center'
    });

    const issueColors = ['F59E0B', 'F59E0B', 'EF4444', 'EF4444', '991B1B'];
    const cellsRow = [];
    for (let c = 1; c <= 5; c++) {
      const isCurrent = c === impact;
      cellsRow.push({
        text: isCurrent ? '✕' : '',
        options: {
          fontSize: 12,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
          fill: { color: issueColors[c - 1] }
        }
      });
    }

    const labelsRow = [
      { text: '1 (Low)', options: { fontSize: 7, color: '555555', align: 'center', bold: true } },
      { text: '2', options: { fontSize: 7, color: '555555', align: 'center', bold: true } },
      { text: '3 (Med)', options: { fontSize: 7, color: '555555', align: 'center', bold: true } },
      { text: '4', options: { fontSize: 7, color: '555555', align: 'center', bold: true } },
      { text: '5 (Ext)', options: { fontSize: 7, color: '555555', align: 'center', bold: true } }
    ];

    slide.addTable([cellsRow, labelsRow], {
      x: 6.95, y: 1.16, w: 2.70, h: 0.55,
      colW: [0.54, 0.54, 0.54, 0.54, 0.54],
      border: { pt: 0.5, color: 'FFFFFF' }
    });

    slide.addText('Consequence', {
      x: 6.95, y: 1.74, w: 2.70, h: 0.18,
      bold: true, fontSize: 8.5, color: '000000', align: 'center'
    });

    slide.addText('✕  Current Issue Consequence', {
      x: 6.95, y: 1.94, w: 2.70, h: 0.18,
      fontSize: 7.5, color: '666666', align: 'center'
    });
  } else {
    // 5x5 Matrix table matching RiskMatrix.jsx exactly with '✕' marker on active cell
    const matrixTitle = currentItemType === 'Opportunity' ? 'Opportunity Matrix' : 'Risk Matrix';
    slide.addText(matrixTitle, {
      x: 6.95, y: 0.94, w: 2.70, h: 0.20,
      bold: true, fontSize: 10, color: '000000', align: 'center'
    });

    const matrixTable = [];
    for (let l = 5; l >= 1; l--) {
      const row = [
        { text: `${l}`, options: { fontSize: 7, bold: true, color: '555555', align: 'center', valign: 'middle', fill: { color: 'F3F4F6' } } }
      ];
      for (let c = 1; c <= 5; c++) {
        const isCurrent = (l === likelihood && c === impact);
        let cellHex;
        if (currentItemType === 'Opportunity') {
          const oppScore = l * c;
          if (oppScore <= 4) cellHex = '93C5FD';
          else if (oppScore <= 9) cellHex = '3B82F6';
          else if (oppScore <= 16) cellHex = '1D4ED8';
          else cellHex = '172554';
        } else {
          cellHex = matrixColors[l][c - 1];
        }

        row.push({
          text: isCurrent ? '✕' : '',
          options: {
            fontSize: 10,
            bold: true,
            color: 'FFFFFF',
            align: 'center',
            valign: 'middle',
            fill: { color: cellHex }
          }
        });
      }
      matrixTable.push(row);
    }
    matrixTable.push([
      { text: 'P\\C', options: { fontSize: 6.5, bold: true, color: '555555', align: 'center', valign: 'middle', fill: { color: 'E5E7EB' } } },
      { text: '1', options: { fontSize: 7, color: '555555', align: 'center', valign: 'middle', fill: { color: 'F3F4F6' } } },
      { text: '2', options: { fontSize: 7, color: '555555', align: 'center', valign: 'middle', fill: { color: 'F3F4F6' } } },
      { text: '3', options: { fontSize: 7, color: '555555', align: 'center', valign: 'middle', fill: { color: 'F3F4F6' } } },
      { text: '4', options: { fontSize: 7, color: '555555', align: 'center', valign: 'middle', fill: { color: 'F3F4F6' } } },
      { text: '5', options: { fontSize: 7, color: '555555', align: 'center', valign: 'middle', fill: { color: 'F3F4F6' } } }
    ]);

    slide.addTable(matrixTable, {
      x: 7.10, y: 1.16, w: 2.45, h: 0.95,
      colW: [0.35, 0.42, 0.42, 0.42, 0.42, 0.42],
      border: { pt: 0.5, color: 'FFFFFF' }
    });
  }

  // Latest Status Log (matching PdfReport.jsx)
  slide.addText('Latest Status Log', {
    x: 6.95, y: 2.18, w: 2.70, h: 0.16,
    bold: true, fontSize: 8.5, color: '666666'
  });

  const latestLog = (risk.statusLogs && risk.statusLogs.length > 0)
    ? [...risk.statusLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  if (latestLog) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.95, y: 2.36, w: 2.70, h: 0.65,
      fill: { color: 'F9F9F9' },
      line: { color: 'CCCCCC', width: 1 },
      rectRadius: 0.03
    });
    slide.addText([
      { text: `${new Date(latestLog.date).toLocaleDateString()}\n`, options: { bold: true, color: '3B82F6', fontSize: 8 } },
      { text: latestLog.status ? `Status: ${latestLog.status}\n` : '', options: { fontSize: 7.5, color: '000000' } },
      { text: latestLog.takeaways ? `Takeaways: ${latestLog.takeaways}\n` : '', options: { fontSize: 7.5, color: '000000' } },
      { text: latestLog.challenges ? `Challenges: ${latestLog.challenges}` : '', options: { fontSize: 7.5, color: '555555' } }
    ], {
      x: 7.02, y: 2.40, w: 2.56, h: 0.57,
      valign: 'top'
    });
  } else {
    slide.addText('No logs yet', {
      x: 6.95, y: 2.48, w: 2.70, h: 0.35,
      fontSize: 8.5, color: '888888', italic: true, align: 'center'
    });
  }

  // ==========================================
  // 3. BOTTOM SECTION SEPARATOR (borderTop: 1px solid #ccc)
  // ==========================================
  slide.addShape(pptx.ShapeType.line, {
    x: 0.35, y: 3.10, w: 9.3, h: 0,
    line: { color: 'CCCCCC', width: 1 }
  });

  // ==========================================
  // 4. BOTTOM SECTION: 65% Left, 35% Right
  // ==========================================
  // --- Left: Burndown Timeline (width: 5.85) ---
  slide.addText('Burndown Timeline', {
    x: 0.35, y: 3.18, w: 5.85, h: 0.18,
    bold: true, fontSize: 8.5, color: '666666'
  });

  const timelinePoints = calculateTimelinePoints(risk);
  if (timelinePoints && timelinePoints.length > 1) {
    const chartLabels = timelinePoints.map(p => p.dateLabel);
    const targetValues = timelinePoints.map(p => p.targetScore);
    const actualValues = timelinePoints.map(p => p.actualScore);

    const chartData = [
      { name: 'Target Risk Score', labels: chartLabels, values: targetValues },
      { name: 'Actual Risk Score', labels: chartLabels, values: actualValues }
    ];

    slide.addChart(pptx.ChartType.line, chartData, {
      x: 0.35, y: 3.38, w: 5.85, h: 1.95,
      showLegend: true,
      legendPos: 't',
      legendFontSize: 8,
      lineDataSymbol: 'circle',
      lineDataSymbolSize: 4,
      valAxisMaxVal: 25,
      valAxisMinVal: 0,
      valAxisMajorUnit: 5,
      valAxisLabelFontSize: 8,
      catAxisLabelFontSize: 8,
      chartColors: ['94A3B8', '3B82F6']
    });
  } else {
    // Exact dashed placeholder from PdfReport.jsx: border: '1px dashed #ccc', borderRadius: '8px'
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.35, y: 3.45, w: 5.85, h: 1.4,
      fill: { color: 'FFFFFF' },
      line: { color: 'CCCCCC', width: 1, dashType: 'dash' },
      rectRadius: 0.05
    });
    slide.addText('No action plan established for this item yet.', {
      x: 0.35, y: 3.45, w: 5.85, h: 1.4,
      fontSize: 8.5, color: '888888', align: 'center', valign: 'middle'
    });
  }

  // --- Right: Action List (width: 3.20, x: 6.45) ---
  slide.addText('Action List', {
    x: 6.45, y: 3.18, w: 3.20, h: 0.18,
    bold: true, fontSize: 8.5, color: '666666'
  });

  const steps = risk.burndownSteps || [];
  if (steps.length > 0) {
    const sortedSteps = [...steps].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
    const actionRows = [
      [
        { text: 'Action', options: { bold: true, fontSize: 8, color: '000000', border: { pt: 0.75, color: 'CCCCCC' } } },
        { text: 'Date', options: { bold: true, fontSize: 8, color: '000000', border: { pt: 0.75, color: 'CCCCCC' } } }
      ]
    ];
    sortedSteps.slice(0, 5).forEach(s => {
      actionRows.push([
        { text: s.description || '', options: { fontSize: 7.5, color: '000000', border: { pt: 0.5, color: 'EEEEEE' } } },
        {
          text: s.isCompleted ? 'Complete' : (s.targetDate ? new Date(s.targetDate).toLocaleDateString() : 'N/A'),
          options: {
            fontSize: 7.5,
            color: s.isCompleted ? '10B981' : '000000',
            bold: !!s.isCompleted,
            border: { pt: 0.5, color: 'EEEEEE' }
          }
        }
      ]);
    });

    slide.addTable(actionRows, {
      x: 6.45, y: 3.40, w: 3.20, h: 1.6,
      colW: [2.15, 1.05]
    });
  } else {
    slide.addText('No actions established.', {
      x: 6.45, y: 3.45, w: 3.20, h: 0.5,
      fontSize: 8.5, color: '888888', italic: true
    });
  }
}

/**
 * Export a single risk item to PowerPoint (.pptx) matching PdfReport.jsx
 */
export async function exportRiskToPptx(risk) {
  if (!risk) {
    toast.error('No risk item selected');
    return;
  }

  const toastId = toast.loading('Generating PowerPoint presentation...');
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Risk Tool ERM';
    pptx.company = 'Enterprise Risk Management';
    pptx.title = `${risk.userRiskId || 'Risk'} - ${risk.title || 'Report'}`;

    addPdfMatchedRiskSlide(pptx, risk);

    const filename = `Risk_${(risk.userRiskId || risk.id || 'export').toString().replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().substring(0, 10)}.pptx`;
    await pptx.writeFile({ fileName: filename });
    toast.success(`Exported ${filename}`, { id: toastId });
  } catch (err) {
    console.error('Failed to export PPTX:', err);
    toast.error(`Export failed: ${err.message}`, { id: toastId });
  }
}

/**
 * Export a collection of risks to PowerPoint (.pptx) matching PdfReport.jsx
 */
export async function exportRisksToPptx(risks, title = 'Enterprise Risk Register') {
  if (!risks || risks.length === 0) {
    toast.error('No items to export');
    return;
  }

  const toastId = toast.loading(`Generating PowerPoint presentation (${risks.length} items)...`);
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Risk Tool ERM';
    pptx.company = 'Enterprise Risk Management';
    pptx.title = title;

    // Generates each risk slide matching the PDF print pages exactly
    risks.forEach((risk) => {
      addPdfMatchedRiskSlide(pptx, risk);
    });

    const filename = `ERM_Risk_Register_${new Date().toISOString().substring(0, 10)}.pptx`;
    await pptx.writeFile({ fileName: filename });
    toast.success(`Exported ${filename}`, { id: toastId });
  } catch (err) {
    console.error('Failed to export PPTX:', err);
    toast.error(`Export failed: ${err.message}`, { id: toastId });
  }
}
