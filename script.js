const revealItems = document.querySelectorAll(".reveal");
const tiltCards = document.querySelectorAll(".tilt-card");
const navLinks = document.querySelectorAll(".nav a");
const sections = document.querySelectorAll("[data-section]");
const skillChips = document.querySelectorAll(".skill-chip");
const consoleOutput = document.querySelector(".console-output");
const counters = document.querySelectorAll("[data-counter]");
const root = document.documentElement;

const gameCanvas = document.querySelector("[data-game-canvas]");
const gameScoreEl = document.querySelector("[data-game-score]");
const gameBestEl = document.querySelector("[data-game-best]");
const gameHealthEl = document.querySelector("[data-game-health]");
const gameStatusEl = document.querySelector("[data-game-status]");
const gameRestartBtn = document.querySelector("[data-game-restart]");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("visible");
      entry.target.querySelectorAll("[data-counter]").forEach((counter) => {
        if (counter.dataset.played === "true") {
          return;
        }

        counter.dataset.played = "true";
        animateCounter(counter);
      });
    });
  },
  { threshold: 0.2 }
);

revealItems.forEach((item) => revealObserver.observe(item));

tiltCards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    const rotateX = ((y / rect.height) - 0.5) * -10;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
        link.classList.toggle("is-current", isCurrent);
      });
    });
  },
  {
    threshold: 0.45,
    rootMargin: "-10% 0px -35% 0px",
  }
);

sections.forEach((section) => sectionObserver.observe(section));

skillChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    skillChips.forEach((item) => item.classList.remove("is-active"));
    chip.classList.add("is-active");

    if (consoleOutput) {
      consoleOutput.textContent = chip.textContent ?? "";
    }
  });
});

counters.forEach((counter) => {
  counter.textContent = "0";
});

window.addEventListener("pointermove", (event) => {
  const x = (event.clientX / window.innerWidth) * 100;
  const y = (event.clientY / window.innerHeight) * 100;
  root.style.setProperty("--pointer-x", `${x}%`);
  root.style.setProperty("--pointer-y", `${y}%`);
});

initShooterGame();

function animateCounter(element) {
  const target = Number(element.dataset.counter);
  const duration = 900;
  const startTime = performance.now();

  const update = (time) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);

    element.textContent = String(value);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
}

