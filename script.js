// Initialize data structure
let appData = {
    hdfc: {
        balance: 0,
        transactions: []
    },
    postal: {
        balance: 0,
        transactions: []
    },
    splits: {
        expenses: [],
        pending: 0,
        settled: 0
    }
};

// Calculator functionality
const calculator = {
    display: document.getElementById('calc-display'),
    currentValue: '',
    
    init() {
        document.querySelectorAll('.calc-btn').forEach(button => {
            button.addEventListener('click', () => this.handleButton(button.textContent));
        });

        document.getElementById('toggle-calculator').addEventListener('click', () => {
            document.getElementById('calculator-popup').style.display = 
                document.getElementById('calculator-popup').style.display === 'none' ? 'block' : 'none';
        });

        document.querySelector('.close-calculator').addEventListener('click', () => {
            document.getElementById('calculator-popup').style.display = 'none';
        });
    },

    handleButton(value) {
        switch(value) {
            case 'C':
                this.clear();
                break;
            case '=':
                this.calculate();
                break;
            default:
                this.appendValue(value);
        }
    },

    clear() {
        this.currentValue = '';
        this.display.value = '';
    },

    calculate() {
        try {
            this.currentValue = eval(this.currentValue).toString();
            this.display.value = this.currentValue;
        } catch (e) {
            this.display.value = 'Error';
            this.currentValue = '';
        }
    },

    appendValue(value) {
        this.currentValue += value;
        this.display.value = this.currentValue;
    }
};

