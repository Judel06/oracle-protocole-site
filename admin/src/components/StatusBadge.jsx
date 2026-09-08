import { STATUT_LABELS, STATUT_COLORS } from '../config/entities';

export default function StatusBadge({ statut }) {
  const color = STATUT_COLORS[statut] || 'navy';
  return <span className={`badge badge-${color}`}>{STATUT_LABELS[statut] || statut}</span>;
}
