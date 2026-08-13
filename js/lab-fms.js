"use strict";

/* ============================================================
   Laboratorio 1 · Célula de fabricación flexible (FMS)
   Basado en el ejercicio ej24 del cuaderno SCTR:
   robot + prensa hidráulica + máquina CNC, coordinados con
   semáforos productor/consumidor y el robot como región crítica.
   ============================================================ */

const FMS_CODE = {
  hEntrada: `void hEntrada() {
  while (1) {
    while (!barrera_entrada());   // espera pieza en la entrada
    wait(spEntradaPrensa);        // ¿hay hueco en la prensa?
    wait(sRobot);                 // pedimos el robot
    coge(100, 0);                 // cogemos la pieza en la entrada
    deja(0, 100);                 // la depositamos en la prensa
    signal(sRobot);               // liberamos el robot
    signal(scEntradaPrensa);      // avisamos a la prensa
  }
}`,
  hPrensa: `void hPrensa() {
  while (1) {
    wait(scEntradaPrensa);        // espera pieza en la prensa
    estampa();                    // estampa la pieza
    wait(spPrensaCNC);            // ¿hay hueco en el CNC?
    wait(sRobot);                 // pedimos el robot
    coge(0, 100);                 // cogemos la pieza estampada
    deja(-100, 0);                // la depositamos en el CNC
    signal(sRobot);               // liberamos el robot
    signal(spEntradaPrensa);      // la prensa queda libre
    signal(scPrensaCNC);          // avisamos al CNC
  }
}`,
  hCNC: `void hCNC() {
  while (1) {
    wait(scPrensaCNC);            // espera pieza en el CNC
    mecaniza();                   // mecaniza la pieza
    wait(spCNCSalida);            // ¿hay hueco en la salida?
    wait(sRobot);                 // pedimos el robot
    coge(-100, 0);                // cogemos la pieza mecanizada
    deja(0, -100);                // la depositamos en la salida
    signal(sRobot);               // liberamos el robot
    signal(spPrensaCNC);          // el CNC queda libre
    signal(scCNCSalida);          // avisamos a la salida
  }
}`,
  hSalida: `void hSalida() {
  while (1) {
    wait(scCNCSalida);            // espera pieza terminada
    while (barrera_salida());     // espera a que retiren la pieza
    signal(spCNCSalida);          // el hueco de salida queda libre
  }
}`,
};

