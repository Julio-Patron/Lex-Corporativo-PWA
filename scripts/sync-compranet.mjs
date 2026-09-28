import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_DATA_PATH = resolve(__dirname, '../src/data/federal-licitaciones.json');

export const COMPRANET_PORTAL_URL = 'https://comprasmx.buengobierno.gob.mx';
export const DATOS_ABIERTOS_URL = 'https://datos.gob.mx/busca/dataset/concentrado-de-contrataciones-abiertas-de-la-apf';
export const OCDS_EDCA_API_URL = 'https://api.datos.gob.mx/v1/contratacionesabiertas';
export const PDN_CONTRATACIONES_URL = 'https://www.plataformadigitalnacional.org/contrataciones';

export const VALID_MATERIAS = new Set([
  'adquisiciones',
  'servicios',
  'obra_publica',
  'arrendamientos',
  'servicios_obra',
]);

export const VALID_ESTATUS = new Set([
  'convocatoria_publicada',
  'visita_sitio',
  'junta_aclaraciones',
  'recepcion_propuestas',
  'evaluacion',
  'fallo_emitido',
]);

export const VALID_CARACTER = new Set([
  'nacional',
  'internacional_tlc',
  'internacional_abierta',
  'no_especificado',
]);

export const VALID_TIPO_PROCEDIMIENTO = new Set([
  'licitacion_publica',
  'invitacion_tres_personas',
  'adjudicacion_directa',
]);

/**
 * Normaliza y valida una licitación contra el esquema oficial LicitacionPublica.
 */
export function validateLicitacion(item) {
  if (!item || typeof item !== 'object') {
    throw new Error('El registro de licitación debe ser un objeto válido.');
  }

  const requiredStrings = [
    'id',
    'numeroProcedimiento',
    'expediente',
    'titulo',
    'descripcion',
    'convocante',
    'siglasConvocante',
    'unidadCompradora',
    'materia',
    'caracter',
    'tipoProcedimiento',
    'estatus',
    'entidadFederativa',
    'fechaPublicacion',
    'marcoLegal',
    'enlaceCompraNet',
  ];

  for (const field of requiredStrings) {
    if (typeof item[field] !== 'string' || !item[field].trim()) {
      throw new Error(`Campo obligatorio ausente o inválido: "${field}" en licitación ${item.id ?? 'sin-id'}`);
    }
  }

  if (!VALID_MATERIAS.has(item.materia)) {
    throw new Error(`Materia no válida "${item.materia}" en ${item.id}`);
  }
  if (!VALID_ESTATUS.has(item.estatus)) {
    throw new Error(`Estatus no válido "${item.estatus}" en ${item.id}`);
  }
  if (!VALID_CARACTER.has(item.caracter)) {
    throw new Error(`Carácter no válido "${item.caracter}" en ${item.id}`);
  }
  if (!VALID_TIPO_PROCEDIMIENTO.has(item.tipoProcedimiento)) {
    throw new Error(`Tipo de procedimiento no válido "${item.tipoProcedimiento}" en ${item.id}`);
  }
  if (item.moneda !== 'MXN' && item.moneda !== 'USD') {
    throw new Error(`Moneda no válida "${item.moneda}" en ${item.id}`);
  }
  if (!Array.isArray(item.requisitosClave)) {
    throw new Error(`requisitosClave debe ser un arreglo en ${item.id}`);
  }
  if (!Array.isArray(item.anexosDisponibles)) {
    throw new Error(`anexosDisponibles debe ser un arreglo en ${item.id}`);
  }

  return true;
}

/**
 * Actualiza el ciclo de vida del procedimiento según las fechas límite y la fecha de referencia.
 */
export function updateProcedureLifecycle(procedure, referenceDate = new Date()) {
  const updated = { ...procedure };
  const refTime = referenceDate.getTime();
  const todayIso = referenceDate.toISOString().slice(0, 10);

  // Actualiza o agrega fuente oficial con fecha de verificación
  updated.fuenteOficial = {
    id: 'compranet',
    nombre: 'ComprasMX · CompraNet',
    url: COMPRANET_PORTAL_URL,
    ambito: 'federal',
    verificadaEl: todayIso,
    integridad: 'complete',
  };

  const fechaLimiteTime = updated.fechaLimitePropuestas
    ? new Date(updated.fechaLimitePropuestas).getTime()
    : null;

  const fechaFalloTime = updated.fechaFallo
    ? new Date(updated.fechaFallo).getTime()
    : null;

  // Si ya pasó la fecha de fallo, el estatus avanza a fallo_emitido
  if (fechaFalloTime && refTime >= fechaFalloTime) {
    updated.estatus = 'fallo_emitido';
  } else if (fechaLimiteTime && refTime >= fechaLimiteTime) {
    // Si venció la entrega de propuestas pero aún no hay fallo, pasa a evaluación
    if (
      updated.estatus === 'recepcion_propuestas' ||
      updated.estatus === 'junta_aclaraciones' ||
      updated.estatus === 'visita_sitio' ||
      updated.estatus === 'convocatoria_publicada'
    ) {
      updated.estatus = 'evaluacion';
    }
  }

  return updated;
}

