'use strict';

const { todayISO, asUserId, b24 } = require('./b24');
const sixStaffList = require('./six-staff-list');
const recordsStore = require('./records-store');

const TASK_STATUS_OPEN = 0;
const DELEGATE_CHUNK = 20;
const COMMENT_MAX = 480;

async function listOpenTasksForUser(webhook, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];

  const tasks = [];
  let start = 0;
  for (;;) {
    const data = await b24(webhook, 'bizproc.task.list', {
      filter: { USER_ID: uid, STATUS: TASK_STATUS_OPEN },
      select: ['ID', 'USER_ID', 'NAME', 'WORKFLOW_ID', 'DOCUMENT_NAME', 'DOCUMENT_URL'],
      order: { ID: 'ASC' },
      start: start,
    });
    const page = Array.isArray(data.result) ? data.result : [];
    tasks.push.apply(tasks, page);
    if (data.next == null) break;
    start = data.next;
  }
  return tasks;
}

function taskBrief(task) {
  return {
    id: String(task.ID != null ? task.ID : task.id || ''),
    name: String(task.NAME || task.DOCUMENT_NAME || 'Задание БП').trim(),
    workflowId: task.WORKFLOW_ID != null ? String(task.WORKFLOW_ID) : '',
    documentUrl: task.DOCUMENT_URL ? String(task.DOCUMENT_URL) : '',
  };
}

function tasksToBriefs(tasks) {
  return (tasks || []).map(taskBrief);
}

