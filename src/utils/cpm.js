// cpm.js - Critical Path Method Engine

export function calculateCriticalPath(tasks, dependencies, targetTaskId = null, useRiskDuration = false) {
  if (!tasks || tasks.length === 0) return { tasks: [] };

  // Create a map for quick lookup
  const taskMap = new Map();
  tasks.forEach(t => {
    taskMap.set(t.id, {
      ...t,
      duration: useRiskDuration && t.riskDuration !== undefined ? parseFloat(t.riskDuration) : (parseFloat(t.duration) || 0),
      originalDuration: parseFloat(t.duration) || 0,
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: Infinity,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false,
      predecessors: [],
      successors: []
    });
  });

  // Build the graph
  dependencies.forEach(dep => {
    const source = taskMap.get(dep.source);
    const target = taskMap.get(dep.target);
    if (source && target) {
      target.predecessors.push({ task: source, type: dep.type });
      source.successors.push({ task: target, type: dep.type });
    }
  });

  const allTasks = Array.from(taskMap.values());

  // Topological Sort
  const sorted = [];
  const visited = new Set();
  const temp = new Set();

  function visit(task) {
    if (temp.has(task.id)) throw new Error('Cyclic dependency detected');
    if (!visited.has(task.id)) {
      temp.add(task.id);
      task.predecessors.forEach(p => visit(p.task));
      temp.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    }
  }

  try {
    allTasks.forEach(t => {
      if (!visited.has(t.id)) visit(t);
    });
  } catch (e) {
    console.error(e);
    return { error: 'Schedule contains cyclic dependencies.' };
  }

  // Forward Pass (Calculate Early Start / Early Finish)
  sorted.forEach(task => {
    let maxES = 0;
    task.predecessors.forEach(pred => {
      // Assuming Finish-to-Start (FS) for simplicity right now
      if (pred.task.earlyFinish > maxES) {
        maxES = pred.task.earlyFinish;
      }
    });
    task.earlyStart = maxES;
    task.earlyFinish = task.earlyStart + task.duration;
  });

  const projectDuration = sorted.length > 0 ? Math.max(...sorted.map(t => t.earlyFinish)) : 0;

  // Backward Pass (Calculate Late Start / Late Finish)
  // Traverse in reverse topological order
  for (let i = sorted.length - 1; i >= 0; i--) {
    const task = sorted[i];
    let minLF = Infinity;
    
    if (targetTaskId) {
      if (task.id === targetTaskId) {
        minLF = task.earlyFinish; // Force float to 0 on target
      } else {
        task.successors.forEach(succ => {
          if (succ.task.lateStart < minLF) {
            minLF = succ.task.lateStart;
          }
        });
      }
    } else {
      minLF = projectDuration;
      task.successors.forEach(succ => {
        if (succ.task.lateStart < minLF) {
          minLF = succ.task.lateStart;
        }
      });
    }
    
    task.lateFinish = minLF;
    task.lateStart = task.lateFinish - task.duration;
    
    // Float
    task.totalFloat = task.lateStart - task.earlyStart;
  }

  // Determine criticality levels (ignore Infinity and negative floats)
  const reachableTasks = allTasks.filter(t => t.totalFloat !== Infinity && isFinite(t.totalFloat));
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

  return {
    tasks: allTasks,
    projectDuration
  };
}
