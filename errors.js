(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.errors = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createError(code, message) {
    var err = new Error(message);
    err.name = 'OrbitError';
    err.code = code;
    return err;
  }

  return {
    createError: createError
  };
});