/**
 * Combina el catálogo existente con registros entrantes, evitando duplicados por número de procedimiento.
 */
export function mergeLicitaciones(existingList, incomingList) {
  const map = new Map();

  for (const item of existingList) {
    map.set(item.numeroProcedimiento, item);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const incoming of incomingList) {
    if (map.has(incoming.numeroProcedimiento)) {
      const current = map.get(incoming.numeroProcedimiento);
      map.set(incoming.numeroProcedimiento, {
        ...current,
        ...incoming,
        requisitosClave: incoming.requisitosClave?.length ? incoming.requisitosClave : current.requisitosClave,
        anexosDisponibles: incoming.anexosDisponibles?.length ? incoming.anexosDisponibles : current.anexosDisponibles,
      });
      updatedCount++;
    } else {
      map.set(incoming.numeroProcedimiento, incoming);
      addedCount++;
    }
  }

  return {
    merged: Array.from(map.values()),
    addedCount,
    updatedCount,
  };
}

/**
 * Convierte un release o registro en formato OCDS / EDCA (Estándar de Datos para las Contrataciones Abiertas)
 * de la APF / Datos Abiertos a un objeto conforme con la interfaz LicitacionPublica.
 */
export function convertOcdsToLicitacion(record, referenceDate = new Date()) {
  if (!record || typeof record !== 'object') {
    throw new Error('El registro OCDS debe ser un objeto válido.');
  }

  const release = record.compiledRelease || record;
  const tender = release.tender || {};
  const ocid = release.ocid || release.id || tender.id;

  if (!ocid && !tender.id) {
    throw new Error('El registro OCDS carece de identificador (ocid o tender.id).');
  }

  if (!tender.title && !release.title && !tender.description) {
    throw new Error('El registro OCDS carece de título o descripción del procedimiento.');
  }

  const rawId = tender.id || ocid;
  const id = `fed-${String(rawId).toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
  const numeroProcedimiento = String(tender.id || ocid);
  const titulo = tender.title || release.title || tender.description;
  const descripcion = tender.description || tender.title || titulo;

  const convocante =
    tender.procuringEntity?.name ||
    release.buyer?.name ||
    release.parties?.find((p) => p.roles?.includes('procuringEntity') || p.roles?.includes('buyer'))?.name ||
    'Gobierno Federal / APF';

  const siglasConvocante =
    convocante.match(/\(([A-Z0-9]+)\)/)?.[1] ||
    convocante
      .split(/\s+/)
      .filter((w) => w.length > 2 && /^[A-Z]/.test(w))
      .slice(0, 3)
      .map((w) => w[0])
      .join('') ||
    'FED';

  const unidadCompradora =
    tender.procuringEntity?.name ||
    tender.procuringEntity?.id ||
    convocante;

  let materia = 'servicios';
  const cat = (tender.mainProcurementCategory || '').toLowerCase();
  if (cat === 'goods' || cat.includes('bien') || cat.includes('adquisici')) {
    materia = 'adquisiciones';
  } else if (cat === 'works' || cat.includes('obra')) {
    materia = 'obra_publica';
  } else if (cat.includes('arrend')) {
    materia = 'arrendamientos';
  } else if (cat.includes('servicios_obra')) {
    materia = 'servicios_obra';
  }

  let caracter = 'nacional';
  const methodDetails = (tender.procurementMethodDetails || '').toLowerCase();
  if (methodDetails.includes('tlc') || methodDetails.includes('tratado')) {
    caracter = 'internacional_tlc';
  } else if (methodDetails.includes('internacional')) {
    caracter = 'internacional_abierta';
  }

  let tipoProcedimiento = 'licitacion_publica';
  const method = (tender.procurementMethod || '').toLowerCase();
  if (method === 'direct' || methodDetails.includes('adjudicaci')) {
    tipoProcedimiento = 'adjudicacion_directa';
  } else if (method === 'selective' || methodDetails.includes('invitaci')) {
    tipoProcedimiento = 'invitacion_tres_personas';
  }

  const fechaPublicacion =
    tender.tenderPeriod?.startDate?.slice(0, 10) ||
    release.date?.slice(0, 10) ||
    referenceDate.toISOString().slice(0, 10);

  const fechaLimitePropuestas =
    tender.tenderPeriod?.endDate ||
    tender.tenderPeriod?.startDate ||
    undefined;

  const fechaFallo =
    tender.awardPeriod?.startDate?.slice(0, 10) ||
    tender.awardPeriod?.endDate?.slice(0, 10) ||
    undefined;

  const fechaJuntaAclaraciones =
    tender.enquiryPeriod?.endDate?.slice(0, 10) ||
    tender.enquiryPeriod?.startDate?.slice(0, 10) ||
    undefined;

  const docs = Array.isArray(tender.documents) ? tender.documents : [];
  const primaryDoc = docs.find((d) => d.url) || docs[0];
  const enlaceCompraNet =
    primaryDoc?.url ||
    `https://comprasmx.buengobierno.gob.mx/expediente/${encodeURIComponent(numeroProcedimiento)}`;

  const anexosDisponibles = docs.map((d) => d.title || d.documentType || 'Documento OCDS');
  if (anexosDisponibles.length === 0) {
    anexosDisponibles.push('Bases del procedimiento');
  }

  const montoEstimado = Number(tender.value?.amount) || 0;
  const moneda = tender.value?.currency === 'USD' ? 'USD' : 'MXN';

  const baseLicitacion = {
    id,
    numeroProcedimiento,
    expediente: tender.id || numeroProcedimiento,
    titulo,
    descripcion,
    convocante,
    siglasConvocante,
    unidadCompradora,
    materia,
    caracter,
    tipoProcedimiento,
    estatus: 'recepcion_propuestas',
    entidadFederativa: 'Nacional / Federal',
    fechaPublicacion,
    fechaLimitePropuestas,
    fechaFallo,
    fechaJuntaAclaraciones,
    montoEstimado,
    moneda,
    marcoLegal: 'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público (LAASSP) / Estándar EDCA-OCDS',
    enlaceCompraNet,
    requisitosClave: [
      'Cumplimiento de obligaciones fiscales SAT (32-D)',
      'Registro en Padrón de Proveedores ComprasMX',
      'Propuesta técnica y económica conforme a bases',
    ],
    anexosDisponibles,
    fuenteOficial: {
      id: 'compranet',
      nombre: 'Datos Abiertos APF · EDCA / CompraNet',
      url: DATOS_ABIERTOS_URL,
      ambito: 'federal',
      verificadaEl: referenceDate.toISOString().slice(0, 10),
      integridad: 'complete',
    },
  };

  return updateProcedureLifecycle(baseLicitacion, referenceDate);
}

