export class DatabaseNotInitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseNotInit";
    }
}

export default DatabaseNotInitError;
