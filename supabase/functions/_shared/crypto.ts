const ITERATIONS = 100_000;

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export function generateSalt(): string {
    return crypto.randomUUID().replace(/-/g, "");
}

export async function hashPassword(
    password: string,
    salt: string,
): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: new TextEncoder().encode(salt),
            iterations: ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        256,
    );

    return bytesToHex(new Uint8Array(derivedBits));
}
