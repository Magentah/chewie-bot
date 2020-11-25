import Logger, { LogType } from './logger';

export class Lang {
    public static register(key: string, value: string) {
        Logger.info(LogType.Command, key);
    }

    public static get(key: string, ...values: any[]): string {
        return key;
    }
}

