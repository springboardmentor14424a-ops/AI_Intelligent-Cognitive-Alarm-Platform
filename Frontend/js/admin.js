const API = API_BASE;
const authToken = localStorage.getItem("token");

const authHeaders = {
    "Authorization": `Bearer ${authToken}`
};


// ========================================
// LOAD ADMIN USERS
// ========================================
let currentAdminFilter = "all";

async function loadAdminUsers(filter = currentAdminFilter) {

    try {

        const response = await fetch(
    `${API}/admin/users`,
    {
        headers: authHeaders
    }
);
        const data = await response.json();

        console.log("Admin users:", data);

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to load users");
        }

        const users = data.users || [];

        const filteredUsers =
    filter === "all"
        ? users
        : users.filter(user => user.role === filter);


        // ========================================
        // TOTAL USERS
        // ========================================
        const totalUsers = document.getElementById("totalUsers");

        if (totalUsers) {
            totalUsers.innerText =
                users.filter(user => user.role === "user").length;
        }


        // ========================================
        // TOTAL COACHES
        // ========================================
        const totalCoaches = document.getElementById("totalCoaches");

        if (totalCoaches) {
            totalCoaches.innerText =
                users.filter(user => user.role === "coach").length;
        }


        // ========================================
        // USER TABLE
        // ========================================
        const table =
            document.getElementById("userManagementTable");

        if (!table) return;


        table.innerHTML = `
            <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        `;


        filteredUsers.forEach(user => {

            const isBlocked = user.status === "blocked";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.name || "Unknown"}</td>

                <td>${user.email || "—"}</td>

                <td>
                    ${user.role || "user"}
                </td>

                <td>
                    <span class="${isBlocked ? "badge-red" : "badge-green"}">
                        ${isBlocked ? "Blocked" : "Active"}
                    </span>
                </td>

                <td>

                    <button
                        type="button"
                        onclick="toggleUserStatus(${user.id}, '${user.status}')"
                    >
                        ${isBlocked ? "Unblock" : "Block"}
                    </button>

                </td>
            `;

            table.appendChild(row);
        });


    } catch (error) {

        console.error("Admin user loading error:", error);

    }
}



// ========================================
// BLOCK / UNBLOCK USER
// ========================================
async function toggleUserStatus(userId, currentStatus) {

    const newStatus =
        currentStatus === "blocked"
            ? "active"
            : "blocked";


    const actionText =
        newStatus === "blocked"
            ? "block"
            : "unblock";


    const confirmed = confirm(
        `Are you sure you want to ${actionText} this user?`
    );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
    `${API}/admin/users/${userId}/status`,
    {
        method: "PATCH",

        headers: {
            "Content-Type": "application/json",
            ...authHeaders
        },

        body: JSON.stringify({
            status: newStatus
        })
    }
);


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message || "Failed to update user status"
            );

        }


        alert(data.message);


        // Refresh table
        loadAdminUsers();


    } catch (error) {

        console.error("Status update error:", error);

        alert(
            error.message ||
            "Failed to update user status"
        );

    }
}

// ========================================
// LOAD PLATFORM ANALYTICS
// ========================================
async function loadPlatformAnalytics() {

    try {

        const response = await fetch(
    `${API}/admin/analytics`,
    {
        headers: authHeaders
    }
);

        const data = await response.json();

        console.log(
            "Platform analytics:",
            data
        );

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load platform analytics"
            );
        }


        // ========================================
        // OVERVIEW CARDS
        // ========================================

        const aiAccuracy =
            document.getElementById(
                "adminAIAccuracy"
            );

        if (aiAccuracy) {
            aiAccuracy.innerText =
                `${data.challenges.challengeAccuracy}%`;
        }


        const platformHealth =
            document.getElementById(
                "adminPlatformHealth"
            );

        if (platformHealth) {
            platformHealth.innerText =
                `${data.platformHealth}%`;
        }


        const todaysAlarms =
            document.getElementById(
                "adminTodaysAlarms"
            );

        if (todaysAlarms) {
            todaysAlarms.innerText =
                data.alarms.todaysAlarms;
        }


        const wakefulness =
            document.getElementById(
                "adminWakefulness"
            );

        if (wakefulness) {
            wakefulness.innerText =
                `${data.alarms.averageWakefulness}/10`;
        }


        // ========================================
        // PLATFORM ANALYTICS
        // ========================================

        const activeUsers =
            document.getElementById(
                "adminActiveAccounts"
            );

        if (activeUsers) {
            activeUsers.innerText =
                data.users.activeAccounts;
        }


        const challengeAccuracy =
            document.getElementById(
                "adminChallengeAccuracy"
            );

        if (challengeAccuracy) {
            challengeAccuracy.innerText =
                `${data.challenges.challengeAccuracy}%`;
        }


        const alarmSuccess =
            document.getElementById(
                "adminAlarmSuccess"
            );

        if (alarmSuccess) {
            alarmSuccess.innerText =
                `${data.alarms.alarmSuccessRate}%`;
        }


        const averageWakefulness =
            document.getElementById(
                "adminAverageWakefulness"
            );

        if (averageWakefulness) {
            averageWakefulness.innerText =
                `${data.alarms.averageWakefulness}/10`;
        }


        const snoozeRate =
            document.getElementById(
                "adminSnoozeRate"
            );

        if (snoozeRate) {
            snoozeRate.innerText =
                `${data.alarms.snoozeRate}%`;
        }

    } catch (error) {

        console.error(
            "Platform analytics loading error:",
            error
        );
    }
}

// ========================================
// LOAD RECOMMENDATION MONITORING
// ========================================
async function loadRecommendationMonitoring() {

    try {

        const response = await fetch(
    `${API}/admin/recommendations-monitoring`,
    {
        headers: authHeaders
    }
);
        const data = await response.json();

        console.log(
            "Recommendation monitoring:",
            data
        );

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to load recommendation monitoring"
            );
        }


        // ========================================
        // SUMMARY
        // ========================================

        const users =
            document.getElementById(
                "recommendationUsers"
            );

        if (users) {
            users.innerText =
                data.summary.usersMonitored;
        }


        const total =
            document.getElementById(
                "totalRecommendations"
            );

        if (total) {
            total.innerText =
                data.summary.totalRecommendations;
        }


        const high =
            document.getElementById(
                "highPriorityRecommendations"
            );

        if (high) {
            high.innerText =
                data.summary.highPriority;
        }


        const medium =
            document.getElementById(
                "mediumPriorityRecommendations"
            );

        if (medium) {
            medium.innerText =
                data.summary.mediumPriority;
        }


        const low =
            document.getElementById(
                "lowPriorityRecommendations"
            );

        if (low) {
            low.innerText =
                data.summary.lowPriority;
        }


        // ========================================
        // USER TABLE
        // ========================================

        const table =
            document.getElementById(
                "recommendationMonitoringTable"
            );

        if (!table) return;


        table.innerHTML = `
            <tr>
                <th>User</th>
                <th>Habit Score</th>
                <th>Recommendations</th>
                <th>Priority</th>
                <th>Focus Areas</th>
            </tr>
        `;


        data.users.forEach(user => {

            const priorityClass =
                user.priority === "High"
                    ? "badge-red"
                    : user.priority === "Medium"
                        ? "badge-yellow"
                        : "badge-green";


            const focusAreas =
                user.recommendations.length > 0
                    ? user.recommendations.join(", ")
                    : "No improvement needed";


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${user.name}
                </td>

                <td>
                    ${user.habitScore}%
                </td>

                <td>
                    ${user.recommendationCount}
                </td>

                <td>
                    <span class="${priorityClass}">
                        ${user.priority}
                    </span>
                </td>

                <td>
                    ${focusAreas}
                </td>

            `;


            table.appendChild(row);

        });

    }
    catch (error) {

        console.error(
            "Recommendation monitoring error:",
            error
        );

    }
}

