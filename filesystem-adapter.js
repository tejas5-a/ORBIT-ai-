(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./errors'));
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.filesystem = factory(root.ORBIT.errors);
  }
})(typeof self !== 'undefined' ? self : this, function (errors) {
  'use strict';

  var METHODS = ['listTree', 'readFile', 'writeFile', 'createFile', 'createFolder', 'renamePath', 'deletePath'];

  function rejectAll(code, message) {
    var adapter = {
      canAccessDisk: false,
      canExecute: false
    };
    METHODS.forEach(function (name) {
      adapter[name] = function () {
        return Promise.reject(errors.createError(code, message));
      };
    });
    return adapter;
  }

  function createBrowserFilesystemAdapter() {
    var adapter = rejectAll(
      'DISK_UNAVAILABLE',
      'This browser preview cannot read or write a project folder. No filesystem operation was performed.'
    );
    adapter.id = 'browser-preview';
    return adapter;
  }

  function createDesktopFilesystemAdapter() {
    var adapter = rejectAll(
      'DISK_NOT_IMPLEMENTED',
      'NW.js may be present, but the desktop filesystem adapter is not implemented. No filesystem operation was performed.'
    );
    adapter.id = 'desktop-nw-unimplemented';
    return adapter;
  }

  function selectFilesystemAdapter(runtime) {
    if (runtime && runtime.id === 'nw') return createDesktopFilesystemAdapter();
    return createBrowserFilesystemAdapter();
  }

  return {
    createBrowserFilesystemAdapter: createBrowserFilesystemAdapter,
    createDesktopFilesystemAdapter: createDesktopFilesystemAdapter,
    selectFilesystemAdapter: selectFilesystemAdapter
  };
});
