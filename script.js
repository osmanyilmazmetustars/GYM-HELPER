const form = document.getElementById("set-form");
const exerciseSelect = document.getElementById("exercise");
const weightInput = document.getElementById("weight");
const repsInput = document.getElementById("reps");
const addSetButton = document.getElementById("add-set");
const finishExerciseButton = document.getElementById("finish-exercise");
const logsContainer = document.getElementById("logs");
const emptyState = document.getElementById("empty-state");
const setCount = document.getElementById("set-count");
const clearHistoryButton = document.getElementById("clear-history");
const sessionView = document.getElementById("session-view");
const progressView = document.getElementById("progress-view");
const viewSessionButton = document.getElementById("view-session");
const viewProgressButton = document.getElementById("view-progress");
const progressFilter = document.getElementById("progress-filter");
const progressTableBody = document.getElementById("progress-table-body");
const pendingSetsContainer = document.getElementById("pending-sets");
const pendingCount = document.getElementById("pending-count");
const feedbackMessage = document.getElementById("feedback");
const toggleExerciseManager = document.getElementById("toggle-exercise-manager");
const exerciseManager = document.getElementById("exercise-manager");
const newExerciseInput = document.getElementById("new-exercise");
const addExerciseButton = document.getElementById("add-exercise");
const exerciseListContainer = document.getElementById("exercise-list");

const LOGS_STORAGE_KEY = "workoutTrackerLogs";
const EXERCISES_STORAGE_KEY = "workoutTrackerExercises";
const DEFAULT_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-Up",
  "Dumbbell Press",
  "Leg Press"
];

const workoutLogs = [];
const exerciseLibrary = [];
let pendingSets = [];
let feedbackTimer = null;

function normalizeExerciseName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function loadExercises() {
  const raw = localStorage.getItem(EXERCISES_STORAGE_KEY);
  if (!raw) {
    exerciseLibrary.push(...DEFAULT_EXERCISES);
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      exerciseLibrary.push(...DEFAULT_EXERCISES);
      return;
    }

    parsed.forEach((item) => {
      if (typeof item === "string" && item.trim()) {
        exerciseLibrary.push(normalizeExerciseName(item));
      }
    });
  } catch (error) {
    console.error("Failed to load exercise list.", error);
    exerciseLibrary.push(...DEFAULT_EXERCISES);
  }

  if (exerciseLibrary.length === 0) {
    exerciseLibrary.push(...DEFAULT_EXERCISES);
  }
}

function saveExercises() {
  localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(exerciseLibrary));
}

function loadLogs() {
  const raw = localStorage.getItem(LOGS_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    parsed.forEach((entry) => {
      if (
        entry &&
        typeof entry.exercise === "string" &&
        typeof entry.timestamp === "string" &&
        Array.isArray(entry.sets)
      ) {
        const validSets = entry.sets.filter(
          (set) => set && Number.isFinite(set.weight) && Number.isFinite(set.reps)
        );

        if (validSets.length > 0) {
          workoutLogs.push({
            exercise: normalizeExerciseName(entry.exercise),
            timestamp: entry.timestamp,
            sets: validSets
          });
        }
      }
    });
  } catch (error) {
    console.error("Failed to load workout history from storage.", error);
  }
}

function saveLogs() {
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(workoutLogs));
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (normalizedDate.getTime() === normalizedToday.getTime()) {
    return "Today";
  }

  if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function getDateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showFeedback(message, tone = "success") {
  feedbackMessage.textContent = message;
  feedbackMessage.classList.remove("text-emerald-400", "text-amber-400");
  feedbackMessage.classList.add(tone === "success" ? "text-emerald-400" : "text-amber-400");
  feedbackMessage.classList.add("opacity-100");
  feedbackMessage.classList.remove("opacity-0");

  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
  }

  feedbackTimer = setTimeout(() => {
    feedbackMessage.classList.remove("opacity-100");
    feedbackMessage.classList.add("opacity-0");
  }, 2200);
}

function renderExerciseOptions() {
  const previousValue = exerciseSelect.value;
  exerciseSelect.innerHTML = '<option value="">Select exercise</option>';

  exerciseLibrary.forEach((exercise) => {
    const option = document.createElement("option");
    option.value = exercise;
    option.textContent = exercise;
    exerciseSelect.appendChild(option);
  });

  const shouldKeepPrevious = exerciseLibrary.includes(previousValue);
  exerciseSelect.value = shouldKeepPrevious ? previousValue : "";
}

