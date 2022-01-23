import * as Crypto from "crypto";
import * as Config from "../config.json";

export class CryptoHelper {
    private static algorithm: string = "aes-256-cbc";
    private static secret: string = Config.secretKey;
    private static nonceSize: number = 16;
    private static keySize: number = 32;
    private static pbkdf2SaltSize: number = 16;
    private static pbkdf2Iterations: number = 4096;
    private static pbkdf2Name: string = "sha256";

    public static getSecret(): string {
        return Config.secretKey;
    }

    public static generateNonce(): string {
        return Crypto.randomBytes(this.keySize).toString("base64");
    }

    /**
     * Returns an encrypted string.
     * @param text String to encrypt.
     */
    public static encryptString(text: string | undefined): string {
        if (!text) {
            return "";
        }

        const salt = Crypto.randomBytes(this.pbkdf2SaltSize);
        const key = Crypto.pbkdf2Sync(Buffer.from(this.secret, "utf8"), salt, this.pbkdf2Iterations, this.keySize, this.pbkdf2Name);
        const cipherText = Buffer.concat([salt, this.encrypt(Buffer.from(text, "utf8"), key)]);
        return cipherText.toString("base64");
    }

    /**
     * Returns a decrypted string.
     * @param text String to decrypt.
     */
    public static decryptString(text: string | undefined): string {
        if (!text) {
            return "";
        }

        const cipherTextAndNonceAndSalt = Buffer.from(text, "base64");
        const salt = cipherTextAndNonceAndSalt.slice(0, this.pbkdf2SaltSize);
        const cipherAndNonce = cipherTextAndNonceAndSalt.slice(this.pbkdf2SaltSize);
        const key = Crypto.pbkdf2Sync(Buffer.from(this.secret, "utf8"), salt, this.pbkdf2Iterations, this.keySize, this.pbkdf2Name);
        return this.decrypt(cipherAndNonce, key).toString("utf8");
    }

    private static encrypt(text: Buffer, key: Buffer): Buffer {
        const nonce = Crypto.randomBytes(this.nonceSize);
        const cipher = Crypto.createCipheriv(this.algorithm, key, nonce);
        const cipherText = Buffer.concat([cipher.update(text), cipher.final()]);
        return Buffer.concat([nonce, cipherText]);
    }

    private static decrypt(text: Buffer, key: Buffer): Buffer {
        const nonce = text.slice(0, this.nonceSize);
        const cipherText = text.slice(this.nonceSize);
        const cipher = Crypto.createDecipheriv(this.algorithm, key, nonce);
        return Buffer.concat([cipher.update(cipherText), cipher.final()]);
    }
}

export default CryptoHelper;
