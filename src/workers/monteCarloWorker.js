// src/workers/monteCarloWorker.js

import { randomTriangular, randomUniform, randomPERT } from '../utils/mcEngine';


self.onmessage = function (e) {
  const { risks, probabilityMapping, iterations = 10000 } = e.data;

  let totalCostResults = new Float64Array(iterations);
  let totalScheduleResults = new Float64Array(iterations);

  for (let i = 0; i < iterations; i++) {
    let iterCost = 0;
    let iterSchedule = 0;

    for (const risk of risks) {
      if (risk.status === 'Closed') continue;

      // 1. Determine if risk occurs in this iteration
      let occurs = false;

      if (risk.itemType === 'Issue') {
        occurs = true; // Issues are realized events, so they always occur (100%)
      } else {
        let probRange = probabilityMapping[risk.likelihood];
        let probAvg = probRange ? ((probRange.min + probRange.max) / 2) : 50;
        occurs = (Math.random() * 100) <= probAvg;
      }

      // 2. If it occurs, sample from the distribution
      if (occurs) {
        let sampledCost = 0;
        let sampledSchedule = 0;

        if (risk.mcDistribution === 'Uniform') {
          sampledCost = randomUniform(risk.mcMinCost || 0, risk.mcMaxCost || 0);
          sampledSchedule = randomUniform(risk.mcMinSchedule || 0, risk.mcMaxSchedule || 0);
        } else if (risk.mcDistribution === 'PERT') {
          sampledCost = randomPERT(risk.mcMinCost || 0, risk.mcMostLikelyCost || 0, risk.mcMaxCost || 0);
          sampledSchedule = randomPERT(risk.mcMinSchedule || 0, risk.mcMostLikelySchedule || 0, risk.mcMaxSchedule || 0);
        } else {
          // Default Triangular
          sampledCost = randomTriangular(risk.mcMinCost || 0, risk.mcMostLikelyCost || 0, risk.mcMaxCost || 0);
          sampledSchedule = randomTriangular(risk.mcMinSchedule || 0, risk.mcMostLikelySchedule || 0, risk.mcMaxSchedule || 0);
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
    const idx = Math.floor(arr.length * p);
    return arr[idx] || 0;
  };

  const costStats = {
    mean: totalCostResults.reduce((a, b) => a + b, 0) / iterations,
    p50: getPercentile(totalCostResults, 0.50),
    p80: getPercentile(totalCostResults, 0.80),
    p90: getPercentile(totalCostResults, 0.90),
    max: totalCostResults[iterations - 1] || 0
  };

  const scheduleStats = {
    mean: totalScheduleResults.reduce((a, b) => a + b, 0) / iterations,
    p50: getPercentile(totalScheduleResults, 0.50),
    p80: getPercentile(totalScheduleResults, 0.80),
    p90: getPercentile(totalScheduleResults, 0.90),
    max: totalScheduleResults[iterations - 1] || 0
  };

  // Generate Histogram Bins (Cost)
  const numBins = 40;
  const costMin = totalCostResults[0] || 0;
  const costMax = costStats.max;
  const binWidth = (costMax - costMin) / numBins || 1;

  const costHistogram = Array.from({ length: numBins }, (_, i) => ({
    binStart: costMin + i * binWidth,
    binEnd: costMin + (i + 1) * binWidth,
    count: 0,
    cumulativeProbability: 0
  }));

  if (costMax > costMin) {
    for (let i = 0; i < iterations; i++) {
      let binIdx = Math.floor((totalCostResults[i] - costMin) / binWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      costHistogram[binIdx].count++;
    }

    let cumulative = 0;
    for (let i = 0; i < numBins; i++) {
      cumulative += costHistogram[i].count;
      costHistogram[i].cumulativeProbability = (cumulative / iterations) * 100;
    }
  }

  // Generate Histogram Bins (Schedule)
  const scheduleMin = totalScheduleResults[0] || 0;
  const scheduleMax = scheduleStats.max;
  const sBinWidth = (scheduleMax - scheduleMin) / numBins || 1;

  const scheduleHistogram = Array.from({ length: numBins }, (_, i) => ({
    binStart: scheduleMin + i * sBinWidth,
    binEnd: scheduleMin + (i + 1) * sBinWidth,
    count: 0,
    cumulativeProbability: 0
  }));

  if (scheduleMax > scheduleMin) {
    for (let i = 0; i < iterations; i++) {
      let binIdx = Math.floor((totalScheduleResults[i] - scheduleMin) / sBinWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      scheduleHistogram[binIdx].count++;
    }

    let cumulative = 0;
    for (let i = 0; i < numBins; i++) {
      cumulative += scheduleHistogram[i].count;
      scheduleHistogram[i].cumulativeProbability = (cumulative / iterations) * 100;
    }
  }

  self.postMessage({ costStats, scheduleStats, costHistogram, scheduleHistogram });
};
