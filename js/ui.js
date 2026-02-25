/**
 * Decision Friction Engine - UI Module
 * DOM rendering, view routing, event handlers, validation.
 */

var currentView = 'new-entry';
var currentDetailId = null;

// Debounce helper
function debounce(func, wait) {
  var timeout;
  return function() {
    var args = arguments;
    var context = this;
    clearTimeout(timeout);
    timeout = setTimeout(function() { func.apply(context, args); }, wait);
  };
}

// ============================================
// Tab Switching
// ============================================

function switchTab(tabName) {
  currentView = tabName;

  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.view').forEach(function(view) {
    view.classList.toggle('hidden', view.id !== 'view-' + tabName);
  });

  if (tabName === 'entries') {
    hideDetail();
  } else if (tabName === 'analytics') {
    renderAnalytics();
  }
}

// ============================================
// New Entry Form
// ============================================

function initForm() {
  var probSlider = document.getElementById('forecastProbability');
  var probValue = document.getElementById('probValue');
  var probLabel = document.getElementById('probLabel');

  probSlider.addEventListener('input', function() {
    var val = parseInt(probSlider.value, 10);
    probValue.textContent = val + '%';
    probLabel.textContent = getProbabilityLabel(val);
  });

  var confSlider = document.getElementById('forecastConfidence');
  var confValue = document.getElementById('confValue');
  var confLabel = document.getElementById('confLabel');

  confSlider.addEventListener('input', function() {
    var val = parseInt(confSlider.value, 10);
    confValue.textContent = val + '%';
    confLabel.textContent = getConfidenceLabel(val);
  });

  document.getElementById('addAssumption').addEventListener('click', function() {
    addDynamicRow('assumptions', 'Assumption');
  });
  document.getElementById('addCounterfactual').addEventListener('click', function() {
    addDynamicRow('counterfactuals', 'Failure mode');
  });

  // Set min date to today
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('resolveBy').setAttribute('min', yyyy + '-' + mm + '-' + dd);

  document.getElementById('saveEntry').addEventListener('click', handleSaveEntry);
}

function addDynamicRow(containerId, placeholder) {
  var container = document.getElementById(containerId);
  var rows = container.querySelectorAll('.dynamic-row');
  var rules = containerId === 'assumptions' ? CONSTANTS.validation.assumptions : CONSTANTS.validation.counterfactuals;

  if (rows.length >= rules.maxItems) return;

  var index = rows.length + 1;
  var row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML =
    '<input type="text" placeholder="' + placeholder + ' ' + index + '" maxlength="' + rules.itemMaxLength + '">' +
    '<button type="button" class="btn-remove-row" title="Remove">\u00d7</button>';

  row.querySelector('.btn-remove-row').addEventListener('click', function() {
    var currentRows = container.querySelectorAll('.dynamic-row');
    if (currentRows.length > rules.minItems) {
      row.remove();
    }
  });

  container.appendChild(row);
}

function clearForm() {
  document.getElementById('entryTitle').value = '';
  document.getElementById('entryClaim').value = '';
  document.getElementById('entryCategory').value = '';
  document.getElementById('resolveBy').value = '';
  document.getElementById('forecastProbability').value = 50;
  document.getElementById('forecastConfidence').value = 50;

  document.getElementById('probValue').textContent = '50%';
  document.getElementById('probLabel').textContent = getProbabilityLabel(50);
  document.getElementById('confValue').textContent = '50%';
  document.getElementById('confLabel').textContent = getConfidenceLabel(50);

  // Reset assumptions to 3 empty
  var assContainer = document.getElementById('assumptions');
  assContainer.innerHTML = '';
  for (var i = 0; i < 3; i++) addDynamicRow('assumptions', 'Assumption');

  // Reset counterfactuals to 2 empty
  var cfContainer = document.getElementById('counterfactuals');
  cfContainer.innerHTML = '';
  for (var j = 0; j < 2; j++) addDynamicRow('counterfactuals', 'Failure mode');

  document.getElementById('baseRateEstimate').value = '';
  document.getElementById('baseRateReasoning').value = '';
  document.getElementById('stakeholders').value = '';
  document.getElementById('whoBenefitsIfWrong').value = '';
  document.getElementById('evidenceToChangeMind').value = '';

  clearValidationErrors();
}

