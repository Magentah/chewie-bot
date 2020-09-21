import { injectable } from "inversify";
import * as NodeCache from "node-cache";
import { Logger, LogType } from "../logger";

export enum CacheType {
    OAuth,
}

@injectable()
export class CacheService {
    private caches: Map<CacheType, any>;

    constructor() {
        this.caches = new Map();
        this.caches.set(
            CacheType.OAuth,
            new NodeCache({
                stdTTL: 60,
                deleteOnExpire: true,
                checkperiod: 600,
            })
        );
    }

    public set(cacheType: CacheType, key: any, value: any) {
        const cache = this.caches.get(cacheType);
        if (cache) {
            cache.set(key, value, (err: any, success: any) => {
                if (!err && success) {
                    Logger.info(
                        LogType.Cache,
                        `[SET]:: Cache[${cacheType}] - ${key} / ${value}`
                    );
                } else if (err) {
                    Logger.err(
                        LogType.Cache,
                        `[SET]:: Cache[${cacheType}] - ${key} / ${value} --- ${err}`
                    );
                    throw err;
                }
            });
        }
    }

    public get(cacheType: CacheType, key: any): any {
        const cache = this.caches.get(cacheType);
        if (cache) {
            const value = cache.get(key);
            Logger.info(
                LogType.Cache,
                `[GET]:: Cache[${cacheType}] - ${key} / ${value}`
            );
            return value;
        }
    }
}

export default CacheService;
