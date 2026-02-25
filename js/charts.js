/**
 * Decision Friction Engine - Charts Module
 * Chart.js calibration chart with graceful degradation.
 */

var calibrationChart = null;

/**
 * Render or update the calibration chart.
 * Degrades gracefully if Chart.js is not loaded.
 */
function updateCalibrationChart(bins) {
  var ctx = document.getElementById('calibrationChart');
  if (!ctx) return;

  // Graceful degradation
  if (typeof Chart === 'undefined') {
    var fallback = ctx.parentElement;
    if (fallback) {
      fallback.innerHTML = '<p class="chart-fallback">Chart library unavailable. Use the calibration table below.</p>';
    }
    return;
  }

  var binsWithData = bins.filter(function(b) { return b.count > 0; });
  if (binsWithData.length === 0) {
    if (calibrationChart) {
      calibrationChart.destroy();
      calibrationChart = null;
    }
    return;
  }

  // Midpoints represent "perfect calibration" diagonal
  var binMidpoints = bins.map(function(b) { return (b.min + Math.min(b.max, 100)) / 2; });
  var hitRates = bins.map(function(b) { return b.hitRate; });

  var data = {
    labels: bins.map(function(b) { return b.label; }),
    datasets: [
      {
        label: 'Perfect Calibration',
        data: binMidpoints,
        borderColor: 'rgba(156, 163, 175, 0.5)',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        type: 'line'
      },
      {
        label: 'Your Hit Rate',
        data: hitRates,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: false,
        type: 'line',
        spanGaps: true
      }
    ]
  };

  var options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.raw === null || context.raw === undefined) return '';
            return context.dataset.label + ': ' + Math.round(context.raw) + '%';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Actual hit rate (%)' },
        ticks: { callback: function(v) { return v + '%'; } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        title: { display: true, text: 'Forecast probability bin' },
        grid: { display: false }
      }
    }
  };

  if (calibrationChart) {
    calibrationChart.data = data;
    calibrationChart.update('none');
  } else {
    calibrationChart = new Chart(ctx, {
      type: 'line',
      data: data,
      options: options
    });
  }
}
