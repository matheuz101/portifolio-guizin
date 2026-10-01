import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const configSource = await readFile(new URL("../assets/js/config.js", import.meta.url), "utf8");
const configContext = { window: {} };
vm.runInNewContext(configSource, configContext);
const currentConfig = configContext.window.PORTFOLIO_CONFIG;

async function configured(page, extra) {
  await page.route("**/assets/js/config.js", (route) => route.fulfill({ contentType: "text/javascript", body: configSource + "\n" + extra }));
}
async function ready(page, path = "/") { await page.goto(path); await expect(page.locator(".project-card")).toHaveCount(currentConfig.projects.length); }

test("conteúdo confirmado, assets locais e estados pendentes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page.getByRole("heading", { name: "Guilherme Luiz Silva Edmundo", exact: true })).toBeVisible();
  expect(await page.locator("main > section").evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(["home", "about", "skills", "projects", "education", "contact"]);
  await expect(page.locator(".provisional-label")).toHaveCount(currentConfig.projects.filter((project) => project.provisional).length);
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
  await expect(page.locator("#nav-logo")).toBeVisible();
  await expect(page.locator(".portrait-image:not([hidden])")).toHaveCount(0);
  await expect(page.locator(".project-actions a[aria-disabled='true']")).toHaveCount(currentConfig.projects.reduce((total, project) => total + Number(!project.repository) + Number(!project.demo), 0));
  expect(await page.evaluate(() => !!window.jQuery?.fn.tilt)).toBe(true);
  expect(await page.evaluate(() => [...document.images].filter((img) => !img.hidden && img.complete && !img.naturalWidth).length)).toBe(0);
  expect(errors).toEqual([]);
});

test("navegação por todas as seções, seção ativa e retorno pelo favicon", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  for (const id of ["about", "skills", "projects", "education", "contact", "home"]) {
    const link = page.locator('.site-sidebar a[href="#' + id + '"]');
    await link.click();
    await expect(page).toHaveURL(new RegExp("#" + id + "$"));
    await expect(link).toHaveAttribute("aria-current", "location");
  }
  await page.locator(".hero-actions a").first().click();
  await expect(page).toHaveURL(/#projects$/);
});

test("tema acompanha sistema na primeira visita e persiste após alternância", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Ativar modo claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("guilherme-theme"))).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("modal confina foco, bloqueia rolagem, fecha por Escape, botão e fundo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const open = page.locator("#contact-open");
  const modal = page.locator("#contact-modal");
  await open.click();
  await expect(modal).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/modal-open/);
  await expect(page.locator("#contact-close")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#contact-message")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#contact-close")).toBeFocused();
  await expect(page.locator("#contact-submit")).toBeDisabled();
  await expect(modal.locator(".contact-method[aria-disabled='true']")).toHaveCount(["email", "whatsapp", "linkedin"].filter((key) => !currentConfig.links[key]).length);
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/modal-open/);
  await open.click();
  await page.locator("#contact-close").click();
  await expect(modal).not.toBeVisible();
  await open.click();
  await page.mouse.click(5, 5);
  await expect(modal).not.toBeVisible();
  await expect(open).toBeFocused();
});

test("molduras mantêm fallback, recebem foto e respeitam object-position", async ({ page }) => {
  await configured(page, 'PORTFOLIO_CONFIG.photos.home = {src:"assets/images/favicon-gl.png", position:"center 20%"}; PORTFOLIO_CONFIG.favicon = "assets/images/inexistente.png";');
  await ready(page);
  await expect(page.locator('[data-photo="home"] img')).toBeVisible();
  await expect(page.locator('[data-photo="home"] .portrait-placeholder')).not.toBeVisible();
  await expect(page.locator('[data-photo="home"] img')).toHaveCSS("object-position", "50% 20%");
  await expect(page.locator("#nav-logo")).not.toBeVisible();
  await expect(page.locator(".nav-logo-fallback")).toBeVisible();
});

test("tilt nas duas molduras e desativação ao preferir movimento reduzido", async ({ page }) => {
  await ready(page);
  for (const key of ["home", "about"]) {
    const frame = page.locator('[data-photo="' + key + '"]');
    await frame.scrollIntoViewIfNeeded();
    await frame.hover({ position: { x: 20, y: 20 } });
    await expect.poll(() => frame.evaluate((node) => node.style.transform)).toContain("rotateX");
    await page.mouse.move(0, 0);
    await expect.poll(() => frame.evaluate((node) => node.style.transform)).toContain("rotateX(0deg)");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.locator('[data-photo="home"]').evaluate((node) => node.style.transform)).toBe("");
  await expect(page.locator("html")).not.toHaveClass(/reveal-ready/);
});