// ============================================
// Form Validation
// ============================================

function clearValidationErrors() {
  document.querySelectorAll('.field-error').forEach(function(el) { el.textContent = ''; });
  document.querySelectorAll('.input-error').forEach(function(el) { el.classList.remove('input-error'); });
}

function showFieldError(fieldId, message) {
  var errorEl = document.getElementById(fieldId + '-error');
  if (errorEl) errorEl.textContent = message;
  var inputEl = document.getElementById(fieldId);
  if (inputEl) inputEl.classList.add('input-error');
}

function getDynamicRowValues(containerId) {
  var container = document.getElementById(containerId);
  var inputs = container.querySelectorAll('.dynamic-row input');
  return Array.from(inputs).map(function(input) { return input.value.trim(); }).filter(function(v) { return v.length > 0; });
}

function validateForm() {
  clearValidationErrors();
  var valid = true;

  var title = document.getElementById('entryTitle').value.trim();
  if (!title) { showFieldError('entryTitle', 'Title is required.'); valid = false; }
  else if (title.length > 200) { showFieldError('entryTitle', 'Max 200 characters.'); valid = false; }

  var claim = document.getElementById('entryClaim').value.trim();
  if (!claim) { showFieldError('entryClaim', 'Claim is required.'); valid = false; }
  else if (claim.length > 500) { showFieldError('entryClaim', 'Max 500 characters.'); valid = false; }

  var category = document.getElementById('entryCategory').value;
  if (!category) { showFieldError('entryCategory', 'Select a category.'); valid = false; }

  var resolveBy = document.getElementById('resolveBy').value;
  if (!resolveBy) { showFieldError('resolveBy', 'Resolve date is required.'); valid = false; }

  var assumptions = getDynamicRowValues('assumptions');
  if (assumptions.length < CONSTANTS.validation.assumptions.minItems) {
    showFieldError('assumptions', 'At least ' + CONSTANTS.validation.assumptions.minItems + ' assumptions required (with text).');
    valid = false;
  }

  var counterfactuals = getDynamicRowValues('counterfactuals');
  if (counterfactuals.length < CONSTANTS.validation.counterfactuals.minItems) {
    showFieldError('counterfactuals', 'At least ' + CONSTANTS.validation.counterfactuals.minItems + ' failure modes required (with text).');
    valid = false;
  }

  var stakeholders = document.getElementById('stakeholders').value.trim();
  if (!stakeholders) { showFieldError('stakeholders', 'Required.'); valid = false; }

  var whoBenefits = document.getElementById('whoBenefitsIfWrong').value.trim();
  if (!whoBenefits) { showFieldError('whoBenefitsIfWrong', 'Required.'); valid = false; }

  var evidence = document.getElementById('evidenceToChangeMind').value.trim();
  if (!evidence) { showFieldError('evidenceToChangeMind', 'Required.'); valid = false; }

  // Scroll to first error
  if (!valid) {
    var firstError = document.querySelector('.field-error:not(:empty)');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

function handleSaveEntry() {
  if (!validateForm()) return;

  var baseEst = document.getElementById('baseRateEstimate').value;

  var entry = {
    title: document.getElementById('entryTitle').value.trim(),
    claim: document.getElementById('entryClaim').value.trim(),
    category: document.getElementById('entryCategory').value,
    resolveBy: document.getElementById('resolveBy').value,
    forecastProbability: parseInt(document.getElementById('forecastProbability').value, 10),
    forecastConfidence: parseInt(document.getElementById('forecastConfidence').value, 10),
    assumptions: getDynamicRowValues('assumptions'),
    counterfactuals: getDynamicRowValues('counterfactuals'),
    baseRate: {
      estimate: baseEst !== '' ? parseInt(baseEst, 10) : null,
      reasoning: document.getElementById('baseRateReasoning').value.trim()
    },
    incentives: {
      stakeholders: document.getElementById('stakeholders').value.trim(),
      whoBenefitsIfWrong: document.getElementById('whoBenefitsIfWrong').value.trim()
    },
    evidenceToChangeMind: document.getElementById('evidenceToChangeMind').value.trim()
  };

  saveEntry(entry);
  clearForm();
  showToast('Decision saved.');
  switchTab('entries');
}

// ============================================
// Toast Notification
// ============================================

function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

// ============================================
// Entry List View
// ============================================

function renderEntryList() {
  var entries = getAllEntries();
  var searchTerm = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  var categoryFilter = document.getElementById('categoryFilter').value;
  var statusFilter = document.getElementById('statusFilter').value;

  var filtered = entries;

  // Status filter
  if (statusFilter === 'open') {
    filtered = filtered.filter(function(e) { return e.status === 'open' && !e.archived; });
  } else if (statusFilter === 'resolved') {
    filtered = filtered.filter(function(e) { return e.status === 'resolved' && !e.archived; });
  } else if (statusFilter === 'archived') {
    filtered = filtered.filter(function(e) { return e.archived; });
  } else {
    // "all" = non-archived
    filtered = filtered.filter(function(e) { return !e.archived; });
  }

  // Category filter
  if (categoryFilter) {
    filtered = filtered.filter(function(e) { return e.category === categoryFilter; });
  }

  // Search
  if (searchTerm) {
    filtered = filtered.filter(function(e) {
      return e.title.toLowerCase().indexOf(searchTerm) !== -1 ||
        e.claim.toLowerCase().indexOf(searchTerm) !== -1;
    });
  }

  var container = document.getElementById('entryListContent');

  if (filtered.length === 0) {
    var msg = entries.length === 0
      ? 'No decisions yet. Create your first one using the "+ New Entry" tab.'
      : 'No decisions match your filters.';
    container.innerHTML = '<p class="empty-state">' + msg + '</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var entry = filtered[i];
    var catObj = CONSTANTS.categories.find(function(c) { return c.value === entry.category; });
    var categoryLabel = catObj ? catObj.label : entry.category;
    var dueDate = formatDate(entry.resolveBy);
    var isOverdue = entry.status === 'open' && !entry.archived && new Date(entry.resolveBy + 'T23:59:59') < new Date();

    var statusBadge = '';
    if (entry.archived) {
      statusBadge = '<span class="badge badge-archived">Archived</span>';
    } else if (entry.status === 'resolved' && entry.resolution) {
      var outcomeObj = CONSTANTS.outcomes.find(function(o) { return o.value === entry.resolution.outcome; });
      var outcomeLabel = outcomeObj ? outcomeObj.label : '';
      statusBadge = '<span class="badge badge-resolved">' + outcomeLabel;
      if (entry.resolution.brierScore !== null) {
        statusBadge += ' \u00b7 Brier ' + entry.resolution.brierScore.toFixed(2);
      }
      statusBadge += '</span>';
    } else {
      statusBadge = '<span class="badge badge-open">Open</span>';
      if (isOverdue) {
        statusBadge += ' <span class="badge badge-overdue">Overdue</span>';
      }
    }

    html +=
      '<div class="entry-card" data-id="' + entry.id + '">' +
        '<div class="entry-card-header">' +
          '<h3 class="entry-card-title">' + escapeHtml(entry.title) + '</h3>' +
          '<div class="entry-card-badges">' + statusBadge + '</div>' +
        '</div>' +
        '<div class="entry-card-meta">' +
          '<span>' + categoryLabel + '</span>' +
          '<span class="meta-sep">\u00b7</span>' +
          '<span>Due ' + dueDate + '</span>' +
          '<span class="meta-sep">\u00b7</span>' +
          '<span>' + entry.forecastProbability + '% forecast</span>' +
        '</div>' +
        '<p class="entry-card-claim">' + escapeHtml(truncate(entry.claim, 120)) + '</p>' +
      '</div>';
  }

  container.innerHTML = html;

  container.querySelectorAll('.entry-card').forEach(function(card) {
    card.addEventListener('click', function() { showDetail(card.dataset.id); });
  });
}

// ============================================
// Detail View
// ============================================

function showDetail(id) {
  currentDetailId = id;
  var entry = getEntry(id);
  if (!entry) return;

  document.getElementById('entryDetail').classList.remove('hidden');
  document.getElementById('entryListContainer').classList.add('hidden');

  renderDetail(entry);
}

function hideDetail() {
  document.getElementById('entryDetail').classList.add('hidden');
  document.getElementById('entryListContainer').classList.remove('hidden');
  document.getElementById('resolveFormContainer').classList.add('hidden');
  currentDetailId = null;

  renderEntryList();
}

function renderDetail(entry) {
  var container = document.getElementById('entryDetailContent');
  var catObj = CONSTANTS.categories.find(function(c) { return c.value === entry.category; });
  var categoryLabel = catObj ? catObj.label : entry.category;
  var isOverdue = entry.status === 'open' && !entry.archived && new Date(entry.resolveBy + 'T23:59:59') < new Date();

  var statusBadge = '';
  if (entry.archived) {
    statusBadge = '<span class="badge badge-archived">Archived</span>';
  } else if (entry.status === 'resolved' && entry.resolution) {
    var outcomeObj = CONSTANTS.outcomes.find(function(o) { return o.value === entry.resolution.outcome; });
    statusBadge = '<span class="badge badge-resolved">' + (outcomeObj ? outcomeObj.label : '') + '</span>';
  } else {
    statusBadge = '<span class="badge badge-open">Open</span>';
    if (isOverdue) statusBadge += ' <span class="badge badge-overdue">Overdue</span>';
  }

  var html =
    '<div class="detail-header">' +
      '<h2>' + escapeHtml(entry.title) + '</h2>' +
      '<div>' + statusBadge + '</div>' +
    '</div>' +

    '<div class="detail-section">' +
      '<h4>Claim</h4>' +
      '<p>' + escapeHtml(entry.claim) + '</p>' +
    '</div>' +

    '<div class="detail-meta">' +
      '<div class="detail-meta-item"><span class="detail-meta-label">Category</span><span>' + categoryLabel + '</span></div>' +
      '<div class="detail-meta-item"><span class="detail-meta-label">Resolve by</span><span>' + formatDate(entry.resolveBy) + '</span></div>' +
      '<div class="detail-meta-item"><span class="detail-meta-label">Forecast</span><span>' + entry.forecastProbability + '% \u2014 ' + getProbabilityLabel(entry.forecastProbability) + '</span></div>' +
      '<div class="detail-meta-item"><span class="detail-meta-label">Confidence</span><span>' + entry.forecastConfidence + '% \u2014 ' + getConfidenceLabel(entry.forecastConfidence) + '</span></div>' +
    '</div>';

  // Base rate
  if (entry.baseRate && (entry.baseRate.estimate !== null || entry.baseRate.reasoning)) {
    html += '<div class="detail-section"><h4>Base Rate</h4>';
    if (entry.baseRate.estimate !== null) {
      html += '<p><strong>' + entry.baseRate.estimate + '%</strong>';
      if (entry.baseRate.reasoning) html += ' \u2014 ' + escapeHtml(entry.baseRate.reasoning);
      html += '</p>';
    } else if (entry.baseRate.reasoning) {
      html += '<p>' + escapeHtml(entry.baseRate.reasoning) + '</p>';
    }
    html += '</div>';
  }

  // Assumptions
  html += '<div class="detail-section"><h4>Assumptions</h4><ul>';
  for (var a = 0; a < entry.assumptions.length; a++) {
    html += '<li>' + escapeHtml(entry.assumptions[a]) + '</li>';
  }
  html += '</ul></div>';

  // Counterfactuals
  html += '<div class="detail-section"><h4>Failure Modes</h4><ul>';
  for (var c = 0; c < entry.counterfactuals.length; c++) {
    html += '<li>' + escapeHtml(entry.counterfactuals[c]) + '</li>';
  }
  html += '</ul></div>';

  // Incentives
  html += '<div class="detail-section"><h4>Incentives</h4>';
  html += '<p><strong>Stakeholders:</strong> ' + escapeHtml(entry.incentives.stakeholders) + '</p>';
  html += '<p><strong>Who benefits if I\'m wrong:</strong> ' + escapeHtml(entry.incentives.whoBenefitsIfWrong) + '</p>';
  html += '</div>';

  // Evidence
  html += '<div class="detail-section"><h4>What Would Change My Mind</h4>';
  html += '<p>' + escapeHtml(entry.evidenceToChangeMind) + '</p>';
  html += '</div>';

  // Resolution
  if (entry.status === 'resolved' && entry.resolution) {
    var rOutcome = CONSTANTS.outcomes.find(function(o) { return o.value === entry.resolution.outcome; });
    html += '<div class="detail-section detail-resolution"><h4>Resolution</h4>';
    html += '<p><strong>Outcome:</strong> ' + (rOutcome ? rOutcome.label : '') + '</p>';
    if (entry.resolution.brierScore !== null) {
      html += '<p><strong>Brier score:</strong> ' + entry.resolution.brierScore.toFixed(4) + '</p>';
    }
    if (entry.resolution.notes) {
      html += '<p><strong>Notes:</strong> ' + escapeHtml(entry.resolution.notes) + '</p>';
    }
    html += '<p class="detail-timestamp">Resolved ' + formatDateTime(entry.resolution.resolvedAt) + '</p>';
    html += '</div>';
  }

  // Timestamps
  html += '<div class="detail-timestamps">';
  html += '<span>Created ' + formatDateTime(entry.createdAt) + '</span>';
  if (entry.updatedAt !== entry.createdAt) {
    html += ' \u00b7 <span>Updated ' + formatDateTime(entry.updatedAt) + '</span>';
  }
  html += '</div>';

  container.innerHTML = html;

  // Action buttons
  var actionsContainer = document.getElementById('entryDetailActions');
  var actionsHtml = '';

  if (entry.status === 'open' && !entry.archived) {
    actionsHtml += '<button id="btnResolve" class="btn btn-primary">Resolve</button>';
  }

  if (entry.archived) {
    actionsHtml += '<button id="btnUnarchive" class="btn btn-secondary">Unarchive</button>';
  } else {
    actionsHtml += '<button id="btnArchive" class="btn btn-secondary">Archive</button>';
  }

  actionsContainer.innerHTML = actionsHtml;

  // Wire buttons
  var btnResolve = document.getElementById('btnResolve');
  if (btnResolve) {
    btnResolve.addEventListener('click', function() { showResolveForm(entry); });
  }

  var btnArchive = document.getElementById('btnArchive');
  if (btnArchive) {
    btnArchive.addEventListener('click', function() {
      if (confirm('Archive this decision? It will be hidden from the default list.')) {
        archiveEntry(entry.id);
        showToast('Decision archived.');
        hideDetail();
      }
    });
  }

  var btnUnarchive = document.getElementById('btnUnarchive');
  if (btnUnarchive) {
    btnUnarchive.addEventListener('click', function() {
      unarchiveEntry(entry.id);
      showToast('Decision unarchived.');
      renderDetail(getEntry(entry.id));
    });
  }
}

// ============================================
// Resolve Flow
// ============================================

function showResolveForm(entry) {
  var resolveContainer = document.getElementById('resolveFormContainer');
  resolveContainer.classList.remove('hidden');

  var html =
    '<div class="card resolve-form">' +
      '<h3>Resolve: ' + escapeHtml(entry.title) + '</h3>' +
      '<p class="resolve-reminder">Your forecast was <strong>' + entry.forecastProbability + '%</strong> (' + getProbabilityLabel(entry.forecastProbability) + ')</p>' +

      '<div class="form-group">' +
        '<label>Outcome</label>' +
        '<div class="outcome-options">';

  for (var i = 0; i < CONSTANTS.outcomes.length; i++) {
    var oc = CONSTANTS.outcomes[i];
    html +=
      '<label class="outcome-option">' +
        '<input type="radio" name="resolveOutcome" value="' + oc.value + '">' +
        '<span class="outcome-label">' + oc.label + '</span>' +
      '</label>';
  }

  html +=
        '</div>' +
        '<span class="field-error" id="resolveOutcome-error"></span>' +
      '</div>' +

      '<div class="form-group">' +
        '<label for="resolveNotes">Notes (optional)</label>' +
        '<textarea id="resolveNotes" rows="3" placeholder="What happened? What did you learn?"></textarea>' +
      '</div>' +

      '<div class="brier-preview hidden" id="brierPreview"></div>' +

      '<div class="resolve-actions">' +
        '<button id="confirmResolve" class="btn btn-primary">Confirm Resolution</button>' +
        '<button id="cancelResolve" class="btn btn-secondary">Cancel</button>' +
      '</div>' +
    '</div>';

  resolveContainer.innerHTML = html;

  // Scroll to resolve form
  resolveContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Live Brier preview
  var radios = resolveContainer.querySelectorAll('input[name="resolveOutcome"]');
  radios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      var outcome = radio.value;
      var preview = document.getElementById('brierPreview');

      if (outcome === 'occurred' || outcome === 'did_not_occur') {
        var score = computeBrierScore(entry.forecastProbability, outcome);
        preview.innerHTML = '<strong>Brier score:</strong> ' + score.toFixed(4) +
          ' <span class="brier-hint">(0 = perfect, 1 = maximally wrong)</span>';
        preview.classList.remove('hidden');
      } else {
        preview.innerHTML = '<em>No Brier score for partial/unknown outcomes.</em>';
        preview.classList.remove('hidden');
      }
    });
  });

  // Confirm
  document.getElementById('confirmResolve').addEventListener('click', function() {
    var selected = resolveContainer.querySelector('input[name="resolveOutcome"]:checked');
    if (!selected) {
      document.getElementById('resolveOutcome-error').textContent = 'Select an outcome.';
      return;
    }

    var notes = document.getElementById('resolveNotes').value.trim();
    resolveEntry(entry.id, selected.value, notes);

    resolveContainer.classList.add('hidden');
    showToast('Decision resolved.');
    renderDetail(getEntry(entry.id));
  });

  // Cancel
  document.getElementById('cancelResolve').addEventListener('click', function() {
    resolveContainer.classList.add('hidden');
  });
}

