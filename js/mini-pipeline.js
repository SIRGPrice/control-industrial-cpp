"use strict";

/* ============================================================
   Minilaboratorio · Pipeline: cadena de tres máquinas
   Etapas encadenadas por colas bloqueantes (paso de mensajes).
   ============================================================ */

const PIPE_CODE = {
  hEtapa1: `void hEtapa1() {                     // tolva de entrada
  while (1) {
    Pieza p = preparar();
    cola1.push(p);                 // bloquea si cola1 está llena
  }
}`,
  hEtapa2: `void hEtapa2() {                     // cuello de botella
  while (1) {
    Pieza p = cola1.pop();         // bloquea si cola1 está vacía
    mecanizar(p);                  // tarda más que las demás
    cola2.push(p);                 // bloquea si cola2 está llena
  }
}`,
  hEtapa3: `void hEtapa3() {                     // acabado
  while (1) {
    Pieza p = cola2.pop();
    acabado(p);
    colaSalida.push(p);
  }
}`,
  hExpedicion: `void hExpedicion() {                 // expedición
  while (1) {
    Pieza p = colaSalida.pop();
    expedir(p);
  }
}`,
};

(function () {
  const m = new Motor();
  const S = {
    stats: { expedidas: 0, bloqueos1: 0, totales: 0 },
  };
  m.extra.S = S;

  m.cola("cola1", 2).cola("cola2", 2).cola("colaSalida", 3);

  m.hilo("hEtapa1", "#e5484d", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.work("Preparando pieza", 3, 3 + Math.floor(Math.random() * 2));
      const q = m.queues.get("cola1");
      if (q.items.length >= q.cap) S.stats.bloqueos1++;
      yield p.push("cola1", { icon: "🔩" }, 4, () => { S.stats.totales++; });
    }
  });

  m.hilo("hEtapa2", "#ff8958", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.pop("cola1", 3);
      yield p.work("Mecanizando (lento)", 4, 6);
      yield p.push("cola2", { icon: "🔩" }, 5);
    }
  });

  m.hilo("hEtapa3", "#46a758", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.pop("cola2", 3);
      yield p.work("Acabando", 4, 3);
      yield p.push("colaSalida", { icon: "🔩" }, 5);
    }
  });

  m.hilo("hExpedicion", "#155dfc", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.pop("colaSalida", 3);
      yield p.work("Expidiendo", 4, 2, null, () => { S.stats.expedidas++; });
    }
  });

  const PLANT = `
  <svg class="plant" viewBox="0 0 560 250">
    <g id="maquinas"></g>
    <g id="cintas"></g>
    <text id="fluxLabel" x="280" y="240" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)"></text>
  </svg>`;

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const MAQ = [
      { x: 20, name: "ETAPA 1", sub: "tolva", color: "#e5484d", q: null },
      { x: 170, name: "ETAPA 2", sub: "mecanizado · lenta", color: "#ff8958", q: "cola1" },
      { x: 320, name: "ETAPA 3", sub: "acabado", color: "#46a758", q: "cola2" },
      { x: 470, name: "EXPEDICIÓN", sub: "salida", color: "#155dfc", q: "colaSalida" },
    ];

    let mh = "";
    MAQ.forEach((ma, i) => {
      const th = m.threads.find((t) => t.name === "hEtapa" + (i + 1)) || m.threads.find((t) => t.name === "hExpedicion");
      const busy = th && (th.workLeft > 0 || (i === 1 && th.state === "blocked" && th.blockOn && th.blockOn.includes("cola1")));
      const y = 66;
      mh += `<g>
        <rect x="${ma.x}" y="${y}" width="76" height="62" rx="10" fill="${busy ? "var(--accent-soft)" : "var(--bg-code)"}"
          stroke="${busy ? "var(--accent)" : "var(--border-strong)"}" stroke-width="2"/>
        <circle cx="${ma.x + 38}" cy="${y + 20}" r="6" fill="${ma.color}"/>
        <text x="${ma.x + 38}" y="${y + 40}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text)">${ma.name}</text>
        <text x="${ma.x + 38}" y="${y + 54}" text-anchor="middle" font-size="9.5" fill="var(--text-3)">${ma.sub}</text>
      </g>`;
    });
    body.querySelector("#maquinas").innerHTML = mh;

    let ch = "";
    const CONV = [
      { x1: 100, x2: 166, q: "cola1", cap: 2 },
      { x1: 250, x2: 316, q: "cola2", cap: 2 },
      { x1: 400, x2: 466, q: "colaSalida", cap: 3 },
    ];
    CONV.forEach((c, i) => {
      const q = m.queues.get(c.q);
      ch += `<line x1="${c.x1}" y1="97" x2="${c.x2}" y2="97" stroke="var(--border-strong)" stroke-width="2.5" stroke-dasharray="6 4"/>`;
      const step = (c.x2 - c.x1) / (c.cap + 1);
      for (let s = 0; s < c.cap; s++) {
        const x = c.x1 + step * (s + 1);
        const it = q.items[s];
        ch += `<rect x="${x - 9}" y="86" width="18" height="22" rx="4" fill="${it ? "var(--accent-soft)" : "none"}"
          stroke="${it ? "var(--accent-border)" : "var(--border-strong)"}" stroke-width="1.5" ${it ? "" : 'stroke-dasharray="3 3"'}/>`;
        if (it) ch += `<text x="${x}" y="102" text-anchor="middle" font-size="11">${it.icon}</text>`;
      }
    });
    body.querySelector("#cintas").innerHTML = ch;

    const enSistema = S.stats.totales - S.stats.expedidas;
    body.querySelector("#fluxLabel").textContent = `${S.stats.expedidas} expedidas · ${enSistema} piezas en el sistema (colas: ${m.queues.get("cola1").items.length}/${m.queues.get("cola2").items.length}/${m.queues.get("colaSalida").items.length})`;
  }

  function renderKPIs(m) {
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.totales}</div><div class="kpi-k">piezas entradas</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.expedidas}</div><div class="kpi-k">piezas expedidas</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.bloqueos1}</div><div class="kpi-k">veces que la tolva esperó hueco</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: PIPE_CODE,
    interval: 320,
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.stats = { expedidas: 0, bloqueos1: 0, totales: 0 };
      built = false;
    },
  });
})();