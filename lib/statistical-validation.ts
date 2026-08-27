export interface BootstrapValidation {
  modelInterval: { low: number; high: number };
  edgeInterval: { low: number; high: number };
  probabilityAboveBaseline: number;
  observedEdge: number;
}

/**
 * Moving-block bootstrap for ordered walk-forward scores.
 *
 * Sampling contiguous circular blocks preserves short-range dependence better
 * than an IID bootstrap. A deterministic PRNG keeps prediction snapshots
 * reproducible across processes and reloads.
 */
export function validateWalkForwardEdge(
  modelScores: number[],
  baselineScores: number[],
  iterations = 1600
): BootstrapValidation {
  const length = Math.min(modelScores.length, baselineScores.length);
  if (length === 0) {
    return {
      modelInterval: { low: 0, high: 0 },
      edgeInterval: { low: 0, high: 0 },
      probabilityAboveBaseline: 0,
      observedEdge: 0
    };
  }

  const models = modelScores.slice(0, length).map(finiteOrZero);
  const baselines = baselineScores.slice(0, length).map(finiteOrZero);
  const differences = models.map((score, index) => score - baselines[index]);
  const observedEdge = mean(differences);

  if (length < 8) {
    return {
      modelInterval: { low: mean(models), high: mean(models) },
      edgeInterval: { low: observedEdge, high: observedEdge },
      probabilityAboveBaseline: observedEdge > 0 ? 1 : 0,
      observedEdge
    };
  }

  const blockLength = Math.max(3, Math.min(14, Math.round(Math.sqrt(length))));
  const modelMeans: number[] = [];
  const edgeMeans: number[] = [];
  const random = mulberry32(seedFromSeries(models, baselines));

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let modelSum = 0;
    let edgeSum = 0;
    let sampled = 0;

    while (sampled < length) {
      const start = Math.floor(random() * length);
      for (let offset = 0; offset < blockLength && sampled < length; offset += 1) {
        const index = (start + offset) % length;
        modelSum += models[index];
        edgeSum += differences[index];
        sampled += 1;
      }
    }

    modelMeans.push(modelSum / length);
    edgeMeans.push(edgeSum / length);
  }

  modelMeans.sort((a, b) => a - b);
  edgeMeans.sort((a, b) => a - b);

  return {
    modelInterval: {
      low: quantile(modelMeans, 0.025),
      high: quantile(modelMeans, 0.975)
    },
    edgeInterval: {
      low: quantile(edgeMeans, 0.025),
      high: quantile(edgeMeans, 0.975)
    },
    probabilityAboveBaseline: edgeMeans.filter((value) => value > 0).length / edgeMeans.length,
    observedEdge
  };
}

export function wilsonInterval(successes: number, trials: number, z = 1.959963984540054) {
  if (trials <= 0) return { low: 0, high: 0 };

  const probability = Math.max(0, Math.min(1, successes / trials));
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = probability + z2 / (2 * trials);
  const margin = z * Math.sqrt((probability * (1 - probability) + z2 / (4 * trials)) / trials);

  return {
    low: Math.max(0, (centre - margin) / denominator),
    high: Math.min(1, (centre + margin) / denominator)
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function quantile(sorted: number[], probability: number) {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function seedFromSeries(left: number[], right: number[]) {
  let seed = 0x6d2b79f5;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = Math.round(left[index] * 1_000_000);
    const rightValue = Math.round(right[index] * 1_000_000);
    seed = Math.imul(seed ^ leftValue ^ (rightValue << 1) ^ index, 2654435761) >>> 0;
  }
  return seed || 1;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
