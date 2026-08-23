// src/utils/mcEngine.js

export function randomTriangular(min, likely, max) {
  min = Number(min) || 0;
  likely = Number(likely) || 0;
  max = Number(max) || 0;
  if (min > max) { const t = min; min = max; max = t; }
  if (likely < min) likely = min;
  if (likely > max) likely = max;
  if (min === max) return min;

  const U = Math.random();
  const F = (likely - min) / (max - min);

  if (U <= F) {
    return min + Math.sqrt(Math.max(0, U * (max - min) * (likely - min)));
  } else {
    return max - Math.sqrt(Math.max(0, (1 - U) * (max - min) * (max - likely)));
  }
}

export function randomUniform(min, max) {
  min = Number(min) || 0;
  max = Number(max) || 0;
  if (min > max) { const t = min; min = max; max = t; }
  if (min === max) return min;
  return min + Math.random() * (max - min);
}

export function randomPERT(min, likely, max, lambda = 4) {
  min = Number(min) || 0;
  likely = Number(likely) || 0;
  max = Number(max) || 0;
  if (min > max) { const t = min; min = max; max = t; }
  if (likely < min) likely = min;
  if (likely > max) likely = max;
  if (min === max) return min;

  const range = max - min;
  const mu = (min + lambda * likely + max) / (lambda + 2);

  let alpha, beta;
  if (Math.abs(likely - mu) < 1e-7) {
    alpha = (lambda / 2) + 1;
    beta = alpha;
  } else {
    alpha = ((mu - min) * (2 * likely - min - max)) / ((likely - mu) * range);
    beta = alpha * (max - mu) / (mu - min);
  }

  if (alpha <= 0 || !isFinite(alpha)) alpha = 1;
  if (beta <= 0 || !isFinite(beta)) beta = 1;

  const sample = sampleBeta(alpha, beta);
  return min + sample * range;
}

function sampleBeta(a, b) {
  const x = sampleGamma(a);
  const y = sampleGamma(b);
  if (x + y === 0 || isNaN(x) || isNaN(y)) return 0.5;
  return x / (x + y);
}

function sampleGamma(shape) {
  shape = Number(shape) || 1;
  if (shape <= 0 || !isFinite(shape)) shape = 1;
  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / Math.max(shape, 0.001));
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  let tries = 0;
  while (++tries < 500) {
    let x, v;
    let innerTries = 0;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0 && ++innerTries < 100);
    if (v <= 0) v = 1;
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
  return d;
}

