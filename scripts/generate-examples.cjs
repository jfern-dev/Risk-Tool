const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const outDir = path.join(__dirname, '../examples');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let nextRiskId = 1;
let nextStepId = 1;

function generateRisk(index, type) {
  const rand = Math.random();
  let itemType;
  if (rand > 0.85) {
    itemType = 'Opportunity';
  } else if (rand > 0.6) {
    itemType = 'Issue';
  } else {
    itemType = 'Risk';
  }
  
  let title = `Sample ${itemType} ${index}`;
  let description = `<p>This is a generated sample description for ${title}.</p>`;
  
  if (type === 'long') {
    title = `Very Long and Complex Title for ${itemType} ${index} That Might Break UI Formatting If Not Wrapped Properly By The Container Limits Established In CSS`;
    description = `<p>This is a significantly longer description for testing purposes. It contains multiple sentences and perhaps some formatting. It simulates a user typing in a detailed background context.</p><br/><ul><li>Key driver 1</li><li>Key driver 2</li></ul><p>Expected outcome is severe if unmitigated.</p>`;
  } else if (type === 'medium') {
    title = `Medium Length Title for ${itemType} ${index} with specific context`;
    description = `<p>A moderately long description that explains the basic premise of ${title}. It has a few sentences.</p>`;
  }
  
  const levels = ['Program', 'Internal'];
  const statuses = ['Active', 'Proposed', 'Watch'];
  const categories = [['Cost'], ['Schedule'], ['Cost', 'Schedule']];
  
  const riskCategory = categories[Math.floor(Math.random() * categories.length)];

  // Base fields
  const risk = {
    id: nextRiskId++,
    userRiskId: `RIO-${1000 + index}`,
    title,
    description,
    itemType,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    level: levels[Math.floor(Math.random() * levels.length)],
    riskCategory,
    handlingStrategy: ['Mitigate'],
    includeInMonteCarlo: Math.random() > 0.1, // 90% chance to include
    mcDistribution: 'Triangular',
    createdAt: new Date().toISOString(),
    discoveredDate: new Date(Date.now() - Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  const isCost = riskCategory.includes('Cost');
  const isSchedule = riskCategory.includes('Schedule');

  if (isCost) {
    if (itemType === 'Opportunity') {
      risk.mcMinCost = Math.floor(Math.random() * 5000);
      risk.mcMostLikelyCost = risk.mcMinCost + Math.floor(Math.random() * 5000) + 1000;
      risk.mcMaxCost = risk.mcMostLikelyCost + Math.floor(Math.random() * 10000) + 2000;
    } else {
      risk.mcMinCost = Math.floor(Math.random() * 10000);
      risk.mcMostLikelyCost = risk.mcMinCost + Math.floor(Math.random() * 50000) + 5000;
      risk.mcMaxCost = risk.mcMostLikelyCost + Math.floor(Math.random() * 100000) + 10000;
    }
  }

  if (isSchedule) {
    if (itemType === 'Opportunity') {
      risk.mcMinSchedule = Math.floor(Math.random() * 10);
      risk.mcMostLikelySchedule = risk.mcMinSchedule + Math.floor(Math.random() * 15) + 5;
      risk.mcMaxSchedule = risk.mcMostLikelySchedule + Math.floor(Math.random() * 30) + 10;
    } else {
      risk.mcMinSchedule = Math.floor(Math.random() * 15);
      risk.mcMostLikelySchedule = risk.mcMinSchedule + Math.floor(Math.random() * 60) + 15;
      risk.mcMaxSchedule = risk.mcMostLikelySchedule + Math.floor(Math.random() * 120) + 30;
    }
  }

  const burndownSteps = [];
  const numSteps = type === 'long' ? 5 : (type === 'medium' ? 3 : 1);
  let currentTargetDate = new Date();
  currentTargetDate.setDate(currentTargetDate.getDate() - (numSteps * 14));
  
  let totalLikelihoodReduction = 0;

  for (let i = 0; i < numSteps; i++) {
    const isCompleted = i < numSteps - 1; // leave last step uncompleted
    const stepTargetDate = new Date(currentTargetDate);
    stepTargetDate.setDate(stepTargetDate.getDate() + 14 * (i + 1));
    
    if (isCompleted) {
      totalLikelihoodReduction += 1;
    }

    burndownSteps.push({
      id: nextStepId++,
      description: `Action step ${i + 1} to mitigate ${itemType.toLowerCase()}`,
      targetDate: stepTargetDate.toISOString().split('T')[0],
      isCompleted: isCompleted,
      completedAt: isCompleted ? new Date(stepTargetDate.getTime() + 24*60*60*1000).toISOString() : null,
      likelihoodReduction: 1,
      impactReduction: 0
    });
  }
  
  risk.burndownSteps = burndownSteps;
  
  const initialL = 5;
  const initialI = 4;
  risk.likelihood = Math.max(1, initialL - totalLikelihoodReduction);
  risk.impact = initialI;
  risk.initialLikelihood = initialL;
  risk.initialImpact = initialI;

  return risk;
}

function createErmFile(filename, type) {
  const risks = [];
  for (let i = 0; i < 10; i++) {
    risks.push(generateRisk(i, type));
  }
  
  const appData = {
    risks,
    fields: [],
    snapshots: [],
    dashboardSettings: {
      hiddenFields: [],
      probabilityMapping: {
        "1": { min: 1, max: 20 },
        "2": { min: 21, max: 40 },
        "3": { min: 41, max: 60 },
        "4": { min: 61, max: 80 },
        "5": { min: 81, max: 99 }
      }
    }
  };
  
  const tmpDir = path.join(os.tmpdir(), `erm-gen-${crypto.randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'data.json'), JSON.stringify(appData, null, 2));
  
  const zip = new AdmZip();
  zip.addLocalFolder(tmpDir);
  
  const outPath = path.join(outDir, filename);
  zip.writeZip(outPath);
  
  console.log(`Generated ${outPath}`);
  
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const os = require('os');
createErmFile('example-short.erm', 'short');
createErmFile('example-medium.erm', 'medium');
createErmFile('example-long.erm', 'long');

console.log('Done!');
