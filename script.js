const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#bestScore");
const foodEl = document.querySelector("#foodCount");
const poisonEl = document.querySelector("#poisonCount");
const livesEl = document.querySelector("#livesCount");
const backgroundMusic = document.querySelector("#backgroundMusic");
const message = document.querySelector("#boardMessage");
const themeButton = document.querySelector("#themeButton");
const middleThemeValue = document.querySelector("#middleThemeValue");
const middleMusicValue = document.querySelector("#middleMusicValue");
const grid = 25;
const themes = ["garden", "midnight", "sunset"];
let activeTheme = localStorage.getItem("neon-coil-theme") || "garden";
if (!themes.includes(activeTheme)) activeTheme = "garden";
const boardPalettes = {
  garden: {
    background: "#efe2c6",
    grid: "rgba(38, 59, 43, 0.1)",
    food: "#6d9b4a",
    poison: "#c95f45",
    obstacle: "#d19b45",
    snake: "#4d8056",
    head: "#fff8e9",
    ink: "#263b2b",
  },
  midnight: {
    background: "#27343a",
    grid: "rgba(232, 224, 207, 0.12)",
    food: "#b6c86a",
    poison: "#e07a5f",
    obstacle: "#e2b35f",
    snake: "#83b692",
    head: "#e8e0cf",
    ink: "#172126",
  },
  sunset: {
    background: "#f0d5b4",
    grid: "rgba(75, 41, 37, 0.1)",
    food: "#6d8b45",
    poison: "#b94e3c",
    obstacle: "#d68b3e",
    snake: "#8a5a44",
    head: "#fff4df",
    ink: "#4b2925",
  },
};
let snake,
  food,
  poison,
  obstacles,
  direction,
  queued,
  score,
  foodCount,
  poisonCount,
  lives,
  running = false,
  timer,
  obstacleTimer,
  speedLevel = 3,
  wrapAround = true;
let best = Number(localStorage.getItem("neon-coil-best") || 0);
let runHistory = JSON.parse(localStorage.getItem("neon-coil-history") || "[]");
if (bestEl) bestEl.textContent = best;

