import type { AssessmentProcessingStatus } from "../api/types"

export function isProcessingStatus(status: AssessmentProcessingStatus): boolean {
  return status === "queued" || status === "processing"
}

export function processingStatusLabel(status: AssessmentProcessingStatus): string {
  switch (status) {
    case "queued":
      return "En cola"
    case "processing":
      return "Analizando"
    case "failed":
      return "Error"
    default:
      return "Listo"
  }
}