function renderExerciseManager() {
  exerciseListContainer.innerHTML = "";

  exerciseLibrary.forEach((exercise) => {
    const item = document.createElement("div");
    item.className = "inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1";

    const label = document.createElement("span");
    label.className = "text-xs text-zinc-200";
    label.textContent = exercise;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "rounded px-1 text-xs text-zinc-400 transition hover:text-red-300";
    deleteButton.textContent = "x";
    deleteButton.addEventListener("click", () => {
      const index = exerciseLibrary.indexOf(exercise);
      if (index === -1) {
        return;
      }

      exerciseLibrary.splice(index, 1);
      if (exerciseLibrary.length === 0) {
        exerciseLibrary.push(...DEFAULT_EXERCISES);
      }

      saveExercises();
      renderExerciseOptions();
      renderExerciseManager();
      renderProgressFilter();
      renderProgressTable();
      showFeedback(`Removed ${exercise}`, "success");
    });

    item.append(label, deleteButton);
    exerciseListContainer.appendChild(item);
  });
}

function renderPendingSets() {
  pendingSetsContainer.innerHTML = "";

  if (pendingSets.length === 0) {
    pendingSetsContainer.innerHTML = `
      <p class="rounded-lg border border-dashed border-zinc-600 p-3 text-sm text-zinc-400">
        No sets added yet. Add one or more sets, then click "Finish Exercise".
      </p>
    `;
    pendingCount.textContent = "0 sets";
    finishExerciseButton.disabled = true;
    finishExerciseButton.classList.add("opacity-60", "cursor-not-allowed");
    return;
  }

  const fragment = document.createDocumentFragment();

  pendingSets.forEach((set, index) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/70 px-3 py-2 text-sm";
    row.innerHTML = `
      <span class="text-zinc-200">Set ${index + 1}: ${set.weight}kg x ${set.reps}</span>
      <button type="button" class="rounded px-2 py-1 text-xs text-zinc-400 transition hover:text-red-300">Delete</button>
    `;

    const deleteButton = row.querySelector("button");
    deleteButton.addEventListener("click", () => {
      pendingSets.splice(index, 1);
      renderPendingSets();
      showFeedback("Pending set removed", "success");
    });

    fragment.appendChild(row);
  });

  pendingSetsContainer.appendChild(fragment);
  pendingCount.textContent = `${pendingSets.length} ${pendingSets.length === 1 ? "set" : "sets"}`;
  finishExerciseButton.disabled = false;
  finishExerciseButton.classList.remove("opacity-60", "cursor-not-allowed");
}

function renderSessionLogs() {
  logsContainer.innerHTML = "";

  if (workoutLogs.length === 0) {
    logsContainer.appendChild(emptyState);
    setCount.textContent = "0 workouts";
    return;
  }

  workoutLogs
    .slice()
    .reverse()
    .forEach((entry, reverseIndex) => {
      const sourceIndex = workoutLogs.length - 1 - reverseIndex;
      const totalVolume = entry.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

      const card = document.createElement("article");
      card.className = "rounded-xl border border-zinc-700 bg-zinc-900/70 p-3 shadow-sm shadow-black/20";

      const setsMarkup = entry.sets
        .map((set, setIndex) => `Set ${setIndex + 1}: ${set.weight}kg x ${set.reps}`)
        .join(" | ");

      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="font-medium text-zinc-100">${entry.exercise}</p>
            <p class="text-sm text-zinc-300">${setsMarkup}</p>
            <p class="text-xs text-zinc-500">Volume: ${totalVolume.toFixed(1)} kg</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-zinc-400">${formatDate(entry.timestamp)}</p>
            <p class="mt-1 text-xs text-zinc-500">${formatTime(entry.timestamp)}</p>
          </div>
        </div>
      `;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className =
        "mt-2 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 transition hover:border-red-500 hover:text-red-300";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        workoutLogs.splice(sourceIndex, 1);
        saveLogs();
        renderAllDataViews();
        showFeedback("Workout removed", "success");
      });

      card.appendChild(deleteButton);
      logsContainer.appendChild(card);
    });

  setCount.textContent = `${workoutLogs.length} ${workoutLogs.length === 1 ? "workout" : "workouts"}`;
}

function getProgressRows() {
  const grouped = new Map();
  const selected = progressFilter.value;

  workoutLogs.forEach((entry) => {
    if (selected !== "all" && entry.exercise !== selected) {
      return;
    }

    const key = `${getDateKey(entry.timestamp)}::${entry.exercise}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        timestamp: entry.timestamp,
        exercise: entry.exercise,
        sets: [],
        totalVolume: 0
      });
    }

    const row = grouped.get(key);
    entry.sets.forEach((set) => {
      row.sets.push(set);
      row.totalVolume += set.weight * set.reps;
    });
  });

  return [...grouped.values()]
    .map((row) => {
      const bestSet = row.sets.reduce(
        (best, current) => {
          if (current.weight > best.weight) {
            return current;
          }
          if (current.weight === best.weight && current.reps > best.reps) {
            return current;
          }
          return best;
        },
        { weight: 0, reps: 0 }
      );

      return {
        ...row,
        totalSets: row.sets.length,
        bestSet
      };
    })
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function renderProgressFilter() {
  const previousValue = progressFilter.value || "all";
  const uniqueExercises = [...new Set(workoutLogs.map((entry) => entry.exercise))].sort();

  progressFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Exercises";
  progressFilter.appendChild(allOption);

  uniqueExercises.forEach((exercise) => {
    const option = document.createElement("option");
    option.value = exercise;
    option.textContent = exercise;
    progressFilter.appendChild(option);
  });

  progressFilter.value = uniqueExercises.includes(previousValue) || previousValue === "all" ? previousValue : "all";
}

