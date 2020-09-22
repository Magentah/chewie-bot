import * as Crypto from "crypto";
import { verify } from "jsonwebtoken";
import { CertSigningKey, RsaSigningKey } from "jwks-rsa";
import * as jwks from "jwks-rsa";
import { ITwitchIDToken } from "../models/twitchApi";
import Constants from "../constants";
import * as Config from "../config.json";

export class CryptoHelper {
    private static algorithm: string = "aes-256-cbc";
    private static secret: string = Config.secretKey;
    private static nonceSize: number = 16;
    private static keySize: number = 32;
    private static pbkdf2SaltSize: number = 16;
    private static pbkdf2Iterations: number = 32767;
    private static pbkdf2Name: string = "sha256";

    public static generateSecret(): string {
        return Crypto.randomBytes(this.keySize).toString("base64");
    }

    public static generateNonce(): string {
        return Crypto.randomBytes(this.keySize).toString("base64");
    }

    /**
     * Returns an encrypted string.
     * @param text String to encrypt.
     */
    public static encryptString(text: string): string {
        const salt = Crypto.randomBytes(this.pbkdf2SaltSize);
        const key = Crypto.pbkdf2Sync(
            Buffer.from(this.secret, "utf8"),
            salt,
            this.pbkdf2Iterations,
            this.keySize,
            this.pbkdf2Name
        );
        const cipherText = Buffer.concat([salt, this.encrypt(Buffer.from(text, "utf8"), key)]);
        return cipherText.toString("base64");
    }

    /**
     * Returns a decrypted string.
     * @param text String to decrypt.
     */
    public static decryptString(text: string): string {
        const cipherTextAndNonceAndSalt = Buffer.from(text, "base64");
        const salt = cipherTextAndNonceAndSalt.slice(0, this.pbkdf2SaltSize);
        const cipherAndNonce = cipherTextAndNonceAndSalt.slice(this.pbkdf2SaltSize);
        const key = Crypto.pbkdf2Sync(
            Buffer.from(this.secret, "utf8"),
            salt,
            this.pbkdf2Iterations,
            this.keySize,
            this.pbkdf2Name
        );
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

    /**
     * Verifies a Twitch.tv OAuth ID Token and returns the decoded token object.
     * @param token Twitch.tv OAuth ID token to verify and decode.
     */
    public static async verifyTwitchJWT(token: string, nonce: string): Promise<ITwitchIDToken> {
        return new Promise<ITwitchIDToken>((resolve, reject) => {
            const jwksClient = jwks({
                jwksUri: Constants.TwitchJWKUri,
            });

            function getKey(header: any, callback: any) {
                jwksClient.getSigningKey(header.kid, (err, key: CertSigningKey | RsaSigningKey) => {
                    if ("publicKey" in key) {
                        callback(undefined, (key as CertSigningKey).publicKey);
                    } else if ("rsaPublicKey" in key) {
                        callback(undefined, (key as RsaSigningKey).rsaPublicKey);
                    }
                });
            }
            verify(token, getKey, undefined, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    const parsedToken = decoded as ITwitchIDToken;
                    if (parsedToken.aud !== Config.twitch.clientId && parsedToken.nonce !== nonce) {
                        reject("ID Token failed verification.");
                    } else {
                        resolve(decoded as ITwitchIDToken);
                    }
                }
            });
        });
    }
}

export default CryptoHelper;
