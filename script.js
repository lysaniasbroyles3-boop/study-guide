// --- Study Timer & Notifications ---
let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let intervalId = null;

const timerDisplay = document.getElementById("timerDisplay");
const timerStatus = document.getElementById("timerStatus");
const minutesInput = document.getElementById("minutesInput");
const startPauseBtn = document.getElementById("startPauseBtn");
const notifyBtn = document.getElementById("notifyBtn");

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimerUI() {
  timerDisplay.textContent = formatTime(remainingSeconds);
  document.title = `${formatTime(remainingSeconds)} - Study Timer`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

function sendNotification(title, body) {
  playBeep();
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function updateNotifyButton() {
  if (!("Notification" in window)) {
    notifyBtn.textContent = "Notifications Unsupported";
    notifyBtn.disabled = true;
    return;
  }
  if (Notification.permission === "granted") {
    notifyBtn.textContent = "Notifications Enabled";
  } else if (Notification.permission === "denied") {
    notifyBtn.textContent = "Notifications Blocked";
  } else {
    notifyBtn.textContent = "Enable Notifications";
  }
}

notifyBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  await Notification.requestPermission();
  updateNotifyButton();
});

document.getElementById("setTimerBtn").addEventListener("click", () => {
  const mins = Math.max(1, Math.min(240, Number(minutesInput.value) || 25));
  minutesInput.value = mins;
  clearInterval(intervalId);
  intervalId = null;
  totalSeconds = mins * 60;
  remainingSeconds = totalSeconds;
  startPauseBtn.textContent = "Start";
  timerStatus.textContent = `Timer set to ${mins} minute(s)`;
  updateTimerUI();
});

startPauseBtn.addEventListener("click", () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    startPauseBtn.textContent = "Resume";
    timerStatus.textContent = "Paused";
    return;
  }

  if (remainingSeconds <= 0) remainingSeconds = totalSeconds;
  startPauseBtn.textContent = "Pause";
  timerStatus.textContent = "Studying...";

  intervalId = setInterval(() => {
    remainingSeconds--;
    updateTimerUI();

    if (remainingSeconds <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      startPauseBtn.textContent = "Start";
      timerStatus.textContent = "Time's up! Take a break or test yourself.";
      sendNotification("Study Session Complete", "Your timer finished. Time for a break or a quick quiz!");
    }
  }, 1000);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  clearInterval(intervalId);
  intervalId = null;
  remainingSeconds = totalSeconds;
  startPauseBtn.textContent = "Start";
  timerStatus.textContent = "Timer reset";
  updateTimerUI();
});

// --- Quiz Builder & Self-Test ---
const STORAGE_KEY = "study_quiz_questions_v1";
const defaultQuestions = [
  {
    question: "Which array method creates a new array with elements that pass a test?",
    options: ["map()", "filter()", "forEach()", "reduce()"],
    correct: 1
  },
  {
    question: "Which browser API stores key-value pairs with no expiration date?",
    options: ["sessionStorage", "Cache API", "localStorage", "IndexedDB"],
    correct: 2
  }
];

let questions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultQuestions;
let currentIdx = 0;
let answered = false;
let score = 0;
let attempts = 0;

const quizArea = document.getElementById("quizArea");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionForm = document.getElementById("questionForm");
const questionList = document.getElementById("questionList");

function saveQuestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

function updateScoreUI() {
  scoreDisplay.textContent = `Score: ${score} / ${attempts}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderQuiz() {
  updateScoreUI();
  if (questions.length === 0) {
    quizArea.innerHTML = `<p class="badge">No questions yet. Add one below to start testing yourself.</p>`;
    return;
  }

  if (currentIdx >= questions.length) currentIdx = 0;
  answered = false;
  const q = questions[currentIdx];

  quizArea.innerHTML = `
    <p style="font-weight: 600; margin-bottom: 0.75rem;">${currentIdx + 1}. ${escapeHtml(q.question)}</p>
    <div>
      ${q.options.map((opt, idx) => `
        <button type="button" class="quiz-option" data-idx="${idx}">${escapeHtml(opt)}</button>
      `).join("")}
    </div>
    <div id="feedback" class="badge" style="margin-top: 0.5rem;"></div>
  `;

  quizArea.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      attempts++;

      const chosen = Number(btn.dataset.idx);
      const feedback = document.getElementById("feedback");
      const allBtns = quizArea.querySelectorAll(".quiz-option");

      allBtns[q.correct].classList.add("correct");
      if (chosen === q.correct) {
        score++;
        feedback.textContent = "Correct!";
      } else {
        btn.classList.add("wrong");
        feedback.textContent = `Incorrect. Correct answer: ${q.options[q.correct]}`;
      }
      updateScoreUI();
    });
  });
}

function renderQuestionList() {
  if (questions.length === 0) {
    questionList.innerHTML = `<p class="badge">Saved questions will appear here.</p>`;
    return;
  }

  questionList.innerHTML = questions.map((q, i) => `
    <div class="question-item">
      <div>
        <strong>${escapeHtml(q.question)}</strong>
        <div class="badge">Answer: ${escapeHtml(q.options[q.correct])}</div>
      </div>
      <button type="button" class="danger" data-del="${i}">Delete</button>
    </div>
  `).join("");

  questionList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      questions.splice(idx, 1);
      saveQuestions();
      if (currentIdx >= questions.length) currentIdx = 0;
      renderQuestionList();
      renderQuiz();
    });
  });
}

questionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("qText").value.trim();
  const options = [
    document.getElementById("opt0").value.trim(),
    document.getElementById("opt1").value.trim(),
    document.getElementById("opt2").value.trim(),
    document.getElementById("opt3").value.trim()
  ];
  const correct = Number(document.getElementById("correctIndex").value);

  if (!question || options.some((o) => !o)) return;

  questions.push({ question, options, correct });
  saveQuestions();
  questionForm.reset();
  currentIdx = questions.length - 1;
  renderQuestionList();
  renderQuiz();
});

document.getElementById("nextQuestionBtn").addEventListener("click", () => {
  if (questions.length === 0) return;
  currentIdx = (currentIdx + 1) % questions.length;
  renderQuiz();
});

document.getElementById("resetScoreBtn").addEventListener("click", () => {
  score = 0;
  attempts = 0;
  updateScoreUI();
});

// Initialize app
updateNotifyButton();
updateTimerUI();
renderQuestionList();
renderQuiz();
