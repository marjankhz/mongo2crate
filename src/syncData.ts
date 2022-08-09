import {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
} from 'mongodb'
import { default as Redis } from 'ioredis'
import mongoChangeStream from 'mongochangestream'
import { stats } from 'print-stats'
import _ from 'lodash/fp.js'
import { QueueOptions } from 'prom-utils'
import { Crate, ErrorResult, QueryResult } from './crate.js'
import { renameKey } from './util.js'
import { rateLimit } from 'prom-utils'

export const initSync = (
  redis: Redis,
  crate: Crate,
  collection: Collection
) => {
  const dbStats = stats()
  const tableName = collection.collectionName
  const handleResult = (result: QueryResult | ErrorResult) => {
    if ('rowcount' in result) {
      dbStats.incRows(result.rowcount)
    } else {
      console.error('ERROR %O', result)
      dbStats.incErrors()
    }
  }
  const processRecord = async (doc: ChangeStreamDocument) => {
    try {
      if (doc.operationType === 'insert') {
        const document = renameKey(doc.fullDocument, '_id', 'id')
        const result = await crate.insert(tableName, document)
        handleResult(result)
      } else if (doc.operationType === 'update') {
        const document = renameKey(doc.fullDocument || {}, '_id', 'id')
        const { updatedFields, removedFields } = doc.updateDescription
        const removed =
          removedFields &&
          _.zipObject(removedFields, _.repeat(removedFields.length, 'NULL'))
        const update = { ...updatedFields, ...removed }
        const result = await crate.upsert(tableName, document, update)
        handleResult(result)
      } else if (doc.operationType === 'delete') {
        const id = doc.documentKey._id.toString()
        const result = await crate.deleteById(tableName, id)
        handleResult(result)
      }
    } catch (e) {
      console.error('ERROR', e)
    }
    dbStats.print()
  }

  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
    try {
      const limiter = rateLimit(10)
      for (const doc of docs) {
        const document = renameKey(doc.fullDocument, '_id', 'id')
        await limiter.add(crate.insert(tableName, document).then(handleResult))
      }
      await limiter.finish()
    } catch (e) {
      console.error('ERROR', e)
    }
    dbStats.print()
  }

  const sync = mongoChangeStream.initSync(redis)
  const processChangeStream = () =>
    sync.processChangeStream(collection, processRecord)
  const runInitialScan = (options?: QueueOptions) =>
    sync.runInitialScan(collection, processRecords, options)

  return { processChangeStream, runInitialScan }
}
