export function getCorsHeaders(req?: Request): Record<string, string> {
    const origin = req?.headers.get("origin") ?? "*";

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, apiKey, content-type, accept, origin, x-requested-with",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    };
}

export function response(
    status: number,
    body: Record<string, unknown> = {},
    errCode?: string,
    req?: Request,
): Response {
    const payload = errCode
        ? {
            ...body,
            errCode,
        }
        : body;

    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
        },
    });
}

export function optionsResponse(req?: Request): Response {
    return new Response("ok", {
        headers: getCorsHeaders(req),
    });
}
