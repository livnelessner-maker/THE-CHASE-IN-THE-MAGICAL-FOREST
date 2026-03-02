// main game logic moved from index.html
console.log('game.js loaded');

// --- מערכת ההתאמה האוטומטית למסך (Smart Scale) ---
let gameScale = 1;
const container = document.getElementById('game-container');
function resizeGame() {
    // always base scaling on the *window* size rather than the container's own
    // computed width, otherwise making the container fluid causes recursive
    // shrinking (it would scale the scaled size again).
    let scaleX = window.innerWidth  / 1000;
    let scaleY = window.innerHeight / 650;
    gameScale = Math.min(scaleX, scaleY);
    if (container) {
        container.style.transform = `scale(${gameScale})`;
    }
}
window.addEventListener('resize', resizeGame);
resizeGame();

const player = document.getElementById("player");
const hunter = document.getElementById("hunter");
const boss = document.getElementById("boss");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const centerMsg = document.getElementById("center-msg");
const boostMsg = document.getElementById("boost-msg");
const bossUI = document.getElementById("boss-ui");

const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const adminScreen = document.getElementById("admin-screen");

const passwordModal = document.getElementById("password-modal");
const passwordInput = document.getElementById("admin-password-input");
const submitPasswordBtn = document.getElementById("submit-password-btn");
const cancelPasswordBtn = document.getElementById("cancel-password-btn");
const passwordError = document.getElementById("password-error");

const nameInput = document.getElementById("player-name");
const startBtn = document.getElementById("start-btn");

// make sure start button can't be used until we have a name
if (startBtn) {
    startBtn.disabled = true;
}
if (nameInput) {
    nameInput.addEventListener('input', () => {
        if (startBtn) {
            startBtn.disabled = nameInput.value.trim() === '';
        }
        // hide error once typing begins
        const err = document.getElementById('name-error');
        if (err && nameInput.value.trim() !== '') err.style.display = 'none';
    });
}

const playAgainBtn = document.getElementById("play-again-btn");
const homeBtn = document.getElementById("home-btn");

