import { Knex as KnexOriginal } from 'knex';

declare module 'knex' {
  namespace Knex {
    interface QueryBuilder {
        fulltextSearch<TRecord, TResult>(value: string, columns: string[]): KnexOriginal.QueryBuilder<TRecord, TResult>;
    }
  }
}
