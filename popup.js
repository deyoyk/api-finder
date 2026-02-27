var captures = [];
var settings = {};
var renderedList = [];

function getHost(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatJson(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return esc(String(obj));
  try { return esc(JSON.stringify(obj, null, 2)); } catch (e) { return esc(String(obj)); }
}

function formatHeaders(headers) {
  if (!headers || typeof headers !== 'object') return '';
  return Object.keys(headers).map(function (k) { return esc(k) + ': ' + esc(headers[k]); }).join('\n');
}

function buildDetailHtml(c) {
  var reqBody = c.requestBody != null ? (typeof c.requestBody === 'object' ? JSON.stringify(c.requestBody, null, 2) : c.requestBodyRaw || String(c.requestBody)) : (c.requestBodyRaw || '');
  var resBody = c.responseBody != null ? (typeof c.responseBody === 'object' ? JSON.stringify(c.responseBody, null, 2) : c.responseBodyRaw || String(c.responseBody)) : (c.responseBodyRaw || '');
  var html = '<section><h4>Request headers</h4><pre>' + formatHeaders(c.requestHeaders) + '</pre></section>';
  if (reqBody) html += '<section><h4>Request body</h4><pre>' + formatJson(reqBody) + '</pre></section>';
  html += '<section><h4>Response ' + esc(c.responseStatus) + ' ' + esc(c.responseStatusText || '') + '</h4><pre>' + formatHeaders(c.responseHeaders) + '</pre></section>';
  if (resBody) html += '<section><h4>Response body</h4><pre>' + formatJson(resBody) + '</pre></section>';
  if (c.cookies && c.cookies.length) {
    html += '<section><h4>Cookies</h4>';
    c.cookies.forEach(function (ck) {
      html += '<div class="keyval"><strong>' + esc(ck.name) + '</strong> ' + esc(ck.value) + ' <span style="color:var(--muted)">' + esc(ck.domain) + esc(ck.path) + '</span></div>';
    });
    html += '</section>';
  }
  return html;
}

function render() {
  var filterInput = document.getElementById('filter');
  var filter = (filterInput && filterInput.value || '').toLowerCase();
  var list = captures;
  if (filter) {
    list = list.filter(function (c) {
      return (c.url || '').toLowerCase().indexOf(filter) >= 0 ||
             (c.method || '').toLowerCase().indexOf(filter) >= 0 ||
             (getHost(c.url) || '').toLowerCase().indexOf(filter) >= 0;
    });
  }
  var container = document.getElementById('list');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty">No captures yet. Browse a site that uses JSON APIs.</div>';
    renderedList = [];
    return;
  }
  var slice = list.slice(-50).reverse();
  renderedList = slice;
  container.innerHTML = slice.map(function (c, idx) {
    var url = (c.url || '').replace(/^https?:\/\//, '');
    var method = (c.method || 'GET').toUpperCase();
    var status = c.responseStatus != null ? c.responseStatus : '-';
    return '<div class="list-item list-item-expanded" data-index="' + idx + '">' +
      '<div class="list-item-summary">' +
      '<span class="method">' + esc(method) + '</span>' +
      '<span class="url" title="' + esc(c.url) + '">' + esc(url) + '</span>' +
      '<span class="status">' + esc(status) + '</span>' +
      '<span class="toggle">▼</span>' +
      '</div>' +
      '<div class="list-item-detail" style="display:none;"></div>' +
      '</div>';
  }).join('');
  container.querySelectorAll('.list-item').forEach(function (el) {
    var summary = el.querySelector('.list-item-summary');
    var detail = el.querySelector('.list-item-detail');
    var toggle = el.querySelector('.toggle');
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(el.getAttribute('data-index'), 10);
      var c = renderedList[idx];
      if (!c) return;
      if (detail.style.display === 'none') {
        detail.innerHTML = buildDetailHtml(c);
        detail.style.display = 'block';
        if (toggle) toggle.textContent = '▲';
      } else {
        detail.style.display = 'none';
        detail.innerHTML = '';
        if (toggle) toggle.textContent = '▼';
      }
    });
  });
}

function updateCount() {
  var n = captures.length;
  var countEl = document.getElementById('count');
  if (countEl) countEl.textContent = n;
}

function load() {
  chrome.runtime.sendMessage({ type: 'API_FINDER_GET' }, function (res) {
    if (chrome.runtime.lastError) return;
    captures = (res && res.captures) || [];
    updateCount();
    render();
  });
  chrome.runtime.sendMessage({ type: 'API_FINDER_GET_SETTINGS' }, function (res) {
    if (chrome.runtime.lastError) return;
    settings = (res && res.settings) || {};
    updateCount();
  });
}

function init() {
  var filterEl = document.getElementById('filter');
  if (filterEl) filterEl.addEventListener('input', render);

  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'API_FINDER_EXPORT' }, function (res) {
        if (chrome.runtime.lastError) return;
        var list = (res && res.captures) || [];
        var fmt = (res && res.exportFormat) || 'yml';
        var content = fmt === 'json' ? exportToJson(list) : exportToYaml(list);
        var ext = fmt === 'json' ? 'json' : 'yml';
        var mime = fmt === 'json' ? 'application/json' : 'application/x-yaml';
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var name = 'api-captures-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.' + ext;
        chrome.downloads.download({ url: url, filename: name, saveAs: true }, function () {
          try { URL.revokeObjectURL(url); } catch (err) {}
        });
      });
    });
  }

  var clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'API_FINDER_CLEAR' }, function () {
        if (chrome.runtime.lastError) return;
        captures = [];
        load();
      });
    });
  }

  load();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