// ========================================
// LOAD SYSTEM REPORT
// ========================================
async function loadSystemReport() {

    try {

        const response = await fetch(
    `${API}/admin/system-report`,
    {
        headers: authHeaders
    }
);
        const data = await response.json();

        console.log(
            "System report:",
            data
        );

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to load system report"
            );

        }


        // ========================================
        // SYSTEM STATUS
        // ========================================

        const databaseStatus =
            document.getElementById(
                "systemDatabaseStatus"
            );

        if (databaseStatus) {

            databaseStatus.innerHTML =
                `<span class="badge-green">
                    ${data.system.database}
                </span>`;

        }


        const serverStatus =
            document.getElementById(
                "systemServerStatus"
            );

        if (serverStatus) {

            serverStatus.innerHTML =
                `<span class="badge-green">
                    ${data.system.server}
                </span>`;

        }


        const uptime =
            document.getElementById(
                "systemUptime"
            );

        if (uptime) {

            uptime.innerText =
                data.system.uptime;

        }


        // ========================================
        // USER STATISTICS
        // ========================================

        document.getElementById(
            "systemTotalUsers"
        ).innerText =
            Number(data.users.total_users) || 0;


        document.getElementById(
            "systemActiveUsers"
        ).innerText =
            Number(data.users.active_users) || 0;


        document.getElementById(
            "systemBlockedUsers"
        ).innerText =
            Number(data.users.blocked_users) || 0;


        // ========================================
        // BEHAVIOR STATISTICS
        // ========================================

        document.getElementById(
            "systemTotalEvents"
        ).innerText =
            Number(data.behavior.total_events) || 0;


        document.getElementById(
            "systemTotalAlarms"
        ).innerText =
            Number(data.behavior.alarms) || 0;


        document.getElementById(
            "systemTotalWakeups"
        ).innerText =
            Number(data.behavior.wakeups) || 0;


        // ========================================
        // CHALLENGE STATISTICS
        // ========================================

        document.getElementById(
            "systemTotalChallenges"
        ).innerText =
            Number(data.challenges.total_attempts) || 0;


        // ========================================
        // REPORT TIME
        // ========================================

        const reportTime =
            document.getElementById(
                "systemReportTime"
            );

        if (reportTime) {

            reportTime.innerText =
                new Date(
                    data.generatedAt
                ).toLocaleString();

        }


        // ========================================
        // RECENT ACTIVITY TABLE
        // ========================================

        const activityTable =
            document.getElementById(
                "systemActivityTable"
            );

        if (!activityTable) return;


        activityTable.innerHTML = `
            <tr>
                <th>Time</th>
                <th>User ID</th>
                <th>Activity</th>
            </tr>
        `;


        data.recentActivity.forEach(
            activity => {

                const row =
                    document.createElement("tr");

                const formattedTime =
                    new Date(
                        activity.event_time
                    ).toLocaleString();


                row.innerHTML = `
                    <td>
                        ${formattedTime}
                    </td>

                    <td>
                        ${activity.user_id}
                    </td>

                    <td>
                        ${formatEventName(
                            activity.event_type
                        )}
                    </td>
                `;


                activityTable.appendChild(row);

            }
        );

    }
    catch (error) {

        console.error(
            "System report loading error:",
            error
        );

    }
}


