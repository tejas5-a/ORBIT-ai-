(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.pathGuard = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RESERVED = {
    CON: 1, PRN: 1, AUX: 1, NUL: 1,
    COM1: 1, COM2: 1, COM3: 1, COM4: 1, COM5: 1, COM6: 1, COM7: 1, COM8: 1, COM9: 1,
    LPT1: 1, LPT2: 1, LPT3: 1, LPT4: 1, LPT5: 1, LPT6: 1, LPT7: 1, LPT8: 1, LPT9: 1
  };

  function fail(reason) {
    return { ok: false, reason: reason };
  }

  function classify(input) {
    if (typeof input !== 'string' || input.length === 0) return 'invalid';
    if (input.indexOf('\0') !== -1) return 'invalid';
    if (input.length > 4096) return 'invalid';
    if (input.slice(0, 2) === '\\\\' || input.slice(0, 2) === '//') return 'unc';
    if (/^[A-Za-z]:[\\/]/.test(input)) return 'windows';
    if (input.charAt(0) === '/') return 'posix';
    if (input.charAt(0) === '\\') return 'drive-relative';
    return 'relative';
  }

  function isReservedSegment(segment) {
    var base = segment.split('.')[0].toUpperCase();
    return !!RESERVED[base];
  }

  function windowsSegmentError(segment) {
    if (!segment) return 'empty-segment';
    if (/[\x00-\x1f<>:"|?*]/.test(segment)) return 'illegal-char';
    var last = segment.charAt(segment.length - 1);
    if (last === '.' || last === ' ') return 'illegal-trailing';
    if (isReservedSegment(segment)) return 'reserved-name';
    return '';
  }

  function walk(segments, style, prefix) {
    var stack = [];
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
        if (!stack.length) return fail('escapes-root');
        stack.pop();
        continue;
      }
      if (style === 'windows') {
        var problem = windowsSegmentError(seg);
        if (problem) return fail(problem);
      } else if (seg.indexOf('\0') !== -1) {
        return fail('null-byte');
      }
      stack.push(seg);
    }
    return { ok: true, style: style, prefix: prefix, parts: stack };
  }

  function parseAbsolute(input) {
    var kind = classify(input);
    if (kind === 'invalid') return fail(input && input.indexOf('\0') !== -1 ? 'null-byte' : 'invalid-path');
    if (kind === 'relative') return fail('not-absolute');
    if (kind === 'drive-relative') return fail('drive-relative-rejected');
    if (kind === 'unc') {
      var unc = input.replace(/\//g, '\\');
      var bits = unc.slice(2).split('\\');
      if (!bits[0] || !bits[1]) return fail('bad-unc');
      return walk(bits.slice(2), 'windows', '\\\\' + bits[0].toUpperCase() + '\\' + bits[1].toUpperCase());
    }
    if (kind === 'windows') {
      var win = input.replace(/\//g, '\\');
      var match = /^([A-Za-z]):\\?(.*)$/.exec(win);
      if (!match) return fail('not-absolute');
      var rest = match[2] ? match[2].split('\\') : [];
      return walk(rest, 'windows', match[1].toUpperCase() + ':');
    }
    return walk(input.split('/'), 'posix', '');
  }

  function joinRoot(rootNorm, relative) {
    var rel = String(relative);
    if (rootNorm.style === 'windows') {
      rel = rel.replace(/\//g, '\\').replace(/^\\+/, '');
      var base = rootNorm.prefix + '\\' + rootNorm.parts.join('\\');
      if (!rootNorm.parts.length) base = rootNorm.prefix + '\\';
      if (!rel) return base;
      if (base.charAt(base.length - 1) === '\\') return base + rel;
      return base + '\\' + rel;
    }
    rel = rel.replace(/^\/+/, '');
    var posix = '/' + rootNorm.parts.join('/');
    if (!rel) return posix;
    if (posix === '/') return '/' + rel;
    return posix + '/' + rel;
  }

  function sameSegment(a, b, style) {
    if (style === 'windows') return a.toUpperCase() === b.toUpperCase();
    return a === b;
  }

  function isContainedPath(root, candidate) {
    if (typeof root !== 'string' || root.indexOf('\0') !== -1) return fail('null-byte');
    if (typeof candidate !== 'string' || candidate.indexOf('\0') !== -1) return fail('null-byte');
    var rootKind = classify(root);
    if (rootKind !== 'windows' && rootKind !== 'unc' && rootKind !== 'posix') {
      return fail(rootKind === 'invalid' ? 'invalid-root' : 'root-not-absolute');
    }
    var rootNorm = parseAbsolute(root);
    if (!rootNorm.ok) return rootNorm;
    var candKind = classify(candidate);
    if (candKind === 'invalid') return fail('invalid-path');
    if (candKind === 'drive-relative') return fail('drive-relative-rejected');
    var candNorm;
    if (candKind === 'relative') {
      candNorm = parseAbsolute(joinRoot(rootNorm, candidate));
    } else {
      candNorm = parseAbsolute(candidate);
    }
    if (!candNorm.ok) return candNorm;
    if (candNorm.style !== rootNorm.style || candNorm.prefix !== rootNorm.prefix) {
      return fail('outside-project');
    }
    if (candNorm.parts.length < rootNorm.parts.length) return fail('outside-project');
    for (var i = 0; i < rootNorm.parts.length; i++) {
      if (!sameSegment(rootNorm.parts[i], candNorm.parts[i], rootNorm.style)) {
        return fail('outside-project');
      }
    }
    return {
      ok: true,
      relative: candNorm.parts.slice(rootNorm.parts.length),
      style: rootNorm.style
    };
  }

  return {
    classify: classify,
    isContainedPath: isContainedPath
  };
});
