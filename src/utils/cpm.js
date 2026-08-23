// cpm.js - Critical Path Method Engine
import { addWorkingDays } from './calendar';

export function calculateCriticalPath(tasks, dependencies, targetTaskId = null, useRiskDuration = false, projectStartDate = new Date(), calendarSettings = {}) {
  if (!tasks || tasks.length === 0) return { tasks: [] };

  const taskMap = new Map();
  tasks.forEach(t => {
    taskMap.set(String(t.id), {
      ...t,
      id: String(t.id),
      duration: useRiskDuration && t.riskDuration !== undefined ? (parseFloat(t.riskDuration) || 0) : (parseFloat(t.duration) || 0),
      originalDuration: parseFloat(t.duration) || 0,
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: Infinity,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false,
      predecessors: [],
      successors: [],
      earlyStartDate: null,
      earlyFinishDate: null,
      lateStartDate: null,
      lateFinishDate: null
    });
  });

  // Build graph
  dependencies.forEach(dep => {
    const source = taskMap.get(String(dep.source));
    const target = taskMap.get(String(dep.target));
    if (source && target && source !== target) {
      target.predecessors.push({ task: source, type: dep.type });
      source.successors.push({ task: target, type: dep.type });
    }
  });

  const allTasks = Array.from(taskMap.values());

  // Topological Sort (iterative / safe)
  const inDegree = new Map();
  allTasks.forEach(t => inDegree.set(t.id, t.predecessors.length));

  const queue = allTasks.filter(t => inDegree.get(t.id) === 0);
  const sorted = [];

  while (queue.length > 0) {
    const task = queue.shift();
    sorted.push(task);

    task.successors.forEach(succ => {
      const nextId = succ.task.id;
      const deg = (inDegree.get(nextId) || 1) - 1;
      inDegree.set(nextId, deg);
      if (deg === 0) {
        queue.push(succ.task);
      }
    });
  }

  // If cyclic or disconnected parts exist, append remaining
  if (sorted.length < allTasks.length) {
    allTasks.forEach(t => {
      if (!sorted.includes(t)) sorted.push(t);
    });
  }

  // Forward Pass
  sorted.forEach(task => {
    let maxES = 0;
    task.predecessors.forEach(pred => {
      if (pred.task.earlyFinish > maxES) {
        maxES = pred.task.earlyFinish;
      }
    });
    task.earlyStart = maxES;
    task.earlyFinish = task.earlyStart + (task.duration || 0);

    task.earlyStartDate = addWorkingDays(projectStartDate, task.earlyStart, calendarSettings);
    task.earlyFinishDate = addWorkingDays(projectStartDate, task.earlyFinish, calendarSettings);
  });

  const projectDuration = sorted.length > 0 ? Math.max(...sorted.map(t => t.earlyFinish || 0), 0) : 0;

  // Backward Pass
  for (let i = sorted.length - 1; i >= 0; i--) {
    const task = sorted[i];
    let minLF = Infinity;

    if (targetTaskId) {
      if (String(task.id) === String(targetTaskId)) {
        minLF = task.earlyFinish;
      } else {
        task.successors.forEach(succ => {
          if (succ.task.lateStart < minLF) {
            minLF = succ.task.lateStart;
          }
        });
      }
    } else {
      if (task.successors.length === 0) {
        minLF = projectDuration;
      } else {
        task.successors.forEach(succ => {
          if (succ.task.lateStart < minLF) {
            minLF = succ.task.lateStart;
          }
        });
      }
    }

    if (!isFinite(minLF) || isNaN(minLF)) {
      minLF = task.earlyFinish;
    }

    task.lateFinish = minLF;
    task.lateStart = Math.max(0, task.lateFinish - (task.duration || 0));
    task.totalFloat = Math.max(0, task.lateStart - task.earlyStart);

    task.lateStartDate = isFinite(task.lateStart) ? addWorkingDays(projectStartDate, task.lateStart, calendarSettings) : task.earlyStartDate;
    task.lateFinishDate = isFinite(task.lateFinish) ? addWorkingDays(projectStartDate, task.lateFinish, calendarSettings) : task.earlyFinishDate;
  }

  // Criticality levels
  const reachableTasks = allTasks.filter(t => isFinite(t.totalFloat) && !isNaN(t.totalFloat));
  const uniqueFloats = [...new Set(reachableTasks.map(t => Math.max(0, Math.round(t.totalFloat * 100) / 100)))].sort((a, b) => a - b);
  const primaryFloat = uniqueFloats.length > 0 ? uniqueFloats[0] : 0;
  const secondaryFloat = uniqueFloats.length > 1 ? uniqueFloats[1] : null;
  const tertiaryFloat = uniqueFloats.length > 2 ? uniqueFloats[2] : null;

  allTasks.forEach(t => {
    const roundedFloat = Math.round(t.totalFloat * 100) / 100;
    if (roundedFloat === primaryFloat) {
      t.criticality = 1;
      t.isCritical = true;
    } else if (roundedFloat === secondaryFloat) {
      t.criticality = 2;
      t.isCritical = false;
    } else if (roundedFloat === tertiaryFloat) {
      t.criticality = 3;
      t.isCritical = false;
    } else {
      t.criticality = null;
      t.isCritical = false;
    }
  });

  // Rollup summary tasks
  const rollupSummaryTasks = () => {
    for (let i = 0; i < allTasks.length; i++) {
      const task = allTasks[i];
      if (task && task.isSummary) {
        const level = task.outlineLevel ?? 1;
        const children = [];
        for (let j = i + 1; j < allTasks.length; j++) {
          const child = allTasks[j];
          if (!child) continue;
          const childLevel = child.outlineLevel ?? 1;
          if (childLevel <= level) break;
          if (childLevel === level + 1) {
            children.push(child);
          }
        }
        task.children = children;
      }
    }

    const maxLevel = Math.max(...allTasks.map(t => t.outlineLevel ?? 1), 0);
    for (let level = maxLevel; level >= 0; level--) {
      for (const task of allTasks) {
        if (task.isSummary && (task.outlineLevel ?? 1) === level) {
          if (task.children && task.children.length > 0) {
            const validES = task.children.map(c => c.earlyStart).filter(v => isFinite(v));
            const validEF = task.children.map(c => c.earlyFinish).filter(v => isFinite(v));
            const validLS = task.children.map(c => c.lateStart).filter(v => isFinite(v));
            const validLF = task.children.map(c => c.lateFinish).filter(v => isFinite(v));

            if (validES.length > 0) task.earlyStart = Math.min(...validES);
            if (validEF.length > 0) task.earlyFinish = Math.max(...validEF);
            if (validLS.length > 0) task.lateStart = Math.min(...validLS);
            if (validLF.length > 0) task.lateFinish = Math.max(...validLF);

            task.duration = Math.max(0, task.earlyFinish - task.earlyStart);

            const validESDates = task.children.map(c => c.earlyStartDate?.getTime()).filter(t => t && isFinite(t));
            const validEFDates = task.children.map(c => c.earlyFinishDate?.getTime()).filter(t => t && isFinite(t));
            const validLSDates = task.children.map(c => c.lateStartDate?.getTime()).filter(t => t && isFinite(t));
            const validLFDates = task.children.map(c => c.lateFinishDate?.getTime()).filter(t => t && isFinite(t));

            if (validESDates.length > 0) task.earlyStartDate = new Date(Math.min(...validESDates));
            if (validEFDates.length > 0) task.earlyFinishDate = new Date(Math.max(...validEFDates));
            if (validLSDates.length > 0) task.lateStartDate = new Date(Math.min(...validLSDates));
            if (validLFDates.length > 0) task.lateFinishDate = new Date(Math.max(...validLFDates));

            const floats = task.children.map(c => c.totalFloat).filter(f => isFinite(f));
            task.totalFloat = floats.length > 0 ? Math.min(...floats) : 0;
            const crits = task.children.map(c => c.criticality).filter(c => c !== null && c !== undefined);
            task.criticality = crits.length > 0 ? Math.min(...crits) : null;
            task.isCritical = task.criticality === 1;
          }
        }
      }
    }
  };

  rollupSummaryTasks();

  return {
    tasks: allTasks,
    projectDuration,
    projectStartDate,
    projectFinishDate: addWorkingDays(projectStartDate, projectDuration, calendarSettings)
  };
}
