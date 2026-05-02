import type {
  CopilotAction,
  CopilotContextItem,
  CopilotContextMetric,
  CopilotHistoryItem,
  CopilotMessage,
} from "./types";

export const mockHistory: CopilotHistoryItem[] = [
  {
    id: "lead-maria",
    title: "Maria Rodriguez",
    source: "WhatsApp",
    status: "Activo",
    time: "Hace 8 min",
    summary: "Quiere comparar opciones para reparar credito y comprar casa.",
  },
  {
    id: "lead-carlos",
    title: "Carlos Medina",
    source: "Formulario",
    status: "Pendiente",
    time: "Hace 24 min",
    summary: "Pidio seguimiento sobre requisitos para financiamiento.",
  },
  {
    id: "lead-sofia",
    title: "Sofia Rivera",
    source: "Instagram",
    status: "Activo",
    time: "10:42 AM",
    summary: "Interes alto en plan de monitoreo y consulta inicial.",
  },
  {
    id: "lead-jose",
    title: "Jose Santiago",
    source: "Referral",
    status: "Cerrado",
    time: "Ayer",
    summary: "Ya recibio propuesta y necesita recordatorio el viernes.",
  },
];

export const mockMessages: CopilotMessage[] = [
  {
    id: "msg-1",
    role: "user",
    author: "Equipo",
    time: "11:16 AM",
    content: "Nancy, revisa este lead y dime cual seria el proximo mejor paso.",
  },
  {
    id: "msg-2",
    role: "assistant",
    author: "Nancy Copilot",
    time: "11:16 AM",
    content:
      "El lead muestra intencion alta: menciona compra de casa, urgencia de credito y disponibilidad esta semana. Recomiendo responder con una invitacion directa a evaluacion y pedir autorizacion para revisar documentos.",
  },
  {
    id: "msg-3",
    role: "user",
    author: "Equipo",
    time: "11:18 AM",
    content: "Prepara un borrador corto para seguimiento por WhatsApp.",
  },
  {
    id: "msg-4",
    role: "assistant",
    author: "Nancy Copilot",
    time: "11:18 AM",
    content:
      "Claro. Borrador: Hola Maria, gracias por compartir tu meta de comprar casa. El mejor proximo paso es revisar tu perfil de credito y confirmar que documentos tienes disponibles. Puedo ayudarte a separar una evaluacion esta semana.",
  },
];

export const mockMetrics: CopilotContextMetric[] = [
  { label: "Intento", value: "Alto", tone: "success" },
  { label: "Fuente", value: "WhatsApp", tone: "info" },
  { label: "Prioridad", value: "Hoy", tone: "warning" },
];

export const mockContext: CopilotContextItem[] = [
  { label: "Lead activo", value: "Maria Rodriguez" },
  { label: "Servicio sugerido", value: "Reparacion de credito + roadmap hipotecario" },
  { label: "Ultima senal", value: "Quiere saber si puede cualificar en 90 dias" },
  { label: "Dato faltante", value: "Ingreso mensual y documentos disponibles" },
];

export const mockActions: CopilotAction[] = [
  {
    id: "action-1",
    label: "Enviar seguimiento",
    detail: "Mensaje corto con CTA a evaluacion inicial.",
    status: "Borrador",
  },
  {
    id: "action-2",
    label: "Preparar checklist",
    detail: "Documentos necesarios para revision de credito.",
    status: "Listo",
  },
  {
    id: "action-3",
    label: "Revisar elegibilidad",
    detail: "Depende de datos de FunnelUp y hoja de seguimiento.",
    status: "Revisar",
  },
];
