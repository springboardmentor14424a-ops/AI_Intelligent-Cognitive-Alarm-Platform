// SPA and Modal Utility functions

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Show temporary toast message
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'glass-panel';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.borderLeft = `4px solid var(--${type})`;
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.fontSize = '13px';
  toast.style.color = '#fff';
  toast.style.background = '#101524';
  toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
  toast.style.animation = 'slideIn 0.3s ease-out';
  
  toast.innerHTML = `
    <span style="color: var(--${type}); font-weight: bold;">
      ${type === 'success' ? '✓' : type === 'danger' ? '✕' : '⚠'}
    </span>
    <div>${message}</div>
  `;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Inline CSS for Toast Animations
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  #toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 9999;
  }
`;
document.head.appendChild(style);

// Add toast container to body on load
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
});
