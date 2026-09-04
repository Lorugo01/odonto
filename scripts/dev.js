/**
 * Sobe backend (:3000) + frontend (:5173) a partir da raiz.
 * Libera as portas antes e mata os filhos no Ctrl+C (Windows incluso).
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

function freePorts() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, "free-port.js"), "3000", "5173"], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", () => resolve());
  });
}

/** @type {import('child_process').ChildProcess[]} */
const children = [];
let shuttingDown = false;

function start(name, args, color) {
  const child = spawn(npmCmd, args, {
    cwd: root,
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
    shell: isWin,
  });
  children.push(child);

  const prefix = (stream) => {
    stream.on("data", (buf) => {
      const text = buf.toString();
      for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        process.stdout.write(`${color}[${name}]\x1b[0m ${line}\n`);
      }
    });
  };
  if (child.stdout) prefix(child.stdout);
  if (child.stderr) prefix(child.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev] ${name} encerrou (code=${code}, signal=${signal ?? "-"})`);
    void shutdown(code ?? 1);
  });

  return child;
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[dev] Encerrando backend e frontend...");

  for (const child of children) {
    if (!child.pid || child.killed) continue;
    try {
      if (isWin) {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          shell: true,
        });
      } else {
        child.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
  }

  // Garante que a porta não fique órfã após nest --watch
  await new Promise((r) => setTimeout(r, 400));
  await freePorts();
  process.exit(code);
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

(async () => {
  await freePorts();
  console.log("[dev] Backend → http://localhost:3000");
  console.log("[dev] Frontend → http://localhost:5173");
  start("api", ["run", "start:dev", "--prefix", "backend"], "\x1b[36m");
  start("web", ["run", "dev", "--prefix", "frontend"], "\x1b[35m");
})();