function randomCell() {
  return {
    x: Math.floor(Math.random() * (canvas.width / grid)),
    y: Math.floor(Math.random() * (canvas.height / grid)),
  };
}
function same(a, b) {
  return Boolean(a && b) && a.x === b.x && a.y === b.y;
}
function freeCell() {
  let cell;
  do {
    cell = randomCell();
  } while (
    snake.some((part) => same(part, cell)) ||
    same(cell, food) ||
    same(cell, poison) ||
    obstacles.some((obstacle) => same(obstacle, cell))
  );
  return cell;
}
function reset() {
  snake = [{ x: 10, y: 10 }];
  obstacles = [];
  while (obstacles.length < 3) {
    const obstacle = randomCell();
    if (
      !snake.some((part) => same(part, obstacle)) &&
      !obstacles.some((item) => same(item, obstacle))
    )
      obstacles.push(obstacle);
  }
  direction = { x: 1, y: 0 };
  queued = direction;
  score = foodCount = poisonCount = 0;
  lives = 3;
  food = freeCell();
  poison = freeCell();
  updateHud();
  updateSettings();
}
function updateHud() {
  scoreEl.textContent = score;
  foodEl.textContent = foodCount;
  poisonEl.textContent = poisonCount;
  livesEl.textContent = lives;
}
function moveObstacles() {
  const obstacleCount = obstacles.length;
  const previousObstacles = obstacles;
  obstacles = [];
  while (obstacles.length < obstacleCount) {
    const nextObstacle = freeCell();
    if (!previousObstacles.some((obstacle) => same(obstacle, nextObstacle))) {
      obstacles.push(nextObstacle);
    }
  }
  draw();
}
function drawCell(cell, color, glow = color) {
  ctx.shadowBlur = 16;
  ctx.shadowColor = glow;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(cell.x * grid + 3, cell.y * grid + 3, grid - 6, grid - 6, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
}
function drawHead(cell) {
  const palette = boardPalettes[activeTheme];
  ctx.shadowBlur = 16;
  ctx.shadowColor = palette.snake;
  ctx.fillStyle = palette.head;
  ctx.beginPath();
  ctx.arc(
    cell.x * grid + grid / 2,
    cell.y * grid + grid / 2,
    grid / 2,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.shadowBlur = 0;
  const centerX = cell.x * grid + grid / 2;
  const centerY = cell.y * grid + grid / 2;
  const perpendicular = { x: -direction.y, y: direction.x };
  ctx.fillStyle = palette.ink;
  [1, -1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(
      centerX + direction.x * 5 + perpendicular.x * side * 4,
      centerY + direction.y * 5 + perpendicular.y * side * 4,
      2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}
function updateSettings() {
  document.querySelector("#speedValue").textContent = speedLevel;
  document.querySelector("#wrapValue").textContent = wrapAround ? "ON" : "OFF";
  document.querySelector("#wrapButton").textContent = wrapAround ? "ON" : "OFF";
  document.querySelector("#middleSpeedValue").textContent = speedLevel;
  document.querySelector("#middleWrapValue").textContent = wrapAround
    ? "ON"
    : "OFF";
  document.querySelector("#middleWrapButton").textContent = wrapAround
    ? "ON"
    : "OFF";
}
function applyTheme() {
  document.documentElement.dataset.theme = activeTheme;
  if (themeButton) themeButton.textContent = activeTheme.toUpperCase();
  if (middleThemeValue)
    middleThemeValue.textContent = activeTheme.toUpperCase();
  localStorage.setItem("neon-coil-theme", activeTheme);
  if (snake) draw();
}
function changeTheme() {
  activeTheme = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
  applyTheme();
}
function showView(viewName) {
  document.querySelectorAll(".section-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".page-view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
  if (viewName === "history") loadScores();
}
function draw() {
  const palette = boardPalettes[activeTheme];
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = palette.grid;
  for (let x = 0; x < canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  drawCell(food, palette.food, palette.food);
  drawCell(poison, palette.poison, palette.poison);
  obstacles.forEach((obstacle) => {
    ctx.fillStyle = palette.obstacle;
    ctx.shadowBlur = 12;
    ctx.shadowColor = palette.obstacle;
    ctx.beginPath();
    ctx.moveTo(obstacle.x * grid + grid / 2, obstacle.y * grid + 3);
    ctx.lineTo(obstacle.x * grid + grid - 3, obstacle.y * grid + grid / 2);
    ctx.lineTo(obstacle.x * grid + grid / 2, obstacle.y * grid + grid - 3);
    ctx.lineTo(obstacle.x * grid + 3, obstacle.y * grid + grid / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  snake
    .slice(1)
    .forEach((part) => drawCell(part, palette.snake, palette.snake));
  drawHead(snake[0]);
}
function step() {
  direction = queued;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  if (wrapAround) {
    head.x = (head.x + canvas.width / grid) % (canvas.width / grid);
    head.y = (head.y + canvas.height / grid) % (canvas.height / grid);
  }
  if (
    (!wrapAround &&
      (head.x < 0 ||
        head.y < 0 ||
        head.x >= canvas.width / grid ||
        head.y >= canvas.height / grid)) ||
    snake.some((part) => same(part, head)) ||
    obstacles.some((obstacle) => same(obstacle, head))
  )
    return loseLife();
  snake.unshift(head);
  if (same(head, food)) {
    score += 1;
    foodCount++;
    food = freeCell();
  } else if (same(head, poison)) {
    score -= 3;
    poisonCount++;
    poison = freeCell();
    if (snake.length > 1) snake.pop();
  } else snake.pop();
  updateHud();
  draw();
}
function loseLife() {
  lives--;
  updateHud();
  if (!lives) return endRun();
  const currentLine = snake[0].y;
  let spawn;
  do {
    spawn = freeCell();
  } while (spawn.y === currentLine);
  snake = [spawn];
  direction = { x: 1, y: 0 };
  queued = direction;
  draw();
}
function start() {
  reset();
  running = true;
  message.style.display = "none";
  clearInterval(timer);
  clearInterval(obstacleTimer);
  timer = setInterval(step, Math.max(55, 145 - speedLevel * 20));
  obstacleTimer = setInterval(moveObstacles, 10000);
  draw();
}
function endRun() {
  running = false;
  clearInterval(timer);
  clearInterval(obstacleTimer);
  message.querySelector(".message-kicker").textContent = "RUN COMPLETE";
  message.querySelector("strong").innerHTML = `FINAL SCORE<br><b>${score}</b>`;
  message.querySelector(".primary-button").innerHTML =
    "PLAY AGAIN <span>↗</span>";
  message.style.display = "flex";
  if (score > best) {
    best = score;
    localStorage.setItem("neon-coil-best", best);
    if (bestEl) bestEl.textContent = best;
  }
  runHistory.unshift({
    score,
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    speed: speedLevel,
    wrap: wrapAround ? "ON" : "OFF",
    food: foodCount,
    poison: poisonCount,
  });
  runHistory = runHistory.slice(0, 10);
  localStorage.setItem("neon-coil-history", JSON.stringify(runHistory));
  loadScores();
}
function setDirection(key) {
  const moves = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };
  const next = moves[key];
  if (next && (next.x !== -direction.x || next.y !== -direction.y))
    queued = next;
}
async function loadScores() {
  const data = runHistory;
  const bestScore = data.length
    ? Math.max(...data.map((item) => item.score))
    : "0";
  const latestScore = data.length
    ? `${data[0].score > 0 ? "+" : ""}${data[0].score}`
    : "--";
  const historyMarkup = data.length
    ? data
        .map(
          (item, index) =>
            `<div class="score-row"><span class="rank">${String(index + 1).padStart(2, "0")}</span><span class="score-name"><strong>${index + 1}</strong><small>${item.date || "Unknown date"} ${item.time || ""}</small></span><span class="score-value">${item.score > 0 ? "+" : ""}${item.score}<small>SPEED ${item.speed || 3} · WRAP ${item.wrap || "ON"}<br>FOOD ${item.food || 0} · POISON ${item.poison || 0}</small></span></div>`,
        )
        .join("")
    : '<div class="empty">No runs yet. Make your first mark.</div>';
  document.querySelector("#historyTotal").textContent = data.length;
  document.querySelector("#historyBest").textContent = bestScore;
  document.querySelector("#historyLatest").textContent = latestScore;
  document.querySelector("#historyList").innerHTML = historyMarkup;
  document.querySelector("#middleHistoryTotal").textContent = data.length;
  document.querySelector("#middleHistoryBest").textContent = bestScore;
  document.querySelector("#middleHistoryLatest").textContent = latestScore;
  document.querySelector("#middleHistoryList").innerHTML = historyMarkup;
}
function downloadHistory() {
  const lines = ["NEON COIL - RUN HISTORY", "========================", ""];
  if (!runHistory.length) lines.push("No runs recorded.");
  runHistory.forEach((item, index) => {
    lines.push(
      `Run ${String(index + 1).padStart(2, "0")} | ${item.date || "Unknown date"} ${item.time || ""}`,
      `Score: ${item.score} | Speed: ${item.speed || 3} | Wrap: ${item.wrap || "ON"}`,
      `Food: ${item.food || 0} | Poison: ${item.poison || 0}`,
      "",
    );
  });
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "neon-coil-history.txt";
  link.click();
  URL.revokeObjectURL(url);
}
function clearHistory() {
  if (!runHistory.length || !window.confirm("Clear all saved run history?"))
    return;
  runHistory = [];
  localStorage.removeItem("neon-coil-history");
  loadScores();
}
window.addEventListener("keydown", (event) => {
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    setDirection(event.key);
  }
});
document
  .querySelectorAll(".control-button")
  .forEach((button) =>
    button.addEventListener("pointerdown", () =>
      setDirection(button.dataset.key),
    ),
  );
document.querySelector("#startButton").addEventListener("click", start);
document.querySelector("#dialogStart").addEventListener("click", () => {
  document.querySelector("#guideDialog").close();
  start();
});
document
  .querySelector("#guideButton")
  .addEventListener("click", () =>
    document.querySelector("#guideDialog").showModal(),
  );
document
  .querySelector("#closeGuide")
  .addEventListener("click", () =>
    document.querySelector("#guideDialog").close(),
  );
function toggleMusic(button) {
  if (backgroundMusic.paused) {
    backgroundMusic
      .play()
      .then(() => {
        button.textContent = "×";
        middleMusicValue.textContent = "ON";
        button.setAttribute("aria-label", "Turn music off");
      })
      .catch(() => {
        button.textContent = "♫";
        middleMusicValue.textContent = "OFF";
        button.setAttribute("aria-label", "Music file unavailable");
      });
  } else {
    backgroundMusic.pause();
    button.textContent = "♫";
    middleMusicValue.textContent = "OFF";
    button.setAttribute("aria-label", "Turn music on");
  }
}
const soundButton = document.querySelector("#soundButton");
if (soundButton)
  soundButton.addEventListener("click", () => toggleMusic(soundButton));
document
  .querySelector("#historyButton")
  .addEventListener("click", () =>
    document.querySelector("#historyDialog").showModal(),
  );
document
  .querySelector("#closeHistory")
  .addEventListener("click", () =>
    document.querySelector("#historyDialog").close(),
  );
document
  .querySelector("#downloadHistory")
  .addEventListener("click", downloadHistory);
document.querySelector("#clearHistory").addEventListener("click", clearHistory);
if (themeButton) themeButton.addEventListener("click", changeTheme);
document
  .querySelector("#middleThemeButton")
  .addEventListener("click", changeTheme);
document.querySelector("#middleMusicButton").addEventListener("click", () => {
  if (soundButton) document.querySelector("#soundButton").click();
  else toggleMusic(document.querySelector("#middleMusicButton"));
});
document.querySelectorAll(".section-button").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
document.querySelector("#middleSpeedDown").addEventListener("click", () => {
  speedLevel = Math.max(1, speedLevel - 1);
  updateSettings();
  if (running) start();
});
document.querySelector("#middleSpeedUp").addEventListener("click", () => {
  speedLevel = Math.min(7, speedLevel + 1);
  updateSettings();
  if (running) start();
});
document.querySelector("#middleWrapButton").addEventListener("click", () => {
  wrapAround = !wrapAround;
  updateSettings();
});
document.querySelector("#speedDown").addEventListener("click", () => {
  speedLevel = Math.max(1, speedLevel - 1);
  updateSettings();
  if (running) start();
});
document.querySelector("#speedUp").addEventListener("click", () => {
  speedLevel = Math.min(7, speedLevel + 1);
  updateSettings();
  if (running) start();
});
document.querySelector("#wrapButton").addEventListener("click", () => {
  wrapAround = !wrapAround;
  updateSettings();
});
reset();
applyTheme();
draw();
loadScores();
