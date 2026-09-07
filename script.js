const API_URL =
  "https://trading-tracker-v1.kodokzganz.workers.dev/api/trades";

let trades = [];
let currentSide = "ALL";
let currentStatus = "ALL";


// ========================================
// INITIALIZE
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();
  setupFilters();
  setupRefresh();
  setupCloseTradeModal();

  loadTrades();

});


// ========================================
// API
// ========================================

async function loadTrades() {

  const refreshBtn =
    document.getElementById("refreshBtn");

  const refreshIcon =
    document.getElementById("refreshIcon");

  try {

    if (refreshBtn) {
      refreshBtn.disabled = true;
    }

    if (refreshIcon) {
      refreshIcon.textContent = "⟳";
    }

    setAPIStatus(null);

    const response =
      await fetch(
        API_URL + "?t=" + Date.now(),
        {
          method: "GET",

          headers: {
            Accept: "application/json"
          },

          cache: "no-store"
        }
      );

    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }

    const result =
      await response.json();

    console.log(
      "Trading Tracker API:",
      result
    );

    if (!result.success) {

      throw new Error(
        result.error ||
        "API returned success:false"
      );

    }

    trades =
      Array.isArray(result.data)
        ? result.data
        : [];

    renderAll();

    const updated =
      document.getElementById(
        "lastUpdated"
      );

    if (updated) {

      updated.textContent =
        "Updated " +
        new Date().toLocaleTimeString(
          "id-ID",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

    }

    setAPIStatus(true);

  } catch (error) {

    console.error(
      "API connection error:",
      error
    );

    setAPIStatus(false);

    showConnectionError();

  } finally {

    if (refreshBtn) {
      refreshBtn.disabled = false;
    }

    if (refreshIcon) {
      refreshIcon.textContent = "↻";
    }

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

  const total =
    trades.length;

  const open =
    trades.filter(
      trade =>
        String(trade.status || "")
          .toUpperCase() === "OPEN"
    ).length;

  const closed =
    trades.filter(
      trade =>
        String(trade.status || "")
          .toUpperCase() === "CLOSED"
    );

  const profit =
    trades.reduce(
      (sum, trade) =>
        sum +
        Number(trade.profit || 0),
      0
    );

  const wins =
    closed.filter(
      trade =>
        Number(trade.profit || 0) > 0
    ).length;

  const winRate =
    closed.length > 0
      ? (wins / closed.length) * 100
      : 0;


  setText(
    "statProfit",
    formatMoney(profit)
  );

  setText(
    "statTotal",
    total
  );

  setText(
    "statWinRate",
    closed.length > 0
      ? winRate.toFixed(1) + "%"
      : "—"
  );

  setText(
    "statOpen",
    open
  );


  const profitStatus =
    document.getElementById(
      "profitStatus"
    );

  if (profitStatus) {

    if (profit > 0) {

      profitStatus.textContent =
        "Net profit";

      profitStatus.className =
        "positive";

    } else if (profit < 0) {

      profitStatus.textContent =
        "Net loss";

      profitStatus.className =
        "negative";

    } else {

      profitStatus.textContent =
        "No closed P&L";

      profitStatus.className =
        "muted";

    }

  }

}


// ========================================
// RECENT TRADES
// ========================================

function renderRecentTrades() {

  const container =
    document.getElementById(
      "recentTrades"
    );

  const empty =
    document.getElementById(
      "emptyRecent"
    );

  if (!container) {
    return;
  }


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


  container.innerHTML =
    trades
      .slice(0, 5)
      .map(trade => {

        const side =
          String(trade.side || "")
            .toUpperCase();

        const status =
          String(trade.status || "")
            .toUpperCase();

        return `
          <div class="trade-item">

            <div>

              <strong>
                ${escapeHTML(
                  trade.symbol
                )}
              </strong>

              <span class="${side.toLowerCase()}">
                ${escapeHTML(side)}
              </span>

            </div>


            <div>

              <strong>
                ${formatPrice(
                  trade.entry_price
                )}
              </strong>

              <span>
                ${escapeHTML(status)}
              </span>

            </div>


            <div>

              <strong
                class="${getProfitClass(
                  trade.profit
                )}"
              >
                ${formatMoney(
                  trade.profit
                )}
              </strong>

              <span>
                ${formatDate(
                  trade.close_time ||
                  trade.open_time
                )}
              </span>

            </div>

          </div>
        `;

      })
      .join("");

}


// ========================================
// FILTERS
// ========================================

function getFilteredTrades() {

  return trades.filter(
    trade => {

      const sideMatch =
        currentSide === "ALL" ||
        String(trade.side || "")
          .toUpperCase() ===
          currentSide;


      const statusMatch =
        currentStatus === "ALL" ||
        String(trade.status || "")
          .toUpperCase() ===
          currentStatus;


      return (
        sideMatch &&
        statusMatch
      );

    }
  );

}


// ========================================
// JOURNAL
// ========================================

function renderJournal() {

  const tableBody =
    document.getElementById(
      "journalBody"
    );

  const cards =
    document.getElementById(
      "tradeCards"
    );

  const resultCount =
    document.getElementById(
      "resultCount"
    );

  const filtered =
    getFilteredTrades();


  if (resultCount) {

    resultCount.textContent =
      filtered.length +
      (
        filtered.length === 1
          ? " trade"
          : " trades"
      );

  }


  // ======================================
  // DESKTOP TABLE
  // ======================================

  if (tableBody) {

    if (filtered.length === 0) {

      tableBody.innerHTML = `
        <tr>

          <td
            colspan="10"
            style="
              text-align:center;
              padding:30px;
            "
          >
            No trades found
          </td>

        </tr>
      `;

    } else {

      tableBody.innerHTML =
        filtered
          .map(trade => {

            const side =
              String(trade.side || "")
                .toUpperCase();

            const status =
              String(trade.status || "")
                .toUpperCase();

            const isOpen =
              status === "OPEN";


            return `
              <tr>

                <td>
                  <strong>
                    ${escapeHTML(
                      trade.symbol
                    )}
                  </strong>
                </td>


                <td>

                  <span
                    class="${getSideBadgeClass(
                      side
                    )}"
                  >
                    ${escapeHTML(side)}
                  </span>

                </td>


                <td>
                  ${Number(
                    trade.volume || 0
                  ).toFixed(2)}
                </td>


                <td>
                  ${formatPrice(
                    trade.entry_price
                  )}
                </td>


                <td>
                  ${formatPrice(
                    trade.sl
                  )}
                </td>


                <td>
                  ${formatPrice(
                    trade.tp
                  )}
                </td>


                <td>

                  <span
                    class="${getProfitClass(
                      trade.profit
                    )}"
                  >
                    ${formatMoney(
                      trade.profit
                    )}
                  </span>

                </td>


                <td>

                  <span
                    class="${getStatusBadgeClass(
                      status
                    )}"
                  >
                    ${escapeHTML(status)}
                  </span>

                </td>


                <td>
                  ${formatDate(
                    trade.close_time ||
                    trade.open_time
                  )}
                </td>


                <td>

                  ${
                    isOpen
                      ? `
                        <button
                          class="close-trade-btn"
                          data-close-id="${escapeHTML(
                            trade.id
                          )}"
                          type="button"
                        >
                          Close
                        </button>
                      `
                      : `
                        <span class="closed-label">
                          —
                        </span>
                      `
                  }

                </td>

              </tr>
            `;

          })
          .join("");

    }

  }


  // ======================================
  // MOBILE CARDS
  // ======================================

  if (cards) {

    if (filtered.length === 0) {

      cards.innerHTML = `
        <div class="empty">
          No trades found
        </div>
      `;

    } else {

      cards.innerHTML =
        filtered
          .map(trade => {

            const side =
              String(trade.side || "")
                .toUpperCase();

            const status =
              String(trade.status || "")
                .toUpperCase();

            const isOpen =
              status === "OPEN";


            return `
              <div class="glass mobile-trade">

                <div class="mobile-trade-top">

                  <div>

                    <div class="mobile-symbol">
                      ${escapeHTML(
                        trade.symbol
                      )}
                    </div>

                    <span
                      class="${getSideBadgeClass(
                        side
                      )}"
                    >
                      ${escapeHTML(side)}
                    </span>

                  </div>


                  <strong
                    class="mobile-profit ${getProfitClass(
                      trade.profit
                    )}"
                  >
                    ${formatMoney(
                      trade.profit
                    )}
                  </strong>

                </div>


                <div class="mobile-meta">

                  <div>
                    <span>ENTRY</span>

                    <strong>
                      ${formatPrice(
                        trade.entry_price
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>SL</span>

                    <strong>
                      ${formatPrice(
                        trade.sl
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>TP</span>

                    <strong>
                      ${formatPrice(
                        trade.tp
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>VOLUME</span>

                    <strong>
                      ${Number(
                        trade.volume || 0
                      ).toFixed(2)}
                    </strong>
                  </div>


                  <div>
                    <span>STATUS</span>

                    <strong>
                      ${escapeHTML(status)}
                    </strong>
                  </div>


                  <div>
                    <span>TIME</span>

                    <strong>
                      ${formatDate(
                        trade.close_time ||
                        trade.open_time
                      )}
                    </strong>
                  </div>

                </div>


                ${
                  isOpen
                    ? `
                      <div class="mobile-action">

                        <button
                          class="close-trade-btn"
                          data-close-id="${escapeHTML(
                            trade.id
                          )}"
                          type="button"
                        >
                          Close Trade
                        </button>

                      </div>
                    `
                    : ""
                }

              </div>
            `;

          })
          .join("");

    }

  }


  setupCloseButtons();

}


