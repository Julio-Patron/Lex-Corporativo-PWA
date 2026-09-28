import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { syncCompranet } from './sync-compranet.mjs';
import { syncYucatan } from './sync-yucatan.mjs';
import { syncNuevoLeon } from './sync-nuevo-leon.mjs';
import { syncJalisco } from './sync-jalisco.mjs';
import { syncCdmx } from './sync-cdmx.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function syncAll(options = {}) {
  const isDryRun = options.dryRun ?? process.argv.includes('--dry-run');
  const providerFilter = options.provider || process.argv.find((arg) => arg.startsWith('--provider='))?.split('=')[1];
  const now = options.referenceDate || new Date();

  console.log('======================================================================');
  console.log(`[Radar Multi-Provider Sync] Sincronización Global de Fuentes (${now.toISOString()})`);
  console.log(`[Radar Multi-Provider Sync] Modo: ${isDryRun ? 'DRY-RUN (Simulación sin escrituras)' : 'PRODUCCIÓN (Escritura en disco)'}`);
  if (providerFilter) {
    console.log(`[Radar Multi-Provider Sync] Filtrado por proveedor: ${providerFilter}`);
  }
  console.log('======================================================================\n');

  const providers = [
    { id: 'federal', name: 'Federal (ComprasMX · CompraNet)', fn: syncCompranet },
    { id: 'yucatan', name: 'Yucatán (Poder Judicial y Adquisiciones)', fn: syncYucatan },
    { id: 'nuevo-leon', name: 'Nuevo León (Portal Estatal)', fn: syncNuevoLeon },
    { id: 'jalisco', name: 'Jalisco (SECG)', fn: syncJalisco },
    { id: 'cdmx', name: 'Ciudad de México (Tianguis Digital)', fn: syncCdmx },
  ];

  const results = [];
  let totalProcedures = 0;
  let totalStatusChanges = 0;

  for (const prov of providers) {
    if (providerFilter && providerFilter !== prov.id && providerFilter !== 'all') {
      continue;
    }

    console.log(`\n>>> Ejecutando proveedor: ${prov.name}...`);
    try {
      const res = await prov.fn({ dryRun: isDryRun, referenceDate: now });
      results.push({ id: prov.id, name: prov.name, ok: true, ...res });
      totalProcedures += res.total || 0;
      totalStatusChanges += res.statusChangedCount || 0;
    } catch (err) {
      console.error(`[Radar Sync Error] Error en proveedor ${prov.name}:`, err.message);
      results.push({ id: prov.id, name: prov.name, ok: false, error: err.message });
    }
  }

  console.log('\n======================================================================');
  console.log('[Radar Multi-Provider Sync] RESUMEN DE EJECUCIÓN:');
  console.log('======================================================================');
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ ${r.name.padEnd(45)}: ${r.total} items | ${r.statusChangedCount} actualizados | Verif: ${r.verifiedAt}`);
    } else {
      console.log(`  ✗ ${r.name.padEnd(45)}: ERROR (${r.error})`);
    }
  }
  console.log('----------------------------------------------------------------------');
  console.log(`TOTAL GENERAL: ${totalProcedures} licitaciones verificadas | ${totalStatusChanges} transiciones de etapa.`);
  console.log('======================================================================\n');

  const hasFailures = results.some((r) => !r.ok);
  if (hasFailures) {
    throw new Error('Al menos un proveedor falló durante la sincronización multi-fuente.');
  }

  return {
    results,
    totalProcedures,
    totalStatusChanges,
    verifiedAt: now.toISOString().slice(0, 10),
  };
}

const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
if (isDirectExecution) {
  syncAll().catch((err) => {
    console.error('[Radar Sync Global] Error fatal:', err);
    process.exit(1);
  });
}
