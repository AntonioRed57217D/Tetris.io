// ==========================================================================
// Tetris Arcade — Game Logic & Audio Engine (script.js)
// Standard 10x20 Grid, 7-Bag Randomizer, Hold Queue, Ghost Piece & Web Audio
// ==========================================================================

(function () {
  'use strict';

  const COLS = 10;
  const ROWS = 20;

  // Standard Tetromino Definitions (Matrices & Colors)
  const SHAPES = {
    I: {
      color: '#22d3ee',
      light: '#a5f3fc',
      dark: '#0891b2',
      matrix: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    },
    J: {
      color: '#3b82f6',
      light: '#93c5fd',
      dark: '#1d4ed8',
      matrix: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ]
    },
    L: {
      color: '#f97316',
      light: '#fdba74',
      dark: '#c2410c',
      matrix: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ]
    },
    O: {
      color: '#eab308',
      light: '#fef08a',
      dark: '#a16207',
      matrix: [
        [1, 1],
        [1, 1]
      ]
    },
    S: {
      color: '#22c55e',
      light: '#86efac',
      dark: '#15803d',
      matrix: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ]
    },
    T: {
      color: '#a855f7',
      light: '#d8b4fe',
      dark: '#7e22ce',
      matrix: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ]
    },
    Z: {
      color: '#ef4444',
      light: '#fca5a5',
      dark: '#b91c1c',
      matrix: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ]
    }
  };

  const PIECE_TYPES = Object.keys(SHAPES);

  // Synthesized Web Audio Sound Engine
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    tone(freq, duration, type = 'triangle', gainVal = 0.08, delay = 0) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    }

    move() {
      this.tone(240, 0.045, 'triangle', 0.05);
    }

    rotate() {
      this.tone(380, 0.06, 'sine', 0.07);
      this.tone(520, 0.06, 'sine', 0.06, 0.03);
    }

    softDrop() {
      this.tone(190, 0.035, 'sine', 0.04);
    }

    hardDrop() {
      this.tone(140, 0.09, 'square', 0.08);
    }

    hold() {
      this.tone(330, 0.06, 'sine', 0.06);
      this.tone(440, 0.07, 'sine', 0.06, 0.05);
    }

    clear(lines) {
      const notes = lines === 4 ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      notes.forEach((n, idx) => {
        this.tone(n, 0.14, 'triangle', 0.09, idx * 0.055);
      });
    }

    gameOver() {
      [392, 349.23, 329.63, 261.63].forEach((n, idx) => {
        this.tone(n, 0.22, 'sawtooth', 0.06, idx * 0.14);
      });
    }
  }

  const sfx = new SoundEngine();

  // DOM Elements
  const boardCanvas = document.getElementById('board-canvas');
  const boardCtx = boardCanvas.getContext('2d');
  const holdCanvas = document.getElementById('hold-canvas');
  const holdCtx = holdCanvas.getContext('2d');
  const nextCanvas = document.getElementById('next-canvas');
  const nextCtx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('score-val');
  const highScoreEl = document.getElementById('high-score-val');
  const levelEl = document.getElementById('level-val');
  const linesEl = document.getElementById('lines-val');
  const comboEl = document.getElementById('combo-val');
  const b2bEl = document.getElementById('b2b-val');

  const startLevelSelect = document.getElementById('start-level');
  const btnGhost = document.getElementById('btn-ghost');
  const btnMute = document.getElementById('btn-mute');
  const muteLabel = document.getElementById('mute-label');
  const btnPause = document.getElementById('btn-pause');
  const btnRestart = document.getElementById('btn-restart');

  const overlay = document.getElementById('board-overlay');
  const overlayBadge = document.getElementById('overlay-badge');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  const overlayStats = document.getElementById('overlay-stats');
  const finalScoreEl = document.getElementById('final-score');
  const finalLinesEl = document.getElementById('final-lines');
  const btnOverlayStart = document.getElementById('btn-overlay-start');
  const actionToast = document.getElementById('action-toast');

  // Touch Pad Buttons
  const padLeft = document.getElementById('pad-left');
  const padRight = document.getElementById('pad-right');
  const padDown = document.getElementById('pad-down');
  const padCCW = document.getElementById('pad-ccw');
  const padCW = document.getElementById('pad-cw');
  const padDrop = document.getElementById('pad-drop');
  const padHold = document.getElementById('pad-hold');

  // Game State
  let cellSize = 28;
  let board = createEmptyBoard();
  let bag = [];
  let nextQueue = [];
  let activePiece = null;
  let holdType = null;
  let canHold = true;

  let score = 0;
  let highScore = loadHighScore();
  let lines = 0;
  let level = 1;
  let startLevel = 1;
  let combo = -1;
  let backToBack = false;
  let showGhost = true;

  let isRunning = false;
  let isPaused = false;
  let isGameOver = false;
  let animFrameId = null;
  let lastFrameTime = 0;
  let dropAccumulator = 0;
  let toastTimeout = null;

  highScoreEl.textContent = highScore.toLocaleString();

  function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function loadHighScore() {
    try {
      const saved = localStorage.getItem('tetris_arcade_highscore');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveHighScore(val) {
    try {
      localStorage.setItem('tetris_arcade_highscore', String(val));
    } catch (e) {
      // Ignore storage errors in sandboxed iframes
    }
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function refillBag() {
    const newBag = PIECE_TYPES.slice();
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = newBag[i];
      newBag[i] = newBag[j];
      newBag[j] = temp;
    }
    bag.push(...newBag);
  }

  function pullFromBag() {
    if (bag.length < 7) {
      refillBag();
    }
    return bag.shift();
  }

  function initQueue() {
    bag = [];
    nextQueue = [];
    refillBag();
    for (let i = 0; i < 3; i++) {
      nextQueue.push(pullFromBag());
    }
  }

  function createPiece(type) {
    const def = SHAPES[type];
    const matrix = cloneMatrix(def.matrix);
    return {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: 0
    };
  }

  function spawnNextPiece() {
    const nextType = nextQueue.shift();
    nextQueue.push(pullFromBag());
    activePiece = createPiece(nextType);
    canHold = true;

    if (collides(board, activePiece.matrix, activePiece.x, activePiece.y)) {
      triggerGameOver();
    }
    drawSideCanvases();
  }

  function collides(grid, matrix, offsetX, offsetY) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nx = offsetX + c;
        const ny = offsetY + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) {
          return true;
        }
        if (ny >= 0 && grid[ny][nx]) {
          return true;
        }
      }
    }
    return false;
  }

  function rotateMatrix(matrix, dir) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (dir > 0) {
          result[c][N - 1 - r] = matrix[r][c];
        } else {
          result[N - 1 - c][r] = matrix[r][c];
        }
      }
    }
    return result;
  }

  function rotateActive(dir) {
    if (!isRunning || isPaused || isGameOver || !activePiece) return;
    const rotated = rotateMatrix(activePiece.matrix, dir);
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-2, 0],
      [2, 0],
      [-1, -1],
      [1, -1]
    ];

    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      if (!collides(board, rotated, activePiece.x + kx, activePiece.y + ky)) {
        activePiece.matrix = rotated;
        activePiece.x += kx;
        activePiece.y += ky;
        sfx.rotate();
        renderBoard();
        return;
      }
    }
  }

  function moveActive(dx) {
    if (!isRunning || isPaused || isGameOver || !activePiece) return;
    if (!collides(board, activePiece.matrix, activePiece.x + dx, activePiece.y)) {
      activePiece.x += dx;
      sfx.move();
      renderBoard();
    }
  }

  function softDrop() {
    if (!isRunning || isPaused || isGameOver || !activePiece) return;
    if (!collides(board, activePiece.matrix, activePiece.x, activePiece.y + 1)) {
      activePiece.y += 1;
      score += 1;
      dropAccumulator = 0;
      sfx.softDrop();
      updateScoreUI();
      renderBoard();
    } else {
      lockPiece();
    }
  }

  function getGhostY() {
    if (!activePiece) return 0;
    let gy = activePiece.y;
    while (!collides(board, activePiece.matrix, activePiece.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  function hardDrop() {
    if (!isRunning || isPaused || isGameOver || !activePiece) return;
    const targetY = getGhostY();
    const cellsDropped = Math.max(0, targetY - activePiece.y);
    activePiece.y = targetY;
    score += cellsDropped * 2;
    sfx.hardDrop();
    lockPiece();
  }

  function holdPiece() {
    if (!isRunning || isPaused || isGameOver || !activePiece || !canHold) return;
    sfx.hold();
    const currentType = activePiece.type;
    if (!holdType) {
      holdType = currentType;
      spawnNextPiece();
    } else {
      const swapType = holdType;
      holdType = currentType;
      activePiece = createPiece(swapType);
      if (collides(board, activePiece.matrix, activePiece.x, activePiece.y)) {
        triggerGameOver();
        return;
      }
    }
    canHold = false;
    drawSideCanvases();
    renderBoard();
  }

  function lockPiece() {
    if (!activePiece) return;
    const { matrix, x, y, type } = activePiece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const by = y + r;
          const bx = x + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            board[by][bx] = type;
          }
        }
      }
    }

    const clearedCount = sweepLines();
    if (clearedCount > 0) {
      applyLineScore(clearedCount);
    } else {
      combo = -1;
      updateScoreUI();
    }

    spawnNextPiece();
    renderBoard();
  }

  function sweepLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    return cleared;
  }

  function applyLineScore(cleared) {
    combo++;
    const basePoints = [0, 100, 300, 500, 800][cleared] || 0;
    let earned = basePoints * level;

    const isTetris = cleared === 4;
    if (isTetris && backToBack) {
      earned = Math.floor(earned * 1.5);
      showToast('BACK-TO-BACK TETRIS! +' + earned);
    } else if (isTetris) {
      showToast('TETRIS! +' + earned);
    } else if (cleared === 3) {
      showToast('TRIPLE! +' + earned);
    } else if (cleared === 2) {
      showToast('DOUBLE! +' + earned);
    } else if (combo > 1) {
      showToast(combo + 'x COMBO!');
    }

    if (combo > 0) {
      earned += 50 * combo * level;
    }

    backToBack = isTetris;
    score += earned;
    lines += cleared;
    level = Math.max(startLevel, Math.floor(lines / 10) + startLevel);

    sfx.clear(cleared);
    updateScoreUI();
  }

  function showToast(text) {
    if (!actionToast) return;
    actionToast.textContent = text;
    actionToast.classList.add('visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      actionToast.classList.remove('visible');
    }, 1100);
  }

  function updateScoreUI() {
    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
    }
    scoreEl.textContent = score.toLocaleString();
    highScoreEl.textContent = highScore.toLocaleString();
    levelEl.textContent = String(level);
    linesEl.textContent = String(lines);
    comboEl.textContent = Math.max(0, combo) + 'x';
    b2bEl.textContent = backToBack ? 'B2B Active' : 'Standard';
  }

  function getDropInterval() {
    return Math.max(85, 850 - (level - 1) * 65);
  }

  // Rendering Helpers
  function drawBeveledCell(ctx, x, y, size, type, alpha = 1) {
    const def = SHAPES[type];
    if (!def) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Main block fill
    ctx.fillStyle = def.color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Top/left neon highlight
    ctx.fillStyle = def.light;
    ctx.fillRect(x + 1, y + 1, size - 2, 3);
    ctx.fillRect(x + 1, y + 1, 3, size - 2);

    // Bottom/right deep bevel
    ctx.fillStyle = def.dark;
    ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
    ctx.fillRect(x + size - 4, y + 1, 3, size - 2);

    // Inner core sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);

    ctx.restore();
  }

  function renderBoard() {
    const width = boardCanvas.width;
    const height = boardCanvas.height;

    boardCtx.clearRect(0, 0, width, height);

    // Recessed Sci-Fi Tile Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        boardCtx.fillStyle = 'rgba(13, 22, 38, 0.65)';
        boardCtx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        boardCtx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        boardCtx.lineWidth = 1;
        boardCtx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      }
    }

    // Locked blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cellType = board[r][c];
        if (cellType) {
          drawBeveledCell(boardCtx, c * cellSize, r * cellSize, cellSize, cellType, 1);
        }
      }
    }

    // Active Piece & Ghost Piece
    if (activePiece && !isGameOver) {
      const { matrix, x, y, type } = activePiece;

      if (showGhost) {
        const ghostY = getGhostY();
        if (ghostY !== y) {
          for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
              if (matrix[r][c]) {
                const gx = (x + c) * cellSize;
                const gy = (ghostY + r) * cellSize;
                boardCtx.save();
                boardCtx.strokeStyle = SHAPES[type].light;
                boardCtx.lineWidth = 1.5;
                boardCtx.fillStyle = 'rgba(34, 211, 238, 0.08)';
                boardCtx.fillRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4);
                boardCtx.strokeRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4);
                boardCtx.restore();
              }
            }
          }
        }
      }

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            drawBeveledCell(
              boardCtx,
              (x + c) * cellSize,
              (y + r) * cellSize,
              cellSize,
              type,
              1
            );
          }
        }
      }
    }
  }

  function drawHudGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.11)';
    ctx.lineWidth = 1;
    const step = 16;
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMiniPiece(ctx, type, boxWidth, offsetY, boxHeight) {
    if (!type) return;
    const matrix = SHAPES[type].matrix;
    const miniCell = 20;

    let minR = matrix.length, maxR = 0, minC = matrix[0].length, maxC = 0;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }

    const pieceW = (maxC - minC + 1) * miniCell;
    const pieceH = (maxR - minR + 1) * miniCell;
    const startX = Math.floor((boxWidth - pieceW) / 2) - minC * miniCell;
    const startY = offsetY + Math.floor((boxHeight - pieceH) / 2) - minR * miniCell;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          drawBeveledCell(
            ctx,
            startX + c * miniCell,
            startY + r * miniCell,
            miniCell,
            type,
            1
          );
        }
      }
    }
  }

  function drawSideCanvases() {
    // Hold Canvas
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    drawHudGrid(holdCtx, holdCanvas.width, holdCanvas.height);
    if (holdType) {
      drawMiniPiece(holdCtx, holdType, holdCanvas.width, 0, holdCanvas.height);
    }

    // Next Queue Canvas
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawHudGrid(nextCtx, nextCanvas.width, nextCanvas.height);
    const slotHeight = nextCanvas.height / 3;
    nextQueue.slice(0, 3).forEach((type, idx) => {
      drawMiniPiece(nextCtx, type, nextCanvas.width, idx * slotHeight, slotHeight);
    });
  }

  function resizeBoard() {
    const vh = window.innerHeight || 720;
    const vw = window.innerWidth || 960;

    let maxBoardHeight = vh - 230;
    if (vw <= 760) {
      maxBoardHeight = vh - 290;
    }
    const targetCell = Math.max(20, Math.min(30, Math.floor(maxBoardHeight / ROWS)));
    cellSize = targetCell;

    boardCanvas.width = COLS * cellSize;
    boardCanvas.height = ROWS * cellSize;

    renderBoard();
    drawSideCanvases();
  }

  // Game Loop & Lifecycle
  function gameLoop(timestamp) {
    if (!isRunning || isPaused || isGameOver) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    dropAccumulator += delta;
    const interval = getDropInterval();

    if (dropAccumulator >= interval) {
      dropAccumulator = 0;
      if (activePiece) {
        if (!collides(board, activePiece.matrix, activePiece.x, activePiece.y + 1)) {
          activePiece.y += 1;
        } else {
          lockPiece();
        }
      }
      renderBoard();
    }

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function startNewGame() {
    sfx.init();
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    startLevel = parseInt(startLevelSelect.value, 10) || 1;
    board = createEmptyBoard();
    holdType = null;
    canHold = true;
    score = 0;
    lines = 0;
    level = startLevel;
    combo = -1;
    backToBack = false;

    isGameOver = false;
    isPaused = false;
    isRunning = true;
    lastFrameTime = 0;
    dropAccumulator = 0;

    btnPause.textContent = 'Pause';
    overlay.classList.add('hidden');
    overlayStats.classList.add('hidden');

    initQueue();
    spawnNextPiece();
    updateScoreUI();
    renderBoard();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (!isRunning || isGameOver) return;
    isPaused = !isPaused;

    if (isPaused) {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      btnPause.textContent = 'Resume';
      overlayBadge.textContent = 'GAME PAUSED';
      overlayTitle.textContent = 'PAUSED';
      overlayDesc.textContent = 'Take a breather. Press Resume or P to continue.';
      overlayStats.classList.add('hidden');
      btnOverlayStart.textContent = 'Resume Game';
      overlay.classList.remove('hidden');
    } else {
      btnPause.textContent = 'Pause';
      overlay.classList.add('hidden');
      lastFrameTime = performance.now();
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function triggerGameOver() {
    isGameOver = true;
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    sfx.gameOver();

    overlayBadge.textContent = 'MATCH COMPLETE';
    overlayTitle.textContent = 'GAME OVER';
    overlayDesc.textContent = 'Board topped out! Ready for another round?';
    finalScoreEl.textContent = score.toLocaleString();
    finalLinesEl.textContent = String(lines);
    overlayStats.classList.remove('hidden');
    btnOverlayStart.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  // Event Listeners
  btnOverlayStart.addEventListener('click', () => {
    if (isPaused && isRunning && !isGameOver) {
      togglePause();
    } else {
      startNewGame();
    }
  });

  btnRestart.addEventListener('click', () => {
    startNewGame();
  });

  btnPause.addEventListener('click', () => {
    if (!isRunning && !isGameOver) {
      startNewGame();
    } else {
      togglePause();
    }
  });

  btnGhost.addEventListener('click', () => {
    showGhost = !showGhost;
    btnGhost.classList.toggle('active', showGhost);
    btnGhost.setAttribute('aria-pressed', String(showGhost));
    btnGhost.querySelector('span:last-child').textContent = showGhost ? 'Ghost: ON' : 'Ghost: OFF';
    renderBoard();
  });

  btnMute.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    btnMute.classList.toggle('active', sfx.enabled);
    btnMute.setAttribute('aria-pressed', String(sfx.enabled));
    muteLabel.textContent = sfx.enabled ? 'SFX: ON' : 'SFX: OFF';
  });

  startLevelSelect.addEventListener('change', () => {
    startLevel = parseInt(startLevelSelect.value, 10) || 1;
    if (!isRunning) {
      level = startLevel;
      levelEl.textContent = String(level);
    }
  });

  // On-Screen Touch / Click Controls
  padLeft.addEventListener('click', () => moveActive(-1));
  padRight.addEventListener('click', () => moveActive(1));
  padDown.addEventListener('click', () => softDrop());
  padCCW.addEventListener('click', () => rotateActive(-1));
  padCW.addEventListener('click', () => rotateActive(1));
  padDrop.addEventListener('click', () => hardDrop());
  padHold.addEventListener('click', () => holdPiece());

  // Keyboard Controls
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) {
      return;
    }

    const code = e.code;
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowDown',
        'ArrowUp',
        'Space'
      ].includes(code)
    ) {
      e.preventDefault();
    }

    if (code === 'KeyP' || code === 'Escape') {
      togglePause();
      return;
    }
    if (code === 'KeyR') {
      startNewGame();
      return;
    }
    if (code === 'KeyM') {
      btnMute.click();
      return;
    }
    if (code === 'KeyG') {
      btnGhost.click();
      return;
    }

    if (!isRunning || isPaused || isGameOver) return;

    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        moveActive(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveActive(1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        softDrop();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyX':
        rotateActive(1);
        break;
      case 'KeyZ':
        rotateActive(-1);
        break;
      case 'Space':
        rotateActive(1);
        break;
      case 'Enter':
        hardDrop();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        holdPiece();
        break;
      default:
        break;
    }
  });

  window.addEventListener('resize', resizeBoard);
  window.addEventListener('load', () => {
    resizeBoard();
    drawSideCanvases();
    renderBoard();
  });
})();
