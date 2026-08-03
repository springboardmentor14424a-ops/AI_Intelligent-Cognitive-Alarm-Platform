/* ==========================================================================
   INTELLIGENT COGNITIVE ALARM PLATFORM - ADMINISTRATOR COCKPIT CONTROLLER
   ========================================================================== */

// 1. Data Stores
let usersList = JSON.parse(localStorage.getItem('users_db')) || [];

let auditLogs = [
    { time: '09:30:15 AM', module: 'AUTH', msg: 'User Alex Mercer logged in successfully.', status: 'success' },
    { time: '09:30:12 AM', module: 'DATABASE', msg: 'Synced 862 alarm registers in 12ms.', status: 'success' },
    { time: '08:00:00 AM', module: 'CRON', msg: 'Dispatched 1,420 cognitive wakeup calls.', status: 'info' },
    { time: '06:00:00 AM', module: 'CLUSTER', msg: 'Cloud cluster replication complete.', status: 'success' }
];

// 2. Tab Navigation Switcher
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content-section').forEach(section => {
        section.classList.remove('active');
    });

    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabId) {
            item.classList.add('active');
        }
    });

    const crumbText = document.getElementById('breadcrumb-current');
    if (crumbText) {
        const item = document.querySelector(`.sidebar-menu-item[data-tab="${tabId}"] span`);
        crumbText.textContent = item ? item.textContent : 'Profile';
    }

    document.body.classList.remove('sidebar-open');
};

document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(item.dataset.tab);
    });
});

