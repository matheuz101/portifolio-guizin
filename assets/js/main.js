/* Interface em JavaScript nativo. jQuery é usado exclusivamente pelo Tilt.js. */
(() => {
  "use strict";
  const config = window.PORTFOLIO_CONFIG;
  if (!config) return;
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const setText = (selector, value) => $$(selector).forEach((element) => { element.textContent = value || ""; });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-" + name);
    svg.append(use);
    return svg;
  }

  function webUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  }

  function setLink(anchor, href, label, external = true) {
    anchor.removeAttribute("href");
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
    if (href) {
      anchor.href = href;
      anchor.removeAttribute("aria-disabled");
      anchor.removeAttribute("tabindex");
      if (external) { anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; }
      if (label) anchor.setAttribute("aria-label", label);
    } else {
      anchor.setAttribute("aria-disabled", "true");
      anchor.tabIndex = -1;
      if (label) anchor.setAttribute("aria-label", label + " — Em breve");
    }
  }

  // A imagem só entra no DOM visível após carregar. Erros mantêm o placeholder.
  function loadImage(img, src, alt, placeholder) {
    img.hidden = true;
    img.alt = alt;
    if (!src) return;
    const loader = new Image();
    loader.onload = () => {
      img.src = src;
      img.hidden = false;
      if (placeholder) placeholder.hidden = true;
    };
    loader.onerror = () => { img.hidden = true; if (placeholder) placeholder.hidden = false; };
    img.onerror = loader.onerror;
    loader.src = src;
  }

  function applyContent() {
    setText("[data-full-name]", config.name);
    setText("[data-short-name]", config.shortName);
    setText("[data-initials]", config.initials);
    setText("[data-role]", config.role);
    setText("[data-introduction]", config.introduction);
    setText("[data-institution]", config.education.institution);
    setText("[data-completion]", config.education.completion);
    setText("[data-education-status]", config.education.status);
    const heading = $("#home-title");
    heading.replaceChildren();
    (config.nameLines?.length ? config.nameLines : [config.name]).forEach((line) => heading.append(element("span", "", line)));
    heading.setAttribute("aria-label", config.name);
    document.title = config.shortName + " | " + config.role;
    $("meta[name='description']").content = "Portfólio de " + config.name + ", " + config.role.toLowerCase() + " e estudante do " + config.education.institution + ". Projetos com HTML, CSS e JavaScript.";
    const course = $("[data-course]");
    course.textContent = config.education.course || "";
    course.hidden = !config.education.course;
    const startDate = $("[data-start-date]");
    startDate.textContent = config.education.startDate ? "Início: " + config.education.startDate : "";
    startDate.hidden = !config.education.startDate;
    $("#footer-year").textContent = new Date().getFullYear();
    $$("[data-photo]").forEach((frame) => {
      const photo = config.photos?.[frame.dataset.photo];
      const img = $(".portrait-image", frame);
      img.style.objectPosition = photo?.position || "center";
      loadImage(img, photo?.src, "Retrato de " + config.name, $(".portrait-placeholder", frame));
    });
    loadImage($("#nav-logo"), config.favicon, "", $(".nav-logo-fallback"));
    const favicon = $("#site-favicon");
    if (config.favicon) { favicon.href = config.favicon; favicon.removeAttribute("type"); }
    else favicon.removeAttribute("href");
  }

  function applyContactLinks() {
    const links = config.links || {};
    const email = typeof links.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(links.email) ? links.email : "";
    const phone = String(links.whatsapp || "").replace(/\D/g, "");
    const whatsapp = /^\d{8,15}$/.test(phone) ? "https://wa.me/" + phone : "";
    const destinations = { github: webUrl(links.github), linkedin: webUrl(links.linkedin), email: email ? "mailto:" + email : "", whatsapp };
    const labels = { github: "GitHub", linkedin: "LinkedIn", email: "E-mail", whatsapp: "WhatsApp" };
    $$("[data-link]").forEach((anchor) => {
      const key = anchor.dataset.link;
      setLink(anchor, destinations[key], labels[key], key !== "email");
      if (anchor.hasAttribute("data-tooltip")) anchor.dataset.tooltip = labels[key] + (destinations[key] ? "" : " · Em breve");
    });
    setText("[data-contact-label='email']", email || "Em breve");
    setText("[data-contact-label='whatsapp']", whatsapp ? (links.whatsappLabel || "+" + phone) : "Em breve");
    setText("[data-contact-label='linkedin']", destinations.linkedin ? "Abrir perfil no LinkedIn" : "Em breve");
    document.addEventListener("click", (event) => {
      const unavailable = event.target.closest('a[aria-disabled="true"]');
      if (unavailable) event.preventDefault();
    });
  }

  function setupTheme() {
    const toggle = $("#theme-toggle");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    function updateTheme(theme) {
      root.dataset.theme = theme;
      const label = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";
      toggle.setAttribute("aria-label", label);
      toggle.dataset.tooltip = label;
      $("meta[name='theme-color']").content = theme === "dark" ? "#0B1120" : "#F8FAFC";
    }
    updateTheme(root.dataset.theme);
    toggle.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      updateTheme(theme);
      try { localStorage.setItem("guilherme-theme", theme); } catch (_) {}
    });
    systemTheme.addEventListener("change", (event) => {
      let saved;
      try { saved = localStorage.getItem("guilherme-theme"); } catch (_) {}
      if (!["dark", "light"].includes(saved)) updateTheme(event.matches ? "dark" : "light");
    });
  }

  function actionLink(label, href, iconName) {
    const anchor = element("a", "button button-outline");
    anchor.append(icon(iconName), element("span", "", label));
    setLink(anchor, webUrl(href), label);
    if (!webUrl(href)) anchor.append(element("span", "action-pending", "· Em breve"));
    return anchor;
  }

  function setupGallery(media, images, projectTitle) {
    const captures = Array.isArray(images) && images.length ? images : [null];
    const track = element("div", "gallery-track");
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", "Capturas de " + projectTitle);
    captures.forEach((capture, index) => {
      const slide = element("div", "gallery-slide");
      const placeholder = element("div", "image-placeholder");
      placeholder.append(icon("image"), element("span", "", capture ? "Imagem indisponível" : "Capturas em breve"));
      slide.append(placeholder);
      if (capture) {
        const image = element("img", "");
        image.width = 800;
        image.height = 500;
        image.hidden = true;
        slide.append(image);
        const src = typeof capture === "string" ? capture : capture.src;
        const alt = typeof capture === "string" ? projectTitle + " — captura " + (index + 1) : (capture.alt || projectTitle + " — captura " + (index + 1));
        loadImage(image, src, alt, placeholder);
      }
      track.append(slide);
    });
    media.append(track);
    if (captures.length < 2) return;
    track.tabIndex = 0;
    const controls = element("div", "gallery-controls");
    const prev = element("button", "gallery-button gallery-prev");
    const next = element("button", "gallery-button gallery-next");
    prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Captura anterior de " + projectTitle);
    next.setAttribute("aria-label", "Próxima captura de " + projectTitle);
    prev.append(icon("chevron")); next.append(icon("chevron"));
    const count = element("span", "gallery-count");
    count.setAttribute("aria-live", "polite");
    count.setAttribute("aria-atomic", "true");
    controls.append(prev, count, next);
    media.append(controls);
    let current = 0;
    let scrollFrame = 0;
    function updateControls() {
      prev.disabled = current === 0;
      next.disabled = current === captures.length - 1;
      count.textContent = (current + 1) + " / " + captures.length;
    }
    function move(index) {
      current = Math.max(0, Math.min(captures.length - 1, index));
      track.scrollTo({ left: current * track.clientWidth, behavior: reducedMotion.matches ? "instant" : "smooth" });
      updateControls();
    }
    prev.addEventListener("click", () => move(current - 1));
    next.addEventListener("click", () => move(current + 1));
    track.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") move(0);
      else if (event.key === "End") move(captures.length - 1);
      else move(current + (event.key === "ArrowRight" ? 1 : -1));
    });
    track.addEventListener("scroll", () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        current = Math.max(0, Math.min(captures.length - 1, Math.round(track.scrollLeft / (track.clientWidth || 1))));
        updateControls();
        scrollFrame = 0;
      });
    }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(() => {
      track.scrollTo({ left: current * track.clientWidth, behavior: "instant" });
    }).observe(track);
    updateControls();
  }

  function renderProjects() {
    const list = $("#project-list");
    list.replaceChildren();
    const projects = Array.isArray(config.projects) ? config.projects : [];
    const description = $("#projects .section-description");
    description.hidden = projects.some((project) => !project.provisional);
    if (!projects.length) { list.append(element("p", "empty-state", "Os projetos serão adicionados em breve.")); description.hidden = true; return; }
    projects.forEach((project, index) => {
      const card = element("article", "project-card");
      card.dataset.reveal = "";
      const titleId = "project-title-" + index;
      card.setAttribute("aria-labelledby", titleId);
      const media = element("div", "project-media");
      setupGallery(media, project.images, project.title);
      const actions = element("div", "project-actions");
      actions.append(actionLink("Ver código", project.repository, "github"), actionLink("Ver site", project.demo, "external"));
      media.append(actions);
      const copy = element("div", "project-copy");
      const title = element("h3", "", project.title);
      title.id = titleId;
      copy.append(element("span", "project-number", String(index + 1).padStart(2, "0")), title, element("p", "", project.description || ""));
      if (project.provisional) copy.append(element("span", "provisional-label", "Registro provisório"));
      const badges = element("div", "project-badges");
      (project.technologies || ["HTML", "CSS", "JavaScript"]).forEach((technology) => badges.append(element("span", "tech-badge", technology)));
      copy.append(element("h4", "project-tech-title", "Tecnologias utilizadas"), badges);
      if (project.publication) {
        const publication = element("div", "project-publication");
        publication.append(icon("github"), element("span", "", (project.provisional ? "Publicação prevista pelo " : "Publicado pelo ") + project.publication));
        copy.append(publication);
      }
      card.append(media, copy);
      list.append(card);
    });
  }

  function setupNavigation() {
    const sections = $$("main > section[id]");
    const links = $$(".sidebar-nav a[href^='#']");
    let scheduled = false;

    function update() {
      const marker = innerHeight * .4;
      let current = sections[0].id;
      sections.forEach((section) => { if (section.getBoundingClientRect().top <= marker) current = section.id; });
      if (Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 4) current = "contact";
      links.forEach((link) => {
        const active = link.getAttribute("href") === "#" + current;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      scheduled = false;
    }
    function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
    if (typeof window.IntersectionObserver === "function") {
      const observer = new IntersectionObserver(schedule, { rootMargin: "-10% 0px -50% 0px", threshold: [0, .1, .5] });
      sections.forEach((section) => observer.observe(section));
    }
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    addEventListener("hashchange", schedule);
    update();
  }
  function setupReveal() {
    if (!(typeof window.IntersectionObserver === "function") || reducedMotion.matches) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
    $$("[data-reveal]").forEach((node) => observer.observe(node));
    root.classList.add("reveal-ready");
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) { root.classList.remove("reveal-ready"); observer.disconnect(); }
    });
  }

  function setupTilt() {
    const jquery = window.jQuery;
    if (!jquery?.fn?.tilt) return;
    let tilted = [];
    function update() {
      tilted.forEach((instance) => {
        if (jquery.fn.tilt.destroy) jquery.fn.tilt.destroy.call(instance);
      });
      tilted = [];
      if (reducedMotion.matches || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      $$("[data-tilt-frame]").forEach((frame) => {
        const instance = jquery(frame).tilt({ maxTilt: 5, perspective: 1100, scale: 1, speed: 500, glare: false, reset: true });
        tilted.push(instance);
      });
    }
    try { update(); reducedMotion.addEventListener("change", update); }
    catch (_) { /* Uma falha de biblioteca não impede a navegação ou a leitura. */ }
  }

  function setupModal() {
    const modal = $("#contact-modal");
    const opener = $("#contact-open");
    const close = $("#contact-close");
    let returnFocus = null;
    let backdropStart = false;
    opener.addEventListener("click", () => {
      if (modal.open) return;
      returnFocus = document.activeElement;
      modal.showModal();
      document.body.classList.add("modal-open");
      opener.setAttribute("aria-expanded", "true");
      close.focus({ preventScroll: true });
    });
    close.addEventListener("click", () => modal.close());
    // Só feche se o gesto inteiro acontecer no fundo, sem arrastar de um campo.
    const onBackdrop = (event) => {
      const bounds = modal.getBoundingClientRect();
      return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    };
    modal.addEventListener("pointerdown", (event) => { backdropStart = event.target === modal && onBackdrop(event); });
    modal.addEventListener("click", (event) => {
      if (backdropStart && event.target === modal && onBackdrop(event)) modal.close();
      backdropStart = false;
    });
    // O dialog nativo trata Escape e torna o fundo inerte.
    // Mantenha Tab dentro do painel, inclusive ao voltar a partir do primeiro item.
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = $$('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]', modal)
        .filter((node) => node.getClientRects().length && node.tabIndex >= 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    modal.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      opener.setAttribute("aria-expanded", "false");
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
  }

  function setupForm() {
    const form = $("#contact-form");
    const submit = $("#contact-submit");
    const submitLabel = $("span", submit);
    const status = $("#form-status");
    const endpoint = webUrl(config.form?.endpoint);
    const usesWeb3Forms = endpoint === "https://api.web3forms.com/submit";
    const accessKey = typeof config.form?.access_key === "string" ? config.form.access_key.trim() : "";
    const customSend = typeof config.form?.send === "function" ? config.form.send : null;
    const enabled = Boolean(customSend || (endpoint && (!usesWeb3Forms || accessKey)));
    submit.disabled = !enabled;
    if (enabled) $("#form-hint").textContent = "Preencha os campos para enviar sua mensagem.";
    const fields = { name: $("#contact-name"), email: $("#contact-email"), message: $("#contact-message") };
    const errors = {
      name: "Informe seu nome com pelo menos 2 caracteres.",
      email: "Informe um endereço de e-mail válido.",
      message: "Escreva uma mensagem com pelo menos 10 caracteres.",
    };
    function validate(key) {
      const field = fields[key];
      const value = field.value.trim();
      const valid = key === "email" ? value.length > 0 && field.validity.valid : value.length >= (key === "name" ? 2 : 10) && value.length <= field.maxLength;
      const error = $("#" + key + "-error");
      error.textContent = valid ? "" : errors[key];
      error.hidden = valid;
      field.setAttribute("aria-invalid", String(!valid));
      return valid;
    }
    Object.entries(fields).forEach(([key, field]) => {
      field.addEventListener("blur", () => { if (field.value || field.hasAttribute("aria-invalid")) validate(key); });
      field.addEventListener("input", () => { if (field.hasAttribute("aria-invalid")) validate(key); });
    });
    function report(message, isError = false) {
      status.textContent = message;
      status.hidden = false;
      status.classList.toggle("is-error", isError);
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!enabled || submit.disabled) return;
      const results = Object.keys(fields).map((key) => [key, validate(key)]);
      const invalid = results.find(([, valid]) => !valid);
      if (invalid) { fields[invalid[0]].focus(); return; }
      const payload = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value.trim()]));
      if (usesWeb3Forms && !customSend) {
        payload.access_key = accessKey;
        payload.subject = config.form.subject || "Nova mensagem pelo portfólio";
        payload.from_name = "Portfólio de " + config.shortName;
      }
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      form.setAttribute("aria-busy", "true");
      submitLabel.textContent = "Enviando…";
      Object.values(fields).forEach((field) => { field.readOnly = true; });
      report("Enviando mensagem…");
      try {
        let result;
        if (customSend) result = await customSend(payload);
        else {
          const response = await fetch(endpoint, {
            method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error("Falha no envio.");
          result = await response.json();
        }
        // Confirme sucesso somente quando o serviço real o declarar.
        if (result !== true && result?.success !== true) throw new Error("Envio não confirmado.");
        report("Mensagem enviada. Obrigado pelo contato!");
        form.reset();
        Object.entries(fields).forEach(([key, field]) => {
          field.removeAttribute("aria-invalid");
          $("#" + key + "-error").hidden = true;
        });
      } catch (_) {
        report("Não foi possível enviar a mensagem. Tente novamente mais tarde.", true);
      } finally {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        form.removeAttribute("aria-busy");
        submitLabel.textContent = "Enviar mensagem";
        Object.values(fields).forEach((field) => { field.readOnly = false; });
      }
    });
  }

  applyContent();
  applyContactLinks();
  setupTheme();
  renderProjects();
  setupNavigation();
  setupModal();
  setupForm();
  setupReveal();
  setupTilt();
})();
