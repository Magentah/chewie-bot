import * as sqlite from 'sqlite3';
import { Logger } from '@overnightjs/logger';
import { injectable, inject } from 'inversify';



@injectable()
class DatabaseService {
    private readonly UNDEFINED_DATABASE = 'Database has not been initialized.';

    private db?: sqlite.Database;
    constructor() {
        // Empty
    }

    public initDatabase(path: string): void {
        if (this.db === undefined) {
            Logger.Info(`Initializing database: ${path}`);
            this.db = new sqlite.Database(path, (err) => {
                if (err) {
                    Logger.Err(err);
                }
            });
        }
    }

    public asyncRun(query: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.db !== undefined) {
                Logger.Info(`${query} // ${params}`);
                this.db.run(query, params, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
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
