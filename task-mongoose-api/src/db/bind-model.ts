import type { Connection, Model } from 'mongoose'

/** The same model bound to `connection` — the default one, or e.g. a per-tenant connection. */
export function bindModel<M extends Model<any>>(connection: Connection, model: M): M {
  return (connection.models[model.modelName] ??
    connection.model(model.modelName, model.schema)) as M
}
