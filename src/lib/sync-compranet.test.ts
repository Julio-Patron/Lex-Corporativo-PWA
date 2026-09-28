import {
  mergeLicitaciones,
  updateProcedureLifecycle,
  validateLicitacion,
  convertOcdsToLicitacion,
  parseOcdsFeed,
  syncCompranet,
} from '../../scripts/sync-compranet.mjs';
import type { LicitacionPublica } from '../types';

const SAMPLE_LICITACION: LicitacionPublica = {
  id: 'lic-test-001',
  numeroProcedimiento: 'TEST-PROC-2026-01',
  expediente: 'EXP-TEST-001',
  titulo: 'Servicio de prueba para sincronización automatizada de CompraNet',
  descripcion: 'Descripción técnica de prueba para validación de esquema y ciclo de vida.',
  convocante: 'Secretaría de Prueba',
  siglasConvocante: 'SP',
  unidadCompradora: 'Dirección de Recursos Materiales',
  materia: 'servicios',
  caracter: 'nacional',
  tipoProcedimiento: 'licitacion_publica',
  estatus: 'recepcion_propuestas',
  entidadFederativa: 'Ciudad de México',
  fechaPublicacion: '2026-08-01',
  fechaLimitePropuestas: '2026-08-15T12:00:00',
  fechaFallo: '2026-08-30',
  montoEstimado: 10000000,
  moneda: 'MXN',
  marcoLegal: 'LAASSP Art. 26',
  enlaceCompraNet: 'https://comprasmx.buengobierno.gob.mx',
  requisitosClave: ['Opinión 32-D SAT'],
  anexosDisponibles: ['Bases Oficiales'],
};

const SAMPLE_OCDS_RELEASE = {
  ocid: 'ocds-07smqs-123456',
  id: 'release-123456',
  date: '2026-09-20T10:00:00Z',
  tender: {
    id: 'LA-09-SICT-2026-01',
    title: 'Mantenimiento y Conservación de Carreteras Federales Tramo Sur',
    description: 'Servicio especializado de conservación de pavimento y señalización.',
    mainProcurementCategory: 'works',
    procurementMethod: 'open',
    procurementMethodDetails: 'Licitación Pública Nacional Electrónica',
    procuringEntity: {
      id: 'SICT-DGC',
      name: 'Secretaría de Infraestructura, Comunicaciones y Transportes (SICT)',
    },
    value: {
      amount: 45000000,
      currency: 'MXN',
    },
    tenderPeriod: {
      startDate: '2026-09-20T09:00:00Z',
      endDate: '2026-10-30T14:00:00Z',
    },
    enquiryPeriod: {
      startDate: '2026-09-20T09:00:00Z',
      endDate: '2026-10-05T12:00:00Z',
    },
    awardPeriod: {
      startDate: '2026-11-15T12:00:00Z',
    },
    documents: [
      {
        id: 'doc-01',
        title: 'Convocatoria y Bases de Licitación',
        documentType: 'tenderNotice',
        url: 'https://comprasmx.buengobierno.gob.mx/expediente/LA-09-SICT-2026-01',
      },
    ],
  },
};

