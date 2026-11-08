/**
 * ─── Nettoyage des copies locales héritées du mode démonstration ──────────────
 *
 * L'application a longtemps tourné sur une base LOCALE (mode démo) et gardé une
 * copie des parties commerciales dans le navigateur. Ces copies contiennent le
 * jeu de données constant (comptes bancaires, mouvements de caisse, ventes,
 * produits…) et, tant qu'elles existaient, elles étaient relues au démarrage —
 * puis fusionnées et renvoyées vers Supabase. C'est ce qui faisait encore
 * apparaître des chiffres constants dans les Rapports généraux et la Caisse
 * générale.
 *
 * Désormais Supabase est la SEULE source des données : ces clés sont effacées
 * au chargement de la page, avant que le moindre store ne démarre.
 * ──────────────────────────────────────────────────────────────────────────────
 */
import { AUTH_STORAGE_KEY } from './supabase';

/** Clés qui ne contenaient que des données (jamais des préférences d'affichage). */
const LEGACY_DATA_KEYS = [
  'altech-demo-db-v2',        // base locale du mode démo (toutes les tables)
  'altech-demo-users-v2',     // comptes du mode démo
  'stationpro_biz_demo_v1',   // ancienne copie locale des parties commerciales
  'stationpro_state',         // très ancienne copie locale du store carburant
  'stationpro_zakat_v1',      // réglages Zakat — désormais dans station_settings
];

export function purgeLegacyLocalData(): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    for (const k of LEGACY_DATA_KEYS) ls.removeItem(k);

    // Session factice du mode démo (`demo-token-…`) : elle ferait croire à une
    // connexion alors que Supabase la refuserait.
    const raw = ls.getItem(AUTH_STORAGE_KEY);
    if (raw && raw.includes('"demo-token-')) ls.removeItem(AUTH_STORAGE_KEY);
  } catch { /* stockage indisponible : rien à nettoyer */ }
}
