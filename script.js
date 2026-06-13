const MODES = {
  focus: { label: "Focus", input: "focusMinutes", accent: "#d94f45" },
  short: { label: "Short break", input: "shortMinutes", accent: "#2f7d62" },
  long: { label: "Long break", input: "longMinutes", accent: "#326a94" },
};

const DEFAULTS = {
  focusMinutes: 25,
  shortMinutes: 5,
  longMinutes: 15,
  cyclesBeforeLong: 4,
  sound: true,
  task: "",
  tasks: [],
  statsDate: todayKey(),
  completed: 0,
  minutesDone: 0,
};

const state = {
  mode: "focus",
  running: false,
  remaining: DEFAULTS.focusMinutes * 60,
  total: DEFAULTS.focusMinutes * 60,
  interval: null,
  settings: loadState(),
};

const elements = {
  time: document.querySelector("#timeDisplay"),
  modeLabel: document.querySelector("#modeLabel"),
  startPause: document.querySelector("#startPause"),
  reset: document.querySelector("#resetTimer"),
  skip: document.querySelector("#skipTimer"),
  ring: document.querySelector("#ringValue"),
  ringMarker: document.querySelector("#ringMarker"),
  modeButtons: document.querySelectorAll(".mode-button"),
  sound: document.querySelector("#soundToggle"),
  focusMinutes: document.querySelector("#focusMinutes"),
  shortMinutes: document.querySelector("#shortMinutes"),
  longMinutes: document.querySelector("#longMinutes"),
  cyclesBeforeLong: document.querySelector("#cyclesBeforeLong"),
  restoreDefaults: document.querySelector("#restoreDefaults"),
  resetRounds: document.querySelector("#resetRounds"),
  taskInput: document.querySelector("#taskInput"),
  completedCount: document.querySelector("#completedCount"),
  focusMinutesDone: document.querySelector("#focusMinutesDone"),
  cycleDots: document.querySelector("#cycleDots"),
  taskForm: document.querySelector("#taskForm"),
  newTask: document.querySelector("#newTask"),
  taskList: document.querySelector("#taskList"),
  clearTasks: document.querySelector("#clearTasks"),
};

ensureCurrentDay();
applySettingsToInputs();
switchMode("focus", true);
renderTasks();
renderStats();

elements.startPause.addEventListener("click", toggleTimer);
elements.reset.addEventListener("click", () => resetTimer());
elements.skip.addEventListener("click", completeSession);
elements.sound.addEventListener("click", toggleSound);
elements.restoreDefaults.addEventListener("click", restoreDefaults);
elements.resetRounds.addEventListener("click", resetRounds);
elements.taskInput.addEventListener("input", updateFocusTask);
elements.taskForm.addEventListener("submit", addTask);
elements.clearTasks.addEventListener("click", clearTasks);

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

["focusMinutes", "shortMinutes", "longMinutes", "cyclesBeforeLong"].forEach((key) => {
  elements[key].addEventListener("change", () => updateSetting(key));
});

function toggleTimer() {
  state.running ? pauseTimer() : startTimer();
}

function startTimer() {
  state.running = true;
  elements.startPause.textContent = "Pause";
  state.interval = window.setInterval(tick, 250);
}

function pauseTimer() {
  state.running = false;
  elements.startPause.textContent = "Start";
  window.clearInterval(state.interval);
}

function tick() {
  state.remaining -= 0.25;
  if (state.remaining <= 0) {
    state.remaining = 0;
    renderTimer();
    completeSession();
    return;
  }
  renderTimer();
}

function completeSession() {
  const completedMode = state.mode;
  pauseTimer();
  if (completedMode === "focus") {
    state.settings.completed += 1;
    state.settings.minutesDone += Number(state.settings.focusMinutes);
    saveState();
    playChime(completedMode);
    const nextMode =
      state.settings.completed % state.settings.cyclesBeforeLong === 0 ? "long" : "short";
    switchMode(nextMode, true);
  } else {
    playChime(completedMode);
    switchMode("focus", true);
  }
  renderStats();
}

function switchMode(mode, keepStopped = false) {
  if (!keepStopped) pauseTimer();
  state.mode = mode;
  const seconds = Number(state.settings[MODES[mode].input]) * 60;
  state.total = seconds;
  state.remaining = seconds;
  document.documentElement.style.setProperty("--accent", MODES[mode].accent);
  elements.modeLabel.textContent = MODES[mode].label;
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  renderTimer();
}

function resetTimer() {
  pauseTimer();
  state.remaining = state.total;
  renderTimer();
}

