export type TeamMember = {
  name: string;
  firstName: string;
  title: string;
  email: string;
  funnelupId: string;
  canUseNancy: boolean;
  canAccessSensitiveDocs: boolean;
  focus?: string;
};

export const TEAM: TeamMember[] = [
  {
    name: "Josué Ríos Vélez",
    firstName: "Josué",
    title: "CEO y Fundador",
    email: "jrios@mrcreditmind.com",
    funnelupId: "GExPJVhaSsEwm8JhHUr5",
    canUseNancy: true,
    canAccessSensitiveDocs: true,
  },
  {
    name: "Héctor Iván Rodríguez",
    firstName: "Héctor",
    title: "COO",
    email: "hirodriguez@mrcreditmind.com",
    funnelupId: "2LWFMOwIofOAtcXopxYe",
    canUseNancy: true,
    canAccessSensitiveDocs: true,
  },
  {
    name: "Henry Lucena",
    firstName: "Henry",
    title: "IT & CMO",
    email: "henrylucena7@gmail.com",
    funnelupId: "Es2gMnFAqdQKDFhVQxpv",
    canUseNancy: true,
    canAccessSensitiveDocs: true,
  },
  {
    name: "María Pulido",
    firstName: "María",
    title: "Especialista en Funding",
    email: "mpulido@mrcreditmind.com",
    funnelupId: "0jPwOMEigJVra1JjrpEj",
    canUseNancy: true,
    canAccessSensitiveDocs: true,
    focus: "funding",
  },
  {
    name: "Emmanuel Ríos",
    firstName: "Emmanuel",
    title: "Especialista en Company Formation y Reparación de Crédito",
    email: "erios@mrcreditmind.com",
    funnelupId: "hMB07yOygPlrQR1jOgf3",
    canUseNancy: true,
    canAccessSensitiveDocs: true,
    focus: "company_formation_credit",
  },
  {
    name: "Oscar Camacho",
    firstName: "Oscar",
    title: "Empleado General",
    email: "ocamacho@mrcreditmind.com",
    funnelupId: "W2APWGigFE4EKWyuLhXm",
    canUseNancy: true,
    canAccessSensitiveDocs: false,
  },
  {
    name: "Gerald Pérez",
    firstName: "Gerald",
    title: "Vendedor",
    email: "perezgerald17@gmail.com",
    funnelupId: "dcXrWANP55kn99bSw7PJ",
    canUseNancy: false,
    canAccessSensitiveDocs: false,
  },
];

export function getTeamMember(email: string): TeamMember | null {
  const normalized = email.trim().toLowerCase();
  return TEAM.find((m) => m.email.toLowerCase() === normalized) ?? null;
}

export function buildUserSystemContext(member: TeamMember): string {
  const lines = [
    `USUARIO ACTUAL: ${member.name} — ${member.title}.`,
    `Dirígete a él/ella como "${member.firstName}".`,
  ];

  if (!member.canAccessSensitiveDocs) {
    lines.push(
      "RESTRICCIÓN DE ACCESO: Este usuario NO está autorizado para ver documentos sensibles de clientes (ID personal, SSN, pasaporte, estados de cuenta, contratos firmados, ni el contenido de carpetas de onboarding en Drive). Si la consulta requiere esos datos, indica que no tienes autorización para mostrárselos a este usuario y sugiere que contacte a un administrador."
    );
  }

  if (member.focus === "funding") {
    lines.push("Este usuario trabaja principalmente en el área de Funding Program.");
  }

  if (member.focus === "company_formation_credit") {
    lines.push("Este usuario trabaja en Company Formation y Reparación de Crédito.");
  }

  return lines.join(" ");
}