// ========================================
// FORMAT EVENT NAME
// ========================================
function formatEventName(eventType) {

    const names = {

        alarm_ring:
            "Alarm Ringed",

        verification_started:
            "Wake-up Verification Started",

        snooze:
            "Alarm Snoozed",

        wake_verified:
            "Wake-up Verified",

        alarm_dismiss:
            "Alarm Dismissed",

        snooze_attempt_blocked:
            "Snooze Attempt Blocked"

    };


    return (
        names[eventType] ||
        eventType
    );

}

// ========================================
// OPEN ADD ACCOUNT MODAL
// ========================================
function openAddAccountModal() {

    const modal =
        document.getElementById(
            "addAccountModal"
        );

    if (modal) {
        modal.classList.add("show");
    }

}


// ========================================
// CLOSE ADD ACCOUNT MODAL
// ========================================
function closeAddAccountModal() {

    const modal =
        document.getElementById(
            "addAccountModal"
        );

    if (modal) {
        modal.classList.remove("show");
    }

}


// ========================================
// CREATE USER / COACH
// ========================================
async function createAdminAccount(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "newAccountName"
        ).value.trim();


    const email =
        document.getElementById(
            "newAccountEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "newAccountPassword"
        ).value;


    const role =
        document.getElementById(
            "newAccountRole"
        ).value;


    try {

        const response = await fetch(
    `${API}/admin/users`,
    {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            ...authHeaders
        },

        body: JSON.stringify({
            name,
            email,
            password,
            role
        })
    }
);


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to create account"
            );

        }


        alert(data.message);


        // Reset form
        document.getElementById(
            "addAccountForm"
        ).reset();


        // Close modal
        closeAddAccountModal();


        // Reload users and dashboard numbers
        await loadAdminUsers();

        await loadPlatformAnalytics();

        await loadSystemReport();


    }
    catch (error) {

        console.error(
            "Create account error:",
            error
        );

        alert(
            error.message ||
            "Failed to create account"
        );

    }

}

