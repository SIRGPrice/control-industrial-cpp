"use strict";

/* ============================================================
   Motor de concurrencia cooperativo para los laboratorios.
   Emula la semántica de hilos, semáforos y colas bloqueantes
   con un planificador por turnos (tick a tick).
   ============================================================ */

class Motor {
  constructor() {
    this.threads = [];
    this.sems = new Map();
    this.queues = new Map();
    this.t = 0;
    this.cursor = 0;
    this.deadlock = false;
    this.onEvent = () => {};
    this.extra = {};
  }

  /* ---------- Definición ---------- */

  sem(name, value) {
    this.sems.set(name, { name, value, init: value, waiters: [] });
    return this;
  }

  cola(name, cap) {
    this.queues.set(name, { name, cap, items: [], pushWaiters: [], popWaiters: [], totalIn: 0 });
    return this;
  }

  hilo(name, color, factory) {
    const th = {
      id: this.threads.length,
      name, color,
      gen: null, factory,
      state: "ready",        // ready | blocked | done
      blockOn: null,
      line: 0,
      label: "",
      workLeft: 0,
      resumeValue: undefined,
      busy: 0, polling: false,
    };
    th.gen = factory(this, th);
    this.threads.push(th);
    return this;
  }

  /* ---------- Operaciones internas ---------- */

  log(msg, cls) {
    this.onEvent({ type: "log", t: this.t, msg, cls: cls || "" });
  }

  _wakeSemWaiter(sem) {
    if (sem.waiters.length) {
      const w = sem.waiters.shift();
      const th = this.threads[w.id];
      th.state = "ready";
      th.blockOn = null;
      if (w.fx) w.fx();
      this.log(`${th.name} desbloqueado en wait(${sem.name})`, "ev-wake");
      return true;
    }
    return false;
  }

  _wakePopWaiter(q) {
    if (q.popWaiters.length && q.items.length) {
      const w = q.popWaiters.shift();
      const th = this.threads[w.id];
      th.resumeValue = q.items.shift();
      th.state = "ready";
      th.blockOn = null;
      if (w.fx) w.fx();
      this.log(`${th.name} desbloqueado: la cola ${q.name} ya tiene datos`, "ev-wake");
    }
  }

  _wakePushWaiter(q) {
    if (q.pushWaiters.length) {
      const w = q.pushWaiters.shift();
      const th = this.threads[w.id];
      q.items.push(w.item);
      q.totalIn++;
      th.resumeValue = true;
      th.state = "ready";
      th.blockOn = null;
      if (w.fx) w.fx();
      this.log(`${th.name} desbloqueado: hay hueco en la cola ${q.name} (push completado)`, "ev-wake");
    }
  }

