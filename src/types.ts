import { JSONSchema } from 'mongochangestream'

export interface ImmutableOption {
  /**
   * If the collection is immutable set this to true. This allows batch processing
   * where all change stream events are assumed to be inserts.
   */
  immutable?: boolean
}

export interface SyncOptions {
  schemaName?: string
  tableName?: string
  /** Nested paths should be dotted */
  rename?: Record<string, string>
}

export interface Override extends Record<string, any> {
  path: string
  mapper?: (obj: JSONSchema, path: string) => JSONSchema
  flags?: string[]
}

export interface ConvertOptions {
  omit?: string[]
  overrides?: Override[]
  /** Nested paths should be dotted */
  rename?: Record<string, string>
}

export type Events = 'process' | 'error'
