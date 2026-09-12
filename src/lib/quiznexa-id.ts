import { randomBytes } from "crypto";

export function createQuizNexaId(role: "ADMIN" | "CONTROLLER") {
  return `QN-${role === "ADMIN" ? "ADM" : "CTL"}-${randomBytes(4).toString("hex").toUpperCase()}`;
}