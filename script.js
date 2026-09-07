const API_URL =
  "https://trading-tracker-v1.kodokzganz.workers.dev/api/trades";

let trades = [];
let currentSide = "ALL";
let currentStatus = "ALL";

document.addEventListener("DOMContentLoaded", () => {
  loadTrades();
  setupNavigation();
  setupFilters();
  setupRefresh();
});

// ========================================
// API
// ========================================

async function loadTrades() {
  const refreshBtn = document.getElementById("refreshBtn");
  const refreshIcon = document.getElementById("refreshIcon");

  try {
    if (refreshBtn) refreshBtn.disabled = true;
    if (refreshIcon) refreshIcon.textContent = "⟳";

    const response = await fetch(API_URL + "?t=" + Date.now(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();

    console.log("Trading Tracker API:", result);

    if (!result.success) {
      throw new Error("API returned success:false");
    }

    trades = Array.isArray(result.data) ? result.data : [];

    renderAll();

    const updated = document.getElementById("lastUpdated");

    if (updated) {
      updated.textContent =
        "Updated " +
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit"
        });
    }

  } catch (error) {
    console.error("API connection error:", error);

    showConnectionError();

  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
    if (refreshIcon) refreshIcon.textContent = "↻";
  }
}

// ========================================
// RENDER ALL
// ========================================

function renderAll() {
  renderDashboard();
  renderRecentTrades();
  renderJournal();
  renderAnalytics();
}

// ========================================
// DASHBOARD
// ========================================

function renderDashboard() {
  const total = trades.length;

  const open = trades.filter(
    t => String(t.status).toUpperCase() === "OPEN"
  ).length;

  const closed = trades.filter(
    t => String(t.status).toUpperCase() === "CLOSED"
  );

  const profit = trades.reduce(
    (sum, t) => sum + Number(t.profit || 0),
    0
  );

  const wins = closed.filter(
    t => Number(t.profit || 0) > 0
  ).length;

  const winRate =
    closed.length > 0
      ? (wins / closed.length) * 100
      : 0;

  setText("statProfit", formatMoney(profit));
  setText("statTotal", total);
  setText(
    "statWinRate",
    closed.length > 0 ? winRate.toFixed(1) + "%" : "—"
  );
  setText("statOpen", open);

  const profitStatus = document.getElementById("profitStatus");

  if (profitStatus) {
    if (profit > 0) {
      profitStatus.textContent = "Net profit";
      profitStatus.className = "positive";
    } else if (profit < 0) {
      profitStatus.textContent = "Net loss";
      profitStatus.className = "negative";
    } else {
      profitStatus.textContent = "No closed P&L";
      profitStatus.className = "muted";
    }
  }
}

// ========================================
// RECENT TRADES
// ========================================

function renderRecentTrades() {
  const container = document.getElementById("recentTrades");
  const empty = document.getElementById("emptyRecent");

  if (!container) return;

  if (trades.length === 0) {
    container.innerHTML = "";

    if (empty) {
      empty.style.display = "block";
    }

    return;
  }

  if (empty) {
    empty.style.display = "none";
  }

  container.innerHTML = trades
    .slice(0, 5)
    .map(trade => `
      <div class="trade-item">

        <div>
          <strong>${escapeHTML(trade.symbol)}</strong>
          <span class="${String(trade.side).toLowerCase()}">
            ${escapeHTML(trade.side)}
          </span>
        </div>

        <div>
          <strong>${formatPrice(trade.entry_price)}</strong>
          <span>${escapeHTML(trade.status)}</span>
        </div>

        <div>
          <strong>${formatMoney(trade.profit)}</strong>
          <span>${formatDate(trade.open_time)}</span>
        </div>

      </div>
    `)
    .join("");
}

// ========================================
// JOURNAL
// ========================================

function getFilteredTrades() {
  return trades.filter(trade => {

    const sideMatch =
      currentSide === "ALL" ||
      String(trade.side).toUpperCase() === currentSide;

    const statusMatch =
      currentStatus === "ALL" ||
      String(trade.status).toUpperCase() === currentStatus;

    return sideMatch && statusMatch;
  });
}

