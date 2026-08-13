"use strict";

/* ============================================================
   Laboratorio 3 · Línea de mecanizado con colas bloqueantes
   Paso de mensajes entre estaciones: cada máquina es un hilo que
   consume de la cola de su izquierda y produce en la de su
   derecha. M2 es el cuello de botella: observa cómo la presión
   se propaga hacia atrás (backpressure).
   ============================================================ */

const CADENA_CODE = {
  hAlimentador: `void hAlimentador() {
  while (1) {
    Pieza p = nuevaPieza();      // genera pieza con nº de serie
    cola1.push(p);               // se bloquea si cola1 está llena
  }
}`,
  hMaquina1: `void hMaquina1() {
  while (1) {
    Pieza p = cola1.pop();       // se bloquea si cola1 está vacía
    mecaniza(p, 1);              // mecaniza la pieza
    cola2.push(p);               // se bloquea si cola2 está llena
    colaTel.push({1, p.n});      // telemetría para el supervisor
  }
}`,
  hMaquina2: `void hMaquina2() {
  while (1) {
    Pieza p = cola2.pop();       // se bloquea si cola2 está vacía
    mecaniza(p, 2);              // operación lenta (cuello de botella)
    cola3.push(p);               // se bloquea si cola3 está llena
    colaTel.push({2, p.n});      // telemetría para el supervisor
  }
}`,
  hMaquina3: `void hMaquina3() {
  while (1) {
    Pieza p = cola3.pop();       // se bloquea si cola3 está vacía
    mecaniza(p, 3);              // mecaniza la pieza
    colaSalida.push(p);          // se bloquea si colaSalida está llena
    colaTel.push({3, p.n});      // telemetría para el supervisor
  }
}`,
  hSalida: `void hSalida() {
  while (1) {
    Pieza p = colaSalida.pop();  // espera pieza terminada
    embalar(p);                  // la embala y contabiliza
  }
}`,
  hSupervisor: `void hSupervisor() {
  while (1) {
    Msg msg = colaTel.pop();     // espera mensaje de telemetría
    registrar(msg);              // actualiza estadísticas de planta
  }
}`,
};