// ========================================
// CLOSE BUTTONS
// ========================================

function setupCloseButtons() {

  document
    .querySelectorAll(
      "[data-close-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            String(
              button.dataset.closeId
            );


          const trade =
            trades.find(
              item =>
                String(item.id) === id
            );


          if (!trade) {

            console.error(
              "Trade not found:",
              id
            );

            return;

          }


          openCloseTradeModal(
            trade
          );

        }
      );

    });

}


// ========================================
// CLOSE TRADE MODAL SETUP
// ========================================

function setupCloseTradeModal() {

  const modal =
    document.getElementById(
      "closeTradeModal"
    );

  const closeModalBtn =
    document.getElementById(
      "closeModalBtn"
    );

  const cancelBtn =
    document.getElementById(
      "cancelCloseBtn"
    );

  const form =
    document.getElementById(
      "closeTradeForm"
    );


  if (!modal || !form) {
    return;
  }


  if (closeModalBtn) {

    closeModalBtn.addEventListener(
      "click",
      closeCloseTradeModal
    );

  }


  if (cancelBtn) {

    cancelBtn.addEventListener(
      "click",
      closeCloseTradeModal
    );

  }


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {

        closeCloseTradeModal();

      }

    }
  );


  form.addEventListener(
    "submit",
    handleCloseTradeSubmit
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        modal.classList.contains("active")
      ) {

        closeCloseTradeModal();

      }

    }
  );

}


