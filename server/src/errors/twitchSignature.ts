export class TwitchMessageSignatureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TwitchMessageSignature";
    }
}

export default TwitchMessageSignatureError;
