/* ==========================================================================
   INTELLIGENT COGNITIVE ALARM PLATFORM - FASTAPI & DATABASE AUTH CONTROLLER
   ========================================================================== */

// Determine API Base URL dynamically
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) {
        // If served from FastAPI on port 8000, use relative same-origin calls
        if (window.location.port === '8000') {
            return '';
        }
        // If served from static dev port (e.g. 5500 or Live Server), use explicit localhost:8000
        return 'http://localhost:8000';
    }
    return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Validates session and roles to prevent unauthorized dashboard navigation
 * @param {string} requiredRole ('user' | 'coach' | 'admin')
 */
function protectPage(requiredRole) {
    const sessionUser = JSON.parse(localStorage.getItem('sessionUser'));

    if (!sessionUser || !sessionUser.accessToken) {
        // No active session or missing token, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    const userRole = (sessionUser.role || '').toLowerCase();
    const targetRole = (requiredRole || '').toLowerCase();

    if (userRole !== targetRole) {
        // User role does not match page requirements, redirect to correct dashboard
        if (userRole === 'user') {
            window.location.href = 'dashboard-user.html';
        } else if (userRole === 'coach') {
            window.location.href = 'dashboard-coach.html';
        } else if (userRole === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else {
            window.location.href = 'login.html';
        }
    }
}

/**
 * Login User via FastAPI & Database Backend API
 * Endpoint: POST /api/auth/login
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, user?: object, token?: string, message: string}>}
 */
async function attemptLoginAsync(email, password) {
    try {
        const endpoint = `${API_BASE_URL}/api/auth/login`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email.trim().toLowerCase(),
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { 
                success: false, 
                message: data.detail || 'Invalid email or password.' 
            };
        }

        const user = data.user;
        // Store authenticated session token and user info from Database
        localStorage.setItem('sessionUser', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.toLowerCase(),
            accessToken: data.access_token,
            loggedInAt: new Date().toISOString()
        }));

        return { 
            success: true, 
            user: user, 
            token: data.access_token,
            message: `Logged in successfully as ${user.name}!` 
        };
    } catch (error) {
        console.error('Database API Login Error:', error);
        return { 
            success: false, 
            message: `Could not connect to backend endpoint (${API_BASE_URL || window.location.origin}/api/auth/login). Verify backend server is running.` 
        };
    }
}

/**
 * Register User via FastAPI & Database Backend API
 * Endpoint: POST /api/auth/register
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @param {string} role ('USER' | 'Wellness Coach' | 'Administrator')
 * @param {string} provider ('LOCAL' | 'GOOGLE')
 * @returns {Promise<{success: boolean, data?: object, message: string}>}
 */
async function registerUserAsync(name, email, password, role = 'USER', provider = 'LOCAL') {
    try {
        const endpoint = `${API_BASE_URL}/api/auth/register`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: password,
                role: role.toUpperCase(),
                provider: provider
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { 
                success: false, 
                message: data.detail || 'Registration failed.' 
            };
        }

        return { 
            success: true, 
            data: data.data, 
            message: data.message || 'User registered in Database successfully!' 
        };
    } catch (error) {
        console.error('Database API Registration Error:', error);
        return { 
            success: false, 
            message: `Could not connect to backend endpoint (${API_BASE_URL || window.location.origin}/api/auth/register). Verify backend server is running.` 
        };
    }
}

/**
 * Trigger logout and clean session data
 */
function logout() {
    localStorage.removeItem('sessionUser');
    window.location.href = 'login.html';
}

// Bind Logout modal & action trigger on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const addLogoutModal = () => {
        if (document.getElementById('logout-modal')) return;
        
        const logoutModalHTML = `
            <div id="logout-modal" class="modal-overlay">
                <div class="modal-container" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Confirm Logout</h3>
                        <button class="modal-close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to end your current dashboard session?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                        <button id="confirm-logout-btn" class="btn btn-danger">Logout</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', logoutModalHTML);
        
        const confirmBtn = document.getElementById('confirm-logout-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                logout();
            });
        }

        const closeBtn = document.querySelector('#logout-modal .modal-close-btn');
        const cancelBtn = document.querySelector('#logout-modal .modal-cancel-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => Modal.close('logout-modal'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => Modal.close('logout-modal'));
    };

    const logoutTriggers = document.querySelectorAll('.logout-trigger, #logout-btn');
    if (logoutTriggers.length > 0) {
        addLogoutModal();
        logoutTriggers.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof Modal !== 'undefined') {
                    Modal.open('logout-modal');
                } else {
                    if (confirm("Are you sure you want to logout?")) logout();
                }
            });
        });
    }
});
