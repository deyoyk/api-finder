function escapeYamlString(s) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (str.indexOf('\n') >= 0 || str.indexOf(':') >= 0 || str.indexOf('#') >= 0 || str.indexOf('"') >= 0 || str.indexOf("'") >= 0 || str === '' || /^[\s-\[\]{}&*!|>'"%@`]/.test(str) || str === 'true' || str === 'false' || !isNaN(Number(str))) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
  }
  return str;
}

function toYamlValue(val, indent) {
  const pre = '  '.repeat(indent);
  if (val === null || val === undefined) return pre + 'null';
  if (typeof val === 'boolean') return pre + (val ? 'true' : 'false');
  if (typeof val === 'number') return pre + String(val);
  if (typeof val === 'string') return pre + escapeYamlString(val);
  if (Array.isArray(val)) {
    const lines = val.map(function (item) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return pre + '- ' + toYamlValue(item, 0).trim().replace(/^\- /, '');
      }
      return pre + '- ' + (toYamlValue(item, 0).trim());
    });
    return lines.join('\n');
  }
  if (typeof val === 'object') {
    const lines = [];
    for (const k in val) {
      if (!Object.prototype.hasOwnProperty.call(val, k)) continue;
      const v = val[k];
      if (v === null || v === undefined) continue;
      const key = escapeYamlString(k);
      if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
        lines.push(pre + key + ':');
        lines.push(toYamlValue(v, indent + 1));
      } else if (Array.isArray(v)) {
        lines.push(pre + key + ':');
        lines.push(toYamlValue(v, indent + 1));
      } else {
        lines.push(pre + key + ': ' + (typeof v === 'string' ? escapeYamlString(v) : toYamlValue(v, 0).trim()));
      }
    }
    return lines.join('\n');
  }
  return pre + escapeYamlString(String(val));
}

function captureToYamlObject(c) {
  const o = {
    url: c.url,
    method: c.method || 'GET',
    timestamp: c.timestamp,
    tab_url: c.tabUrl,
    request: {
      headers: c.requestHeaders || {},
      body: c.requestBody,
      body_raw: c.requestBodyRaw
    },
    response: {
      status: c.responseStatus,
      status_text: c.responseStatusText,
      headers: c.responseHeaders || {},
      body: c.responseBody,
      body_raw: c.responseBodyRaw
    },
    cookies: (c.cookies || []).map(function (ck) {
      return {
        name: ck.name,
        value: ck.value,
        domain: ck.domain,
        path: ck.path,
        secure: ck.secure,
        http_only: ck.httpOnly,
        same_site: ck.sameSite
      };
    })
  };
  return o;
}

function exportToYaml(captures) {
  const list = (captures || []).map(captureToYamlObject);
  const out = ['captures:'];
  list.forEach(function (item, i) {
    out.push('\n  - url: ' + escapeYamlString(item.url));
    out.push('    method: ' + (item.method || 'GET'));
    out.push('    timestamp: ' + escapeYamlString(item.timestamp || ''));
    if (item.tab_url) out.push('    tab_url: ' + escapeYamlString(item.tab_url));
    out.push('    request:');
    out.push('      headers:');
    Object.keys(item.request.headers || {}).forEach(function (k) {
      out.push('        ' + escapeYamlString(k) + ': ' + escapeYamlString(item.request.headers[k]));
    });
    if (item.request.body != null) out.push('      body: ' + (typeof item.request.body === 'object' ? escapeYamlString(JSON.stringify(item.request.body)) : escapeYamlString(item.request.body)));
    if (item.request.body_raw != null) out.push('      body_raw: ' + escapeYamlString(String(item.request.body_raw).slice(0, 5000)));
    out.push('    response:');
    out.push('      status: ' + (item.response.status ?? ''));
    out.push('      status_text: ' + escapeYamlString(item.response.status_text || ''));
    out.push('      headers:');
    Object.keys(item.response.headers || {}).forEach(function (k) {
      out.push('        ' + escapeYamlString(k) + ': ' + escapeYamlString(item.response.headers[k]));
    });
    if (item.response.body != null) {
      const rb = item.response.body;
      out.push('      body: ' + (typeof rb === 'object' ? escapeYamlString(JSON.stringify(rb).slice(0, 10000)) : escapeYamlString(String(rb).slice(0, 10000))));
    }
    if (item.response.body_raw != null) out.push('      body_raw: ' + escapeYamlString(String(item.response.body_raw).slice(0, 5000)));
    out.push('    cookies:');
    (item.cookies || []).forEach(function (ck) {
      out.push('      - name: ' + escapeYamlString(ck.name));
      out.push('        value: ' + escapeYamlString(ck.value));
      out.push('        domain: ' + escapeYamlString(ck.domain));
      out.push('        path: ' + escapeYamlString(ck.path));
    });
  });
  return out.join('\n');
}

function exportToJson(captures) {
  var list = (captures || []).map(captureToYamlObject);
  return JSON.stringify({ captures: list }, null, 2);
}

function dedupeCaptures(captures) {
  var seen = {};
  return (captures || []).filter(function (c) {
    var key = (c.url || '') + '\n' + (c.method || 'GET') + '\n' + (typeof c.requestBody === 'object' ? JSON.stringify(c.requestBody) : (c.requestBodyRaw || ''));
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
