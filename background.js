const STORAGE_KEY = 'api_finder_captures';
const SETTINGS_KEY = 'api_finder_settings';
const DEFAULT_MAX = 2000;

function getOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin;
  } catch (e) {
    return url;
  }
}

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

function updateBadge() {
  chrome.storage.local.get(STORAGE_KEY, function (data) {
    const list = data[STORAGE_KEY] || [];
    const n = list.length;
    chrome.action.setBadgeText({ text: n > 0 ? String(n) : '' });
    chrome.action.setBadgeBackgroundColor({ color: n > 0 ? '#6366f1' : '#71717a' });
  });
}

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes[STORAGE_KEY]) updateBadge();
});

chrome.runtime.onInstalled.addListener(function () {
  updateBadge();
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type !== 'API_FINDER_SAVE') return;
  const payload = msg.payload || {};
  const url = payload.url;
  if (!url) return;
  chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], function (data) {
    const settings = data[SETTINGS_KEY] || {};
    if (settings.enabled === false || settings.paused === true) {
      sendResponse({ ok: false });
      return;
    }
    const host = getHost(url);
    const exclude = (settings.excludeDomains || []);
    for (var i = 0; i < exclude.length; i++) {
      if (host === exclude[i] || host.endsWith('.' + exclude[i])) {
        sendResponse({ ok: false });
        return;
      }
    }
    const origin = getOrigin(url);
    chrome.cookies.getAll({ url: origin }, function (cookies) {
      const capture = {
        ...payload,
        cookies: (cookies || []).map(function (c) {
          return {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite
          };
        }),
        tabId: sender.tab ? sender.tab.id : null,
        tabUrl: sender.tab ? sender.tab.url : null
      };
      let list = data[STORAGE_KEY] || [];
      list.push(capture);
      const max = Math.max(100, Math.min(10000, settings.maxCaptures || DEFAULT_MAX));
      if (list.length > max) list = list.slice(-max);
      chrome.storage.local.set({ [STORAGE_KEY]: list }, function () {
        updateBadge();
        sendResponse({ ok: true });
      });
    });
  });
  return true;
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'API_FINDER_GET') {
    chrome.storage.local.get(STORAGE_KEY, function (data) {
      sendResponse({ captures: data[STORAGE_KEY] || [] });
    });
    return true;
  }
  if (msg.type === 'API_FINDER_GET_SETTINGS') {
    chrome.storage.local.get(SETTINGS_KEY, function (data) {
      sendResponse({ settings: data[SETTINGS_KEY] || {} });
    });
    return true;
  }
  if (msg.type === 'API_FINDER_UPDATE_SETTINGS') {
    var upd = msg.settings || {};
    chrome.storage.local.get(SETTINGS_KEY, function (data) {
      var s = data[SETTINGS_KEY] || {};
      if ('paused' in upd) s.paused = upd.paused;
      if ('enabled' in upd) s.enabled = upd.enabled;
      chrome.storage.local.set({ [SETTINGS_KEY]: s }, function () {
        sendResponse({ ok: true });
      });
    });
    return true;
  }
  if (msg.type === 'API_FINDER_CLEAR') {
    chrome.storage.local.set({ [STORAGE_KEY]: [] }, function () {
      updateBadge();
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'API_FINDER_CLEAR_DOMAIN') {
    var domain = (msg.domain || '').toLowerCase();
    chrome.storage.local.get(STORAGE_KEY, function (data) {
      var list = (data[STORAGE_KEY] || []).filter(function (c) {
        try { return getHost(c.url) !== domain && !getHost(c.url).endsWith('.' + domain); } catch (e) { return true; }
      });
      chrome.storage.local.set({ [STORAGE_KEY]: list }, function () {
        updateBadge();
        sendResponse({ ok: true, remaining: list.length });
      });
    });
    return true;
  }
  if (msg.type === 'API_FINDER_EXPORT') {
    chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], function (data) {
      var captures = data[STORAGE_KEY] || [];
      var settings = data[SETTINGS_KEY] || {};
      sendResponse({ captures: captures, exportFormat: settings.exportFormat || 'yml' });
    });
    return true;
  }
});