// ========================================
// OPEN CLOSE MODAL
// ========================================

function openCloseTradeModal(
  trade
) {

  const modal =
    document.getElementById(
      "closeTradeModal"
    );

  const idInput =
    document.getElementById(
      "closeTradeId"
    );

  const closePrice =
    document.getElementById(
      "closePrice"
    );

  const profit =
    document.getElementById(
      "closeProfit"
    );

  const swap =
    document.getElementById(
      "closeSwap"
    );

  const commission =
    document.getElementById(
      "closeCommission"
    );

  const info =
    document.getElementById(
      "closeTradeInfo"
    );

  const message =
    document.getElementById(
      "closeTradeMessage"
    );


  if (!modal) {
    return;
  }


  if (idInput) {
    idInput.value = trade.id;
  }


  if (closePrice) {

    closePrice.value = "";

    setTimeout(
      () => closePrice.focus(),
      100
    );

  }


  if (profit) {
    profit.value = "";
  }


  if (swap) {
    swap.value = "0";
  }


  if (commission) {
    commission.value = "0";
  }


  if (message) {

    message.textContent = "";

    message.className =
      "close-trade-message";

  }


  if (info) {

    const side =
      String(
        trade.side || ""
      ).toUpperCase();


    info.innerHTML = `
      <strong>
        ${escapeHTML(
          trade.symbol
        )}
        ·
        ${escapeHTML(side)}
      </strong>

      <span>
        Ticket:
        ${escapeHTML(
          trade.ticket || "—"
        )}

        · Entry:
        ${formatPrice(
          trade.entry_price
        )}

        · Volume:
        ${Number(
          trade.volume || 0
        ).toFixed(2)}
      </span>
    `;

  }


  modal.classList.add(
    "active"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );

}


// ========================================
// CLOSE MODAL
// ========================================

function closeCloseTradeModal() {

  const modal =
    document.getElementById(
      "closeTradeModal"
    );

  const form =
    document.getElementById(
      "closeTradeForm"
    );

  const message =
    document.getElementById(
      "closeTradeMessage"
    );


  if (modal) {

    modal.classList.remove(
      "active"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  document.body.classList.remove(
    "modal-open"
  );


  if (form) {
    form.reset();
  }


  if (message) {

    message.textContent = "";

    message.className =
      "close-trade-message";

  }

}


// ========================================
// SUBMIT CLOSE TRADE
// ========================================

async function handleCloseTradeSubmit(
  event
) {

  event.preventDefault();


  const id =
    document.getElementById(
      "closeTradeId"
    )?.value;


  const closePrice =
    Number(
      document.getElementById(
        "closePrice"
      )?.value
    );


  const profit =
    Number(
      document.getElementById(
        "closeProfit"
      )?.value
    );


  const swap =
    Number(
      document.getElementById(
        "closeSwap"
      )?.value || 0
    );


  const commission =
    Number(
      document.getElementById(
        "closeCommission"
      )?.value || 0
    );


  const button =
    document.getElementById(
      "confirmCloseBtn"
    );


  if (!id) {

    showModalMessage(
      "Trade ID tidak ditemukan.",
      "error"
    );

    return;

  }


  if (!Number.isFinite(closePrice)) {

    showModalMessage(
      "Close Price harus diisi.",
      "error"
    );

    return;

  }


  if (!Number.isFinite(profit)) {

    showModalMessage(
      "Profit harus diisi.",
      "error"
    );

    return;

  }


  if (!Number.isFinite(swap)) {

    showModalMessage(
      "Swap tidak valid.",
      "error"
    );

    return;

  }


  if (!Number.isFinite(commission)) {

    showModalMessage(
      "Commission tidak valid.",
      "error"
    );

    return;

  }


  if (button) {

    button.disabled = true;

    button.textContent =
      "Closing...";

  }


  try {

    const respon