describe('sync-compranet unit tests', () => {
  describe('validateLicitacion', () => {
    it('valida con éxito una licitación con todos los campos requeridos', () => {
      expect(validateLicitacion(SAMPLE_LICITACION)).toBe(true);
    });

    it('falla si falta un campo obligatorio', () => {
      const invalid = { ...SAMPLE_LICITACION, titulo: '' };
      expect(() => validateLicitacion(invalid)).toThrow(/Campo obligatorio/);
    });

    it('falla si la materia no pertenece al catálogo oficial', () => {
      const invalid = { ...SAMPLE_LICITACION, materia: 'materia_inexistente' as any };
      expect(() => validateLicitacion(invalid)).toThrow(/Materia no válida/);
    });

    it('falla si la moneda no es MXN ni USD', () => {
      const invalid = { ...SAMPLE_LICITACION, moneda: 'EUR' as any };
      expect(() => validateLicitacion(invalid)).toThrow(/Moneda no válida/);
    });
  });

  describe('updateProcedureLifecycle', () => {
    it('mantiene recepcion_propuestas si la fecha límite está en el futuro', () => {
      const futureRef = new Date('2026-08-10T00:00:00Z');
      const updated = updateProcedureLifecycle(SAMPLE_LICITACION, futureRef);

      expect(updated.estatus).toBe('recepcion_propuestas');
      expect(updated.fuenteOficial?.verificadaEl).toBe('2026-08-10');
    });

    it('avanza a evaluacion si la fecha límite ya venció pero aún no llega la fecha de fallo', () => {
      const evalRef = new Date('2026-08-20T00:00:00Z');
      const updated = updateProcedureLifecycle(SAMPLE_LICITACION, evalRef);

      expect(updated.estatus).toBe('evaluacion');
      expect(updated.fuenteOficial?.verificadaEl).toBe('2026-08-20');
    });

    it('avanza a fallo_emitido si la fecha de fallo ya pasó', () => {
      const falloRef = new Date('2026-09-05T00:00:00Z');
      const updated = updateProcedureLifecycle(SAMPLE_LICITACION, falloRef);

      expect(updated.estatus).toBe('fallo_emitido');
    });
  });

  describe('convertOcdsToLicitacion', () => {
    it('convierte un release OCDS/EDCA en una LicitacionPublica conforme', () => {
      const refDate = new Date('2026-09-23T12:00:00Z');
      const converted = convertOcdsToLicitacion(SAMPLE_OCDS_RELEASE, refDate);

      expect(converted.numeroProcedimiento).toBe('LA-09-SICT-2026-01');
      expect(converted.titulo).toContain('Mantenimiento y Conservación');
      expect(converted.materia).toBe('obra_publica');
      expect(converted.caracter).toBe('nacional');
      expect(converted.tipoProcedimiento).toBe('licitacion_publica');
      expect(converted.montoEstimado).toBe(45000000);
      expect(converted.moneda).toBe('MXN');
      expect(converted.estatus).toBe('recepcion_propuestas');
      expect(converted.siglasConvocante).toBe('SICT');
      expect(converted.enlaceCompraNet).toBe('https://comprasmx.buengobierno.gob.mx/expediente/LA-09-SICT-2026-01');
      expect(converted.fuenteOficial?.ambito).toBe('federal');
      expect(converted.fuenteOficial?.verificadaEl).toBe('2026-09-23');
      expect(validateLicitacion(converted)).toBe(true);
    });

    it('soporta registros en formato record.compiledRelease con categorías de bienes y servicios', () => {
      const compiledRecord = {
        compiledRelease: {
          ocid: 'ocds-07smqs-999888',
          tender: {
            id: 'IA-50-IMSS-2026',
            title: 'Adquisición de Insumos Médicos',
            mainProcurementCategory: 'goods',
            procurementMethod: 'selective',
            procurementMethodDetails: 'Invitación a cuando menos tres personas',
            procuringEntity: { name: 'Instituto Mexicano del Seguro Social (IMSS)' },
            value: { amount: 1500000, currency: 'MXN' },
            tenderPeriod: { startDate: '2026-09-10', endDate: '2026-10-15' },
          },
        },
      };

      const converted = convertOcdsToLicitacion(compiledRecord, new Date('2026-09-23'));
      expect(converted.materia).toBe('adquisiciones');
      expect(converted.tipoProcedimiento).toBe('invitacion_tres_personas');
      expect(converted.siglasConvocante).toBe('IMSS');
      expect(validateLicitacion(converted)).toBe(true);
    });

    it('arroja error si el registro no tiene identificador ocid ni tender.id', () => {
      expect(() => convertOcdsToLicitacion({ tender: {} })).toThrow(/carece de identificador/);
    });
  });

  describe('parseOcdsFeed', () => {
    it('extrae y valida múltiples releases de un arreglo o payload con records', () => {
      const payload = {
        records: [
          SAMPLE_OCDS_RELEASE,
          { ocid: 'invalid-record' }, // Inválido sin campos mínimos
        ],
      };

      const results = parseOcdsFeed(payload, new Date('2026-09-23'));
      expect(results).toHaveLength(1);
      expect(results[0].numeroProcedimiento).toBe('LA-09-SICT-2026-01');
    });

    it('devuelve arreglo vacío ante payload nulo o no compatible', () => {
      expect(parseOcdsFeed(null)).toEqual([]);
      expect(parseOcdsFeed('string' as any)).toEqual([]);
    });
  });

  describe('mergeLicitaciones', () => {
    it('actualiza un procedimiento existente sin duplicar su número', () => {
      const existing = [SAMPLE_LICITACION];
      const incoming = [{ ...SAMPLE_LICITACION, descripcion: 'Descripción actualizada' }];

      const result = mergeLicitaciones(existing, incoming);
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].descripcion).toBe('Descripción actualizada');
      expect(result.updatedCount).toBe(1);
      expect(result.addedCount).toBe(0);
    });

    it('agrega nuevos procedimientos preservando los existentes', () => {
      const existing = [SAMPLE_LICITACION];
      const incoming: LicitacionPublica = {
        ...SAMPLE_LICITACION,
        id: 'lic-test-002',
        numeroProcedimiento: 'TEST-PROC-2026-02',
      };

      const result = mergeLicitaciones(existing, [incoming]);
      expect(result.merged).toHaveLength(2);
      expect(result.addedCount).toBe(1);
    });
  });

  describe('syncCompranet execution', () => {
    it('ejecuta en modo dry-run sin arrojar errores', async () => {
      const result = await syncCompranet({ dryRun: true });
      expect(result.total).toBeGreaterThan(15);
      expect(result.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
