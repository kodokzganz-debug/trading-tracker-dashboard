(() => {
  "use strict";

  const API_URL =
    "https://trading-tracker-v1.kodokzganz.workers.dev/api/trades";

  let allTrades = [];
  let filters = {
    side: "ALL",
    status: "ALL"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    refresh: $("refreshBtn"),
    refreshIcon: $("refreshIcon"),
    lastUpdated: $("lastUpdated"),

    total: $("statTotal"),
    open: $("statOpen"),
    profit: $("statProfit"),
    winRate: $("statWinRate"),
    profitStatus: $("profitStatus"),

    recent: $("recentTrades"),
    emptyRecent: $("emptyRecent"),

    table: $("tradeTableBody"),
    cards: $("tradeCards"),
    count: $("resultCount"),

    analyticsWin: $("analyticsWin"),
    analyticsProfit: $("analyticsProfit"),
    analyticsTrades: $("analyticsTrades"),
    analyticsOpen: $("analyticsOpen")
  };

  function normalize(value) {
    return String(value ?? "").trim().toUpperCase();
  }

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function money(value) {
    const n = number(value);

    const sign = n > 0 ? "+" : "";

    return sign + n.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function price(value) {
    const n = number(value);

    if (!n) return "–";

    return n.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    });
  }

  function date(value) {
    if (!value) return "–";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isOpen(trade) {
    return normalize(trade.status) === "OPEN";
  }

  function getProfitClass(value) {
    const n = number(value);

    if (n > 0) return "buy";
    if (n < 0) return "sell";

    return "";
  }

  function calculateStats() {

    const total = allTrades.length;

    const open = allTrades.filter(isOpen).length;

    const profit = allTrades.reduce(
      (sum, trade) => sum + number(trade.profit),
      0
    );

    const closed = allTrades.filter(
      trade => !isOpen(trade)
    );

    const wins = closed.filter(
      trade => number(trade.profit) > 0
    ).length;

    const winRate =
      closed.length
        ? (wins / closed.length) * 100
        : null;

    return {
      total,
      open,
      profit,
      winRate
    };
  }

  function renderStats() {

    const stats = calculateStats();

    els.total.textContent =
      stats.total.toLocaleString("id-ID");

    els.open.textContent =
      stats.open.toLocaleString("id-ID");

    els.profit.textContent =
      money(stats.profit);

    els.profit.classList.remove("buy", "sell");

    if (stats.profit > 0) {
      els.profit.classList.add("buy");
      els.profitStatus.textContent = "Positive performance";
      els.profitStatus.className = "positive";
    }

    else if (stats.profit < 0) {
      els.profit.classList.add("sell");
      els.profitStatus.textContent = "Negative performance";
      els.profitStatus.className = "sell";
    }

    else {
      els.profitStatus.textContent = "No profit recorded";
      els.profitStatus.className = "";
    }

    els.winRate.textContent =
      stats.winRate === null
        ? "–"
        : stats.winRate.toFixed(1) + "%";

    els.analyticsWin.textContent =
      stats.winRate === null
        ? "–"
        : stats.winRate.toFixed(1) + "%";

    els.analyticsProfit.textContent =
      money(stats.profit);

    els.analyticsTrades.textContent =
      stats.total;

    els.analyticsOpen.textContent =
      stats.open;
  }

  function filteredTrades() {

    return allTrades.filter(trade => {

      const side = normalize(trade.side);
      const status = normalize(trade.status);

      if (
        filters.side !== "ALL" &&
        side !== filters.side
      ) {
        return false;
      }

      if (
        filters.status !== "ALL" &&
        status !== filters.status
      ) {
        return false;
      }

      return true;
    });
  }

  function renderRecent() {

    const trades = allTrades.slice(0, 5);

    els.recent.innerHTML = "";

    if (!trades.length) {
      els.emptyRecent.style.display = "block";
      return;
    }

    els.emptyRecent.style.display = "none";

    trades.forEach(trade => {

      const side = normalize(trade.side);
      const open = isOpen(trade);
      const profit = number(trade.profit);

      const row = document.createElement("div");

      row.className = "trade-row";

      row.innerHTML = `
        <div class="trade-main">
          <strong>${escape(trade.symbol)}</strong>
          <small>#${escape(trade.ticket)}</small>
        </div>

        <div class="trade-side ${side === "BUY" ? "buy" : "sell"}">
          ${side}
        </div>

        <div class="trade-profit ${getProfitClass(profit)}">
          ${money(profit)}
        </div>

        <div class="trade-status">
          ${open ? "OPEN" : "CLOSED"}
        </div>
      `;

      els.recent.appendChild(row);
    });
  }

  function renderJournal() {

    const trades = filteredTrades();

    els.count.textContent =
      `${trades.length} dari ${allTrades.length} trades`;

    els.table.innerHTML = "";
    els.cards.innerHTML = "";

    trades.forEach(trade => {

      const side = normalize(trade.side);
      const status = normalize(trade.status);
      const profit = number(trade.profit);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escape(trade.symbol)}</td>

        <td>
          <span class="badge ${
            side === "BUY"
              ? "badge-buy"
              : "badge-sell"
          }">
            ${side}
          </span>
        </td>

        <td>${number(trade.volume).toFixed(2)}</td>

        <td>${price(trade.entry_price)}</td>

        <td>${price(trade.sl)}</td>

        <td>${price(trade.tp)}</td>

        <td class="${getProfitClass(profit)}">
          ${money(profit)}
        </td>

        <td>
          <span class="badge ${
            status === "OPEN"
              ? "badge-open"
              : "badge-closed"
          }">
            ${status}
          </span>
        </td>

        <td>${date(trade.open_time)}</td>
      `;

      els.table.appendChild(tr);

      const card = document.createElement("div");

      card.className = "mobile-trade glass";

      card.innerHTML = `
        <div class="mobile-trade-top">

          <div>
            <div class="mobile-symbol">
              ${escape(trade.symbol)}
            </div>

            <span class="badge ${
              side === "BUY"
                ? "badge-buy"
                : "badge-sell"
            }">
              ${side}
            </span>
          </div>

          <div class="mobile-profit ${getProfitClass(profit)}">
            ${money(profit)}
          </div>

        </div>

        <div class="mobile-meta">

          <div>
            <span>ENTRY</span>
            <strong>${price(trade.entry_price)}</strong>
          </div>

          <div>
            <span>SL</span>
            <strong>${price(trade.sl)}</strong>
          </div>

          <div>
            <span>TP</span>
            <strong>${price(trade.tp)}</strong>
          </div>

        </div>
      `;

      els.cards.appendChild(card);
    });
  }

  function render() {
    renderStats();
    renderRecent();
    renderJournal();
  }

  async function loadTrades() {

    els.refresh.disabled = true;
    els.refreshIcon.style.display = "inline-block";

    try {

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (
        !json ||
        json.success !== true ||
        !Array.isArray(json.data)
      ) {
        throw new Error("Invalid API response");
      }

      allTrades = json.data;

      els.lastUpdated.textContent =
        "Updated " +
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit"
        });

      render();

    } catch (error) {

      console.error(error);

      els.lastUpdated.textContent =
        "API connection failed";

    } finally {

      els.refresh.disabled = false;

    }
  }

  /* Navigation */

  function navigate(page) {

    document.querySelectorAll(".page")
      .forEach(section => {
        section.classList.remove("active");
      });

    const target =
      document.getElementById(page + "Page");

    if (target) {
      target.classList.add("active");
    }

    document.querySelectorAll(".nav-item")
      .forEach(item => {
        item.classList.toggle(
          "active",
          item.dataset.page === page
        );
      });

    const titles = {
      dashboard: "Dashboard",
      journal: "Journal",
      analytics: "Analytics",
      settings: "Settings"
    };

    $("pageTitle").textContent =
      titles[page] || "Dashboard";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  document.querySelectorAll(
    ".nav-item[data-page]"
  ).forEach(button => {

    button.addEventListener("click", () => {
      navigate(button.dataset.page);
    });

  });

  document.querySelectorAll(
    "[data-page-target]"
  ).forEach(button => {

    button.addEventListener("click", () => {
      navigate(button.dataset.pageTarget);
    });

  });

  /* Filters */

  function setupFilter(containerId, key) {

    const container = $(containerId);

    if (!container) return;

    container.addEventListener("click", event => {

      const button =
        event.target.closest(".pill");

      if (!button) return;

      container
        .querySelectorAll(".pill")
        .forEach(pill => {
          pill.classList.remove("active");
        });

      button.classList.add("active");

      filters[key] =
        button.dataset.value;

      renderJournal();

    });

  }

  setupFilter("sideFilter", "side");
  setupFilter("statusFilter", "status");

  els.refresh.addEventListener(
    "click",
    loadTrades
  );

  loadTrades();

})();