// Load data from localStorage if available
function loadData() {
    const savedData = localStorage.getItem('financialTrackerData');
    if (savedData) {
        appData = JSON.parse(savedData);
        updateAllUI();
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('financialTrackerData', JSON.stringify(appData));
}

// Delete transaction function
function deleteTransaction(bank, index) {
    const transaction = appData[bank].transactions[index];
    
    if (transaction.type === 'expense') {
        appData[bank].balance += transaction.amount;
    } else {
        appData[bank].balance -= transaction.amount;
    }
    
    appData[bank].transactions.splice(index, 1);
    
    // Recalculate balances for remaining transactions
    let runningBalance = appData[bank].balance;
    for (let i = index; i < appData[bank].transactions.length; i++) {
        if (appData[bank].transactions[i].type === 'expense') {
            runningBalance -= appData[bank].transactions[i].amount;
        } else {
            runningBalance += appData[bank].transactions[i].amount;
        }
        appData[bank].transactions[i].balance = runningBalance;
    }
    
    saveData();
    updateAllUI();
}

// Update all UI elements with current data
function updateAllUI() {
    updateDashboard();
    updateHDFCUI();
    updatePostalUI();
    updateSplitsUI();
}

// Format currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toFixed(2);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Tab navigation
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Modal functions
function openModal(modalId, title = '') {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    
    if (title) {
        document.getElementById('modal-title').textContent = title;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

// Close modals when clicking the X or outside the modal
document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        const modal = closeBtn.closest('.modal');
        modal.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    document.querySelectorAll('.modal').forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Split equally function
function splitEqually() {
    const totalAmount = parseFloat(document.getElementById('split-total').value);
    const participants = document.querySelectorAll('.participant-row');
    if (totalAmount && participants.length > 0) {
        const share = totalAmount / participants.length;
        participants.forEach(participant => {
            participant.querySelector('.participant-share').value = share.toFixed(2);
        });
    }
}

// Settlement calculation
function updateSettlementSummary() {
    const summary = document.getElementById('settlement-summary');
    summary.innerHTML = '';
    
    const participants = {};
    
    appData.splits.expenses.forEach(expense => {
        expense.participants.forEach(participant => {
            if (!participants[participant.name]) {
                participants[participant.name] = {
                    owes: 0,
                    settled: 0
                };
            }
            
            if (participant.settled) {
                participants[participant.name].settled += participant.share;
            } else {
                participants[participant.name].owes += participant.share;
            }
        });
    });
    
    Object.entries(participants).forEach(([name, amounts]) => {
        const div = document.createElement('div');
        div.className = 'settlement-item';
        div.innerHTML = `
            <span>${name}</span>
            <div>
                <div>Owes: ${formatCurrency(amounts.owes)}</div>
                <div>Settled: ${formatCurrency(amounts.settled)}</div>
            </div>
        `;
        summary.appendChild(div);
    });
}
function updateParticipantsSummary() {
    const summaryBody = document.getElementById('participants-summary-body');
    const participantStats = {};

    // Calculate statistics for each participant
    appData.splits.expenses.forEach(expense => {
        expense.participants.forEach(participant => {
            if (!participantStats[participant.name]) {
                participantStats[participant.name] = {
                    totalSplits: 0,
                    totalAmount: 0,
                    pending: 0,
                    settled: 0
                };
            }

            participantStats[participant.name].totalSplits++;
            participantStats[participant.name].totalAmount += participant.share;
            
            if (participant.settled) {
                participantStats[participant.name].settled += participant.share;
            } else {
                participantStats[participant.name].pending += participant.share;
            }
        });
    });

    // Update table
    summaryBody.innerHTML = '';
    Object.entries(participantStats).forEach(([name, stats]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name}</td>
            <td>${stats.totalSplits}</td>
            <td>${formatCurrency(stats.totalAmount)}</td>
            <td class="text-danger">${formatCurrency(stats.pending)}</td>
            <td class="text-success">${formatCurrency(stats.settled)}</td>
        `;
        summaryBody.appendChild(row);
    });
}
// ---------- DASHBOARD FUNCTIONS ----------
function updateDashboard() {
    // Update balance displays
    document.getElementById('hdfc-balance').textContent = formatCurrency(appData.hdfc.balance);
    document.getElementById('postal-balance').textContent = formatCurrency(appData.postal.balance);
    document.getElementById('split-pending').textContent = formatCurrency(appData.splits.pending);
    document.getElementById('split-settled').textContent = formatCurrency(appData.splits.settled);
    
    // Update recent transactions
    updateRecentTransactions();
    
    // Update charts
    updateCharts();
}

function updateRecentTransactions() {
    const tbody = document.getElementById('recent-transactions-body');
    tbody.innerHTML = '';
    
    // Combine all transactions
    let allTransactions = [
        ...appData.hdfc.transactions.map(t => ({...t, account: 'HDFC Bank'})),
        ...appData.postal.transactions.map(t => ({...t, account: 'Postal Bank'}))
    ];
    
    // Add split expenses as transactions
    appData.splits.expenses.forEach(split => {
        allTransactions.push({
            date: split.date,
            description: split.description,
            category: split.category,
            amount: split.total,
            account: 'Split Expense'
        });
    });
    
    // Sort by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Take only the 10 most recent transactions
    const recentTransactions = allTransactions.slice(0, 10);
    
    // Populate the table
    recentTransactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.account}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'expense' ? 'text-danger' : 'text-success'}">
                ${transaction.type === 'expense' ? '-' : '+'} ${formatCurrency(transaction.amount)}
            </td>
            <td>
                ${transaction.account !== 'Split Expense' ? 
                    `<button class="delete-btn" onclick="deleteTransaction('${transaction.account.toLowerCase().split(' ')[0]}', ${index})">Delete</button>` : 
                    ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateCharts() {
    // Create expense breakdown chart
    const expenseCtx = document.getElementById('expense-chart').getContext('2d');
    
    // Get all expense transactions
    const hdfcExpenses = appData.hdfc.transactions.filter(t => t.type === 'expense');
    const postalExpenses = appData.postal.transactions.filter(t => t.type === 'expense');
    
    // Combine all expenses
    const allExpenses = [...hdfcExpenses, ...postalExpenses];
    
    // Group by category
    const categoryTotals = {};
    allExpenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += parseFloat(expense.amount);
    });
    
    // Create chart data
    const categories = Object.keys(categoryTotals);
    const categoryAmounts = categories.map(cat => categoryTotals[cat]);
    
    // Generate random colors
    const backgroundColors = categories.map(() => 
        `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`
    );
    
    // Create or update chart
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }
    
    window.expenseChart = new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: categoryAmounts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
    
    // Create transaction history chart
    const transactionCtx = document.getElementById('transaction-chart').getContext('2d');
    
    // Combine all transactions
    const allTransactions = [
        ...appData.hdfc.transactions,
        ...appData.postal.transactions
    ];
    
    // Group by date (last 7 days)
    const today = new Date();
    const dates = [];
    const incomeData = [];
    const expenseData = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dates.push(dateString);
        
        // Calculate income and expense for this date
        const income = allTransactions
            .filter(t => {
                const transDate = new Date(t.date);
                return transDate.getDate() === date.getDate() && 
                       transDate.getMonth() === date.getMonth() && 
                       transDate.getFullYear() === date.getFullYear() && 
                       t.type === 'income';
            })
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        const expense = allTransactions
            .filter(t => {
                const transDate = new Date(t.date);
                return transDate.getDate() === date.getDate() && 
                       transDate.getMonth() === date.getMonth() && 
                       transDate.getFullYear() === date.getFullYear() && 
                       t.type === 'expense';
            })
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        incomeData.push(income);
        expenseData.push(expense);
    }
    
    // Create or update chart
    if (window.transactionChart) {
        window.transactionChart.destroy();
    }
    
    window.transactionChart = new Chart(transactionCtx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
// Set initial balance buttons
document.getElementById('add-hdfc-balance').addEventListener('click', () => {
    openModal('balance-modal', 'Set HDFC Bank Balance');
    document.getElementById('initial-balance').value = appData.hdfc.balance;
    document.getElementById('balance-form').onsubmit = function(e) {
        e.preventDefault();
        const balance = parseFloat(document.getElementById('initial-balance').value);
        appData.hdfc.balance = balance;
        saveData();
        updateAllUI();
        closeModal('balance-modal');
    };
});

document.getElementById('add-postal-balance').addEventListener('click', () => {
    openModal('balance-modal', 'Set Postal Bank Balance');
    document.getElementById('initial-balance').value = appData.postal.balance;
    document.getElementById('balance-form').onsubmit = function(e) {
        e.preventDefault();
        const balance = parseFloat(document.getElementById('initial-balance').value);
        appData.postal.balance = balance;
        saveData();
        updateAllUI();
        closeModal('balance-modal');
    };
});

// Filter transactions
document.getElementById('filter-account').addEventListener('change', updateRecentTransactions);
document.getElementById('search-transaction').addEventListener('input', updateRecentTransactions);

// ---------- HDFC BANK FUNCTIONS ----------
function updateHDFCUI() {
    // Update balance display
    document.getElementById('hdfc-current-balance').textContent = formatCurrency(appData.hdfc.balance);
    
    // Update transaction history
    const tbody = document.getElementById('hdfc-transactions-body');
    tbody.innerHTML = '';
    
    // Get transactions and sort by date (most recent first)
    const transactions = [...appData.hdfc.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply filters
    const categoryFilter = document.getElementById('hdfc-filter-category').value;
    const searchTerm = document.getElementById('hdfc-search').value.toLowerCase();
    
    const filteredTransactions = transactions.filter(transaction => {
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) || 
                             transaction.category.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });
    
    // Populate the table
    filteredTransactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'expense' ? 'text-danger' : 'text-success'}">
                ${transaction.type === 'expense' ? '-' : '+'} ${formatCurrency(transaction.amount)}
            </td>
            <td>${formatCurrency(transaction.balance)}</td>
            <td><button class="delete-btn" onclick="deleteTransaction('hdfc', ${index})">Delete</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Set initial balance button
document.getElementById('hdfc-set-initial').addEventListener('click', () => {
    openModal('balance-modal', 'Set HDFC Bank Initial Balance');
    document.getElementById('initial-balance').value = appData.hdfc.balance;
    document.getElementById('balance-form').onsubmit = function(e) {
        e.preventDefault();
        const balance = parseFloat(document.getElementById('initial-balance').value);
        appData.hdfc.balance = balance;
        saveData();
        updateAllUI();
        closeModal('balance-modal');
    };
});

// Add HDFC transaction
document.getElementById('hdfc-transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('hdfc-amount').value);
    const type = document.getElementById('hdfc-type').value;
    const date = document.getElementById('hdfc-date').value;
    const category = document.getElementById('hdfc-category').value;
    const description = document.getElementById('hdfc-description').value;
    
    // Update balance
    if (type === 'expense') {
        appData.hdfc.balance -= amount;
    } else {
        appData.hdfc.balance += amount;
    }
    
    // Add transaction
    appData.hdfc.transactions.push({
        amount,
        type,
        date,
        category,
        description,
        balance: appData.hdfc.balance
    });
    
    // Save data and update UI
    saveData();
    updateAllUI();
    
    // Reset form
    document.getElementById('hdfc-transaction-form').reset();
    // Set current date and time as default
    document.getElementById('hdfc-date').value = new Date().toISOString().slice(0, 16);
});

// Filter HDFC transactions
document.getElementById('hdfc-filter-category').addEventListener('change', updateHDFCUI);
document.getElementById('hdfc-search').addEventListener('input', updateHDFCUI);

// ---------- POSTAL BANK FUNCTIONS ----------
function updatePostalUI() {
    // Update balance display
    document.getElementById('postal-current-balance').textContent = formatCurrency(appData.postal.balance);
    
    // Update transaction history
    const tbody = document.getElementById('postal-transactions-body');
    tbody.innerHTML = '';
    
    // Get transactions and sort by date (most recent first)
    const transactions = [...appData.postal.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply filters
    const categoryFilter = document.getElementById('postal-filter-category').value;
    const searchTerm = document.getElementById('postal-search').value.toLowerCase();
    
    const filteredTransactions = transactions.filter(transaction => {
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) || 
                             transaction.category.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });
    
    // Populate the table
    filteredTransactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'expense' ? 'text-danger' : 'text-success'}">
                ${transaction.type === 'expense' ? '-' : '+'} ${formatCurrency(transaction.amount)}
            </td>
            <td>${formatCurrency(transaction.balance)}</td>
            <td><button class="delete-btn" onclick="deleteTransaction('postal', ${index})">Delete</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Set initial balance button
document.getElementById('postal-set-initial').addEventListener('click', () => {
    openModal('balance-modal', 'Set Postal Bank Initial Balance');
    document.getElementById('initial-balance').value = appData.postal.balance;
    document.getElementById('balance-form').onsubmit = function(e) {
        e.preventDefault();
        const balance = parseFloat(document.getElementById('initial-balance').value);
        appData.postal.balance = balance;
        saveData();
        updateAllUI();
        closeModal('balance-modal');
    };
});

// Add Postal transaction
document.getElementById('postal-transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('postal-amount').value);
    const type = document.getElementById('postal-type').value;
    const date = document.getElementById('postal-date').value;
    const category = document.getElementById('postal-category').value;
    const description = document.getElementById('postal-description').value;
    
    // Update balance
    if (type === 'expense') {
        appData.postal.balance -= amount;
    } else {
        appData.postal.balance += amount;
    }
    
    // Add transaction
    appData.postal.transactions.push({
        amount,
        type,
        date,
        category,
        description,
        balance: appData.postal.balance
    });
    
    // Save data and update UI
    saveData();
    updateAllUI();
    
    // Reset form
    document.getElementById('postal-transaction-form').reset();
    // Set current date and time as default
    document.getElementById('postal-date').value = new Date().toISOString().slice(0, 16);
});

// Filter Postal transactions
document.getElementById('postal-filter-category').addEventListener('change', updatePostalUI);
document.getElementById('postal-search').addEventListener('input', updatePostalUI);

// ---------- SPLIT EXPENSES FUNCTIONS ----------
function updateSplitsUI() {
    // Update balance displays
    document.getElementById('split-pending-amount').textContent = formatCurrency(appData.splits.pending);
    document.getElementById('split-settled-amount').textContent = formatCurrency(appData.splits.settled);
    
    // Update split expenses list
    const container = document.getElementById('split-expenses-container');
    container.innerHTML = '';
    
    // Get split expenses and sort by date (most recent first)
    const splitExpenses = [...appData.splits.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply filters
    const statusFilter = document.getElementById('split-filter-status').value;
    const searchTerm = document.getElementById('split-search').value.toLowerCase();
    
    const filteredExpenses = splitExpenses.filter(expense => {
        // Check if all participants have settled
        const allSettled = expense.participants.every(p => p.settled);
        const status = allSettled ? 'settled' : 'pending';
        
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesSearch = expense.description.toLowerCase().includes(searchTerm) || 
                             expense.category.toLowerCase().includes(searchTerm) ||
                             expense.participants.some(p => p.name.toLowerCase().includes(searchTerm));
        return matchesStatus && matchesSearch;
    });
    
    // Populate the container
    filteredExpenses.forEach(expense => {
        const allSettled = expense.participants.every(p => p.settled);
        const card = document.createElement('div');
        card.className = 'split-expense-card';
        
        if (allSettled) {
            card.style.borderLeftColor = 'var(--success-color)';
        } else {
            card.style.borderLeftColor = 'var(--warning-color)';
        }
        
        let participantsHTML = '';
        expense.participants.forEach((participant, index) => {
            participantsHTML += `
                <div class="participant-item ${participant.settled ? 'settled' : ''}">
                    <div>
                        <input type="checkbox" class="participant-checkbox" 
                               data-expense-index="${expense.id}" 
                               data-participant-index="${index}" 
                               ${participant.settled ? 'checked' : ''}>
                        <span>${participant.name}</span>
                    </div>
                    <span>${formatCurrency(participant.share)}</span>
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="split-header">
                <h3>${expense.description}</h3>
                <span>${formatDate(expense.date)}</span>
            </div>
            <div class="split-details">
                <p><strong>Category:</strong> ${expense.category}</p>
                <p><strong>Status:</strong> ${allSettled ? 'Settled' : 'Pending'}</p>
            </div>
            <div class="split-participants">
                <h4>Participants</h4>
                ${participantsHTML}
                <div class="split-total">
                    <span>Total</span>
                    <span>${formatCurrency(expense.total)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.participant-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const expenseId = checkbox.getAttribute('data-expense-index');
            const participantIndex = parseInt(checkbox.getAttribute('data-participant-index'));
            
            const expense = appData.splits.expenses.find(e => e.id === expenseId);
            if (expense) {
                const participant = expense.participants[participantIndex];
                
                // Update settled status
                if (checkbox.checked && !participant.settled) {
                    // Settling a previously unsettled amount
                    participant.settled = true;
                    appData.splits.pending -= participant.share;
                    appData.splits.settled += participant.share;
                } else if (!checkbox.checked && participant.settled) {
                    // Unsettling a previously settled amount
                    participant.settled = false;
                    appData.splits.pending += participant.share;
                    appData.splits.settled -= participant.share;
                }
                
                // Save data and update UI
                saveData();
                updateAllUI();
            }
        });
    });
}

// Add participant button
document.getElementById('add-participant').addEventListener('click', () => {
    const container = document.getElementById('participants-container');
    const participantRow = document.createElement('div');
    participantRow.className = 'participant-row';
    participantRow.innerHTML = `
        <input type="text" class="participant-name" placeholder="Name" required>
        <input type="number" class="participant-share" placeholder="Share" step="0.01" required>
        <button type="button" class="remove-participant">X</button>
    `;
    container.appendChild(participantRow);
    
    // Add event listener to remove button
    participantRow.querySelector('.remove-participant').addEventListener('click', () => {
        participantRow.remove();
    });
});

// Remove participant button event delegation
document.getElementById('participants-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-participant')) {
        e.target.closest('.participant-row').remove();
    }
});

