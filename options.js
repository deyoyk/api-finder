const SETTINGS_KEY = 'api_finder_settings';
const DEFAULTS = { enabled: true, paused: false, maxCaptures: 2000, excludeDomains: [], exportFormat: 'yml' };

function load() {
  chrome.storage.local.get(SETTINGS_KEY, function (data) {
    const s = data[SETTINGS_KEY] || DEFAULTS;
    document.getElementById('enabled').checked = s.enabled !== false;
    document.getElementById('maxCaptures').value = s.maxCaptures || DEFAULTS.maxCaptures;
    document.getElementById('excludeDomains').value = (s.excludeDomains || []).join('\n');
    const fmt = s.exportFormat || 'yml';
    document.getElementById('fmtYml').checked = fmt === 'yml';
    document.getElementById('fmtJson').checked = fmt === 'json';
  });
}

function save() {
  const excludeRaw = document.getElementById('excludeDomains').value.trim();
  const excludeDomains = excludeRaw ? excludeRaw.split(/\n/).map(function (d) { return d.trim().toLowerCase(); }).filter(Boolean);
  const settings = {
    enabled: document.getElementById('enabled').checked,
    maxCaptures: Math.max(100, Math.min(10000, parseInt(document.getElementById('maxCaptures').value, 10) || 2000)),
    excludeDomains: excludeDomains,
    exportFormat: document.querySelector('input[name="exportFormat"]:checked').value
  };
  chrome.storage.local.set({ [SETTINGS_KEY]: settings }, function () {
    var el = document.getElementById('saveStatus');
    el.textContent = 'Settings saved.';
    setTimeout(function () { el.textContent = ''; }, 2000);
  });
}

document.getElementById('save').addEventListener('click', save);
load();
