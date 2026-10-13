(function () {
  'use strict';

  function render(root, ctx) {
    var ui = window.ORBIT.ui;
    var notice = ui.el('div', { id: 'agent-notice' });
    var stages = window.ORBIT.orchestration.getStages();
    var roles = window.ORBIT.orchestration.getRoles();

    root.appendChild(ui.pageHead({
      kicker: 'Agent',
      title: 'Agent Workspace',
      pill: { label: 'Planned', tone: 'planned' },
      lede: 'The approval workflow is visible. It is not running, and the models are not collaborating.'
    }));
    root.appendChild(ui.callout(
      'info',
      'Approval is required, and apply is not implemented',
      'A later version must not modify files until you approve a real proposal. This build cannot create a plan, read files, or apply a change. Create plan calls the orchestration guard and stops.'
    ));
    root.appendChild(notice);

    var layout = ui.el('div', { class: 'layout-2' });
    var task = ui.el('section', { class: 'card' });
    task.appendChild(ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Task' })]));
    var taskBody = ui.el('div', { class: 'card-body form-grid' });
    var textarea = ui.el('textarea', {
      id: 'agent-task',
      rows: '6',
      placeholder: 'Describe a task. It will not be sent.',
      'aria-label': 'Task description'
    });
    taskBody.appendChild(ui.el('label', { for: 'agent-task', class: 'field-label', text: 'Task description' }));
    taskBody.appendChild(textarea);
    taskBody.appendChild(ui.el('div', { class: 'inline-actions' }, [
      ui.button({
        label: 'Create plan',
        variant: 'primary',
        onClick: function () { attemptPlan(textarea.value, notice); }
      }),
      ui.button({
        label: 'Cancel run',
        variant: 'secondary',
        onClick: function () {
          var guard = window.ORBIT.orchestration.createRunGuard(0);
          guard.cancel();
          show(notice, 'CANCELLED', 'Nothing was running. No model call was cancelled because none was started.');
        }
      })
    ]));
    taskBody.appendChild(ui.el('p', { class: 'help', text: 'Model call budget in this build is 0. A run cannot start, so it also cannot loop.' }));
    task.appendChild(taskBody);
    layout.appendChild(task);

    var stageCard = ui.el('section', { class: 'card' });
    stageCard.appendChild(ui.el('div', { class: 'card-head' }, [
      ui.el('h2', { text: 'Stages' }),
      ui.pill('Not run', 'off')
    ]));
    var stageList = ui.el('ol', { class: 'stage-list' });
    stages.forEach(function (stage, index) {
      stageList.appendChild(ui.el('li', { class: 'stage' }, [
        ui.el('span', { class: 'stage-index', text: String(index + 1) }),
        ui.el('span', {}, [
          ui.el('span', { class: 'row-title', text: stage.label }),
          ui.el('span', { class: 'row-meta', text: 'Owner: ' + stage.owner })
        ]),
        ui.pill('Not run', 'off')
      ]));
    });
    stageCard.appendChild(ui.el('div', { class: 'card-body' }, [stageList]));
    layout.appendChild(stageCard);
    root.appendChild(layout);

    var roleGrid = ui.el('div', { class: 'role-grid' });
    roles.forEach(function (role) {
      roleGrid.appendChild(ui.el('article', { class: 'role-card' }, [
        ui.el('h3', { text: role.label }),
        ui.el('p', { text: role.duty }),
        ui.pill('Provider not assigned', 'planned')
      ]));
    });
    root.appendChild(ui.el('section', { class: 'card' }, [
      ui.el('div', { class: 'card-head' }, [ui.el('h2', { text: 'Roles' })]),
      ui.el('div', { class: 'card-body' }, [
        ui.el('p', { class: 'help', text: 'Choosing a provider and model per role is Milestone 7. These cards are not a live handoff.' }),
        roleGrid
      ])
    ]));
  }

  function show(notice, code, message) {
    var ui = window.ORBIT.ui;
    ui.clear(notice);
    notice.appendChild(ui.alertBox(code, message));
  }

  function attemptPlan(text, notice) {
    try {
      window.ORBIT.orchestration.createTaskDraft(text);
      window.ORBIT.orchestration.startRun();
      show(notice, 'UNEXPECTED_SUCCESS', 'Orchestration returned without an error. No plan is shown, because this build must not invent one.');
    } catch (err) {
      show(notice, err.code || 'ORCHESTRATION_DISABLED', err.message || 'No plan was created.');
    }
  }

  window.ORBIT.screens = window.ORBIT.screens || {};
  window.ORBIT.screens.agent = { render: render };
})();