// Add split expense
document.getElementById('split-expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const description = document.getElementById('split-description').value;
    const total = parseFloat(document.getElementById('split-total').value);
    const date = document.getElementById('split-date').value;
    const category = document.getElementById('split-category').value;
    
    // Get participants
    const participants = [];
    document.querySelectorAll('.participant-row').forEach(row => {
        const name = row.querySelector('.participant-name').value;
        const share = parseFloat(row.querySelector('.participant-share').value);
        
        participants.push({
            name,
            share,
            settled: false
        });
    });
    
    // Validate total matches sum of shares
    const totalShares = participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(total - totalShares) > 0.01) {
        alert('The sum of individual shares must equal the total amount.');
        return;
    }
    
    // Update pending amount
    appData.splits.pending += total;
    
    // Add split expense
    appData.splits.expenses.push({
        id: Date.now().toString(), // Use timestamp as unique ID
        description,
        total,
        date,
        category,
        participants
    });
    
    // Save data and update UI
    saveData();
    updateAllUI();
    
    // Reset form
    document.getElementById('split-expense-form').reset();
    // Set current date and time as default
    document.getElementById('split-date').value = new Date().toISOString().slice(0, 16);
    // Reset participants container (keep one empty row)
    document.getElementById('participants-container').innerHTML = `
        <div class="participant-row">
            <input type="text" class="participant-name" placeholder="Name" required>
            <input type="number" class="participant-share" placeholder="Share" step="0.01" required>
            <button type="button" class="remove-participant">X</button>
        </div>
    `;
});

