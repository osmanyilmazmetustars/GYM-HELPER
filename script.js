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
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authStatus = document.getElementById("auth-status");
const loginButton = document.getElementById("login-button");
const signupButton = document.getElementById("signup-button");
const logoutButton = document.getElementById("logout-button");
const appContent = document.getElementById("app-content");

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
let supabase = null;
let currentUser = null;

function normalizeExerciseName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function initializeSupabaseClient() {
  const config = window.SUPABASE_CONFIG || {};
  if (!config.url || !config.anonKey || config.url.includes("YOUR_PROJECT_ID")) {
    authStatus.textContent = "Add your Supabase credentials in supabase-config.js to enable sync.";
    return false;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    authStatus.textContent = "Supabase client failed to load.";
    return false;
  }

  supabase = window.supabase.createClient(config.url, config.anonKey);
  return true;
}

function setAppLockedState(isLocked) {
  appContent.classList.toggle("pointer-events-none", isLocked);
  appContent.classList.toggle("opacity-50", isLocked);
  addSetButton.disabled = isLocked;
  finishExerciseButton.disabled = isLocked || pendingSets.length === 0;
}

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle("text-red-300", isError);
  authStatus.classList.toggle("text-zinc-400", !isError);
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

async function loadExercisesFromDb() {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  exerciseLibrary.length = 0;
  data.forEach((item) => {
    if (item && typeof item.name === "string") {
      exerciseLibrary.push({ id: item.id, name: normalizeExerciseName(item.name) });
    }
  });
}

async function ensureDefaultExercises() {
  if (exerciseLibrary.length > 0) {
    return;
  }

  const payload = DEFAULT_EXERCISES.map((name) => ({
    user_id: currentUser.id,
    name
  }));

  const { error } = await supabase.from("exercises").insert(payload);
  if (error) {
    throw new Error(error.message);
  }

  await loadExercisesFromDb();
}

