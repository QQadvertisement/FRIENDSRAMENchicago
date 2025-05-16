import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔐 Replace this with your actual anon key (safe if RLS is on)
const supabase = createClient(
  'https://nbevrkrmfotibeuhrtzq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZXZya3JtZm90aWJldWhydHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNzY5ODcsImV4cCI6MjA2Mjc1Mjk4N30.tJck5rndFMVcwZFeRCy8zTAuXfcxDSxB6MszOZUpSwg'
);

// Game state
let score = 0;
let timer = 10;
let countdown;
let countdownTimer;
let gameEnded = false;

let player = { name: "", phone: "", email: "" };

// Scene switching
const scenes = {
  start: document.getElementById("scene-start"),
  register: document.getElementById("scene-register"),
  tutorial: document.getElementById("scene-tutorial"),
  game: document.getElementById("scene-game"),
  result: document.getElementById("scene-result"),
  survey: document.getElementById("scene-survey"),
};

function showScene(scene) {
  Object.values(scenes).forEach(s => s.classList.add("hidden"));
  scenes[scene].classList.remove("hidden");
}

// 🎮 Start screen → Register
document.getElementById("scene-start").addEventListener("click", () => {
  showScene("register");
});

// 📝 Form submission → Tutorial (wait for button press)
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  player.name = form.get("name");
  player.phone = form.get("phone");
  player.email = form.get("email");

  showScene("tutorial");

  // Reset tutorial state
  document.getElementById("tutorial-countdown").textContent = "Game starting in 3...";
  document.getElementById("tutorial-countdown").classList.add("hidden");
  document.getElementById("ready-btn").classList.remove("hidden");
});

// 🟡 "I'm Ready!" button → starts countdown → start game
document.getElementById("ready-btn").addEventListener("click", () => {
  let countdownVal = 3;
  const tutorialText = document.getElementById("tutorial-countdown");

  tutorialText.classList.remove("hidden");
  document.getElementById("ready-btn").classList.add("hidden");
  tutorialText.textContent = `Game starting in ${countdownVal}...`;

  countdownTimer = setInterval(() => {
    countdownVal--;
    tutorialText.textContent = `Game starting in ${countdownVal}...`;
    if (countdownVal <= 0) {
      clearInterval(countdownTimer);
      startGame();
    }
  }, 1000);
});

function startGame() {
  score = 0;
  timer = 10;
  gameEnded = false;

  document.getElementById("score").textContent = "Score: 0";
  document.getElementById("progress-bar").style.width = "100%";

  showScene("game");

  countdown = setInterval(() => {
    timer--;
    document.getElementById("progress-bar").style.width = `${timer * 10}%`;
    if (timer <= 0) endGame();
  }, 1000);
}

// 👆 Tap to slurp
document.getElementById("tap-area").addEventListener("click", () => {
  score++;
  document.getElementById("score").textContent = `Score: ${score}`;
});

// 🛑 Game over → Submit to Supabase → Show survey
async function endGame() {
  if (gameEnded) return;
  gameEnded = true;

  clearInterval(countdown);
  document.getElementById("final-score").textContent = `Your score is ${score}!`;
  showScene("survey");

  // 📤 Submit score to Supabase
  await supabase.from('scores').insert([
    {
      name: player.name,
      email: player.email,
      phone: player.phone,
      score
    }
  ]);

  // 📥 Pre-fetch leaderboard
  const { data: scores } = await supabase
    .from('safe_leaderboard')
    .select('*');

  renderLeaderboard(scores);
}

// 📋 Survey submission → Upload to Supabase → Result
document.getElementById("survey-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);

  const rating = parseInt(form.get("rating"), 10);
  const recommend = parseInt(form.get("recommend"), 10);
  const sources = form.getAll("source");
  const other_source = form.get("source-other") || null;

  const { error } = await supabase.from("survey_responses").insert([
    {
      phone: player.phone,
      rating,
      recommend,
      sources,
      other_source
    }
  ]);

  if (error) {
    console.error("❌ Failed to submit survey:", error.message);
  } else {
    console.log("✅ Survey submitted!");
  }

  showScene("result");
});

// 🏆 Display leaderboard
function renderLeaderboard(scores) {
  const list = document.getElementById("leaderboard");
  list.innerHTML = "";

  scores.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} – ${entry.score}`;
    if (entry.name.trim().toLowerCase() === player.name.trim().toLowerCase()) {
      li.classList.add("font-bold", "text-yellow-600");
    }
    list.appendChild(li);
  });
}

// 🔁 Play again → Reset game + tutorial state
document.getElementById("play-again-btn").addEventListener("click", () => {
  gameEnded = false;
  clearInterval(countdownTimer);
  document.getElementById("tutorial-countdown").classList.add("hidden");
  document.getElementById("tutorial-countdown").textContent = "Game starting in 3...";
  document.getElementById("ready-btn").classList.remove("hidden");
  showScene("start");
});