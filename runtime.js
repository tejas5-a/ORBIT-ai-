(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.runtime = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function detectRuntime(env) {
    var source = env || {};
    var versions = source.versions || {};
    var hasNw = !!(source.nwApp || versions.nw);
    return {
      id: hasNw ? 'nw' : 'browser',
      label: hasNw ? 'NW.js detected' : 'Browser preview',
      packaged: false,
      testedOnWindows7: false,
      canAccessDisk: false,
      canCallModels: false,
      canExecuteCommands: false
    };
  }

  return {
    detectRuntime: detectRuntime
  };
});
