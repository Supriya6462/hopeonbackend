import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

const runtimeFiles = ["app.js", "index.js", "dbconnection.js"];
const runtimeDirs = [
  "config",
  "controllers",
  "lib",
  "middleware",
  "Models",
  "Routes",
  "services",
  "utils",
];

async function copyRuntimeSources() {
  for (const fileName of runtimeFiles) {
    await cp(path.join(projectRoot, fileName), path.join(distDir, fileName));
  }

  for (const dirName of runtimeDirs) {
    await cp(path.join(projectRoot, dirName), path.join(distDir, dirName), {
      recursive: true,
    });
  }
}

async function writeDistPackageJson() {
  const sourcePackageJsonPath = path.join(projectRoot, "package.json");
  const sourcePackageJson = JSON.parse(
    await readFile(sourcePackageJsonPath, "utf8"),
  );

  const distPackageJson = {
    name: sourcePackageJson.name,
    version: sourcePackageJson.version,
    private: sourcePackageJson.private ?? true,
    description: sourcePackageJson.description,
    type: sourcePackageJson.type,
    main: "index.js",
    scripts: {
      start: "node index.js",
    },
    dependencies: sourcePackageJson.dependencies,
    engines: sourcePackageJson.engines,
  };

  await writeFile(
    path.join(distDir, "package.json"),
    `${JSON.stringify(distPackageJson, null, 2)}\n`,
    "utf8",
  );
}

async function copyLockFileIfPresent() {
  const lockFilePath = path.join(projectRoot, "package-lock.json");

  try {
    await cp(lockFilePath, path.join(distDir, "package-lock.json"));
  } catch {
    // Lockfile is optional for build output.
  }
}

async function ensureRuntimeUploadFolder() {
  await mkdir(path.join(distDir, "uploads", "documents"), { recursive: true });
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await copyRuntimeSources();
  await writeDistPackageJson();
  await copyLockFileIfPresent();
  await ensureRuntimeUploadFolder();

  console.log("Build completed: dist directory created.");
}

build().catch((error) => {
  console.error("Build failed.");
  console.error(error);
  process.exit(1);
});
