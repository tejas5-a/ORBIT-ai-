'use strict';

var assert = require('assert');
var errors = require('../services/errors');
var providers = require('../services/providers');
var pathGuard = require('../services/path-guard');
var filesystem = require('../services/filesystem-adapter');
var orchestration = require('../services/orchestration');
var shellStore = require('../services/shell-store');
var runtime = require('../services/runtime');
var compatibility = require('../services/compatibility');

var failed = 0;
var passed = 0;
var pending = [];

function test(name, fn) {
  pending.push({ name: name, fn: fn });
}

function rejectCode(promise) {
  return promise.then(function () {
    throw new Error('expected rejection');
  }, function (err) {
    return err;
  });
}

test('compatibility facts stay unselected and untested', function () {
  var facts = compatibility.getFacts();
  assert.strictEqual(facts.candidate.version, '0.72.0');
  assert.strictEqual(facts.candidate.chromium, '109.0.5414.87');
  assert.strictEqual(facts.candidate.node, '19.3.0');
  assert.strictEqual(facts.candidate.selected, false);
  assert.strictEqual(facts.candidate.packaged, false);
  assert.strictEqual(facts.target.tested, false);
  assert.strictEqual(facts.app.milestone, 1);
});

test('runtime detection does not treat plain Node as NW.js', function () {
  assert.strictEqual(runtime.detectRuntime().id, 'browser');
  assert.strictEqual(runtime.detectRuntime({ versions: { node: '19.3.0' } }).id, 'browser');
  assert.strictEqual(runtime.detectRuntime({ versions: { nw: '0.72.0' } }).id, 'nw');
  assert.strictEqual(runtime.detectRuntime({ nwApp: true }).canAccessDisk, false);
  assert.strictEqual(runtime.detectRuntime({ nwApp: true }).canCallModels, false);
  assert.strictEqual(runtime.detectRuntime({ nwApp: true }).canExecuteCommands, false);
});

test('providers keep distinct request contracts and never send', function () {
  var list = providers.listProviders();
  assert.strictEqual(list.length, 5);
  var styles = list.map(function (item) { return item.id + ':' + item.requestStyle; });
  assert.ok(styles.indexOf('anthropic:anthropic-messages') !== -1);
  assert.ok(styles.indexOf('gemini:gemini-generate-content') !== -1);
  assert.notStrictEqual(providers.getProvider('openai').requestStyle, providers.getProvider('anthropic').requestStyle);
  return rejectCode(providers.createAdapter('anthropic').send({ messages: [] })).then(function (err) {
    assert.strictEqual(err.code, 'ADAPTER_NOT_IMPLEMENTED');
    assert.ok(err.message.indexOf('No request was sent') !== -1);
    assert.ok(err.message.indexOf('api.anthropic.com') !== -1);
  });
});

test('unknown provider does not invent a call', function () {
  return rejectCode(providers.createAdapter('made-up').send()).then(function (err) {
    assert.strictEqual(err.code, 'UNKNOWN_PROVIDER');
    assert.ok(err.message.indexOf('No request was sent') !== -1);
  });
});

test('path guard contains only the selected project', function () {
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app\\src\\a.js').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:/work/app/src/a.js').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'c:\\WORK\\app\\src').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'src\\main.js').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app\\', 'C:\\work\\app\\src').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app-evil\\a.js').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app\\..\\secret').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app\\src\\..\\..\\..\\Windows').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'D:\\work\\app\\src').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app\\file.txt:stream').reason, 'illegal-char');
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app\\con.txt').reason, 'reserved-name');
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', 'C:\\work\\app\\a\0b').reason, 'null-byte');
  assert.strictEqual(pathGuard.isContainedPath('/home/user/proj', '/home/user/proj/src').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('/home/user/proj', '/home/user/project').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('/home/user/proj', '../proj/src').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('/home/user/proj', '../../etc/passwd').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('/home/user/proj', '/home/user/proj/../other').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('\\\\server\\share\\proj', '\\\\server\\share\\proj\\a.js').ok, true);
  assert.strictEqual(pathGuard.isContainedPath('\\\\server\\share\\proj', '\\\\server\\other\\proj\\a.js').ok, false);
  assert.strictEqual(pathGuard.isContainedPath('C:\\work\\app', '\\Windows\\system32').reason, 'drive-relative-rejected');
  assert.strictEqual(pathGuard.isContainedPath('notes', 'a.js').reason, 'root-not-absolute');
});

