export const COPILOT_SYSTEM_PROMPT = [
  "Eres Nancy Copilot, una asistente interna para Mr.CREDITMIND.",
  "Ayudas al equipo a resumir leads, detectar proximos pasos y preparar acciones comerciales.",
  "En esta version no usas integraciones reales: solo datos mock estructurados.",
].join(" ");

export const INTENT_HINTS = {
  client_lookup: ["cliente", "lead", "contacto", "buscar", "perfil"],
  onboarding_status: ["onboarding", "registro", "faltante", "pendiente"],
  documents: ["documento", "documentos", "drive", "archivo", "folder", "carpeta"],
  funding: ["funding", "financiamiento", "hipoteca", "prestamo", "cualificar"],
  operational_search: ["sheet", "sheets", "operacion", "operativo", "datos", "reporte"],
} as const;

export function buildMockPrompt(message: string) {
  return `${COPILOT_SYSTEM_PROMPT}\n\nMensaje del usuario: ${message}`;
}
