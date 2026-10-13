(function () {
  'use strict';

  var MILESTONES = [
    { id: '1', name: 'Application shell and navigation', state: 'In this build', tone: 'working', note: 'Navigation, shell, and local profile are running.' },
    { id: '2', name: 'Dashboard, settings, and responsive layout', state: 'Partial', tone: 'partial', note: 'Dashboard, preferences, and layout are here. API configuration is not.' },
    { id: '3', name: 'Real AI provider connections', state: 'Not started', tone: 'planned', note: 'No request adapter is implemented.' },
    { id: '4', name: 'Project and file management', state: 'Not started', tone: 'planned', note: 'The catalog is local only. Disk access is refused.' },
    { id: '5', name: 'Code editor', state: 'Not started', tone: 'planned', note: 'CodeMirror 5 is not loaded.' },
    { id: '6', name: 'Approved AI-assisted file changes', state: 'Not started', tone: 'planned', note: 'Approval cannot apply a change yet.' },
    { id: '7', name: 'Multi-model orchestration', state: 'Not started', tone: 'planned', note: 'Roles are defined. They are not collaborating.' },
    { id: '8', name: 'Terminal integration', state: 'Not started', tone: 'planned', note: 'No command can be executed.' },
    { id: '9', name: 'Windows test and desktop package', state: 'Not started', tone: 'planned', note: 'NW.js 0.72.0 is a candidate only. It has not been tested here.' }
  ];

  function providerShort(id) {
    if (id === 'openai') return 'OA';
    if (id === 'anthropic') return 'AN';
    if (id === 'gemini') return 'GE';
    if (id === 'openrouter') return 'OR';
    if (id === 'custom') return 'CX';
    return 'AI';
  }

  function render(root, ctx) {
    var ui = window.ORBIT.ui;
    var prefs = ctx.store.getState().preferences;
    var projects = ctx.store.listProjects();
    var activity = ctx.store.getState().activity.slice(0, 6);
    var providers = window.ORBIT.providers.listProviders();

    root.appendChild(ui.pageHead({
      kicker: 'Overview',
      title: ui.greeting(prefs.displayName),
      pill: { label: 'Shell working', tone: 'working' },
      lede: 'Multiple AI Brains. One Coding Universe.'
    }));

    var welcome = ui.el('section', { class: 'welcome' });
    var copy = ui.el('div', {}, [
      ui.el('p', { class: 'welcome-copy', text: 'This build is the local application shell. Navigation, appearance, a project index, and activity history work on this browser profile. Live models, disk files, the editor, the agent, and the terminal do not.' }),
      ui.el('div', { class: 'welcome-actions' }, [
        ui.button({ label: 'Create project', variant: 'primary', icon: 'plus', onClick: function () { window.ORBIT.projectUI.openCreate(ctx); } }),
        ui.button({ label: 'Open project', variant: 'secondary', icon: 'folder', onClick: function () { window.ORBIT.projectUI.openOpen(ctx); } })
      ])
    ]);
    welcome.appendChild(copy);
    welcome.appendChild(ui.el('div', { class: 'welcome-art' }, [ui.orbitArt()]));
    root.appendChild(welcome);

    var grid = ui.el('div', { class: 'layout-2' });
    grid.appendChild(projectsCard(ui, ctx, projects));
    grid.appendChild(providerCard(ui, ctx, providers));
    grid.appendChild(activityCard(ui, activity));
    grid.appendChild(quickCard(ui, ctx));
    root.appendChild(grid);
    root.appendChild(milestoneCard(ui, ctx));
  }

  function card(ui, title, action, bodyNodes) {
    var head = ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: title })]);
    if (action) head.appendChild(action);
    return ui.el('section', { class: 'card' }, [head, ui.el('div', { class: 'card-body' }, bodyNodes)]);
  }

  function projectsCard(ui, ctx, projects) {
    var action = ui.el('button', {
      type: 'button',
      class: 'text-btn',
      text: 'View index',
      onClick: function () { ctx.navigate('projects'); }
    });
    var body;
    if (!projects.length) {
      body = [ui.emptyState('No catalog entries yet', 'Create a project index entry to see it here. That action does not create a folder.')];
    } else {
      var list = ui.el('ul', { class: 'row-list' });
      projects.slice(0, 5).forEach(function (project) {
        var btn = ui.el('button', { type: 'button', class: 'row-btn' });
        btn.appendChild(ui.el('span', { class: 'row-title truncate', text: project.name }));
        btn.appendChild(ui.el('span', { class: 'row-meta', text: 'Catalog only · ' + ui.formatStamp(project.updatedAt) }));
        btn.addEventListener('click', function () {
          try {
            ctx.store.touchProject(project.id);
            ctx.navigate('projects', project.id);
          } catch (err) {
            ctx.toast(err.message);
          }
        });
        list.appendChild(ui.el('li', {}, [btn]));
      });
      body = [list];
    }
    return card(ui, 'Recent projects', action, body);
  }

  function providerCard(ui, ctx, providers) {
    var action = ui.el('button', {
      type: 'button',
      class: 'text-btn',
      text: 'Providers',
      onClick: function () { ctx.navigate('models'); }
    });
    var list = ui.el('ul', { class: 'provider-list' });
    providers.forEach(function (provider) {
      list.appendChild(ui.el('li', { class: 'provider-row' }, [
        ui.el('span', { class: 'mono-badge', text: providerShort(provider.id) }),
        ui.el('span', { class: 'provider-copy' }, [
          ui.el('span', { class: 'row-title', text: provider.name }),
          ui.el('span', { class: 'row-meta', text: provider.requestStyle })
        ]),
        ui.pill('Not configured', 'off')
      ]));
    });
    list.appendChild(ui.el('li', { class: 'fine-print', text: 'This is not a live connection check. No network request was made.' }));
    return card(ui, 'AI provider status', action, [list]);
  }

  function activityCard(ui, activity) {
    var body;
    if (!activity.length) {
      body = [ui.emptyState('No activity yet', 'Shell actions will be listed here. Model calls and file edits will not appear until those milestones exist.')];
    } else {
      var list = ui.el('ol', { class: 'timeline' });
      activity.forEach(function (item) {
        list.appendChild(ui.el('li', {}, [
          ui.el('span', { class: 'time', text: ui.formatStamp(item.at) }),
          ui.el('strong', { text: item.title }),
          item.detail ? ui.el('span', { class: 'row-meta', text: item.detail }) : null
        ]));
      });
      body = [list];
    }
    return card(ui, 'Recent activity', null, body);
  }

  function quickCard(ui, ctx) {
    var actions = [
      ['workspace', 'AI Workspace', 'Open the conversation shell. It cannot send.'],
      ['agent', 'Agent Workspace', 'Review the approval steps. They do not run.'],
      ['projects', 'Projects', 'Manage the local index, not disk files.'],
      ['editor', 'Code Editor', 'See the editor frame. CodeMirror is not loaded.'],
      ['models', 'Model Settings', 'Compare provider contracts. Keys are not collected.'],
      ['settings', 'Application Settings', 'Theme, density, and local shell data.']
    ];
    var list = ui.el('div', { class: 'quick-list' });
    actions.forEach(function (item) {
      var btn = ui.el('button', { type: 'button', class: 'quick-btn' });
      btn.appendChild(ui.icon(window.ORBIT.nav.find(item[0]).icon));
      var text = ui.el('span', { class: 'quick-copy' }, [
        ui.el('span', { class: 'row-title', text: item[1] }),
        ui.el('span', { class: 'row-meta', text: item[2] })
      ]);
      btn.appendChild(text);
      btn.appendChild(ui.icon('chevron'));
      btn.addEventListener('click', function () { ctx.navigate(item[0]); });
      list.appendChild(btn);
    });
    return card(ui, 'Quick actions', null, [list]);
  }

  function milestoneCard(ui) {
    var table = ui.el('table', { class: 'data' });
    var thead = ui.el('thead', {}, [
      ui.el('tr', {}, [
        ui.el('th', { text: 'Milestone' }),
        ui.el('th', { text: 'Work' }),
        ui.el('th', { text: 'Status' }),
        ui.el('th', { text: 'What is true now' })
      ])
    ]);
    var tbody = ui.el('tbody');
    MILESTONES.forEach(function (item) {
      var row = ui.el('tr', { class: item.id === '1' ? 'is-current' : '' });
      row.appendChild(ui.el('td', { text: item.id }));
      row.appendChild(ui.el('td', { text: item.name }));
      row.appendChild(ui.el('td', {}, [ui.pill(item.state, item.tone)]));
      row.appendChild(ui.el('td', { text: item.note }));
      tbody.appendChild(row);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    return card(ui, 'Build map', null, [
      ui.el('p', { class: 'fine-print', text: 'Partial means some of that milestone is already useful in the shell. It does not mean the milestone is finished.' }),
      ui.el('div', { class: 'table-wrap' }, [table])
    ]);
  }

  window.ORBIT.screens = window.ORBIT.screens || {};
  window.ORBIT.screens.dashboard = { render: render };
})();
