export class CommandInternalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CommandInternal';
    }
}

export default CommandInternalError;
