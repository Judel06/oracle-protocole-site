/* =========================================================
   SERIN 2027 — Compte a rebours
   Calcule cote client, en JS pur, a partir d'une date cible
   configurable. Fonctionne correctement apres rechargement
   (recalcul en direct a chaque tick, aucun etat a restaurer).
   ========================================================= */

/* Date/heure cible : configurez ici pour une autre edition.
   -05:00 = heure d'Haiti (America/Port-au-Prince), fixe en fevrier
   (pas de changement d'heure d'ete a cette periode). */
const SERIN_START = new Date('2027-02-18T00:00:00-05:00');
const SERIN_END = new Date('2027-02-19T23:59:59-05:00');

function initSerinCountdown() {
  const wrap = document.getElementById('serinCountdown');
  if (!wrap) return;

  const grid = wrap.querySelector('.serin-countdown-grid');
  const messageEl = wrap.querySelector('.serin-countdown-message');
  const els = {
    days: wrap.querySelector('[data-unit="days"]'),
    hours: wrap.querySelector('[data-unit="hours"]'),
    minutes: wrap.querySelector('[data-unit="minutes"]'),
    seconds: wrap.querySelector('[data-unit="seconds"]')
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  function render() {
    const now = new Date();

    if (now > SERIN_END) {
      grid.style.display = 'none';
      messageEl.style.display = 'block';
      messageEl.textContent = "Merci d'avoir participé au SERIN 2027";
      return true; // etat final, plus besoin de retick
    }

    if (now >= SERIN_START) {
      grid.style.display = 'none';
      messageEl.style.display = 'block';
      messageEl.textContent = 'Le SERIN est en cours !';
      return false; // continuer a verifier (bascule vers "merci" a la fin)
    }

    const diffMs = SERIN_START - now;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    grid.style.display = '';
    messageEl.style.display = 'none';
    els.days.textContent = pad(days);
    els.hours.textContent = pad(hours);
    els.minutes.textContent = pad(minutes);
    els.seconds.textContent = pad(seconds);
    return false;
  }

  const isFinal = render();
  if (!isFinal) {
    const timer = setInterval(() => {
      if (render()) clearInterval(timer);
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', initSerinCountdown);
