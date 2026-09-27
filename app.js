(() => {
  const cfg = window.APP_CONFIG || {};
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "LOGIN_FUNCTION_URL"];
  const missing = required.filter((key) => !cfg[key] || cfg[key].includes("DEIN-"));

  if (missing.length) {
    document.body.innerHTML =
      '<main class="shell"><section class="card"><h1>Konfiguration fehlt</h1><p class="muted">Bitte zuerst <code>config.js</code> ausfüllen.</p></section></main>';
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

  let currentRole = "member";
  let players = [];

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
    const { data, error } = await sb
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data?.role === "admin" ? "admin" : "member";
  }

  function showApp(role) {
    currentRole = role;
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    adminPanel.classList.toggle("hidden", role !== "admin");
    accessBadge.textContent = role === "admin" ? "Admin-Zugang" : "Team-Zugang";
  }

  function showLogin() {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    password.value = "";
    loginError.textContent = "";
  }

  function renderRanking() {
    const sorted = [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name, "de");
    });

    ranking.innerHTML = sorted
      .map(
        (player, index) => `
          <div class="player-row">
            <div class="position">${index + 1}</div>
            <div class="player-name">${escapeHtml(player.name)}</div>
            <div class="points">${player.points} Pkt.</div>
          </div>`
      )
      .join("");

    emptyState.classList.toggle("hidden", sorted.length !== 0);
  }

  function renderAdmin() {
    if (currentRole !== "admin") return;

    const sorted = [...players].sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );

    adminPlayers.innerHTML = sorted
      .map(
        (player) => `
          <div class="admin-row" data-id="${player.id}">
            <div class="admin-name">${escapeHtml(player.name)}</div>
            <div class="stepper">
              <button type="button" data-action="minus" aria-label="Einen Punkt abziehen">−1</button>
              <input
                class="score-input"
                data-action="score"
                type="number"
                inputmode="numeric"
                value="${player.points}"
                aria-label="Punkte für ${escapeHtml(player.name)}"
              />
              <button type="button" data-action="plus" aria-label="Einen Punkt hinzufügen">+1</button>
            </div>
            <button type="button" class="danger" data-action="delete">Löschen</button>
          </div>`
      )
      .join("");
  }

  async function loadPlayers() {
    setStatus("Lade Punktestand …");

    const { data, error } = await sb
      .from("players")
      .select("id,name,points,updated_at")
      .order("points", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      setStatus(`Fehler: ${error.message}`);
      return;
    }

    players = data || [];
    renderRanking();
    renderAdmin();

    const latest = players
      .map((p) => p.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1);

    updatedLabel.textContent = latest
      ? `Stand: ${new Date(latest).toLocaleString("de-DE")}`
      : "";

    setStatus("");
  }

  async function updatePoints(id, pointsValue) {
    const points = Number.parseInt(pointsValue, 10);
    if (!Number.isFinite(points)) return;

    const { error } = await sb
      .from("players")
      .update({ points, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setStatus(`Speichern fehlgeschlagen: ${error.message}`);
      await loadPlayers();
      return;
    }

    setStatus("Gespeichert.");
    await loadPlayers();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";

    const role = loginRole.value;

    const response = await fetch(cfg.LOGIN_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        role,
        password: password.value
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.access_token || !result.refresh_token) {
      loginError.textContent = result.error || "Anmeldung fehlgeschlagen. Passwort prüfen.";
      return;
    }

    const { data, error } = await sb.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token
    });

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

    const { error } = await sb.from("players").insert({
      name,
      points: 0,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setStatus(`Hinzufügen fehlgeschlagen: ${error.message}`);
      return;
    }

    newPlayerName.value = "";
    await loadPlayers();
  });

  adminPlayers.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const row = button.closest(".admin-row");
    const id = Number(row?.dataset.id);
    const input = row?.querySelector(".score-input");
    if (!id || !input) return;

    if (button.dataset.action === "minus") {
      await updatePoints(id, Number(input.value || 0) - 1);
    }

    if (button.dataset.action === "plus") {
      await updatePoints(id, Number(input.value || 0) + 1);
    }

    if (button.dataset.action === "delete") {
      const player = players.find((p) => p.id === id);
      if (!window.confirm(`${player?.name || "Teilnehmer"} wirklich löschen?`)) return;

      const { error } = await sb.from("players").delete().eq("id", id);
      if (error) {
        setStatus(`Löschen fehlgeschlagen: ${error.message}`);
        return;
      }

      await loadPlayers();
    }
  });

  adminPlayers.addEventListener("change", async (event) => {
    const input = event.target.closest('input[data-action="score"]');
    if (!input) return;

    const row = input.closest(".admin-row");
    const id = Number(row?.dataset.id);
    if (!id) return;

    await updatePoints(id, input.value);
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
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();