function renderTimer() {
  const displayRemaining = Math.ceil(state.remaining);
  const minutes = Math.floor(displayRemaining / 60);
  const seconds = displayRemaining % 60;
  elements.time.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
  const circumference = 2 * Math.PI * 104;
  const remainingRatio = state.total ? state.remaining / state.total : 0;
  elements.ring.style.strokeDasharray = `${circumference * remainingRatio} ${circumference}`;
  elements.ring.style.strokeDashoffset = "0";
  elements.ringMarker.style.transform = `rotate(${remainingRatio * 360}deg)`;
  document.title = `${elements.time.textContent} - ${MODES[state.mode].label}`;
}

function updateSetting(key) {
  const input = elements[key];
  const value = clamp(Number(input.value), Number(input.min), Number(input.max));
  state.settings[key] = value;
  input.value = value;
  saveState();
  if (MODES[state.mode].input === key) switchMode(state.mode, true);
  if (key === "cyclesBeforeLong") renderStats();
}

function applySettingsToInputs() {
  elements.focusMinutes.value = state.settings.focusMinutes;
  elements.shortMinutes.value = state.settings.shortMinutes;
  elements.longMinutes.value = state.settings.longMinutes;
  elements.cyclesBeforeLong.value = state.settings.cyclesBeforeLong;
  elements.taskInput.value = state.settings.task;
  elements.sound.classList.toggle("off", !state.settings.sound);
  elements.sound.setAttribute(
    "aria-label",
    state.settings.sound ? "Turn sound off" : "Turn sound on",
  );
}

function restoreDefaults() {
  Object.assign(state.settings, {
    focusMinutes: DEFAULTS.focusMinutes,
    shortMinutes: DEFAULTS.shortMinutes,
    longMinutes: DEFAULTS.longMinutes,
    cyclesBeforeLong: DEFAULTS.cyclesBeforeLong,
  });
  saveState();
  applySettingsToInputs();
  switchMode(state.mode, true);
  renderStats();
}

function toggleSound() {
  state.settings.sound = !state.settings.sound;
  elements.sound.classList.toggle("off", !state.settings.sound);
  elements.sound.setAttribute(
    "aria-label",
    state.settings.sound ? "Turn sound off" : "Turn sound on",
  );
  saveState();
}

function resetRounds() {
  state.settings.completed = 0;
  state.settings.minutesDone = 0;
  state.settings.statsDate = todayKey();
  saveState();
  renderStats();
}

function updateFocusTask(event) {
  state.settings.task = event.target.value;
  saveState();
}

function renderStats() {
  elements.completedCount.textContent = state.settings.completed;
  elements.focusMinutesDone.textContent = state.settings.minutesDone;
  elements.cycleDots.innerHTML = "";
  const cycleLength = Number(state.settings.cyclesBeforeLong);
  const completedInCycle = state.settings.completed % cycleLength;
  for (let index = 0; index < cycleLength; index += 1) {
    const dot = document.createElement("span");
    dot.classList.toggle("done", index < completedInCycle);
    elements.cycleDots.append(dot);
  }
}

function addTask(event) {
  event.preventDefault();
  const title = elements.newTask.value.trim();
  if (!title) return;
  state.settings.tasks.push({ id: makeId(), title, done: false });
  elements.newTask.value = "";
  saveState();
  renderTasks();
}

function clearTasks() {
  state.settings.tasks = [];
  saveState();
  renderTasks();
}

function renderTasks() {
  elements.taskList.innerHTML = "";
  state.settings.tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = task.done ? "completed" : "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveState();
      renderTasks();
    });

    const title = document.createElement("span");
    title.textContent = task.title;

    const remove = document.createElement("button");
    remove.className = "delete-task";
    remove.type = "button";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Delete ${task.title}`);
    remove.addEventListener("click", () => {
      state.settings.tasks = state.settings.tasks.filter((entry) => entry.id !== task.id);
      saveState();
      renderTasks();
    });

    item.append(checkbox, title, remove);
    elements.taskList.append(item);
  });
}

function playChime(mode) {
  if (!state.settings.sound) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  const context = new AudioEngine();
  const cues = {
    focus: [
      [659.25, 0],
      [783.99, 0.12],
      [987.77, 0.24],
    ],
    short: [
      [523.25, 0],
      [392, 0.16],
    ],
    long: [
      [392, 0],
      [493.88, 0.18],
      [587.33, 0.36],
      [783.99, 0.54],
    ],
  };
  cues[mode].forEach(([frequency, delay]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = mode === "long" ? "triangle" : "sine";
    gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.26);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + 0.28);
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("pomodoro-focus") || "{}");
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveState() {
  localStorage.setItem("pomodoro-focus", JSON.stringify(state.settings));
}

function ensureCurrentDay() {
  const key = todayKey();
  if (state.settings.statsDate !== key) {
    state.settings.statsDate = key;
    state.settings.completed = 0;
    state.settings.minutesDone = 0;
    saveState();
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