function renderProgressTable() {
  progressTableBody.innerHTML = "";
  const rows = getProgressRows();

  if (rows.length === 0) {
    progressTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-4 text-center text-sm text-zinc-400">
          No progress data found for this filter.
        </td>
      </tr>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "transition-colors hover:bg-zinc-800/40";
    tr.innerHTML = `
      <td class="px-3 py-2 text-zinc-200">
        <div>${formatDate(row.timestamp)}</div>
        <div class="text-xs text-zinc-500">${row.exercise}</div>
      </td>
      <td class="px-3 py-2 text-zinc-300">${row.totalSets}</td>
      <td class="px-3 py-2 text-zinc-300">${row.bestSet.weight}kg x ${row.bestSet.reps}</td>
      <td class="px-3 py-2 text-zinc-300">${row.totalVolume.toFixed(1)} kg</td>
    `;
    fragment.appendChild(tr);
  });

  progressTableBody.appendChild(fragment);
}

function renderAllDataViews() {
  renderSessionLogs();
  renderProgressFilter();
  renderProgressTable();
}

function setActiveView(view) {
  const showSession = view === "session";
  sessionView.classList.toggle("hidden", !showSession);
  progressView.classList.toggle("hidden", showSession);

  viewSessionButton.classList.toggle("bg-sky-600", showSession);
  viewSessionButton.classList.toggle("text-white", showSession);
  viewSessionButton.classList.toggle("text-zinc-300", !showSession);

  viewProgressButton.classList.toggle("bg-sky-600", !showSession);
  viewProgressButton.classList.toggle("text-white", !showSession);
  viewProgressButton.classList.toggle("text-zinc-300", showSession);
}

function handleAddSet() {
  const exercise = normalizeExerciseName(exerciseSelect.value);
  const weight = Number(weightInput.value);
  const reps = Number(repsInput.value);

  if (!exercise) {
    showFeedback("Select an exercise first", "warning");
    return;
  }

  if (Number.isNaN(weight) || Number.isNaN(reps) || weight <= 0 || reps <= 0) {
    showFeedback("Enter valid weight and reps", "warning");
    return;
  }

  pendingSets.push({ weight, reps });
  renderPendingSets();
  showFeedback("Set added", "success");
  weightInput.value = "";
  repsInput.value = "";
  weightInput.focus();
}

function handleFinishExercise(event) {
  event.preventDefault();
  const exercise = normalizeExerciseName(exerciseSelect.value);

  if (!exercise) {
    showFeedback("Choose an exercise", "warning");
    return;
  }

  if (pendingSets.length === 0) {
    showFeedback("Add at least one set before saving", "warning");
    return;
  }

  workoutLogs.push({
    exercise,
    timestamp: new Date().toISOString(),
    sets: pendingSets.map((set) => ({ ...set }))
  });

  pendingSets = [];
  saveLogs();
  renderPendingSets();
  renderAllDataViews();
  form.reset();
  exerciseSelect.value = exercise;
  showFeedback("Workout saved successfully", "success");
}

function handleAddExercise() {
  const normalized = normalizeExerciseName(newExerciseInput.value);
  if (!normalized) {
    return;
  }

  const exists = exerciseLibrary.some(
    (exercise) => exercise.toLowerCase() === normalized.toLowerCase()
  );

  if (exists) {
    showFeedback("Exercise already exists", "warning");
    return;
  }

  exerciseLibrary.push(normalized);
  exerciseLibrary.sort((a, b) => a.localeCompare(b));
  saveExercises();
  renderExerciseOptions();
  renderExerciseManager();
  newExerciseInput.value = "";
  showFeedback(`Added ${normalized}`, "success");
}

function initialize() {
  loadExercises();
  loadLogs();
  renderExerciseOptions();
  renderExerciseManager();
  renderPendingSets();
  renderAllDataViews();
  setActiveView("session");
}

addSetButton.addEventListener("click", handleAddSet);
form.addEventListener("submit", handleFinishExercise);

clearHistoryButton.addEventListener("click", () => {
  if (workoutLogs.length === 0) {
    return;
  }

  workoutLogs.length = 0;
  saveLogs();
  renderAllDataViews();
  showFeedback("History cleared", "success");
});

viewSessionButton.addEventListener("click", () => {
  setActiveView("session");
});

viewProgressButton.addEventListener("click", () => {
  setActiveView("progress");
});

progressFilter.addEventListener("change", () => {
  renderProgressTable();
});

toggleExerciseManager.addEventListener("click", () => {
  exerciseManager.classList.toggle("hidden");
});

addExerciseButton.addEventListener("click", handleAddExercise);

newExerciseInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleAddExercise();
  }
});

initialize();
