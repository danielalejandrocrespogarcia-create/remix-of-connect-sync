// Compila la app para Android (Capacitor) de forma multiplataforma (Windows/macOS/Linux).
// Uso: bun run build:android  → luego: bunx cap open android
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

const run = (args, extraEnv = {}) => {
  const r = spawnSync(npx, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: isWin,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

console.log("[android] 1/3 Compilando la app web (modo Capacitor)...");
run(["vite", "build"], { VITE_CAPACITOR: "true" });

if (!existsSync(resolve(root, "dist/index.html"))) {
  console.error("[android] Falta dist/index.html — la compilación falló.");
  process.exit(1);
}

if (!existsSync(resolve(root, "android"))) {
  console.log("[android] 2/3 Carpeta android/ no encontrada: creando plataforma Android...");
  run(["cap", "add", "android"]);
} else {
  console.log("[android] 2/3 Plataforma Android ya existe.");
}

console.log("[android] 3/3 Sincronizando con Android...");
run(["cap", "sync", "android"]);

console.log("[android] Listo. Ahora ejecuta: bunx cap open android");
