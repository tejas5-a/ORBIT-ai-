(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.compatibility = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var facts = {
    app: {
      name: 'ORBIT',
      version: '0.1.0',
      milestone: 1,
      tagline: 'Multiple AI Brains. One Coding Universe.'
    },
    target: {
      os: 'Windows 7 32-bit',
      ram: '4 GB',
      tested: false
    },
    candidate: {
      runtime: 'NW.js',
      version: '0.72.0',
      arch: 'win-ia32',
      chromium: '109.0.5414.87',
      node: '19.3.0',
      selected: false,
      packaged: false,
      normalZipBytes: 115866607,
      sdkZipBytes: 152752545,
      normalUrl: 'https://dl.nwjs.io/v0.72.0/nwjs-v0.72.0-win-ia32.zip',
      sdkUrl: 'https://dl.nwjs.io/v0.72.0/nwjs-sdk-v0.72.0-win-ia32.zip'
    }
  };

  function getFacts() {
    return JSON.parse(JSON.stringify(facts));
  }

  return {
    getFacts: getFacts
  };
});