  _runOne(th) {
    const res = th.gen.next(th.resumeValue);
    th.resumeValue = undefined;
    if (res.done) {
      th.state = "done";
      this.log(`${th.name} termina`, "ev-warn");
      return;
    }
    const c = res.value;
    if (c.line !== undefined) th.line = c.line;
    switch (c.op) {
      case "tick":
        if (c.fx) c.fx();
        return;

      case "work":
        th.workLeft = Math.max(0, (c.ticks || 1) - 1);
        th.label = c.label || "";
        th.workEndFx = c.fxEnd || null;
        if (th.workLeft === 0 && th.workEndFx) { th.workEndFx(); th.workEndFx = null; }
        if (c.fx) c.fx();
        return;

      case "signal": {
        const s = this.sems.get(c.sem);
        const woke = this._wakeSemWaiter(s);
        if (!woke) s.value++;
        this.log(`${th.name}: signal(${c.sem}) → ${woke ? "despierta a un hilo" : "valor=" + s.value}`, "");
        if (c.fx) c.fx();
        return;
      }

      case "wait": {
        const s = this.sems.get(c.sem);
        if (s.value > 0) {
          s.value--;
          this.log(`${th.name}: wait(${c.sem}) ✓ valor=${s.value}`, "");
          if (c.fx) c.fx();
          return;
        }
        s.waiters.push({ id: th.id, fx: c.fx });
        th.state = "blocked";
        th.blockOn = `wait(${c.sem})`;
        this.log(`${th.name} BLOQUEADO en wait(${c.sem}) (valor 0)`, "ev-block");
        return;
      }

      case "qpush": {
        const q = this.queues.get(c.q);
        if (q.items.length < q.cap) {
          q.items.push(c.item);
          q.totalIn++;
          this.log(`${th.name}: push en ${c.q} (${q.items.length}/${q.cap})`, "ev-item");
          this._wakePopWaiter(q);
          if (c.fx) c.fx();
          return;
        }
        q.pushWaiters.push({ id: th.id, item: c.item, fx: c.fx });
        th.state = "blocked";
        th.blockOn = `push(${c.q}) llena`;
        this.log(`${th.name} BLOQUEADO: la cola ${c.q} está llena (${q.cap}/${q.cap})`, "ev-block");
        return;
      }

      case "qpop": {
        const q = this.queues.get(c.q);
        if (q.items.length > 0) {
          const item = q.items.shift();
          th.resumeValue = item;
          this.log(`${th.name}: pop de ${c.q} (${q.items.length}/${q.cap})`, "ev-item");
          this._wakePushWaiter(q);
          if (c.fx) c.fx();
          return;
        }
        q.popWaiters.push({ id: th.id, fx: c.fx });
        th.state = "blocked";
        th.blockOn = `pop(${c.q}) vacía`;
        this.log(`${th.name} BLOQUEADO: la cola ${c.q} está vacía`, "ev-block");
        return;
      }

      case "poll": {
        if (c.cond()) {
          th.polling = false;
          if (c.fx) c.fx();
          return;
        }
        th.polling = true;
        return; // consume el tick consultando (busy-wait)
      }

      default:
        throw new Error("Operación desconocida: " + c.op);
    }
  }

  /* ---------- Planificador ---------- */

  tick() {
    if (this.deadlock) return;
    this.t++;
    let acted = false;

    for (let k = 0; k < this.threads.length; k++) {
      const i = (this.cursor + k) % this.threads.length;
      const th = this.threads[i];
      if (th.state === "done") continue;
      if (th.state === "blocked") continue;

      acted = true;
      this.cursor = (i + 1) % this.threads.length;
      th.busy++;

      if (th.workLeft > 0) {
        th.workLeft--;
        if (th.workLeft === 0) { th.label = ""; if (th.workEndFx) { th.workEndFx(); th.workEndFx = null; } }
        continue;
      }
      this._runOne(th);
    }

    // Detección de interbloqueo: todos los hilos vivos, bloqueados
    const vivos = this.threads.filter((t) => t.state !== "done");
    if (vivos.length && vivos.every((t) => t.state === "blocked")) {
      this.deadlock = true;
      this.log("⚠ INTERBLOQUEO (deadlock): todos los hilos están bloqueados esperándose entre sí.", "ev-dead");
      this.onEvent({ type: "deadlock" });
    }

    this.onEvent({ type: "tick", t: this.t });
  }

  reset() {
    for (const s of this.sems.values()) { s.value = s.init; s.waiters = []; }
    for (const q of this.queues.values()) { q.items = []; q.pushWaiters = []; q.popWaiters = []; q.totalIn = 0; }
    for (const th of this.threads) {
      th.gen = th.factory(this, th);
      th.state = "ready"; th.blockOn = null; th.line = 0; th.label = "";
      th.workLeft = 0; th.resumeValue = undefined; th.busy = 0; th.polling = false;
    }
    this.t = 0; this.cursor = 0; this.deadlock = false;
    this.onEvent({ type: "reset" });
  }
}

/* API cómoda para escribir los generadores de cada hilo */
function P(motor, th) {
  return {
    wait: (sem, line, fx) => ({ op: "wait", sem, line, fx }),
    signal: (sem, line, fx) => ({ op: "signal", sem, line, fx }),
    push: (q, item, line, fx) => ({ op: "qpush", q, item, line, fx }),
    pop: (q, line, fx) => ({ op: "qpop", q, line, fx }),
    work: (label, line, ticks, fx, fxEnd) => ({ op: "work", label, line, ticks, fx, fxEnd }),
    tick: (line, fx) => ({ op: "tick", line, fx }),
    poll: (cond, line, fx) => ({ op: "poll", cond, line, fx }),
  };
}

