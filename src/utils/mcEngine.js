// src/utils/mcEngine.js

export function randomTriangular(min, likely, max) {
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

export function randomUniform(min, max) {
  return Number(min) + Math.random() * (Number(max) - Number(min));
}

export function randomPERT(min, likely, max, lambda = 4) {
  min = Number(min) || 0;
  likely = Number(likely) || 0;
  max = Number(max) || 0;
  if (min === max) return min;
  if (min > max) { const t = min; min = max; max = t; }
  if (likely < min) likely = min;
  if (likely > max) likely = max;

  const range = max - min;
  const mu = (min + lambda * likely + max) / (lambda + 2);

  let alpha, beta;
  if (likely === mu) {
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
  if (x + y === 0) return 0.5;
  return x / (x + y);
}

function sampleGamma(shape) {
  if (shape < 1) {
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

function randn() {
  const u = Math.random();
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

  let totalScheduleResults = new Float64Array(iterations);

  for (let i = 0; i < iterations; i++) {
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
  
  const p80Idx = Math.floor(iterations * 0.80);
  return totalScheduleResults[p80Idx] || 0;
}
