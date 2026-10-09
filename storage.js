const STORAGE_KEY = "typerush-data-v1";

const DEFAULT_DATA = {
  version: 1,
  settings: { language: "nl", mode: "words", duration: 60, theme: "dark" },
  stats: { testsCompleted: 0, bestWpm: 0, bestAccuracy: 0, totalPracticeSeconds: 0 },
  progress: { xp: 0, level: 1, streak: 0, achievements: [] },
  history: []
};

export function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1) return structuredClone(DEFAULT_DATA);
    return {
      ...structuredClone(DEFAULT_DATA),
      ...saved,
      settings: { ...DEFAULT_DATA.settings, ...saved.settings },
      stats: { ...DEFAULT_DATA.stats, ...saved.stats },
      progress: { ...DEFAULT_DATA.progress, ...saved.progress },
      history: Array.isArray(saved.history) ? saved.history : []
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn("TypeRush kon de voortgang niet opslaan:", error);
    return false;
  }
}

export function clearHistory(data) {
  data.history = [];
  data.stats.testsCompleted = 0;
  data.stats.totalPracticeSeconds = 0;
  data.stats.bestWpm = 0;
  data.stats.bestAccuracy = 0;
  data.progress.xp = 0;
  data.progress.level = 1;
  data.progress.achievements = [];
  saveData(data);
}
