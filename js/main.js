// ============================================================
//  CogniAlarm AI  —  Landing Page Script
// ============================================================

// Smooth navigation helper used by role cards
function navigateTo(page) {
  window.location.href = page;
}

// ── Navbar background on scroll ──────────────────────────────
(function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  function updateNavbar() {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(255, 255, 255, 0.96)';
      navbar.style.boxShadow  = '0 2px 16px rgba(10, 70, 140, 0.10)';
    } else {
      navbar.style.background = 'rgba(255, 255, 255, 0.85)';
      navbar.style.boxShadow  = 'none';
    }
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
})();


// ── Scroll-reveal animations ──────────────────────────────────
(function initReveal() {
  const targets = document.querySelectorAll(
    '.pill, .role-card, .step-card, .feature-card'
  );

  if (!targets.length) return;

  // Set initial state
  targets.forEach((el) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(22px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity   = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
})();


// ── Stagger pills on hero load ────────────────────────────────
(function staggerHeroPills() {
  const pills = document.querySelectorAll('.pill');
  pills.forEach((pill, i) => {
    pill.style.transitionDelay = `${0.1 + i * 0.1}s`;
  });
})();


// ── Active nav link highlight on scroll ──────────────────────
(function initActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');

  if (!sections.length || !links.length) return;

  function onScroll() {
    let current = '';
    sections.forEach((sec) => {
      const top = sec.offsetTop - 90;
      if (window.scrollY >= top) current = sec.getAttribute('id');
    });

    links.forEach((link) => {
      link.classList.remove('active-link');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active-link');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();
