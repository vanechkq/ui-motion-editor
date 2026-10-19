import { startServer } from "../exporter/server.mjs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await startServer(root, {
  port: Number(process.env.PORT || 4173),
});
console.log(`Motion editor: ${server.url}`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await server.close();
    process.exit();
  });
