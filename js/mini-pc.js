"use strict";

/* ============================================================
   Minilaboratorio · Productor–consumidor: horno de cocción
   El patrón clásico con tres semáforos (huecos, piezas, mutex).
   ============================================================ */

const PC_CODE = {
  hCarga: `void hCarga() {                     // hilo productor
  while (1) {
    Pieza p = prepararPieza();    // prepara la pieza en bruto
    wait(sHuecos);                // espera un hueco en el horno
    wait(sMutex);                 // región crítica
    horno.push(p);                // mete la pieza en el horno
    signal(sMutex);               // sale de la región crítica
    signal(sPiezas);              // una pieza más en cocción
  }
}`,
  hDescarga: `void hDescarga() {                   // hilo consumidor
  while (1) {
    wait(sPiezas);                // espera una pieza cocida
    wait(sMutex);                 // región crítica
    Pieza p = horno.pop();        // saca la pieza del horno
    signal(sMutex);               // sale de la región crítica
    signal(sHuecos);              // libera un hueco del horno
    enfriar(p);                   // enfría y almacena
  }
}`,
};

(function () {
  const m = new Motor();
  const S = {
    stats: { preparadas: 0, enfriadas: 0, bloqueos: 0 },
    sumOcc: 0,
  };
  m.extra.S = S;

  m.sem("sHuecos", 3).sem("sPiezas", 0).sem("sMutex", 1);
  m.cola("horno", 3);

  m.hilo("hCarga", "#e5484d", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.work("Preparando pieza", 3, 3 + Math.floor(Math.random() * 3));
      const antes = m.sems.get("sHuecos").value;
      yield p.wait("sHuecos", 4, () => { if (antes === 0) S.stats.bloqueos++; });
      yield p.wait("sMutex", 5);
      yield p.push("horno", { icon: "🏺" }, 6, () => { S.stats.preparadas++; });
      yield p.signal("sMutex", 7);
      yield p.signal("sPiezas", 8);
    }
  });

  m.hilo("hDescarga", "#46a758", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.wait("sPiezas", 3);
      yield p.wait("sMutex", 4);
      yield p.pop("horno", 5);
      yield p.signal("sMutex", 6);
      yield p.signal("sHuecos", 7);
      yield p.work("Enfriando pieza", 8, 4 + Math.floor(Math.random() * 4), null, () => { S.stats.enfriadas++; });
    }
  });

  const PLANT = `
  <svg class="plant" viewBox="0 0 560 240">
    <rect x="24" y="40" width="110" height="78" rx="12" fill="none" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="79" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">PREPARACIÓN</text>
    <text id="prepState" x="79" y="136" text-anchor="middle" font-size="10.5" fill="var(--text-3)">en espera</text>

    <line x1="140" y1="70" x2="172" y2="70" stroke="var(--border-strong)" stroke-width="3" stroke-dasharray="5 4"/>
    <polygon points="170,63 180,70 170,77" fill="var(--border-strong)"/>

    <rect id="horno" x="180" y="28" width="240" height="112" rx="14" fill="none" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="300" y="50" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">HORNO · cola protegida por sMutex</text>
    <g id="slots"></g>
    <text id="hornoState" x="300" y="165" text-anchor="middle" font-size="10.5" fill="var(--text-3)">vacío</text>

    <line x1="426" y1="70" x2="450" y2="70" stroke="var(--border-strong)" stroke-width="3" stroke-dasharray="5 4"/>
    <polygon points="444,63 454,70 444,77" fill="var(--border-strong)"/>

    <rect x="458" y="40" width="82" height="78" rx="12" fill="none" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="499" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">ENFRIADO</text>
    <text id="coolState" x="499" y="136" text-anchor="middle" font-size="10.5" fill="var(--text-3)">en espera</text>
  </svg>`;

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const q = m.queues.get("horno");
    const prod = m.threads.find((t) => t.name === "hCarga");
    const cons = m.threads.find((t) => t.name === "hDescarga");

    const slots = body.querySelector("#slots");
    let html = "";
    for (let i = 0; i < 3; i++) {
      const x = 208 + i * 62;
      const it = q.items[i];
      html += `<rect x="${x}" y="66" width="46" height="52" rx="8" fill="${it ? "var(--accent-soft)" : "none"}"
        stroke="${it ? "var(--accent-border)" : "var(--border-strong)"}" stroke-width="2" ${it ? "" : 'stroke-dasharray="4 4"'}/>`;
      if (it) html += `<text x="${x + 23}" y="100" text-anchor="middle" font-size="20">🏺</text>`;
    }
    slots.innerHTML = html;

    const horno = body.querySelector("#horno");
    const llena = q.items.length > 0;
    horno.setAttribute("fill", llena ? "var(--accent-soft)" : "none");
    horno.setAttribute("stroke", q.items.length === q.cap ? "var(--accent)" : "var(--border-strong)");
    body.querySelector("#hornoState").textContent = q.items.length
      ? `cociendo ${q.items.length} de 3 piezas` : "vacío";
    body.querySelector("#prepState").textContent =
      prod.state === "blocked" ? "bloqueada: horno lleno" : (prod.workLeft > 0 ? "preparando…" : "en espera");
    body.querySelector("#coolState").textContent =
      cons.state === "blocked" ? "bloqueada: sin piezas" : (cons.workLeft > 0 ? "enfriando…" : "en espera");
  }

  function renderKPIs(m) {
    const media = m.t ? (S.sumOcc / m.t).toFixed(2) : "0";
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.preparadas}</div><div class="kpi-k">piezas al horno</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.enfriadas}</div><div class="kpi-k">piezas enfriadas</div></div>
      <div class="kpi"><div class="kpi-v">${media}</div><div class="kpi-k">ocupación media</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.bloqueos}</div><div class="kpi-k">bloqueos del productor</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: PC_CODE,
    interval: 340,
    onTick: (m) => { S.sumOcc += m.queues.get("horno").items.length; },
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.stats = { preparadas: 0, enfriadas: 0, bloqueos: 0 };
      S.sumOcc = 0;
      built = false;
    },
  });
})();