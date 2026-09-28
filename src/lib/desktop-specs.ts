export interface DesktopSystemRequirement {
  label: string;
  minimum: string;
  recommended: string;
}

export interface DesktopSpecification {
  version: string;
  releaseDate: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  platform: string;
  architecture: string;
  installerType: string;
  isSigned: boolean;
  signatureDetails: string;
  sha512: string;
  customProtocol: string;
  downloadUrl: string;
  githubReleaseUrl: string;
  requirements: DesktopSystemRequirement[];
}

export const DESKTOP_SPECS: DesktopSpecification = {
  version: '1.0.0-rc.16',
  releaseDate: 'Septiembre 2026',
  fileName: 'Lex-Corporativo-Setup-1.0.0-rc.16.exe',
  fileSizeBytes: 359890543,
  fileSizeFormatted: '343.2 MB',
  platform: 'Windows 10 / Windows 11',
  architecture: 'x64 (64-bit)',
  installerType: 'Instalador NSIS asistido',
  isSigned: true,
  signatureDetails: 'Firma digital de código y binario verificada',
  sha512: 'zsVRZ7DLqotwpilHqiYdllsq/yYcqoT4lKDnZDd7o8pZ/VCCqe7D/upNosLcE3RO8HgiaUW01o+B1YtPiUvjqw==',
  customProtocol: 'lexcorp://',
  downloadUrl: 'https://github.com/elbuilder77/Lex-Corporativo-Desktop-app/releases/download/v1.0.0-rc.16/Lex-Corporativo-Setup-1.0.0-rc.16.exe',
  githubReleaseUrl: 'https://github.com/elbuilder77/Lex-Corporativo-Desktop-app/releases/tag/v1.0.0-rc.16',
  requirements: [
    { label: 'Sistema Operativo', minimum: 'Windows 10 (64-bit) v1903+', recommended: 'Windows 11 (64-bit) actualizado' },
    { label: 'Procesador (CPU)', minimum: 'Intel Core i3 / AMD Ryzen 3 (2.0 GHz)', recommended: 'Intel Core i5 / AMD Ryzen 5 o superior' },
    { label: 'Memoria RAM', minimum: '4 GB RAM disponibles', recommended: '8 GB RAM o superior' },
    { label: 'Almacenamiento', minimum: '1.5 GB espacio libre en disco', recommended: 'SSD con 3 GB espacio libre' },
    { label: 'Conectividad', minimum: 'No requerida para operación local', recommended: 'Conexión a internet para funciones BYOK opcionales' },
  ],
};

export const DESKTOP_AREAS = [
  {
    code: 'mercantil',
    name: 'Mercantil y Corporativo',
    description: 'Auditoría de contratos comerciales, acuerdos de socios, actas de asamblea, poderes notariales, títulos de crédito y gobierno societario.',
    laws: ['Código de Comercio (CCom)', 'Ley General de Sociedades Mercantiles (LGSM)', 'Ley General de Títulos y Operaciones de Crédito (LGTOC)'],
  },
  {
    code: 'laboral',
    name: 'Laboral y Relaciones de Trabajo',
    description: 'Auditoría y redacción de contratos individuales, adendas de teletrabajo, acuerdos de confidencialidad, actas administrativas y convenios de terminación.',
    laws: ['Ley Federal del Trabajo (LFT)'],
  },
  {
    code: 'comercio_exterior',
    name: 'Comercio Exterior y Contratos Globales',
    description: 'Auditoría de compraventas internacionales, contratos de distribución transfronteriza, términos Incoterms 2020 y coordinación logística.',
    laws: ['Ley de Comercio Exterior (LCE)', 'Reglamento de la Ley de Comercio Exterior (RLCE)'],
  },
  {
    code: 'aduanal',
    name: 'Aduanal y Despacho',
    description: 'Auditoría de mandatos aduanales, contratos de intermediación, expedientes de pedimento, valor en aduana y cumplimiento normativo.',
    laws: ['Ley Aduanera (LA)', 'Reglamento de la Ley Aduanera (RLA)', 'LIGIE', 'Reglas Generales de Comercio Exterior 2026 (RGCE)'],
  },
  {
    code: 'fiscal',
    name: 'Fiscal y Patrimonial',
    description: 'Auditoría de contratos con estipulaciones fiscales, contratos de mutuo con interés, reconocimientos de adeudo y soporte documental.',
    laws: ['Código Fiscal de la Federación (CFF)', 'Ley del Impuesto sobre la Renta (LISR)', 'Ley del Impuesto al Valor Agregado (LIVA)', 'Reglamento LISR', 'Reglamento LIVA', 'Resolución Miscelánea Fiscal 2026 (RMF)'],
  },
];
