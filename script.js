let expenses = [];
let income = [];
let reminders = []; 

const MAX_TIMEOUT = 2147483647; 
const categorySelect = document.getElementById("category-select");
const amountInput = document.getElementById("amount-input");
const dateInput = document.getElementById("date-input");
const addBtn = document.getElementById("add-btn");
const expensesTableBody = document.getElementById("expenses-table-body");
const totalAmountCell = document.getElementById("total-amount");

const incomeSourceInput = document.getElementById("income-source");
const incomeAmountInput = document.getElementById("income-amount");
const addIncomeBtn = document.getElementById("add-income-btn");

const reminderBtn = document.getElementById("set-reminder-btn");
const reminderText = document.getElementById("reminder-text");
const reminderDatetime = document.getElementById("reminder-datetime");
const reminderMessage = document.getElementById("reminder-message");
const remindersUl = document.getElementById("reminders-ul");

let categoryChart = null;
let balanceChart = null;
const scheduledTimers = new Map(); 


function saveAll() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("income", JSON.stringify(income));
  localStorage.setItem("reminders", JSON.stringify(reminders));
}

function loadAll() {
  expenses = JSON.parse(localStorage.getItem("expenses")) || [];
  income = JSON.parse(localStorage.getItem("income")) || [];
  reminders = JSON.parse(localStorage.getItem("reminders")) || [];
}


function updateTotals() {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  totalAmountCell.textContent = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalExpenses);
}

function renderExpenses() {
  expensesTableBody.innerHTML = "";
  expenses.forEach((expense, index) => {
    const newRow = expensesTableBody.insertRow();
    newRow.innerHTML = `
      <td>${expense.category}</td>
      <td>${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(expense.amount)}</td>
      <td>${expense.date}</td>
      <td><button class="delete-expense-btn" data-index="${index}">Delete</button></td>
    `;
  });

  document.querySelectorAll('.delete-expense-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      expenses.splice(idx, 1);
      saveAll();
      renderExpenses();
      updateCharts();
      updateTotals();
    });
  });
}

function updateCharts() {
  const categoryData = {};
  expenses.forEach(e => {
    categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
  });

  const categories = Object.keys(categoryData);
  const amounts = Object.values(categoryData);

  if (categoryChart) categoryChart.destroy();
  const categoryCtx = document.getElementById('category-chart').getContext('2d');
  categoryChart = new Chart(categoryCtx, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        label: 'Expenses',
        data: amounts,
        
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9900', '#339966', '#CC6699'
        ],
      }]
    }
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, it) => s + it.amount, 0);

  if (balanceChart) balanceChart.destroy();
  const balanceCtx = document.getElementById('balance-chart').getContext('2d');
  balanceChart = new Chart(balanceCtx, {
    type: 'bar',
    data: {
      labels: ['Total Income', 'Total Expenses', 'Net Balance'],
      datasets: [{
        label: 'Financial Overview',
        data: [totalIncome, totalExpenses, totalIncome - totalExpenses],
        backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderReminders() {
  remindersUl.innerHTML = "";
  reminders.forEach((reminder, idx) => {
    const li = document.createElement("li");
    const dt = new Date(reminder.datetime);
    li.innerHTML = `
      <span>${reminder.text} — ${dt.toLocaleString()}</span>
      <button class="delete-reminder-btn" data-index="${idx}" style="margin-left:10px;">Delete</button>
    `;
    remindersUl.appendChild(li);
  });

  document.querySelectorAll('.delete-reminder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const r = reminders[idx];
      if (r && r.id && scheduledTimers.has(r.id)) {
        clearTimeout(scheduledTimers.get(r.id));
        scheduledTimers.delete(r.id);
      }
      reminders.splice(idx, 1);
      saveAll();
      renderReminders();
    });
  });
}

function notifyUser(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else {
    alert(`${title}\n\n${body}`);
  }
}

function scheduleReminder(reminder) {
  
  if (!reminder || !reminder.datetime || !reminder.id) return;

 
  if (scheduledTimers.has(reminder.id)) {
    clearTimeout(scheduledTimers.get(reminder.id));
    scheduledTimers.delete(reminder.id);
  }

  const target = new Date(reminder.datetime).getTime();
  const now = Date.now();
  let delay = target - now;

  if (delay <= 0) {
    
    notifyUser("⏰ Reminder", reminder.text);
    return;
  }

  
  function scheduleWithPossibleChain(remainingDelay) {
    if (remainingDelay <= MAX_TIMEOUT) {
      const tId = setTimeout(() => {
        notifyUser("⏰ Reminder", reminder.text);
        scheduledTimers.delete(reminder.id);
      }, remainingDelay);
      scheduledTimers.set(reminder.id, tId);
    } else {
      
      const tId = setTimeout(() => {
        scheduledTimers.delete(reminder.id);
        
        const newRemaining = target - Date.now();
        if (newRemaining > 0) scheduleWithPossibleChain(newRemaining);
        else notifyUser("⏰ Reminder", reminder.text);
      }, MAX_TIMEOUT);
      scheduledTimers.set(reminder.id, tId);
    }
  }

  scheduleWithPossibleChain(delay);
}


addBtn.addEventListener("click", () => {
  const category = categorySelect.value;
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (!category || isNaN(amount) || amount <= 0 || !date) {
    alert("Please enter a valid category, amount, and date.");
    return;
  }

  expenses.push({ category, amount, date });
  saveAll();
  renderExpenses();
  updateCharts();
  updateTotals();

  amountInput.value = "";
  dateInput.value = "";
});

addIncomeBtn.addEventListener("click", () => {
  const source = incomeSourceInput.value;
  const amount = Number(incomeAmountInput.value);

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid income amount.");
    return;
  }

  income.push({ source, amount });
  incomeSourceInput.selectedIndex = 0;
  incomeAmountInput.value = "";
  saveAll();
  updateCharts();
});

reminderBtn.addEventListener("click", async () => {
  const text = reminderText.value.trim();
  const datetime = reminderDatetime.value;

  if (!text || !datetime) {
    reminderMessage.textContent = "⚠️ Please fill in both fields.";
    reminderMessage.style.color = "red";
    return;
  }


  if (Notification && Notification.permission !== "granted") {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        reminderMessage.textContent = "⚠️ Notification permission denied — reminders will use alerts.";
        reminderMessage.style.color = "orange";
      }
    } catch (err) {
      
    }
  }

  const reminder = {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    text,
    datetime
  };

  reminders.push(reminder);
  saveAll();
  renderReminders();
  scheduleReminder(reminder);

  reminderMessage.textContent = "✅ Reminder set successfully!";
  reminderMessage.style.color = "green";

  reminderText.value = "";
  reminderDatetime.value = "";
});


loadAll();
renderExpenses();
updateCharts();
updateTotals();
renderReminders();


reminders.forEach(r => scheduleReminder(r));
