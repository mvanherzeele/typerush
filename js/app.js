import { initLearning } from "./learning.js";
import { WORDS, TEXTS, LESSONS } from "../data/content.js";
import { createTest, getMetrics, appendInput, finishTest } from "./typing-engine.js";
import { loadData, saveData, clearHistory } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const data = loadData();
let duration = data.settings.duration || 60;
let language = data.settings.language || "nl";
let mode = data.settings.mode || "words";
let test = null;
let timerId = null;
let activeView = "rush";
let toastTimer = null;
let lessonMode = null;

const ACHIEVEMENTS = [
  { id: "first", icon: "✦", title: "First Run", description: "Voltooi je eerste typetest.", unlocked: d => d.stats.testsCompleted >= 1 },
  { id: "ten", icon: "⌁", title: "Getting Warm", description: "Voltooi 10 typetests.", unlocked: d => d.stats.testsCompleted >= 10 },
  { id: "speed", icon: "↗", title: "Speedster", description: "Haal 40 WPM of meer.", unlocked: d => d.stats.bestWpm >= 40 },
  { id: "precision", icon: "◎", title: "Sharp Shooter", description: "Haal 98% nauwkeurigheid.", unlocked: d => d.stats.bestAccuracy >= 98 }
];

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function makePrompt() {
  if (lessonMode) return lessonMode.words.join(" ");
  if (mode === "quote") return randomFrom(TEXTS[language]);
  const words = WORDS[language];
  const amount = Math.max(45, Math.ceil(duration * 2.7));
  return Array.from({ length: amount }, () => randomFrom(words)).join(" ");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function updatePrompt() {
  if (!test) return;
  const container = $("#prompt-text");
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < test.prompt.length; i++) {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = test.prompt[i];
    if (i < test.input.length) {
      span.classList.add(test.input[i] === test.prompt[i] ? "correct" : "incorrect");
    } else if (i === test.input.length && !test.finished) {
      span.classList.add("current");
    }
    fragment.appendChild(span);
  }
  container.replaceChildren(fragment);
  const current = container.querySelector(".current");
  if (current && current.offsetTop > 90) {
    $("#typing-area").scrollTop = Math.max(0, current.offsetTop - 35);
  } else if (test.input.length === 0) {
    $("#typing-area").scrollTop = 0;
  }
}

function updateLiveStats() {
  if (!test) return;
  const metrics = getMetrics(test);
  $("#live-wpm").textContent = metrics.wpm;
  $("#live-accuracy").innerHTML = `${metrics.accuracy}<span class="metric-unit">%</span>`;
  $("#live-errors").textContent = metrics.errors;
  $("#time-left").innerHTML = `${Math.ceil(test.timeLeft)}<span class="metric-unit">s</span>`;
  $("#timer-bar").style.width = `${Math.max(0, (test.timeLeft / test.duration) * 100)}%`;
}

function stopTimer() {
  if (timerId !== null) cancelAnimationFrame(timerId);
  timerId = null;
}

function tick() {
  if (!test || test.finished || !test.startedAt) return;
  const elapsed = (Date.now() - test.startedAt) / 1000;
  test.timeLeft = Math.max(0, duration - elapsed);
  updateLiveStats();
  if (test.timeLeft <= 0) {
    finishCurrentTest();
    return;
  }
  timerId = requestAnimationFrame(tick);
}

function startTimer() {
  if (timerId === null) timerId = requestAnimationFrame(tick);
}

function resetTest({ keepLesson = false } = {}) {
  stopTimer();
  $("#result-panel").classList.add("hidden");
  if (!keepLesson) lessonMode = null;
  test = createTest({ duration: lessonMode ? 30 : duration, prompt: makePrompt(), mode: lessonMode ? "lesson" : mode });
  duration = test.duration;
  $$(".duration-option").forEach(button => button.classList.toggle("selected", Number(button.dataset.duration) === duration));
  $("#typing-hint").innerHTML = 'Begin te typen om de timer te starten <span>·</span> <kbd>Tab</kbd> + <kbd>Enter</kbd> herstart';
  $("#typing-area").scrollTop = 0;
  updatePrompt();
  updateLiveStats();
  $("#typing-area").focus({ preventScroll: true });
}