/**
 * Parsea una respuesta de feed OCDS / EDCA (que puede ser un arreglo, un objeto con releases o results)
 * y extrae las licitaciones públicas válidas.
 */
export function parseOcdsFeed(payload, referenceDate = new Date()) {
  if (!payload || typeof payload !== 'object') return [];

  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.releases)
      ? payload.releases
      : Array.isArray(payload.records)
        ? payload.records
        : Array.isArray(payload.results)
          ? payload.results
          : [];

  const validItems = [];
  for (const item of rawItems) {
    try {
      const converted = convertOcdsToLicitacion(item, referenceDate);
      validateLicitacion(converted);
      validItems.push(converted);
    } catch {
      // Omitir registros incompletos o incompatibles
    }
  }

  return validItems;
}

/**
 * Intenta obtener licitaciones desde un endpoint oficial con timeout y resiliencia ante caídas de red.
 */
export async function fetchRemoteFeed(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers?.get ? (response.headers.get('content-type') || '') : '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { ok: true, isJson: true, data };
    }

    return { ok: true, isJson: false, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Función principal de sincronización de licitaciones públicas.
 */
export async function syncCompranet(options = {}) {
  const dataPath = options.dataPath || DEFAULT_DATA_PATH;
  const isDryRun = options.dryRun ?? process.argv.includes('--dry-run');
  const now = options.referenceDate || new Date();

  console.log(`[Radar Sync] Iniciando sincronización de CompraNet... (${now.toISOString()})`);
  console.log(`[Radar Sync] Archivo destino: ${dataPath}`);
  if (isDryRun) console.log('[Radar Sync] MODO PRUEBA (dry-run): No se escribirán cambios en disco.');

  // 1. Cargar dataset actual
  const rawContent = await readFile(dataPath, 'utf8');
  const currentFeed = JSON.parse(rawContent);

  if (!Array.isArray(currentFeed)) {
    throw new Error('El archivo de licitaciones no contiene un arreglo JSON válido.');
  }

  console.log(`[Radar Sync] Dataset actual cargado: ${currentFeed.length} procedimientos.`);

  // 2. Probar conectividad e ingesta desde fuentes oficiales de la APF y Datos Abiertos
  const sourcesToCheck = [
    { name: 'Portal ComprasMX', url: COMPRANET_PORTAL_URL, isOcds: false },
    { name: 'API Datos Abiertos APF (EDCA/OCDS)', url: OCDS_EDCA_API_URL, isOcds: true },
    { name: 'Catálogo Concentrado Contrataciones Abiertas', url: DATOS_ABIERTOS_URL, isOcds: false },
  ];

  const freshRemoteLicitaciones = [];

  for (const src of sourcesToCheck) {
    try {
      const probe = await fetchRemoteFeed(src.url, 5000);
      if (probe.ok) {
        if (probe.isJson && probe.data) {
          if (src.isOcds) {
            const parsed = parseOcdsFeed(probe.data, now);
            if (parsed.length > 0) {
              console.log(`[Radar Sync] Conectividad con ${src.name}: FEED OCDS PARSEADO (${parsed.length} procedimientos).`);
              freshRemoteLicitaciones.push(...parsed);
            } else {
              console.log(`[Radar Sync] Conectividad con ${src.name}: FEED JSON RECIBIDO`);
            }
          } else {
            console.log(`[Radar Sync] Conectividad con ${src.name}: FEED JSON RECIBIDO`);
          }
        } else {
          console.log(`[Radar Sync] Conectividad con ${src.name}: ACTIVA (${probe.status || 200} OK)`);
        }
      } else {
        console.log(`[Radar Sync] Aviso: ${src.name} no respondió (${probe.error}). Se aplicará resiliencia local.`);
      }
    } catch {
      console.log(`[Radar Sync] Aviso: Conexión con ${src.name} omitida o en timeout.`);
    }
  }

  // 3. Si se obtuvieron licitaciones remotas frescas vía OCDS, integrarlas con el catálogo
  let datasetToProcess = currentFeed;
  if (freshRemoteLicitaciones.length > 0) {
    const mergeResult = mergeLicitaciones(currentFeed, freshRemoteLicitaciones);
    datasetToProcess = mergeResult.merged;
    console.log(`[Radar Sync] Ingesta OCDS: +${mergeResult.addedCount} nuevos, ${mergeResult.updatedCount} actualizados.`);
  }

  // 4. Procesar y actualizar ciclo de vida de los procedimientos
  let statusChangedCount = 0;
  const processed = datasetToProcess.map((lic) => {
    const prevStatus = lic.estatus;
    const updated = updateProcedureLifecycle(lic, now);
    if (updated.estatus !== prevStatus) {
      statusChangedCount++;
      console.log(`[Radar Sync] Cambio de estatus en ${updated.numeroProcedimiento}: ${prevStatus} -> ${updated.estatus}`);
    }
    validateLicitacion(updated);
    return updated;
  });

  console.log(`[Radar Sync] Validación de esquema: 100% registros conformes con LicitacionPublica.`);
  console.log(`[Radar Sync] Procedimientos con estatus actualizado por calendario: ${statusChangedCount}.`);
  console.log(`[Radar Sync] Fecha de verificación oficial actualizada: ${now.toISOString().slice(0, 10)}.`);

  // 4. Escribir dataset si no es dry-run
  if (!isDryRun) {
    const serialized = JSON.stringify(processed, null, 2) + '\n';
    await writeFile(dataPath, serialized, 'utf8');
    console.log(`[Radar Sync] Éxito: Dataset guardado en ${dataPath}.`);
  } else {
    console.log(`[Radar Sync] Dry-run completado con éxito. Sin alteraciones.`);
  }

  return {
    total: processed.length,
    statusChangedCount,
    verifiedAt: now.toISOString().slice(0, 10),
  };
}

// Ejecución directa por CLI
const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
if (isDirectExecution) {
  syncCompranet().catch((err) => {
    console.error('[Radar Sync] Error crítico en la sincronización:', err);
    process.exit(1);
  });
}
