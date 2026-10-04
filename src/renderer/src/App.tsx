import type { AppStatus } from '@shared/api'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

// Temporary start screen: proves that the window, the bridge and the database work.
// It is replaced by the login and the real screens.
export default function App() {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api
      .getStatus()
      .then(setStatus)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-8 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm font-medium">
          Centro de Atención Infantil Manuelita Sáenz
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Sistema administrativo
        </h1>
      </header>

      {error && (
        <p className="text-destructive flex items-center gap-2 text-sm">
          <CircleAlert className="size-4" />
          No se pudo leer la base de datos: {error}
        </p>
      )}

      {status && (
        <section className="bg-card flex flex-col gap-5 rounded-lg border p-6">
          <p className="text-success flex items-center gap-2 text-sm font-medium">
            <CircleCheck className="size-4" />
            Base de datos lista, con {status.tableCount} tablas
          </p>
          <dl className="grid grid-cols-[11rem_1fr] gap-x-6 gap-y-3 text-sm">
            <Row label="Año escolar activo">{status.activeSchoolYear ?? 'Ninguno'}</Row>
            <Row label="Maternales">{status.levels.join(', ')}</Row>
            <Row label="Conceptos de cobro">{status.concepts.join(', ')}</Row>
            <Row label="Formas de pago">{status.paymentMethods.join(', ')}</Row>
            <Row label="Bancos">{status.bankCount}</Row>
            <Row label="Usuaria">{status.hasUser ? 'Creada' : 'Sin crear'}</Row>
            <Row label="Archivo">
              <span className="font-mono text-xs break-all">{status.databasePath}</span>
            </Row>
          </dl>
        </section>
      )}
    </main>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  )
}
