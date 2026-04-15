// Fresh Start on Refresh
localStorage.removeItem('parkSmartHistory');

const CONFIG = {
    categories: ['Student', 'Staff', 'Employee', 'College Cab', 'Visitor', 'VIP'],
    types: ['Car', '2W'],
    slotsPerType: 50,
    rates: {
        'Car': 5,
        '2W': 2,
        'Cab': 0,
        'VIP': 0
    }
};

let profitChart = null;

function pollData() {
    const slots = JSON.parse(localStorage.getItem('parkSmartSlots')) || [];
    const history = JSON.parse(localStorage.getItem('parkSmartHistory')) || [];
    
    updateStats(slots, history);
    renderCategoryStats(slots);
    renderLogs(history);
    updateProfitChart(history);
}

function updateStats(slots, history) {
    const total = slots.length;
    const occupied = slots.filter(s => s.status === 'Occupied').length;
    const available = total - occupied;
    const revenue = history.reduce((sum, h) => sum + (parseInt(h.amount) || 0), 0);

    document.getElementById('admin-occupancy').textContent = total > 0 ? Math.round((occupied / total) * 100) + '%' : '0%';
    document.getElementById('admin-active').textContent = occupied;
    document.getElementById('admin-available').textContent = available;
    document.getElementById('admin-revenue').textContent = revenue;
}

function updateProfitChart(history) {
    const dailyData = {};
    
    // Group and sum by date
    history.forEach(h => {
        const date = h.time.split(',')[0]; // Simple date extraction
        dailyData[date] = (dailyData[date] || 0) + (parseInt(h.amount) || 0);
    });

    const labels = Object.keys(dailyData).reverse();
    const data = Object.values(dailyData).reverse();

    if (!profitChart) {
        const ctx = document.getElementById('profitChart').getContext('2d');
        profitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Profit (₹)',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } else {
        profitChart.data.labels = labels;
        profitChart.data.datasets[0].data = data;
        profitChart.update();
    }
}

function renderCategoryStats(slots) {
    const container = document.getElementById('admin-category-stats');
    container.innerHTML = CONFIG.categories.map(cat => {
        const catSlots = slots.filter(s => s.category === cat);
        const occupied = catSlots.filter(s => s.status === 'Occupied').length;
        const total = catSlots.length;
        const pct = total > 0 ? (occupied / total) * 100 : 0;
        
        let barColor = 'var(--primary)';
        if (pct > 50) barColor = 'var(--secondary)';
        if (pct > 80) barColor = '#ef4444';

        return `
            <div class="category-stat-row">
                <span style="width: 120px; font-weight: 600">${cat}</span>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${pct}%; background: ${barColor}"></div>
                </div>
                <div style="text-align: right; min-width: 60px">
                    <div style="font-weight: 800">${occupied}/${total}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted)">${Math.round(pct)}% Full</div>
                </div>
            </div>
        `;
    }).join('');
}

function formatTimeLeft(expiry) {
    const remaining = expiry - Date.now();
    if (remaining <= 0) return "Expired";
    
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderLogs(history) {
    const body = document.getElementById('global-history-body');
    // Admin now ONLY shows active bookings (No permanent history)
    const activeLogs = history.filter(h => h.status === 'Active');
    
    body.innerHTML = activeLogs.map(h => {
        const timeLeft = formatTimeLeft(h.expiry);
        
        return `
            <tr>
                <td>${h.user}</td>
                <td>${h.type}</td>
                <td><strong>${h.slotId}</strong></td>
                <td>${h.time}</td>
                <td>
                    <span class="status-badge" style="background: var(--success); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem;">
                        ${timeLeft}
                    </span>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No active logs found</td></tr>';
}

// Navigation
document.getElementById('btn-dash').onclick = () => {
    document.getElementById('admin-dash-view').classList.remove('hidden');
    document.getElementById('admin-logs-view').classList.add('hidden');
    document.getElementById('btn-dash').classList.add('active');
    document.getElementById('btn-logs').classList.remove('active');
};

document.getElementById('btn-logs').onclick = () => {
    document.getElementById('admin-dash-view').classList.add('hidden');
    document.getElementById('admin-logs-view').classList.remove('hidden');
    document.getElementById('btn-logs').classList.add('active');
    document.getElementById('btn-dash').classList.remove('active');
};

document.getElementById('btn-refresh').onclick = () => {
    pollData();
    const icon = document.querySelector('#btn-refresh i') || document.querySelector('#btn-refresh svg');
    if (icon) {
        icon.style.transition = 'transform 0.5s ease';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => icon.style.transform = 'rotate(0deg)', 500);
    }
};

// Initial Poll
pollData();

// LIVE SYNC: Automatic updates when localStorage changes in another tab
window.addEventListener('storage', (e) => {
    if (e.key === 'parkSmartSlots' || e.key === 'parkSmartHistory') {
        pollData();
    }
});

// Fallback interval
setInterval(pollData, 3000);
