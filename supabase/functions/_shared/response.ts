export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, apiKey, content-type, accept, origin, x-requested-with",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
};

export function response(
    status: number,
    body: Record<string, unknown> = {},
    errCode?: string,
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
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
}

export function optionsResponse(): Response {
    return new Response("ok", {
        headers: corsHeaders,
    });
}
