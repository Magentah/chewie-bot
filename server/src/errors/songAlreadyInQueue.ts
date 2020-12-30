export class SongAlreadyInQueueError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SongAlreadyInQueue";
    }
}

export default SongAlreadyInQueueError;