(function () {
  const m = new Motor();
  const S = {
    enEntrada: false, enPrensa: false, enCNC: false, enSalida: false,
    salidaTicks: 0,
    robot: { ang: 0, target: 0, carrying: false, moving: false },
    stats: { entradas: 0, estampadas: 0, mecanizadas: 0, salidas: 0, robotBusy: 0 },
  };
  m.extra.S = S;

  const ANG = { entrada: 0, prensa: -90, cnc: 180, salida: 90 };

  m.sem("spEntradaPrensa", 1).sem("scEntradaPrensa", 0)
   .sem("spPrensaCNC", 1).sem("scPrensaCNC", 0)
   .sem("spCNCSalida", 1).sem("scCNCSalida", 0)
   .sem("sRobot", 1);

  /* ---- hilo de entrada ---- */
  m.hilo("hEntrada", "#e5484d", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.poll(() => S.enEntrada, 3);
      yield p.wait("spEntradaPrensa", 4);
      yield p.wait("sRobot", 5);
      yield p.tick(6, () => {
        S.enEntrada = false;
        S.robot.carrying = true; S.robot.moving = true; S.robot.target = ANG.prensa;
      });
      yield p.work("Robot: entrada → prensa", 7, 4, null, () => {
        S.enPrensa = true;
        S.robot.carrying = false; S.robot.moving = false;
      });
      yield p.signal("sRobot", 8);
      yield p.signal("scEntradaPrensa", 9);
    }
  });

  /* ---- hilo de la prensa ---- */
  m.hilo("hPrensa", "#f76b15", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.wait("scEntradaPrensa", 3);
      yield p.work("Estampando pieza", 4, 7, null, () => { S.stats.estampadas++; });
      yield p.wait("spPrensaCNC", 5);
      yield p.wait("sRobot", 6);
      yield p.tick(7, () => {
        S.enPrensa = false;
        S.robot.carrying = true; S.robot.moving = true; S.robot.target = ANG.cnc;
      });
      yield p.work("Robot: prensa → CNC", 8, 4, null, () => {
        S.enCNC = true;
        S.robot.carrying = false; S.robot.moving = false;
      });
      yield p.signal("sRobot", 9);
      yield p.signal("spEntradaPrensa", 10);
      yield p.signal("scPrensaCNC", 11);
    }
  });

  /* ---- hilo del CNC ---- */
  m.hilo("hCNC", "#3b82f6", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.wait("scPrensaCNC", 3);
      yield p.work("Mecanizando pieza", 4, 9, null, () => { S.stats.mecanizadas++; });
      yield p.wait("spCNCSalida", 5);
      yield p.wait("sRobot", 6);
      yield p.tick(7, () => {
        S.enCNC = false;
        S.robot.carrying = true; S.robot.moving = true; S.robot.target = ANG.salida;
      });
      yield p.work("Robot: CNC → salida", 8, 4, null, () => {
        S.enSalida = true; S.salidaTicks = 0;
        S.robot.carrying = false; S.robot.moving = false;
      });
      yield p.signal("sRobot", 9);
      yield p.signal("spPrensaCNC", 10);
      yield p.signal("scCNCSalida", 11);
    }
  });

  /* ---- hilo de salida ---- */
  m.hilo("hSalida", "#46a758", function* (m, th) {
    const p = P(m, th);
    while (true) {
      yield p.wait("scCNCSalida", 3);
      yield p.poll(() => !S.enSalida, 4);
      yield p.signal("spCNCSalida", 5);
    }
  });

  /* ---- entorno: llegan piezas y se retiran ---- */
  function entorno(m) {
    if (m.t % 7 === 0 && !S.enEntrada) { S.enEntrada = true; S.stats.entradas++; }
    if (S.enSalida) {
      S.salidaTicks++;
      if (S.salidaTicks >= 5) { S.enSalida = false; S.stats.salidas++; }
    }
    if (S.robot.moving) S.stats.robotBusy++;
  }

  /* ---- dibujo de la planta ---- */
  const PLANT_SVG = `
  <svg class="plant" viewBox="0 0 520 430">
    <defs>
      <radialGradient id="baseGrad" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#565d6e"/><stop offset="100%" stop-color="#343945"/>
      </radialGradient>
    </defs>
    <rect x="6" y="6" width="508" height="418" rx="14" fill="none" stroke="var(--border-strong)" stroke-dasharray="5 5"/>

    <!-- estaciones -->
    <g id="stEntrada"></g><g id="stPrensa"></g><g id="stCNC"></g><g id="stSalida"></g>

    <!-- robot -->
    <circle cx="260" cy="215" r="46" fill="url(#baseGrad)" stroke="#20242e" stroke-width="2"/>
    <circle cx="260" cy="215" r="10" fill="#20242e"/>
    <g id="robotArm">
      <line x1="260" y1="215" x2="352" y2="215" stroke="#8b93a7" stroke-width="10" stroke-linecap="round"/>
      <line x1="260" y1="215" x2="352" y2="215" stroke="#c3c9d6" stroke-width="4" stroke-linecap="round"/>
      <circle id="robotGrip" cx="352" cy="215" r="11" fill="#2c313d" stroke="#8b93a7" stroke-width="3"/>
      <circle id="robotPiece" cx="352" cy="215" r="6.5" fill="#f5b93f" style="display:none"/>
    </g>
    <text x="260" y="219" text-anchor="middle" font-size="11" fill="#dfe3ec" font-weight="700">ROBOT</text>
  </svg>`;

  function estacion(g, x, y, nombre, sub, occ, color) {
    g.innerHTML = `
      <rect x="${x - 56}" y="${y - 34}" width="112" height="68" rx="10"
        fill="${occ ? "var(--accent-soft)" : "var(--bg-soft)"}"
        stroke="${occ ? "var(--accent-border)" : "var(--border-strong)"}" stroke-width="2"/>
      <text x="${x}" y="${y - 12}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--text)">${nombre}</text>
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="var(--text-3)">${sub}</text>
      <circle cx="${x}" cy="${y + 18}" r="7.5" fill="${occ ? color : "none"}" stroke="${occ ? color : "var(--border-strong)"}" stroke-width="2"/>`;
  }

  let svgBuilt = false;
  function renderPlant(body, m) {
    if (!svgBuilt) { body.innerHTML = PLANT_SVG; svgBuilt = true; }
    estacion(body.querySelector("#stEntrada"), 438, 215, "ENTRADA", "barrera óptica", S.enEntrada, "#e5484d");
    estacion(body.querySelector("#stPrensa"), 260, 62, "PRENSA", "estampado", S.enPrensa, "#f76b15");
    estacion(body.querySelector("#stCNC"), 82, 215, "CNC", "mecanizado", S.enCNC, "#3b82f6");
    estacion(body.querySelector("#stSalida"), 260, 368, "SALIDA", "retirada", S.enSalida, "#46a758");

    // animación del brazo
    let d = S.robot.target - S.robot.ang;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    S.robot.ang += d * 0.45;
    if (Math.abs(d) < 0.6) S.robot.ang = S.robot.target;
    body.querySelector("#robotArm").setAttribute("transform", `rotate(${S.robot.ang} 260 215)`);
    body.querySelector("#robotPiece").style.display = S.robot.carrying ? "" : "none";
  }

  function renderKPIs(m) {
    const st = S.stats;
    const util = m.t ? Math.round((st.robotBusy / m.t) * 100) : 0;
    return `<div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${st.entradas}</div><div class="kpi-k">piezas llegadas</div></div>
      <div class="kpi"><div class="kpi-v">${st.estampadas}</div><div class="kpi-k">estampadas</div></div>
      <div class="kpi"><div class="kpi-v">${st.mecanizadas}</div><div class="kpi-k">mecanizadas</div></div>
      <div class="kpi"><div class="kpi-v">${st.salidas}</div><div class="kpi-k">terminadas</div></div>
      <div class="kpi"><div class="kpi-v">${util}%</div><div class="kpi-k">utilización del robot</div></div>
    </div>`;
  }

  new LabUI(document.getElementById("lab"), m, {
    code: FMS_CODE,
    onTick: entorno,
    renderPlant,
    renderKPIs,
    onReset: () => {
      Object.assign(S, { enEntrada: false, enPrensa: false, enCNC: false, enSalida: false, salidaTicks: 0 });
      S.robot = { ang: 0, target: 0, carrying: false, moving: false };
      S.stats = { entradas: 0, estampadas: 0, mecanizadas: 0, salidas: 0, robotBusy: 0 };
      svgBuilt = false;
    },
  });
})();
