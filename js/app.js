"use strict";

/* Estructura de navegación única para todo el sitio */
const NAV = [
  {
    label: "Empezar aquí",
    items: [
      { id: "index", href: "index.html", title: "Inicio" },
      { id: "guia", href: "docs/guia.html", title: "Cómo usar esta web" },
    ],
  },
  {
    label: "Fundamentos",
    items: [
      { id: "hilos", href: "docs/hilos.html", title: "Hilos con std::thread" },
      { id: "riesgos", href: "docs/riesgos.html", title: "Riesgos del estado compartido" },
      { id: "mutex", href: "docs/mutex.html", title: "Mutex y candados RAII" },
      { id: "condvar", href: "docs/condvar.html", title: "Variables de condición" },
      { id: "atomicos", href: "docs/atomicos.html", title: "Atómicos y sin candados" },
    ],
  },
  {
    label: "Semáforos",
    items: [
      { id: "semaforos", href: "docs/semaforos.html", title: "Semáforos: teoría y API" },
      { id: "sem-patrones", href: "docs/semaforos-patrones.html", title: "Patrones con semáforos" },
    ],
  },
  {
    label: "Colas",
    items: [
      { id: "colas", href: "docs/colas.html", title: "Colas seguras para hilos" },
      { id: "mensajes", href: "docs/paso-mensajes.html", title: "Paso de mensajes" },
    ],
  },
  {
    label: "Patrones clásicos",
    items: [
      { id: "pc", href: "docs/productor-consumidor.html", title: "Productor–consumidor" },
      { id: "lw", href: "docs/lectores-escritores.html", title: "Lectores–escritores" },
      { id: "barrera", href: "docs/barrera-rendezvous.html", title: "Barrera y rendezvous" },
      { id: "pipeline", href: "docs/pipeline.html", title: "Pipeline y cintas" },
    ],
  },
  {
    label: "Control de planta",
    items: [
      { id: "arq", href: "docs/planta-arquitectura.html", title: "Arquitectura de control" },
      { id: "diseno", href: "docs/planta-diseno.html", title: "Diseño paso a paso" },
      { id: "super", href: "docs/planta-super.html", title: "Supervisión, alarmas y parada" },
    ],
  },
  {
    label: "Laboratorios",
    items: [
      { id: "lab-fms", href: "labs/fms.html", title: "Célula FMS: prensa, CNC y robot" },
      { id: "lab-env", href: "labs/envasado.html", title: "Línea de envasado" },
      { id: "lab-colas", href: "labs/cadena.html", title: "Línea de mecanizado con colas" },
    ],
  },
  {
    label: "Referencia",
    items: [
      { id: "cheat", href: "ref/cheatsheet.html", title: "Hoja de referencia" },
      { id: "errores", href: "ref/errores.html", title: "Errores comunes" },
      { id: "glosario", href: "ref/glosario.html", title: "Glosario" },
      { id: "ejercicios", href: "ref/ejercicios.html", title: "Ejercicios resueltos" },
    ],
  },
];

const SITE = {
  name: "C++ Concurrente",
  sub: "Control industrial",
  repo: "https://github.com/SIRGPrice/control-industrial-cpp",
};

