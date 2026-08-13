"use strict";

/* ============================================================
   Minilaboratorio · Cola bloqueante: pulmón de capacidad 3
   Mensajes en vez de memoria compartida: push/pop bloqueantes
   y backpressure hacia el productor.
   ============================================================ */

const COLQ_CODE = {
  hProduccion: `void hProduccion() {             // productor
  while (1) {
    Pieza p = fabricar();
    buffer.push(p);                // bloquea si el buffer está lleno
  }
}`,
  hConsumo: `void hConsumo() {                    // consumidor
  while (1) {
    Pieza p = buffer.pop();        // bloquea si el buffer está vacío
    procesar(p);                   // trabaja fuera del buffer
  }
}`,
};

(function () {
  const m = new Motor();
  const S = {
    stats: { fabricadas: 0, procesadas: 0, bloqueos: 0 },
    sumOcc: 0,
  };
  m.extra.S = S;

  m.cola("buffer", 3);

  m.hilo("hProduccion", "#e5484d", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.work("Fabricando pieza", 3, 3 + Math.floor(Math.random() * 2));
      const q = m.queues.get("buffer");
      if (q.items.length >= q.cap) S.stats.bloqueos++;
      yield p.push("buffer", { icon: "📦" }, 4, () => { S.stats.fabricadas++; });
    }
  });

  m.hilo("hConsumo", "#46a758", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.pop("buffer", 3);
      yield p.work("Procesando pieza", 4, 5 + Math.floor(Math.random() * 3), null, () => { S.stats.procesadas++; });
    }
  });

  const PLANT = `
  <svg class="plant" viewBox="0 0 560 230">
    <rect x="20" y="48" width="120" height="84" rx="12" fill="none" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="80" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">FABRICACIÓN</text>
    <text id="prodState" x="80" y="152" text-anchor="middle" font-size="10.5" fill="var(--text-3)">en espera</text>

    <line x1="146" y1="82" x2="182" y2="82" stroke="var(--border-strong)" stroke-width="3" stroke-dasharray="5 4"/>
    <polygon points="178,75 190,82 178,89" fill="var(--border-strong)"/>

    <rect id="pulmon" x="190" y="30" width="220" height="120" rx="14" fill="none" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="300" y="52" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">PULMÓN · buffer de 3</text>
    <g id="slots"></g>
    <text id="pulState" x="300" y="172" text-anchor="middle" font-size="10.5" fill="var(--text-3)">vacío</text>

    <line x1="416" y1="82" x2="446" y2="82" stroke="var(--border-strong)" stroke-width="3" stroke-dasharray="5 4"/>
    <polygon points="440,75 452,82 440,89" fill="var(--border-strong)"/>

    <rect x="452" y="48" width="90" height="84" rx="12" fill="none" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="497" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">PROCESADO</text>
    <text id="conState" x="497" y="152" text-anchor="middle" font-size="10.5" fill="var(--text-3)">en espera</text>
  </svg>`;

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const q = m.queues.get("buffer");
    const prod = m.threads.find((t) => t.name === "hProduccion");
    const cons = m.threads.find((t) => t.name === "hConsumo");

    const slots = body.querySelector("#slots");
    let html = "";
    for (let i = 0; i < 3; i++) {
      const x = 214 + i * 64;
      const it = q.items[i];
      html += `<rect x="${x}" y="68" width="48" height="44" rx="8" fill="${it ? "var(--accent-soft)" : "none"}"
        stroke="${it ? "var(--accent-border)" : "var(--border-strong)"}" stroke-width="2" ${it ? "" : 'stroke-dasharray="4 4"'}/>`;
      if (it) html += `<text x="${x + 24}" y="97" text-anchor="middle" font-size="18">📦</text>`;
    }
    slots.innerHTML = html;

    const pulmon = body.querySelector("#pulmon");
    const lleno = q.items.length === q.cap;
    pulmon.setAttribute("stroke", lleno ? "var(--accent)" : "var(--border-strong)");
    pulmon.setAttribute("fill", q.items.length ? "var(--accent-soft)" : "none");
    body.querySelector("#pulState").textContent = q.items.length
      ? `${q.items.length} de 3 posiciones ocupadas` : "vacío";
    body.querySelector("#prodState").textContent =
      prod.state === "blocked" ? "BLOQUEADA: no hay hueco" : (prod.workLeft > 0 ? "fabricando…" : "en espera");
    body.querySelector("#conState").textContent =
      cons.state === "blocked" ? "BLOQUEADO: no hay piezas" : (cons.workLeft > 0 ? "procesando…" : "en espera");
  }

  function renderKPIs(m) {
    const media = m.t ? (S.sumOcc / m.t).toFixed(2) : "0";
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.fabricadas}</div><div class="kpi-k">fabricadas</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.procesadas}</div><div class="kpi-k">procesadas</div></div>
      <div class="kpi"><div class="kpi-v">${media}</div><div class="kpi-k">ocupación media del pulmón</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.bloqueos}</div><div class="kpi-k">backpressure: fabricación parada</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: COLQ_CODE,
    interval: 330,
    onTick: (m) => { S.sumOcc += m.queues.get("buffer").items.length; },
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.stats = { fabricadas: 0, procesadas: 0, bloqueos: 0 };
      S.sumOcc = 0;
      built = false;
    },
  });
})();