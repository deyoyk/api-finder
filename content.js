const API_FINDER_TYPE = 'API_FINDER_CAPTURE';

function injectCaptureScript() {
  try {
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    s.onload = function () { try { this.remove(); } catch (e) {} };
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
}

try { injectCaptureScript(); } catch (e) {}

window.addEventListener('message', function (event) {
  try {
    if (event.source !== window || !event.data || event.data.type !== API_FINDER_TYPE) return;
    var payload = event.data.payload;
    if (!payload || !payload.url) return;
    var contentType = (payload.responseHeaders && payload.responseHeaders['content-type']) || '';
    var isJson = contentType.indexOf('json') !== -1;
    if (!isJson && typeof payload.responseBody !== 'object') return;
    chrome.runtime.sendMessage({ type: 'API_FINDER_SAVE', payload }).catch(function () {});
  } catch (e) {}
});
