export class InvalidSongUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidSongUrl";
    }
}

export default InvalidSongUrlError;
