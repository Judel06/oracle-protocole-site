/** Regroupe des dates ISO en buckets hebdomadaires sur les N dernieres semaines. */
export function buildWeeklyBuckets(weeks = 8) {
  const buckets = [];
  const now = new Date();
  const startOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // lundi comme premier jour
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const current = startOfWeek(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    buckets.push({ start, label: start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) });
  }
  return buckets;
}

export function countByWeek(dates, buckets) {
  const counts = new Array(buckets.length).fill(0);
  dates.forEach((iso) => {
    const d = new Date(iso);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (d >= buckets[i].start) {
        counts[i] += 1;
        break;
      }
    }
  });
  return counts;
}