// ========================================
// ADMIN USER SEARCH
// ========================================
function setupAdminSearch() {

    const search =
        document.getElementById(
            "adminSearch"
        );


    if (!search) return;


    search.addEventListener(
        "input",
        function () {

            const searchText =
                this.value
                    .toLowerCase()
                    .trim();


            const table =
                document.getElementById(
                    "userManagementTable"
                );


            if (!table) return;


            const rows =
                table.querySelectorAll(
                    "tr"
                );


            rows.forEach(
                (row, index) => {

                    // Keep header visible
                    if (index === 0) {
                        row.style.display = "";
                        return;
                    }


                    const text =
                        row.innerText
                            .toLowerCase();


                    row.style.display =
                        text.includes(searchText)
                            ? ""
                            : "none";

                }
            );

        }
    );

}

// ========================================
// ADMIN USERS / COACHES FILTER
// ========================================
function showAdminAccounts(filter) {

    currentAdminFilter = filter;

    loadAdminUsers(filter);

    const section = document.getElementById("adminUsersSection");

    if (section) {
        section.scrollIntoView({
            behavior: "smooth"
        });
    }
}

// ========================================
// SAVE ADMIN SETTINGS
// ========================================
function saveAdminSettings() {

    const settings = {
        adminName: document.getElementById("adminName").value,
        adminEmail: document.getElementById("adminEmail").value,

        aiMonitoring:
            document.getElementById("aiMonitoring").checked,

        alarmSystem:
            document.getElementById("alarmSystem").checked,

        wakefulnessDetection:
            document.getElementById("wakefulnessDetection").checked,

        allowUserRegistration:
            document.getElementById("allowUserRegistration").checked,

        allowCoachRegistration:
            document.getElementById("allowCoachRegistration").checked,

        sessionTimeout:
            document.getElementById("sessionTimeout").value,

        loginProtection:
            document.getElementById("loginProtection").checked
    };

    localStorage.setItem(
        "adminSettings",
        JSON.stringify(settings)
    );

    const message =
        document.getElementById("settingsMessage");

    if (message) {
        message.innerText = "Settings saved successfully!";
        message.style.marginTop = "15px";
    }
}

