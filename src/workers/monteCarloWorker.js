// src/workers/monteCarloWorker.js

// Generates a random number from a Triangular distribution
function randomTriangular(min, likely, max) {
  min = Number(min) || 0;
  likely = Number(likely) || 0;
  max = Number(max) || 0;
  if (min === max) return min;

  const U = Math.random();
  const F = (likely - min) / (max - min);

  if (U <= F) {
    return min + Math.sqrt(U * (max - min) * (likely - min));
  } else {
    return max - Math.sqrt((1 - U) * (max - min) * (max - likely));
  }
}

// Generates a random number from a Uniform distribution
function randomUniform(min, max) {
  return Number(min) + Math.random() * (Number(max) - Number(min));
}

// Generates a random number from a PERT-Beta distribution
function randomPERT(min, likely, max, lambda = 4) {
  min = Number(min) || 0;
  likely = Number(likely) || 0;
  max = Number(max) || 0;
  if (min === max) return min;
  if (min > max) { const t = min; min = max; max = t; }
  if (likely < min) likely = min;
  if (likely > max) likely = max;

  const range = max - min;
  const mu = (min + lambda * likely + max) / (lambda + 2);

  // Derive alpha and beta for the Beta distribution
  let alpha, beta;
  if (likely === mu) {
    // Symmetric case
    alpha = (lambda / 2) + 1;
    beta = alpha;
  } else {
    alpha = ((mu - min) * (2 * likely - min - max)) / ((likely - mu) * range);
    beta = alpha * (max - mu) / (mu - min);
  }

  // Clamp to reasonable values for stability
  if (alpha <= 0 || !isFinite(alpha)) alpha = 1;
  if (beta <= 0 || !isFinite(beta)) beta = 1;

  // Generate Beta(alpha, beta) using Jöhnk's algorithm for small params,
  // or the gamma method for larger ones
  const sample = sampleBeta(alpha, beta);
  return min + sample * range;
}

// Sample from Beta(a, b) using ratio of gamma variates
function sampleBeta(a, b) {
  const x = sampleGamma(a);
  const y = sampleGamma(b);
  if (x + y === 0) return 0.5;
  return x / (x + y);
}

// Sample from Gamma(shape) using Marsaglia and Tsang's method
function sampleGamma(shape) {
  if (shape < 1) {
    // Boost: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// Standard normal via Box-Muller
function randn() {
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

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

        if (risk.itemType === 'Opportunity') {
          iterCost -= sampledCost;
          iterSchedule -= sampledSchedule;
        } else {
          iterCost += sampledCost;
          iterSchedule += sampledSchedule;
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
