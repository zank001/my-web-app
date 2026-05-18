const STORAGE_KEY = "money-journal-transactions";

const form = document.querySelector("#transaction-form");
const typeInput = document.querySelector("#type");
const descriptionInput = document.querySelector("#description");
const categoryInput = document.querySelector("#category");
const amountInput = document.querySelector("#amount");
const dateInput = document.querySelector("#date");
const transactionList = document.querySelector("#transaction-list");
const emptyState = document.querySelector("#empty-state");
const clearButton = document.querySelector("#clear-button");
const filterButtons = document.querySelectorAll(".filter-button");

const balanceTotal = document.querySelector("#balance-total");
const incomeTotal = document.querySelector("#income-total");
const expenseTotal = document.querySelector("#expense-total");
const transactionCount = document.querySelector("#transaction-count");

let transactions = loadTransactions();
let activeFilter = "all";

dateInput.valueAsDate = new Date();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) {
    amountInput.focus();
    return;
  }

  const transaction = {
    id: createTransactionId(),
    type: typeInput.value,
    description: descriptionInput.value.trim(),
    category: categoryInput.value.trim(),
    amount,
    date: dateInput.value,
  };

  transactions = [transaction, ...transactions];
  saveTransactions();
  form.reset();
  dateInput.valueAsDate = new Date();
  typeInput.value = "income";
  render();
});

clearButton.addEventListener("click", () => {
  if (transactions.length === 0) {
    return;
  }

  const confirmed = window.confirm("ต้องการล้างรายการทั้งหมดใช่ไหม?");
  if (confirmed) {
    transactions = [];
    saveTransactions();
    render();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

transactionList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");
  if (!deleteButton) {
    return;
  }

  transactions = transactions.filter((transaction) => transaction.id !== deleteButton.dataset.id);
  saveTransactions();
  render();
});

function render() {
  renderSummary();
  renderTransactions();
}

function renderSummary() {
  const totals = transactions.reduce(
    (summary, transaction) => {
      summary[transaction.type] += transaction.amount;
      return summary;
    },
    { income: 0, expense: 0 },
  );

  incomeTotal.textContent = formatCurrency(totals.income);
  expenseTotal.textContent = formatCurrency(totals.expense);
  balanceTotal.textContent = formatCurrency(totals.income - totals.expense);
  transactionCount.textContent = transactions.length.toString();
}

function renderTransactions() {
  const filteredTransactions = transactions.filter((transaction) => activeFilter === "all" || transaction.type === activeFilter);

  transactionList.innerHTML = filteredTransactions
    .map(
      (transaction) => `
        <li class="transaction-item">
          <div>
            <div class="transaction-title">${escapeHtml(transaction.description)}</div>
            <div class="transaction-meta">${escapeHtml(transaction.category)} • ${formatDate(transaction.date)}</div>
          </div>
          <div class="transaction-amount ${transaction.type}">
            ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
          </div>
          <button class="delete-button" type="button" data-id="${transaction.id}" aria-label="ลบ ${escapeHtml(transaction.description)}">ลบ</button>
        </li>
      `,
    )
    .join("");

  emptyState.classList.toggle("visible", filteredTransactions.length === 0);
}

function loadTransactions() {
  const storedTransactions = localStorage.getItem(STORAGE_KEY);
  return storedTransactions ? JSON.parse(storedTransactions) : [];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function createTransactionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}
