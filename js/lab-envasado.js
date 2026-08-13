"use strict";

/* ============================================================
   Laboratorio 2 · Línea de envasado
   Productor–consumidor con buffer limitado: semáforo de huecos,
   semáforo de elementos y mutex para proteger la cola compartida.
   ============================================================ */

const ENV_CODE = {
  hEnvasadora: `void hEnvasadora() {              // hilo productor
  while (1) {
    Botella b = llenarBotella();  // "fabrica" una botella
    wait(sHuecos);                // espera un hueco libre en el buffer
    wait(sMutex);                 // entra en la región crítica
    buffer.push(b);               // deposita la botella
    signal(sMutex);               // sale de la región crítica
    signal(sBotellas);            // avisa: hay una botella llena más
  }
}`,
  hEmpaquetadora: `void hEmpaquetadora() {           // hilo consumidor
  while (1) {
    wait(sBotellas);              // espera una botella llena
    wait(sMutex);                 // entra en la región crítica
    Botella b = buffer.pop();     // retira la botella
    signal(sMutex);               // sale de la región crítica
    signal(sHuecos);              // libera un hueco del buffer
    empaquetar(b);                // empaqueta la botella
  }
}`,
};

(function () {
  const m = new Motor();
  const S = { stats: { producidas: 0, empaquetadas: 0, bloqueosProd: 0 }, sumOcc: 0, filling: false, packing: false };
  m.extra.S = S;

  m.sem("sHuecos", 4).sem("sBotellas", 0).sem("sMutex", 1);
  m.cola("buffer", 4);

  m.hilo("hEnvasadora", "#e5484d", (m, th) => {
    const p = P(m, th);
    while (true) {
      yield p.work("Llenando botella", 3, 3 + Math.floor(Math.random() * 3), () => { S.filling = true; }, () => { S.filling = false; });
      const antes = m.sems.get("sHuecos").value;
      yield p.wait("sHuecos", 4, () => { if (antes === 0) S.stats.bloqueosProd++; });
      yield p.wait("sMutex", 5);
      yield p.push("buffer", { icon: "🧴" }, 6, () => { S.stats.producidas++; });
      yield p.signal("sMutex", 7);
      yield p.signal("sBotellas", 8);
    }
  });

  m.hilo("hEmpaquetadora", "#46a758", (m, th) => {
    const p = P(m, th);
    while (true) {
      yield p.wait("sBotellas", 3);
      yield p.wait("sMutex", 4);
      const b = yield p.pop("buffer", 5);
      yield p.signal("sMutex", 6);
      yield p.signal("sHuecos", 7);
      yield p.work("Empaquetando", 8, 4 + Math.floor(Math.random() * 4), () => { S.packing = true; }, () => { S.packing = false; S.stats.empaquetadas++; });
    }
  });

  const PLANT = `
  <svg class="plant" viewBox="0 0 560 250">
    <!-- llenadora -->
    <rect x="30" y="36" width="96" height="74" rx="10" fill="var(--bg-soft)" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="78" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">LLENADORA</text>
    <rect x="66" y="70" width="24" height="18" rx="3" fill="#8b93a7"/>
    <rect id="chorro" x="74" y="88" width="8" height="26" fill="#60a5fa" opacity="0"/>
    <text id="fillState" x="78" y="128" text-anchor="middle" font-size="10.5" fill="var(--text-3)">en espera</text>

    <!-- cinta / buffer -->
    <rect x="160" y="130" width="270" height="52" rx="9" fill="var(--bg-soft)" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="295" y="122" text-anchor="middle" font-size="11" fill="var(--text-3)">BUFFER (cola protegida por sMutex)</text>
    <g id="slots"></g>

    <!-- empaquetadora -->
    <rect x="452" y="36" width="96" height="74" rx="10" fill="var(--bg-soft)" stroke="var(--border-strong)" stroke-width="2"/>
    <text x="500" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">EMPAQUETADORA</text>
    <rect id="caja" x="478" y="70" width="44" height="30" rx="4" fill="#d3a24b" opacity=".25"/>
    <text id="packState" x="500" y="128" text-anchor="middle" font-size="10.5" fill="var(--text-3)">en espera</text>
  </svg>`;

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const q = m.queues.get("buffer");

    const slots = body.querySelector("#slots");
    let html = "";
    for (let i = 0; i < 4; i++) {
      const x = 180 + i * 64;
      const it = q.items[i];
      html += `<rect x="${x}" y="140" width="46" height="34" rx="6" fill="${it ? "var(--accent-soft)" : "none"}"
        stroke="${it ? "var(--accent-border)" : "var(--border-strong)"}" stroke-width="2" ${it ? "" : 'stroke-dasharray="4 4"'}/>`;
      if (it) html += `<text x="${x + 23}" y="163" text-anchor="middle" font-size="17">🧴</text>`;
    }
    slots.innerHTML = html;

    body.querySelector("#chorro").setAttribute("opacity", S.filling ? "1" : "0");
    body.querySelector("#fillState").textContent = S.filling ? "llenando…" : "en espera";
    body.querySelector("#caja").setAttribute("opacity", S.packing ? "1" : ".25");
    body.querySelector("#packState").textContent = S.packing ? "empaquetando…" : "en espera";
  }

  function renderKPIs(m) {
    const media = m.t ? (S.sumOcc / m.t).toFixed(2) : "0";
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.producidas}</div><div class="kpi-k">botellas llenadas</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.empaquetadas}</div><div class="kpi-k">botellas empaquetadas</div></div>
      <div class="kpi"><div class="kpi-v">${media}</div><div class="kpi-k">ocupación media del buffer</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.bloqueosProd}</div><div class="kpi-k">bloqueos del productor</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: ENV_CODE,
    interval: 340,
    onTick: (m) => { S.sumOcc += m.queues.get("buffer").items.length; },
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.stats = { producidas: 0, empaquetadas: 0, bloqueosProd: 0 };
      S.sumOcc = 0; S.filling = false; S.packing = false;
      built = false;
    },
  });
})();
