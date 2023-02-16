import type { Document } from 'mongodb'

export interface SyncOptions {
  mapper?: (doc: Document) => Document
  schemaName?: string
  tableName?: string
}

export interface Override extends Record<string, any> {
  path: string
  flags?: string[]
}

export interface ConvertOptions {
  omit?: string[]
  overrides?: Override[]
}

export type Events = 'process' | 'error'
