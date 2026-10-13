(function () {
  'use strict';

  function render(root, ctx) {
    var ui = window.ORBIT.ui;
    var notice = ui.el('div');
    root.appendChild(ui.pageHead({
      kicker: 'Editor',
      title: 'Code Editor',
      pill: { label: 'Planned', tone: 'planned' },
      lede: 'CodeMirror 5 will mount here in Milestone 5. It is not loaded, so there is no buffer.'
    }));
    root.appendChild(ui.callout(
      'info',
      'Editor engine not loaded',
      'Syntax highlighting, search, replace, and multiple files are planned. They are inactive because there is no document. Save calls the filesystem adapter and will refuse rather than report a successful write.'
    ));

    var frame = ui.el('section', { class: 'editor-frame', 'aria-label': 'Editor frame' });
    frame.appendChild(ui.el('div', { class: 'editor-tabbar' }, [
      ui.el('span', { class: 'editor-tab', text: 'No file open' }),
      ui.pill('Unsaved indicator inactive', 'off')
    ]));
    frame.appendChild(ui.el('div', { class: 'editor-toolbar' }, [
      ui.button({ label: 'Search', variant: 'secondary', disabled: true, title: 'Search needs a buffer. CodeMirror is not loaded.' }),
      ui.button({ label: 'Replace', variant: 'secondary', disabled: true, title: 'Replace needs a buffer. CodeMirror is not loaded.' }),
      ui.button({
        label: 'Save',
        variant: 'primary',
        onClick: function () { refuseWrite(ctx, 'writeFile', notice); }
      }),
      ui.button({
        label: 'Save as',
        variant: 'secondary',
        onClick: function () { refuseWrite(ctx, 'writeFile', notice); }
      })
    ]));
    frame.appendChild(ui.el('div', { class: 'editor-well' }, [
      ui.el('p', { class: 'editor-line', text: 'No buffer. CodeMirror 5 is not loaded, so this is not an open file.' })
    ]));
    frame.appendChild(notice);
    root.appendChild(frame);

    var list = ui.el('ul', { class: 'plan-list' });
    [
      ['Syntax highlighting', 'Planned with a vendored CodeMirror 5 build. No CDN script is used, so a missing network cannot fake the editor.'],
      ['Line numbers, search, replace', 'Not active. There is no document to search.'],
      ['Several open files', 'Not active. The tab strip has no file.'],
      ['Save and save as', 'Wired to the filesystem adapter, which refuses. Ctrl+S also refuses.'],
      ['Unsaved-change marker', 'Inactive. Nothing is dirty because nothing is open.'],
      ['Keyboard shortcuts', 'Shell shortcuts work. Editor shortcuts beyond save-refusal do not.']
    ].forEach(function (item) {
      list.appendChild(ui.el('li', {}, [
        ui.el('strong', { text: item[0] }),
        ui.el('span', { text: item[1] })
      ]));
    });
    root.appendChild(ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Milestone 5 scope' })]),
      ui.el('div', { class: 'card-body' }, [list])
    ]));
  }

  function refuseWrite(ctx, method, notice) {
    var ui = window.ORBIT.ui;
    Promise.resolve().then(function () {
      return ctx.fs[method]({ path: null, contents: '' });
    }).then(function () {
      ui.clear(notice);
      notice.appendChild(ui.alertBox('UNEXPECTED_SUCCESS', 'The adapter returned success. No write is displayed, because this build must not invent a saved file.'));
    }, function (err) {
      ui.clear(notice);
      notice.appendChild(ui.alertBox(err.code || 'SAVE_REFUSED', err.message || 'Nothing was saved.'));
    });
  }

  window.ORBIT.screens = window.ORBIT.screens || {};
  window.ORBIT.screens.editor = { render: render };
})();
