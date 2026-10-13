(function () {
  'use strict';

  var KEY = 'orbit.shell.v1';
  var ctx = null;
  var booted = false;
  var modalOpen = false;
  var lastFocused = null;
  var closeModal = null;

  function createLocalStorageBackend() {
    var memory = null;
    var persistent = true;
    return {
      read: function () {
        if (!persistent) return memory;
        try {
          var raw = window.localStorage.getItem(KEY);
          if (!raw) return null;
          return JSON.parse(raw);
        } catch (err) {
          persistent = false;
          return memory;
        }
      },
      write: function (data) {
        memory = data;
        try {
          window.localStorage.setItem(KEY, JSON.stringify(data));
        } catch (err) {
          persistent = false;
          var blocked = err && err.name === 'QuotaExceededError';
          var wrap = new Error(blocked ? 'Browser storage is full.' : 'Browser storage is unavailable.');
          wrap.cause = err;
          throw wrap;
        }
      },
      persistent: function () { return persistent; }
    };
  }

  function detectEnv() {
    var env = {};
    try {
      env.nwApp = typeof nw !== 'undefined' && !!nw.App;
    } catch (err) {
      env.nwApp = false;
    }
    try {
      if (typeof process !== 'undefined' && process.versions) env.versions = process.versions;
    } catch (err2) {
      env.versions = null;
    }
    return env;
  }

  function applyAppearance(prefs) {
    var theme = prefs && prefs.theme ? prefs.theme : 'light';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : 'light');
    document.documentElement.setAttribute('data-density', prefs && prefs.density === 'compact' ? 'compact' : 'comfortable');
  }

  function toast(message) {
    var root = document.getElementById('toast-root');
    var node = window.ORBIT.ui.el('div', { class: 'toast', role: 'status', text: message });
    root.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 4200);
  }

  function focusable(container) {
    var nodes = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].disabled && nodes[i].getAttribute('aria-hidden') !== 'true') list.push(nodes[i]);
    }
    return list;
  }

  function dialog(opts) {
    if (modalOpen) return Promise.resolve(null);
    modalOpen = true;
    lastFocused = document.activeElement;
    var ui = window.ORBIT.ui;
    var root = document.getElementById('modal-root');
    var app = document.querySelector('.app');
    app.setAttribute('aria-hidden', 'true');
    if ('inert' in app) app.inert = true;
    var back = ui.el('div', { class: 'modal-back' });
    var panel = ui.el('div', {
      class: 'modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'dialog-title'
    });
    var heading = ui.el('h2', { id: 'dialog-title', text: opts.title });
    panel.appendChild(ui.el('div', { class: 'modal-head' }, [heading]));
    var body = ui.el('div', { class: 'modal-body' });
    if (typeof opts.body === 'string') body.appendChild(ui.el('p', { text: opts.body }));
    else if (opts.body) body.appendChild(opts.body);
    panel.appendChild(body);
    var actions = ui.el('div', { class: 'modal-actions' });
    (opts.actions || [{ label: 'Close', variant: 'secondary', value: null }]).forEach(function (action) {
      var btn = ui.button({
        label: action.label,
        variant: action.variant || 'secondary',
        onClick: function () {
          if (action.validate && action.validate() === false) return;
          finish(action.value);
        }
      });
      actions.appendChild(btn);
    });
    panel.appendChild(actions);
    back.appendChild(panel);
    root.appendChild(back);

    var resolveDialog = null;

    function close() {
      modalOpen = false;
      closeModal = null;
      ui.clear(root);
      app.removeAttribute('aria-hidden');
      if ('inert' in app) app.inert = false;
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function finish(value) {
      if (!modalOpen && !resolveDialog) return;
      document.removeEventListener('keydown', onKey);
      close();
      if (resolveDialog) {
        var done = resolveDialog;
        resolveDialog = null;
        done(value);
      }
    }

    closeModal = function () { finish(null); };

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(opts.cancelValue == null ? null : opts.cancelValue);
        return;
      }
      if (event.key !== 'Tab') return;
      var items = focusable(panel);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', function (event) {
      if (event.target === back) finish(null);
    });
    window.setTimeout(function () {
      if (opts.initialFocus && opts.initialFocus.focus) opts.initialFocus.focus();
      else {
        var items = focusable(panel);
        if (items.length) items[0].focus();
      }
    }, 0);

    return new Promise(function (resolve) {
      resolveDialog = resolve;
    });
  }

  function parseHash() {
    var raw = (window.location.hash || '').replace(/^#\/?/, '');
    var bits = raw.split('/').filter(Boolean);
    var id = bits[0] || 'dashboard';
    if (!window.ORBIT.nav.find(id)) id = 'dashboard';
    var extra = bits[1] ? decodeURIComponent(bits[1]) : '';
    if (extra && !/^prj_[a-z0-9]+$/.test(extra)) extra = '';
    return { id: id, extra: extra };
  }

  function navigate(id, extra) {
    var hash = '#/' + id;
    if (extra) hash += '/' + encodeURIComponent(extra);
    if (window.location.hash === hash) renderRoute(true);
    else window.location.hash = hash;
  }

  function renderStatus() {
    var bar = document.getElementById('statusbar');
    var ui = window.ORBIT.ui;
    var facts = window.ORBIT.compatibility.getFacts();
    var count = ctx.store.listProjects().length;
    ui.clear(bar);
    bar.appendChild(ui.el('span', {
      class: 'status-item',
      title: 'This is a limited shell. Disk, models, and commands are not connected.'
    }, [
      ui.el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
      ui.el('span', { text: ctx.runtime.label })
    ]));
    bar.appendChild(ui.el('span', { text: 'No disk access' }));
    bar.appendChild(ui.el('span', { text: 'No live models' }));
    bar.appendChild(ui.el('span', { text: 'No command execution' }));
    bar.appendChild(ui.el('span', { text: count + (count === 1 ? ' catalog entry' : ' catalog entries') }));
    var spacer = ui.el('span', { class: 'spacer' });
    spacer.appendChild(ui.el('button', {
      type: 'button',
      class: 'text-btn',
      text: 'Shortcuts',
      onClick: openShortcuts
    }));
    bar.appendChild(spacer);
    bar.appendChild(ui.el('span', { text: 'v' + facts.app.version + ' · Milestone ' + facts.app.milestone }));
  }

  function renderSidebarFoot() {
    var foot = document.getElementById('sidebar-foot');
    var ui = window.ORBIT.ui;
    var current = ctx.store.getState().preferences.theme || 'light';
    ui.clear(foot);
    foot.appendChild(ui.el('p', { class: 'foot-label', text: 'Theme' }));
    var group = ui.el('div', { class: 'theme-switch', role: 'radiogroup', 'aria-label': 'Theme' });
    [
      { id: 'light', label: 'Light' },
      { id: 'dark', label: 'Dark' },
      { id: 'system', label: 'Auto' }
    ].forEach(function (item) {
      var btn = ui.el('button', {
        type: 'button',
        class: 'theme-btn' + (current === item.id ? ' is-selected' : ''),
        text: item.label,
        role: 'radio',
        'aria-checked': current === item.id ? 'true' : 'false'
      });
      btn.addEventListener('click', function () {
        try {
          ctx.store.updatePreferences({ theme: item.id });
          applyAppearance(ctx.store.getState().preferences);
          renderRoute(false);
        } catch (err) {
          toast(err.message);
        }
      });
      group.appendChild(btn);
    });
    foot.appendChild(group);
    foot.appendChild(ui.el('p', { class: 'foot-note', text: 'Milestone 1 shell. Not a Windows package.' }));
  }

  function renderRoute(fromUser) {
    applyAppearance(ctx.store.getState().preferences);
    var route = parseHash();
    var ui = window.ORBIT.ui;
    var main = document.getElementById('main');
    var section = window.ORBIT.nav.find(route.id);
    var screen = window.ORBIT.screens && window.ORBIT.screens[route.id];
    window.ORBIT.nav.setCurrent(route.id);
    document.title = section.label + ' — ORBIT';
    ui.clear(main);
    if (ctx.store.writesBlocked()) {
      main.appendChild(ui.callout(
        'warn',
        'Saved data was not loaded',
        'ORBIT could not read this profile’s shell data, so it did not overwrite it. Reset local data in Application Settings if you want a clean shell. No disk files are involved.'
      ));
    }
    if (!ctx.backend.persistent()) {
      main.appendChild(ui.callout(
        'warn',
        'This browser will not keep changes',
        'Local storage is unavailable. Catalog entries and preferences last only until this page closes.'
      ));
    }
    var page = ui.el('div', { class: 'page page-' + route.id });
    main.appendChild(page);
    ctx.route = route;
    try {
      if (!screen || typeof screen.render !== 'function') {
        page.appendChild(ui.callout('warn', 'Missing screen', 'This section is not registered. Nothing else was run.'));
      } else {
        screen.render(page, ctx);
      }
    } catch (err) {
      page.appendChild(ui.alertBox(err.code || 'RENDER_FAILED', err.message || 'This section could not be drawn.'));
    }
    renderStatus();
    renderSidebarFoot();
    if (fromUser) {
      var heading = document.getElementById('page-title');
      if (heading) heading.focus();
    }
  }

  function openShortcuts() {
    var ui = window.ORBIT.ui;
    var list = ui.el('ul', { class: 'shortcut-list' });
    [
      ['Alt+1 … Alt+7', 'Switch sections, in navigation order.'],
      ['Ctrl+N', 'Create a catalog entry. Does not create a folder.'],
      ['Ctrl+O', 'Open the catalog. Does not open a disk folder.'],
      ['Ctrl+S', 'Does not save a file. There is no editor buffer.'],
      ['?', 'Show these shortcuts.'],
      ['Esc', 'Close a dialog.']
    ].forEach(function (row) {
      list.appendChild(ui.el('li', {}, [
        ui.el('kbd', { text: row[0] }),
        ui.el('span', { text: row[1] })
      ]));
    });
    dialog({
      title: 'Keyboard shortcuts',
      body: list,
      actions: [{ label: 'Close', variant: 'primary', value: null }]
    });
  }

  function onKey(event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && String(event.key).toLowerCase() === 's') {
      event.preventDefault();
      if (!modalOpen) toast('Nothing was saved. No file is open, and no folder was written.');
      return;
    }
    if (modalOpen) return;
    var tag = event.target && event.target.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (event.target && event.target.isContentEditable);
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      var index = parseInt(event.key, 10);
      if (index >= 1 && index <= window.ORBIT.nav.sections.length) {
        event.preventDefault();
        navigate(window.ORBIT.nav.sections[index - 1].id);
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !typing) {
      var key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        window.ORBIT.projectUI.openCreate(ctx);
      } else if (key === 'o') {
        event.preventDefault();
        window.ORBIT.projectUI.openOpen(ctx);
      }
    }
    if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key === '?') {
      event.preventDefault();
      openShortcuts();
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    var backend = createLocalStorageBackend();
    var store = window.ORBIT.shellStore.createShellStore(backend);
    var runtime = window.ORBIT.runtime.detectRuntime(detectEnv());
    ctx = {
      store: store,
      backend: backend,
      runtime: runtime,
      fs: window.ORBIT.filesystem.selectFilesystemAdapter(runtime),
      navigate: navigate,
      toast: toast,
      dialog: dialog,
      refresh: function () { renderRoute(false); },
      route: { id: 'dashboard', extra: '' }
    };
    try {
      store.ensureIntro();
    } catch (err) {
      toast(err.message);
    }
    applyAppearance(store.getState().preferences);
    window.ORBIT.nav.init(ctx);
    renderSidebarFoot();
    document.getElementById('brand-home').addEventListener('click', function () {
      navigate('dashboard');
    });
    var skipFocus = !window.location.hash;
    window.addEventListener('hashchange', function () {
      var focus = !skipFocus;
      skipFocus = false;
      renderRoute(focus);
    });
    document.addEventListener('keydown', onKey);
    if (window.matchMedia) {
      var media = window.matchMedia('(prefers-color-scheme: dark)');
      var onScheme = function () {
        if (ctx.store.getState().preferences.theme === 'system') applyAppearance(ctx.store.getState().preferences);
      };
      if (media.addEventListener) media.addEventListener('change', onScheme);
      else if (media.addListener) media.addListener(onScheme);
    }
    renderRoute(false);
    if (!window.location.hash) window.location.replace('#/dashboard');
    window.ORBIT.app.ctx = ctx;
  }

  window.ORBIT.app = {
    boot: boot,
    toast: toast,
    dialog: dialog,
    closeDialog: function () {
      if (closeModal) closeModal();
    }
  };
})();