test('filesystem adapters refuse every disk operation', function () {
  var browser = filesystem.createBrowserFilesystemAdapter();
  var desktop = filesystem.createDesktopFilesystemAdapter();
  var selected = filesystem.selectFilesystemAdapter({ id: 'nw' });
  assert.strictEqual(browser.canAccessDisk, false);
  assert.strictEqual(desktop.canAccessDisk, false);
  assert.strictEqual(selected.id, 'desktop-nw-unimplemented');
  assert.strictEqual(filesystem.selectFilesystemAdapter({ id: 'browser' }).id, 'browser-preview');
  return Promise.all([
    rejectCode(browser.listTree({ path: 'C:\\work\\app' })),
    rejectCode(browser.writeFile({ path: 'C:\\work\\app\\a.js', contents: 'x' })),
    rejectCode(browser.deletePath({ path: 'C:\\work\\app\\a.js' })),
    rejectCode(desktop.readFile({ path: 'C:\\work\\app\\a.js' })),
    rejectCode(desktop.createFolder({ path: 'C:\\work\\app\\src' }))
  ]).then(function (errs) {
    errs.forEach(function (err) {
      assert.ok(err.code === 'DISK_UNAVAILABLE' || err.code === 'DISK_NOT_IMPLEMENTED');
      assert.ok(err.message.indexOf('No filesystem operation was performed') !== -1);
    });
  });
});

test('orchestration cannot start, loop, or apply without a real implementation', function () {
  assert.throws(function () { orchestration.startRun(); }, function (err) {
    return err.code === 'ORCHESTRATION_DISABLED' && err.message.indexOf('No model was called') !== -1;
  });
  var draft = orchestration.createTaskDraft('Add a readme section');
  assert.strictEqual(draft.stages.length, 8);
  assert.strictEqual(draft.stages[0].status, 'not-run');
  assert.throws(function () { orchestration.applyApproved(draft); }, function (err) {
    return err.code === 'APPROVAL_REQUIRED';
  });
  orchestration.decide(draft, 'rejected');
  assert.throws(function () { orchestration.applyApproved(draft); }, function (err) {
    return err.code === 'APPROVAL_REQUIRED';
  });
  var approved = orchestration.createTaskDraft('Rename a label');
  orchestration.decide(approved, 'approved');
  assert.throws(function () { orchestration.applyApproved(approved); }, function (err) {
    return err.code === 'APPLY_NOT_IMPLEMENTED' && err.message.indexOf('nothing was applied') !== -1;
  });
  var guard = orchestration.createRunGuard(0);
  assert.throws(function () { guard.assertCanCall(); }, function (err) {
    return err.code === 'CALL_BUDGET_EXHAUSTED';
  });
  assert.strictEqual(guard.snapshot().calls, 0);
  var limited = orchestration.createRunGuard(2);
  limited.assertCanCall();
  limited.assertCanCall();
  assert.throws(function () { limited.assertCanCall(); }, function (err) {
    return err.code === 'CALL_BUDGET_EXHAUSTED';
  });
  assert.strictEqual(limited.snapshot().calls, 2);
  var cancelled = orchestration.createRunGuard(3);
  cancelled.cancel();
  assert.throws(function () { cancelled.assertCanCall(); }, function (err) {
    return err.code === 'CANCELLED';
  });
  var clock = 0;
  var deadline = orchestration.createDeadline(1000, function () { return clock; });
  deadline.assert();
  clock = 1000;
  assert.throws(function () { deadline.assert(); }, function (err) {
    return err.code === 'TIMEOUT';
  });
  assert.strictEqual(orchestration.getRoles().length, 4);
});

test('catalog create never claims a disk path', function () {
  var store = shellStore.createShellStore(shellStore.createMemoryBackend(null), {
    now: function () { return '2026-10-13T04:00:00.000Z'; },
    createId: function (prefix) { return prefix + '_test1'; }
  });
  var project = store.createProject({ name: 'Orbit Notes', summary: 'Local only' });
  assert.strictEqual(project.diskPath, null);
  assert.strictEqual(project.fileCount, 0);
  assert.strictEqual(project.kind, 'local-index');
  assert.strictEqual(store.listProjects().length, 1);
  assert.ok(store.getState().activity[0].detail.indexOf('No folder was created') !== -1);
  assert.throws(function () { store.createProject({ name: 'orbit notes' }); }, function (err) {
    return err.code === 'NAME_DUPLICATE';
  });
  assert.throws(function () { store.createProject({ name: 'CON' }); }, function (err) {
    return err.code === 'NAME_RESERVED';
  });
  assert.throws(function () { store.createProject({ name: 'bad/name' }); }, function (err) {
    return err.code === 'NAME_INVALID';
  });
});

