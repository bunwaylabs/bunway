import { promises as fs } from "fs";
import { join } from "path";

const rootPkg = JSON.parse(await fs.readFile("package.json", "utf8"));

const distDir = "dist";
const srcDir = "src";
await fs.mkdir(distDir, { recursive: true });

const distPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  type: "module",
  main: "./index.js",
  module: "./index.js",
  exports: {
    ".": {
      bun: "./index.js",
      import: "./index.js",
      types: "./index.d.ts",
    },
    "./package.json": "./package.json",
  },
  types: "./index.d.ts",
  files: ["**/*.js", "**/*.d.ts", "**/*.map", "README.md", "LICENSE"],
  engines: { bun: ">=1.0.0" },
  keywords: rootPkg.keywords,
  license: rootPkg.license,
  repository: rootPkg.repository,
  homepage: rootPkg.homepage,
  bugs: rootPkg.bugs,
  author: rootPkg.author,
};

await fs.writeFile(join(distDir, "package.json"), JSON.stringify(distPkg, null, 2) + "\n");

// copy the readme from src/ and the license from root
const readmeSource = join(srcDir, "README.md");

await fs.copyFile(readmeSource, join(distDir, "README.md"));
await fs.copyFile("LICENSE", join(distDir, "LICENSE"));