// ========================================
// LOAD SAVED ADMIN SETTINGS
// ========================================
function loadAdminSettings() {

    const saved =
        localStorage.getItem("adminSettings");

    if (!saved) return;

    const settings = JSON.parse(saved);

    document.getElementById("adminName").value =
        settings.adminName || "System Admin";

    document.getElementById("adminEmail").value =
        settings.adminEmail || "admin@cognitivealarm.com";

    document.getElementById("aiMonitoring").checked =
        settings.aiMonitoring;

    document.getElementById("alarmSystem").checked =
        settings.alarmSystem;

    document.getElementById("wakefulnessDetection").checked =
        settings.wakefulnessDetection;

    document.getElementById("allowUserRegistration").checked =
        settings.allowUserRegistration;

    document.getElementById("allowCoachRegistration").checked =
        settings.allowCoachRegistration;

    document.getElementById("sessionTimeout").value =
        settings.sessionTimeout || "60";

    document.getElementById("loginProtection").checked =
        settings.loginProtection;
}

// ========================================
// ADMIN LOGOUT
// ========================================
function adminLogout() {

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");

    window.location.href = "login.html";
}

// ================= PLATFORM ANNOUNCEMENT =================

const sendAnnouncementBtn =
    document.getElementById("sendAnnouncementBtn");

if (sendAnnouncementBtn) {

    sendAnnouncementBtn.addEventListener(
        "click",
        async () => {

            const title =
                document
                    .getElementById("announcementTitle")
                    .value
                    .trim();

            const message =
                document
                    .getElementById("announcementMessage")
                    .value
                    .trim();

            const status =
                document.getElementById(
                    "announcementStatus"
                );

            if (!title || !message) {

                status.textContent =
                    "Please enter both title and message.";

                return;
            }

            const token =
                localStorage.getItem("token");

            if (!token) {

                status.textContent =
                    "Admin login required.";

                return;
            }

            try {

                status.textContent =
                    "Sending announcement...";

                const response = await fetch(
    `${API_BASE}/notifications/announcement`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            title: title,
                            message: message
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message ||
                        "Failed to send announcement"
                    );
                }

                status.textContent =
                    `✅ Announcement sent to ${data.usersNotified} users.`;

                document.getElementById(
                    "announcementTitle"
                ).value = "";

                document.getElementById(
                    "announcementMessage"
                ).value = "";

            } catch (error) {

                console.error(
                    "Announcement error:",
                    error
                );

                status.textContent =
                    `❌ ${error.message}`;
            }
        }
    );
}

// =====================================================
// MODULE 12 - REPORTS
// =====================================================