(function () {
  const m = new Motor();
  const S = { serial: 0, stats: { inyectadas: 0, terminadas: 0, tel: { M1: 0, M2: 0, M3: 0 } } };
  m.extra.S = S;

  m.cola("cola1", 2).cola("cola2", 2).cola("cola3", 2).cola("colaSalida", 3).cola("colaTel", 4);

  m.hilo("hAlimentador", "#8b5cf6", (m, th) => {
    const p = P(m, th);
    while (true) {
      yield p.work("Generando pieza", 3, 3, null, () => { S.serial++; S.stats.inyectadas++; });
      yield p.push("cola1", { txt: S.serial + 1 }, 4);
    }
  });

  const maquina = (nombre, color, qIn, qOut, lineaPush, ticks, tag) => (m, th) => {
    const p = P(m, th);
    while (true) {
      const pieza = yield p.pop(qIn, 3);
      yield p.work(`Mecanizando #${pieza.txt}`, 4, ticks);
      yield p.push(qOut, pieza, 5);
      yield p.push("colaTel", { txt: tag }, 6);
    }
  };

  m.hilo("hMaquina1", "#e5484d", maquina("hMaquina1", "#e5484d", "cola1", "cola2", 5, 4, "M1"));
  m.hilo("hMaquina2", "#f76b15", maquina("hMaquina2", "#f76b15", "cola2", "cola3", 5, 7, "M2"));
  m.hilo("hMaquina3", "#3b82f6", maquina("hMaquina3", "#3b82f6", "cola3", "colaSalida", 5, 4, "M3"));

  m.hilo("hSalida", "#46a758", (m, th) => {
    const p = P(m, th);
    while (true) {
      const pieza = yield p.pop("colaSalida", 3);
      yield p.work(`Embala #${pieza.txt}`, 4, 3, null, () => { S.stats.terminadas++; });
    }
  });

  m.hilo("hSupervisor", "#12a594", (m, th) => {
    const p = P(m, th);
    while (true) {
      const msg = yield p.pop("colaTel", 3);
      yield p.work("Registrando", 4, 1, null, () => { S.stats.tel[msg.txt]++; });
    }
  });

  const PLANT = `
  <svg class="plant" viewBox="0 0 720 290">
    <text x="36" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-3)">TOLVA</text>
    <path d="M14 50 h44 l-8 34 h-28 Z" fill="var(--bg-soft)" stroke="var(--border-strong)" stroke-width="2"/>
    <g id="qzones"></g>
    <g id="maquinas"></g>
    <g id="salida"></g>
    <g id="super"></g>
  </svg>`;

  function cajaMaquina(x, nombre, estado, color) {
    const lamp = estado === "work" ? "#22c55e" : estado === "block" ? "#ef4444" : "#8b93a7";
    return `
      <rect x="${x}" y="56" width="92" height="78" rx="10" fill="var(--bg-soft)" stroke="${estado === "block" ? "#ef4444" : "var(--border-strong)"}" stroke-width="2"/>
      <circle cx="${x + 46}" cy="56" r="7" fill="${lamp}" stroke="var(--bg)" stroke-width="2"/>
      <text x="${x + 46}" y="90" text-anchor="middle" font-size="12.5" font-weight="700" fill="${color}">${nombre}</text>
      <text x="${x + 46}" y="108" text-anchor="middle" font-size="10" fill="var(--text-3)">${estado === "work" ? "mecanizando" : estado === "block" ? "¡bloqueada!" : "en espera"}</text>`;
  }

  function slotsCola(x, q, label) {
    let html = `<text x="${x + q.cap * 15}" y="42" text-anchor="middle" font-size="10" fill="var(--text-3)">${label}</text>`;
    for (let i = 0; i < q.cap; i++) {
      const it = q.items[i];
      html += `<rect x="${x + i * 30}" y="80" width="26" height="26" rx="6"
        fill="${it ? "var(--accent-soft)" : "none"}" stroke="${it ? "var(--accent-border)" : "var(--border-strong)"}"
        stroke-width="1.8" ${it ? "" : 'stroke-dasharray="3 3"'}/>
        ${it ? `<text x="${x + i * 30 + 13}" y="98" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--accent-strong)">${it.txt}</text>` : ""}`;
    }
    return html;
  }

  function estadoDe(m, nombre) {
    const th = m.threads.find((t) => t.name === nombre);
    if (!th || th.state === "blocked") return "block";
    if (th.workLeft > 0) return "work";
    return "idle";
  }

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const Q = (n) => m.queues.get(n);

    body.querySelector("#qzones").innerHTML =
      slotsCola(78, Q("cola1"), "cola1") +
      slotsCola(238, Q("cola2"), "cola2") +
      slotsCola(398, Q("cola3"), "cola3") +
      slotsCola(556, Q("colaSalida"), "colaSalida");

    body.querySelector("#maquinas").innerHTML =
      cajaMaquina(140, "M1", estadoDe(m, "hMaquina1"), "#e5484d") +
      cajaMaquina(300, "M2", estadoDe(m, "hMaquina2"), "#f76b15") +
      cajaMaquina(460, "M3", estadoDe(m, "hMaquina3"), "#3b82f6");

    const eSalida = estadoDe(m, "hSalida");
    body.querySelector("#salida").innerHTML = `
      <text x="668" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-3)">SALIDA</text>
      <rect x="622" y="56" width="92" height="78" rx="10" fill="var(--bg-soft)" stroke="var(--border-strong)" stroke-width="2"/>
      <circle cx="668" cy="56" r="7" fill="${eSalida === "work" ? "#22c55e" : "#8b93a7"}" stroke="var(--bg)" stroke-width="2"/>
      <text x="668" y="94" text-anchor="middle" font-size="12.5" font-weight="700" fill="#46a758">EMBALADO</text>
      <text x="668" y="112" text-anchor="middle" font-size="16" font-weight="700" fill="var(--text)">${S.stats.terminadas}</text>`;

    const tel = Q("colaTel");
    const eSup = estadoDe(m, "hSupervisor");
    let telSlots = "";
    for (let i = 0; i < tel.cap; i++) {
      const it = tel.items[i];
      telSlots += `<rect x="${306 + i * 30}" y="212" width="26" height="24" rx="6"
        fill="${it ? "rgba(18,165,148,.15)" : "none"}" stroke="${it ? "#12a594" : "var(--border-strong)"}" stroke-width="1.6" ${it ? "" : 'stroke-dasharray="3 3"'}/>
        ${it ? `<text x="${306 + i * 30 + 13}" y="228" text-anchor="middle" font-size="9.5" font-weight="700" fill="#12a594">${it.txt}</text>` : ""}`;
    }
    body.querySelector("#super").innerHTML = `
      <path d="M346 134 v70" stroke="var(--border-strong)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
      <text x="290" y="204" text-anchor="middle" font-size="10" fill="var(--text-3)">colaTel</text>
      ${telSlots}
      <rect x="256" y="246" width="180" height="36" rx="9" fill="var(--bg-soft)" stroke="${eSup === "work" ? "#12a594" : "var(--border-strong)"}" stroke-width="2"/>
      <text x="346" y="269" text-anchor="middle" font-size="12" font-weight="700" fill="#12a594">SUPERVISOR · M1:${S.stats.tel.M1} M2:${S.stats.tel.M2} M3:${S.stats.tel.M3}</text>`;
  }

  function renderKPIs(m) {
    let enSistema = 0;
    for (const q of m.queues.values()) enSistema += q.items.length;
    const thr = m.t ? ((S.stats.terminadas / m.t) * 100).toFixed(1) : "0";
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.inyectadas}</div><div class="kpi-k">piezas inyectadas</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.terminadas}</div><div class="kpi-k">piezas terminadas</div></div>
      <div class="kpi"><div class="kpi-v">${enSistema}</div><div class="kpi-k">piezas en el sistema</div></div>
      <div class="kpi"><div class="kpi-v">${thr}%</div><div class="kpi-k">producción por tick</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: CADENA_CODE,
    interval: 300,
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.serial = 0;
      S.stats = { inyectadas: 0, terminadas: 0, tel: { M1: 0, M2: 0, M3: 0 } };
      built = false;
    },
  });
})();
