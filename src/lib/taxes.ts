/**
 * ─── TAXES RÉUTILISABLES (TVA + autres taxes) ────────────────────────────────
 * Une taxe créée une fois (nom + montant fixe OU pourcentage) est enregistrée
 * comme « modèle » : à la prochaine opération il suffit de l'activer, elle est
 * prête avec sa valeur. Les modèles sont partagés par les achats carburant et
 * les ventes carburant.
 *
 * Une taxe en pourcentage s'applique sur la base HT (après remise) ; une taxe
 * fixe s'ajoute telle quelle. TVA et taxes s'additionnent au total.
 */
import { supabase } from './supabase';
import { newId } from './utils';

export type TaxKind = 'percent' | 'amount';

export interface TaxPreset {
  id: string;
  name: string;
  kind: TaxKind;
  value: number;
  createdAt?: string;
  /** Modèle intégré (taxes officielles carburant NAFTAL) — non supprimable. */
  builtin?: boolean;
}

/**
 * ─── Taxes carburant officielles (factures NAFTAL) ──────────────────────────
 * Relevées sur les factures carburant NAFTAL (Gas-oil & Essence sans plomb).
 * Elles sont proposées d'office dans l'éditeur de taxes des achats ET des ventes
 * carburant : un clic les active, la valeur reste modifiable facture par facture
 * (les montants fixes — TPP, redevance, taxe additionnelle, écart — varient selon
 * le volume livré).
 *
 *   Code 5477 — TVA sur ventes P.Pétroliers 19 %  → utilisez l'interrupteur TVA (19 %).
 *   Code 5474 — TVA sur autres prod. & prest. 19 %
 *   Code 70701 — TPP sur marchandise (soumise à TVA)
 *   Code 5478 — Taxe additionnelle sur les carburants
 *   Code 706138 — Redevance de gestion TPE
 *   Code 6988/7988 — Écart sur prix (décrété / calculé)
 */
export const FUEL_TAX_PRESETS: TaxPreset[] = [
  { id: 'fuel-tva-petroliers', name: 'TVA sur ventes P.Pétroliers', kind: 'percent', value: 19, builtin: true },
  { id: 'fuel-tva-autres', name: 'TVA sur autres prod. & prest.', kind: 'percent', value: 19, builtin: true },
  { id: 'fuel-tpp', name: 'TPP sur marchandise (soumise à TVA)', kind: 'amount', value: 0, builtin: true },
  { id: 'fuel-taxe-additionnelle', name: 'Taxe additionnelle sur les carburants', kind: 'amount', value: 0, builtin: true },
  { id: 'fuel-redevance-tpe', name: 'Redevance de gestion TPE', kind: 'amount', value: 0, builtin: true },
  { id: 'fuel-ecart-prix', name: 'Écart sur prix (décrété / calculé)', kind: 'amount', value: 0, builtin: true },
];

/** Une taxe appliquée sur un document (copie figée du modèle). */
export interface AppliedTax {
  id: string;
  presetId?: string;
  name: string;
  kind: TaxKind;
  value: number;
  /** Montant réellement ajouté au total. */
  amount: number;
}

const TABLE = 'tax_presets';

export function taxAmount(base: number, kind: TaxKind, value: number): number {
  const v = Number(value) || 0;
  if (kind === 'percent') return Math.round((Number(base) || 0) * v) / 100;
  return v;
}

/** Recalcule les montants des taxes pour une base donnée. */
export function computeTaxes(base: number, taxes: AppliedTax[]): AppliedTax[] {
  return (taxes || []).map(t => ({ ...t, amount: taxAmount(base, t.kind, t.value) }));
}

export const sumTaxes = (taxes: AppliedTax[] | undefined): number =>
  (taxes || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);

export const taxLabel = (t: Pick<AppliedTax, 'name' | 'kind' | 'value'>): string =>
  t.kind === 'percent' ? `${t.name} (${t.value}%)` : t.name;

const mapPreset = (r: any): TaxPreset => ({
  id: r.id, name: r.name, kind: r.kind === 'amount' ? 'amount' : 'percent',
  value: +(r.value ?? 0), createdAt: r.created_at,
});

/**
 * Renvoie les modèles de taxes : les taxes carburant officielles (NAFTAL) en
 * tête, suivies des taxes créées par l'utilisateur. Un modèle enregistré qui
 * reprend exactement le nom d'une taxe intégrée la remplace (valeur
 * personnalisée), pour éviter les doublons.
 */
export async function loadTaxPresets(): Promise<TaxPreset[]> {
  try {
    const { data } = await supabase.from(TABLE).select('*').order('created_at', { ascending: true });
    const stored = ((data as any[]) || []).map(mapPreset);
    const storedNames = new Set(stored.map(p => p.name.trim().toLowerCase()));
    const builtins = FUEL_TAX_PRESETS.filter(b => !storedNames.has(b.name.trim().toLowerCase()));
    return [...builtins, ...stored];
  } catch {
    return [...FUEL_TAX_PRESETS];
  }
}

export async function saveTaxPreset(p: Omit<TaxPreset, 'id'> & { id?: string }): Promise<TaxPreset> {
  const row = { id: p.id || newId(), name: p.name.trim(), kind: p.kind, value: Number(p.value) || 0, created_at: p.createdAt || new Date().toISOString() };
  await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
  return mapPreset(row);
}

export async function deleteTaxPreset(id: string): Promise<void> {
  await supabase.from(TABLE).delete().eq('id', id);
}
