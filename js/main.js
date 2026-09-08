/* =========================================================
   ORACLE — Protocole et Services | Interactions
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initScrollReveal();
  initCounters();
  initPortfolioFilter();
  initActiveNav();
  initHeroParallax();
});

/* Header : fond transparent -> glassmorphism navy au scroll */
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const hasHero = header.dataset.hero === 'true';

  const applyState = () => {
    if (!hasHero || window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  applyState();
  window.addEventListener('scroll', applyState, { passive: true });
}

/* Navigation mobile plein écran */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* Surbrillance du lien de navigation actif */
function initActiveNav() {
  const current = document.body.dataset.page;
  if (!current) return;
  document.querySelectorAll('.nav-link, .footer-col a').forEach(link => {
    if (link.dataset.nav === current) link.classList.add('active');
  });
}

/* Apparition progressive au scroll (fade-in / slide-up) */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  items.forEach(el => observer.observe(el));
}

/* Compteurs animés (chiffres clés) */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* Filtre de la grille Portfolio */
function initPortfolioFilter() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.portfolio-card');
  if (!buttons.length || !cards.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.style.display = match ? '' : 'none';
      });
    });
  });
}

/* Effet parallax leger sur les images de hero (accueil + pages internes) */
function initHeroParallax() {
  const images = document.querySelectorAll('.hero-media img');
  if (!images.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const update = () => {
    images.forEach((img) => {
      const section = img.closest('.hero, .page-hero');
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const baseScale = section.classList.contains('page-hero') ? 1.04 : 1.08;
      const offset = rect.top * -0.12;
      img.style.transform = `scale(${baseScale}) translateY(${offset}px)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
}

/* Les formulaires (devis, inscription formation, contact general) sont geres
   par js/forms.js, connecte a Supabase. */
