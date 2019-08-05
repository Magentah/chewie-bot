import * as sqlite from 'sqlite3';
import { Logger, LogType } from '../logger';
import { injectable } from 'inversify';

@injectable()
class DatabaseService {
    private readonly UNDEFINED_DATABASE = 'Database has not been initialized.';

    private db?: sqlite.Database;
    constructor() {
        // Empty
    }

    public initDatabase(path: string): void {
        if (this.db === undefined) {
            Logger.notice(LogType.Database, `Initializing database: ${path}`);
            this.db = new sqlite.Database(path, (err) => {
                if (err) {
                    Logger.err(LogType.Database, err.message);
                }
            });
        }
    }

    public async asyncRun(query: string, params?: any[]): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.db !== undefined) {
                Logger.info(LogType.Database, `${query} // ${params}`);
                this.db.run(query, params, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                reject(this.UNDEFINED_DATABASE);
            }
        });
    }

    public asyncGet(query: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.db !== undefined) {
                this.db.get(query, params, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            } else {
                reject(this.UNDEFINED_DATABASE);
            }
        });
    }

    public closeDatabase(): void {
        if (this.db !== undefined) {
            this.db.close();
        }
    }
}

export default DatabaseService;