function renderJournal() {
  const tableBody =
    document.getElementById("tradeTableBody");

  const cards =
    document.getElementById("tradeCards");

  const resultCount =
    document.getElementById("resultCount");

  const filtered = getFilteredTrades();

  if (resultCount) {
    resultCount.textContent =
      filtered.length + (filtered.length === 1 ? " trade" : " trades");
  }

  // Desktop table
  if (tableBody) {

    if (filtered.length === 0) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;padding:30px;">
            No trades found
          </td>
        </tr>
      `;

    } else {

      tableBody.innerHTML = filtered.map(trade => `
        <tr>

          <td>
            <strong>${escapeHTML(trade.symbol)}</strong>
          </td>

          <td>
            <span class="${String(trade.side).toLowerCase()}">
              ${escapeHTML(trade.side)}
            </span>
          </td>

          <td>${Number(trade.volume || 0).toFixed(2)}</td>

          <td>${formatPrice(trade.entry_price)}</td>

          <td>${formatPrice(trade.sl)}</td>

          <td>${formatPrice(trade.tp)}</td>

          <td>${formatMoney(trade.profit)}</td>

          <td>${escapeHTML(trade.status)}</td>

          <td>${formatDate(trade.open_time)}</td>

        </tr>
      `).join("");
    }
  }

  // Mobile cards
  if (cards) {

    cards.innerHTML = filtered.map(trade => `
      <div class="trade-card">

        <div class="trade-card-top">
          <strong>${escapeHTML(trade.symbol)}</strong>

          <span class="${String(trade.side).toLowerCase()}">
            ${escapeHTML(trade.side)}
          </span>
        </div>

        <div class="trade-card-grid">

          <div>
            <small>ENTRY</small>
            <strong>${formatPrice(trade.entry_price)}</strong>
          </div>

          <div>
            <small>SL</small>
            <strong>${formatPrice(trade.sl)}</strong>
          </div>

          <div>
            <small>TP</small>
            <strong>${formatPrice(trade.tp)}</strong>
          </div>

          <div>
            <small>PROFIT</small>
            <strong>${formatMoney(trade.profit)}</strong>
          </div>

        </div>

        <div class="trade-card-bottom">
          ${escapeHTML(trade.status)}
          ·
          ${formatDate(trade.open_time)}
        </div>

      </div>
    `).join("");
  }
}

// ========================================
// ANALYTICS
// ========================================

function renderAnalytics() {

  const total = trades.length;

  const open = trades.filter(
    t => String(t.status).toUpperCase() === "OPEN"
  ).length;

  const closed = trades.filter(
    t => String(t.status).toUpperCase() === "CLOSED"
  );

  const profit = trades.reduce(
    (sum, t) => sum + Number(t.profit || 0),
    0
  );

  const wins = closed.filter(
    t => Number(t.profit || 0) > 0
  ).length;

  const winRate =
    closed.length > 0
      ? (wins / closed.length) * 100
      : 0;

  setText(
    "analyticsWin",
    closed.length > 0 ? winRate.toFixed(1) + "%" : "—"
  );

  setText("analyticsProfit", formatMoney(profit));
  setText("analyticsTrades", total);
  setText("analyticsOpen", open);
}

// ========================================
// NAVIGATION
// ========================================

function setupNavigation() {

  const navItems =
    document.querySelectorAll("[data-page]");

  navItems.forEach(item => {

    item.addEventListener("click", () => {

      const page = item.dataset.page;

      // Hide pages
      document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
      });

      // Show selected page
      const target =
        document.getElementById(page + "Page");

      if (target) {
        target.classList.add("active");
      }

      // Update all navigation buttons
      navItems.forEach(nav => {
        nav.classList.remove("active");
      });

      document
        .querySelectorAll(`[data-page="${page}"]`)
        .forEach(nav => {
          nav.classList.add("active");
        });

      // Update title
      const title =
        document.getElementById("pageTitle");

      if (title) {
        const titles = {
          dashboard: "Dashboard",
          journal: "Journal",
          analytics: "Analytics",
          settings: "Settings"
        };

        title.textContent =
          titles[page] || "Dashboard";
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });

  });

  // View journal button
  document
    .querySelectorAll("[data-page-target]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const page = button.dataset.pageTarget;

        const nav =
          document.querySelector(
            `[data-page="${page}"]`
          );

        if (nav) nav.click();

      });

    });
}

// ========================================
// FILTERS
// ========================================

function setupFilters() {

  // Position
  document
    .querySelectorAll("#sideFilter .pill")
    .forEach(button => {

      button.addEventListener("click", () => {

        currentSide =
          button.dataset.value || "ALL";

        document
          .querySelectorAll("#sideFilter .pill")
          .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        renderJournal();
      });

    });

  // Status
  document
    .querySelectorAll("#statusFilter .pill")
    .forEach(button => {

      button.addEventListener("click", () => {

        currentStatus =
          button.dataset.value || "ALL";

        document
          .querySelectorAll("#statusFilter .pill")
          .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        renderJournal();
      });

    });
}

// ========================================
// REFRESH
// ========================================

function setupRefresh() {

  const button =
    document.getElementById("refreshBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    loadTrades();
  });
}

// ========================================
// ERROR
// ========================================

function showConnectionError() {

  const updated =
    document.getElementById("lastUpdated");

  if (updated) {
    updated.textContent =
      "API connection failed";
  }

  const status =
    document.querySelector(".sidebar-footer");

  if (status) {
    status.innerHTML = `
      <span class="status-dot"></span>
      API Error
    `;
  }
}

// ========================================
// HELPERS
// ========================================

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function formatMoney(value) {

  const number =
    Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function formatPrice(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {

  if (!value) return "—";

  const date =
    new Date(String(value).replace(" ", "T"));

  if (isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
            }
