(function () {
  'use strict';

  function renderSettings(root, ctx) {
    var ui = window.ORBIT.ui;
    var prefs = ctx.store.getState().preferences;
    root.appendChild(ui.pageHead({
      kicker: 'Preferences',
      title: 'Application Settings',
      pill: { label: 'Working locally', tone: 'working' },
      lede: 'Appearance and shell data for this browser profile. API keys are not collected here.'
    }));

    root.appendChild(appearanceCard(ui, ctx, prefs));
    root.appendChild(dataCard(ui, ctx));
    root.appendChild(runtimeCard(ui, ctx));
  }

  function renderModels(root, ctx) {
    var ui = window.ORBIT.ui;
    var providers = window.ORBIT.providers.listProviders();
    root.appendChild(ui.pageHead({
      kicker: 'Providers',
      title: 'Model Settings',
      pill: { label: 'Not collecting keys', tone: 'planned' },
      lede: 'Provider contracts are listed so later adapters do not pretend they are the same API.'
    }));
    root.appendChild(ui.callout(
      'warn',
      'No API key field in this build',
      'A browser shell must not hold provider credentials, and Milestone 1 has no desktop-side secret store. Configure explains that refusal. It does not open a key form.'
    ));

    var list = ui.el('div', { class: 'provider-config-list' });
    providers.forEach(function (provider) {
      list.appendChild(ui.el('article', { class: 'provider-config' }, [
        ui.el('div', { class: 'provider-config-main' }, [
          ui.el('h3', { text: provider.name }),
          ui.el('p', { class: 'row-meta', text: provider.requestStyle + ' · ' + provider.auth + ' · ' + provider.streaming }),
          ui.el('p', { class: 'code', text: provider.defaultEndpoint || 'No default endpoint. Not saved in this build.' })
        ]),
        ui.button({
          label: 'Configure',
          variant: 'secondary',
          onClick: function () { explainProvider(ctx, provider); }
        })
      ]));
    });
    root.appendChild(ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Adapter boundary' })]),
      ui.el('div', { class: 'card-body' }, [
        ui.el('p', { class: 'help', text: 'Default endpoints are documentation. No connection test was performed.' }),
        list
      ])
    ]));

    var notes = ui.el('ul', { class: 'plan-list' });
    providers.forEach(function (provider) {
      notes.appendChild(ui.el('li', {}, [
        ui.el('strong', { text: provider.name }),
        ui.el('span', { text: provider.note })
      ]));
    });
    root.appendChild(ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Why the adapters stay separate' })]),
      ui.el('div', { class: 'card-body' }, [notes])
    ]));
  }

  function appearanceCard(ui, ctx, prefs) {
    var name = ui.el('input', {
      id: 'display-name',
      type: 'text',
      maxlength: '40',
      value: prefs.displayName || '',
      autocomplete: 'nickname',
      'aria-describedby': 'display-name-help'
    });
    name.addEventListener('input', function () {
      try {
        ctx.store.updatePreferences({ displayName: name.value });
      } catch (err) {
        ctx.toast(err.message);
      }
    });
    var density = choiceGroup(ui, ctx, 'Density', 'density', [
      { id: 'comfortable', label: 'Comfortable' },
      { id: 'compact', label: 'Compact' }
    ], prefs.density, function (value) {
      ctx.store.updatePreferences({ density: value });
      document.documentElement.setAttribute('data-density', value);
      ctx.refresh();
    });
    var theme = choiceGroup(ui, ctx, 'Theme', 'theme-page', [
      { id: 'light', label: 'Light' },
      { id: 'dark', label: 'Dark' },
      { id: 'system', label: 'Match system' }
    ], prefs.theme, function (value) {
      ctx.store.updatePreferences({ theme: value });
      var next = ctx.store.getState().preferences;
      var resolved = value;
      if (value === 'system' && window.matchMedia) {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : 'light');
      ctx.refresh();
    });
    return ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Appearance' })]),
      ui.el('div', { class: 'card-body form-grid' }, [
        theme,
        density,
        ui.el('div', { class: 'field' }, [
          ui.el('label', { for: 'display-name', text: 'Display name' }),
          name,
          ui.el('p', { id: 'display-name-help', class: 'help', text: 'Used only in the welcome line. Leave blank to hide it. Saved as you type.' })
        ])
      ])
    ]);
  }

  function choiceGroup(ui, ctx, label, name, options, current, onChange) {
    var group = ui.el('div', { class: 'choice-row', role: 'radiogroup', 'aria-label': label });
    options.forEach(function (option) {
      var id = name + '-' + option.id;
      var input = ui.el('input', { type: 'radio', name: name, id: id, value: option.id });
      if (current === option.id) input.checked = true;
      input.addEventListener('change', function () {
        if (!input.checked) return;
        try {
          onChange(option.id);
        } catch (err) {
          ctx.toast(err.message);
        }
      });
      group.appendChild(ui.el('label', { class: 'choice' + (current === option.id ? ' is-selected' : ''), for: id }, [
        input,
        ui.el('span', { text: option.label })
      ]));
    });
    return ui.el('div', { class: 'field' }, [
      ui.el('span', { class: 'field-label', text: label }),
      group
    ]);
  }

  function dataCard(ui, ctx) {
    var file = ui.el('input', { type: 'file', accept: 'application/json,.json', class: 'sr', id: 'import-file' });
    file.addEventListener('change', function () {
      var picked = file.files && file.files[0];
      file.value = '';
      if (!picked) return;
      var reader = new FileReader();
      reader.onload = function () {
        importText(ctx, String(reader.result || ''));
      };
      reader.onerror = function () {
        ctx.toast('The file could not be read. Current data was left unchanged.');
      };
      reader.readAsText(picked);
    });
    return ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Local shell data' })]),
      ui.el('div', { class: 'card-body' }, [
        ui.el('p', { class: 'help', text: 'Export contains preferences, the project index, and activity. It has no API key field. Import discards secret-named fields if a file was edited by hand.' }),
        ui.el('div', { class: 'inline-actions' }, [
          ui.button({ label: 'Download export', variant: 'secondary', onClick: function () { downloadExport(ctx); } }),
          ui.button({ label: 'View export', variant: 'secondary', onClick: function () { viewExport(ctx); } }),
          ui.button({ label: 'Import export', variant: 'secondary', onClick: function () { file.click(); } }),
          ui.button({ label: 'Reset local data', variant: 'danger', onClick: function () { confirmReset(ctx); } })
        ]),
        file
      ])
    ]);
  }

  function runtimeCard(ui, ctx) {
    var facts = window.ORBIT.compatibility.getFacts();
    var rows = ui.el('dl', { class: 'facts' });
    [
      ['Runtime', ctx.runtime.label],
      ['Packaged', 'No'],
      ['Disk access', 'Refused'],
      ['Live models', 'Not connected'],
      ['Command execution', 'Not available'],
      ['Windows 7 test', 'Not run'],
      ['Candidate runtime', facts.candidate.runtime + ' ' + facts.candidate.version + ' ' + facts.candidate.arch],
      ['Candidate status', 'Not selected. See COMPATIBILITY.md before any package is built.']
    ].forEach(function (item) {
      rows.appendChild(ui.el('dt', { text: item[0] }));
      rows.appendChild(ui.el('dd', { text: item[1] }));
    });
    return ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Runtime' })]),
      ui.el('div', { class: 'card-body' }, [
        rows,
        ui.button({
          label: 'Compatibility details',
          variant: 'secondary',
          onClick: function () { showCompatibility(ctx); }
        })
      ])
    ]);
  }

  function explainProvider(ctx, provider) {
    var endpoint = provider.defaultEndpoint || 'no default endpoint';
    ctx.dialog({
      title: provider.name,
      body: provider.note + ' Configuration was not opened. No API key was requested, and no connection test was sent to ' + endpoint + '.',
      actions: [{ label: 'Close', variant: 'primary', value: null }]
    });
  }

  function downloadExport(ctx) {
    var snapshot = ctx.store.exportSnapshot();
    var text = JSON.stringify(snapshot, null, 2);
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'orbit-shell-export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      ctx.toast('Export started. It contains no API key.');
    } catch (err) {
      ctx.toast('Download failed. Use View export instead. Nothing was sent over the network.');
    }
  }

  function viewExport(ctx) {
    var ui = window.ORBIT.ui;
    var text = JSON.stringify(ctx.store.exportSnapshot(), null, 2);
    var area = ui.el('textarea', { class: 'export-view', readonly: 'readonly', rows: '12' });
    area.value = text;
    ctx.dialog({
      title: 'Shell export',
      body: ui.el('div', {}, [
        ui.el('p', { text: 'This JSON stays on this page until you copy it. It has no API key field.' }),
        area
      ]),
      initialFocus: area,
      actions: [{ label: 'Close', variant: 'primary', value: null }]
    });
  }

  function importText(ctx, text) {
    if (text.length > 500000) {
      ctx.toast('That export is too large for this shell. Current data was left unchanged.');
      return;
    }
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      ctx.toast('That file is not valid JSON. Current data was left unchanged.');
      return;
    }
    ctx.dialog({
      title: 'Replace local shell data?',
      body: 'Import replaces the catalog, preferences, and activity on this profile. It does not touch disk files. Secret-named fields in the file will be discarded.',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: null },
        { label: 'Import', variant: 'primary', value: 'import' }
      ]
    }).then(function (value) {
      if (value !== 'import') return;
      try {
        var result = ctx.store.importSnapshot(data);
        ctx.toast(result.warnings.length ? 'Imported. Secret-named fields were discarded.' : 'Imported shell data. No disk files were changed.');
        ctx.refresh();
      } catch (err) {
        ctx.toast(err.message);
      }
    });
  }

  function confirmReset(ctx) {
    ctx.dialog({
      title: 'Reset local shell data?',
      body: 'This clears the catalog, activity, and preferences stored by ORBIT in this browser profile. It does not delete files on disk. If saved data was unreadable, reset is what allows ORBIT to write again.',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: null },
        { label: 'Reset local data', variant: 'danger', value: 'reset' }
      ]
    }).then(function (value) {
      if (value !== 'reset') return;
      try {
        ctx.store.reset();
        ctx.toast('Local shell data was reset. No disk file was deleted.');
        ctx.refresh();
      } catch (err) {
        ctx.toast(err.message);
      }
    });
  }

  function showCompatibility(ctx) {
    var facts = window.ORBIT.compatibility.getFacts();
    var body = [
      'Target: ' + facts.target.os + ', ' + facts.target.ram + '. Tested on that computer: no.',
      'Candidate, not a selection: ' + facts.candidate.runtime + ' ' + facts.candidate.version + ' (' + facts.candidate.arch + '), Chromium ' + facts.candidate.chromium + ', bundled Node ' + facts.candidate.node + '.',
      'NW.js 0.73.0 and newer fail to launch on Windows 7. That was reported as a missing SetProcessMitigationPolicy entry in KERNEL32.dll. This project has not been packaged and has not been run on the target laptop.',
      'Do not install a separate modern Node.js on the Windows 7 machine. The HTML shell does not need it. The bundled Node inside NW.js is only relevant after a tested package exists.',
      'Chromium 109 has had no browser security updates since early 2023. Windows 7 itself has been unsupported since 14 January 2020. API keys would not be safe on that stack. This build does not ask for them.'
    ].join('\n\n');
    ctx.dialog({
      title: 'Compatibility',
      body: body,
      actions: [{ label: 'Close', variant: 'primary', value: null }]
    });
  }

  window.ORBIT.screens = window.ORBIT.screens || {};
  window.ORBIT.screens.settings = { render: renderSettings };
  window.ORBIT.screens.models = { render: renderModels };
})();
