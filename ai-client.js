(function () {
  'use strict';

  function render(root, ctx) {
    var ui = window.ORBIT.ui;
    var providers = window.ORBIT.providers.listProviders();
    var notice = ui.el('div', { id: 'ai-notice' });

    root.appendChild(ui.pageHead({
      kicker: 'Models',
      title: 'AI Workspace',
      pill: { label: 'Planned', tone: 'planned' },
      lede: 'Conversation shell for more than one provider. No model is connected.'
    }));
    root.appendChild(ui.callout(
      'info',
      'Milestone 3 — no request is sent',
      'Send is wired to the provider adapter seam and refuses. ORBIT will not invent a reply. Nothing on this screen contacts OpenAI, Anthropic, Google, OpenRouter, or a custom endpoint.'
    ));

    var split = ui.el('div', { class: 'split' });
    var aside = ui.el('section', { class: 'panel', 'aria-label': 'Conversations' });
    aside.appendChild(ui.el('div', { class: 'panel-head' }, [
      ui.el('h2', { text: 'Conversations' }),
      ui.button({
        label: 'New',
        variant: 'secondary',
        onClick: function () { showRefusal(notice, 'NEW_CONVERSATION', 'A conversation was not created. There is no model runtime to attach it to.'); }
      })
    ]));
    aside.appendChild(ui.el('div', { class: 'panel-body' }, [
      ui.emptyState('No conversations', 'History stays empty until a real provider adapter exists. This is not a hidden chat.')
    ]));
    split.appendChild(aside);

    var thread = ui.el('section', { class: 'panel', 'aria-label': 'Message thread' });
    var controls = ui.el('div', { class: 'panel-head composer-head' });
    var providerSelect = ui.el('select', { id: 'ai-provider', 'aria-label': 'Provider' });
    providers.forEach(function (provider) {
      providerSelect.appendChild(ui.el('option', { value: provider.id, text: provider.name }));
    });
    var modelInput = ui.el('input', {
      id: 'ai-model',
      type: 'text',
      value: '',
      placeholder: 'Model id — not saved',
      'aria-label': 'Model identifier',
      autocomplete: 'off'
    });
    controls.appendChild(ui.el('label', { class: 'inline-field', for: 'ai-provider', text: 'Provider' }));
    controls.appendChild(providerSelect);
    controls.appendChild(modelInput);
    thread.appendChild(controls);
    thread.appendChild(ui.el('div', { class: 'thread-empty' }, [
      ui.el('h2', { text: 'No response' }),
      ui.el('p', { text: 'Copy stays unavailable because there is no response. Streaming is not running, so Stop has nothing to cancel.' })
    ]));
    thread.appendChild(notice);

    var composer = ui.el('form', { class: 'composer' });
    var textarea = ui.el('textarea', {
      id: 'ai-draft',
      rows: '3',
      placeholder: 'Message text stays in this box. Send will refuse it.',
      'aria-label': 'Message draft'
    });
    var row = ui.el('div', { class: 'composer-actions' });
    row.appendChild(ui.button({
      label: 'Send',
      variant: 'primary',
      onClick: function () { attemptSend(providerSelect.value, textarea.value, notice); }
    }));
    row.appendChild(ui.button({
      label: 'Stop',
      variant: 'secondary',
      disabled: true,
      title: 'Stop is unavailable because no request is running.'
    }));
    row.appendChild(ui.button({
      label: 'Copy response',
      variant: 'ghost',
      disabled: true,
      title: 'There is no response to copy.'
    }));
    row.appendChild(ui.button({
      label: 'Clear notice',
      variant: 'ghost',
      onClick: function () {
        ui.clear(notice);
        ctx.toast('The local notice was cleared. No conversation was stored.');
      }
    }));
    composer.appendChild(textarea);
    composer.appendChild(row);
    composer.appendChild(ui.el('p', { class: 'help', text: 'The draft is not transmitted. Model id is not stored as a secret or a setting.' }));
    composer.addEventListener('submit', function (event) {
      event.preventDefault();
      attemptSend(providerSelect.value, textarea.value, notice);
    });
    thread.appendChild(composer);
    split.appendChild(thread);
    root.appendChild(split);
  }

  function showRefusal(notice, code, message) {
    var ui = window.ORBIT.ui;
    ui.clear(notice);
    notice.appendChild(ui.alertBox(code, message));
  }

  function attemptSend(providerId, draft, notice) {
    var text = String(draft || '').trim();
    if (!text) {
      showRefusal(notice, 'MESSAGE_REQUIRED', 'There is no message to send. No request was sent.');
      return;
    }
    window.ORBIT.providers.createAdapter(providerId).send({
      messages: [{ role: 'user', content: text }]
    }).then(function () {
      showRefusal(notice, 'UNEXPECTED_SUCCESS', 'The adapter returned success. That is not a valid Milestone 1 result, so no reply is shown.');
    }, function (err) {
      showRefusal(notice, err.code || 'REQUEST_REFUSED', err.message || 'No request was sent.');
    });
  }

  window.ORBIT.screens = window.ORBIT.screens || {};
  window.ORBIT.screens.workspace = { render: render };
})();
