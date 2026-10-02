import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const configSource = await readFile(new URL("../assets/js/config.js", import.meta.url), "utf8");
const endpoint = "https://api.web3forms.com/submit";
const accessKey = "11111111-2222-4333-8444-555555555555";

async function openForm(page, key = accessKey) {
  await page.route("**/assets/js/config.js", (route) => route.fulfill({
    contentType: "text/javascript",
    body: configSource + "\nPORTFOLIO_CONFIG.form.access_key = " + JSON.stringify(key) + ";",
  }));
  await page.goto("/");
  await page.locator("#contact-open").click();
}

async function fillForm(page) {
  await page.locator("#contact-name").fill("Teste local");
  await page.locator("#contact-email").fill("teste@example.org");
  await page.locator("#contact-message").fill("Mensagem de teste automatizado local.");
}

for (const key of ["", "   "]) {
  test("Web3Forms não envia sem Access Key: " + JSON.stringify(key), async ({ page }) => {
    let requests = 0;
    await page.route(endpoint, (route) => { requests++; return route.abort(); });
    await openForm(page, key);
    await expect(page.locator("#contact-submit")).toBeDisabled();
    await expect(page.locator("#form-hint")).toContainText("temporariamente indisponível");
    await fillForm(page);
    await page.locator("#contact-form").evaluate((form) => form.requestSubmit());
    await expect(page.locator("#form-status")).toBeHidden();
    expect(requests).toBe(0);
  });
}

test("Web3Forms ativa apenas com a chave, valida os campos e envia os dados corretos", async ({ page }) => {
  let requests = 0;
  let request;
  await page.route(endpoint, (route) => {
    requests++;
    request = route.request();
    return route.fulfill({ json: { success: true } });
  });
  await openForm(page, "  " + accessKey + "  ");
  await expect(page.locator("#contact-submit")).toBeEnabled();
  await page.locator("#contact-submit").click();
  await expect(page.locator("#name-error")).toBeVisible();
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.locator("#message-error")).toBeVisible();
  await expect(page.locator("#contact-name")).toBeFocused();
  expect(requests).toBe(0);
  await fillForm(page);
  await page.locator("#contact-name").fill("  Teste local  ");
  await page.locator("#contact-submit").click();
  await expect(page.locator("#form-status")).toContainText("Mensagem enviada");
  expect(requests).toBe(1);
  expect(request.method()).toBe("POST");
  expect(request.headers()["content-type"]).toBe("application/json");
  expect(request.headers().accept).toBe("application/json");
  expect(request.postDataJSON()).toEqual({
    access_key: accessKey,
    name: "Teste local",
    email: "teste@example.org",
    message: "Mensagem de teste automatizado local.",
    subject: "Nova mensagem pelo portfólio de Guilherme Luiz",
    from_name: "Portfólio de Guilherme Luiz",
  });
  for (const field of ["name", "email", "message"]) {
    await expect(page.locator("#contact-" + field)).toHaveValue("");
    await expect(page.locator("#contact-" + field)).not.toHaveAttribute("aria-invalid");
  }
  await expect(page.locator("#contact-submit")).toBeEnabled();
  await expect(page.locator("#contact-submit")).toContainText("Enviar mensagem");
});

test("Web3Forms bloqueia envios duplicados e edição durante uma requisição", async ({ page }) => {
  let requests = 0;
  let release;
  const responseReady = new Promise((resolve) => { release = resolve; });
  await page.route(endpoint, async (route) => {
    requests++;
    await responseReady;
    await route.fulfill({ json: { success: true } });
  });
  await openForm(page);
  await fillForm(page);
  await page.locator("#contact-submit").click();
  await expect(page.locator("#contact-submit")).toBeDisabled();
  await expect(page.locator("#contact-submit")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#contact-submit")).toContainText("Enviando");
  await expect(page.locator("#contact-form")).toHaveAttribute("aria-busy", "true");
  for (const field of ["name", "email", "message"]) {
    await expect(page.locator("#contact-" + field)).toHaveJSProperty("readOnly", true);
  }
  await page.locator("#contact-form").evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
  expect(requests).toBe(1);
  release();
  await expect(page.locator("#form-status")).toContainText("Mensagem enviada");
  await expect(page.locator("#contact-form")).not.toHaveAttribute("aria-busy");
  await expect(page.locator("#contact-name")).toBeEditable();
});

for (const failure of [
  { name: "recusa da API", status: 200, json: { success: false } },
  { name: "chave inválida", status: 400, json: { success: false } },
  { name: "limite de requisições", status: 429, json: { success: false } },
  { name: "erro HTTP mesmo com corpo de sucesso", status: 500, json: { success: true } },
  { name: "resposta inválida", status: 200, body: "Resposta sem JSON" },
  { name: "falha de rede", abort: true },
]) {
  test("Web3Forms preserva os dados e permite tentar novamente após " + failure.name, async ({ page }) => {
    let requests = 0;
    await page.route(endpoint, (route) => {
      requests++;
      if (requests > 1) return route.fulfill({ json: { success: true } });
      if (failure.abort) return route.abort("failed");
      return route.fulfill({ status: failure.status, ...(failure.json ? { json: failure.json } : { body: failure.body }) });
    });
    await openForm(page);
    await fillForm(page);
    await page.locator("#contact-submit").click();
    await expect(page.locator("#form-status")).toContainText("Não foi possível enviar");
    await expect(page.locator("#form-status")).toHaveClass(/is-error/);
    await expect(page.locator("#contact-name")).toHaveValue("Teste local");
    await expect(page.locator("#contact-email")).toHaveValue("teste@example.org");
    await expect(page.locator("#contact-message")).toHaveValue("Mensagem de teste automatizado local.");
    await expect(page.locator("#contact-submit")).toBeEnabled();
    await expect(page.locator("#contact-name")).toBeEditable();
    await page.locator("#contact-submit").click();
    await expect(page.locator("#form-status")).toContainText("Mensagem enviada");
    await expect(page.locator("#form-status")).not.toHaveClass(/is-error/);
    expect(requests).toBe(2);
  });
}

test("Web3Forms encerra o envio após 15 segundos sem resposta", async ({ page }) => {
  await page.route(endpoint, () => {});
  await openForm(page);
  await fillForm(page);
  await page.locator("#contact-submit").click();
  await expect(page.locator("#form-status")).toContainText("Enviando mensagem");
  await expect(page.locator("#form-status")).toContainText("Não foi possível enviar", { timeout: 20000 });
  await expect(page.locator("#contact-name")).toHaveValue("Teste local");
  await expect(page.locator("#contact-submit")).toBeEnabled();
  await expect(page.locator("#contact-submit")).not.toHaveAttribute("aria-busy");
  await expect(page.locator("#contact-message")).toBeEditable();
});
