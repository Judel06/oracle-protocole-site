/* =========================================================
   ORACLE — Protocole et Services | Interactions
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initScrollReveal();
  initCounters();
  initPortfolioFilter();
  initContactForm();
  initActiveNav();
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

/* Formulaire de contact / demande de devis (validation cote client) */
function initContactForm() {
  const form = document.getElementById('quoteForm');
  if (!form) return;
  const status = document.getElementById('formStatus');

  const showError = (field, message) => {
    const wrap = field.closest('.field');
    wrap.classList.add('invalid');
    const errorEl = wrap.querySelector('.field-error');
    if (errorEl) errorEl.textContent = message;
  };
  const clearError = (field) => {
    field.closest('.field').classList.remove('invalid');
  };

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => clearError(field));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      clearError(field);
      if (!field.value.trim()) {
        showError(field, 'Ce champ est requis.');
        valid = false;
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        showError(field, 'Veuillez entrer une adresse email valide.');
        valid = false;
      }
    });

    status.classList.remove('show', 'success', 'error');

    if (!valid) {
      status.textContent = 'Veuillez corriger les champs indiqués ci-dessous.';
      status.classList.add('show', 'error');
      return;
    }

    /* Pas de backend connecte : simulation de confirmation cote client.
       A brancher sur un service d'envoi (email, API) lors de la mise en production. */
    status.textContent = 'Merci. Votre demande a bien ete enregistree — notre equipe vous recontactera sous 48h.';
    status.classList.add('show', 'success');
    form.reset();
  });
}