async function loadAdminReports() {

    try {

        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API}/admin/reports`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Failed to load reports"
            );
        }

        // ---------------------------------------------
        // HABIT REPORT
        // ---------------------------------------------

        document.getElementById("habitReportValue").textContent =
            `${data.habitReport.wakeUpRate}% Wake-up Rate`;


        // ---------------------------------------------
        // WAKE-UP REPORT
        // ---------------------------------------------

        document.getElementById("wakeupReportValue").textContent =
            `${data.wakeupReport.verified} Verified Wake-ups`;


        // ---------------------------------------------
        // CHALLENGE REPORT
        // ---------------------------------------------

        document.getElementById("challengeReportValue").textContent =
            `${data.challengeReport.accuracy}% Accuracy`;


        // ---------------------------------------------
        // PRODUCTIVITY REPORT
        // ---------------------------------------------

        document.getElementById("productivityReportValue").textContent =
            `${data.productivityReport.productivityScore}% Productivity`;


        // ---------------------------------------------
        // SLEEP REPORT
        // ---------------------------------------------

        document.getElementById("sleepReportValue").textContent =
            `${data.sleepReport.activeSleepDays} Active Sleep Days`;


        console.log(
            "📊 Admin reports loaded:",
            data
        );

    } catch (error) {

        console.error(
            "❌ Reports error:",
            error
        );

        const reportElements = [
            "habitReportValue",
            "wakeupReportValue",
            "challengeReportValue",
            "productivityReportValue",
            "sleepReportValue"
        ];

        reportElements.forEach(id => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent =
                    "Unable to load";
            }

        });
    }
}

// =====================================================
// EXPORT REPORTS TO EXCEL
// =====================================================

async function exportReportsToExcel() {

    try {

        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API}/admin/reports`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Failed to load report data"
            );
        }

        // Create Excel rows
        const reportData = [

            ["AI Cognitive Alarm Platform - Reports"],
            [""],

            ["HABIT REPORT"],
            ["Total Alarms", data.habitReport.totalAlarms],
            ["Successful Wake-ups", data.habitReport.successfulWakeups],
            ["Total Snoozes", data.habitReport.totalSnoozes],
            ["Wake-up Rate", `${data.habitReport.wakeUpRate}%`],
            ["Snooze Rate", `${data.habitReport.snoozeRate}%`],
            [""],

            ["WAKE-UP REPORT"],
            ["Alarms", data.wakeupReport.alarms],
            ["Verified Wake-ups", data.wakeupReport.verified],
            ["Snoozes", data.wakeupReport.snoozes],
            ["Average Wakefulness", data.wakeupReport.averageWakefulness],
            [""],

            ["CHALLENGE PERFORMANCE REPORT"],
            ["Total Challenges", data.challengeReport.totalChallenges],
            ["Correct Challenges", data.challengeReport.correctChallenges],
            ["Incorrect Challenges", data.challengeReport.incorrectChallenges],
            ["Accuracy", `${data.challengeReport.accuracy}%`],
            ["Average Score", data.challengeReport.averageScore],
            ["Average Time (seconds)", data.challengeReport.averageTime],
            [""],

            ["PRODUCTIVITY REPORT"],
            ["Total Events", data.productivityReport.totalEvents],
            ["Completed Activities", data.productivityReport.completedActivities],
            ["Productivity Score", `${data.productivityReport.productivityScore}%`],
            [""],

            ["SLEEP ANALYTICS REPORT"],
            ["Sleep-related Records", data.sleepReport.sleepRelatedRecords],
            ["Active Sleep Days", data.sleepReport.activeSleepDays]

        ];

        // Create worksheet
        const worksheet =
            XLSX.utils.aoa_to_sheet(reportData);

        // Set column widths
        worksheet["!cols"] = [
            { wch: 30 },
            { wch: 25 }
        ];

        // Create workbook
        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Reports"
        );

        // Download Excel file
        XLSX.writeFile(
            workbook,
            "AI_Cognitive_Alarm_Reports.xlsx"
        );

        console.log(
            "📊 Excel report exported successfully."
        );

    } catch (error) {

        console.error(
            "❌ Excel export error:",
            error
        );

        alert(
            "Failed to export Excel report."
        );
    }
}


// Connect Excel button
const exportExcelBtn =
    document.getElementById("exportExcelBtn");

if (exportExcelBtn) {

    exportExcelBtn.addEventListener(
        "click",
        exportReportsToExcel
    );

}

// Load reports when Admin Dashboard opens
loadAdminReports();

// =====================================================
// EXPORT REPORTS TO PDF
// =====================================================

