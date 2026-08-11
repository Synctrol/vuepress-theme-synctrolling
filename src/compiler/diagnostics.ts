export type DiagnosticSeverity = 'error' | 'warning'

export interface SynctrolDiagnostic {
  severity: DiagnosticSeverity
  code: string
  message: string
  path?: string
  relatedPath?: string
}

export class SynctrolDiagnosticError extends Error {
  readonly diagnostics: SynctrolDiagnostic[]

  constructor(diagnostics: SynctrolDiagnostic[]) {
    const first = diagnostics[0]
    super(first ? `${first.code}: ${first.message}` : 'Synctrol diagnostic error')
    this.name = 'SynctrolDiagnosticError'
    this.diagnostics = diagnostics
  }
}

export function createDiagnostic(
  diagnostic: SynctrolDiagnostic,
): SynctrolDiagnostic {
  return { ...diagnostic }
}

export function fail(diagnostic: SynctrolDiagnostic): never {
  throw new SynctrolDiagnosticError([createDiagnostic(diagnostic)])
}

export function isDiagnosticError(
  error: unknown,
): error is SynctrolDiagnosticError {
  return error instanceof SynctrolDiagnosticError
}
