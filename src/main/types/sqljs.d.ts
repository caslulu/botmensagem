declare module 'sql.js' {
  export type Statement = {
    bind(params?: Array<string | number | null>): void;
    step(): boolean;
    getAsObject<T = any>(): T;
    free(): void;
    run?(sql?: string, params?: Array<string | number | null>): void;
  };

  export interface Database {
    prepare(sql: string): Statement;
    run(sql: string, params?: Array<string | number | null>): void;
    exec(sql: string): Array<Record<string, unknown>>;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string, prefix: string) => string;
  }

  export interface SqlJsStatic {
    Database: new (...args: any[]) => Database;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
