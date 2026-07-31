/* ==========================================================================
   INTELLIGENT COGNITIVE ALARM PLATFORM - WELLNESS COACH CONTROLLER
   ========================================================================== */

// 1. Data Stores
let patientsNeedingHelp = [
    { name: 'Tony Stark', drop: '-18% Habit Score', sleepAvg: '5.2 Hours', status: 'Irregular' },
    { name: 'Steve Rogers', drop: '-10% Wake Streak', sleepAvg: '6.1 Hours', status: 'Attention Required' }
];

let patientReports = [
    { id: 'PAT-101', name: 'Alex Mercer', target: '07:30 AM', inertia: 'Low', status: 'Consistent', advice: 'Hydration is key. Log water!' },
    { id: 'PAT-102', name: 'Tony Stark', target: '06:00 AM', inertia: 'High', status: 'Irregular', advice: 'Minimize pre-sleep screen access' },
    { id: 'PAT-103', name: 'Steve Rogers', target: '05:30 AM', inertia: 'Medium', status: 'Stable', advice: 'Continue morning meditation routines' }
];

let recommendationLogs = JSON.parse(localStorage.getItem('coach_recommendations')) || [
    { date: 'Today, 09:30 AM', patient: 'Alex Mercer', notes: 'Maintain wake schedule on weekends to secure consistency index.', status: 'Delivered' },
    { date: 'Yesterday, 14:15 PM', patient: 'Tony Stark', notes: 'Reduce screen blue-light levels or configure WakeWise AI Math lock.', status: 'Delivered' }
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

// 3. Render Dashboard Metric Cards & Tables
function renderHelpList() {
    const tbody = document.getElementById('help-table-body');
    if (tbody) {
        tbody.innerHTML = '';
        patientsNeedingHelp.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-danger">${p.drop}</span></td>
                <td><i class="fas fa-bed text-muted"></i> ${p.sleepAvg}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="openRecommendationFor('${p.name}')">
                        Intervene
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function renderPatientReports() {
    const tbody = document.getElementById('all-reports-table')?.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = '';
        patientReports.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${r.id}</code></td>
                <td><strong>${r.name}</strong></td>
                <td>${r.target}</td>
                <td><span class="badge ${r.inertia === 'Low' ? 'badge-success' : (r.inertia === 'Medium' ? 'badge-warning' : 'badge-danger')}">${r.inertia}</span></td>
                <td><span class="badge ${r.status === 'Consistent' ? 'badge-success' : (r.status === 'Stable' ? 'badge-info' : 'badge-danger')}">${r.status}</span></td>
                <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${r.advice}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function renderMessageLogs() {
    const tbody = document.getElementById('messages-table')?.querySelector('tbody');
    if (tbody) {
        localStorage.setItem('coach_recommendations', JSON.stringify(recommendationLogs));
        tbody.innerHTML = '';
        recommendationLogs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-size:0.8rem; color:var(--text-muted);">${l.date}</span></td>
                <td><strong>${l.patient}</strong></td>
                <td style="font-size:0.85rem; color:var(--text-secondary);">${l.notes}</td>
                <td><span class="badge badge-success"><i class="fas fa-check-double" style="margin-right:4px;"></i> ${l.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Intervene button triggers recommendation modal with prefilled patient
window.openRecommendationFor = (patientName) => {
    const selectModal = document.getElementById('modal-rec-patient');
    if (selectModal) {
        selectModal.value = patientName;
    }
    Modal.open('recommendation-modal');
};

// 4. Recommendation Submissions (Modal and Direct Tab Forms)
const directForm = document.getElementById('recommendation-form-direct');
if (directForm) {
    directForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const patient = document.getElementById('rec-patient').value;
        const notes = document.getElementById('rec-text').value;
        submitRecommendation(patient, notes);
        directForm.reset();
    });
}

const modalForm = document.getElementById('recommendation-form-modal');
if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const patient = document.getElementById('modal-rec-patient').value;
        const notes = document.getElementById('modal-rec-text').value;
        submitRecommendation(patient, notes);
        Modal.close('recommendation-modal');
        modalForm.reset();
    });
}

function submitRecommendation(patient, notes) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
    
    // Add to logs
    recommendationLogs.unshift({
        date: timestamp,
        patient: patient,
        notes: notes,
        status: 'Delivered'
    });

    // Update patient reports mock data if found
    const reportIndex = patientReports.findIndex(r => r.name === patient);
    if (reportIndex !== -1) {
        patientReports[reportIndex].advice = notes;
    }

    renderPatientReports();
    renderMessageLogs();
    
    Toast.show('Advice Transmitted', `Successfully delivered advice recommendations to ${patient}.`, 'success', 3000);
}

// 5. Chart.js Configurations
let coachProgressChart, coachTrendsChart, coachHabitsChart;

function initCharts() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ca3af' : '#62627a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.08)';

    // Weekly Progress Chart
    const progressCtx = document.getElementById('coachProgressChart');
    if (progressCtx) {
        coachProgressChart = new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                datasets: [
                    {
                        label: 'Alex Mercer',
                        data: [70, 75, 82, 85, 88],
                        borderColor: '#6366f1',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'Tony Stark',
                        data: [90, 85, 78, 65, 52],
                        borderColor: '#ef4444',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'Steve Rogers',
                        data: [80, 81, 82, 78, 70],
                        borderColor: '#3b82f6',
                        fill: false,
                        tension: 0.3
                    }
                ]
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

    // Sleep Trends Chart
    const trendsCtx = document.getElementById('coachTrendsChart');
    if (trendsCtx) {
        coachTrendsChart = new Chart(trendsCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                datasets: [{
                    label: 'Avg Sleep Efficiency (%)',
                    data: [72, 75, 78, 80, 82],
                    backgroundColor: 'rgba(59, 130, 246, 0.65)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
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
                    y: { grid: { color: gridColor }, ticks: { color: textColor }, min: 50, max: 100 }
                }
            }
        });
    }

    // Habit success rates
    const habitsCtx = document.getElementById('coachHabitsChart');
    if (habitsCtx) {
        coachHabitsChart = new Chart(habitsCtx, {
            type: 'radar',
            data: {
                labels: ['Math Formula Wakeup', 'Precision Tap Wakeup', 'Hydration logs', 'Mindfulness logs', 'Screen logs'],
                datasets: [{
                    label: 'Success Rate (%)',
                    data: [92, 85, 74, 68, 62],
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    pointBackgroundColor: '#ec4899'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    r: {
                        grid: { color: gridColor },
                        pointLabels: { color: textColor },
                        ticks: { display: false }
                    }
                }
            }
        });
    }
}

// Watch theme toggles
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTimeout(() => {
        if (coachProgressChart) coachProgressChart.destroy();
        if (coachTrendsChart) coachTrendsChart.destroy();
        if (coachHabitsChart) coachHabitsChart.destroy();
        initCharts();
    }, 100);
});
document.querySelector('.nav-toggle-theme')?.addEventListener('click', () => {
    setTimeout(() => {
        if (coachProgressChart) coachProgressChart.destroy();
        if (coachTrendsChart) coachTrendsChart.destroy();
        if (coachHabitsChart) coachHabitsChart.destroy();
        initCharts();
    }, 100);
});

