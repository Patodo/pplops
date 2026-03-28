import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Socket } from "node:net";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const tauriConfPath = resolve(root, "src-tauri/tauri.conf.json");

/**
 * Check if a port is in use on a specific host.
 */
function checkPortOnHost(port, host) {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * Check if a port is in use on both IPv4 and IPv6 localhost.
 */
async function isPortInUse(port) {
  const ipv4 = await checkPortOnHost(port, "127.0.0.1");
  const ipv6 = await checkPortOnHost(port, "::1");
  return ipv4 || ipv6;
}

/**
 * Find the first available port starting from `start`.
 */
async function findAvailablePort(start) {
  for (let port = start; port < start + 100; port++) {
    if (!(await isPortInUse(port))) return port;
  }
  throw new Error(`No available port found in range ${start}-${start + 99}`);
}

// Auto-detect or use env var
const port = process.env.VITE_PORT
  ? parseInt(process.env.VITE_PORT, 10)
  : await findAvailablePort(1420);

// HMR port: auto-detect starting from port + 1
const hmrPort = process.env.VITE_HMR_PORT
  ? parseInt(process.env.VITE_HMR_PORT, 10)
  : await findAvailablePort(port + 1);

console.log(`Using port: ${port}, HMR port: ${hmrPort}`);

// Sync port to tauri.conf.json
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
const devUrl = `http://localhost:${port}`;
if (tauriConf.build.devUrl !== devUrl) {
  tauriConf.build.devUrl = devUrl;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
  console.log(`Updated tauri.conf.json devUrl to ${devUrl}`);
}

// Start tauri dev
execSync("tauri dev", {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_PORT: String(port),
    VITE_HMR_PORT: String(hmrPort),
  },
});