async function delegateTasks(webhook, taskIds, fromUserId, toUserId) {
  const ids = (taskIds || [])
    .map(function (id) {
      return Number(id);
    })
    .filter(function (id) {
      return Number.isFinite(id) && id > 0;
    });
  if (!ids.length) {
    return { ok: true, delegated: 0, skipped: true, failedTaskIds: [] };
  }

  const fromId = Number(fromUserId);
  const toId = Number(toUserId);
  if (!Number.isFinite(fromId) || !Number.isFinite(toId)) {
    throw new Error('Некорректные FROM_USER_ID / TO_USER_ID');
  }
  if (fromId === toId) {
    return { ok: true, delegated: 0, skipped: true, reason: 'same_user', failedTaskIds: [] };
  }

  let delegated = 0;
  const errors = [];
  const failedTaskIds = [];

  for (let i = 0; i < ids.length; i += DELEGATE_CHUNK) {
    const chunk = ids.slice(i, i + DELEGATE_CHUNK);
    try {
      await b24(webhook, 'bizproc.task.delegate', {
        TASK_IDS: chunk,
        FROM_USER_ID: fromId,
        TO_USER_ID: toId,
      });
      delegated += chunk.length;
    } catch (err) {
      if (chunk.length === 1) {
        failedTaskIds.push(String(chunk[0]));
        errors.push({
          taskIds: [String(chunk[0])],
          code: err.code || 'ERROR',
          message: err.message || String(err),
        });
        continue;
      }
      for (let j = 0; j < chunk.length; j++) {
        const oneId = chunk[j];
        try {
          await b24(webhook, 'bizproc.task.delegate', {
            TASK_IDS: [oneId],
            FROM_USER_ID: fromId,
            TO_USER_ID: toId,
          });
          delegated += 1;
        } catch (oneErr) {
          failedTaskIds.push(String(oneId));
          errors.push({
            taskIds: [String(oneId)],
            code: oneErr.code || 'ERROR',
            message: oneErr.message || String(oneErr),
          });
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    delegated: delegated,
    errors: errors.length ? errors : undefined,
    failedTaskIds: failedTaskIds,
  };
}

function buildDelegationComment(ok, stuckTasks, delegateErrors) {
  if (ok) return 'ок';

  const parts = [];
  if (stuckTasks && stuckTasks.length) {
    stuckTasks.forEach(function (t) {
      parts.push('«' + t.name + '» (#' + t.id + ')');
    });
  }

  let text = 'Не делегировано';
  if (parts.length) text += ': ' + parts.join('; ');
  else text += ' — задания остались у отпускника';

  if (delegateErrors && delegateErrors.length) {
    const errText = delegateErrors
      .map(function (e) {
        return e.message;
      })
      .filter(Boolean)
      .join('; ');
    if (errText) text += '. ' + errText;
  }

  if (text.length > COMMENT_MAX) return text.slice(0, COMMENT_MAX - 1) + '…';
  return text;
}

async function persistDelegationReport(webhook, vacation, report) {
  if (!recordsStore.usesList(webhook) || !vacation || !vacation.id) return null;

  const meta = Object.assign({}, vacation.meta || {}, {
    delegationReport: {
      checkedAt: report.checkedAt,
      ok: report.ok,
      employeeOpenCount: report.employeeOpenCount,
      deputyOpenCount: report.deputyOpenCount,
      stuckTasks: report.stuckTasks,
      delegateAttempted: report.delegateAttempted,
      delegateErrors: report.delegateErrors || [],
    },
  });

  if (report.ok) {
    delete meta.lastDelegationError;
    delete meta.lastDelegationErrorAt;
  } else {
    meta.lastDelegationError = report.comment;
    meta.lastDelegationErrorAt = report.checkedAt;
  }

  return recordsStore.updatePlan(webhook, vacation.id, {
    comment: report.comment,
    meta: meta,
  });
}

async function listActiveVacations(webhook, today) {
  if (!recordsStore.usesList(webhook)) {
    throw new Error('Делегирование cron: нужен УС #276 (six-staff-list.json)');
  }
  return sixStaffList.listActiveVacations(webhook, today || todayISO());
}

async function processVacationDelegation(webhook, options) {
  const opts = options || {};
  const today = opts.today || todayISO();
  const dryRun = !!opts.dryRun;

  const vacations = await listActiveVacations(webhook, today);
  const results = [];
  let totalDelegated = 0;
  let totalTasks = 0;
  let totalOk = 0;
  let totalIssues = 0;

  for (let i = 0; i < vacations.length; i++) {
    const vac = vacations[i];
    const fromId = asUserId(vac.userId);
    const toId = asUserId(vac.replacementId);
    const checkedAt = new Date().toISOString();
    const entry = {
      recordId: vac.id,
      userId: fromId,
      deputyId: toId,
      dateFrom: vac.date,
      dateTo: vac.dateTo || '',
      status: 'skipped',
      delegationOk: null,
      tasksFound: 0,
      delegated: 0,
      employeeOpenCount: 0,
      deputyOpenCount: 0,
      stuckTasks: [],
      comment: '',
      message: '',
    };

    if (!fromId || !toId) {
      entry.status = 'error';
      entry.delegationOk = false;
      entry.comment = 'Нет userId или replacementId';
      entry.message = entry.comment;
      totalIssues += 1;
      results.push(entry);
      if (!dryRun) {
        await persistDelegationReport(webhook, vac, {
          checkedAt: checkedAt,
          ok: false,
          comment: entry.comment,
          employeeOpenCount: 0,
          deputyOpenCount: 0,
          stuckTasks: [],
          delegateAttempted: 0,
          delegateErrors: [{ message: entry.comment }],
        });
      }
      continue;
    }

    try {
      const tasksBefore = await listOpenTasksForUser(webhook, fromId);
      entry.tasksFound = tasksBefore.length;
      totalTasks += tasksBefore.length;

      let delegateResult = { delegated: 0, errors: undefined, failedTaskIds: [] };
      if (!dryRun && tasksBefore.length) {
        const taskIds = tasksBefore.map(function (t) {
          return t.ID;
        });
        delegateResult = await delegateTasks(webhook, taskIds, fromId, toId);
        entry.delegated = delegateResult.delegated || 0;
        totalDelegated += entry.delegated;
      } else if (dryRun && tasksBefore.length) {
        entry.delegated = 0;
      }

      const tasksAfterEmployee = dryRun ? tasksBefore : await listOpenTasksForUser(webhook, fromId);
      const tasksAfterDeputy = dryRun ? [] : await listOpenTasksForUser(webhook, toId);

      entry.employeeOpenCount = tasksAfterEmployee.length;
      entry.deputyOpenCount = tasksAfterDeputy.length;
      entry.stuckTasks = dryRun ? tasksToBriefs(tasksBefore) : tasksToBriefs(tasksAfterEmployee);

      const delegateErrors = delegateResult.errors || [];
      const ok = entry.employeeOpenCount === 0;
      entry.delegationOk = ok;
      entry.comment = buildDelegationComment(ok, entry.stuckTasks, delegateErrors);

      if (dryRun) {
        entry.status = 'dry_run';
        entry.message = ok ? 'dry-run: ок' : 'dry-run: ' + entry.comment;
      } else if (ok) {
        entry.status = 'ok';
        entry.message = 'ок';
        totalOk += 1;
      } else {
        entry.status = 'issue';
        entry.message = entry.comment;
        if (delegateErrors.length) entry.errors = delegateErrors;
        totalIssues += 1;
      }

      if (!dryRun) {
        await persistDelegationReport(webhook, vac, {
          checkedAt: checkedAt,
          ok: ok,
          comment: entry.comment,
          employeeOpenCount: entry.employeeOpenCount,
          deputyOpenCount: entry.deputyOpenCount,
          stuckTasks: entry.stuckTasks,
          delegateAttempted: entry.delegated,
          delegateErrors: delegateErrors,
        });
      }
    } catch (err) {
      entry.status = 'error';
      entry.delegationOk = false;
      entry.message = err && err.message ? err.message : String(err);
      entry.comment = entry.message;
      if (err.code) entry.code = err.code;
      totalIssues += 1;

      if (!dryRun) {
        await persistDelegationReport(webhook, vac, {
          checkedAt: checkedAt,
          ok: false,
          comment: entry.comment,
          employeeOpenCount: entry.employeeOpenCount,
          deputyOpenCount: entry.deputyOpenCount,
          stuckTasks: entry.stuckTasks,
          delegateAttempted: entry.delegated,
          delegateErrors: [{ code: entry.code, message: entry.message }],
        });
      }
    }

    results.push(entry);
  }

  return {
    ok: totalIssues === 0,
    today: today,
    dryRun: dryRun,
    activeVacations: vacations.length,
    totalTasks: totalTasks,
    totalDelegated: totalDelegated,
    totalOk: totalOk,
    totalIssues: totalIssues,
    results: results,
  };
}

module.exports = {
  TASK_STATUS_OPEN,
  listOpenTasksForUser,
  delegateTasks,
  listActiveVacations,
  processVacationDelegation,
  buildDelegationComment,
  persistDelegationReport,
  tasksToBriefs,
};