// ============================================
// Analytics View
// ============================================

function renderAnalytics() {
  var entries = getAllEntries();
  var stats = getSummaryStats(entries);
  var bins = getCalibrationBins(entries);
  var notable = getNotableDecisions(entries);

  // Summary stats
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statResolved').textContent = stats.resolved;
  document.getElementById('statAvgBrier').textContent = stats.avgBrier !== null ? stats.avgBrier.toFixed(2) : '\u2014';
  document.getElementById('statBinaryCount').textContent = stats.binaryResolved;

  // Calibration table
  var tableBody = document.getElementById('calibrationTableBody');
  var tableHtml = '';

  for (var i = 0; i < bins.length; i++) {
    var bin = bins[i];
    var gapClass = '';
    if (bin.gap !== null && bin.gap > 5) gapClass = 'gap-over';
    else if (bin.gap !== null && bin.gap < -5) gapClass = 'gap-under';

    tableHtml +=
      '<tr>' +
        '<td>' + bin.label + '</td>' +
        '<td>' + bin.count + '</td>' +
        '<td>' + (bin.avgForecast !== null ? Math.round(bin.avgForecast) + '%' : '\u2014') + '</td>' +
        '<td>' + (bin.hitRate !== null ? Math.round(bin.hitRate) + '%' : '\u2014') + '</td>' +
        '<td class="' + gapClass + '">' + (bin.gap !== null ? (bin.gap > 0 ? '+' : '') + Math.round(bin.gap) + '%' : '\u2014') + '</td>' +
      '</tr>';
  }
  tableBody.innerHTML = tableHtml;

  // Chart and notable: require >= 5 binary resolved
  var notableContainer = document.getElementById('notableDecisions');

  if (stats.binaryResolved < 5) {
    notableContainer.innerHTML =
      '<p class="empty-state analytics-empty">Resolve at least 5 binary decisions (Occurred / Did Not Occur) to see calibration data. You have ' + stats.binaryResolved + '.</p>';
    document.getElementById('calibrationChartContainer').classList.add('hidden');
    document.getElementById('calibrationTableContainer').classList.add('hidden');
  } else {
    document.getElementById('calibrationChartContainer').classList.remove('hidden');
    document.getElementById('calibrationTableContainer').classList.remove('hidden');

    var notableHtml = '';

    if (notable.highestConfidenceWrong) {
      var hw = notable.highestConfidenceWrong;
      notableHtml +=
        '<div class="card notable-card notable-wrong">' +
          '<h4>Highest confidence, wrong</h4>' +
          '<p class="notable-title">' + escapeHtml(hw.title) + '</p>' +
          '<p>' + hw.forecastProbability + '% forecast \u00b7 Did not occur \u00b7 Brier ' + hw.resolution.brierScore.toFixed(2) + '</p>' +
        '</div>';
    }

    if (notable.lowestConfidenceRight) {
      var lr = notable.lowestConfidenceRight;
      notableHtml +=
        '<div class="card notable-card notable-right">' +
          '<h4>Lowest confidence, right</h4>' +
          '<p class="notable-title">' + escapeHtml(lr.title) + '</p>' +
          '<p>' + lr.forecastProbability + '% forecast \u00b7 Occurred \u00b7 Brier ' + lr.resolution.brierScore.toFixed(2) + '</p>' +
        '</div>';
    }

    if (!notableHtml) {
      notableHtml = '<p class="empty-state">Need both right and wrong outcomes to show notable decisions.</p>';
    }

    notableContainer.innerHTML = notableHtml;
    updateCalibrationChart(bins);
  }
}

