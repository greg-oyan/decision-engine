/**
 * Decision Friction Engine - Store Module
 * LocalStorage CRUD operations with schema versioning.
 */

/**
 * Generate a unique, sortable ID
 */
function generateId() {
  var hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return 'df_' + Date.now() + '_' + hex;
}

/**
 * Initialize or load the store from LocalStorage
 */
function initStore() {
  var raw = localStorage.getItem(CONSTANTS.storageKey);
  if (!raw) {
    var initial = { schemaVersion: CONSTANTS.schemaVersion, entries: [] };
    localStorage.setItem(CONSTANTS.storageKey, JSON.stringify(initial));
    return initial;
  }

  var data = JSON.parse(raw);

  if (data.schemaVersion < CONSTANTS.schemaVersion) {
    migrateSchema(data);
  }

  return data;
}

/**
 * Schema migration stub. Add migration logic here when schemaVersion increments.
 */
function migrateSchema(data) {
  // Example future migration:
  // if (data.schemaVersion === 1) {
  //   data.entries.forEach(e => { e.newField = defaultValue; });
  //   data.schemaVersion = 2;
  // }
  persistStore(data);
}

/**
 * Write store to LocalStorage
 */
function persistStore(data) {
  localStorage.setItem(CONSTANTS.storageKey, JSON.stringify(data));
}

/**
 * Get all entries (returns a copy)
 */
function getAllEntries() {
  var data = initStore();
  return data.entries;
}

/**
 * Get a single entry by ID
 */
function getEntry(id) {
  var entries = getAllEntries();
  return entries.find(function(e) { return e.id === id; }) || null;
}

/**
 * Save a new entry. Stamps id, timestamps, status, archived flag.
 * Returns the saved entry.
 */
function saveEntry(entry) {
  var data = initStore();
  var now = new Date().toISOString();

  entry.id = generateId();
  entry.createdAt = now;
  entry.updatedAt = now;
  entry.status = 'open';
  entry.archived = false;
  entry.resolution = null;

  data.entries.unshift(entry);
  persistStore(data);
  return entry;
}

/**
 * Update fields on an existing entry (shallow merge).
 */
function updateEntry(id, updates) {
  var data = initStore();
  var index = data.entries.findIndex(function(e) { return e.id === id; });
  if (index === -1) return null;

  var entry = data.entries[index];
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) {
      entry[key] = updates[key];
    }
  }
  entry.updatedAt = new Date().toISOString();

  persistStore(data);
  return entry;
}

/**
 * Resolve an entry. Computes Brier score for binary outcomes.
 */
function resolveEntry(id, outcome, notes) {
  var data = initStore();
  var index = data.entries.findIndex(function(e) { return e.id === id; });
  if (index === -1) return null;

  var entry = data.entries[index];
  var brierScore = null;

  if (outcome === 'occurred' || outcome === 'did_not_occur') {
    var actual = outcome === 'occurred' ? 1 : 0;
    var forecast = entry.forecastProbability / 100;
    brierScore = Math.pow(forecast - actual, 2);
  }

  entry.status = 'resolved';
  entry.updatedAt = new Date().toISOString();
  entry.resolution = {
    outcome: outcome,
    notes: notes || '',
    resolvedAt: new Date().toISOString(),
    brierScore: brierScore
  };

  persistStore(data);
  return entry;
}

/**
 * Archive an entry (soft delete)
 */
function archiveEntry(id) {
  return updateEntry(id, { archived: true });
}

/**
 * Unarchive an entry
 */
function unarchiveEntry(id) {
  return updateEntry(id, { archived: false });
}
