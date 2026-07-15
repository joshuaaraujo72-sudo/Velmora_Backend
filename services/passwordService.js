import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const iterations = 120000;
const keyLength = 64;
const digest = "sha512";

export function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");

    return `${iterations}:${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
    const [storedIterations, salt, storedHash] = storedPassword.split(":");
    const hash = pbkdf2Sync(
        password,
        salt,
        Number(storedIterations),
        keyLength,
        digest
    ).toString("hex");

    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}
