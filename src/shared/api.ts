// Contract between the main process and the renderer, exposed as `window.api`.

export interface AppStatus {
  databasePath: string
  tableCount: number
  activeSchoolYear: string | null
  levels: string[]
  concepts: string[]
  paymentMethods: string[]
  bankCount: number
  hasUser: boolean
}

export interface Api {
  getStatus(): Promise<AppStatus>
}

export const IPC = {
  getStatus: 'app:get-status'
} as const
