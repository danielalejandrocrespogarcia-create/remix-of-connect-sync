export const TRAYECTOS = ["Trayecto 1", "Trayecto 2", "Trayecto 3", "Trayecto 4"];
export const SECCIONES = ["1", "2", "3", "4", "5"];

export const buildSectionLabel = (trayecto: string, seccion: string) => `${trayecto} - Sección ${seccion}`;

export const ALL_SECTION_OPTIONS = TRAYECTOS.flatMap((trayecto) =>
  SECCIONES.map((seccion) => buildSectionLabel(trayecto, seccion))
);

export const DEFAULT_SECTION = ALL_SECTION_OPTIONS[0];