test('preferences drop secret fields and invalid theme values', function () {
  var store = shellStore.createShellStore(shellStore.createMemoryBackend(null));
  var prefs = store.updatePreferences({
    theme: 'neon',
    density: 'compact',
    displayName: '  Ada <script>  ',
    apiKey: 'sk-secret'
  });
  assert.strictEqual(prefs.theme, 'light');
  assert.strictEqual(prefs.density, 'compact');
  assert.strictEqual(prefs.displayName, 'Ada <script>');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(prefs, 'apiKey'), false);
  assert.strictEqual(store.exportSnapshot().apiKey, undefined);
});

test('import discards secrets and does not keep a forged disk path', function () {
  var backend = shellStore.createMemoryBackend(null);
  var store = shellStore.createShellStore(backend, {
    createId: function (prefix) { return prefix + '_keep'; }
  });
  store.createProject({ name: 'Keep Me' });
  assert.throws(function () {
    store.importSnapshot({ format: 'other', version: 1, projects: [], activity: [] });
  }, function (err) { return err.code === 'IMPORT_INVALID'; });
  assert.strictEqual(store.listProjects()[0].name, 'Keep Me');
  var result = store.importSnapshot({
    format: 'orbit-shell-export',
    version: 1,
    apiKeys: { openai: 'sk-live' },
    preferences: { theme: 'dark', displayName: 'Sam', apiKey: 'sk-nope' },
    projects: [{
      id: 'prj_imported1',
      name: 'Imported',
      summary: 'x',
      diskPath: 'C:\\secret',
      fileCount: 9,
      kind: 'disk'
    }],
    activity: []
  });
  assert.ok(result.warnings.length >= 1);
  var imported = store.getProject('prj_imported1');
  assert.strictEqual(imported.diskPath, null);
  assert.strictEqual(imported.fileCount, 0);
  assert.strictEqual(imported.kind, 'local-index');
  assert.strictEqual(store.getState().preferences.theme, 'dark');
  assert.strictEqual(store.getState().preferences.apiKey, undefined);
  assert.strictEqual(store.listProjects().some(function (item) { return item.name === 'Keep Me'; }), false);
});

test('unreadable storage is not overwritten until reset', function () {
  var writes = 0;
  var backend = {
    read: function () { return { version: 99, secrets: { apiKey: 'sk-keep' } }; },
    write: function () { writes += 1; }
  };
  var store = shellStore.createShellStore(backend);
  assert.strictEqual(store.writesBlocked(), true);
  assert.throws(function () { store.createProject({ name: 'Nope' }); }, function (err) {
    return err.code === 'STORAGE_BLOCKED';
  });
  assert.strictEqual(writes, 0);
  store.reset();
  assert.strictEqual(writes, 1);
  assert.strictEqual(store.writesBlocked(), false);
  assert.strictEqual(store.listProjects().length, 0);
});

test('remove and open record honest activity', function () {
  var store = shellStore.createShellStore(shellStore.createMemoryBackend(null), {
    createId: function (prefix) { return prefix + '_one'; }
  });
  var project = store.createProject({ name: 'Sample' });
  store.touchProject(project.id);
  assert.ok(store.getState().activity[0].detail.indexOf('No folder was read') !== -1);
  var renamed = store.renameProject(project.id, 'Sample Notes');
  assert.strictEqual(renamed.name, 'Sample Notes');
  assert.strictEqual(renamed.diskPath, null);
  assert.ok(store.getState().activity[0].detail.indexOf('No folder was renamed') !== -1);
  store.removeProject(project.id);
  assert.strictEqual(store.listProjects().length, 0);
  assert.ok(store.getState().activity[0].detail.indexOf('No disk file was deleted') !== -1);
});

test('error helper sets a stable code', function () {
  var err = errors.createError('DISK_UNAVAILABLE', 'nope');
  assert.strictEqual(err.code, 'DISK_UNAVAILABLE');
  assert.strictEqual(err.name, 'OrbitError');
});

Promise.resolve().then(function () {
  var chain = Promise.resolve();
  pending.forEach(function (item) {
    chain = chain.then(function () {
      return Promise.resolve().then(item.fn).then(function () {
        passed += 1;
        console.log('ok  ' + item.name);
      }, function (err) {
        failed += 1;
        console.error('FAIL ' + item.name);
        console.error(err && err.stack ? err.stack : err);
      });
    });
  });
  return chain;
}).then(function () {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
});
