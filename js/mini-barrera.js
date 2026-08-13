"use strict";

/* ============================================================
   Minilaboratorio · Barrera: tres tolvas descargan a la vez
   Barrera de sincronización clásica con mutex y contador.
   ============================================================ */

const BARR_CODE = `void hTolva(int n) {                  // una por tolva
  while (1) {
    llenarTolva(n);                // se va llenando sola
    wait(sMutex);
    nListas++;
    if (nListas == 3) {            // la última en llegar…
      nListas = 0;
      signal(sMutex);
      signal(sBarrera);            // …abre la compuerta 3 veces
      signal(sBarrera);
      signal(sBarrera);
    } else {
      signal(sMutex);
      wait(sBarrera);              // espera a las demás
    }
    descargar(n);                  // descarga simultánea
  }
}`;

(function () {
  const m = new Motor();
  const S = {
    stats: { descargas: 0 },
    nListas: 0,
    llenando: [false, false, false],
    vaciando: [false, false, false],
    nivel: [0.12, 0.08, 0.16],
    dur: [0, 0, 0],
    abierta: false,
  };
  m.extra.S = S;

  m.sem("sMutex", 1).sem("sBarrera", 0);

  for (let i = 0; i < 3; i++) {
    m.hilo("hTolva" + (i + 1), "#e5484d", function* (m, th, idx = i) {
      const p = P(m, th);
      while (true) {
        const dur = 4 + Math.floor(Math.random() * 4);
        yield p.work("Llenando tolva", 3, dur,
          () => { S.llenando[idx] = true; S.dur[idx] = dur; },
          () => { S.llenando[idx] = false; });
        yield p.wait("sMutex", 4, () => { S.nListas++; });
        if (S.nListas === 3) {
          S.nListas = 0;
          S.abierta = true;
          yield p.signal("sMutex", 8);
          yield p.signal("sBarrera", 9);
          yield p.signal("sBarrera", 10);
          yield p.signal("sBarrera", 11);
        } else {
          yield p.signal("sMutex", 13);
          yield p.wait("sBarrera", 14);
        }
        yield p.work("Descargando tolva", 16, 4,
          () => { S.vaciando[idx] = true; S.dur[idx] = 4; S.abierta = false; },
          () => { S.vaciando[idx] = false; S.stats.descargas++; });
      }
    });
  }

  const PLANT = `
  <svg class="plant" viewBox="0 0 560 280">
    <g id="silos"></g>
    <rect id="canal" x="60" y="190" width="440" height="30" rx="8" fill="var(--bg-code)" stroke="var(--border-strong)" stroke-width="1.5"/>
    <text id="valveLabel" x="280" y="212" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-3)">compuerta cerrada</text>
    <rect id="valve" x="262" y="190" width="36" height="30" fill="var(--border-strong)"/>
    <text id="stateLabel" x="280" y="262" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">esperando tolvas…</text>
  </svg>`;

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const silos = body.querySelector("#silos");
    let html = "";
    for (let i = 0; i < 3; i++) {
      const x = 80 + i * 140;
      const h = Math.round(96 * S.nivel[i]);
      const th = m.threads.find((t) => t.name === "hTolva" + (i + 1));
      html += `<g>
        <path d="M${x} 60 L${x + 24} 30 L${x + 106} 30 L${x + 130} 60 L${x + 130} 190 L${x} 190 Z"
          fill="none" stroke="var(--border-strong)" stroke-width="2"/>
        <rect x="${x + 10}" y="${190 - h}" width="110" height="${h}" fill="var(--accent-soft)"/>
        <rect x="${x + 10}" y="${190 - h}" width="110" height="2" fill="var(--accent)"/>
        <text x="${x + 65}" y="74" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">TOLVA ${i + 1}</text>
        <text x="${x + 65}" y="92" text-anchor="middle" font-size="10" fill="var(--text-3)">
          ${S.llenando[i] ? "llenando…" : S.vaciando[i] ? "descargando" : th.state === "blocked" ? "esperando" : "lista"}</text>
      </g>`;
    }
    silos.innerHTML = html;

    const abierta = S.abierta || S.vaciando.some(Boolean);
    body.querySelector("#valveLabel").textContent = abierta ? "compuerta ABIERTA · descarga simultánea" : "compuerta cerrada";
    body.querySelector("#valve").setAttribute("fill", abierta ? "var(--accent)" : "var(--border-strong)");
    body.querySelector("#stateLabel").textContent =
      abierta ? "¡Las tres tolvas descargan a la vez!" : `${S.nListas} de 3 tolvas listas`;
  }

  function renderKPIs(m) {
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.descargas}</div><div class="kpi-k">descargas simultáneas</div></div>
      <div class="kpi"><div class="kpi-v">${m.sems.get("sBarrera").waiters.length}</div><div class="kpi-k">tolvas en la barrera</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: { hTolva1: BARR_CODE, hTolva2: BARR_CODE, hTolva3: BARR_CODE },
    interval: 330,
    onTick: () => {
      for (let i = 0; i < 3; i++) {
        if (S.llenando[i]) S.nivel[i] = Math.min(1, S.nivel[i] + 0.07);
        else if (S.vaciando[i]) S.nivel[i] = Math.max(0.04, S.nivel[i] - 0.09);
      }
    },
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.stats = { descargas: 0 };
      S.nListas = 0;
      S.llenando = [false, false, false];
      S.vaciando = [false, false, false];
      S.nivel = [0.12, 0.08, 0.16];
      S.abierta = false;
      built = false;
    },
  });
})();