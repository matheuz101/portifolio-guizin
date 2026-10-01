import { cp, mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");
for (const name of ["index.html", "assets/css/style.css", "assets/js/config.js", "assets/js/main.js", "assets/vendor/jquery-3.7.1.min.js", "assets/vendor/tilt.jquery.min.js", "assets/images/favicon-gl.png"]) await stat(resolve(root, name));
for (const name of ["config.js", "main.js"]) new vm.Script(await readFile(resolve(root, "assets/js", name), "utf8"), { filename: name });
const html = await readFile(resolve(root, "index.html"), "utf8");
if (!html.includes('lang="pt-BR"')) throw new Error("O documento precisa estar em português.");
for (const id of ["home", "about", "skills", "projects", "education", "contact"]) {
  if (!html.includes('id="' + id + '"')) throw new Error("Seção ausente: " + id);
}
if (html.includes('href="#"')) throw new Error("Link provisório vazio encontrado.");
await mkdir(output, { recursive: true });
await cp(resolve(root, "index.html"), resolve(output, "index.html"));
await cp(resolve(root, "assets"), resolve(output, "assets"), { recursive: true });
await cp(resolve(root, "imgs"), resolve(output, "imgs"), { recursive: true });
console.log("Site estático pronto em dist/. Nenhum framework ou build é necessário para abrir index.html.");