// ============================================
// Tooltips
// ============================================

function initTooltips() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('tooltip-trigger')) {
      e.preventDefault();
      e.stopPropagation();
      showTooltipPopup(e.target);
    }
  });
}

function showTooltipPopup(trigger) {
  hideAllTooltips();

  var key = trigger.dataset.glossary;
  if (!key || !CONSTANTS.glossary[key]) return;

  var entry = CONSTANTS.glossary[key];
  var content = '<strong>' + entry.term + '</strong><br>' + entry.definition;
  if (entry.example) content += '<br><em>' + entry.example + '</em>';

  var tooltip = document.createElement('div');
  tooltip.className = 'tooltip-popup';
  tooltip.innerHTML = content;
  document.body.appendChild(tooltip);

  var rect = trigger.getBoundingClientRect();
  var tooltipRect = tooltip.getBoundingClientRect();

  var top = rect.bottom + 8;
  var left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
  if (top + tooltipRect.height > window.innerHeight - 10) top = rect.top - tooltipRect.height - 8;

  tooltip.style.top = (top + window.scrollY) + 'px';
  tooltip.style.left = left + 'px';

  setTimeout(function() {
    document.addEventListener('click', hideAllTooltips, { once: true });
  }, 10);
}

function hideAllTooltips() {
  document.querySelectorAll('.tooltip-popup').forEach(function(t) { t.remove(); });
}

// ============================================
// Helpers
// ============================================

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '\u2026';
}

function formatDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(isoString) {
  var d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ============================================
// App Initialization
// ============================================

function initApp() {
  initStore();
  initForm();
  initTooltips();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });

  // Back button
  document.getElementById('btnBack').addEventListener('click', hideDetail);

  // Search & filters
  var debouncedRender = debounce(renderEntryList, 200);
  document.getElementById('searchInput').addEventListener('input', debouncedRender);
  document.getElementById('categoryFilter').addEventListener('change', renderEntryList);
  document.getElementById('statusFilter').addEventListener('change', renderEntryList);

  // Set up default rows
  clearForm();

  // Default to new-entry tab
  switchTab('new-entry');
}

document.addEventListener('DOMContentLoaded', initApp);
