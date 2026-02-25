/**
 * Decision Friction Engine - Analytics Module
 * Brier scores, calibration binning, overconfidence gaps, notable decisions.
 */

/**
 * Compute Brier score for a single forecast.
 * @param {number} forecastProbability - 0 to 100
 * @param {string} outcome - 'occurred' or 'did_not_occur'
 * @returns {number} - Brier score (0 = perfect, 1 = maximally wrong)
 */
function computeBrierScore(forecastProbability, outcome) {
  var forecast = forecastProbability / 100;
  var actual = outcome === 'occurred' ? 1 : 0;
  return Math.pow(forecast - actual, 2);
}

/**
 * Filter to only resolved entries with binary outcomes (occurred / did_not_occur)
 */
function getResolvedBinaryEntries(entries) {
  return entries.filter(function(e) {
    return e.status === 'resolved' &&
      e.resolution &&
      (e.resolution.outcome === 'occurred' || e.resolution.outcome === 'did_not_occur');
  });
}

/**
 * Compute summary statistics across all entries.
 */
function getSummaryStats(entries) {
  var total = entries.length;
  var open = entries.filter(function(e) { return e.status === 'open' && !e.archived; }).length;
  var resolved = entries.filter(function(e) { return e.status === 'resolved'; }).length;
  var archived = entries.filter(function(e) { return e.archived; }).length;

  var binaryResolved = getResolvedBinaryEntries(entries);
  var avgBrier = null;

  if (binaryResolved.length > 0) {
    var totalBrier = binaryResolved.reduce(function(sum, e) {
      return sum + e.resolution.brierScore;
    }, 0);
    avgBrier = totalBrier / binaryResolved.length;
  }

  return {
    total: total,
    open: open,
    resolved: resolved,
    archived: archived,
    binaryResolved: binaryResolved.length,
    avgBrier: avgBrier
  };
}

/**
 * Bin resolved binary entries into calibration buckets.
 * Each bin: { label, min, max, count, avgForecast, hitRate, gap }
 */
function getCalibrationBins(entries) {
  var binaryResolved = getResolvedBinaryEntries(entries);

  return CONSTANTS.calibrationBins.map(function(bin) {
    var inBin = binaryResolved.filter(function(e) {
      var p = e.forecastProbability;
      return p >= bin.min && p < bin.max;
    });

    var count = inBin.length;
    var avgForecast = null;
    var hitRate = null;
    var gap = null;

    if (count > 0) {
      avgForecast = inBin.reduce(function(sum, e) { return sum + e.forecastProbability; }, 0) / count;
      var hits = inBin.filter(function(e) { return e.resolution.outcome === 'occurred'; }).length;
      hitRate = (hits / count) * 100;
      gap = avgForecast - hitRate;
    }

    return {
      label: bin.label,
      min: bin.min,
      max: bin.max,
      count: count,
      avgForecast: avgForecast,
      hitRate: hitRate,
      gap: gap
    };
  });
}

/**
 * Find the most notable decisions:
 * - Highest confidence wrong: highest forecast probability among "did_not_occur"
 * - Lowest confidence right: lowest forecast probability among "occurred"
 */
function getNotableDecisions(entries) {
  var binaryResolved = getResolvedBinaryEntries(entries);

  var highestConfidenceWrong = null;
  var lowestConfidenceRight = null;

  for (var i = 0; i < binaryResolved.length; i++) {
    var entry = binaryResolved[i];
    var wasRight = entry.resolution.outcome === 'occurred';

    if (!wasRight) {
      if (!highestConfidenceWrong || entry.forecastProbability > highestConfidenceWrong.forecastProbability) {
        highestConfidenceWrong = entry;
      }
    } else {
      if (!lowestConfidenceRight || entry.forecastProbability < lowestConfidenceRight.forecastProbability) {
        lowestConfidenceRight = entry;
      }
    }
  }

  return {
    highestConfidenceWrong: highestConfidenceWrong,
    lowestConfidenceRight: lowestConfidenceRight
  };
}
