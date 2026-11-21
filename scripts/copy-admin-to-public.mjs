import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "admin", "dist");
const dest = path.join(root, "public", "admin");

async function main() {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });

  // Cloudflare Pages / static hosts: SPA fallback for deep links under /admin/*
  await writeFile(
    path.join(root, "public", "_redirects"),
    `# Admin SPA (same-origin under /admin)
/admin /admin/index.html 200
/admin/ /admin/index.html 200
/admin/* /admin/index.html 200
`,
    "utf8",
  );

  console.log(`[copy-admin] Copied ${src} → ${dest}`);
}

main().catch((error) => {
  console.error("[copy-admin] Failed:", error);
  process.exit(1);
});
