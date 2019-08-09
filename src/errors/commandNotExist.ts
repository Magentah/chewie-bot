export class CommandNotExistError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CommandNotExist';
    }
}

export default CommandNotExistError;