function initShooterGame() {
  if (!gameCanvas) {
    return;
  }

  const ctx = gameCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const rectForPointer = () => gameCanvas.getBoundingClientRect();

  const game = {
    width: gameCanvas.width,
    height: gameCanvas.height,
    started: false,
    gameOver: false,
    kills: 0,
    best: Number(window.localStorage.getItem("kshitij_fps_best") || "0"),
    health: 100,
    difficulty: 0,
    lastTime: 0,
    spawnTimer: 48,
    muzzleFlash: 0,
    screenShake: 0,
    hitFlash: 0,
    messageTimer: 0,
    enemies: [],
    particles: [],
    tracers: [],
    stars: Array.from({ length: 24 }, (_, index) => ({
      x: (index * 37) % 920,
      y: 24 + ((index * 53) % 110),
      size: 1 + (index % 2),
    })),
    keys: {
      left: false,
      right: false,
    },
    pointer: {
      x: gameCanvas.width / 2,
      y: gameCanvas.height * 0.48,
      active: false,
    },
    player: {
      lane: 0,
      x: 0,
      targetX: 0,
      fireCooldown: 0,
      weaponLevel: 1,
    },
  };

  const lanePositions = [
    game.width * 0.28,
    game.width * 0.5,
    game.width * 0.72,
  ];

  const enemyTypes = {
    scout: {
      label: "Scout",
      color: "#ff704f",
      eye: "#fff4dc",
      hp: 1,
      speed: [0.0034, 0.005],
      reward: 1,
      wobble: 0.012,
      width: 28,
      height: 48,
    },
    tank: {
      label: "Tank",
      color: "#4d81ff",
      eye: "#ffd25f",
      hp: 3,
      speed: [0.0022, 0.0034],
      reward: 3,
      wobble: 0.004,
      width: 42,
      height: 68,
    },
    phantom: {
      label: "Phantom",
      color: "#60d26d",
      eye: "#08140f",
      hp: 2,
      speed: [0.003, 0.0045],
      reward: 2,
      wobble: 0.02,
      width: 26,
      height: 42,
    },
  };

  game.player.x = lanePositions[1];
  game.player.targetX = lanePositions[1];
  updateHud();
  setStatus("Click or press Space to start");
  requestAnimationFrame(frame);

  window.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      game.keys.left = true;
      moveLane(-1);
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      game.keys.right = true;
      moveLane(1);
    }

    if (event.code === "Space") {
      event.preventDefault();
      shoot();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      game.keys.left = false;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      game.keys.right = false;
    }
  });

  gameCanvas.addEventListener("pointermove", (event) => {
    const rect = rectForPointer();
    const scaleX = game.width / rect.width;
    const scaleY = game.height / rect.height;
    game.pointer.x = clamp((event.clientX - rect.left) * scaleX, 40, game.width - 40);
    game.pointer.y = clamp((event.clientY - rect.top) * scaleY, 46, game.height - 70);
    game.pointer.active = true;
  });

  gameCanvas.addEventListener("pointerleave", () => {
    game.pointer.active = false;
  });

  gameCanvas.addEventListener("pointerdown", (event) => {
    const rect = rectForPointer();
    const scaleX = game.width / rect.width;
    const scaleY = game.height / rect.height;
    game.pointer.x = clamp((event.clientX - rect.left) * scaleX, 40, game.width - 40);
    game.pointer.y = clamp((event.clientY - rect.top) * scaleY, 46, game.height - 70);
    shoot();
  });

  gameRestartBtn?.addEventListener("click", () => {
    resetGame();
  });

  function moveLane(direction) {
    game.player.lane = clamp(game.player.lane + direction, -1, 1);
    game.player.targetX = lanePositions[game.player.lane + 1];
  }

  function shoot() {
    if (game.gameOver) {
      resetGame();
      return;
    }

    if (!game.started) {
      game.started = true;
      setStatus("Clear the corridor");
    }

    if (game.player.fireCooldown > 0) {
      return;
    }

    const weaponLevel = getWeaponLevel();
    game.player.weaponLevel = weaponLevel;
    game.player.fireCooldown = Math.max(3.8, 8 - (weaponLevel - 1) * 1.4);
    game.muzzleFlash = 5 + weaponLevel;
    game.screenShake = 2.5;

    const baseX = game.pointer.active ? game.pointer.x : game.player.x;
    const baseY = game.pointer.active ? game.pointer.y : game.height * 0.45;
    const shotPattern = getShotPattern(weaponLevel);
    const hitEnemies = new Set();

    shotPattern.forEach((offset) => {
      const targetX = clamp(baseX + offset.x, 40, game.width - 40);
      const targetY = clamp(baseY + offset.y, 46, game.height - 70);

      game.tracers.push({
        x1: game.player.x,
        y1: game.height - 106,
        x2: targetX,
        y2: targetY,
        life: 4,
      });

      let hitEnemy = null;
      let hitScore = -Infinity;

      game.enemies.forEach((enemy) => {
        if (enemy.hit || hitEnemies.has(enemy)) {
          return;
        }

        const hitLeft = enemy.screenX - enemy.hitW / 2;
        const hitTop = enemy.screenY - enemy.hitH;
        const hitRight = hitLeft + enemy.hitW;
        const hitBottom = hitTop + enemy.hitH;

        const isInside =
          targetX >= hitLeft &&
          targetX <= hitRight &&
          targetY >= hitTop &&
          targetY <= hitBottom;

        if (isInside) {
          const centerX = hitLeft + enemy.hitW / 2;
          const centerY = hitTop + enemy.hitH / 2;
          const score = enemy.depth * 1000 - Math.hypot(targetX - centerX, targetY - centerY);
          if (score > hitScore) {
            hitScore = score;
            hitEnemy = enemy;
          }
        }
      });

      if (!hitEnemy) {
        burstParticles(targetX, targetY, "#fff4d7", 4, 3);
        return;
      }

      hitEnemies.add(hitEnemy);
      hitEnemy.hp -= 1;
      burstParticles(hitEnemy.screenX, hitEnemy.screenY, hitEnemy.color, 10, 5);
      game.hitFlash = 3;

      if (hitEnemy.hp <= 0) {
        hitEnemy.hit = true;
        game.kills += hitEnemy.reward;
        game.difficulty = Math.min(1.8, Math.floor(game.kills / 4) * 0.12);
        if (game.kills > game.best) {
          game.best = game.kills;
          window.localStorage.setItem("kshitij_fps_best", String(game.best));
        }
        setStatus(`${hitEnemy.label} destroyed`);
      } else {
        setStatus(`${hitEnemy.label} damaged`);
      }
    });

    game.player.weaponLevel = getWeaponLevel();
    updateHud();
  }

  function resetGame() {
    game.started = false;
    game.gameOver = false;
    game.kills = 0;
    game.health = 100;
    game.difficulty = 0;
    game.spawnTimer = 48;
    game.muzzleFlash = 0;
    game.screenShake = 0;
    game.hitFlash = 0;
    game.messageTimer = 0;
    game.enemies = [];
    game.particles = [];
    game.tracers = [];
    game.player.lane = 0;
    game.player.x = lanePositions[1];
    game.player.targetX = lanePositions[1];
    game.player.fireCooldown = 0;
    game.player.weaponLevel = 1;
    setStatus("Click or press Space to start");
    updateHud();
  }

  function spawnEnemy() {
    const typeNames = ["scout", "scout", "scout", "phantom", "phantom", "tank"];
    const typeName = typeNames[Math.floor(Math.random() * typeNames.length)];
    const type = enemyTypes[typeName];
    const lane = Math.floor(Math.random() * 3) - 1;

    game.enemies.push({
      ...type,
      typeName,
      lane,
      depth: 0.02,
      speed: randomBetween(type.speed[0], type.speed[1]) * (1 + game.difficulty * 0.28),
      hp: type.hp,
      maxHp: type.hp,
      phase: Math.random() * Math.PI * 2,
      hit: false,
      remove: false,
      screenX: 0,
      screenY: 0,
      screenW: 0,
      screenH: 0,
      hitW: 0,
      hitH: 0,
    });
  }

  function burstParticles(x, y, color, count, spread) {
    for (let i = 0; i < count; i += 1) {
      game.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * spread * 2,
        vy: (Math.random() - 0.5) * spread * 2,
        size: 3 + Math.random() * 4,
        life: 14 + Math.random() * 12,
        color,
      });
    }
  }

  function setStatus(message) {
    if (!gameStatusEl) {
      return;
    }

    gameStatusEl.textContent = message;
    game.messageTimer = 110;
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - game.lastTime) / 16.666, 2);
    game.lastTime = timestamp;

    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function update(delta) {
    game.player.x += (game.player.targetX - game.player.x) * 0.2 * delta;

    if (game.player.fireCooldown > 0) {
      game.player.fireCooldown -= delta;
    }

    if (game.muzzleFlash > 0) {
      game.muzzleFlash -= delta;
    }

    if (game.screenShake > 0) {
      game.screenShake -= delta;
    }

    if (game.hitFlash > 0) {
      game.hitFlash -= delta;
    }

    if (game.messageTimer > 0) {
      game.messageTimer -= delta;
      if (game.messageTimer <= 0 && !game.gameOver) {
        setIdleStatus();
      }
    }

    game.tracers = game.tracers.filter((tracer) => tracer.life > 0);
    game.tracers.forEach((tracer) => {
      tracer.life -= delta;
    });

    game.particles = game.particles.filter((particle) => particle.life > 0);
    game.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 0.18 * delta;
      particle.life -= delta;
    });

    if (!game.started || game.gameOver) {
      return;
    }

    game.spawnTimer -= delta;
    if (game.spawnTimer <= 0) {
      spawnEnemy();
      const spawnMin = Math.max(24, 62 - game.kills * 0.48);
      const spawnMax = Math.max(42, 94 - game.kills * 0.62);
      game.spawnTimer = randomBetween(spawnMin, spawnMax);
    }

    game.enemies = game.enemies.filter((enemy) => enemy.depth < 1.18 && !enemy.remove);
    game.enemies.forEach((enemy) => {
      if (enemy.hit) {
        enemy.remove = true;
        return;
      }

      enemy.depth += enemy.speed * delta;
      const wobble = Math.sin(performance.now() * enemy.wobble + enemy.phase) * 16 * enemy.depth;
      enemy.screenX = projectLaneX(enemy.lane, enemy.depth) + wobble;
      enemy.screenY = projectY(enemy.depth);
      enemy.screenW = enemy.width * (0.34 + enemy.depth * 1.2);
      enemy.screenH = enemy.height * (0.34 + enemy.depth * 1.2);
      enemy.hitW = enemy.screenW * (enemy.typeName === "phantom" ? 0.94 : 1);
      enemy.hitH = enemy.screenH * (enemy.typeName === "tank" ? 1.08 : 1);

      if (enemy.depth >= 1) {
        enemy.remove = true;
        game.health = Math.max(0, game.health - (enemy.typeName === "tank" ? 18 : enemy.typeName === "phantom" ? 10 : 8));
        game.screenShake = 7;
        burstParticles(enemy.screenX, game.height - 82, "#fff4d7", 12, 5);

        if (game.health <= 0) {
          game.health = 0;
          game.gameOver = true;
          game.started = false;
          if (gameStatusEl) {
            gameStatusEl.textContent = "You were overrun. Shoot or restart.";
          }
        } else {
          setStatus("Hit taken");
        }

        updateHud();
      }
    });
  }

  function draw() {
    const shakeX = game.screenShake > 0 ? (Math.random() - 0.5) * game.screenShake : 0;
    const shakeY = game.screenShake > 0 ? (Math.random() - 0.5) * game.screenShake : 0;

    ctx.save();
    ctx.clearRect(0, 0, game.width, game.height);
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawCorridor();
    drawEnemies();
    drawTracers();
    drawParticles();
    drawWeapon();
    drawCrosshair();
    drawHud();

    if (game.muzzleFlash > 0) {
      drawMuzzleFlash();
    }

    if (game.hitFlash > 0) {
      ctx.fillStyle = "rgba(255, 244, 215, 0.12)";
      ctx.fillRect(0, 0, game.width, game.height);
    }

    if (!game.started && !game.gameOver) {
      drawOverlay("READY", "Shoot to begin");
    } else if (game.gameOver) {
      drawOverlay("GAME OVER", "Shoot or restart");
    }

    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, game.height);
    sky.addColorStop(0, "#180f14");
    sky.addColorStop(0.45, "#5c271e");
    sky.addColorStop(1, "#201113");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, game.width, game.height);

    game.stars.forEach((star) => {
      ctx.fillStyle = "rgba(255, 240, 190, 0.65)";
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.fillStyle = "rgba(255, 139, 76, 0.16)";
    ctx.beginPath();
    ctx.arc(game.width * 0.5, 76, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCorridor() {
    const horizonY = 80;

    ctx.fillStyle = "#2b1718";
    ctx.beginPath();
    ctx.moveTo(game.width * 0.26, horizonY);
    ctx.lineTo(game.width * 0.74, horizonY);
    ctx.lineTo(game.width, game.height);
    ctx.lineTo(0, game.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#391e1d";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(game.width * 0.26, horizonY);
    ctx.lineTo(0, game.height);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(game.width, 0);
    ctx.lineTo(game.width * 0.74, horizonY);
    ctx.lineTo(game.width, game.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f1a85b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(game.width * 0.26, horizonY);
    ctx.lineTo(0, game.height);
    ctx.moveTo(game.width * 0.74, horizonY);
    ctx.lineTo(game.width, game.height);
    ctx.stroke();

    for (let i = 1; i <= 11; i += 1) {
      const t = i / 11;
      const y = horizonY + t * t * (game.height - horizonY);
      const left = lerp(game.width * 0.26, 0, t);
      const right = lerp(game.width * 0.74, game.width, t);

      ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 213, 103, 0.18)" : "rgba(255, 111, 72, 0.18)";
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    [0.36, 0.5, 0.64].forEach((fraction) => {
      ctx.strokeStyle = "rgba(255, 244, 215, 0.12)";
      ctx.beginPath();
      ctx.moveTo(game.width * fraction, horizonY);
      ctx.lineTo(lerp(game.width * fraction, game.width * fraction, 1), game.height);
      ctx.stroke();
    });

    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      const x = lerp(0, game.width * 0.24, t);
      const y = lerp(game.height, horizonY, t);
      ctx.fillStyle = "rgba(255, 186, 108, 0.16)";
      ctx.fillRect(x, y, 8 + t * 6, 18 + t * 20);
      ctx.fillRect(game.width - x - (8 + t * 6), y, 8 + t * 6, 18 + t * 20);
    }
  }

  function drawEnemies() {
    const enemies = [...game.enemies].sort((a, b) => a.depth - b.depth);

    enemies.forEach((enemy) => {
      const x = enemy.screenX - enemy.screenW / 2;
      const y = enemy.screenY - enemy.screenH;

      if (enemy.typeName === "scout") {
        drawScout(enemy, x, y);
      } else if (enemy.typeName === "tank") {
        drawTank(enemy, x, y);
      } else {
        drawPhantom(enemy, x, y);
      }

      drawEnemyBar(enemy, x, y);
    });
  }

  function drawScout(enemy, x, y) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(x, y + enemy.screenH * 0.16, enemy.screenW, enemy.screenH * 0.84);
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + enemy.screenH * 0.16, enemy.screenW, enemy.screenH * 0.84);

    ctx.fillStyle = "#ff977d";
    ctx.fillRect(x + enemy.screenW * 0.16, y, enemy.screenW * 0.68, enemy.screenH * 0.34);
    ctx.strokeRect(x + enemy.screenW * 0.16, y, enemy.screenW * 0.68, enemy.screenH * 0.34);

    ctx.fillStyle = enemy.eye;
    ctx.fillRect(x + enemy.screenW * 0.24, y + enemy.screenH * 0.08, enemy.screenW * 0.14, enemy.screenW * 0.14);
    ctx.fillRect(x + enemy.screenW * 0.62, y + enemy.screenH * 0.08, enemy.screenW * 0.14, enemy.screenW * 0.14);

    ctx.fillStyle = "#18110b";
    ctx.fillRect(x + enemy.screenW * 0.42, y + enemy.screenH * 0.2, enemy.screenW * 0.16, enemy.screenH * 0.08);
  }

  function drawTank(enemy, x, y) {
    ctx.fillStyle = "#233a87";
    ctx.fillRect(x + enemy.screenW * 0.08, y - enemy.screenH * 0.12, enemy.screenW * 0.84, enemy.screenH * 0.2);
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + enemy.screenW * 0.08, y - enemy.screenH * 0.12, enemy.screenW * 0.84, enemy.screenH * 0.2);

    ctx.fillStyle = enemy.color;
    ctx.fillRect(x, y + enemy.screenH * 0.1, enemy.screenW, enemy.screenH * 0.9);
    ctx.strokeRect(x, y + enemy.screenH * 0.1, enemy.screenW, enemy.screenH * 0.9);

    ctx.fillStyle = "#7ca2ff";
    ctx.fillRect(x + enemy.screenW * 0.12, y + enemy.screenH * 0.24, enemy.screenW * 0.76, enemy.screenH * 0.2);
    ctx.strokeRect(x + enemy.screenW * 0.12, y + enemy.screenH * 0.24, enemy.screenW * 0.76, enemy.screenH * 0.2);

    ctx.fillStyle = enemy.eye;
    ctx.fillRect(x + enemy.screenW * 0.18, y + enemy.screenH * 0.52, enemy.screenW * 0.18, enemy.screenW * 0.18);
    ctx.fillRect(x + enemy.screenW * 0.64, y + enemy.screenH * 0.52, enemy.screenW * 0.18, enemy.screenW * 0.18);
  }

  function drawPhantom(enemy, x, y) {
    ctx.fillStyle = "rgba(96, 210, 109, 0.18)";
    ctx.fillRect(x - 6, y - 6, enemy.screenW + 12, enemy.screenH + 12);

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(x + enemy.screenW / 2, y);
    ctx.lineTo(x + enemy.screenW, y + enemy.screenH * 0.38);
    ctx.lineTo(x + enemy.screenW * 0.82, y + enemy.screenH);
    ctx.lineTo(x + enemy.screenW * 0.56, y + enemy.screenH * 0.84);
    ctx.lineTo(x + enemy.screenW * 0.44, y + enemy.screenH);
    ctx.lineTo(x + enemy.screenW * 0.18, y + enemy.screenH * 0.84);
    ctx.lineTo(x, y + enemy.screenH * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#0c1610";
    ctx.fillRect(x + enemy.screenW * 0.26, y + enemy.screenH * 0.3, enemy.screenW * 0.48, enemy.screenH * 0.18);
    ctx.fillStyle = enemy.eye;
    ctx.fillRect(x + enemy.screenW * 0.3, y + enemy.screenH * 0.34, enemy.screenW * 0.12, enemy.screenW * 0.12);
    ctx.fillRect(x + enemy.screenW * 0.58, y + enemy.screenH * 0.34, enemy.screenW * 0.12, enemy.screenW * 0.12);
  }

  function drawEnemyBar(enemy, x, y) {
    if (enemy.maxHp <= 1) {
      return;
    }

    const barY = y - 10;
    ctx.fillStyle = "rgba(24, 17, 11, 0.5)";
    ctx.fillRect(x, barY, enemy.screenW, 6);
    ctx.fillStyle = "#6cdc72";
    ctx.fillRect(x, barY, enemy.screenW * (enemy.hp / enemy.maxHp), 6);
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, barY, enemy.screenW, 6);
  }

  function drawTracers() {
    game.tracers.forEach((tracer) => {
      ctx.globalAlpha = Math.max(tracer.life / 4, 0);
      ctx.strokeStyle = "#fff0bf";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tracer.x1, tracer.y1);
      ctx.lineTo(tracer.x2, tracer.y2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    game.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(particle.life / 20, 0);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawWeapon() {
    const centerX = game.player.x;
    const baseY = game.height - 16;
    const weaponLevel = game.player.weaponLevel;

    ctx.fillStyle = "#202230";
    ctx.beginPath();
    ctx.moveTo(centerX - 76, baseY);
    ctx.lineTo(centerX - 30, game.height - 98);
    ctx.lineTo(centerX + 30, game.height - 98);
    ctx.lineTo(centerX + 76, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#f2a647";
    ctx.fillRect(centerX - 12, game.height - 116, 24, 46);
    ctx.strokeRect(centerX - 12, game.height - 116, 24, 46);

    ctx.fillStyle = "#3d73d8";
    ctx.fillRect(centerX - 32, game.height - 82, 64, 14);
    ctx.strokeRect(centerX - 32, game.height - 82, 64, 14);

    if (weaponLevel >= 2) {
      ctx.fillStyle = "#6cdc72";
      ctx.fillRect(centerX - 44, game.height - 94, 12, 22);
      ctx.fillRect(centerX + 32, game.height - 94, 12, 22);
      ctx.strokeRect(centerX - 44, game.height - 94, 12, 22);
      ctx.strokeRect(centerX + 32, game.height - 94, 12, 22);
    }

    if (weaponLevel >= 3) {
      ctx.fillStyle = "#ff704f";
      ctx.fillRect(centerX - 10, game.height - 130, 20, 14);
      ctx.strokeRect(centerX - 10, game.height - 130, 20, 14);
    }

    if (weaponLevel >= 4) {
      ctx.fillStyle = "#ffd25f";
      ctx.fillRect(centerX - 58, game.height - 88, 18, 10);
      ctx.fillRect(centerX + 40, game.height - 88, 18, 10);
      ctx.strokeRect(centerX - 58, game.height - 88, 18, 10);
      ctx.strokeRect(centerX + 40, game.height - 88, 18, 10);
    }
  }

  function drawCrosshair() {
    const x = game.pointer.active ? game.pointer.x : game.player.x;
    const y = game.pointer.active ? game.pointer.y : game.height * 0.45;

    ctx.strokeStyle = game.hitFlash > 0 ? "#ffd25f" : "#fff4d7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHud() {
    ctx.fillStyle = "rgba(24, 17, 11, 0.4)";
    ctx.fillRect(18, 18, 190, 22);
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 190, 22);
    ctx.fillStyle = game.health > 45 ? "#6cdc72" : "#ff704f";
    ctx.fillRect(18, 18, (190 * game.health) / 100, 22);

    ctx.fillStyle = "rgba(255, 244, 215, 0.15)";
    ctx.fillRect(game.width - 190, 18, 172, 22);
    ctx.strokeRect(game.width - 190, 18, 172, 22);
    ctx.fillStyle = "#ffd25f";
    const cooldownBase = Math.max(3.8, 8 - (game.player.weaponLevel - 1) * 1.4);
    ctx.fillRect(game.width - 190, 18, Math.min(172, 172 * (game.player.fireCooldown <= 0 ? 1 : 1 - game.player.fireCooldown / cooldownBase)), 22);

    ctx.fillStyle = "#fff4d7";
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = "left";
    ctx.fillText(`WPN ${game.player.weaponLevel}`, game.width - 186, 58);
  }

  function drawMuzzleFlash() {
    const x = game.player.x;
    const y = game.height - 122;
    ctx.fillStyle = "rgba(255, 240, 190, 0.65)";
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x - 18, y + 20);
    ctx.lineTo(x, y + 8);
    ctx.lineTo(x + 18, y + 20);
    ctx.closePath();
    ctx.fill();
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, game.width, game.height);
    ctx.fillStyle = "#fff4d7";
    ctx.fillRect(game.width / 2 - 184, game.height / 2 - 56, 368, 110);
    ctx.strokeStyle = "#18110b";
    ctx.lineWidth = 4;
    ctx.strokeRect(game.width / 2 - 184, game.height / 2 - 56, 368, 110);
    ctx.fillStyle = "#18110b";
    ctx.textAlign = "center";
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText(title, game.width / 2, game.height / 2 - 10);
    ctx.font = '16px "Space Grotesk"';
    ctx.fillText(subtitle, game.width / 2, game.height / 2 + 24);
  }

  function setIdleStatus() {
    if (game.gameOver || !gameStatusEl) {
      return;
    }

    gameStatusEl.textContent = game.started
      ? "Mouse aim active"
      : "Click or press Space to start";
  }

  function updateHud() {
    if (gameScoreEl) {
      gameScoreEl.textContent = String(game.kills);
    }

    if (gameBestEl) {
      gameBestEl.textContent = String(game.best);
    }

    if (gameHealthEl) {
      gameHealthEl.textContent = String(game.health);
    }
  }

  function projectLaneX(lane, depth) {
    const horizonX = game.width * 0.5 + lane * 48;
    const floorX = lanePositions[lane + 1];
    return lerp(horizonX, floorX, depth);
  }

  function projectY(depth) {
    return lerp(96, game.height - 70, depth);
  }

  function getWeaponLevel() {
    if (game.kills >= 20) {
      return 4;
    }
    if (game.kills >= 12) {
      return 3;
    }
    if (game.kills >= 6) {
      return 2;
    }
    return 1;
  }

  function getShotPattern(level) {
    if (level === 1) {
      return [{ x: 0, y: 0 }];
    }

    if (level === 2) {
      return [
        { x: -10, y: 0 },
        { x: 10, y: 0 },
      ];
    }

    if (level === 3) {
      return [
        { x: -16, y: -4 },
        { x: 0, y: 0 },
        { x: 16, y: -4 },
      ];
    }

    return [
      { x: -22, y: -6 },
      { x: -8, y: 0 },
      { x: 8, y: 0 },
      { x: 22, y: -6 },
    ];
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