// Filter split expenses
document.getElementById('split-filter-status').addEventListener('change', updateSplitsUI);
document.getElementById('split-search').addEventListener('input', updateSplitsUI);

// Export functionality
document.getElementById('export-data').addEventListener('click', () => {
    openModal('export-modal');
});

document.getElementById('export-csv').addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "HDFC BANK TRANSACTIONS\n";
    csvContent += "Date,Description,Category,Type,Amount,Balance\n";
    appData.hdfc.transactions.forEach(t => {
        csvContent += `${t.date},${t.description},${t.category},${t.type},${t.amount},${t.balance}\n`;
    });
    
    csvContent += "\nPOSTAL BANK TRANSACTIONS\n";
    csvContent += "Date,Description,Category,Type,Amount,Balance\n";
    appData.postal.transactions.forEach(t => {
        csvContent += `${t.date},${t.description},${t.category},${t.type},${t.amount},${t.balance}\n`;
    });
    
    csvContent += "\nSPLIT EXPENSES\n";
    csvContent += "Date,Description,Category,Total,Status\n";
    appData.splits.expenses.forEach(e => {
        const allSettled = e.participants.every(p => p.settled);
        csvContent += `${e.date},${e.description},${e.category},${e.total},${allSettled ? 'Settled' : 'Pending'}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    closeModal('export-modal');
});

document.getElementById('export-pdf').addEventListener('click', () => {
    alert("PDF export feature coming soon!");
    closeModal('export-modal');
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set current date and time as default for all date inputs
    const now = new Date().toISOString().slice(0, 16);
    document.getElementById('hdfc-date').value = now;
    document.getElementById('postal-date').value = now;
    document.getElementById('split-date').value = now;
    
    // Initialize calculator
    calculator.init();
    // Add this with your other event listeners
document.getElementById('show-summary').addEventListener('click', () => {
    const popup = document.getElementById('participants-summary-popup');
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    updateParticipantsSummary(); // Update the summary when showing
});

document.querySelector('.close-summary').addEventListener('click', () => {
    document.getElementById('participants-summary-popup').style.display = 'none';
});

// Close popup when clicking outside
window.addEventListener('click', (event) => {
    const popup = document.getElementById('participants-summary-popup');
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});
    // Add event listener to first remove participant button
    document.querySelector('.remove-participant').addEventListener('click', (e) => {
        if (document.querySelectorAll('.participant-row').length > 1) {
            e.target.closest('.participant-row').remove();
        }
    });
    
    // Add event listener to split equally button
    document.getElementById('split-equally').addEventListener('click', splitEqually);
    
    // Load data from localStorage
    loadData();
    
    // Initial settlement summary update
    updateSettlementSummary();
});