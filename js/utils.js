/* ==========================================================================
   INTELLIGENT COGNITIVE ALARM PLATFORM - UTILITIES AND INTERFACE CONTROLLER
   ========================================================================== */

// Toast Notifications System
class ToastManager {
    constructor() {
        this.wrapper = document.getElementById('toast-wrapper');
        if (!this.wrapper) {
            this.wrapper = document.createElement('div');
            this.wrapper.id = 'toast-wrapper';
            document.body.appendChild(this.wrapper);
        }
    }

    /**
     * Display a sleek toast reminder
     * @param {string} title 
     * @param {string} message 
     * @param {'success' | 'warning' | 'danger' | 'info'} type 
     * @param {number} duration 
     */
    clearAll() {
        if (!this.wrapper) return;
        const toasts = this.wrapper.querySelectorAll('.toast-message');
        toasts.forEach(t => t.remove());
    }

    show(title, message, type = 'info', duration = 4000) {
        this.clearAll(); // Clear any previous active toast notifications
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        
        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-triangle';
        if (type === 'danger') iconClass = 'fa-exclamation-circle';

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${message}</div>
            </div>
            <div class="toast-close">
                <i class="fas fa-times"></i>
            </div>
        `;

        this.wrapper.appendChild(toast);

        // Force a layout reflow for animation
        toast.offsetHeight;

        // Slide in
        toast.classList.add('show');

        // Setup Close Handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        // Auto Dismiss
        const timeoutId = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        toast.dataset.timeoutId = timeoutId;
    }

    dismiss(toast) {
        if (toast.classList.contains('show')) {
            toast.classList.remove('show');
            clearTimeout(Number(toast.dataset.timeoutId));
            
            // Wait for CSS slide transition to finish before removing
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }
    }
}

// Global Instant of Toast Notifications
const Toast = new ToastManager();

// Core UI Handlers
document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Handler (Light/Dark Mode toggle)
    const initTheme = () => {
        const savedTheme = localStorage.getItem('app-theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeToggles(savedTheme);
    };

    const toggleTheme = () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('app-theme', newTheme);
        updateThemeToggles(newTheme);
        Toast.show('Theme Updated', `Switched to ${newTheme} mode successfully.`, 'info', 2000);
    };

    const updateThemeToggles = (theme) => {
        const themeBtnIcons = document.querySelectorAll('.nav-toggle-theme i, #theme-toggle i');
        themeBtnIcons.forEach(icon => {
            if (theme === 'light') {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
        });
    };

    // Attach theme toggle events
    const themeBtn = document.getElementById('theme-toggle') || document.querySelector('.nav-toggle-theme');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }

    initTheme();

    // 2. Sidebar Collapse Handler
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('sidebar-collapsed');
            
            // Save state
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
        });
        
        // Restore collapse state
        const savedCollapse = localStorage.getItem('sidebar-collapsed');
        if (savedCollapse === 'true') {
            document.body.classList.add('sidebar-collapsed');
        }
    }

    // Mobile Hamburger Menu toggle drawer
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('sidebar-open');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (document.body.classList.contains('sidebar-open')) {
            const sidebar = document.querySelector('.db-sidebar');
            const toggle = document.getElementById('mobile-nav-toggle');
            if (sidebar && !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
                document.body.classList.remove('sidebar-open');
            }
        }
    });

    // 3. Profile Dropdown Toggle
    const profileTrigger = document.getElementById('profile-trigger');
    const dropdownMenu = document.getElementById('profile-dropdown');
    if (profileTrigger && dropdownMenu) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
    }

    // 4. Live Date & Time updates
    const timeDisplay = document.querySelector('.db-time-widget .time');
    const dateDisplay = document.querySelector('.db-time-widget .date');
    if (timeDisplay || dateDisplay) {
        const updateTime = () => {
            const now = new Date();
            if (timeDisplay) {
                timeDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            if (dateDisplay) {
                const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
                dateDisplay.textContent = now.toLocaleDateString('en-US', options);
            }
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    // 5. Dynamic Greeting update based on hour
    const greetingText = document.getElementById('greeting-text');
    if (greetingText) {
        const getGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good Morning';
            if (hour < 18) return 'Good Afternoon';
            return 'Good Evening';
        };
        
        // Fetch current user from localStorage
        const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
        const username = sessionUser.name || 'User';
        greetingText.innerHTML = `${getGreeting()}, <span class="grad-text">${username}</span>!`;
    }

    // 6. Global Loader Mask handler
    const loaderMask = document.getElementById('loader-mask');
    if (loaderMask) {
        // Fade out loader after slight delay
        setTimeout(() => {
            loaderMask.classList.add('hide');
        }, 600);
    }
});

// Custom Modal Controllers
const Modal = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    },
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
};

// Wire up general close modal clicks
document.addEventListener('DOMContentLoaded', () => {
    const closeButtons = document.querySelectorAll('.modal-close-btn, .modal-cancel-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                Modal.close(modal.id);
            }
        });
    });

    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                Modal.close(overlay.id);
            }
        });
    });
});
