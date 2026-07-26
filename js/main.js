// ── Scroll-reveal for role cards and feature rows ──────────────
(function initReveal() {
  const targets = document.querySelectorAll('.role-card, .feature-list li');
  if (!targets.length) return;

  targets.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = `opacity 0.45s ease ${i * 0.07}s, transform 0.45s ease ${i * 0.07}s`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  targets.forEach((el) => observer.observe(el));
})();
