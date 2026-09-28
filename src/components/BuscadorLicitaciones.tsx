import { memo, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  Filter,
  Flame,
  HardDrive,
  Landmark,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  WifiOff,
  X,
} from 'lucide-react';
import {
  CARACTER_LABELS,
  COMPRANET_PORTAL_URL,
  ESTATUS_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  getAvailableConvocantes,
  getAvailableEntidades,
  getDaysRemaining,
  getLicitacionOfficialSource,
  MATERIA_LABELS,
  TIPO_PROCEDIMIENTO_LABELS,
} from '../lib/licitaciones-catalog';
import { executeLicitacionesSearch } from '../services/licitaciones-search';
import { useUiStore } from '../store/useUiStore';
import { trackEvent } from '../lib/analytics';
import type {
  LicitacionCaracter,
  LicitacionEstatus,
  LicitacionMateria,
  LicitacionPublica,
  LicitacionSearchResult,
} from '../types';

type LicitacionSort = 'cierre_proximo' | 'reciente' | 'monto_mayor' | 'relevancia';

const SORT_LABELS: Record<LicitacionSort, string> = {
  cierre_proximo: 'Cierre más próximo',
  reciente: 'Más reciente',
  monto_mayor: 'Mayor presupuesto',
  relevancia: 'Relevancia',
};

function getInitialSort(value: string | null): LicitacionSort {
  return value && Object.prototype.hasOwnProperty.call(SORT_LABELS, value)
    ? (value as LicitacionSort)
    : 'cierre_proximo';
}

function licitacionPlainText(licitacion: LicitacionPublica): string {
  const daysInfo = getDaysRemaining(licitacion.fechaLimitePropuestas);
  const source = getLicitacionOfficialSource(licitacion);
  const deadline = licitacion.fechaLimitePropuestas
    ? `${formatDateTime(licitacion.fechaLimitePropuestas)} (${daysInfo.label})`
    : 'Por verificar en la fuente oficial';
  return `FICHA DE LICITACIÓN PÚBLICA — MÉXICO
==================================================
Procedimiento: ${licitacion.numeroProcedimiento}
Expediente: ${licitacion.expediente}
Título: ${licitacion.titulo}
Convocante: ${licitacion.convocante} (${licitacion.siglasConvocante})
Unidad Compradora: ${licitacion.unidadCompradora}

Materia: ${MATERIA_LABELS[licitacion.materia]}
Carácter: ${CARACTER_LABELS[licitacion.caracter]}
Tipo: ${TIPO_PROCEDIMIENTO_LABELS[licitacion.tipoProcedimiento]}
Estatus: ${ESTATUS_LABELS[licitacion.estatus]}
Entidad: ${licitacion.entidadFederativa}
Ámbito: ${source.ambito}

FECHAS CRÍTICAS:
- Publicación: ${formatDate(licitacion.fechaPublicacion)}
${licitacion.fechaVisitaSitio ? `- Visita al sitio: ${formatDate(licitacion.fechaVisitaSitio)}\n` : ''}${licitacion.fechaJuntaAclaraciones ? `- Junta de aclaraciones: ${formatDate(licitacion.fechaJuntaAclaraciones)}\n` : ''}- Límite presentación de propuestas: ${deadline}
${licitacion.fechaFallo ? `- Fallo estimado: ${formatDate(licitacion.fechaFallo)}\n` : ''}
PRESUPUESTO:
${licitacion.montoEstimado ? formatCurrency(licitacion.montoEstimado, licitacion.moneda) : 'No especificado'}

MARCO LEGAL:
${licitacion.marcoLegal}

REQUISITOS CLAVE:
${licitacion.requisitosClave.map((r) => `• ${r}`).join('\n')}

Fuente oficial: ${source.nombre}
Verificada por Lex: ${formatDate(source.verificadaEl)}
${source.url}`;
}

