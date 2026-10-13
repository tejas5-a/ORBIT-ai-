(function () {
  'use strict';

  var SECTIONS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', group: 'Workspace', shortcut: '1' },
    { id: 'workspace', label: 'AI Workspace', icon: 'chat', group: 'Workspace', shortcut: '2' },
    { id: 'agent', label: 'Agent Workspace', icon: 'agent', group: 'Workspace', shortcut: '3' },
    { id: 'projects', label: 'Projects', icon: 'folder', group: 'Workspace', shortcut: '4' },
    { id: 'editor', label: 'Code Editor', icon: 'code', group: 'Workspace', shortcut: '5' },
    { id: 'models', label: 'Model Settings', icon: 'models', group: 'Configure', shortcut: '6' },
    { id: 'settings', label: 'Application Settings', icon: 'settings', group: 'Configure', shortcut: '7' }
  ];

  function find(id) {
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === id) return SECTIONS[i];
    }
    return null;
  }

  function init(ctx) {
    var nav = document.getElementById('nav');
    var ui = window.ORBIT.ui;
    ui.clear(nav);
    var lastGroup = '';
    SECTIONS.forEach(function (section) {
      if (section.group !== lastGroup) {
        nav.appendChild(ui.el('div', { class: 'nav-label', text: section.group }));
        lastGroup = section.group;
      }
      var btn = ui.el('button', {
        type: 'button',
        class: 'nav-btn',
        'data-section': section.id,
        'aria-label': section.label + '. Shortcut Alt+' + section.shortcut
      });
      btn.appendChild(ui.icon(section.icon));
      btn.appendChild(ui.el('span', { class: 'nav-text', text: section.label }));
      btn.addEventListener('click', function () {
        ctx.navigate(section.id);
      });
      nav.appendChild(btn);
    });
  }

  function setCurrent(id) {
    var buttons = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-section') === id) buttons[i].setAttribute('aria-current', 'page');
      else buttons[i].removeAttribute('aria-current');
    }
  }

  window.ORBIT.nav = {
    sections: SECTIONS,
    find: find,
    init: init,
    setCurrent: setCurrent
  };
})();