/* ============================================================
   UI genérica de laboratorio: barra de herramientas, paneles,
   resaltado de líneas y registro de eventos.
   ============================================================ */

class LabUI {
  constructor(root, motor, opts) {
    this.root = root;
    this.motor = motor;
    this.opts = opts || {};
    this.running = false;
    this.timer = null;
    this.interval = opts.interval || 380;
    this.build();
  }

  build() {
    const m = this.motor;
    this.root.innerHTML = "";

    /* Barra de herramientas */
    const bar = document.createElement("div");
    bar.className = "lab-toolbar";
    bar.innerHTML = `
      <button class="btn-run">▶ Ejecutar</button>
      <button class="btn-tool" data-act="step">⏭ Paso</button>
      <button class="btn-tool" data-act="reset">↺ Reiniciar</button>
      <span class="tick-badge">t = <b class="tickv">0</b></span>
      <span class="speed">Velocidad <input type="range" min="1" max="10" value="5"></span>`;
    this.root.appendChild(bar);

    this.btnRun = bar.querySelector(".btn-run");
    this.tickEl = bar.querySelector(".tickv");
    const slider = bar.querySelector("input[type=range]");
    slider.addEventListener("input", () => {
      this.interval = 1020 - slider.value * 100; // 920 ms … 20 ms
      if (this.running) { clearInterval(this.timer); this.timer = setInterval(() => this.step(), this.interval); }
    });

    this.btnRun.addEventListener("click", () => this.toggle());
    bar.querySelector('[data-act="step"]').addEventListener("click", () => { this.pause(); this.step(); });
    bar.querySelector('[data-act="reset"]').addEventListener("click", () => this.reset());

    /* Rejilla principal */
    const grid = document.createElement("div");
    grid.className = "lab-grid";
    this.root.appendChild(grid);
    this.grid = grid;

    /* Panel de la planta */
    this.plantPanel = this.panel(grid, "La planta", "");
    this.plantBody = this.plantPanel.querySelector(".lp-body");

    /* Panel de hilos */
    this.threadsPanel = this.panel(grid, "Hilos · código ejecutándose", "");
    const tBody = this.threadsPanel.querySelector(".lp-body");
    tBody.style.padding = "0";
    this.threadViews = m.threads.map((th) => this.buildThreadView(tBody, th));

    /* Paneles de semáforos y colas */
    if (m.sems.size) {
      this.semPanel = this.panel(grid, "Semáforos", "");
      this.semBody = this.semPanel.querySelector(".lp-body");
    }
    if (m.queues.size) {
      this.qPanel = this.panel(grid, "Colas", "");
      this.qBody = this.qPanel.querySelector(".lp-body");
    }

    /* KPIs + registro */
    this.kpiPanel = this.panel(grid, "Indicadores", "full");
    this.kpiBody = this.kpiPanel.querySelector(".lp-body");

    this.logPanel = this.panel(grid, "Registro de eventos", "full");
    const logBody = this.logPanel.querySelector(".lp-body");
    logBody.style.padding = "8px 6px";
    this.logEl = document.createElement("ul");
    this.logEl.className = "eventlog";
    logBody.appendChild(this.logEl);

    this.banner = document.createElement("div");
    this.banner.className = "deadlock-banner";
    this.banner.textContent = "INTERBLOQUEO detectado: ningún hilo puede avanzar. Pulsa Reiniciar o consulta el registro para ver quién espera a quién.";
    grid.appendChild(this.banner);

    m.onEvent = (ev) => {
      if (ev.type === "log") this.addLog(ev);
      if (ev.type === "tick") { if (this.opts.onTick) this.opts.onTick(m); this.render(); }
      if (ev.type === "deadlock") { this.pause(); this.banner.classList.add("show"); }
      if (ev.type === "reset") { this.logEl.innerHTML = ""; this.banner.classList.remove("show"); this.render(); }
    };

    this.render();
  }

  panel(grid, title, cls) {
    const p = document.createElement("div");
    p.className = "lab-panel" + (cls ? " " + cls : "");
    p.innerHTML = `<div class="lp-head">${title}</div><div class="lp-body"></div>`;
    grid.appendChild(p);
    return p;
  }

