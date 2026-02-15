(() => {

  // wordle config
  const ANSWER = "amber";
  const WORD_LEN = 5;
  const MAX_TRIES = 6;

  const STRICT_DICTIONARY = false;
  const ALLOWED = new Set([
    "amber","candy","sweet","heart","lover","crush","adore","charm","honey",
    "roses","glove","flirt","kissy","blush","smile","spark","tulip"
  ]);

  // elements

  const boardEl = document.getElementById("board");
  const keyboardEl = document.getElementById("keyboard");
  const toastEl = document.getElementById("toast");
  const resetBtn = document.getElementById("resetBtn");

  const gameView = document.getElementById("gameView");
  const valentineView = document.getElementById("valentineView");
  const finalView = document.getElementById("finalView");

  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const noHint = document.getElementById("noHint");
  const playAgainBtn = document.getElementById("playAgainBtn");

  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const closeHelp = document.getElementById("closeHelp");

  const photoFallback = document.getElementById("photoFallback");

  // state

  let row = 0;
  let col = 0;
  let grid = Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill(""));
  let locked = false;

  // For Yes/No escalation
  let noClicks = 0;
  let yesScale = 1;
  let noScale = 1;
  let noGone = false;

  // build UI

  function buildBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < MAX_TRIES; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      rowEl.setAttribute("aria-label", `Row ${r + 1}`);
      for (let c = 0; c < WORD_LEN; c++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.setAttribute("role", "gridcell");
        tile.setAttribute("aria-label", "empty");
        tile.dataset.r = String(r);
        tile.dataset.c = String(c);
        rowEl.appendChild(tile);
      }
      boardEl.appendChild(rowEl);
    }
  }

  const KEY_ROWS = [
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["enter","z","x","c","v","b","n","m","back"]
  ];

  function buildKeyboard() {
    keyboardEl.innerHTML = "";
    KEY_ROWS.forEach((keys) => {
      const r = document.createElement("div");
      r.className = "krow";
      keys.forEach((k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "key" + (k === "enter" || k === "back" ? " wide" : "");
        b.textContent = k === "back" ? "⌫" : (k === "enter" ? "Enter" : k.toUpperCase());
        b.dataset.key = k;
        b.addEventListener("click", () => onKey(k));
        r.appendChild(b);
      });
      keyboardEl.appendChild(r);
    });
  }

  function tileEl(r, c) {
    return boardEl.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = msg ? "1" : "0";
    clearTimeout(showToast._t);
    if (!msg) return;
    showToast._t = setTimeout(() => {
      toastEl.style.opacity = "0.85";
    }, 1100);
  }

  // input handling

  function onKey(k) {
    if (locked) return;

    if (k === "enter") return submitGuess();
    if (k === "back") return backspace();
    if (!/^[a-z]$/.test(k)) return;

    if (col < WORD_LEN) {
      grid[row][col] = k;
      const t = tileEl(row, col);
      t.textContent = k.toUpperCase();
      t.classList.add("filled", "pop");
      t.setAttribute("aria-label", `letter ${k}`);
      setTimeout(() => t.classList.remove("pop"), 120);
      col++;
    }
  }

  function backspace() {
    if (col <= 0) return;
    col--;
    grid[row][col] = "";
    const t = tileEl(row, col);
    t.textContent = "";
    t.classList.remove("filled");
    t.setAttribute("aria-label", "empty");
  }

  function getGuess() {
    return grid[row].join("");
  }

  function submitGuess() {
    const guess = getGuess();

    if (guess.length !== WORD_LEN || grid[row].some(ch => ch === "")) {
      showToast("type 5 letters ʕ•ᴥ•ʔ");
      return;
    }
    if (!/^[a-z]{5}$/.test(guess)) {
      showToast("letters only (◕‿◕✿)");
      return;
    }
    if (STRICT_DICTIONARY && !ALLOWED.has(guess)) {
      showToast("not in word list ¯\_(ツ)_/¯");
      return;
    }

    const evald = evaluateGuess(guess, ANSWER);
    paintRow(row, evald);
    updateKeyboard(guess, evald);

    if (guess === ANSWER) {
      locked = true;
      showToast("perfect! ❥(• ε •)");
      setTimeout(() => transitionToValentine(), 650);
      return;
    }

    row++;
    col = 0;

    if (row >= MAX_TRIES) {
      locked = true;
      showToast("try again (ㄒoㄒ)");
      setTimeout(resetGame, 1400);
    } else {
      showToast("nice! keep going (~˘˗˘)~");
    }
  }

  // wordle eval
  function evaluateGuess(guess, answer) {
    const res = Array(WORD_LEN).fill("bad");
    const a = answer.split("");
    const g = guess.split("");

    // greens
    for (let i = 0; i < WORD_LEN; i++) {
      if (g[i] === a[i]) {
        res[i] = "good";
        a[i] = null;
        g[i] = null;
      }
    }
    // yellows
    for (let i = 0; i < WORD_LEN; i++) {
      if (g[i] == null) continue;
      const j = a.indexOf(g[i]);
      if (j !== -1) {
        res[i] = "mid";
        a[j] = null;
      }
    }
    return res;
  }

  function paintRow(r, evald) {
    for (let c = 0; c < WORD_LEN; c++) {
      const t = tileEl(r, c);
      t.classList.remove("good", "mid", "bad");
      t.classList.add(evald[c]);
    }
  }

  function keyButton(letter) {
    return keyboardEl.querySelector(`.key[data-key="${letter}"]`);
  }

  const rank = { bad: 1, mid: 2, good: 3 };

  function updateKeyboard(guess, evald) {
    for (let i = 0; i < WORD_LEN; i++) {
      const ch = guess[i];
      const k = keyButton(ch);
      if (!k) continue;

      const next = evald[i];
      const current =
        k.classList.contains("good") ? "good" :
        k.classList.contains("mid")  ? "mid"  :
        k.classList.contains("bad")  ? "bad"  : null;

      if (!current || rank[next] > rank[current]) {
        k.classList.remove("good","mid","bad");
        k.classList.add(next);
      }
    }
  }

  // transitions

  function transitionToValentine() {
    document.body.classList.add("white-mode");

    const img = valentineView.querySelector("img");
    if (img && img.complete && img.naturalWidth > 0) {
      if (photoFallback) photoFallback.style.display = "none";
    }

    gameView.classList.add("hidden");
    valentineView.classList.remove("hidden");
    noHint.textContent = "";
    initYesNo();
  }

  function transitionToFinal() {
    document.body.classList.add("white-mode");

    valentineView.classList.add("hidden");
    finalView.classList.remove("hidden");
  }

  // yes/no behavior
  function initYesNo() {
    noClicks = 0;
    yesScale = 1;
    noScale = 1;
    noGone = false;

    yesBtn.classList.remove("fullscreen-yes");
    yesBtn.textContent = "yes 🥰";
    yesBtn.style.transform = "scale(1)";

    noBtn.style.display = "inline-block";
    noBtn.style.transform = "scale(1)";
    noBtn.style.opacity = "1";
    noBtn.style.pointerEvents = "auto";

    // yes proceed
    yesBtn.onclick = () => transitionToFinal();

    noBtn.onclick = (e) => {
      e.preventDefault();
      if (noGone) return;

      noClicks++;

      // shrink "no", grow "yes"
      noScale = Math.max(0.05, 1 - noClicks * 0.18);
      yesScale = 1 + noClicks * 0.22;

      noBtn.style.transform = `scale(${noScale})`;
      yesBtn.style.transform = `scale(${yesScale})`;

      const messages = [
        "wait… try again (✿◠‿◠)",
        "are you suuuure? (⊙＿⊙’)",
        "no is getting shy ✖‿✖",
        "okay but… YES is right there ◕ ◡ ◕",
        "no is basically gone now (︶︹︺)"
      ];
      noHint.textContent = messages[Math.min(noClicks - 1, messages.length - 1)];

      if (noScale <= 0.22) {
        noGone = true;
        noBtn.style.display = "none";
        noHint.textContent = "only one choice left (◕‿-)";
      }

      if (yesScale >= 3.0) {
        yesBtn.classList.add("fullscreen-yes");
        yesBtn.textContent = "YES <3 ";
        noHint.textContent = "click YES <3";
      }
    };
  }

  // reset

  function resetGame() {
    document.body.classList.remove("white-mode");

    row = 0;
    col = 0;
    locked = false;
    grid = Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill(""));
    buildBoard();

    keyboardEl.querySelectorAll(".key").forEach(k => {
      k.classList.remove("good","mid","bad");
    });

    showToast("");

    finalView.classList.add("hidden");
    valentineView.classList.add("hidden");
    gameView.classList.remove("hidden");
  }

  // keyboard
  window.addEventListener("keydown", (ev) => {
    if (helpModal.open) return;

    const k = ev.key.toLowerCase();
    if (k === "enter") onKey("enter");
    else if (k === "backspace") onKey("back");
    else if (/^[a-z]$/.test(k)) onKey(k);
  });


  // help modal

  helpBtn.addEventListener("click", () => helpModal.showModal());
  closeHelp.addEventListener("click", () => helpModal.close());
  helpModal.addEventListener("click", (e) => {
    const rect = helpModal.getBoundingClientRect();
    const inDialog =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inDialog) helpModal.close();
  });

  resetBtn.addEventListener("click", resetGame);
  playAgainBtn.addEventListener("click", resetGame);

  // init

  buildBoard();
  buildKeyboard();
  showToast("");
})();