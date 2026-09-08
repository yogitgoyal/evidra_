import net from "node:net";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const preferredPort = Number(process.env.PORT || 3000);

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function start() {
  let port = preferredPort;
  if (!(await canListen(port)) && existsSync(".next/dev/lock")) {
    console.warn(`Next.js is already running on port ${preferredPort}; reusing it.`);
    return;
  }
  while (!(await canListen(port))) port += 1;

  if (port !== preferredPort) {
    console.warn(`Port ${preferredPort} is occupied; starting Next.js on ${port}.`);
  }

  const nextBin = "./node_modules/next/dist/bin/next";
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}

start().catch((error) => {
  console.error("Unable to start Next.js:", error);
  process.exit(1);
});
