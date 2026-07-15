import { createHmac } from "node:crypto";

const defaultSecret = "velmora_dev_secret_change_in_render";
const tokenDurationMs = 1000 * 60 * 60 * 24;

function base64UrlEncode(value) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value) {
    const secret = process.env.JWT_SECRET || defaultSecret;
    return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createToken(user) {
    const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
    const payload = base64UrlEncode({
        sub: user.id,
        role: user.role,
        exp: Date.now() + tokenDurationMs
    });
    const signature = sign(`${header}.${payload}`);

    return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
    if (!token) {
        return null;
    }

    const [header, payload, signature] = token.split(".");

    if (!header || !payload || !signature) {
        return null;
    }

    if (sign(`${header}.${payload}`) !== signature) {
        return null;
    }

    const data = base64UrlDecode(payload);

    if (!data.exp || Date.now() > data.exp) {
        return null;
    }

    return data;
}