// 6. Generate Mock PDF/Text Report for Coach
window.simulateCoachReport = () => {
    Toast.show('Assembling Report...', 'Compiling patient stats and diagnostic trends.', 'info', 2000);
    setTimeout(() => {
        const text = `WAKEWISE AI - COACH DIAGNOSTIC REPORT
------------------------------------------------------
COACH: Dr. Sarah Jenkins
DATE: ${new Date().toLocaleDateString()}
ACTIVE PATIENT COUNT: 124
AGGREGATED HABIT QUALITY SCORE: 82%
AVERAGE PATIENT SLEEP CAPACITY: 7.4 Hours
WEEKLY EFFICIENCY DIFFERENTIAL: +12%
------------------------------------------------------
ALERT PATIENTS:
1. Tony Stark: -18% Habit Score, sleep index 5.2 Hrs (Irregular)
2. Steve Rogers: -10% Wake streak, sleep index 6.1 Hrs (Attention Required)
------------------------------------------------------
COMPILED RECOMMENDATIONS BROADCASTED TODAY:
${recommendationLogs.map(l => `- [${l.date}] To ${l.patient}: "${l.notes}"`).join('\n')}
------------------------------------------------------
Report generated automatically by WakeWise Coach analytics.`;

        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WakeWiseCoach-Jenkins-Report.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Toast.show('Report Downloaded', 'The text analytics file was compiled and saved.', 'success', 2500);
    }, 1500);
};

// 7. Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    renderHelpList();
    renderPatientReports();
    renderMessageLogs();
});
