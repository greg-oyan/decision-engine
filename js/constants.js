/**
 * Decision Friction Engine - Constants & Configuration
 * Schema version, categories, labels, glossary, validation rules.
 */

const CONSTANTS = {
  schemaVersion: 1,
  storageKey: 'dfEngine',

  categories: [
    { value: 'work', label: 'Work' },
    { value: 'finance', label: 'Finance' },
    { value: 'theology', label: 'Theology' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'health', label: 'Health' },
    { value: 'other', label: 'Other' }
  ],

  outcomes: [
    { value: 'occurred', label: 'Occurred', binary: true },
    { value: 'did_not_occur', label: 'Did Not Occur', binary: true },
    { value: 'partially', label: 'Partially', binary: false },
    { value: 'unknown', label: 'Unknown', binary: false }
  ],

  probabilityLabels: [
    { max: 5, label: 'Almost impossible' },
    { max: 15, label: 'Very unlikely' },
    { max: 30, label: 'Unlikely' },
    { max: 49, label: 'Less likely than not' },
    { max: 50, label: 'Coin flip' },
    { max: 69, label: 'More likely than not' },
    { max: 85, label: 'Likely' },
    { max: 95, label: 'Very likely' },
    { max: 100, label: 'Almost certain' }
  ],

  confidenceLabels: [
    { max: 25, label: "Very low \u2014 I'm guessing" },
    { max: 50, label: 'Low \u2014 weak evidence' },
    { max: 75, label: 'Moderate \u2014 some evidence' },
    { max: 100, label: 'High \u2014 strong evidence' }
  ],

  calibrationBins: [
    { min: 0, max: 20, label: '0\u201320%' },
    { min: 20, max: 40, label: '20\u201340%' },
    { min: 40, max: 60, label: '40\u201360%' },
    { min: 60, max: 80, label: '60\u201380%' },
    { min: 80, max: 101, label: '80\u2013100%' }
  ],

  validation: {
    title: { required: true, maxLength: 200 },
    claim: { required: true, maxLength: 500 },
    category: { required: true },
    resolveBy: { required: true },
    forecastProbability: { required: true, min: 0, max: 100 },
    forecastConfidence: { required: true, min: 0, max: 100 },
    assumptions: { minItems: 3, maxItems: 10, itemMaxLength: 300 },
    counterfactuals: { minItems: 2, maxItems: 10, itemMaxLength: 300 },
    stakeholders: { required: true, maxLength: 500 },
    whoBenefitsIfWrong: { required: true, maxLength: 500 },
    evidenceToChangeMind: { required: true, maxLength: 500 }
  },

  glossary: {
    forecastProbability: {
      term: 'Forecast probability',
      definition: 'Your best estimate of the chance this outcome happens. 0% = impossible, 100% = certain.',
      example: '70% means you think this happens about 7 out of 10 times in similar situations.'
    },
    forecastConfidence: {
      term: 'Confidence in forecast',
      definition: 'How much evidence supports your probability estimate. Low = gut feeling. High = strong data.',
      example: 'You might be 60% on the outcome but only 20% confident because you have little data.'
    },
    baseRate: {
      term: 'Base rate',
      definition: 'How often this type of thing happens in general, before considering your specific situation. The "outside view."',
      example: "If 30% of startups succeed, that's the base rate \u2014 before considering anything about YOUR startup."
    },
    brierScore: {
      term: 'Brier score',
      definition: 'Measures forecast accuracy. 0 = perfect, 1 = maximally wrong. Lower is better.',
      example: 'Forecasting 90% and being right = 0.01. Forecasting 90% and being wrong = 0.81.'
    },
    counterfactuals: {
      term: 'Failure modes',
      definition: 'Scenarios where your prediction fails. Forces you to imagine being wrong before it happens.',
      example: '"What if the competitor ships first?" or "What if my key budget assumption is wrong?"'
    },
    incentives: {
      term: 'Incentive mapping',
      definition: 'Who has skin in the game? People with incentives may distort information you rely on.',
      example: 'A sales team has incentive to be optimistic about pipeline numbers.'
    },
    overconfidenceGap: {
      term: 'Overconfidence gap',
      definition: 'The difference between your average forecast and what actually happened. Positive = overconfident.',
      example: 'If you average 80% forecasts but only 60% come true, your gap is +20%.'
    },
    calibration: {
      term: 'Calibration',
      definition: 'When your stated probabilities match reality. If you say "80%" for 10 things, about 8 should happen.',
      example: 'Perfect calibration: your 70% forecasts come true 70% of the time.'
    }
  }
};

/**
 * Get human-readable label for a probability value
 */
function getProbabilityLabel(value) {
  for (const item of CONSTANTS.probabilityLabels) {
    if (value <= item.max) return item.label;
  }
  return '';
}

/**
 * Get human-readable label for a confidence value
 */
function getConfidenceLabel(value) {
  for (const item of CONSTANTS.confidenceLabels) {
    if (value <= item.max) return item.label;
  }
  return '';
}
