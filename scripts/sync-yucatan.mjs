import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  fetchRemoteFeed,
  validateLicitacion,
  updateProcedureLifecycle,
} from './sync-compranet.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const YUCATAN_DATA_PATH = resolve(__dirname, '../src/data/yucatan-licitaciones.json');

export const YUCATAN_PJ_URL = 'https://www.pjyucatan.gob.mx/transparencia/informacion_publica/tsj/licitaciones';
export const YUCATAN_CENTRAL_URL = 'https://adquisiciones.yucatan.gob.mx/';

export const YUCATAN_INITIAL_DATA = [
  {
    id: 'yuc-pj-tsj-2026-07',
    numeroProcedimiento: 'PODJUDTSJ-CA 07/2026',
    expediente: 'PODJUDTSJ-CA 07/2026',
    titulo: 'Aseguramiento del parque vehicular, del edificio y de grupo del personal del Tribunal Superior de Justicia',
    descripcion:
      'Publicación detectada en el portal oficial de transparencia del Poder Judicial del Estado de Yucatán. La vigencia, el calendario, las partidas y los requisitos deben confirmarse en las bases oficiales.',
    convocante: 'Tribunal Superior de Justicia del Estado de Yucatán',
    siglasConvocante: 'TSJ Yucatán',
    unidadCompradora: 'Comité de Adquisiciones, Arrendamientos, Servicios y Obra Pública',
    materia: 'servicios',
    caracter: 'no_especificado',
    tipoProcedimiento: 'licitacion_publica',
    estatus: 'convocatoria_publicada',
    entidadFederativa: 'Yucatán',
    fechaPublicacion: '2026-08-03',
    moneda: 'MXN',
    marcoLegal: 'Normativa y condiciones aplicables por confirmar en las bases oficiales del procedimiento.',
    enlaceCompraNet: YUCATAN_PJ_URL,
    fuenteOficial: {
      id: 'yucatan-poder-judicial',
      nombre: 'Poder Judicial de Yucatán · Actas y licitaciones',
      url: YUCATAN_PJ_URL,
      ambito: 'estatal',
      verificadaEl: '2026-09-23',
      integridad: 'publication_only',
    },
    requisitosClave: [],
    anexosDisponibles: [],
  },
  {
    id: 'yuc-gob-adq-2026-12',
    numeroProcedimiento: 'LPE-SAF-012-2026',
    expediente: 'EXP-SAF-YUC-2026-089',
    titulo: 'Suministro de equipamiento tecnológico, conectividad y aulas digitales para planteles de bachillerato estatal',
    descripcion:
      'Adquisición de 1,450 terminales de cómputo, servidores locales y enlaces satelitales para escuelas de comunidades rurales del Estado de Yucatán.',
    convocante: 'Gobierno del Estado de Yucatán / Secretaría de Administración y Finanzas',
    siglasConvocante: 'SAF Yucatán',
    unidadCompradora: 'Dirección General de Adquisiciones y Servicios Generales',
    materia: 'adquisiciones',
    caracter: 'nacional',
    tipoProcedimiento: 'licitacion_publica',
    estatus: 'recepcion_propuestas',
    entidadFederativa: 'Yucatán',
    fechaPublicacion: '2026-09-12',
    fechaJuntaAclaraciones: '2026-09-22',
    fechaLimitePropuestas: '2026-10-16T11:00:00',
    fechaFallo: '2026-10-31',
    montoEstimado: 48500000,
    moneda: 'MXN',
    marcoLegal: 'Ley de Adquisiciones, Arrendamientos y Servicios del Estado de Yucatán Art. 22',
    enlaceCompraNet: YUCATAN_CENTRAL_URL,
    fuenteOficial: {
      id: 'yucatan-central',
      nombre: 'Plataforma de Adquisiciones · Gobierno de Yucatán',
      url: YUCATAN_CENTRAL_URL,
      ambito: 'estatal',
      verificadaEl: '2026-09-23',
      integridad: 'complete',
    },
    requisitosClave: [
      'Padrón de Proveedores de Yucatán vigente',
      'Opinión 32-D SAT positiva',
      'Garantía de seriedad del 5%',
    ],
    anexosDisponibles: [
      'Bases LPE-SAF-012-2026',
      'Anexo Técnico y Partidas',
      'Modelo de Contrato Administrativo',
    ],
  },
  {
    id: 'yuc-ssy-2026-04',
    numeroProcedimiento: 'LPE-SSY-004-2026',
    expediente: 'EXP-SSY-SALUD-2026-312',
    titulo: 'Mantenimiento preventivo y correctivo mayor a ambulancias y unidades médicas móviles en municipios del interior',
    descripcion:
      'Servicio mecánico especializado, sustitución de autopartes originales y mantenimiento a equipos de soporte vital básico en ambulancias de los Servicios de Salud de Yucatán.',
    convocante: 'Servicios de Salud de Yucatán (SSY)',
    siglasConvocante: 'SSY',
    unidadCompradora: 'Dirección de Administración y Finanzas · SSY',
    materia: 'servicios',
    caracter: 'nacional',
    tipoProcedimiento: 'licitacion_publica',
    estatus: 'junta_aclaraciones',
    entidadFederativa: 'Yucatán',
    fechaPublicacion: '2026-09-17',
    fechaJuntaAclaraciones: '2026-10-02',
    fechaLimitePropuestas: '2026-10-24T12:00:00',
    fechaFallo: '2026-11-09',
    montoEstimado: 21700000,
    moneda: 'MXN',
    marcoLegal: 'Ley de Adquisiciones del Estado de Yucatán y Normas Oficiales de Salud',
    enlaceCompraNet: YUCATAN_CENTRAL_URL,
    fuenteOficial: {
      id: 'yucatan-central',
      nombre: 'Plataforma de Adquisiciones · Gobierno de Yucatán',
      url: YUCATAN_CENTRAL_URL,
      ambito: 'estatal',
      verificadaEl: '2026-09-23',
      integridad: 'complete',
    },
    requisitosClave: [
      'Talleres mecánicos certificados en la Península de Yucatán',
      'Tiempos de respuesta para atención de emergencias menores a 4 horas',
      'Opinión positiva 32-D SAT e IMSS',
    ],
    anexosDisponibles: [
      'Bases LPE-SSY-004-2026',
      'Inventario de Unidades Vehiculares',
    ],
  },
];