test("conteúdo continua utilizável sem biblioteca ou IntersectionObserver", async ({ page }) => {
  await page.route("**/assets/vendor/*", (route) => route.abort());
  await page.addInitScript(() => { window.IntersectionObserver = undefined; });
  await ready(page);
  await expect(page.locator("#home-title")).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/reveal-ready/);
  await page.locator("#contact-open").click();
  await expect(page.locator("#contact-modal")).toBeVisible();
});

test("galeria com controles, teclado e links reais definidos na configuração", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await configured(page, 'Object.assign(PORTFOLIO_CONFIG.projects[0], {provisional:false, title:"Projeto confirmado", images:[{src:"assets/images/favicon-gl.png",alt:"Captura um"},{src:"assets/images/favicon-gl.png",alt:"Captura dois"}], repository:"https://example.org/repo", demo:"https://example.org/site"}); PORTFOLIO_CONFIG.links.linkedin="https://example.org/perfil"; PORTFOLIO_CONFIG.links.email="guilherme@example.org"; PORTFOLIO_CONFIG.links.whatsapp="5531999999999";');
  await ready(page);
  const card = page.locator(".project-card").first();
  await expect(card.locator(".provisional-label")).toHaveCount(0);
  await expect(page.locator("#projects .section-description")).not.toBeVisible();
  await expect(card.getByRole("link", { name: "Ver site" })).toHaveAttribute("href", "https://example.org/site");
  await expect(card.locator(".gallery-count")).toHaveText("1 / 2");
  await card.locator(".gallery-next").click();
  await expect(card.locator(".gallery-count")).toHaveText("2 / 2");
  await expect(card.locator(".gallery-next")).toBeDisabled();
  await card.locator(".gallery-track").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(card.locator(".gallery-count")).toHaveText("1 / 2");
  await page.locator("#contact-open").click();
  await expect(page.locator('.contact-method[data-link="email"]')).toHaveAttribute("href", "mailto:guilherme@example.org");
  await expect(page.locator('.contact-method[data-link="whatsapp"]')).toHaveAttribute("href", "https://wa.me/5531999999999");
});

test("formulário valida antes do envio e só confirma sucesso declarado pelo serviço", async ({ page }) => {
  await configured(page, 'PORTFOLIO_CONFIG.form.endpoint = "http://127.0.0.1:4173/api/contact";');
  let attempts = 0;
  let payload;
  await page.route("**/api/contact", async (route) => {
    attempts++;
    payload = route.request().postDataJSON();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: attempts > 1 }) });
  });
  await ready(page);
  await page.locator("#contact-open").click();
  await page.locator("#contact-submit").click();
  await expect(page.locator("#name-error")).toBeVisible();
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.locator("#message-error")).toBeVisible();
  expect(attempts).toBe(0);
  await page.locator("#contact-name").fill("Teste local");
  await page.locator("#contact-email").fill("teste@example.org");
  await page.locator("#contact-message").fill("Mensagem de teste automatizado local.");
  await page.locator("#contact-submit").click();
  await expect(page.locator("#form-status")).toContainText("Não foi possível");
  await expect(page.locator("#contact-name")).toHaveValue("Teste local");
  await page.locator("#contact-submit").click();
  await expect(page.locator("#form-status")).toContainText("Mensagem enviada");
  expect(payload).toEqual({ name: "Teste local", email: "teste@example.org", message: "Mensagem de teste automatizado local." });
  await expect(page.locator("#contact-name")).toHaveValue("");
});

test("caminhos relativos funcionam em subdiretório", async ({ page }) => {
  await ready(page, "/portfolio/");
  await expect(page.locator("#nav-logo")).toBeVisible();
  await expect(page.locator("#home-title")).toHaveCSS("font-family", "Poppins, sans-serif");
  expect(await page.evaluate(() => document.fonts.check("16px Poppins"))).toBe(true);
});

for (const width of [320, 375, 768, 1024]) {
  test("layout e modal dentro da largura disponível em " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const nav = await page.locator(".site-sidebar").boundingBox();
    expect(nav.x).toBeGreaterThanOrEqual(0);
    expect(nav.x + nav.width).toBeLessThanOrEqual(width);
    await page.locator("#contact-open").click();
    const modal = await page.locator("#contact-modal").boundingBox();
    expect(modal.x).toBeGreaterThanOrEqual(0);
    expect(modal.x + modal.width).toBeLessThanOrEqual(width);
    await page.locator("#contact-message").scrollIntoViewIfNeeded();
    await expect(page.locator("#contact-message")).toBeVisible();
    await page.keyboard.press("Escape");
  });
}

