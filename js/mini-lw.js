"use strict";

/* ============================================================
   Minilaboratorio · Lectores–escritores: corredor de AGV
   Varios AGV cruzan en paralelo (lectores); la carretilla de
   mantenimiento ocupa todo el carril (escritor exclusivo).
   ============================================================ */

const LW_AGV = `void hAGV() {                          // lector del carril
  while (1) {
    avanzarHastaCarril();              // viaja hasta la zona
    wait(sMutex);
    nLectores++;
    if (nLectores == 1) wait(sCarril); // el primero reserva el carril
    signal(sMutex);
    recorrerCarril();                  // atraviesa la zona común
    wait(sMutex);
    nLectores--;
    if (nLectores == 0) signal(sCarril); // el último lo libera
    signal(sMutex);
    salirDeLaZona();                   // continúa a su destino
  }
}`;

const LW_MANT = `void hMantenimiento() {                // escritor
  while (1) {
    prepararCarretilla();
    wait(sCarril);                     // espera la zona libre
    mantenimientoDelCarril();          // ocupa el carril entero
    signal(sCarril);                   // zona libre de nuevo
    volverAlTaller();
  }
}`;

(function () {
  const m = new Motor();
  const S = {
    stats: { recorridos: 0, mantenimientos: 0 },
    nLec: 0,
    agv: [null, null, null],
    mant: false,
  };
  m.extra.S = S;

  m.sem("sMutex", 1).sem("sCarril", 1);

  const LW_CODE = {};
  for (let i = 1; i <= 3; i++) {
    LW_CODE["hAGV" + i] = LW_AGV;
    m.hilo("hAGV" + i, "#155dfc", function* (m, th, idx = i) {
      const p = P(m, th);
      while (true) {
        yield p.work("Avanzando hasta la zona", 2, 3 + Math.floor(Math.random() * 4));
        yield p.wait("sMutex", 3, () => { S.nLec++; });
        if (S.nLec === 1) yield p.wait("sCarril", 4);
        yield p.signal("sMutex", 5);
        const dur = 4 + Math.floor(Math.random() * 3);
        yield p.work("Recorriendo el carril", 6, dur,
          () => { S.agv[idx - 1] = { dur }; },
          () => { S.agv[idx - 1] = null; S.stats.recorridos++; });
        yield p.wait("sMutex", 7, () => { S.nLec--; });
        if (S.nLec === 0) yield p.signal("sCarril", 8);
        yield p.signal("sMutex", 9);
        yield p.work("Saliendo de la zona", 10, 2 + Math.floor(Math.random() * 2));
      }
    });
  }
  LW_CODE["hMantenimiento"] = LW_MANT;
  m.hilo("hMantenimiento", "#ff8958", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.work("Preparando carretilla", 2, 6 + Math.floor(Math.random() * 4));
      yield p.wait("sCarril", 3);
      yield p.work("Mantenimiento del carril", 4, 8, () => { S.mant = true; }, () => { S.mant = false; S.stats.mantenimientos++; });
      yield p.signal("sCarril", 5);
      yield p.work("Volviendo al taller", 6, 3);
    }
  });

  const PLANT = `
  <svg class="plant" viewBox="0 0 560 260">
    <text x="280" y="24" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">ZONA DE INSPECCIÓN (carril compartido)</text>

    <rect x="20" y="62" width="520" height="46" rx="10" fill="var(--bg-code)" stroke="var(--border-strong)" stroke-width="1.5"/>
    <text x="280" y="84" text-anchor="middle" font-size="10.5" fill="var(--text-3)">3 AGV cruzan en paralelo (lectores)</text>
    <g id="agvs"></g>

    <rect x="20" y="150" width="520" height="54" rx="10" fill="none" stroke="var(--border-strong)" stroke-width="1.5" stroke-dasharray="7 5"/>
    <text id="mantLabel" x="280" y="170" text-anchor="middle" font-size="10.5" fill="var(--text-3)">la carretilla ocupa el carril en exclusiva (escritor)</text>
    <g id="mant"></g>

    <text id="stateLabel" x="280" y="238" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">zona libre</text>
  </svg>`;

  let built = false;
  function renderPlant(body, m) {
    if (!built) { body.innerHTML = PLANT; built = true; }
    const agvs = body.querySelector("#agvs");
    let html = "";
    for (let i = 0; i < 3; i++) {
      const info = S.agv[i];
      const th = m.threads.find((t) => t.name === "hAGV" + (i + 1));
      let x = 40;
      if (info) {
        const prog = 1 - th.workLeft / info.dur;
        x = 40 + prog * 470;
      } else if (th && th.state === "blocked") {
        x = 40;
      }
      html += `<g transform="translate(${x},72)">
        <rect width="34" height="26" rx="6" fill="${info ? "var(--accent-soft)" : "var(--bg-code)"}"
          stroke="${info ? "var(--accent)" : "var(--border-strong)"}" stroke-width="1.5"/>
        <text x="17" y="18" text-anchor="middle" font-size="12">🤖</text>
      </g>`;
    }
    agvs.innerHTML = html;

    const mant = body.querySelector("#mant");
    let mh = "";
    if (S.mant) {
      const th = m.threads.find((t) => t.name === "hMantenimiento");
      const prog = 1 - th.workLeft / 8;
      const x = 500 - prog * 440;
      mh = `<g transform="translate(${x},160)">
        <rect width="44" height="34" rx="7" fill="rgba(255,137,88,.15)" stroke="#ff8958" stroke-width="1.5"/>
        <text x="22" y="23" text-anchor="middle" font-size="13">🛠️</text>
      </g>`;
    }
    mant.innerHTML = mh;

    const zona = S.mant ? "EN MANTENIMIENTO" : S.nLec ? `${S.nLec} AGV en el carril` : "zona libre";
    body.querySelector("#stateLabel").textContent = zona;
    body.querySelector("#mantLabel").textContent = S.mant ? "⚠ carril bloqueado por mantenimiento" : "la carretilla ocupa el carril en exclusiva (escritor)";
  }

  function renderKPIs(m) {
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${S.stats.recorridos}</div><div class="kpi-k">cruces de AGV</div></div>
      <div class="kpi"><div class="kpi-v">${S.stats.mantenimientos}</div><div class="kpi-k">mantenimientos</div></div>
      <div class="kpi"><div class="kpi-v">${S.nLec}</div><div class="kpi-k">lectores ahora mismo</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: LW_CODE,
    interval: 320,
    renderPlant,
    renderKPIs,
    onReset: () => {
      S.stats = { recorridos: 0, mantenimientos: 0 };
      S.nLec = 0; S.agv = [null, null, null]; S.mant = false;
      built = false;
    },
  });
})();