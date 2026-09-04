/**
 * Libera portas TCP em LISTENING (Windows e Unix).
 * Uso: node scripts/free-port.js 3000 5173
 *
 * No Windows o Nest --watch costuma deixar o processo filho preso na porta
 * depois do Ctrl+C; este script mata a árvore de processos (taskkill /T).
 */
const { execSync } = require("child_process");

const ports = process.argv
  .slice(2)
  .map((p) => Number(p))
  .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);

if (ports.length === 0) {
  console.error("Uso: node scripts/free-port.js <porta> [porta...]");
  process.exit(1);
}

function freeWindows(port) {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
      console.log(`[free-port] porta ${port}: encerrado PID ${pid}`);
    } catch {
      // já morreu ou sem permissão
    }
  }
}

function freeUnix(port) {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" });
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGKILL");
        console.log(`[free-port] porta ${port}: encerrado PID ${pid}`);
      } catch {
        // ignore
      }
    }
  } catch {
    // nada escutando
  }
}

for (const port of ports) {
  if (process.platform === "win32") freeWindows(port);
  else freeUnix(port);
}
