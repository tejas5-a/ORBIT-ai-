(function () {
  'use strict';

  var FILE_ACTIONS = [
    { id: 'listTree', label: 'Refresh' },
    { id: 'createFile', label: 'Create file' },
    { id: 'createFolder', label: 'Create folder' },
    { id: 'renamePath', label: 'Rename' },
    { id: 'deletePath', label: 'Delete' }
  ];

  function render(root, ctx) {
    var ui = window.ORBIT.ui;
    var projects = ctx.store.listProjects();
    var selected = ctx.route.extra ? ctx.store.getProject(ctx.route.extra) : null;
    var diskAlert = ui.el('div', { id: 'disk-alert' });

    root.appendChild(ui.pageHead({
      kicker: 'Files',
      title: 'Projects',
      pill: { label: 'Index only', tone: 'partial' },
      lede: 'A local catalog of project names. The folder tree is not connected to a disk.',
      actions: [
        ui.button({ label: 'Create project', variant: 'primary', icon: 'plus', onClick: function () { openCreate(ctx); } }),
        ui.button({ label: 'Open project', variant: 'secondary', icon: 'folder', onClick: function () { openOpen(ctx); } })
      ]
    }));
    root.appendChild(ui.callout(
      'warn',
      'Browser preview has no project filesystem',
      'Creating, opening, renaming, or removing an entry changes only this browser profile. File buttons call the filesystem adapter, which refuses. They do not pretend a listing succeeded.'
    ));

    var split = ui.el('div', { class: 'split' });
    split.appendChild(catalogPanel(ui, ctx, projects, selected));
    split.appendChild(diskPanel(ui, ctx, selected, diskAlert));
    root.appendChild(split);
  }

  function catalogPanel(ui, ctx, projects, selected) {
    var panel = ui.el('section', { class: 'panel', 'aria-label': 'Local project index' });
    panel.appendChild(ui.el('div', { class: 'panel-head' }, [ui.el('h2', { text: 'Local index' })]));
    var body = ui.el('div', { class: 'panel-body' });
    if (!projects.length) {
      body.appendChild(ui.emptyState('Index is empty', 'Save a catalog entry from Create project. ORBIT will not create a directory.'));
    } else {
      var list = ui.el('ul', { class: 'row-list' });
      projects.forEach(function (project) {
        var item = ui.el('li', { class: 'catalog-item' + (selected && selected.id === project.id ? ' is-selected' : '') });
        item.appendChild(ui.el('div', { class: 'catalog-copy' }, [
          ui.el('span', { class: 'row-title truncate', text: project.name }),
          ui.el('span', { class: 'row-meta', text: (project.summary || 'No summary') + ' · updated ' + ui.formatStamp(project.updatedAt) })
        ]));
        item.appendChild(ui.pill('No files', 'off'));
        var actions = ui.el('div', { class: 'inline-actions' });
        actions.appendChild(ui.button({
          label: 'Open',
          variant: 'ghost',
          onClick: function () {
            try {
              ctx.store.touchProject(project.id);
              ctx.navigate('projects', project.id);
            } catch (err) {
              ctx.toast(err.message);
            }
          }
        }));
        actions.appendChild(ui.button({
          label: 'Rename',
          variant: 'ghost',
          onClick: function () { openRename(ctx, project); }
        }));
        actions.appendChild(ui.button({
          label: 'Remove',
          variant: 'danger',
          onClick: function () { confirmRemove(ctx, project); }
        }));
        item.appendChild(actions);
        list.appendChild(item);
      });
      body.appendChild(list);
    }
    panel.appendChild(body);
    return panel;
  }

  function diskPanel(ui, ctx, selected, diskAlert) {
    var panel = ui.el('section', { class: 'panel', 'aria-label': 'Disk files' });
    panel.appendChild(ui.el('div', { class: 'panel-head' }, [
      ui.el('h2', { text: 'Folder tree' }),
      ui.pill('Unavailable', 'planned')
    ]));
    var body = ui.el('div', { class: 'panel-body' });
    if (selected) {
      body.appendChild(ui.el('p', { class: 'selected-name', text: selected.name }));
      body.appendChild(ui.el('p', { class: 'help', text: 'This name is a catalog entry. Opening it did not read a path. diskPath is empty.' }));
    } else {
      body.appendChild(ui.el('p', { class: 'help', text: 'Select a catalog entry if you want to inspect its index record. Selection still does not list files.' }));
    }
    body.appendChild(ui.emptyState('No listing', 'The filesystem adapter has not returned a tree. An empty tree here is the honest state, not a hidden folder.'));
    var toolbar = ui.el('div', { class: 'toolbar' });
    FILE_ACTIONS.forEach(function (action) {
      toolbar.appendChild(ui.button({
        label: action.label,
        variant: 'secondary',
        onClick: function () { runDisk(ctx, action.id, diskAlert); }
      }));
    });
    body.appendChild(toolbar);
    body.appendChild(diskAlert);
    panel.appendChild(body);
    return panel;
  }

  function runDisk(ctx, method, mount) {
    var ui = window.ORBIT.ui;
    var adapter = ctx.fs;
    Promise.resolve().then(function () {
      return adapter[method]({ projectRoot: null, path: null });
    }).then(function () {
      ui.clear(mount);
      mount.appendChild(ui.alertBox('UNEXPECTED_SUCCESS', 'The adapter returned success. No file list is shown, because this build must not invent one.'));
    }, function (err) {
      ui.clear(mount);
      mount.appendChild(ui.alertBox(err.code || 'DISK_REFUSED', err.message || 'The filesystem adapter refused the operation.'));
    });
  }

  function field(ui, id, label, control, help) {
    var wrap = ui.el('div', { class: 'field' }, [
      ui.el('label', { for: id, text: label }),
      control
    ]);
    if (help) wrap.appendChild(ui.el('p', { class: 'help', text: help }));
    return wrap;
  }

  function openCreate(ctx) {
    var ui = window.ORBIT.ui;
    var nameInput = ui.el('input', { id: 'project-name', type: 'text', maxlength: '64', autocomplete: 'off' });
    var summaryInput = ui.el('textarea', { id: 'project-summary', maxlength: '180', rows: '3' });
    var error = ui.el('div', { role: 'alert' });
    var body = ui.el('div', { class: 'form-grid' }, [
      ui.callout('warn', 'Does not create a folder', 'Save catalog entry writes a name to this browser profile only.'),
      field(ui, 'project-name', 'Project name', nameInput, 'Windows reserved names and path characters are rejected.'),
      field(ui, 'project-summary', 'Summary', summaryInput),
      error
    ]);
    ctx.dialog({
      title: 'Create project',
      body: body,
      initialFocus: nameInput,
      actions: [
        { label: 'Cancel', variant: 'secondary', value: null },
        {
          label: 'Save catalog entry',
          variant: 'primary',
          value: 'save',
          validate: function () {
            try {
              ctx.store.createProject({ name: nameInput.value, summary: summaryInput.value });
              ui.clear(error);
              return true;
            } catch (err) {
              ui.clear(error);
              error.appendChild(ui.alertBox(err.code, err.message));
              return false;
            }
          }
        }
      ]
    }).then(function (value) {
      if (value === 'save') {
        ctx.toast('Catalog entry saved. No folder was created.');
        ctx.refresh();
      }
    });
  }

  function openRename(ctx, project) {
    var ui = window.ORBIT.ui;
    var nameInput = ui.el('input', { id: 'rename-project', type: 'text', maxlength: '64', value: project.name, autocomplete: 'off' });
    var error = ui.el('div', { role: 'alert' });
    ctx.dialog({
      title: 'Rename catalog entry',
      body: ui.el('div', { class: 'form-grid' }, [
        ui.el('p', { text: 'This renames the index entry only. No folder will be renamed.' }),
        field(ui, 'rename-project', 'New name', nameInput),
        error
      ]),
      initialFocus: nameInput,
      actions: [
        { label: 'Cancel', variant: 'secondary', value: null },
        {
          label: 'Rename entry',
          variant: 'primary',
          value: 'save',
          validate: function () {
            try {
              ctx.store.renameProject(project.id, nameInput.value);
              return true;
            } catch (err) {
              ui.clear(error);
              error.appendChild(ui.alertBox(err.code, err.message));
              return false;
            }
          }
        }
      ]
    }).then(function (value) {
      if (value === 'save') {
        ctx.toast('Catalog entry renamed. No folder was renamed.');
        ctx.navigate('projects', project.id);
      }
    });
  }

  function confirmRemove(ctx, project) {
    ctx.dialog({
      title: 'Remove from index',
      body: 'Remove “' + project.name + '” from the local index? No file will be deleted, because this entry has no disk path.',
      actions: [
        { label: 'Keep entry', variant: 'secondary', value: null },
        { label: 'Remove from index', variant: 'danger', value: 'remove' }
      ]
    }).then(function (value) {
      if (value !== 'remove') return;
      try {
        ctx.store.removeProject(project.id);
        ctx.toast('Removed from the index. No disk file was deleted.');
        ctx.navigate('projects');
      } catch (err) {
        ctx.toast(err.message);
      }
    });
  }

  function openOpen(ctx) {
    var ui = window.ORBIT.ui;
    var projects = ctx.store.listProjects();
    var body = ui.el('div', { class: 'form-grid' });
    body.appendChild(ui.el('p', { text: 'Opening a catalog entry does not open a folder. Disk browse is not available in this build.' }));
    if (!projects.length) {
      body.appendChild(ui.emptyState('Nothing to open', 'Create a catalog entry first.'));
    } else {
      var list = ui.el('div', { class: 'quick-list' });
      projects.forEach(function (project) {
        var btn = ui.el('button', { type: 'button', class: 'quick-btn' });
        btn.appendChild(ui.el('span', { class: 'quick-copy' }, [
          ui.el('span', { class: 'row-title', text: project.name }),
          ui.el('span', { class: 'row-meta', text: 'Index only' })
        ]));
        btn.addEventListener('click', function () {
          try {
            ctx.store.touchProject(project.id);
            window.ORBIT.app.closeDialog();
            ctx.navigate('projects', project.id);
          } catch (err) {
            ctx.toast(err.message);
          }
        });
        list.appendChild(btn);
      });
      body.appendChild(list);
    }
    ctx.dialog({
      title: 'Open project',
      body: body,
      actions: [{ label: 'Close', variant: 'secondary', value: null }]
    });
  }

  window.ORBIT.projectUI = {
    render: render,
    openCreate: openCreate,
    openOpen: openOpen
  };
  window.ORBIT.screens = window.ORBIT.screens || {};
  window.ORBIT.screens.projects = { render: render };
})();
