/**
 * Firestore in-memory mínimo para testes do Trail Engine (tx + docs + where).
 * Não é um emulador completo — cobre o contrato usado por `advance`.
 */

type DocData = Record<string, unknown>

type DocSnap = {
  id: string
  exists: boolean
  data: () => DocData | undefined
}

type QuerySnap = {
  docs: DocSnap[]
  empty: boolean
}

type DocRef = {
  id: string
  path: string
  get: () => Promise<DocSnap>
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>
  update: (data: DocData) => Promise<void>
}

type Query = {
  where: (field: string, op: string, value: unknown) => Query
  get: () => Promise<QuerySnap>
}

function pathKey(collection: string, id: string): string {
  return `${collection}/${id}`
}

export function createMemoryFirestore(): {
  db: FirebaseFirestore.Firestore
  seed: (collection: string, id: string, data: DocData) => void
  getData: (collection: string, id: string) => DocData | undefined
} {
  const store = new Map<string, DocData>()

  function makeSnap(collection: string, id: string): DocSnap {
    const key = pathKey(collection, id)
    const data = store.get(key)
    return {
      id,
      exists: data !== undefined,
      data: () => (data !== undefined ? { ...data } : undefined),
    }
  }

  function makeDocRef(collection: string, id: string): DocRef {
    const path = pathKey(collection, id)
    return {
      id,
      path,
      get: async () => makeSnap(collection, id),
      set: async (data, opts) => {
        if (opts?.merge && store.has(path)) {
          store.set(path, { ...store.get(path)!, ...data })
        } else {
          store.set(path, { ...data })
        }
      },
      update: async (data) => {
        if (!store.has(path)) throw new Error(`No document to update: ${path}`)
        store.set(path, { ...store.get(path)!, ...data })
      },
    }
  }

  function makeQuery(collection: string, filters: Array<[string, unknown]> = []): Query {
    const self: Query = {
      where(field: string, _op: string, value: unknown) {
        return makeQuery(collection, [...filters, [field, value]])
      },
      async get() {
        const prefix = `${collection}/`
        const docs: DocSnap[] = []
        for (const [key, data] of store.entries()) {
          if (!key.startsWith(prefix)) continue
          const id = key.slice(prefix.length)
          const match = filters.every(([field, value]) => data[field] === value)
          if (match) {
            docs.push({
              id,
              exists: true,
              data: () => ({ ...data }),
            })
          }
        }
        return { docs, empty: docs.length === 0 }
      },
    }
    return self
  }

  type TxWrite =
    | { kind: 'set'; path: string; data: DocData; merge?: boolean }
    | { kind: 'update'; path: string; data: DocData }

  const db = {
    collection(collection: string) {
      return {
        doc(id: string) {
          return makeDocRef(collection, id)
        },
        where(field: string, op: string, value: unknown) {
          return makeQuery(collection, [[field, value]])
        },
      }
    },
    async runTransaction<T>(
      fn: (tx: {
        get: (ref: DocRef | Query) => Promise<DocSnap | QuerySnap>
        set: (ref: DocRef, data: DocData, opts?: { merge?: boolean }) => void
        update: (ref: DocRef, data: DocData) => void
      }) => Promise<T>,
    ): Promise<T> {
      const pending: TxWrite[] = []
      const tx = {
        async get(ref: DocRef | Query) {
          if ('path' in ref && typeof (ref as DocRef).get === 'function' && 'id' in ref) {
            const docRef = ref as DocRef
            const [collection, ...rest] = docRef.path.split('/')
            const id = rest.join('/')
            // Read from store directly (including uncommitted? we use store for simplicity)
            return makeSnap(collection, id)
          }
          return (ref as Query).get()
        },
        set(ref: DocRef, data: DocData, opts?: { merge?: boolean }) {
          pending.push({
            kind: 'set',
            path: ref.path,
            data: { ...data },
            merge: opts?.merge,
          })
        },
        update(ref: DocRef, data: DocData) {
          pending.push({ kind: 'update', path: ref.path, data: { ...data } })
        },
      }

      const result = await fn(tx)

      for (const w of pending) {
        if (w.kind === 'set') {
          if (w.merge && store.has(w.path)) {
            store.set(w.path, { ...store.get(w.path)!, ...w.data })
          } else {
            store.set(w.path, { ...w.data })
          }
        } else {
          if (!store.has(w.path)) throw new Error(`No document to update: ${w.path}`)
          store.set(w.path, { ...store.get(w.path)!, ...w.data })
        }
      }

      return result
    },
  }

  return {
    db: db as unknown as FirebaseFirestore.Firestore,
    seed(collection, id, data) {
      store.set(pathKey(collection, id), { ...data })
    },
    getData(collection, id) {
      const d = store.get(pathKey(collection, id))
      return d ? { ...d } : undefined
    },
  }
}

// Silence unused namespace for type-only FirebaseFirestore
declare namespace FirebaseFirestore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Firestore = any
}
