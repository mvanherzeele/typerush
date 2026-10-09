export function createTest({ duration, prompt, mode }) {
  return {
    duration,
    prompt,
    mode,
    input: "",
    startedAt: null,
    endedAt: null,
    timeLeft: duration,
    finished: false
  };
}

export function getMetrics(test, now = Date.now()) {
  const elapsedSeconds = test.startedAt
    ? Math.max(0, Math.min(test.duration, ((test.endedAt ?? now) - test.startedAt) / 1000))
    : 0;
  const entered = test.input.length;
  let correct = 0;
  for (let i = 0; i < Math.min(test.input.length, test.prompt.length); i++) {
    if (test.input[i] === test.prompt[i]) correct++;
  }
  const errors = entered - correct;
  const minutes = elapsedSeconds / 60;
  const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
  const accuracy = entered > 0 ? Math.round((correct / entered) * 100) : 100;
  return { elapsedSeconds, entered, correct, errors, wpm, accuracy };
}

export function appendInput(test, value) {
  if (test.finished) return test;
  if (test.startedAt === null) test.startedAt = Date.now();
  if (value === "BACKSPACE") {
    test.input = test.input.slice(0, -1);
    return test;
  }
  if (value.length !== 1) return test;
  if (test.input.length < test.prompt.length) test.input += value;
  return test;
}

export function finishTest(test, now = Date.now()) {
  if (test.finished) return test;
  test.endedAt = now;
  test.finished = true;
  test.timeLeft = Math.max(0, test.duration - (test.startedAt ? (now - test.startedAt) / 1000 : 0));
  return test;
}