test("interface mantém largura e leitura com texto ampliado a 200%", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.locator("#contact-open").click();
  expect(await page.locator("#contact-modal").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("revelação ao rolar e composição em ambos os temas", async ({ page }, testInfo) => {
  await ready(page);
  await expect(page.locator(".hero-copy")).toHaveClass(/is-visible/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#skills").scrollIntoViewIfNeeded();
  for (const img of await page.locator(".skill-mark img").all()) await img.evaluate(node => node.decode());
  await page.locator(".nav-home").click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath("inicio-escuro.png") });
  await page.screenshot({ path: testInfo.outputPath("desktop-escuro.png"), fullPage: true });
  await page.locator('.sidebar-nav a[href="#about"]').click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath("sobre-escuro.png") });
  await page.locator(".nav-home").click();
  await page.getByRole("button", { name: "Ativar modo claro" }).click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath("desktop-claro.png"), fullPage: true });
  await page.locator("#contact-open").click();
  await page.screenshot({ path: testInfo.outputPath("modal-claro.png") });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('.nav-home').click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath("inicio-celular.png") });
  await page.screenshot({ path: testInfo.outputPath("celular-claro.png"), fullPage: true });
});

test("habilidades nos grupos corretos e imagens de imgs carregam nos dois temas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.locator("#skills").scrollIntoViewIfNeeded();
  const programming = page.locator(".skill-group").filter({ has: page.getByRole("heading", { name: "Linguagens de programação", exact: true }) });
  const database = page.locator(".skill-group").filter({ has: page.getByRole("heading", { name: "Banco de dados", exact: true }) });
  const tools = page.locator(".skill-group").filter({ has: page.getByRole("heading", { name: "Ferramentas e publicação", exact: true }) });
  await expect(programming.getByRole("heading", { name: "C#", exact: true })).toBeVisible();
  await expect(database.getByRole("heading", { name: "MySQL", exact: true })).toBeVisible();
  await expect(tools.getByRole("heading", { name: "Figma", exact: true })).toBeVisible();
  await expect(programming.locator("img")).toHaveAttribute("src", "imgs/c%23-black.png");
  await expect(database.locator("img")).toHaveAttribute("src", "imgs/mysql-black.png");
  await expect(tools.locator('img[src="imgs/figma-black.png"]')).toHaveCount(1);
  for (const img of await page.locator(".skill-mark img").all()) {
    await expect.poll(() => img.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(database.locator("img")).toHaveCSS("filter", "invert(1)");
  await page.getByRole("button", { name: "Ativar modo claro" }).click();
  await expect(database.locator("img")).toHaveCSS("filter", "none");
});

test("menu lateral permanece à esquerda ao rolar, inclusive no celular e em paisagem", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const sidebar = page.locator(".site-sidebar");
  const nav = page.locator("#primary-navigation");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(6);
  const initial = await sidebar.boundingBox();
  const content = await page.locator(".hero-container").boundingBox();
  expect(initial.x + initial.width).toBeLessThanOrEqual(content.x);
  await nav.getByRole("link", { name: "Habilidades", exact: true }).click();
  await expect(page).toHaveURL(/#skills$/);
  await expect(nav.getByRole("link", { name: "Habilidades", exact: true })).toHaveAttribute("aria-current", "location");
  const scrolled = await sidebar.boundingBox();
  expect(scrolled.x).toBeCloseTo(initial.x);
  expect(scrolled.y).toBeCloseTo(initial.y);
  await nav.getByRole("link", { name: "Sobre", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#about$/);
  await expect(nav.getByRole("link", { name: "Sobre", exact: true })).toHaveAttribute("aria-current", "location");
  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await sidebar.boundingBox();
  expect(landscape.y).toBeGreaterThanOrEqual(0);
  expect(landscape.y + landscape.height).toBeLessThanOrEqual(390);
  await nav.getByRole("link", { name: "Contato", exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator("#contact-open")).toBeInViewport();
});

test("build inclui imgs e os ícones funcionam na pasta de publicação", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "/dist/");
  await page.locator("#skills").scrollIntoViewIfNeeded();
  for (const img of await page.locator(".skill-mark img").all()) {
    await expect.poll(() => img.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  await expect(page.locator(".project-card").first().locator(".gallery-slide img")).toBeVisible();
});