function randn() {
  const u = Math.max(Math.random(), 1e-15);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Simulates the schedule delay for a specific set of risks associated with a task.
 * @param {Array} risks Array of risk objects mapped to the task
 * @param {Object} probabilityMapping Mapping of 1-5 likelihood to min/max percentages
 * @param {Number} iterations Number of Monte Carlo iterations
 * @returns {Number} P80 schedule delay value
 */
export function calculateTaskScheduleP80(risks, probabilityMapping, iterations = 1000) {
  if (!risks || risks.length === 0) return 0;

  const scheduleRisks = risks.filter(r =>
    r.includeInMonteCarlo !== false &&
    r.status !== 'Closed' &&
    (Array.isArray(r.riskCategory) ? r.riskCategory.includes('Schedule') : r.riskCategory === 'Schedule')
  );

  if (scheduleRisks.length === 0) return 0;

  const safeIterations = Math.min(Math.max(Number(iterations) || 500, 100), 5000);
  let totalScheduleResults = new Float64Array(safeIterations);

  for (let i = 0; i < safeIterations; i++) {
    let iterSchedule = 0;

    for (const risk of scheduleRisks) {
      let occurs = false;
      if (risk.itemType === 'Issue') {
        occurs = true;
      } else {
        let probRange = probabilityMapping && probabilityMapping[risk.likelihood] ? probabilityMapping[risk.likelihood] : null;
        let probAvg = probRange ? ((probRange.min + probRange.max) / 2) : 50;
        occurs = (Math.random() * 100) <= probAvg;
      }

      if (occurs) {
        let sampledSchedule = 0;
        if (risk.mcDistribution === 'Uniform') {
          sampledSchedule = randomUniform(risk.mcMinSchedule || 0, risk.mcMaxSchedule || 0);
        } else if (risk.mcDistribution === 'PERT') {
          sampledSchedule = randomPERT(risk.mcMinSchedule || 0, risk.mcMostLikelySchedule || 0, risk.mcMaxSchedule || 0);
        } else {
          sampledSchedule = randomTriangular(risk.mcMinSchedule || 0, risk.mcMostLikelySchedule || 0, risk.mcMaxSchedule || 0);
        }

        if (risk.itemType === 'Opportunity') {
          iterSchedule -= sampledSchedule;
        } else {
          iterSchedule += sampledSchedule;
        }
      }
    }
    totalScheduleResults[i] = iterSchedule;
  }

  totalScheduleResults.sort();

  const p80Idx = Math.floor(safeIterations * 0.80);
  return totalScheduleResults[p80Idx] || 0;
}

/**
 * Runs a complete Monte Carlo simulation across all risks and returns stats and histograms.
 */
export function runMonteCarloSimulation(risks = [], probabilityMapping = {}, iterations = 50000) {
  const safeIterations = Math.max(100, Math.min(Number(iterations) || 10000, 100000));
  const probMap = probabilityMapping && Object.keys(probabilityMapping).length > 0 ? probabilityMapping : {
    1: { min: 1, max: 20 },
    2: { min: 21, max: 40 },
    3: { min: 41, max: 60 },
    4: { min: 61, max: 80 },
    5: { min: 81, max: 99 }
  };

  const activeRisks = (risks || []).filter(r => r && r.status !== 'Closed' && r.includeInMonteCarlo !== false);

  let totalCostResults = new Float64Array(safeIterations);
  let totalScheduleResults = new Float64Array(safeIterations);

  for (let i = 0; i < safeIterations; i++) {
    let iterCost = 0;
    let iterSchedule = 0;

    for (const risk of activeRisks) {
      let occurs = false;
      if (risk.itemType === 'Issue') {
        occurs = true;
      } else {
        const lKey = Number(risk.likelihood) || 3;
        const probRange = probMap[lKey] || probMap[String(lKey)];
        const probAvg = probRange ? ((Number(probRange.min) + Number(probRange.max)) / 2) : 50;
        occurs = (Math.random() * 100) <= probAvg;
      }

      if (occurs) {
        let sampledCost = 0;
        let sampledSchedule = 0;

        const minCost = Number(risk.mcMinCost) || 0;
        const mlCost = Number(risk.mcMostLikelyCost) || minCost;
        const maxCost = Number(risk.mcMaxCost) || mlCost;

        const minSched = Number(risk.mcMinSchedule) || 0;
        const mlSched = Number(risk.mcMostLikelySchedule) || minSched;
        const maxSched = Number(risk.mcMaxSchedule) || mlSched;

        if (risk.mcDistribution === 'Uniform') {
          sampledCost = randomUniform(minCost, maxCost);
          sampledSchedule = randomUniform(minSched, maxSched);
        } else if (risk.mcDistribution === 'PERT') {
          sampledCost = randomPERT(minCost, mlCost, maxCost);
          sampledSchedule = randomPERT(minSched, mlSched, maxSched);
        } else {
          sampledCost = randomTriangular(minCost, mlCost, maxCost);
          sampledSchedule = randomTriangular(minSched, mlSched, maxSched);
        }

        const hasCost = Array.isArray(risk.riskCategory) ? risk.riskCategory.includes('Cost') : risk.riskCategory === 'Cost';
        const hasSchedule = Array.isArray(risk.riskCategory) ? risk.riskCategory.includes('Schedule') : risk.riskCategory === 'Schedule';

        if (risk.itemType === 'Opportunity') {
          if (hasCost) iterCost -= sampledCost;
          if (hasSchedule) iterSchedule -= sampledSchedule;
        } else {
          if (hasCost) iterCost += sampledCost;
          if (hasSchedule) iterSchedule += sampledSchedule;
        }
      }
    }

    totalCostResults[i] = iterCost;
    totalScheduleResults[i] = iterSchedule;
  }

  totalCostResults.sort();
  totalScheduleResults.sort();

  const getPercentile = (arr, p) => {
    const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)));
    return arr[idx] || 0;
  };

  const costStats = {
    mean: totalCostResults.reduce((a, b) => a + b, 0) / safeIterations,
    p50: getPercentile(totalCostResults, 0.50),
    p80: getPercentile(totalCostResults, 0.80),
    p90: getPercentile(totalCostResults, 0.90),
    max: totalCostResults[safeIterations - 1] || 0
  };

  const scheduleStats = {
    mean: totalScheduleResults.reduce((a, b) => a + b, 0) / safeIterations,
    p50: getPercentile(totalScheduleResults, 0.50),
    p80: getPercentile(totalScheduleResults, 0.80),
    p90: getPercentile(totalScheduleResults, 0.90),
    max: totalScheduleResults[safeIterations - 1] || 0
  };

  // Generate Histogram Bins (Cost)
  const numBins = 40;
  const costMin = totalCostResults[0] || 0;
  const costMax = costStats.max;
  const binWidth = costMax > costMin ? (costMax - costMin) / numBins : 1;

  const costHistogram = Array.from({ length: numBins }, (_, i) => ({
    binStart: costMin + i * binWidth,
    binEnd: costMin + (i + 1) * binWidth,
    count: 0,
    cumulativeProbability: 0
  }));

  if (costMax > costMin) {
    for (let i = 0; i < safeIterations; i++) {
      let binIdx = Math.floor((totalCostResults[i] - costMin) / binWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      costHistogram[binIdx].count++;
    }

    let cumulative = 0;
    for (let i = 0; i < numBins; i++) {
      cumulative += costHistogram[i].count;
      costHistogram[i].cumulativeProbability = (cumulative / safeIterations) * 100;
    }
  }

  // Generate Histogram Bins (Schedule)
  const scheduleMin = totalScheduleResults[0] || 0;
  const scheduleMax = scheduleStats.max;
  const sBinWidth = scheduleMax > scheduleMin ? (scheduleMax - scheduleMin) / numBins : 1;

  const scheduleHistogram = Array.from({ length: numBins }, (_, i) => ({
    binStart: scheduleMin + i * sBinWidth,
    binEnd: scheduleMin + (i + 1) * sBinWidth,
    count: 0,
    cumulativeProbability: 0
  }));

  if (scheduleMax > scheduleMin) {
    for (let i = 0; i < safeIterations; i++) {
      let binIdx = Math.floor((totalScheduleResults[i] - scheduleMin) / sBinWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      scheduleHistogram[binIdx].count++;
    }

    let cumulative = 0;
    for (let i = 0; i < numBins; i++) {
      cumulative += scheduleHistogram[i].count;
      scheduleHistogram[i].cumulativeProbability = (cumulative / safeIterations) * 100;
    }
  }

  return { costStats, scheduleStats, costHistogram, scheduleHistogram };
}