function finishCurrentTest() {
  if (!test || test.finished) return;
  stopTimer();
  finishTest(test);
  const metrics = getMetrics(test);
  $("#result-wpm").innerHTML = `${metrics.wpm} <small>WPM</small>`;
  $("#result-accuracy").textContent = `${metrics.accuracy}%`;
  $("#result-correct").textContent = metrics.correct;
  $("#result-errors").textContent = metrics.errors;

  if (metrics.entered > 0) {
    const wasBest = metrics.wpm > data.stats.bestWpm;
    data.stats.testsCompleted += 1;
    data.stats.bestWpm = Math.max(data.stats.bestWpm, metrics.wpm);
    data.stats.bestAccuracy = Math.max(data.stats.bestAccuracy, metrics.accuracy);
    data.stats.totalPracticeSeconds += Math.round(metrics.elapsedSeconds);
    data.progress.xp += Math.max(5, metrics.correct);
    data.progress.level = Math.floor(data.progress.xp / 250) + 1;
    data.history.unshift({
      date: new Date().toISOString(),
      wpm: metrics.wpm,
      accuracy: metrics.accuracy,
      errors: metrics.errors,
      duration: Math.round(metrics.elapsedSeconds),
      language,
      mode: test.mode
    });
    data.history = data.history.slice(0, 30);
    const newAchievements = ACHIEVEMENTS.filter(a => !data.progress.achievements.includes(a.id) && a.unlocked(data));
    data.progress.achievements.push(...newAchievements.map(a => a.id));
    saveData(data);
    $("#personal-best-message").textContent = wasBest ? "Nieuw persoonlijk record! Je bent sneller geworden. ✦" : `Je verdiende ${Math.max(5, metrics.correct)} XP. Blijf oefenen!`;
    if (newAchievements.length) showToast(`Achievement unlocked: ${newAchievements[0].title}`);
  } else {
    $("#personal-best-message").textContent = "Probeer een paar tekens te typen om je resultaat op te slaan.";
  }

  updatePrompt();
  updateLiveStats();
  $("#typing-hint").textContent = "Test afgelopen · bekijk je resultaat hieronder";
  $("#result-panel").classList.remove("hidden");
  renderProgress();
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setView(view) {
  activeView = view;
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}-view`));
  $$(".nav-tab").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  if (view === "progress") renderProgress();
  if (view === "rush") $("#typing-area").focus({ preventScroll: true });
}

function renderProgress() {
  $("#total-tests").textContent = data.stats.testsCompleted;
  $("#best-wpm").innerHTML = `${data.stats.bestWpm} <small>WPM</small>`;
  const recent = data.history.slice(0, 10);
  const avg = recent.length ? Math.round(recent.reduce((sum, item) => sum + item.accuracy, 0) / recent.length) : null;
  $("#average-accuracy").textContent = avg === null ? "—" : `${avg}%`;
  const minutes = Math.floor(data.stats.totalPracticeSeconds / 60);
  $("#practice-time").textContent = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}u ${minutes % 60}m`;

  const list = $("#history-list");
  if (!data.history.length) {
    list.innerHTML = '<div class="empty-state">Nog geen tests. Je eerste run wacht op je.</div>';
  } else {
    list.replaceChildren(...data.history.slice(0, 8).map(item => {
      const row = document.createElement("div");
      row.className = "history-item";
      const date = new Date(item.date);
      const modeName = item.mode === "quote" ? "Volledige tekst" : item.mode === "lesson" ? "Les" : "Willekeurige woorden";
      const modeCell = document.createElement("div");
      modeCell.className = "history-mode";
      const strong = document.createElement("strong");
      strong.textContent = modeName;
      const small = document.createElement("span");
      small.textContent = `${item.language.toUpperCase()} · ${date.toLocaleDateString("nl-BE")} ${date.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}`;
      modeCell.append(strong, small);
      row.append(modeCell, valueCell(item.wpm, "WPM"), valueCell(`${item.accuracy}%`, "accuracy"), valueCell(`${item.errors}`, "fouten", true));
      return row;
    }));
  }

  const grid = $("#achievement-grid");
  grid.replaceChildren(...ACHIEVEMENTS.map(achievement => {
    const unlocked = data.progress.achievements.includes(achievement.id);
    const card = document.createElement("div");
    card.className = `achievement${unlocked ? " unlocked" : ""}`;
    const icon = document.createElement("div"); icon.className = "achievement-icon"; icon.textContent = achievement.icon;
    const title = document.createElement("strong"); title.textContent = achievement.title;
    const desc = document.createElement("p"); desc.textContent = achievement.description;
    card.append(icon, title, desc);
    return card;
  }));
  $("#achievement-count").textContent = `${data.progress.achievements.length} / ${ACHIEVEMENTS.length}`;
}