async function loadWorkoutLogsFromDb() {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, exercise_name, performed_at, sets_json")
    .order("performed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  workoutLogs.length = 0;
  data.forEach((row) => {
    if (!row || !Array.isArray(row.sets_json)) {
      return;
    }

    const sets = row.sets_json.filter(
      (set) => set && Number.isFinite(set.weight) && Number.isFinite(set.reps)
    );

    if (sets.length > 0) {
      workoutLogs.push({
        id: row.id,
        exercise: normalizeExerciseName(row.exercise_name),
        timestamp: row.performed_at,
        sets
      });
    }
  });
}

async function saveExerciseToDb(name) {
  const { error } = await supabase.from("exercises").insert({
    user_id: currentUser.id,
    name
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteExerciseFromDb(id) {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

async function saveWorkoutToDb(exercise, sets) {
  const payload = {
    user_id: currentUser.id,
    exercise_name: exercise,
    performed_at: new Date().toISOString(),
    sets_json: sets
  };

  const { error } = await supabase.from("workout_sessions").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

async function deleteWorkoutFromDb(id) {
  const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

async function clearHistoryFromDb() {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("user_id", currentUser.id);
  if (error) {
    throw new Error(error.message);
  }
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

function renderExerciseOptions() {
  const previousValue = exerciseSelect.value;
  exerciseSelect.innerHTML = '<option value="">Select exercise</option>';

  exerciseLibrary.forEach((exercise) => {
    const option = document.createElement("option");
    option.value = exercise.name;
    option.textContent = exercise.name;
    exerciseSelect.appendChild(option);
  });

  const exists = exerciseLibrary.some((exercise) => exercise.name === previousValue);
  exerciseSelect.value = exists ? previousValue : "";
}

function renderExerciseManager() {
  exerciseListContainer.innerHTML = "";

  exerciseLibrary.forEach((exercise) => {
    const item = document.createElement("div");
    item.className = "inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1";

    const label = document.createElement("span");
    label.className = "text-xs text-zinc-200";
    label.textContent = exercise.name;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "rounded px-1 text-xs text-zinc-400 transition hover:text-red-300";
    deleteButton.textContent = "x";
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteExerciseFromDb(exercise.id);
        await hydrateUserData();
        showFeedback(`Removed ${exercise.name}`, "success");
      } catch (error) {
        showFeedback(error.message, "warning");
      }
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

  workoutLogs.forEach((entry) => {
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
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteWorkoutFromDb(entry.id);
        await hydrateUserData();
        showFeedback("Workout removed", "success");
      } catch (error) {
        showFeedback(error.message, "warning");
      }
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
  renderExerciseOptions();
  renderExerciseManager();
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

async function hydrateUserData() {
  await loadExercisesFromDb();
  await ensureDefaultExercises();
  await loadWorkoutLogsFromDb();
  renderAllDataViews();
}

async function handleAuthState(session) {
  currentUser = session?.user || null;
  const isLoggedIn = Boolean(currentUser);

  logoutButton.classList.toggle("hidden", !isLoggedIn);
  setAppLockedState(!isLoggedIn);

  if (!isLoggedIn) {
    exerciseLibrary.length = 0;
    workoutLogs.length = 0;
    pendingSets = [];
    renderPendingSets();
    renderAllDataViews();
    setAuthStatus("Sign in to sync your workouts across devices.");
    return;
  }

  setAuthStatus(`Signed in as ${currentUser.email}`);
  await hydrateUserData();
}

async function signIn() {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    setAuthStatus("Email and password are required.", true);
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Signed in successfully.");
}

async function signUp() {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) {
    setAuthStatus("Email and password are required.", true);
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Sign-up complete. Check your email if confirmation is enabled.");
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  setAuthStatus("Signed out.");
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

async function handleFinishExercise(event) {
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

  try {
    await saveWorkoutToDb(exercise, pendingSets.map((set) => ({ ...set })));
    pendingSets = [];
    renderPendingSets();
    await hydrateUserData();
    form.reset();
    exerciseSelect.value = exercise;
    showFeedback("Workout saved successfully", "success");
  } catch (error) {
    showFeedback(error.message, "warning");
  }
}

async function handleAddExercise() {
  const normalized = normalizeExerciseName(newExerciseInput.value);
  if (!normalized) {
    return;
  }

  const exists = exerciseLibrary.some(
    (exercise) => exercise.name.toLowerCase() === normalized.toLowerCase()
  );
  if (exists) {
    showFeedback("Exercise already exists", "warning");
    return;
  }

  try {
    await saveExerciseToDb(normalized);
    newExerciseInput.value = "";
    await hydrateUserData();
    showFeedback(`Added ${normalized}`, "success");
  } catch (error) {
    showFeedback(error.message, "warning");
  }
}

async function initialize() {
  renderPendingSets();
  renderAllDataViews();
  setActiveView("session");
  setAppLockedState(true);

  if (!initializeSupabaseClient()) {
    return;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  await handleAuthState(data.session);
  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleAuthState(session);
  });
}

addSetButton.addEventListener("click", handleAddSet);
form.addEventListener("submit", handleFinishExercise);
clearHistoryButton.addEventListener("click", async () => {
  if (!workoutLogs.length) {
    return;
  }

  try {
    await clearHistoryFromDb();
    await hydrateUserData();
    showFeedback("History cleared", "success");
  } catch (error) {
    showFeedback(error.message, "warning");
  }
});
viewSessionButton.addEventListener("click", () => setActiveView("session"));
viewProgressButton.addEventListener("click", () => setActiveView("progress"));
progressFilter.addEventListener("change", () => renderProgressTable());
toggleExerciseManager.addEventListener("click", () => exerciseManager.classList.toggle("hidden"));
addExerciseButton.addEventListener("click", handleAddExercise);
newExerciseInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleAddExercise();
  }
});
loginButton.addEventListener("click", signIn);
signupButton.addEventListener("click", signUp);
logoutButton.addEventListener("click", signOut);

initialize();
