import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { deriveJourPeriode, STATUT_CANDIDAT_LABELS } from '../config/candidatsLabels';
import { useToast } from '../context/ToastContext';

const TYPES_EVENEMENTS = [
  'Cérémonie diplomatique', 'Conférence / Sommet', 'Visite officielle', 'Réception / Gala',
  'Mariage / Événement privé', 'Événement corporatif', 'Événement culturel', 'Autre',
];
const NIVEAUX = ['candidat', 'en_evaluation', 'forme', 'actif'];

const initialCriteria = {
  ville: '', date: '', heure: '', duree: '', type_evenement: '',
  effectif_requis: '', niveau: 'actif', langues: '', vehicule: false, tenue: '',
};

function scoreCandidat(c, criteria, jour, periode) {
  let score = 0;
  const raisons = [];

  if (criteria.ville && c.ville && c.ville.toLowerCase().includes(criteria.ville.toLowerCase())) {
    score += 2; raisons.push('Ville');
  }
  if (jour && c.disponibilite_matrice && typeof c.disponibilite_matrice === 'object') {
    const slot = c.disponibilite_matrice[jour];
    const disponible = slot === true || (slot && typeof slot === 'object' && slot[periode]) || (Array.isArray(slot) && slot.includes(periode));
    if (disponible) { score += 3; raisons.push('Disponible ce créneau'); }
  }
  if (criteria.type_evenement && Array.isArray(c.types_evenements) && c.types_evenements.includes(criteria.type_evenement)) {
    score += 2; raisons.push('Expérience sur ce type d\'événement');
  }
  if (criteria.langues) {
    const requises = criteria.langues.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean);
    const possedees = Array.isArray(c.langues) ? c.langues.map((l) => (l.langue || '').toLowerCase()) : [];
    const match = requises.filter((l) => possedees.includes(l));
    if (match.length) { score += match.length; raisons.push(`Langues: ${match.join(', ')}`); }
  }
  if (criteria.vehicule && c.vehicule) { score += 1; raisons.push('Véhiculé'); }
  if (criteria.tenue && c.preference_coupe) { raisons.push(`Tenue: ${c.preference_coupe}`); }

  return { score, raisons };
}

export default function MissionMatchTool() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [criteria, setCriteria] = useState(initialCriteria);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setCriteria((p) => ({ ...p, [key]: value }));

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    let query = supabase.from('candidats').select('*').eq('brouillon', false);
    if (criteria.niveau) query = query.eq('statut', criteria.niveau);
    else query = query.in('statut', NIVEAUX);
    if (criteria.ville) query = query.ilike('ville', `%${criteria.ville}%`);
    if (criteria.vehicule) query = query.eq('vehicule', true);

    const { data, error } = await query;
    setLoading(false);
    if (error) { showToast('La recherche a échoué.', 'error'); return; }

    const { jour, periode } = deriveJourPeriode(criteria.date, criteria.heure);
    const scored = (data || [])
      .map((c) => ({ candidat: c, ...scoreCandidat(c, criteria, jour, periode) }))
      .sort((a, b) => b.score - a.score);

    const effectif = parseInt(criteria.effectif_requis, 10);
    const capped = effectif > 0 ? scored.slice(0, Math.max(effectif * 3, effectif)) : scored;

    setResults({ list: capped, jour, periode, totalTrouves: scored.length });
  };

  const handleReset = () => { setCriteria(initialCriteria); setResults(null); };

  return (
    <>
      <PageHeader title="Trouver des membres disponibles pour une mission" />
      <div className="admin-content">
        <Link to="/candidatures" style={{ fontSize: '.86rem', color: 'var(--text-soft)', display: 'inline-block', marginBottom: 16 }}>← Retour aux candidatures</Link>

        <form className="card card-pad" onSubmit={handleSearch} style={{ marginBottom: 24 }}>
          <div className="section-title">Critères de la mission</div>
          <div className="filters-bar">
            <div className="filter-field">
              <label>Ville</label>
              <input type="text" value={criteria.ville} onChange={(e) => update('ville', e.target.value)} placeholder="ex. Pétion-Ville" />
            </div>
            <div className="filter-field">
              <label>Date</label>
              <input type="date" value={criteria.date} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Heure</label>
              <input type="time" value={criteria.heure} onChange={(e) => update('heure', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Durée (heures)</label>
              <input type="number" min="0" value={criteria.duree} onChange={(e) => update('duree', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Type d'événement</label>
              <select value={criteria.type_evenement} onChange={(e) => update('type_evenement', e.target.value)}>
                <option value="">Indifférent</option>
                {TYPES_EVENEMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Effectif requis</label>
              <input type="number" min="1" value={criteria.effectif_requis} onChange={(e) => update('effectif_requis', e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Niveau / statut</label>
              <select value={criteria.niveau} onChange={(e) => update('niveau', e.target.value)}>
                <option value="">Tous statuts actifs</option>
                {NIVEAUX.map((n) => <option key={n} value={n}>{STATUT_CANDIDAT_LABELS[n]}</option>)}
              </select>
            </div>
            <div className="filter-field">
              <label>Langues requises</label>
              <input type="text" value={criteria.langues} onChange={(e) => update('langues', e.target.value)} placeholder="Français, Anglais…" />
            </div>
            <div className="filter-field">
              <label>Véhicule requis</label>
              <select value={criteria.vehicule ? 'oui' : ''} onChange={(e) => update('vehicule', e.target.value === 'oui')}>
                <option value="">Indifférent</option><option value="oui">Oui</option>
              </select>
            </div>
            <div className="filter-field">
              <label>Tenue</label>
              <input type="text" value={criteria.tenue} onChange={(e) => update('tenue', e.target.value)} placeholder="ex. Costume formel" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Recherche…' : 'Rechercher'}</button>
            <button type="button" className="btn btn-outline" onClick={handleReset}>Réinitialiser</button>
          </div>
        </form>

        {loading && <LoadingSpinner />}

        {results && !loading && (
          <div className="card card-pad">
            <div className="section-title">
              Résultats — {results.list.length} membre(s) proposé(s)
              {results.jour && <span style={{ fontWeight: 400, color: 'var(--text-soft)', fontSize: '.82rem' }}> · créneau ciblé : {results.jour}, {results.periode}</span>}
            </div>
            {results.list.length === 0 && <p className="field-hint">Aucun membre ne correspond à ces critères pour le moment.</p>}
            {results.list.map(({ candidat, score, raisons }) => (
              <div
                key={candidat.id}
                className="detail-row"
                style={{ cursor: 'pointer', alignItems: 'center' }}
                onClick={() => navigate(`/candidatures/${candidat.id}`)}
              >
                <span className="k" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <strong style={{ color: 'var(--navy)' }}>{[candidat.prenom, candidat.nom].filter(Boolean).join(' ') || candidat.email}</strong>
                  <span style={{ fontSize: '.78rem' }}>{candidat.ville || '—'} · {STATUT_CANDIDAT_LABELS[candidat.statut] || candidat.statut}{candidat.niveau_protocolaire ? ` · ${candidat.niveau_protocolaire}` : ''}</span>
                </span>
                <span className="v" style={{ textAlign: 'right' }}>
                  <span className="badge badge-gold" style={{ marginBottom: 4, display: 'inline-block' }}>Score {score}</span>
                  <div style={{ fontSize: '.76rem', color: 'var(--text-soft)', fontWeight: 400 }}>{raisons.join(' · ') || 'Correspondance générale'}</div>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