(function () {
  const script = document.currentScript;
  const src = script.getAttribute("src") || "";
  const depth = (src.match(/\.\.\//g) || []).length;
  const BASE = "../".repeat(depth);
  const pageId = document.body.dataset.page;

  /* ---------- Barra superior ---------- */
  const topbar = document.getElementById("topbar");
  if (topbar) {
    topbar.innerHTML = `
      <button class="iconbtn" id="menu-btn" aria-label="Menú">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <a class="brand" href="${BASE}index.html">
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="1.5" width="10" height="21" rx="3.2" fill="#3b3f4a"/>
          <circle cx="12" cy="6.3" r="2.6" fill="#ef4444"/>
          <circle cx="12" cy="12" r="2.6" fill="#f59e0b"/>
          <circle cx="12" cy="17.7" r="2.6" fill="#22c55e"/>
        </svg>
        <span>${SITE.name}<small> · ${SITE.sub}</small></span>
      </a>
      <div id="searchbox">
        <span class="icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>
        </span>
        <input id="search-input" type="search" placeholder="Buscar en la documentación…" autocomplete="off" spellcheck="false">
        <kbd class="hint">/</kbd>
        <div id="search-results"></div>
      </div>
      <div class="top-actions">
        <button class="iconbtn" id="theme-btn" aria-label="Cambiar tema">
          <svg id="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"></svg>
        </button>
        <a class="iconbtn" href="${SITE.repo}" target="_blank" rel="noopener" aria-label="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
        </a>
      </div>`;
  }

  /* ---------- Tema ---------- */
  const themeBtn = document.getElementById("theme-btn");
  const themeIcon = document.getElementById("theme-icon");
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("cppc-theme", t); } catch (e) {}
    if (themeIcon) {
      themeIcon.innerHTML = t === "dark"
        ? '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/>'
        : '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>';
    }
  }
  let saved = null;
  try { saved = localStorage.getItem("cppc-theme"); } catch (e) {}
  applyTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  if (themeBtn) themeBtn.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  /* ---------- Lateral ---------- */
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    let html = "";
    for (const sec of NAV) {
      html += `<div class="nav-section"><p class="nav-label">${sec.label}</p>`;
      for (const it of sec.items) {
        html += `<a class="nav-link${it.id === pageId ? " active" : ""}" href="${BASE}${it.href}">${it.title}</a>`;
      }
      html += `</div>`;
    }
    sidebar.innerHTML = html;
  }
  const backdrop = document.createElement("div");
  backdrop.id = "sidebar-backdrop";
  document.body.appendChild(backdrop);
  const menuBtn = document.getElementById("menu-btn");
  if (menuBtn) menuBtn.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  backdrop.addEventListener("click", () => document.body.classList.remove("nav-open"));

  /* ---------- Índice de la página ---------- */
  const toc = document.getElementById("toc");
  const content = document.getElementById("content");
  if (toc && content) {
    const heads = content.querySelectorAll("h2, h3");
    let html = '<p class="toc-title">En esta página</p>';
    heads.forEach((h, i) => {
      if (!h.id) h.id = "sec-" + i;
      html += `<a href="#${h.id}" class="${h.tagName.toLowerCase()}">${h.textContent}</a>`;
    });
    if (heads.length) toc.innerHTML = html;

    const links = [...toc.querySelectorAll("a")];
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
        }
      }
    }, { rootMargin: "-80px 0px -70% 0px" });
    heads.forEach((h) => obs.observe(h));
  }

  /* ---------- Anterior / siguiente ---------- */
  const pagenav = document.getElementById("pagenav");
  if (pagenav) {
    const flat = NAV.flatMap((s) => s.items);
    const idx = flat.findIndex((i) => i.id === pageId);
    let html = "";
    if (idx > 0) {
      const p = flat[idx - 1];
      html += `<a class="prev" href="${BASE}${p.href}"><span class="pn-label">← Anterior</span><br><span class="pn-title">${p.title}</span></a>`;
    } else html += "<span></span>";
    if (idx >= 0 && idx < flat.length - 1) {
      const n = flat[idx + 1];
      html += `<a class="next" href="${BASE}${n.href}"><span class="pn-label">Siguiente →</span><br><span class="pn-title">${n.title}</span></a>`;
    }
    pagenav.innerHTML = html;
  }

  /* ---------- Bloques de código ---------- */
  document.querySelectorAll("pre[data-lang]").forEach((pre) => {
    const wrap = document.createElement("div");
    wrap.className = "codeblock";
    pre.parentNode.insertBefore(wrap, pre);
    const head = document.createElement("div");
    head.className = "cb-head";
    head.innerHTML = `<span>${pre.dataset.file || ""}</span>
      <button class="copybtn">Copiar</button>
      <span class="lang">${pre.dataset.lang}</span>`;
    wrap.appendChild(head);
    wrap.appendChild(pre);
    head.querySelector(".copybtn").addEventListener("click", () => {
      navigator.clipboard.writeText(pre.innerText).then(() => {
        const b = head.querySelector(".copybtn");
        b.textContent = "¡Copiado!";
        setTimeout(() => (b.textContent = "Copiar"), 1400);
      });
    });
  });

  /* ---------- Búsqueda ---------- */
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  if (input && results) {
    let corpus = null;

    async function buildCorpus() {
      if (corpus) return corpus;
      corpus = [];
      const docs = NAV.flatMap((s) => s.items.map((i) => ({ ...i, sec: s.label })));
      await Promise.all(docs.map(async (d) => {
        try {
          const r = await fetch(BASE + d.href);
          const txt = await r.text();
          const dom = new DOMParser().parseFromString(txt, "text/html");
          const art = dom.getElementById("content") || dom.body;
          art.querySelectorAll("pre, .lab-shell, script").forEach((n) => n.remove());
          corpus.push({ id: d.id, href: d.href, title: d.title, sec: d.sec, text: art.textContent.replace(/\s+/g, " ") });
        } catch (e) { /* sin conexión con esa página */ }
      }));
      return corpus;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    }

    async function doSearch(q) {
      q = q.trim().toLowerCase();
      if (q.length < 2) { results.classList.remove("open"); return; }
      const c = await buildCorpus();
      const terms = q.split(/\s+/);
      const hits = [];
      for (const d of c) {
        const hay = (d.title + " " + d.text).toLowerCase();
        if (terms.every((t) => hay.includes(t))) {
          let snip = "";
          const pos = d.text.toLowerCase().indexOf(terms[0]);
          if (pos >= 0) {
            const start = Math.max(0, pos - 60);
            snip = (start > 0 ? "…" : "") + d.text.slice(start, pos + 120) + "…";
          }
          hits.push({ d, snip });
        }
        if (hits.length >= 12) break;
      }
      if (!hits.length) {
        results.innerHTML = `<div class="sr-empty">Sin resultados para «${escapeHtml(q)}»</div>`;
      } else {
        results.innerHTML = hits.map(({ d, snip }) => {
          let t = escapeHtml(snip);
          for (const term of terms) {
            t = t.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`);
          }
          return `<a class="sr-item" href="${BASE}${d.href}">
            <div class="crumb">${d.sec}</div>
            <div class="sr-title">${escapeHtml(d.title)}</div>
            ${t ? `<div class="sr-snip">${t}</div>` : ""}
          </a>`;
        }).join("");
      }
      results.classList.add("open");
    }

    let timer;
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => doSearch(input.value), 160); });
    input.addEventListener("focus", () => { if (input.value.trim().length >= 2) doSearch(input.value); });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#searchbox")) results.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); input.focus();
      }
      if (e.key === "Escape") { results.classList.remove("open"); input.blur(); }
    });
  }
})();

/* Resaltado de sintaxis C++ ligero para bloques estáticos */
(function () {
  const KW = new Set(["alignas","alignof","asm","auto","break","case","catch","class","co_await","co_return","co_yield","concept","const","constexpr","consteval","constinit","continue","decltype","default","delete","do","else","enum","explicit","export","extern","final","for","friend","goto","if","inline","mutable","namespace","new","noexcept","operator","override","private","protected","public","register","reinterpret_cast","requires","return","sizeof","static","static_assert","static_cast","struct","switch","template","this","thread_local","throw","try","typedef","typeid","typename","union","using","virtual","volatile","while","and","or","not","true","false","nullptr","wait","signal","acquire","release"]);
  const TY = new Set(["int","bool","char","void","float","double","size_t","uint8_t","uint16_t","uint32_t","int16_t","int32_t","int64_t","std","thread","jthread","mutex","recursive_mutex","lock_guard","unique_lock","scoped_lock","condition_variable","condition_variable_any","atomic","counting_semaphore","binary_semaphore","string","queue","deque","vector","array","optional","stop_token","stop_source","stop_callback","semaforo","bsem","pthread_t","Botella","Pieza","Mensaje","ColaBloqueante","Semaforo","Temporizador","Canal","Regulador","Orden","Alarma"]);

  function highlight(src) {
    let out = "";
    const re = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(^[ \t]*#[^\n]*)|\b(0[xX][0-9a-fA-F]+|\d+\.?\d*[fFuUlL]*)\b|([A-Za-z_][A-Za-z0-9_]*)/gm;
    let last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += escape(src.slice(last, m.index));
      const [full, com, str, chr, pp, num, word] = m;
      if (com) out += `<span class="tok-com">${escape(com)}</span>`;
      else if (str) out += `<span class="tok-str">${escape(str)}</span>`;
      else if (chr) out += `<span class="tok-str">${escape(chr)}</span>`;
      else if (pp) out += `<span class="tok-pp">${escape(pp)}</span>`;
      else if (num) out += `<span class="tok-num">${escape(num)}</span>`;
      else if (word) {
        if (KW.has(word)) out += `<span class="tok-kw">${word}</span>`;
        else if (TY.has(word)) out += `<span class="tok-type">${word}</span>`;
        else {
          const after = src.slice(re.lastIndex, re.lastIndex + 2);
          if (/^\s*\(/.test(after) && !KW.has(word)) out += `<span class="tok-fn">${word}</span>`;
          else out += word;
        }
      }
      last = re.lastIndex;
    }
    out += escape(src.slice(last));
    return out;
  }
  function escape(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  window.cppHighlight = highlight;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("pre[data-lang='cpp'] code, pre[data-lang='c'] code").forEach((code) => {
      code.innerHTML = highlight(code.textContent);
    });
    document.querySelectorAll("pre[data-lang='cpp'], pre[data-lang='c']").forEach((pre) => {
      if (pre.dataset.numbers === "") {
        const code = pre.querySelector("code");
        code.innerHTML = code.innerHTML.split("\n").map((l, i) =>
          `<span class="lineno">${i + 1}</span>${l}`).join("\n");
      }
    });
  });
})();
