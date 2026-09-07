/* =========================================================
   Trading Tracker Dashboard — script.js
   Mengambil data trade dari Cloudflare Worker API dan
   merender statistik, tabel (desktop), dan kartu (mobile).
   ========================================================= */

(function () {
  "use strict";

  // -------- Config --------
  const API_URL = "https://trading-tracker-v1.kodokzganz.workers.dev/api/trades";

  // -------- State --------
  let allTrades = [];
  let isLoading = false;
  let filters = { side: "ALL", status: "ALL" };

  // -------- DOM refs --------
  const els = {
    refreshBtn: document.getElementById("refreshBtn"),
    retryBtn: document.getElementById("retryBtn"),
    lastUpdated: document.getElementById("lastUpdated"),

    statTotal: document.getElementById("statTotal"),
    statOpen: document.getElementById("statOpen"),
    statProfit: document.getElementById("statProfit"),
    statWinRate: document.getElementById("statWinRate"),
    profitCard: document.getElementById("profitCard"),

    sideFilter: document.getElementById("sideFilter"),
    statusFilter: document.getElementById("statusFilter"),
    resultCount: document.getElementById("resultCount"),

    loadingState: document.getElementById("loadingState"),
    errorState: document.getElementById("errorState"),
    errorDesc: document.getElementById("errorDesc"),
    emptyState: document.getElementById("emptyState"),
    emptyTitle: document.getElementById("emptyTitle"),
    emptyDesc: document.getElementById("emptyDesc"),

    tableWrap: document.getElementById("tableWrap"),
    tableBody: document.getElementById("tradeTableBody"),
    tradeCards: document.getElementById("tradeCards"),
  };

  // -------- Helpers --------
  function normalize(str) {
    return (str || "").toString().trim().toUpperCase();
  }

  function isOpenStatus(status) {
    return normalize(status) === "OPEN";
  }

  function isBuySide(side) {
    return normalize(side) === "BUY";
  }

  function formatNumber(value, decimals) {
    if (value === null || value === undefined || value === "") return "–";
    const n = Number(value);
    if (Number.isNaN(n)) return "–";
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === 0 || value === "") return "–";
    const n = Number(value);
    if (Number.isNaN(n)) return "–";
    return n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  }

  function formatProfit(value) {
    const n = Number(value) || 0;
    const sign = n > 0 ? "+" : "";
    return sign + n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateTime(value) {
    if (!value) return "–";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function profitClass(value) {
    const n = Number(value) || 0;
    if (n > 0) return "num-long";
    if (n < 0) return "num-short";
    return "num-neutral";
  }

  // -------- Fetch --------
  async function fetchTrades() {
    setLoading(true);
    hideStates();
    els.loadingState.hidden = false;

    try {
      const res = await fetch(API_URL);
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      const json = await res.json();
      if (!json || json.success !== true || !Array.isArray(json.data)) {
        throw new Error("Format respons API tidak sesuai");
      }
      allTrades = json.data;
      els.lastUpdated.textContent = "Diperbarui " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      render();
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    isLoading = loading;
    els.refreshBtn.classList.toggle("is-loading", loading);
    els.refreshBtn.disabled = loading;
  }

  function hideStates() {
    els.loadingState.hidden = true;
    els.errorState.hidden = true;
    els.emptyState.hidden = true;
    els.tableWrap.hidden = true;
    els.tradeCards.hidden = true;
  }

  function showError(err) {
    hideStates();
    els.errorState.hidden = false;
    els.errorDesc.textContent = "Tidak bisa terhubung ke server. " + (err && err.message ? "(" + err.message + ")" : "");
  }

  // -------- Filtering --------
  function getFilteredTrades() {
    return allTrades.filter((t) => {
      if (filters.side !== "ALL") {
        const side = normalize(t.side);
        if (filters.side === "BUY" && side !== "BUY") return false;
        if (filters.side === "SELL" && side !== "SELL") return false;
      }
      if (filters.status !== "ALL") {
        const status = normalize(t.status);
        if (filters.status !== status) return false;
      }
      return true;
    });
  }

  // -------- Stats (dihitung dari SELURUH data, tidak terpengaruh filter) --------
  function renderStats() {
    const total = allTrades.length;
    const openCount = allTrades.filter((t) => isOpenStatus(t.status)).length;
    const totalProfit = allTrades.reduce((sum, t) => sum + (Number(t.profit) || 0), 0);

    const closedTrades = allTrades.filter((t) => !isOpenStatus(t.status));
    const winCount = closedTrades.filter((t) => (Number(t.profit) || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : null;

    els.statTotal.textContent = total.toLocaleString("id-ID");
    els.statOpen.textContent = openCount.toLocaleString("id-ID");

    els.statProfit.textContent = formatProfit(totalProfit);
    els.statProfit.classList.remove("is-long", "is-short");
    els.profitCard.classList.remove("stat-card--long", "stat-card--short");
    if (totalProfit > 0) {
      els.statProfit.classList.add("is-long");
      els.profitCard.classList.add("stat-card--long");
    } else if (totalProfit < 0) {
      els.statProfit.classList.add("is-short");
      els.profitCard.classList.add("stat-card--short");
    }

    els.statWinRate.textContent = winRate === null ? "–" : winRate.toFixed(1) + "%";
  }

  // -------- Render table + cards --------
  function renderTable(trades) {
    els.tableBody.innerHTML = trades
      .map((t) => {
        const buy = isBuySide(t.side);
        const open = isOpenStatus(t.status);
        return `
        <tr>
          <td class="cell-muted">${escapeHtml(t.ticket)}</td>
          <td>${escapeHtml(t.symbol)}</td>
          <td><span class="badge ${buy ? "badge--buy" : "badge--sell"}">${buy ? "BUY" : "SELL"}</span></td>
          <td>${formatNumber(t.volume, 2)}</td>
          <td>${formatPrice(t.entry_price)}</td>
          <td class="cell-muted">${formatPrice(t.sl)}</td>
          <td class="cell-muted">${formatPrice(t.tp)}</td>
          <td class="${profitClass(t.profit)}">${formatProfit(t.profit)}</td>
          <td><span class="badge ${open ? "badge--open" : "badge--closed"}">${open ? "OPEN" : "CLOSED"}</span></td>
          <td class="cell-muted">${formatDateTime(t.open_time)}</td>
        </tr>`;
      })
      .join("");
  }

  function renderCards(trades) {
    els.tradeCards.innerHTML = trades
      .map((t) => {
        const buy = isBuySide(t.side);
        const open = isOpenStatus(t.status);
        return `
        <div class="trade-card">
          <div class="trade-card__top">
            <div class="trade-card__symbol">
              <span class="trade-card__symbol-name">${escapeHtml(t.symbol)}</span>
              <span class="badge ${buy ? "badge--buy" : "badge--sell"}">${buy ? "BUY" : "SELL"}</span>
            </div>
            <span class="trade-card__profit ${profitClass(t.profit)}">${formatProfit(t.profit)}</span>
          </div>
          <div class="trade-card__meta">
            <span>#${escapeHtml(t.ticket)}</span>
            <span class="badge ${open ? "badge--open" : "badge--closed"}">${open ? "OPEN" : "CLOSED"}</span>
          </div>
          <div class="trade-card__grid">
            <div class="trade-card__field">
              <span class="trade-card__field-label">Volume</span>
              <span class="trade-card__field-value">${formatNumber(t.volume, 2)}</span>
            </div>
            <div class="trade-card__field">
              <span class="trade-card__field-label">Entry</span>
              <span class="trade-card__field-value">${formatPrice(t.entry_price)}</span>
            </div>
            <div class="trade-card__field">
              <span class="trade-card__field-label">SL</span>
              <span class="trade-card__field-value">${formatPrice(t.sl)}</span>
            </div>
            <div class="trade-card__field">
              <span class="trade-card__field-label">TP</span>
              <span class="trade-card__field-value">${formatPrice(t.tp)}</span>
            </div>
          </div>
          <div class="trade-card__footer">Dibuka ${formatDateTime(t.open_time)}</div>
        </div>`;
      })
      .join("");
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // -------- Main render --------
  function render() {
    renderStats();

    const filtered = getFilteredTrades();
    els.resultCount.textContent = filtered.length + " dari " + allTrades.length + " trade";

    hideStates();

    if (allTrades.length === 0) {
      els.emptyTitle.textContent = "Belum ada data trading";
      els.emptyDesc.textContent = "Data akan muncul di sini setelah trade tercatat.";
      els.emptyState.hidden = false;
      return;
    }

    if (filtered.length === 0) {
      els.emptyTitle.textContent = "Tidak ada trade yang cocok";
      els.emptyDesc.textContent = "Coba ubah filter posisi atau status.";
      els.emptyState.hidden = false;
      return;
    }

    renderTable(filtered);
    renderCards(filtered);
    els.tableWrap.hidden = false;
    els.tradeCards.hidden = false;
  }

  // -------- Filter pill wiring --------
  function wirePillGroup(container, key) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      filters[key] = btn.dataset.value;
      [...container.querySelectorAll(".pill")].forEach((p) => p.classList.toggle("is-active", p === btn));
      render();
    });
  }

  // -------- Init --------
  els.refreshBtn.addEventListener("click", () => {
    if (!isLoading) fetchTrades();
  });
  els.retryBtn.addEventListener("click", () => {
    if (!isLoading) fetchTrades();
  });
  wirePillGroup(els.sideFilter, "side");
  wirePillGroup(els.statusFilter, "status");

  fetchTrades();
})();
