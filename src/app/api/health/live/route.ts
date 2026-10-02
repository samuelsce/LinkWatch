export function GET() {
  return Response.json({ service: "linkwatch-web", status: "alive" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
