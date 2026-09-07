const API_URL =
  "https://trading-tracker-v1.kodokzganz.workers.dev/api/trades";

let trades = [];
let filteredTrades = [];

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadTrades();
  setupNavigation();
  setupFilters();
});

// ===============================
// LOAD API
// ===============================
async function loadTrades() {
  try {
    showLoading();

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    console.log("API RESPONSE:", result);

    if (!result.success) {
      throw new Error("API returned success:false");
    }

    trades = Array.isArray(result.data) ? result.data : [];
    filteredTrades = [...trades];

    updateDashboard();
    renderRecentTrades();
    renderJournal();
    renderAnalytics();

    hideLoading();

  } catch (error) {
    console.error("API ERROR:", error);
    showError();
  }
}

// ===============================
// DASHBOARD
// ===============================
function updateDashboard() {
  const totalTrades = trades.length;

  const openTrades = trades.filter(
    trade => String(trade.status).toUpperCase() === "OPEN"
  ).length;

  const totalProfit = trades.reduce(
    (sum, trade) => sum + Number(trade.profit || 0),
    0
  );

  const closedTrades = trades.filter(
    trade => String(trade.status).toUpperCase() === "CLOSED"
  );

  const winningTrades = closedTrades.filter(
    trade => Number(trade.profit || 0) > 0
  ).length;

  const winRate =
    closedTrades.length > 0
      ? (winningTrades / closedTrades.length) * 100
      : 0;

  setText("totalTrades", totalTrades);
  setText("openTrades", openTrades);
  setText("totalProfit", formatMoney(totalProfit));
  setText("winRate", `${winRate.toFixed(1)}%`);
}

// ===============================
// RECENT TRADES
// ===============================
function renderRecentTrades() {
  const container =
    document.querySelector("#recentTrades") ||
    document.querySelector(".recent-trades");

  if (!container) return;

  if (trades.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No trades yet
      </div>
    `;
    return;
  }

  container.innerHTML = trades
    .slice(0, 5)
    .map(trade => createTradeHTML(trade))
    .join("");
}

// ===============================
// JOURNAL
// ===============================
function renderJournal() {
  const tableBody =
    document.querySelector("#journalTableBody") ||
    document.querySelector("#tradesTableBody");

  if (!tableBody) return;

  if (filteredTrades.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          No trades found
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredTrades
    .map(trade => `
      <tr>
        <td>${escapeHTML(trade.ticket)}</td>
        <td>${escapeHTML(trade.symbol)}</td>
        <td>
          <span class="trade-side ${String(trade.side).toLowerCase()}">
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
    `)
    .join("");
}

// ===============================
// ANALYTICS
// ===============================
function renderAnalytics() {
  const profit = trades.reduce(
    (sum, trade) => sum + Number(trade.profit || 0),
    0
  );

  const volume = trades.reduce(
    (sum, trade) => sum + Number(trade.volume || 0),
    0
  );

  setText("analyticsProfit", formatMoney(profit));
  setText("analyticsVolume", volume.toFixed(2));
}

// ===============================
// FILTER
// ===============================
function setupFilters() {
  const sideFilter =
    document.querySelector("#sideFilter") ||
    document.querySelector("#positionFilter");

  const statusFilter =
    document.querySelector("#statusFilter");

  if (sideFilter) {
    sideFilter.addEventListener("change", applyFilters);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const sideFilter =
    document.querySelector("#sideFilter") ||
    document.querySelector("#positionFilter");

  const statusFilter =
    document.querySelector("#statusFilter");

  const side = sideFilter ? sideFilter.value : "ALL";
  const status = statusFilter ? statusFilter.value : "ALL";

  filteredTrades = trades.filter(trade => {
    const sideMatch =
      side === "ALL" ||
      String(trade.side).toUpperCase() === String(side).toUpperCase();

    const statusMatch =
      status === "ALL" ||
      String(trade.status).toUpperCase() === String(status).toUpperCase();

    return sideMatch && statusMatch;
  });

  renderJournal();
}

// ===============================
// NAVIGATION
// ===============================
function setupNavigation() {
  const navItems = document.querySelectorAll("[data-page]");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;

      document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
      });

      const target = document.getElementById(page);

      if (target) {
        target.classList.add("active");
      }

      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

// ===============================
// HELPERS
// ===============================
function createTradeHTML(trade) {
  return `
    <div class="trade-item">
      <div>
        <strong>${escapeHTML(trade.symbol)}</strong>
        <span>${escapeHTML(trade.side)}</span>
      </div>

      <div>
        <strong>${formatPrice(trade.entry_price)}</strong>
        <span>${escapeHTML(trade.status)}</span>
      </div>

      <div>
        ${formatMoney(trade.profit)}
      </div>
    </div>
  `;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(number);
}

function formatPrice(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value.replace(" ", "T"));

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

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===============================
// UI STATES
// ===============================
function showLoading() {
  const loading = document.querySelector("#loading");

  if (loading) {
    loading.style.display = "block";
  }
}

function hideLoading() {
  const loading = document.querySelector("#loading");

  if (loading) {
    loading.style.display = "none";
  }
}

function showError() {
  const loading = document.querySelector("#loading");

  if (loading) {
    loading.innerHTML = `
      <div class="error-state">
        API connection failed
        <button onclick="loadTrades()">Retry</button>
      </div>
    `;
  }
}
