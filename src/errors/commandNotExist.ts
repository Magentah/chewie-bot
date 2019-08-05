export class CommandNotExist extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CommandNotExist';
    }
}

export default CommandNotExist;
