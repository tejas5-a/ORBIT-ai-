(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./errors'));
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.orchestration = factory(root.ORBIT.errors);
  }
})(typeof self !== 'undefined' ? self : this, function (errors) {
  'use strict';

  var STAGES = [
    { id: 'describe', label: 'User describes a task', owner: 'user' },
    { id: 'plan', label: 'AI creates an implementation plan', owner: 'planner' },
    { id: 'identify', label: 'AI identifies relevant project files', owner: 'developer' },
    { id: 'propose', label: 'AI proposes changes', owner: 'developer' },
    { id: 'review', label: 'User reviews the proposed changes', owner: 'user' },
    { id: 'decide', label: 'User approves or rejects them', owner: 'user' },
    { id: 'apply', label: 'Approved changes are applied', owner: 'system' },
    { id: 'report', label: 'The application displays the outcome', owner: 'system' }
  ];

  var ROLES = [
    { id: 'planner', label: 'Planner', duty: 'Turn a task into a bounded implementation plan.' },
    { id: 'developer', label: 'Developer', duty: 'Identify files and propose concrete changes.' },
    { id: 'reviewer', label: 'Code Reviewer', duty: 'Inspect a proposal. Cannot approve it for the user.' },
    { id: 'debugger', label: 'Debugging Assistant', duty: 'Explain a failure after a real run. Not used in this build.' }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStages() {
    return clone(STAGES);
  }

  function getRoles() {
    return clone(ROLES);
  }

  function createTaskDraft(text, createId) {
    var task = String(text || '').trim();
    if (!task) {
      throw errors.createError('TASK_REQUIRED', 'A task description is required. No plan was created.');
    }
    if (task.length > 4000) {
      throw errors.createError('TASK_TOO_LONG', 'The task is longer than 4,000 characters. No plan was created.');
    }
    var id = createId ? createId('task') : 'task_draft';
    return {
      id: id,
      task: task,
      status: 'not-started',
      approval: 'pending',
      applied: false,
      stages: STAGES.map(function (stage) {
        return { id: stage.id, status: 'not-run' };
      })
    };
  }

  function startRun() {
    throw errors.createError(
      'ORCHESTRATION_DISABLED',
      'Orchestration is not implemented in Milestone 1. No model was called, no file was read, and no plan was generated.'
    );
  }

  function decide(draft, decision) {
    if (!draft || draft.applied) {
      throw errors.createError('INVALID_DRAFT', 'There is no active proposal to decide. Nothing was changed.');
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      throw errors.createError('INVALID_DECISION', 'Decision must be approved or rejected. Nothing was changed.');
    }
    draft.approval = decision;
    draft.status = decision === 'approved' ? 'approved-not-applied' : 'rejected';
    return draft;
  }

  function applyApproved(draft) {
    if (!draft || draft.approval !== 'approved') {
      throw errors.createError(
        'APPROVAL_REQUIRED',
        'File changes require an explicit approval. Nothing was applied.'
      );
    }
    throw errors.createError(
      'APPLY_NOT_IMPLEMENTED',
      'Approval was recorded on this draft only. Milestone 1 cannot modify files, so nothing was applied.'
    );
  }

  function createRunGuard(maxCalls) {
    var limit = typeof maxCalls === 'number' ? maxCalls : 0;
    var calls = 0;
    var cancelled = false;
    return {
      cancel: function () {
        cancelled = true;
      },
      assertCanCall: function () {
        if (cancelled) {
          throw errors.createError('CANCELLED', 'The run was cancelled. No further model call was made.');
        }
        if (calls >= limit) {
          throw errors.createError(
            'CALL_BUDGET_EXHAUSTED',
            'Model call budget is ' + limit + '. No further API call was made.'
          );
        }
        calls += 1;
      },
      snapshot: function () {
        return { calls: calls, cancelled: cancelled, maxCalls: limit };
      }
    };
  }

  function createDeadline(limitMs, now) {
    var clock = now || function () { return Date.now(); };
    var start = clock();
    return {
      assert: function () {
        if (clock() - start >= limitMs) {
          throw errors.createError(
            'TIMEOUT',
            'The stage exceeded its time limit. No further model call should be made.'
          );
        }
      }
    };
  }

  return {
    getStages: getStages,
    getRoles: getRoles,
    createTaskDraft: createTaskDraft,
    startRun: startRun,
    decide: decide,
    applyApproved: applyApproved,
    createRunGuard: createRunGuard,
    createDeadline: createDeadline
  };
});