const adminPanelBtn = document.getElementById("admin-panel-btn");
const adminBackBtn = document.getElementById("admin-back-btn");
const adminClearAllBtn = document.getElementById("admin-clear-all-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const resetSettingsBtn = document.getElementById("reset-settings-btn");
const adminTableBody = document.getElementById("admin-table-body");
const leaderboardBody = document.getElementById("leaderboard-body");

const redHpText = document.getElementById("red-hp-text");
const hunterHpText = document.getElementById("hunter-hp-text");
const bossHpText = document.getElementById("boss-hp-text");

// mobile control buttons
const jumpBtn = document.getElementById('jump-btn');
const duckBtn = document.getElementById('duck-btn');
const shootBtn = document.getElementById('shoot-btn');

// helpers to start the game
function startGame() {
    // mirror keyboard/touch protections: only start if name entered and no overlay shown
    if (
        !gameStarted &&
        isNameEntered &&
        startScreen.style.display !== "flex" &&
        adminScreen.style.display !== "flex" &&
        passwordModal.style.display !== "flex"
    ) {
        gameStarted = true;
        centerMsg.style.display = "none";
        createObstacle();
    }
}

// listeners for on-screen mobile controls
if (jumpBtn) {
    const handleJumpControl = (e) => {
        if (e) e.preventDefault();
        startGame();
        jump();
    };
    jumpBtn.addEventListener('touchstart', handleJumpControl);
    jumpBtn.addEventListener('click', handleJumpControl); // fallback for mouse/desktop emulation
}
if (duckBtn) {
    duckBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (jumps === 0) { isDucking = true; player.classList.add('duck'); hunter.classList.add('duck'); } });
    duckBtn.addEventListener('touchend', (e) => { isDucking = false; player.classList.remove('duck'); hunter.classList.remove('duck'); });
    duckBtn.addEventListener('click', (e) => { // support non-touch devices
        e.preventDefault(); if (jumps === 0) { isDucking = true; player.classList.add('duck'); hunter.classList.add('duck'); }
    });
}
if (shootBtn) {
    const shootHandler = (e) => {
        e.preventDefault();
        if (isBossFightActive && hunterHP > 0 && canShoot) { shootProjectile('hunter'); canShoot = false; setTimeout(() => { canShoot = true; }, 100); }
    };
    shootBtn.addEventListener('touchstart', shootHandler);
    shootBtn.addEventListener('click', shootHandler);
}

    // default configuration for the various game parameters; used when no stored
    // settings exist or the stored values are invalid.
    let defaultSettings = {
        jumpHeight: 180,
        wolfSpeed: 7,
        hunterSpeed: 10,
        bossSpeed: 8,
        hunterHP: 200,
        redHP: 20,
        bossHP: 200,
        bossThreshold: 500,
        hunterDamage: 10,
        bossDamage: 10,
        wolfSpeedIncrease: 1
    };

    try {
        let saved = localStorage.getItem("forest_settings_v10");
        if (saved) { gameSettings = JSON.parse(saved); } 
        else { gameSettings = JSON.parse(JSON.stringify(defaultSettings)); }
    } catch (e) { gameSettings = JSON.parse(JSON.stringify(defaultSettings)); }

    for (let key in defaultSettings) {
        if (gameSettings[key] === undefined || gameSettings[key] === null || isNaN(gameSettings[key])) {
            gameSettings[key] = defaultSettings[key];
        }
    }

    let currentWolfSpeed = Number(gameSettings.wolfSpeed) || 7;
    let nextBossScore = Number(gameSettings.bossThreshold) || 500;

    function applyGameSettings() {
        document.documentElement.style.setProperty('--jump-height', `-${gameSettings.jumpHeight}px`);
        document.documentElement.style.setProperty('--double-jump-height', `-${gameSettings.jumpHeight + 80}px`);
    }
    applyGameSettings();

    function getScoresSafely() {
        try {
            let saved = JSON.parse(localStorage.getItem("forest_scores_v10"));
            if (Array.isArray(saved)) {
                return saved.filter(s => s && typeof s.name === 'string' && typeof s.score === 'number');
            }
        } catch(e) {}
        return [];
    }

    // פונקציה חכמה שמתרגמת את הקואורדינטות המוגדלות/מוקטנות למספרים שהמשחק מבין!
    function getLocalRect(el) {
        let rect = el.getBoundingClientRect();
        let cRect = container.getBoundingClientRect();
        return {
            left: (rect.left - cRect.left) / gameScale,
            right: (rect.right - cRect.left) / gameScale,
            top: (rect.top - cRect.top) / gameScale,
            bottom: (rect.bottom - cRect.top) / gameScale,
            width: rect.width / gameScale,
            height: rect.height / gameScale
        };
    }

    saveSettingsBtn.addEventListener("click", () => {
        gameSettings.jumpHeight = parseInt(document.getElementById("setting-jump").value) || 180;
        gameSettings.wolfSpeed = parseInt(document.getElementById("setting-wolf-speed").value) || 7;
        gameSettings.bossThreshold = parseInt(document.getElementById("setting-boss-threshold").value) || 500;
        gameSettings.hunterHP = parseInt(document.getElementById("setting-hunter-hp").value) || 200;
        gameSettings.hunterDamage = parseInt(document.getElementById("setting-hunter-damage").value) || 10;
        gameSettings.hunterSpeed = parseInt(document.getElementById("setting-hunter-speed").value) || 10;
        gameSettings.redHP = parseInt(document.getElementById("setting-red-hp").value) || 20;
        gameSettings.bossDamage = parseInt(document.getElementById("setting-boss-damage").value) || 10;
        gameSettings.bossSpeed = parseInt(document.getElementById("setting-boss-speed").value) || 8;
        gameSettings.bossHP = parseInt(document.getElementById("setting-boss-hp").value) || 200;
        
        let incValue = parseFloat(document.getElementById("setting-wolf-speed-inc").value);
        gameSettings.wolfSpeedIncrease = isNaN(incValue) ? 0 : incValue;

        localStorage.setItem("forest_settings_v10", JSON.stringify(gameSettings));
        applyGameSettings();
        
        nextBossScore = gameSettings.bossThreshold;
        currentWolfSpeed = gameSettings.wolfSpeed; 
        alert("הגדרות המשחק נשמרו בהצלחה!");
    });

    resetSettingsBtn.addEventListener("click", () => {
        if (confirm("האם לאפס את כל ההגדרות למצב הרגיל של המשחק?")) {
            gameSettings = JSON.parse(JSON.stringify(defaultSettings)); 
            localStorage.setItem("forest_settings_v10", JSON.stringify(gameSettings));
            
            document.getElementById("setting-jump").value = gameSettings.jumpHeight;
            document.getElementById("setting-wolf-speed").value = gameSettings.wolfSpeed;
            document.getElementById("setting-boss-threshold").value = gameSettings.bossThreshold;
            document.getElementById("setting-hunter-hp").value = gameSettings.hunterHP;
            document.getElementById("setting-hunter-damage").value = gameSettings.hunterDamage;
            document.getElementById("setting-hunter-speed").value = gameSettings.hunterSpeed;
            document.getElementById("setting-red-hp").value = gameSettings.redHP;
            document.getElementById("setting-boss-damage").value = gameSettings.bossDamage;
            document.getElementById("setting-boss-speed").value = gameSettings.bossSpeed;
            document.getElementById("setting-boss-hp").value = gameSettings.bossHP;
            document.getElementById("setting-wolf-speed-inc").value = gameSettings.wolfSpeedIncrease;

            applyGameSettings();
            nextBossScore = gameSettings.bossThreshold;
            currentWolfSpeed = gameSettings.wolfSpeed; 
            alert("ההגדרות אופסו בהצלחה לברירת המחדל!");
        }
    });

    let score = 0; let isGameOver = false; let gameStarted = false; let isNameEntered = false; 
    let playerName = ""; let isGodMode = false; let jumps = 0; let jumpTimeout; 
    let isDucking = false; let inputBuffer = ""; let canShoot = true; 
    let bossStageInitiated = false; let isBossFightActive = false;
    let redHP = gameSettings.redHP; let hunterHP = gameSettings.hunterHP; let bossHP = gameSettings.bossHP;
    let pointMultiplier = 1; let isBoostOnCooldown = false;
    let obstacleCreationTimeout; let bossMoveInterval; let bossShootInterval; let projectilesInterval;

    window.onload = () => {
        let savedName = localStorage.getItem("lastPlayerName");
        if (savedName) { nameInput.value = savedName; }
        
        if (sessionStorage.getItem("autoStartTriggered") === "true") {
            sessionStorage.removeItem("autoStartTriggered");
            playerName = savedName || "שחקן";
            isNameEntered = true;
            startScreen.style.display = "none";
            centerMsg.style.display = "none"; 
            gameStarted = true;
            createObstacle(); 
        } else {
            nameInput.focus();
        }
    };

    playAgainBtn.addEventListener("click", () => {
        sessionStorage.setItem("autoStartTriggered", "true"); 
        location.reload();
    });

    homeBtn.addEventListener("click", () => { location.reload(); });

    function submitName() {
        let typedName = nameInput.value.trim();
        let nameError = document.getElementById('name-error');
        if (typedName === "") { if (nameError) { nameError.style.display = 'block'; } return; } else { if (nameError) { nameError.style.display = 'none'; } }

        playerName = typedName; localStorage.setItem("lastPlayerName", playerName); 

        if (playerName === "livne1906") {
            isGodMode = true; alert("⭐ קוד סודי הופעל! ⭐\nמצב אל-מוות פעיל.");
        } else { isGodMode = false; }

        let personalBest = getPlayerBestScore(playerName); highScoreElement.innerText = "שיא אישי: " + personalBest;
        startScreen.style.display = "none"; centerMsg.style.display = "block"; isNameEntered = true;
    }

    startBtn.addEventListener("click", (e) => { console.log('start button clicked'); submitName(); });
    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitName(); if (nameInput.value.trim() !== "") { let nameError = document.getElementById('name-error'); if (nameError) nameError.style.display = 'none'; } });

    adminPanelBtn.addEventListener("click", () => {
        passwordInput.value = ""; passwordError.style.display = "none"; passwordModal.style.display = "flex"; passwordInput.focus();
    });
    cancelPasswordBtn.addEventListener("click", () => { passwordModal.style.display = "none"; });

    function checkAdminPassword() {
        if (passwordInput.value === "admin123") {
            passwordModal.style.display = "none"; startScreen.style.display = "none"; loadAdminPanel(); adminScreen.style.display = "flex";   
        } else {
            passwordError.style.display = "block"; passwordInput.value = ""; passwordInput.focus();
        }
    }

    submitPasswordBtn.addEventListener("click", checkAdminPassword);
    passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") checkAdminPassword(); });
    adminBackBtn.addEventListener("click", () => { adminScreen.style.display = "none"; startScreen.style.display = "flex"; });

    function loadAdminPanel() {
        let scores = getScoresSafely();
        scores.sort((a, b) => b.score - a.score); 
        
        document.getElementById("setting-jump").value = gameSettings.jumpHeight;
        document.getElementById("setting-wolf-speed").value = gameSettings.wolfSpeed;
        document.getElementById("setting-boss-threshold").value = gameSettings.bossThreshold;
        document.getElementById("setting-hunter-hp").value = gameSettings.hunterHP;
        document.getElementById("setting-hunter-damage").value = gameSettings.hunterDamage;
        document.getElementById("setting-hunter-speed").value = gameSettings.hunterSpeed;
        document.getElementById("setting-red-hp").value = gameSettings.redHP;
        document.getElementById("setting-boss-damage").value = gameSettings.bossDamage;
        document.getElementById("setting-boss-speed").value = gameSettings.bossSpeed;
        document.getElementById("setting-boss-hp").value = gameSettings.bossHP;
        document.getElementById("setting-wolf-speed-inc").value = gameSettings.wolfSpeedIncrease;

        adminTableBody.innerHTML = "";
        
        if (scores.length === 0) { 
            adminTableBody.innerHTML = "<tr><td colspan='4' style='padding: 20px; font-size: 18px; color: #ffb86c;'>אין שיאים במערכת עדיין.<br>שחק פעם אחת כדי שהשיא שלך יופיע כאן!</td></tr>"; 
            return; 
        }

        scores.forEach((playerData, index) => {
            let safeName = playerData.name.replace(/'/g, "\\'");
            adminTableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td><td>${playerData.name}</td><td>${playerData.score}</td>
                    <td>
                        <button class="edit-btn" onclick="editSpecificScore('${safeName}', ${playerData.score})" title="ערוך ניקוד">✏️</button>
                        <button class="delete-btn" onclick="deleteSpecificScore('${safeName}')" title="מחק שחקן">❌</button>
                    </td>
                </tr>
            `;
        });
    }

    window.editSpecificScore = function(nameToEdit, currentScore) {
        let newScoreStr = prompt(`הכנס ניקוד חדש עבור ${nameToEdit}:`, currentScore);
        if (newScoreStr !== null && newScoreStr.trim() !== "") {
            let newScore = parseInt(newScoreStr);
            if (!isNaN(newScore)) {
                let scores = getScoresSafely();
                let playerIndex = scores.findIndex(s => s.name === nameToEdit);
                if (playerIndex !== -1) {
                    scores[playerIndex].score = newScore; localStorage.setItem("forest_scores_v10", JSON.stringify(scores)); loadAdminPanel(); 
                }
            } else { alert("שגיאה: יש להזין מספרים בלבד."); }
        }
    };

    window.deleteSpecificScore = function(nameToDelete) {
        if (confirm("האם למחוק לצמיתות את השיא של: " + nameToDelete + "?")) {
            let scores = getScoresSafely();
            scores = scores.filter(s => s.name !== nameToDelete); localStorage.setItem("forest_scores_v10", JSON.stringify(scores)); loadAdminPanel();
        }
    };

    adminClearAllBtn.addEventListener("click", () => {
        if (confirm("אזהרה! האם אתה בטוח שאתה רוצה למחוק את כל השיאים במשחק?")) {
            localStorage.removeItem("forest_scores_v10"); alert("כל השיאים נמחקו בהצלחה!"); loadAdminPanel(); 
        }
    });

    function getPlayerBestScore(name) {
        let scores = getScoresSafely();
        let p = scores.find(s => s.name === name); return p ? p.score : 0;
    }

    function updateAndShowLeaderboard() {
        let scores = getScoresSafely();
        let existingPlayer = scores.find(s => s.name === playerName);
        if (existingPlayer) {
            if (score > existingPlayer.score) { existingPlayer.score = score; }
        } else {
            scores.push({ name: playerName, score: score });
        }
        scores.sort((a, b) => b.score - a.score); localStorage.setItem("forest_scores_v10", JSON.stringify(scores));

        leaderboardBody.innerHTML = ""; 
        if(scores.length === 0) {
            leaderboardBody.innerHTML = "<tr><td colspan='3'>אין שיאים עדיין</td></tr>";
        } else {
            let top5 = scores.slice(0, 5);
            top5.forEach((playerData, index) => {
                let rowStyle = (playerData.name === playerName) ? "color: #f1fa8c; font-weight: bold;" : "";
                leaderboardBody.innerHTML += `<tr style="${rowStyle}"><td>${index + 1}</td><td>${playerData.name}</td><td>${playerData.score}</td></tr>`;
            });
        }
    }

    function activateBoost() {
        if (isBoostOnCooldown) return;
        pointMultiplier = 2; isBoostOnCooldown = true; boostMsg.style.display = "block"; 
        setTimeout(() => { pointMultiplier = 1; boostMsg.style.display = "none"; }, 5000);
        setTimeout(() => { isBoostOnCooldown = false; }, 10000);
    }

    function jump() {
        if (isGameOver || isDucking || jumps >= 2) return;
        jumps++; player.classList.remove("jump", "double-jump"); hunter.classList.remove("jump", "double-jump"); void player.offsetWidth; 
        
        if (jumps === 1) { player.classList.add("jump"); if (isBossFightActive && hunterHP > 0) hunter.classList.add("jump"); } 
        else if (jumps === 2) { player.classList.add("double-jump"); if (isBossFightActive && hunterHP > 0) hunter.classList.add("double-jump"); }
        clearTimeout(jumpTimeout);
        jumpTimeout = setTimeout(() => { player.classList.remove("jump", "double-jump"); hunter.classList.remove("jump", "double-jump"); jumps = 0; }, 700); 
    }

    function triggerBossStage() {
        bossStageInitiated = true; let timeLeft = 10; centerMsg.style.display = "block"; centerMsg.style.color = "#ff5555";
        let countdownTimer = setInterval(() => {
            centerMsg.innerHTML = "אזהרה! הבוס מגיע בעוד: " + timeLeft + " שניות!"; timeLeft--;
            if (timeLeft < 0 || isGameOver) {
                clearInterval(countdownTimer); centerMsg.style.display = "none";
                if (!isGameOver) startBossFight();
            }
        }, 1000);
    }

    function startBossFight() {
        isBossFightActive = true; document.querySelectorAll(".obstacle").forEach(obs => obs.remove()); clearTimeout(obstacleCreationTimeout);

        bossHP = gameSettings.bossHP; hunterHP = gameSettings.hunterHP; redHP = gameSettings.redHP;
        bossHpText.innerText = bossHP; hunterHpText.innerText = hunterHP; redHpText.innerText = redHP;
        bossUI.style.display = "flex"; hunter.style.display = "block"; boss.style.display = "block";

        bossMoveInterval = setInterval(() => { if (isGameOver) return; let randomY = Math.random() * 180; boss.style.bottom = randomY + "px"; }, 1000);
        bossShootInterval = setInterval(() => { if (isGameOver) return; shootProjectile("boss"); }, 1500);
        projectilesInterval = setInterval(checkProjectilesCollision, 20);
    }

    function shootProjectile(shooter) {
        if (isGameOver) return;
        const proj = document.createElement("div"); proj.classList.add("projectile"); 

        if (shooter === "hunter") {
            proj.classList.add("grandma"); proj.dataset.type = "hunter";
            let hunterRect = getLocalRect(hunter);
            let hunterVisualBottom = 650 - hunterRect.bottom;
            proj.style.left = hunterRect.right + "px"; 
            proj.style.bottom = (hunterVisualBottom + 30) + "px"; 
            container.appendChild(proj); animateProjectile(proj, gameSettings.hunterSpeed); 
        } else if (shooter === "boss") {
            proj.classList.add("cake"); proj.dataset.type = "boss";
            let bossRect = getLocalRect(boss);
            let bossVisualBottom = 650 - bossRect.bottom;
            proj.style.left = (bossRect.left - 45) + "px"; 
            proj.style.bottom = (bossVisualBottom + 50) + "px";
            container.appendChild(proj); animateProjectile(proj, -gameSettings.bossSpeed); 
        }
    }

    function animateProjectile(element, speed) {
        let timer = setInterval(() => {
            if (isGameOver || !document.body.contains(element)) { clearInterval(timer); return; }
            let currentLeft = parseFloat(element.style.left || 0); element.style.left = (currentLeft + speed) + "px";
            if (currentLeft < -50 || currentLeft > 1050) { clearInterval(timer); element.remove(); }
        }, 20);
    }

    function checkProjectilesCollision() {
        if (isGameOver || !isBossFightActive) return;
        let pRect = getLocalRect(player); let hRect = getLocalRect(hunter); let bRect = getLocalRect(boss);

        document.querySelectorAll(".projectile").forEach(proj => {
            let projRect = getLocalRect(proj);

            if (proj.dataset.type === "boss") {
                if (hunterHP > 0 && checkRectCollision(projRect, hRect)) {
                    if (!isGodMode) { hunterHP -= gameSettings.bossDamage; hunterHpText.innerText = hunterHP; }
                    proj.remove(); if (hunterHP <= 0) hunter.style.display = "none";
                } else if (checkRectCollision(projRect, pRect)) {
                    if (!isGodMode) { redHP -= gameSettings.bossDamage; redHpText.innerText = redHP; }
                    proj.remove(); if (redHP <= 0) endGame("אוי לא! העוגות של הבוס הכניעו את כיפה אדומה.");
                }
            } 
            if (proj.dataset.type === "hunter") {
                if (checkRectCollision(projRect, bRect)) {
                    bossHP -= gameSettings.hunterDamage; bossHpText.innerText = bossHP; 
                    proj.remove(); if (bossHP <= 0) bossDefeated();
                }
            }
        });
    }

    function checkRectCollision(rect1, rect2) {
        return (rect1.right > rect2.left && rect1.left < rect2.right && rect1.bottom > rect2.top && rect1.top < rect2.bottom);
    }

    function bossDefeated() {
        isBossFightActive = false; bossStageInitiated = false; nextBossScore += gameSettings.bossThreshold;
        clearInterval(bossMoveInterval); clearInterval(bossShootInterval); clearInterval(projectilesInterval);
        document.querySelectorAll(".projectile").forEach(p => p.remove());
        boss.style.display = "none"; bossUI.style.display = "none";
        endGame("🏆 ניצחון מוחלט! הבסת את זאב הבוס והצלת את היער הקסום! 🏆");
    }

    function endGame(reasonMessage) {
        isGameOver = true; document.getElementById("center-msg").style.display = "none"; boostMsg.style.display = "none";
        document.getElementById("end-reason").innerText = reasonMessage;
        
        let personalBest = getPlayerBestScore(playerName);
        if (score > personalBest) { document.getElementById("end-score").innerText = `ניקוד סופי: ${score} (שיא חדש! 🎉)`; } 
        else { document.getElementById("end-score").innerText = `ניקוד סופי: ${score}`; }

        updateAndShowLeaderboard(); gameOverScreen.style.display = "flex";
    }

    // תמיכה במסכי מגע למובייל! (לחיצה על המסך קופצת)
    document.addEventListener("touchstart", (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        if (!isNameEntered || startScreen.style.display === "flex" || adminScreen.style.display === "flex" || passwordModal.style.display === "flex") return; 

        startGame();
        jump();
    });

    document.addEventListener("keydown", (event) => {
        if (!isNameEntered || startScreen.style.display === "flex" || adminScreen.style.display === "flex" || passwordModal.style.display === "flex") return; 

        if (event.key) {
            inputBuffer += event.key.toLowerCase(); if (inputBuffer.length > 4) inputBuffer = inputBuffer.slice(-4);
            if (inputBuffer === "skip" && !bossStageInitiated && !isBossFightActive && gameStarted) {
                score = nextBossScore; scoreElement.innerHTML = "ניקוד: " + score; inputBuffer = ""; triggerBossStage(); 
            }
        }

        if (event.code === "Space") {
            startGame();
            jump();
        }
        if ((event.code === "KeyZ" || event.key === "ז") && isBossFightActive && hunterHP > 0) {
            if (canShoot) { shootProjectile("hunter"); canShoot = false; setTimeout(() => { canShoot = true; }, 100); }
        }
        if ((event.key === "Shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") && jumps === 0) {
            isDucking = true; player.classList.add("duck"); hunter.classList.add("duck");
        }
    });

    document.addEventListener("keyup", (event) => {
        if (!isNameEntered) return;
        if (event.key === "Shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
            isDucking = false; player.classList.remove("duck"); hunter.classList.remove("duck");
        }
    });

    function createObstacle() {
        if (isGameOver || isBossFightActive) return;
        if (score >= nextBossScore && !bossStageInitiated) triggerBossStage();

        const obstacle = document.createElement("div"); obstacle.classList.add("obstacle"); container.appendChild(obstacle);
        let obstacleLeft = 1000; obstacle.style.left = obstacleLeft + "px";
        
        let timer = setInterval(() => {
            if (isGameOver || isBossFightActive) { clearInterval(timer); return; }

            let safeSpeed = Number(currentWolfSpeed);
            if (isNaN(safeSpeed) || safeSpeed <= 0) safeSpeed = 7;

            obstacleLeft -= safeSpeed; 
            obstacle.style.left = obstacleLeft + "px";

            let pRect = getLocalRect(player); 
            let oRect = getLocalRect(obstacle); 
            let marginX = 15, marginY = 10;

            let oLeftSwept = oRect.left + marginX;
            let oRightSwept = (oRect.right - marginX) + safeSpeed;

            if (pRect.right > oLeftSwept && pRect.left < oRightSwept && pRect.bottom > oRect.top + marginY && pRect.top < oRect.bottom) {
                if (pRect.bottom < oRect.top + 45 && jumps > 0) {
                    clearInterval(timer); obstacle.remove(); 
                    
                    currentWolfSpeed += Number(gameSettings.wolfSpeedIncrease);
                    
                    let pointsEarned = 5 * pointMultiplier * (isGodMode ? 5 : 1);
                    score += pointsEarned; scoreElement.innerHTML = "ניקוד: " + score;
                    activateBoost();
                } else { if (!isGodMode) { endGame("נתקעת בזאב!"); } }
            }

            if (obstacleLeft < -80) {
                clearInterval(timer);
                if (container.contains(obstacle)) {
                    obstacle.remove();
                    let pointsEarned = 1 * pointMultiplier * (isGodMode ? 5 : 1);
                    score += pointsEarned; scoreElement.innerHTML = "ניקוד: " + score;
                }
            }
        }, 20);

        let nextObstacleTime = Math.random() * (3000 - 600) + 600;
        obstacleCreationTimeout = setTimeout(createObstacle, nextObstacleTime);
    }
