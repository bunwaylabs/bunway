import { bunway, cors, errorHandler, HttpError, json } from "../dist";

const app = bunway();

// Core middleware
app.use(cors({ origin: true }));
app.use(json());
app.use(errorHandler({ logger: console.error }));

app.get("/", (ctx) => ctx.res.text("Hello from bunWay!"));

app.get("/users/:id", (ctx) => {
  const id = ctx.req.param("id");
  if (!id || id === "0") {
    throw new HttpError(404, "User not found");
  }
  return ctx.res.json({ id, name: `User ${id}` });
});

app.post("/echo", async (ctx) => {
  const body = await ctx.req.parseBody();
  return ctx.res.ok({ received: body });
});

app.listen({ port: 7070 }, () => {
  console.log("bunWay basic example running at http://localhost:7070");
});
