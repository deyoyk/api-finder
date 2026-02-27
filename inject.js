(function () {
  function toAbsoluteUrl(url) {
    if (!url) return url;
    try {
      return new URL(url, window.location.origin).href;
    } catch (e) {
      return url;
    }
  }
  function send(payload) {
    try {
      window.postMessage({ type: 'API_FINDER_CAPTURE', payload }, '*');
    } catch (e) {}
  }
  function tryJson(text) {
    try {
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return text;
    }
  }
  function objectFromHeaders(h) {
    if (!h) return {};
    const o = {};
    if (h.forEach) {
      h.forEach((v, k) => { o[k] = v; });
    } else if (h.entries) {
      for (const [k, v] of h.entries()) o[k] = v;
    }
    return o;
  }
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = toAbsoluteUrl(typeof input === 'string' ? input : (input && input.url) || '');
    const method = (init && init.method) || 'GET';
    const reqHeaders = (init && init.headers) ? (init.headers instanceof Headers ? objectFromHeaders(init.headers) : (init.headers instanceof Object && !(init.headers instanceof Headers) ? { ...init.headers } : {})) : {};
    let reqBody = (init && init.body) != null ? init.body : null;
    let reqBodyStr = null;
    if (reqBody != null) {
      if (typeof reqBody === 'string') reqBodyStr = reqBody;
      else if (reqBody instanceof Blob || reqBody instanceof ArrayBuffer) reqBodyStr = '[binary]';
      else try { reqBodyStr = JSON.stringify(reqBody); } catch (e) { reqBodyStr = String(reqBody); }
    }
    return origFetch.apply(this, arguments).then(function (response) {
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.indexOf('json') !== -1;
      const clone = response.clone();
      clone.text().then(function (text) {
        const resBody = isJson ? tryJson(text) : text;
        send({
          url,
          method,
          requestHeaders: reqHeaders,
          requestBody: reqBodyStr != null ? tryJson(reqBodyStr) : null,
          requestBodyRaw: reqBodyStr,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseHeaders: objectFromHeaders(response.headers),
          responseBody: resBody,
          responseBodyRaw: text,
          timestamp: new Date().toISOString()
        });
      }).catch(function () {
        send({
          url,
          method,
          requestHeaders: reqHeaders,
          requestBody: reqBodyStr != null ? tryJson(reqBodyStr) : null,
          requestBodyRaw: reqBodyStr,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseHeaders: objectFromHeaders(response.headers),
          responseBody: null,
          responseBodyRaw: null,
          timestamp: new Date().toISOString()
        });
      });
      return response;
    });
  };
  const XHR = window.XMLHttpRequest;
  if (XHR) {
    window.XMLHttpRequest = function () {
      const xhr = new XHR();
      let reqHeaders = {};
      let reqBody = null;
      let reqUrl = '';
      let reqMethod = '';
      const open = xhr.open;
      xhr.open = function (method, url) {
        reqMethod = method;
        reqUrl = toAbsoluteUrl(url);
        return open.apply(this, arguments);
      };
      const setHeader = xhr.setRequestHeader;
      xhr.setRequestHeader = function (name, value) {
        reqHeaders[name] = value;
        return setHeader.apply(this, arguments);
      };
      const sendFn = xhr.send;
      xhr.send = function (body) {
        reqBody = body != null ? (typeof body === 'string' ? body : '[binary]') : null;
        xhr.addEventListener('load', function () {
          const contentType = xhr.getResponseHeader('content-type') || '';
          const isJson = contentType.indexOf('json') !== -1;
          const text = xhr.responseText;
          const resBody = isJson ? tryJson(text) : text;
          const resHeaders = {};
          const all = xhr.getAllResponseHeaders();
          if (all) {
            all.split('\r\n').forEach(function (line) {
              const i = line.indexOf(':');
              if (i > 0) resHeaders[line.slice(0, i).trim()] = line.slice(i + 1).trim();
            });
          }
          send({
            url: reqUrl,
            method: reqMethod,
            requestHeaders: reqHeaders,
            requestBody: reqBody != null ? tryJson(reqBody) : null,
            requestBodyRaw: reqBody,
            responseStatus: xhr.status,
            responseStatusText: xhr.statusText,
            responseHeaders: resHeaders,
            responseBody: resBody,
            responseBodyRaw: text,
            timestamp: new Date().toISOString()
          });
        });
        return sendFn.apply(this, arguments);
      };
      return xhr;
    };
  }
})();
