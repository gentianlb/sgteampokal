(() => {
  const cfg = window.APP_CONFIG || {};
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "LOGIN_FUNCTION_URL"];
  const missing = required.filter((key) => !cfg[key] || cfg[key].includes("DEIN-"));

  if (missing.length) {
    document.body.innerHTML = '<main class="shell"><section class="card"><h1>Konfiguration fehlt</h1><p class="muted">Bitte zuerst <code>config.js</code> ausfüllen.</p></section></main>';
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const $ = (s) => document.querySelector(s);

  const loginView = $("#loginView");
  const appView = $("#appView");
  const loginForm = $("#loginForm");
  const loginRole = $("#loginRole");
  const password = $("#password");
  const loginError = $("#loginError");
  const ranking = $("#ranking");
  const rankingTitle = $("#rankingTitle");
  const emptyState = $("#emptyState");
  const adminPanel = $("#adminPanel");
  const adminPlayers = $("#adminPlayers");
  const addPlayerForm = $("#addPlayerForm");
  const newPlayerName = $("#newPlayerName");
  const logoutBtn = $("#logoutBtn");
  const refreshBtn = $("#refreshBtn");
  const accessBadge = $("#accessBadge");
  const updatedLabel = $("#updatedLabel");
  const statusMessage = $("#statusMessage");

  const playerModal = $("#playerModal");
  const playerModalTitle = $("#playerModalTitle");
  const playerModalScore = $("#playerModalScore");
  const modalScoreInput = $("#modalScoreInput");
  const modalSaveScoreBtn = $("#modalSaveScoreBtn");
  const modalDeletePlayerBtn = $("#modalDeletePlayerBtn");

  const trainingTodayBtn = $("#trainingTodayBtn");
  const trainingModal = $("#trainingModal");
  const trainingPlayerList = $("#trainingPlayerList");
  const selectAllTrainingBtn = $("#selectAllTrainingBtn");
  const clearTrainingBtn = $("#clearTrainingBtn");
  const saveTrainingBtn = $("#saveTrainingBtn");

  let currentRole = "member";
  let players = [];
  let selectedPlayerId = null;

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const setStatus = (message) => {
    statusMessage.textContent = message || "";
  };

  async function determineRole(userId) {
    const { data, error } = await sb.from("profiles").select("role").eq("user_id", userId).single();
    if (error) throw error;
    return data?.role === "admin" ? "admin" : "member";
  }

  function showApp(role) {
    currentRole = role;
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    adminPanel.classList.toggle("hidden", role !== "admin");
    accessBadge.textContent = role === "admin" ? "Admin-Zugang" : "Team-Zugang";
    rankingTitle.textContent = role === "admin" ? "Gesamtes Ranking" : "Top 5 Ranking";
  }

  function showLogin() {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    closePlayerModal();
    closeTrainingModal();
    password.value = "";
    loginError.textContent = "";
  }

  function sortedPlayers() {
    return [...players].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"));
  }

  function renderRanking() {
    const sorted = sortedPlayers();
    const visible = currentRole === "admin" ? sorted : sorted.slice(0, 5);

    ranking.innerHTML = visible.map((player, index) => `
      <div class="player-row ${index < 3 ? `rank-${index + 1}` : ""}">
        <div class="position">${index + 1}</div>
        <div class="player-name">${escapeHtml(player.name)}</div>
        <div class="points">${player.points} Pkt.</div>
      </div>`).join("");

    emptyState.classList.toggle("hidden", visible.length !== 0);
  }

  function renderAdmin() {
    if (currentRole !== "admin") return;
    const alphabetical = [...players].sort((a, b) => a.name.localeCompare(b.name, "de"));

    adminPlayers.innerHTML = alphabetical.map((player) => `
      <button class="admin-player" type="button" data-player-id="${player.id}">
        <span class="admin-player-name">${escapeHtml(player.name)}</span>
        <span class="admin-player-points">${player.points} Pkt.</span>
      </button>`).join("");
  }

  async function loadPlayers() {
    setStatus("Lade Punktestand …");
    const { data, error } = await sb.from("players").select("id,name,points,updated_at").order("points", { ascending: false }).order("name", { ascending: true });

    if (error) {
      setStatus(`Fehler: ${error.message}`);
      return;
    }

    players = data || [];
    renderRanking();
    renderAdmin();

    const latest = players.map((p) => p.updated_at).filter(Boolean).sort().at(-1);
    updatedLabel.textContent = latest ? `Stand: ${new Date(latest).toLocaleString("de-DE")}` : "";
    setStatus("");
  }

  async function setPoints(id, pointsValue, successMessage = "Gespeichert.") {
    const points = Number.parseInt(pointsValue, 10);
    if (!Number.isFinite(points)) return false;

    const { error } = await sb.from("players").update({ points, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      setStatus(`Speichern fehlgeschlagen: ${error.message}`);
      return false;
    }

    setStatus(successMessage);
    await loadPlayers();
    return true;
  }

  async function changePoints(id, delta) {
    const player = players.find((p) => p.id === id);
    if (!player) return false;
    return setPoints(id, player.points + delta, `${delta > 0 ? "+" : ""}${delta} Punkte gespeichert.`);
  }

  function openPlayerModal(id) {
    if (currentRole !== "admin") return;
    const player = players.find((p) => p.id === id);
    if (!player) return;
    selectedPlayerId = id;
    playerModalTitle.textContent = player.name;
    playerModalScore.textContent = `${player.points} Punkte`;
    modalScoreInput.value = player.points;
    playerModal.classList.remove("hidden");
  }

  function closePlayerModal() {
    selectedPlayerId = null;
    playerModal.classList.add("hidden");
  }

  function openTrainingModal() {
    if (currentRole !== "admin") return;
    const alphabetical = [...players].sort((a, b) => a.name.localeCompare(b.name, "de"));
    trainingPlayerList.innerHTML = alphabetical.map((player) => `
      <label class="training-option">
        <input type="checkbox" value="${player.id}" />
        <span>${escapeHtml(player.name)}</span>
      </label>`).join("");
    trainingModal.classList.remove("hidden");
  }

  function closeTrainingModal() {
    trainingModal.classList.add("hidden");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const role = loginRole.value;

    const response = await fetch(cfg.LOGIN_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ role, password: password.value })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token || !result.refresh_token) {
      loginError.textContent = result.error || "Anmeldung fehlgeschlagen. Passwort prüfen.";
      return;
    }

    const { data, error } = await sb.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
    if (error || !data.user) {
      loginError.textContent = "Anmeldung fehlgeschlagen. Passwort prüfen.";
      return;
    }

    try {
      const actualRole = await determineRole(data.user.id);
      if (role === "admin" && actualRole !== "admin") {
        await sb.auth.signOut();
        loginError.textContent = "Dieser Zugang besitzt keine Admin-Rechte.";
        return;
      }
      showApp(actualRole);
      await loadPlayers();
    } catch (err) {
      await sb.auth.signOut();
      loginError.textContent = `Rollenprüfung fehlgeschlagen: ${err.message}`;
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    showLogin();
  });

  refreshBtn.addEventListener("click", loadPlayers);

  addPlayerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = newPlayerName.value.trim();
    if (!name) return;

    const { error } = await sb.from("players").insert({ name, points: 0, updated_at: new Date().toISOString() });
    if (error) {
      setStatus(`Hinzufügen fehlgeschlagen: ${error.message}`);
      return;
    }

    newPlayerName.value = "";
    setStatus(`${name} wurde hinzugefügt.`);
    await loadPlayers();
  });

  adminPlayers.addEventListener("click", (event) => {
    const button = event.target.closest("[data-player-id]");
    if (!button) return;
    openPlayerModal(Number(button.dataset.playerId));
  });

  playerModal.addEventListener("click", async (event) => {
    const close = event.target.closest('[data-close-modal="player"]');
    if (close) {
      closePlayerModal();
      return;
    }

    const deltaButton = event.target.closest("[data-delta]");
    if (deltaButton && selectedPlayerId) {
      const delta = Number(deltaButton.dataset.delta);
      const id = selectedPlayerId;
      const ok = await changePoints(id, delta);
      if (ok) openPlayerModal(id);
    }
  });

  modalSaveScoreBtn.addEventListener("click", async () => {
    if (!selectedPlayerId) return;
    const id = selectedPlayerId;
    const ok = await setPoints(id, modalScoreInput.value);
    if (ok) openPlayerModal(id);
  });

  modalDeletePlayerBtn.addEventListener("click", async () => {
    if (!selectedPlayerId) return;
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player || !window.confirm(`${player.name} wirklich löschen?`)) return;

    const { error } = await sb.from("players").delete().eq("id", selectedPlayerId);
    if (error) {
      setStatus(`Löschen fehlgeschlagen: ${error.message}`);
      return;
    }

    closePlayerModal();
    setStatus(`${player.name} wurde gelöscht.`);
    await loadPlayers();
  });

  trainingTodayBtn.addEventListener("click", openTrainingModal);

  trainingModal.addEventListener("click", (event) => {
    if (event.target.closest('[data-close-modal="training"]')) closeTrainingModal();
  });

  selectAllTrainingBtn.addEventListener("click", () => {
    trainingPlayerList.querySelectorAll('input[type="checkbox"]').forEach((box) => { box.checked = true; });
  });

  clearTrainingBtn.addEventListener("click", () => {
    trainingPlayerList.querySelectorAll('input[type="checkbox"]').forEach((box) => { box.checked = false; });
  });

  saveTrainingBtn.addEventListener("click", async () => {
    const ids = [...trainingPlayerList.querySelectorAll('input[type="checkbox"]:checked')].map((box) => Number(box.value));
    if (!ids.length) {
      setStatus("Bitte mindestens eine Person auswählen.");
      return;
    }

    saveTrainingBtn.disabled = true;
    saveTrainingBtn.textContent = "Speichere …";
    const now = new Date().toISOString();
    let failures = 0;

    for (const id of ids) {
      const player = players.find((p) => p.id === id);
      if (!player) continue;
      const { error } = await sb.from("players").update({ points: player.points + 2, updated_at: now }).eq("id", id);
      if (error) failures += 1;
    }

    saveTrainingBtn.disabled = false;
    saveTrainingBtn.textContent = "Ausgewählte speichern (+2)";
    closeTrainingModal();
    await loadPlayers();
    setStatus(failures ? `${ids.length - failures} Personen aktualisiert, ${failures} fehlgeschlagen.` : `${ids.length} Personen haben jeweils +2 Punkte erhalten.`);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!playerModal.classList.contains("hidden")) closePlayerModal();
    if (!trainingModal.classList.contains("hidden")) closeTrainingModal();
  });

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) return;
    try {
      const role = await determineRole(session.user.id);
      showApp(role);
      await loadPlayers();
    } catch {
      await sb.auth.signOut();
      showLogin();
    }
  });

  (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session?.user) {
      try {
        const role = await determineRole(data.session.user.id);
        showApp(role);
        await loadPlayers();
      } catch {
        await sb.auth.signOut();
        showLogin();
      }
    } else {
      showLogin();
    }
  })();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
