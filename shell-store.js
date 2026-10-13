(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./errors'));
  } else {
    root.ORBIT = root.ORBIT || {};
    root.ORBIT.shellStore = factory(root.ORBIT.errors);
  }
})(typeof self !== 'undefined' ? self : this, function (errors) {
  'use strict';

  var STORAGE_KEY = 'orbit.shell.v1';
  var SECRET_KEYS = {
    apikey: 1,
    apikeys: 1,
    api_key: 1,
    secret: 1,
    secrets: 1,
    token: 1,
    tokens: 1,
    credentials: 1,
    authorization: 1,
    password: 1,
    accesskey: 1,
    privatekey: 1
  };
  var RESERVED = {
    CON: 1, PRN: 1, AUX: 1, NUL: 1,
    COM1: 1, COM2: 1, COM3: 1, COM4: 1, COM5: 1, COM6: 1, COM7: 1, COM8: 1, COM9: 1,
    LPT1: 1, LPT2: 1, LPT3: 1, LPT4: 1, LPT5: 1, LPT6: 1, LPT7: 1, LPT8: 1, LPT9: 1
  };

  function defaultState() {
    return {
      version: 1,
      preferences: {
        theme: 'light',
        density: 'comfortable',
        displayName: '',
        introRecorded: false
      },
      projects: [],
      activity: []
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanDisplayName(value) {
    return String(value || '')
      .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .trim()
      .slice(0, 40)
      .trim();
  }

  function validateProjectName(name) {
    var text = String(name || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();
    if (!text) {
      throw errors.createError('NAME_REQUIRED', 'A project name is required. Nothing was saved.');
    }
    if (text.length > 64) {
      throw errors.createError('NAME_TOO_LONG', 'Project names are limited to 64 characters. Nothing was saved.');
    }
    if (/[\\/:*?"<>|]/.test(text) || text === '.' || text === '..') {
      throw errors.createError('NAME_INVALID', 'That name is not allowed. Use letters, numbers, spaces, and simple punctuation. Nothing was saved.');
    }
    if (text.charAt(text.length - 1) === '.' || text.charAt(text.length - 1) === ' ') {
      throw errors.createError('NAME_INVALID', 'A project name cannot end with a space or period. Nothing was saved.');
    }
    var base = text.split('.')[0].toUpperCase();
    if (RESERVED[base]) {
      throw errors.createError('NAME_RESERVED', 'That name is reserved on Windows. Nothing was saved.');
    }
    return text;
  }

  function cleanSummary(value) {
    return String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
  }

  function activityEntry(now, type, title, detail) {
    return {
      id: 'act_' + Math.random().toString(36).slice(2, 10),
      at: now(),
      type: type,
      title: title,
      detail: detail || ''
    };
  }

  function sanitizePreferences(input, base) {
    var prefs = clone(base || defaultState().preferences);
    var source = input || {};
    if (source.theme === 'light' || source.theme === 'dark' || source.theme === 'system') {
      prefs.theme = source.theme;
    }
    if (source.density === 'comfortable' || source.density === 'compact') {
      prefs.density = source.density;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'displayName')) {
      prefs.displayName = cleanDisplayName(source.displayName);
    }
    if (source.introRecorded === true) prefs.introRecorded = true;
    if (source.introRecorded === false) prefs.introRecorded = false;
    return prefs;
  }

  function forceCatalogProject(raw, createId, now) {
    var name = validateProjectName(raw && raw.name);
    var id = raw && typeof raw.id === 'string' && /^prj_[a-z0-9]+$/.test(raw.id) ? raw.id : createId('prj');
    return {
      id: id,
      name: name,
      summary: cleanSummary(raw && raw.summary),
      createdAt: raw && raw.createdAt ? String(raw.createdAt) : now(),
      updatedAt: raw && raw.updatedAt ? String(raw.updatedAt) : now(),
      kind: 'local-index',
      diskPath: null,
      fileCount: 0
    };
  }

  function stripSecrets(value, warnings, depth) {
    if (!value || typeof value !== 'object' || depth > 6) return value;
    if (Object.prototype.toString.call(value) === '[object Array]') {
      return value.map(function (item) {
        return stripSecrets(item, warnings, depth + 1);
      });
    }
    var copy = {};
    Object.keys(value).forEach(function (key) {
      if (SECRET_KEYS[String(key).toLowerCase()]) {
        warnings.push('A field named "' + key + '" was discarded and not saved.');
        return;
      }
      copy[key] = stripSecrets(value[key], warnings, depth + 1);
    });
    return copy;
  }

  function createShellStore(backend, options) {
    if (!backend || typeof backend.read !== 'function' || typeof backend.write !== 'function') {
      throw errors.createError('STORAGE_BACKEND_REQUIRED', 'A storage backend is required.');
    }
    var opts = options || {};
    var now = opts.now || function () { return new Date().toISOString(); };
    var createId = opts.createId || function (prefix) {
      return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    };
    var state = defaultState();
    var fault = null;
    var blocked = false;

    function load() {
      var raw;
      try {
        raw = backend.read();
      } catch (err) {
        fault = err;
        blocked = true;
        state = defaultState();
        return;
      }
      if (raw == null) {
        state = defaultState();
        fault = null;
        blocked = false;
        return;
      }
      var checked = validateStored(raw);
      if (!checked.ok) {
        fault = checked.error;
        blocked = true;
        state = defaultState();
        return;
      }
      state = checked.state;
      fault = null;
      blocked = false;
    }

    function validateStored(raw) {
      try {
        if (!raw || raw.version !== 1 || !raw.preferences || !Array.isArray(raw.projects) || !Array.isArray(raw.activity)) {
          throw errors.createError('STORAGE_UNREADABLE', 'Saved shell data is not a version 1 ORBIT store.');
        }
        var next = defaultState();
        next.preferences = sanitizePreferences(raw.preferences, next.preferences);
        next.projects = raw.projects.map(function (item) {
          return forceCatalogProject(item, createId, now);
        });
        next.activity = raw.activity.slice(0, 40).map(function (item) {
          return {
            id: String(item.id || createId('act')),
            at: String(item.at || now()),
            type: String(item.type || 'note'),
            title: String(item.title || 'Activity'),
            detail: String(item.detail || '')
          };
        });
        return { ok: true, state: next };
      } catch (err) {
        return { ok: false, error: err };
      }
    }

    function commit(next) {
      if (blocked) {
        throw errors.createError(
          'STORAGE_BLOCKED',
          'Saved data could not be read, so ORBIT will not overwrite it. Reset local data to continue. No disk files were changed.'
        );
      }
      var draft = clone(next);
      draft.activity = draft.activity.slice(0, 40);
      try {
        backend.write(draft);
      } catch (err) {
        throw errors.createError(
          'STORAGE_WRITE_FAILED',
          'Local shell data could not be saved. Nothing was changed. ' + (err && err.message ? err.message : '')
        );
      }
      state = draft;
      fault = null;
    }

    function pushActivity(next, type, title, detail) {
      next.activity.unshift(activityEntry(now, type, title, detail));
    }

    load();

    return {
      storageKey: STORAGE_KEY,
      getState: function () { return clone(state); },
      getFault: function () { return fault; },
      writesBlocked: function () { return blocked; },
      reset: function () {
        var next = defaultState();
        next.preferences.introRecorded = true;
        pushActivity(next, 'data.reset', 'Local shell data was reset.', 'No files on disk were deleted.');
        backend.write(next);
        state = next;
        fault = null;
        blocked = false;
        return clone(state);
      },
      ensureIntro: function () {
        if (blocked || state.preferences.introRecorded) return false;
        var next = clone(state);
        next.preferences.introRecorded = true;
        pushActivity(
          next,
          'shell.started',
          'ORBIT shell opened for the first time on this profile.',
          'Milestone 1 is running. No folder was created and no model was contacted.'
        );
        commit(next);
        return true;
      },
      updatePreferences: function (patch) {
        var next = clone(state);
        next.preferences = sanitizePreferences(patch, next.preferences);
        commit(next);
        return clone(next.preferences);
      },
      listProjects: function () {
        return clone(state.projects).sort(function (a, b) {
          return a.updatedAt < b.updatedAt ? 1 : -1;
        });
      },
      getProject: function (id) {
        for (var i = 0; i < state.projects.length; i++) {
          if (state.projects[i].id === id) return clone(state.projects[i]);
        }
        return null;
      },
      renameProject: function (id, name) {
        var nextName = validateProjectName(name);
        var next = clone(state);
        var found = false;
        next.projects.forEach(function (item) {
          if (item.id !== id && item.name.toLowerCase() === nextName.toLowerCase()) {
            throw errors.createError('NAME_DUPLICATE', 'A catalog entry with that name already exists. Nothing was renamed.');
          }
        });
        next.projects.forEach(function (item) {
          if (item.id === id) {
            item.name = nextName;
            item.summary = item.summary;
            item.updatedAt = now();
            item.diskPath = null;
            item.fileCount = 0;
            found = true;
          }
        });
        if (!found) {
          throw errors.createError('PROJECT_NOT_FOUND', 'That catalog entry was not found. Nothing was renamed.');
        }
        pushActivity(next, 'project.renamed', 'Renamed a catalog entry to “' + nextName + '”.', 'No folder was renamed.');
        commit(next);
        return clone(next.projects.filter(function (item) { return item.id === id; })[0]);
      },
      createProject: function (input) {
        var name = validateProjectName(input && input.name);
        var duplicate = state.projects.some(function (item) {
          return item.name.toLowerCase() === name.toLowerCase();
        });
        if (duplicate) {
          throw errors.createError('NAME_DUPLICATE', 'A catalog entry with that name already exists. Nothing was saved.');
        }
        if (state.projects.length >= 40) {
          throw errors.createError('PROJECT_LIMIT', 'The local index is limited to 40 entries. Nothing was saved.');
        }
        var project = forceCatalogProject({
          name: name,
          summary: input && input.summary,
          createdAt: now(),
          updatedAt: now()
        }, createId, now);
        var next = clone(state);
        next.projects.unshift(project);
        pushActivity(next, 'project.created', 'Saved catalog entry “' + name + '”.', 'No folder was created on disk.');
        commit(next);
        return clone(project);
      },
      removeProject: function (id) {
        var existing = null;
        var next = clone(state);
        next.projects = next.projects.filter(function (item) {
          if (item.id === id) {
            existing = item;
            return false;
          }
          return true;
        });
        if (!existing) {
          throw errors.createError('PROJECT_NOT_FOUND', 'That catalog entry was not found. Nothing was removed.');
        }
        pushActivity(next, 'project.removed', 'Removed “' + existing.name + '” from the local index.', 'No disk file was deleted.');
        commit(next);
        return clone(existing);
      },
      touchProject: function (id) {
        var next = clone(state);
        var found = false;
        next.projects.forEach(function (item) {
          if (item.id === id) {
            item.updatedAt = now();
            item.diskPath = null;
            item.fileCount = 0;
            found = true;
          }
        });
        if (!found) {
          throw errors.createError('PROJECT_NOT_FOUND', 'That catalog entry was not found. No folder was opened.');
        }
        var name = next.projects.filter(function (item) { return item.id === id; })[0].name;
        pushActivity(next, 'project.opened', 'Opened catalog entry “' + name + '”.', 'No folder was read.');
        commit(next);
        return clone(next.projects.filter(function (item) { return item.id === id; })[0]);
      },
      exportSnapshot: function () {
        return {
          format: 'orbit-shell-export',
          version: 1,
          exportedAt: now(),
          preferences: clone(state.preferences),
          projects: clone(state.projects),
          activity: clone(state.activity)
        };
      },
      importSnapshot: function (data) {
        var warnings = [];
        var cleaned = stripSecrets(data, warnings, 0);
        if (!cleaned || cleaned.format !== 'orbit-shell-export' || cleaned.version !== 1) {
          throw errors.createError('IMPORT_INVALID', 'That file is not an ORBIT shell export. Current data was left unchanged.');
        }
        if (!Array.isArray(cleaned.projects) || !Array.isArray(cleaned.activity)) {
          throw errors.createError('IMPORT_INVALID', 'The export is missing projects or activity. Current data was left unchanged.');
        }
        var next = defaultState();
        next.preferences = sanitizePreferences(cleaned.preferences, next.preferences);
        next.preferences.introRecorded = true;
        var seen = {};
        next.projects = cleaned.projects.map(function (item) {
          var project = forceCatalogProject(item, createId, now);
          var key = project.name.toLowerCase();
          if (seen[key]) {
            throw errors.createError('IMPORT_INVALID', 'The export contains duplicate project names. Current data was left unchanged.');
          }
          seen[key] = 1;
          return project;
        });
        if (next.projects.length > 40) {
          throw errors.createError('IMPORT_INVALID', 'The export has more than 40 projects. Current data was left unchanged.');
        }
        next.activity = (cleaned.activity || []).slice(0, 39).map(function (item) {
          return {
            id: String(item.id || createId('act')),
            at: String(item.at || now()),
            type: String(item.type || 'note').slice(0, 40),
            title: String(item.title || 'Imported activity').slice(0, 180),
            detail: String(item.detail || '').slice(0, 300)
          };
        });
        pushActivity(next, 'data.imported', 'Imported shell data.', warnings.length ? 'Discarded secret fields were not saved.' : 'No API keys were present.');
        commit(next);
        return { warnings: warnings };
      }
    };
  }

  function createMemoryBackend(initial) {
    var value = initial === undefined ? null : clone(initial);
    return {
      read: function () { return value == null ? null : clone(value); },
      write: function (data) { value = clone(data); }
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    createShellStore: createShellStore,
    createMemoryBackend: createMemoryBackend,
    validateProjectName: validateProjectName
  };
});