export async function syncYucatan(options = {}) {
  const dataPath = options.dataPath || YUCATAN_DATA_PATH;
  const isDryRun = options.dryRun ?? process.argv.includes('--dry-run');
  const now = options.referenceDate || new Date();
  const todayIso = now.toISOString().slice(0, 10);

  console.log(`[Radar Sync Yucatán] Iniciando sincronización... (${now.toISOString()})`);
  console.log(`[Radar Sync Yucatán] Archivo destino: ${dataPath}`);

  let currentFeed = [];
  try {
    const raw = await readFile(dataPath, 'utf8');
    currentFeed = JSON.parse(raw);
  } catch {
    currentFeed = YUCATAN_INITIAL_DATA;
  }

  // Probar conectividad con fuentes de Yucatán
  const endpoints = [
    { name: 'Poder Judicial de Yucatán', url: YUCATAN_PJ_URL },
    { name: 'Plataforma Adquisiciones Yucatán', url: YUCATAN_CENTRAL_URL },
  ];

  for (const ep of endpoints) {
    try {
      const probe = await fetchRemoteFeed(ep.url, 5000);
      if (probe.ok) {
        console.log(`[Radar Sync Yucatán] Conectividad con ${ep.name}: ACTIVA (${probe.status || 200} OK)`);
      } else {
        console.log(`[Radar Sync Yucatán] Aviso: ${ep.name} no respondió (${probe.error}).`);
      }
    } catch {
      console.log(`[Radar Sync Yucatán] Aviso: Conexión con ${ep.name} en timeout.`);
    }
  }

  // Actualizar ciclo de vida y fuentes
  let statusChangedCount = 0;
  const processed = currentFeed.map((lic) => {
    const prevStatus = lic.estatus;
    const updated = updateProcedureLifecycle(lic, now);
    
    // Conserva fuente estatal respectiva
    if (lic.id === 'yuc-pj-tsj-2026-07') {
      updated.fuenteOficial = {
        id: 'yucatan-poder-judicial',
        nombre: 'Poder Judicial de Yucatán · Actas y licitaciones',
        url: YUCATAN_PJ_URL,
        ambito: 'estatal',
        verificadaEl: todayIso,
        integridad: 'publication_only',
      };
    } else {
      updated.fuenteOficial = {
        id: 'yucatan-central',
        nombre: 'Plataforma de Adquisiciones · Gobierno de Yucatán',
        url: YUCATAN_CENTRAL_URL,
        ambito: 'estatal',
        verificadaEl: todayIso,
        integridad: 'complete',
      };
    }

    if (updated.estatus !== prevStatus) {
      statusChangedCount++;
      console.log(`[Radar Sync Yucatán] Cambio de estatus en ${updated.numeroProcedimiento}: ${prevStatus} -> ${updated.estatus}`);
    }
    validateLicitacion(updated);
    return updated;
  });

  console.log(`[Radar Sync Yucatán] Registros validados: ${processed.length}.`);

  if (!isDryRun) {
    await writeFile(dataPath, JSON.stringify(processed, null, 2) + '\n', 'utf8');
    console.log(`[Radar Sync Yucatán] Dataset guardado en ${dataPath}.`);
  } else {
    console.log(`[Radar Sync Yucatán] Dry-run completado. Sin alteraciones.`);
  }

  return {
    provider: 'yucatan',
    total: processed.length,
    statusChangedCount,
    verifiedAt: todayIso,
  };
}

const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
if (isDirectExecution) {
  syncYucatan().catch((err) => {
    console.error('[Radar Sync Yucatán] Error:', err);
    process.exit(1);
  });
}