interface LicitacionCardProps {
  licitacion: LicitacionPublica;
  isExpanded: boolean;
  isCopied: boolean;
  onToggleExpanded: (id: string) => void;
  onCopy: (licitacion: LicitacionPublica) => void;
  onShare: (licitacion: LicitacionPublica) => void;
}

const LicitacionCard = memo(function LicitacionCard({
  licitacion,
  isExpanded,
  isCopied,
  onToggleExpanded,
  onCopy,
  onShare,
}: LicitacionCardProps) {
  const daysInfo = useMemo(() => getDaysRemaining(licitacion.fechaLimitePropuestas), [licitacion.fechaLimitePropuestas]);
  const source = useMemo(() => getLicitacionOfficialSource(licitacion), [licitacion]);
  const formattedPublicacion = useMemo(() => formatDate(licitacion.fechaPublicacion), [licitacion.fechaPublicacion]);
  const formattedVerificada = useMemo(() => formatDate(source.verificadaEl), [source.verificadaEl]);
  const formattedCurrency = useMemo(
    () => (licitacion.montoEstimado ? formatCurrency(licitacion.montoEstimado, licitacion.moneda) : 'No especificado'),
    [licitacion.montoEstimado, licitacion.moneda],
  );
  const formattedLimite = useMemo(
    () => (licitacion.fechaLimitePropuestas ? formatDate(licitacion.fechaLimitePropuestas) : 'Por verificar'),
    [licitacion.fechaLimitePropuestas],
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:border-slate-300 hover:shadow-premium">
      <div className="p-4 sm:p-5">
        {/* Header Row: Badges + Action Buttons */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          {/* Left: Tags and Deadline */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
              {licitacion.numeroProcedimiento}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              <MapPin size={11} className="text-slate-500" /> {licitacion.entidadFederativa}
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {CARACTER_LABELS[licitacion.caracter]}
            </span>
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold capitalize text-violet-700">
              {source.ambito}
            </span>
            {source.integridad === 'publication_only' && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-200">
                Datos parciales
              </span>
            )}
          </div>

          {/* Deadline Countdown Badge (Right Aligned) */}
          <div
            className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-bold ${
              daysInfo.badgeStyle === 'urgent'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : daysInfo.badgeStyle === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {daysInfo.badgeStyle === 'urgent' ? (
              <Flame size={13} className="text-red-600 animate-pulse" />
            ) : (
              <Clock3 size={13} />
            )}
            <span>{daysInfo.label}</span>
          </div>
        </div>

        {/* Middle Row: Title & Convocante Subtitle */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-snug text-slate-950 sm:text-lg">
              {licitacion.titulo}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span>{licitacion.convocante}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{licitacion.unidadCompradora}</span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-blue-700">
              <ShieldCheck size={12} className="shrink-0" />
              Fuente: {source.nombre} · verificada {formattedVerificada}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1 self-start">
            <button
              type="button"
              onClick={() => onCopy(licitacion)}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Copiar ficha técnica"
              aria-label="Copiar ficha técnica de licitación"
            >
              {isCopied ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onShare(licitacion)}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Compartir licitación"
              aria-label="Compartir licitación"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Key Metrics Grid (4 items) */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <DollarSign size={11} className="text-slate-400" /> Presupuesto
            </span>
            <p className="mt-1 font-mono text-xs font-bold text-slate-900 truncate">
              {formattedCurrency}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Scale size={11} className="text-slate-400" /> Materia
            </span>
            <p className="mt-1 text-xs font-bold text-slate-900 truncate">
              {MATERIA_LABELS[licitacion.materia]}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Calendar size={11} className="text-slate-400" /> Límite
            </span>
            <p className="mt-1 text-xs font-bold text-slate-900">
              {formattedLimite}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Check size={11} className="text-slate-400" /> Estatus
            </span>
            <p className="mt-1 text-xs font-bold text-slate-900 truncate">
              {ESTATUS_LABELS[licitacion.estatus]}
            </p>
          </div>
        </div>

        {/* Description Paragraph */}
        <p
          className={`mt-2 text-xs leading-5 text-slate-700 sm:text-sm ${
            isExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {licitacion.descripcion}
        </p>

        {/* Expanded Content Drawer */}
        {isExpanded && (
          <div
            id={`licitacion-detalle-${licitacion.id}`}
            className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-4"
          >
            {/* Timeline */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                Cronograma del Procedimiento
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                  <span className="text-[10px] font-medium text-slate-500">Publicación</span>
                  <p className="text-xs font-bold text-slate-900">
                    {formattedPublicacion}
                  </p>
                </div>
                {licitacion.fechaVisitaSitio && (
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                    <span className="text-[10px] font-medium text-slate-500">Visita al Sitio</span>
                    <p className="text-xs font-bold text-slate-900">
                      {formatDate(licitacion.fechaVisitaSitio)}
                    </p>
                  </div>
                )}
                {licitacion.fechaJuntaAclaraciones && (
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                    <span className="text-[10px] font-medium text-slate-500">Junta de Aclaraciones</span>
                    <p className="text-xs font-bold text-slate-900">
                      {formatDate(licitacion.fechaJuntaAclaraciones)}
                    </p>
                  </div>
                )}
                <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                  <span className="text-[10px] font-medium text-slate-500">Límite de Propuestas</span>
                  <p className="text-xs font-bold text-slate-900">
                    {licitacion.fechaLimitePropuestas
                      ? formatDateTime(licitacion.fechaLimitePropuestas)
                      : 'Por verificar en la fuente oficial'}
                  </p>
                </div>
                {licitacion.fechaFallo && (
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                    <span className="text-[10px] font-medium text-slate-500">Fallo Estimado</span>
                    <p className="text-xs font-bold text-slate-900">
                      {formatDate(licitacion.fechaFallo)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legal Basis & Requirements */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Scale size={13} className="text-legal-golddark" /> Fundamento Jurídico
                </span>
                <p className="mt-1 text-xs text-slate-700 leading-5">
                  {licitacion.marcoLegal}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileCheck2 size={13} className="text-emerald-700" /> Requisitos Clave
                </span>
                {licitacion.requisitosClave.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-xs text-slate-600">
                    {licitacion.requisitosClave.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Pendientes de verificación en las bases oficiales.
                  </p>
                )}
              </div>
            </div>

            {/* Attachments */}
            {licitacion.anexosDisponibles.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Documentos y anexos en {source.nombre}:
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {licitacion.anexosDisponibles.map((anexo, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                    >
                      <span className="inline-flex items-center gap-1">
                        <FileText size={12} className="text-slate-400" />
                        <span>{anexo}</span>
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => onToggleExpanded(licitacion.id)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 px-4 text-xs font-bold text-slate-800 shadow-card transition active:scale-95 cursor-pointer"
            aria-expanded={isExpanded}
            aria-controls={`licitacion-detalle-${licitacion.id}`}
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {isExpanded ? 'Contraer ficha' : 'Ver requisitos y cronograma completo'}
          </button>

          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 px-4 text-xs font-bold text-slate-800 transition active:scale-95"
          >
            <ExternalLink size={14} /> Ver fuente oficial
          </a>
        </div>
      </div>
    </article>
  );
});

export function BuscadorLicitaciones() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [query, setQuery] = useState(searchParams.get('lq') ?? '');
  const [materia, setMateria] = useState<'todas' | LicitacionMateria>(
    (searchParams.get('materia') as LicitacionMateria) || 'todas',
  );
  const [caracter, setCaracter] = useState<'todos' | LicitacionCaracter>(
    (searchParams.get('caracter') as LicitacionCaracter) || 'todos',
  );
  const [convocante, setConvocante] = useState(searchParams.get('convocante') ?? 'todas');
  const [entidad, setEntidad] = useState(searchParams.get('entidad') ?? 'todas');
  const [estatus, setEstatus] = useState<'todos' | LicitacionEstatus>(
    (searchParams.get('estatus') as LicitacionEstatus) || 'todos',
  );
  const [sortBy, setSortBy] = useState<LicitacionSort>(() => getInitialSort(searchParams.get('orden')));

  const [showFilters, setShowFilters] = useState(false);
  const [result, setResult] = useState<LicitacionSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { isOnline, notify } = useUiStore();

  const availableConvocantes = useMemo(() => getAvailableConvocantes(), []);
  const availableEntidades = useMemo(() => getAvailableEntidades(), []);

  // Count active filters (excluding default values)
  const activeFiltersCount =
    (materia !== 'todas' ? 1 : 0) +
    (caracter !== 'todos' ? 1 : 0) +
    (convocante !== 'todas' ? 1 : 0) +
    (entidad !== 'todas' ? 1 : 0) +
    (estatus !== 'todos' ? 1 : 0) +
    (sortBy !== 'cierre_proximo' ? 1 : 0);

  const hasActiveFilters = query.trim() !== '' || activeFiltersCount > 0;

  const performSearch = async (
    q: string,
    mat: 'todas' | LicitacionMateria,
    car: 'todos' | LicitacionCaracter,
    conv: string,
    ent: string,
    est: 'todos' | LicitacionEstatus,
    sort: LicitacionSort,
  ) => {
    setIsSearching(true);
    try {
      const searchResult = await executeLicitacionesSearch({
        query: q,
        materia: mat,
        caracter: car,
        convocante: conv !== 'todas' ? conv : undefined,
        entidadFederativa: ent !== 'todas' ? ent : undefined,
        estatus: est !== 'todos' ? est : undefined,
        sortBy: sort,
      });
      setResult(searchResult);
      trackEvent('tender_search_performed', {
        query_length: q.trim().length,
        materia: mat,
        caracter: car,
        status: est,
        results_count: searchResult.total,
      });

      const url = new URL(window.location.href);
      if (q.trim()) url.searchParams.set('lq', q.trim());
      else url.searchParams.delete('lq');
      if (mat !== 'todas') url.searchParams.set('materia', mat);
      else url.searchParams.delete('materia');
      if (car !== 'todos') url.searchParams.set('caracter', car);
      else url.searchParams.delete('caracter');
      if (conv !== 'todas') url.searchParams.set('convocante', conv);
      else url.searchParams.delete('convocante');
      if (ent !== 'todas') url.searchParams.set('entidad', ent);
      else url.searchParams.delete('entidad');
      if (est !== 'todos') url.searchParams.set('estatus', est);
      else url.searchParams.delete('estatus');
      if (sort !== 'cierre_proximo') url.searchParams.set('orden', sort);
      else url.searchParams.delete('orden');
      window.history.replaceState(null, '', url);
    } catch {
      notify('No se pudieron cargar las licitaciones.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Initial load - only run when query or filters are explicitly passed in URL
  useEffect(() => {
    if (query.trim() || activeFiltersCount > 0) {
      void performSearch(query, materia, caracter, convocante, entidad, estatus, sortBy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    void performSearch(query, materia, caracter, convocante, entidad, estatus, sortBy);
  };

  const handleFilterChange = (
    nextMateria = materia,
    nextCaracter = caracter,
    nextConvocante = convocante,
    nextEntidad = entidad,
    nextEstatus = estatus,
    nextSort: LicitacionSort = sortBy,
  ) => {
    setMateria(nextMateria);
    setCaracter(nextCaracter);
    setConvocante(nextConvocante);
    setEntidad(nextEntidad);
    setEstatus(nextEstatus);
    setSortBy(nextSort);
    void performSearch(
      query,
      nextMateria,
      nextCaracter,
      nextConvocante,
      nextEntidad,
      nextEstatus,
      nextSort,
    );
  };

  /** Limpia solo filtros, conserva el query */
  const resetFilters = () => {
    setMateria('todas');
    setCaracter('todos');
    setConvocante('todas');
    setEntidad('todas');
    setEstatus('todos');
    setSortBy('cierre_proximo');
    if (query.trim()) {
      void performSearch(query, 'todas', 'todos', 'todas', 'todas', 'todos', 'cierre_proximo');
    } else {
      setResult(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('materia');
      url.searchParams.delete('caracter');
      url.searchParams.delete('convocante');
      url.searchParams.delete('entidad');
      url.searchParams.delete('estatus');
      url.searchParams.delete('orden');
      window.history.replaceState(null, '', url);
    }
  };

  /** Limpia todo: query + filtros */
  const resetAll = () => {
    setQuery('');
    setMateria('todas');
    setCaracter('todos');
    setConvocante('todas');
    setEntidad('todas');
    setEstatus('todos');
    setSortBy('cierre_proximo');
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('lq');
    url.searchParams.delete('materia');
    url.searchParams.delete('caracter');
    url.searchParams.delete('convocante');
    url.searchParams.delete('entidad');
    url.searchParams.delete('estatus');
    url.searchParams.delete('orden');
    window.history.replaceState(null, '', url);
  };

  const handleToggleExpanded = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyLicitacion = useCallback(async (licitacion: LicitacionPublica) => {
    try {
      await navigator.clipboard.writeText(licitacionPlainText(licitacion));
      setCopiedId(licitacion.id);
      window.setTimeout(() => setCopiedId(null), 1800);
      notify('Ficha técnica copiada al portapapeles.', 'success');
    } catch {
      notify('El navegador no permitió copiar el texto.', 'error');
    }
  }, [notify]);

  const shareLicitacion = useCallback(async (licitacion: LicitacionPublica) => {
    try {
      if (navigator.share) {
        const source = getLicitacionOfficialSource(licitacion);
        await navigator.share({
          title: `${licitacion.siglasConvocante} · ${licitacion.numeroProcedimiento}`,
          text: `${licitacion.titulo}\nLímite: ${
            licitacion.fechaLimitePropuestas
              ? formatDateTime(licitacion.fechaLimitePropuestas)
              : 'Por verificar'
          }\n${source.url}`,
        });
      } else {
        await copyLicitacion(licitacion);
      }
    } catch (shareError) {
      if ((shareError as Error).name !== 'AbortError') {
        notify('No fue posible compartir la licitación.', 'error');
      }
    }
  }, [copyLicitacion, notify]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Clean Hero & Search Area */}
      <section className="border-b border-slate-800 bg-legal-shell text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          {/* Header: Title + Live Status */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-xl font-bold leading-tight sm:text-2xl text-white">
              Radar de Licitaciones Públicas en México
            </h1>

            <div
              role="status"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
                isOnline
                  ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-700/60 bg-amber-950/40 text-amber-200'
              }`}
            >
              {isOnline ? <ShieldCheck size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'En línea' : 'Sin conexión'}
            </div>
          </div>

          {/* Integrated Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/90 p-3 shadow-premium"
          >
            <label htmlFor="licitacion-query" className="sr-only">
              ¿Qué licitación, insumo o servicio buscas?
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  id="licitacion-query"
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Buscar licitación por título, descripción, número de procedimiento o convocante"
                  placeholder="Buscar por objeto, insumo, número de procedimiento o convocante..."
                  autoComplete="off"
                  className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-legal-gold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-legal-gold px-5 text-xs font-bold text-slate-950 transition hover:bg-legal-goldhover disabled:cursor-wait disabled:opacity-60"
                >
                  {isSearching ? <LoaderCircle size={16} className="animate-spin" /> : <FileSearch size={16} />} Buscar
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${
                    showFilters || activeFiltersCount > 0
                      ? 'border-legal-gold bg-legal-gold/20 text-legal-gold font-bold'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  aria-expanded={showFilters}
                >
                  <Filter size={15} />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-legal-gold text-[10px] font-bold text-slate-950">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick 1-Touch Materia Pills */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                Materia:
              </span>
              {(Object.entries(MATERIA_LABELS) as Array<['todas' | LicitacionMateria, string]>).map(
                ([key, label]) => {
                  const isActive = materia === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleFilterChange(key, caracter, convocante, entidad, estatus, sortBy)}
                      className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-legal-gold text-slate-950 font-bold shadow-card'
                          : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                },
              )}
            </div>

            {/* Collapsible Structured Filters Bar */}
            {showFilters && (
              <div className="mt-3 grid gap-2 border-t border-slate-700/80 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* 1. Materia */}
                <label className="text-xs font-bold text-slate-300">
                  Materia
                  <select
                    value={materia}
                    onChange={(e) =>
                      handleFilterChange(
                        e.target.value as 'todas' | LicitacionMateria,
                        caracter,
                        convocante,
                        entidad,
                        estatus,
                        sortBy,
                      )
                    }
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    {(Object.entries(MATERIA_LABELS) as Array<['todas' | LicitacionMateria, string]>).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {/* 2. Entidad Federativa (All 32 states + Nacional) */}
                <label className="text-xs font-bold text-slate-300">
                  Entidad Federativa ({availableEntidades.length})
                  <select
                    value={entidad}
                    onChange={(e) =>
                      handleFilterChange(materia, caracter, convocante, e.target.value, estatus, sortBy)
                    }
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    <option value="todas">Todas las 32 entidades</option>
                    {availableEntidades.map((ent) => (
                      <option key={ent} value={ent}>
                        {ent}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 3. Convocante / Dependencia */}
                <label className="text-xs font-bold text-slate-300">
                  Dependencia Convocante
                  <select
                    value={convocante}
                    onChange={(e) =>
                      handleFilterChange(materia, caracter, e.target.value, entidad, estatus, sortBy)
                    }
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    <option value="todas">Todas las dependencias</option>
                    {availableConvocantes.map((c) => (
                      <option key={c.siglas} value={c.siglas}>
                        {c.siglas} · {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 4. Carácter */}
                <label className="text-xs font-bold text-slate-300">
                  Carácter
                  <select
                    value={caracter}
                    onChange={(e) =>
                      handleFilterChange(
                        materia,
                        e.target.value as 'todos' | LicitacionCaracter,
                        convocante,
                        entidad,
                        estatus,
                        sortBy,
                      )
                    }
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    {(Object.entries(CARACTER_LABELS) as Array<['todos' | LicitacionCaracter, string]>).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {/* 5. Etapa */}
                <label className="text-xs font-bold text-slate-300">
                  Etapa del procedimiento
                  <select
                    value={estatus}
                    onChange={(e) =>
                      handleFilterChange(
                        materia,
                        caracter,
                        convocante,
                        entidad,
                        e.target.value as 'todos' | LicitacionEstatus,
                        sortBy,
                      )
                    }
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    {(Object.entries(ESTATUS_LABELS) as Array<['todos' | LicitacionEstatus, string]>).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {/* 6. Ordenamiento */}
                <label className="text-xs font-bold text-slate-300">
                  Ordenar por
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      handleFilterChange(
                        materia,
                        caracter,
                        convocante,
                        entidad,
                        estatus,
                        e.target.value as LicitacionSort,
                      )
                    }
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    <option value="cierre_proximo">Cierre más próximo</option>
                    <option value="reciente">Más reciente</option>
                    <option value="monto_mayor">Mayor presupuesto</option>
                    <option value="relevancia">Relevancia</option>
                  </select>
                </label>
              </div>
            )}

            {/* Active Filter Badges Bar */}
            {activeFiltersCount > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
                <span className="text-[11px] font-bold text-slate-400">Filtros activos:</span>
                {materia !== 'todas' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Materia: {MATERIA_LABELS[materia]}
                    <button
                      type="button"
                      onClick={() => handleFilterChange('todas')}
                      className="hover:text-white"
                      title="Quitar filtro de materia"
                      aria-label="Quitar filtro de materia"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {entidad !== 'todas' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Entidad: {entidad}
                    <button
                      type="button"
                      onClick={() => handleFilterChange(materia, caracter, convocante, 'todas')}
                      className="hover:text-white"
                      title="Quitar filtro de entidad"
                      aria-label="Quitar filtro de entidad"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {convocante !== 'todas' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Convocante: {convocante}
                    <button
                      type="button"
                      onClick={() => handleFilterChange(materia, caracter, 'todas')}
                      className="hover:text-white"
                      title="Quitar filtro de convocante"
                      aria-label="Quitar filtro de convocante"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {caracter !== 'todos' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Carácter: {CARACTER_LABELS[caracter]}
                    <button
                      type="button"
                      onClick={() => handleFilterChange(materia, 'todos')}
                      className="hover:text-white"
                      title="Quitar filtro de carácter"
                      aria-label="Quitar filtro de carácter"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {estatus !== 'todos' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Etapa: {ESTATUS_LABELS[estatus]}
                    <button
                      type="button"
                      onClick={() => handleFilterChange(materia, caracter, convocante, entidad, 'todos')}
                      className="hover:text-white"
                      title="Quitar filtro de etapa"
                      aria-label="Quitar filtro de etapa"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {sortBy !== 'cierre_proximo' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Orden: {SORT_LABELS[sortBy]}
                    <button
                      type="button"
                      onClick={() => handleFilterChange(materia, caracter, convocante, entidad, estatus, 'cierre_proximo')}
                      className="hover:text-white"
                      title="Restablecer orden"
                      aria-label="Restablecer orden"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 ml-1 underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">

        {/* Initial Prompt — visible when no search performed yet */}
        {!result && !isSearching && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Landmark className="mx-auto text-slate-400" size={36} />
            <h2 className="mt-3 text-sm font-bold text-slate-900">
              Explora convocatorias y procedimientos de contratación
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Busca por objeto del contrato, institución convocante o número de expediente oficial.
            </p>
          </div>
        )}

        {/* Results Count & Actions Header */}
        {result && (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-950">
                {result.total} {result.total === 1 ? 'publicación encontrada' : 'publicaciones encontradas'}
                {query.trim() && <span className="font-medium text-slate-700"> para "{result.query}"</span>}
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {result.executionTimeMs} ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw size={12} /> Limpiar búsqueda
                </button>
              )}
              <a
                href={COMPRANET_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800"
              >
                Portal federal <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Empty State */}
        {result && result.licitaciones.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FileSearch className="mx-auto text-slate-400" size={32} />
            <h2 className="mt-2 text-sm font-bold text-slate-900">
              No se encontraron licitaciones con estos criterios
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Prueba modificando las palabras clave, seleccionando "Todas las materias" o quitando los
              filtros de dependencia y entidad.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
            >
              <RotateCcw size={14} /> Restablecer filtros
            </button>
          </div>
        )}

        {/* Tender Cards List */}
        {result && result.licitaciones.length > 0 && (
          <div className="space-y-4" aria-live="polite">
            {result.licitaciones.map((licitacion) => (
              <LicitacionCard
                key={licitacion.id}
                licitacion={licitacion}
                isExpanded={expanded.has(licitacion.id)}
                isCopied={copiedId === licitacion.id}
                onToggleExpanded={handleToggleExpanded}
                onCopy={copyLicitacion}
                onShare={shareLicitacion}
              />
            ))}

            {/* Desktop Complementary Banner */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-card">
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold text-legal-gold flex items-center justify-center sm:justify-start gap-2">
                  <HardDrive size={15} /> ¿Necesitas auditar contratos de proveedores o redactar convenios de licitación?
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lex Corporativo Desktop incluye auditoría contractual, expedientes locales y exportación Word/PDF 100% offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'desktop');
                  window.history.pushState(null, '', url);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0"
              >
                <span>Ficha Técnica Desktop</span>
              </button>
            </div>

            <div className="rounded-xl border border-blue-200/70 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-950">
              <strong>Nota de consulta:</strong> Lex identifica la procedencia y señala expresamente los
              campos pendientes. Antes de presentar propuestas, valida vigencia, bases, aclaraciones y
              modificaciones directamente en la fuente oficial de cada procedimiento.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