  buildThreadView(container, th) {
    const div = document.createElement("div");
    div.className = "threadcode";
    const code = this.opts.code[th.name];
    const lines = code.split("\n");
    div.innerHTML = `
      <div class="tc-head">
        <span class="tc-dot" style="background:${th.color}"></span>
        <span>${th.name}</span>
        <span class="tc-state ready">listo</span>
      </div>
      <pre>${lines.map((l, i) =>
        `<div class="line" data-n="${i + 1}"><span class="ln">${i + 1}</span><span class="lc">${window.cppHighlight ? window.cppHighlight(l) : escapeHtml(l)}</span></div>`
      ).join("")}</pre>`;
    container.appendChild(div);
    return { th, div, stateEl: div.querySelector(".tc-state"), lineEls: [...div.querySelectorAll(".line")] };
  }

  addLog(ev) {
    const li = document.createElement("li");
    li.className = ev.cls;
    li.innerHTML = `<span class="ev-t">t=${String(ev.t).padStart(3, "0")}</span>  ${escapeHtmlLite(ev.msg)}`;
    this.logEl.appendChild(li);
    while (this.logEl.children.length > 220) this.logEl.removeChild(this.logEl.firstChild);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  render() {
    const m = this.motor;
    this.tickEl.textContent = m.t;
    for (const v of this.threadViews) {
      const th = v.th;
      v.lineEls.forEach((el) => el.classList.remove("hl"));
      const target = v.lineEls.find((el) => +el.dataset.n === th.line);
      if (target) target.classList.add("hl");
      const st = v.stateEl;
      if (th.state === "done") { st.textContent = "fin"; st.className = "tc-state done"; }
      else if (th.state === "blocked") { st.textContent = th.blockOn; st.className = "tc-state blocked"; }
      else if (th.workLeft > 0 || th.polling) { st.textContent = th.workLeft > 0 ? th.label : "consultando…"; st.className = "tc-state run"; }
      else { st.textContent = "listo"; st.className = "tc-state ready"; }
    }

    if (this.semBody) {
      let html = '<div class="sync-chips">';
      for (const s of m.sems.values()) {
        html += `<div class="chip${s.waiters.length ? " waiters" : ""}">
          <div class="chip-name">${s.name}</div>
          <div class="chip-val">${s.value}</div>
          <div class="chip-sub">${s.waiters.length ? s.waiters.length + " hilo(s) esperando" : "sin esperas"}</div>
        </div>`;
      }
      html += "</div>";
      this.semBody.innerHTML = html;
    }

    if (this.qBody) {
      let html = "";
      for (const q of m.queues.values()) {
        html += `<div style="margin-bottom:10px">
          <div style="font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--accent-strong);margin-bottom:4px">${q.name}
            <span style="color:var(--text-3);font-weight:400"> · ${q.items.length}/${q.cap}</span></div>
          <div class="qviz">${Array.from({ length: q.cap }, (_, i) => {
            const it = q.items[i];
            return `<span class="qslot${it !== undefined ? " filled" : ""}">${it !== undefined ? (it.icon || it.txt || "📦") : ""}</span>`;
          }).join("")}</div>
        </div>`;
      }
      this.qBody.innerHTML = html;
    }

    if (this.opts.renderKPIs) this.kpiBody.innerHTML = this.opts.renderKPIs(m);
    if (this.opts.renderPlant) this.opts.renderPlant(this.plantBody, m);
  }

  step() {
    if (this.motor.deadlock) return;
    this.motor.tick();
  }

  toggle() {
    if (this.running) this.pause();
    else {
      this.running = true;
      this.btnRun.textContent = "⏸ Pausar";
      this.btnRun.classList.add("paused");
      this.timer = setInterval(() => this.step(), this.interval);
    }
  }

  pause() {
    this.running = false;
    this.btnRun.textContent = "▶ Ejecutar";
    this.btnRun.classList.remove("paused");
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  reset() {
    this.pause();
    if (this.opts.onReset) this.opts.onReset();
    this.motor.reset();
  }
}

function escapeHtmlLite(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