async function exportReportsToPDF() {

    try {

        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API}/admin/reports`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Failed to load report data"
            );
        }

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF();

        let y = 20;

        // ---------------------------------------------
        // TITLE
        // ---------------------------------------------

        doc.setFontSize(20);
        doc.setFont(undefined, "bold");

        doc.text(
            "AI Cognitive Alarm Platform",
            20,
            y
        );

        y += 10;

        doc.setFontSize(15);

        doc.text(
            "Reports & Analytics",
            20,
            y
        );

        y += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, "normal");

        doc.text(
            `Generated: ${new Date().toLocaleString()}`,
            20,
            y
        );

        y += 15;


        // ---------------------------------------------
        // HELPER FUNCTION
        // ---------------------------------------------

        function addSection(title, rows) {

            if (y > 260) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, "bold");

            doc.text(
                title,
                20,
                y
            );

            y += 8;

            doc.setFontSize(11);
            doc.setFont(undefined, "normal");

            rows.forEach(row => {

                if (y > 275) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(
                    `${row[0]}: ${row[1]}`,
                    25,
                    y
                );

                y += 7;
            });

            y += 8;
        }


        // ---------------------------------------------
        // HABIT REPORT
        // ---------------------------------------------

        addSection(
            "Habit Report",
            [
                [
                    "Total Alarms",
                    data.habitReport.totalAlarms
                ],
                [
                    "Successful Wake-ups",
                    data.habitReport.successfulWakeups
                ],
                [
                    "Total Snoozes",
                    data.habitReport.totalSnoozes
                ],
                [
                    "Wake-up Rate",
                    `${data.habitReport.wakeUpRate}%`
                ],
                [
                    "Snooze Rate",
                    `${data.habitReport.snoozeRate}%`
                ]
            ]
        );


        // ---------------------------------------------
        // WAKE-UP REPORT
        // ---------------------------------------------

        addSection(
            "Wake-up Report",
            [
                [
                    "Alarms",
                    data.wakeupReport.alarms
                ],
                [
                    "Verified Wake-ups",
                    data.wakeupReport.verified
                ],
                [
                    "Snoozes",
                    data.wakeupReport.snoozes
                ],
                [
                    "Average Wakefulness",
                    data.wakeupReport.averageWakefulness
                ]
            ]
        );


        // ---------------------------------------------
        // CHALLENGE REPORT
        // ---------------------------------------------

        addSection(
            "Challenge Performance Report",
            [
                [
                    "Total Challenges",
                    data.challengeReport.totalChallenges
                ],
                [
                    "Correct Challenges",
                    data.challengeReport.correctChallenges
                ],
                [
                    "Incorrect Challenges",
                    data.challengeReport.incorrectChallenges
                ],
                [
                    "Accuracy",
                    `${data.challengeReport.accuracy}%`
                ],
                [
                    "Average Score",
                    data.challengeReport.averageScore
                ],
                [
                    "Average Time",
                    `${data.challengeReport.averageTime} seconds`
                ]
            ]
        );


        // ---------------------------------------------
        // PRODUCTIVITY REPORT
        // ---------------------------------------------

        addSection(
            "Productivity Report",
            [
                [
                    "Total Events",
                    data.productivityReport.totalEvents
                ],
                [
                    "Completed Activities",
                    data.productivityReport.completedActivities
                ],
                [
                    "Productivity Score",
                    `${data.productivityReport.productivityScore}%`
                ]
            ]
        );


        // ---------------------------------------------
        // SLEEP REPORT
        // ---------------------------------------------

        addSection(
            "Sleep Analytics Report",
            [
                [
                    "Sleep-related Records",
                    data.sleepReport.sleepRelatedRecords
                ],
                [
                    "Active Sleep Days",
                    data.sleepReport.activeSleepDays
                ]
            ]
        );


        // ---------------------------------------------
        // FOOTER
        // ---------------------------------------------

        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, "italic");

        doc.text(
            "Generated by AI Cognitive Alarm Platform",
            20,
            285
        );


        // ---------------------------------------------
        // DOWNLOAD
        // ---------------------------------------------

        doc.save(
            "AI_Cognitive_Alarm_Reports.pdf"
        );

        console.log(
            "📄 PDF report exported successfully."
        );

    } catch (error) {

        console.error(
            "❌ PDF export error:",
            error
        );

        alert(
            "Failed to export PDF report."
        );
    }
}


// Connect PDF button
const exportPdfBtn =
    document.getElementById("exportPdfBtn");

if (exportPdfBtn) {

    exportPdfBtn.addEventListener(
        "click",
        exportReportsToPDF
    );

}

// ========================================
// PAGE LOAD
// ========================================
document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadAdminUsers();

        loadPlatformAnalytics();

        loadRecommendationMonitoring();

        loadSystemReport();

        setupAdminSearch();

        loadAdminSettings();

    }
);