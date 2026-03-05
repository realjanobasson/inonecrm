export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, worker: "inonecrm-webhooks" }), {
        headers: { "content-type": "application/json" },
      });
    }

    // Placeholder: route Stripe / WhatsApp webhooks here.
    // You will verify signatures/tokens and then enqueue work to JOBS or call the API internally.
    return new Response("Webhook worker ready.", { status: 200 });
  }
};