function valueCell(value, label, date = false) {
  const wrapper = document.createElement("div");
  if (date) wrapper.className = "history-date";
  const strong = document.createElement("div");
  strong.className = "history-value";
  strong.textContent = value;
  wrapper.append(strong);
  return wrapper;
}

function setLanguage(nextLanguage) {
  language = nextLanguage;
  data.settings.language = language;
  saveData(data);
  resetTest();
}

function startLesson(key) {
  lessonMode = true;
  const lesson = LESSONS[key];
  if (!lesson) return;
  lessonMode = lesson;
  mode = "words";
  language = "nl";
  $("#language-select").value = language;
  $("#mode-select").value = mode;
  setView("rush");
  resetTest({ keepLesson: true });
  showToast(`Les gestart: ${lesson.title}`);
}

function handleKeydown(event) {
  if (activeView !== "rush") return;
  if (event.target instanceof HTMLElement &&
      event.target !== $("#typing-area") &&
      event.target.closest("button, select, input, textarea")) return;
  if ((event.key === "Enter" && event.shiftKey) || (event.key.toLowerCase() === "r" && event.ctrlKey)) {
    event.preventDefault();
    resetTest();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Tab") {
    if (event.shiftKey) return;
    event.preventDefault();
    return;
  }
  if (event.key === "Escape") {
    $("#typing-area").blur();
    return;
  }
  if (test?.finished) return;
  if (event.key === "Backspace") {
    event.preventDefault();
    appendInput(test, "BACKSPACE");
  } else if (event.key.length === 1) {
    event.preventDefault();
    appendInput(test, event.key);
  } else {
    return;
  }
  if (test.startedAt) startTimer();
  updatePrompt();
  updateLiveStats();
  if (test.input.length >= test.prompt.length) finishCurrentTest();
}

function init() {
  $("#language-select").value = language;
  $("#mode-select").value = mode;
  $$(".duration-option").forEach(button => {
    button.classList.toggle("selected", Number(button.dataset.duration) === duration);
    button.addEventListener("click", () => {
      duration = Number(button.dataset.duration);
      data.settings.duration = duration;
      saveData(data);
      resetTest();
    });
  });

  $$(".nav-tab").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  $("#mode-select").addEventListener("change", event => {
    mode = event.target.value;
    data.settings.mode = mode;
    saveData(data);
    resetTest();
  });
  $("#language-select").addEventListener("change", event => setLanguage(event.target.value));
  $("#restart-button").addEventListener("click", () => resetTest());
  $("#result-retry").addEventListener("click", () => {
    resetTest();
    $("#typing-area").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#typing-area").addEventListener("click", () => $("#typing-area").focus());
  document.addEventListener("keydown", handleKeydown);
  $("#back-to-rush").addEventListener("click", () => setView("rush"));

  $("#clear-history").addEventListener("click", () => {
    if (!data.history.length) { showToast("Er is nog geen geschiedenis om te wissen."); return; }
    if (confirm("Wis alle opgeslagen voortgang en testgeschiedenis?")) {
      clearHistory(data);
      Object.assign(data, loadData());
      renderProgress();
      showToast("Je testgeschiedenis is gewist.");
    }
  });
  $("#theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    data.settings.theme = document.body.classList.contains("light-theme") ? "light" : "dark";
    saveData(data);
  });
  if (data.settings.theme === "light") document.body.classList.add("light-theme");
  renderProgress();
  initLearning();
  resetTest();
}

init();
