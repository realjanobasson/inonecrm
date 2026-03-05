export class ChatHub {
  state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      server.addEventListener("message", (evt) => server.send(evt.data)); // echo for now
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("ChatHub ok", { status: 200 });
  }
}

export default {
  fetch() {
    return new Response("chat-hub: use Durable Object /ws", { status: 200 });
  }
};
