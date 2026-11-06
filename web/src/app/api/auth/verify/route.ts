function retired() { return Response.json({ error: "This legacy service has been retired. Use Countersign owner and approval flows." }, { status: 410, headers: { "Cache-Control": "no-store" } }); }
export const GET = retired;
export const POST = retired;