// 3. User Database Operations & Table Renderers
async function renderUsers() {
    const API_BASE_URL = typeof window !== 'undefined' && window.location.port === '8000' ? '' : 'http://localhost:8000';

    try {
        // Cache-busting query parameter forces browser to get fresh PostgreSQL user list
        const response = await fetch(`${API_BASE_URL}/api/auth/users?t=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            usersList = data.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role.toLowerCase(),
                provider: u.provider,
                password: '••••••••'
            }));
            localStorage.setItem('users_db', JSON.stringify(usersList));
        } else {
            usersList = JSON.parse(localStorage.getItem('users_db')) || [];
        }
    } catch (error) {
        console.warn('Failed to fetch registered users from database API:', error);
        usersList = JSON.parse(localStorage.getItem('users_db')) || [];
    }

    const dashboardUsersTable = document.getElementById('admin-users-table')?.querySelector('tbody');
    const consoleUsersTable = document.getElementById('all-users-console-table')?.querySelector('tbody');
    
    // Calculate breakdown numbers
    const totalAccounts = usersList.length;
    const studentsCount = usersList.filter(u => u.role === 'user' || u.role === 'student').length;
    const coachesCount = usersList.filter(u => u.role === 'coach').length;

    // Update metric cards
    const totalElem = document.getElementById('stat-total-accounts');
    const studentsElem = document.getElementById('stat-students-count');
    const coachesElem = document.getElementById('stat-coaches-count');

    if (totalElem) totalElem.textContent = totalAccounts;
    if (studentsElem) studentsElem.textContent = studentsCount;
    if (coachesElem) coachesElem.textContent = coachesCount;

    // Render Dashboard Table (Recent 5)
    if (dashboardUsersTable) {
        dashboardUsersTable.innerHTML = '';
        usersList.slice(-5).reverse().forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${getRoleBadgeClass(u.role)}">${getRoleBadgeLabel(u.role)}</span></td>
                <td>
                    <button class="table-action-btn delete-btn" onclick="deleteUserAccount('${u.email}', '${u.role}')" title="Delete Account"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            dashboardUsersTable.appendChild(tr);
        });
    }

    // Render Manage Console Table (Full list)
    if (consoleUsersTable) {
        consoleUsersTable.innerHTML = '';
        usersList.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${getRoleBadgeClass(u.role)}">${getRoleBadgeLabel(u.role)}</span></td>
                <td><code>${u.password || '••••••••'}</code></td>
                <td>
                    <button class="table-action-btn delete-btn" onclick="deleteUserAccount('${u.email}', '${u.role}')" title="Delete User"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            consoleUsersTable.appendChild(tr);
        });
    }
}

function getRoleBadgeLabel(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('admin')) return 'ADMIN';
    if (r.includes('coach')) return 'WELLNESS COACH';
    return 'STUDENT / USER';
}

function getRoleBadgeClass(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('admin')) return 'badge-danger';
    if (r.includes('coach')) return 'badge-info';
    return 'badge-success';
}

window.deleteUserAccount = async (email, role) => {
    // Prevent self-deletion of currently logged admin
    const currentSession = JSON.parse(localStorage.getItem('sessionUser') || '{}');
    if (currentSession.email === email && currentSession.role === role) {
        Toast.show('Access Denied', 'Self-deletion of active administrator is not permitted.', 'danger', 3000);
        return;
    }

    const API_BASE_URL = typeof window !== 'undefined' && window.location.port === '8000' ? '' : 'http://localhost:8000';
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/users/${encodeURIComponent(email)}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
            Toast.show('Failed', data.detail || 'Could not delete user.', 'danger', 3000);
            return;
        }

        await renderUsers();
        Toast.show('User Removed', `Account ${email} deleted from Database.`, 'success', 2500);
    } catch (error) {
        console.error('Delete User API Error:', error);
        usersList = usersList.filter(u => !(u.email.toLowerCase() === email.toLowerCase() && u.role === role));
        localStorage.setItem('users_db', JSON.stringify(usersList));
        await renderUsers();
        Toast.show('User Removed', `Account ${email} removed locally.`, 'success', 2500);
    }
};

// Add user submit listener
const addUserForm = document.getElementById('add-user-form');
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('admin-user-name').value;
        const email = document.getElementById('admin-user-email').value;
        const password = document.getElementById('admin-user-password').value;
        const role = document.getElementById('admin-user-role').value;

        // Perform registration directly in PostgreSQL database
        const result = await registerUserAsync(name, email, password, role);

        if (result.success) {
            renderUsers();
            Modal.close('add-user-modal');
            addUserForm.reset();
            Toast.show('User Compiled', `Account generated for ${email} in PostgreSQL.`, 'success', 3000);
        } else {
            Toast.show('Failed', result.message, 'warning', 2500);
        }
    });
}

// 4. Render Platform Logs
function renderLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (tbody) {
        tbody.innerHTML = '';
        auditLogs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-size:0.8rem; color:var(--text-muted);">${l.time}</span></td>
                <td><strong>[${l.module}]</strong> ${l.msg}</td>
                <td><span class="badge ${l.status === 'success' ? 'badge-success' : 'badge-info'}">${l.status.toUpperCase()}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 5. Chart.js Graphs setup
let adminUsersChart, adminAlarmStatsChart, adminRoleDistChart;

function initCharts() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ca3af' : '#62627a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.08)';

    // Monthly User Growth
    const usersCtx = document.getElementById('adminUsersChart');
    if (usersCtx) {
        adminUsersChart = new Chart(usersCtx, {
            type: 'line',
            data: {
                labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Platform Growth (Users)',
                    data: [120, 240, 480, 720, 980, 1420],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.06)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }

    // Alarm setup statistics
    const alarmStatsCtx = document.getElementById('adminAlarmStatsChart');
    if (alarmStatsCtx) {
        adminAlarmStatsChart = new Chart(alarmStatsCtx, {
            type: 'bar',
            data: {
                labels: ['Math Focus', 'Precision Taps', 'No Obstacle'],
                datasets: [{
                    label: 'Configured Alarms',
                    data: [420, 310, 132],
                    backgroundColor: ['#6366f1', '#3b82f6', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }

    // Role distributions
    const roleDistCtx = document.getElementById('adminRoleDistChart');
    if (roleDistCtx) {
        // Calculate role breakdown from users list
        const roles = usersList.map(u => u.role);
        const adminCount = roles.filter(r => r === 'admin').length;
        const coachCount = roles.filter(r => r === 'coach').length;
        const userCount = roles.filter(r => r === 'user').length;

        adminRoleDistChart = new Chart(roleDistCtx, {
            type: 'doughnut',
            data: {
                labels: ['Users', 'Coaches', 'Admins'],
                datasets: [{
                    data: [userCount, coachCount, adminCount],
                    backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                }
            }
        });
    }
}

// Watch theme toggles to reload chart contexts
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTimeout(() => {
        if (adminUsersChart) adminUsersChart.destroy();
        if (adminAlarmStatsChart) adminAlarmStatsChart.destroy();
        if (adminRoleDistChart) adminRoleDistChart.destroy();
        initCharts();
    }, 100);
});
document.querySelector('.nav-toggle-theme')?.addEventListener('click', () => {
    setTimeout(() => {
        if (adminUsersChart) adminUsersChart.destroy();
        if (adminAlarmStatsChart) adminAlarmStatsChart.destroy();
        if (adminRoleDistChart) adminRoleDistChart.destroy();
        initCharts();
    }, 100);
});

// 6. Generate Mock Audit Database Zip/Text Download
window.simulateAdminExport = () => {
    Toast.show('Compiling System Logs...', 'Building full cryptographic ledger backup.', 'info', 2000);
    setTimeout(() => {
        const text = `WAKEWISE AI - SYSTEM AUDIT LEDGER
------------------------------------------------------
DATE GENERATED: ${new Date().toLocaleDateString()}
SYSTEM STABILITY COEFFICIENT: 99.9%
TOTAL COMPILED ACCOUNTS: ${usersList.length}
------------------------------------------------------
REGISTERED USERS DATABASE INDEX:
${usersList.map(u => `- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`).join('\n')}
------------------------------------------------------
PLATFORM AUDIT LOG RECORDS:
${auditLogs.map(l => `- [${l.time}] MODULE: ${l.module} - MESSAGE: ${l.msg} [${l.status.toUpperCase()}]`).join('\n')}
------------------------------------------------------
END OF FILE BACKUP.`;

        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WakeWiseAdmin-SystemAuditBackup.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Toast.show('Backup Complete', 'The ledger text backup file was downloaded.', 'success', 2500);
    }, 1500);
};

// 7. Initial startup
async function initAdminPanel() {
    if (typeof updateHeaderUserInfo === 'function') updateHeaderUserInfo();
    await renderUsers();
    renderLogs();
    initCharts();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
    initAdminPanel();
}
