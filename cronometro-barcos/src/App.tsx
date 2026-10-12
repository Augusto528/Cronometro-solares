
import { useEffect, useState } from "react";

type EventType = "VOLTA" | "PONTO" | "FINALIZACAO";
type Tab = "competition" | "individual";

const TEAMS = [
  "Arariboia",
  "Fernando Amorim",
  "Günes",
  "Hefesto",
  "Hurakan",
  "Leviatan",
  "Reis do Sol",
  "Sete Capitães",
  "Solares",
  "Solaris",
  "Solmar Celeris",
  "Zenite",
];

interface RaceEvent {
  id: string;
  type: EventType;
  elapsed: number;
  lap?: number;
  lapTime?: number;
  pointName?: string;
  recordedAt: string;
}

interface Competitor {
  id: string;
  name: string;
  number: string;
  events: RaceEvent[];
  finishedAt: number | null;
}

interface Race {
  id: string;
  name: string;
  createdAt: string;
  startedAt: number | null;
  startedWallTime: string | null;
  finishedAt: number | null;
  competitors: Competitor[];
}

interface IndividualSession {
  name: string;
  startedAt: number | null;
  startedWallTime: string | null;
  finishedAt: number | null;
  events: RaceEvent[];
}

const clock = () => performance.now();

function formatTime(milliseconds: number): string {
  const cs = Math.floor(Math.max(0, milliseconds) / 10);
  const hours = Math.floor(cs / 360000);
  const minutes = Math.floor((cs % 360000) / 6000);
  const seconds = Math.floor((cs % 6000) / 100);
  const fraction = cs % 100;

  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}.` +
    `${String(fraction).padStart(2, "0")}`
  );
}

function elapsedAt(
  start: number | null,
  finish: number | null,
  now: number,
): number {
  if (start === null) return 0;
  return Math.max(0, (finish ?? now) - start);
}

function createEvent(
  type: EventType,
  elapsed: number,
  extra: Partial<RaceEvent> = {},
): RaceEvent {
  return {
    id: crypto.randomUUID(),
    type,
    elapsed,
    recordedAt: new Date().toLocaleString("pt-BR"),
    ...extra,
  };
}

function createCompetitor(name: string, number: string): Competitor {
  return {
    id: crypto.randomUUID(),
    name,
    number,
    events: [],
    finishedAt: null,
  };
}

function createRace(name: string): Race {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toLocaleString("pt-BR"),
    startedAt: null,
    startedWallTime: null,
    finishedAt: null,
    competitors: TEAMS.map((team, index) =>
      createCompetitor(team, String(index + 1)),
    ),
  };
}

function createIndividual(): IndividualSession {
  return {
    name: "Cronômetro individual",
    startedAt: null,
    startedWallTime: null,
    finishedAt: null,
    events: [],
  };
}

function safeFilename(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "cronometro"
  );
}

function exportText(filename: string, content: string) {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatEvents(events: RaceEvent[]): string {
  if (events.length === 0) return "  Nenhum registro.";

  return events
    .map((event) => {
      if (event.type === "VOLTA") {
        return (
          `  Volta ${event.lap}: ${formatTime(event.elapsed)}` +
          ` | Tempo da volta: ${formatTime(event.lapTime ?? 0)}` +
          ` | Registro: ${event.recordedAt}`
        );
      }

      if (event.type === "PONTO") {
        return (
          `  ${event.pointName}: ${formatTime(event.elapsed)}` +
          ` | Registro: ${event.recordedAt}`
        );
      }

      return (
        `  Finalização: ${formatTime(event.elapsed)}` +
        ` | Registro: ${event.recordedAt}`
      );
    })
    .join("\n");
}

function App() {
  const [tab, setTab] = useState<Tab>("competition");
  const [now, setNow] = useState(clock());

  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState("");

  const [raceName, setRaceName] = useState("");
  const [pointNames, setPointNames] = useState("Boia");

  const [individualTeam, setIndividualTeam] = useState(TEAMS[0]);
  const [individual, setIndividual] =
    useState<IndividualSession>(createIndividual);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(clock()), 30);
    return () => window.clearInterval(timer);
  }, []);

  const selectedRace =
    races.find((race) => race.id === selectedRaceId) ?? null;

  const raceRunning =
    selectedRace !== null &&
    selectedRace.startedAt !== null &&
    selectedRace.finishedAt === null;

  const individualRunning =
    individual.startedAt !== null &&
    individual.finishedAt === null;

  const individualElapsed = elapsedAt(
    individual.startedAt,
    individual.finishedAt,
    now,
  );

  function updateRace(
    raceId: string,
    updater: (race: Race) => Race,
  ) {
    setRaces((current) =>
      current.map((race) =>
        race.id === raceId ? updater(race) : race,
      ),
    );
  }

  function updateCompetitor(
    raceId: string,
    competitorId: string,
    updater: (competitor: Competitor) => Competitor,
  ) {
    updateRace(raceId, (race) => ({
      ...race,
      competitors: race.competitors.map((competitor) =>
        competitor.id === competitorId
          ? updater(competitor)
          : competitor,
      ),
    }));
  }

  function addRace() {
    const name = raceName.trim();

    if (!name) {
      window.alert("Digite o nome da prova.");
      return;
    }

    const race = createRace(name);
    setRaces((current) => [...current, race]);
    setSelectedRaceId(race.id);
    setRaceName("");
  }

  function deleteRace(raceId: string) {
    const race = races.find((item) => item.id === raceId);
    if (!race) return;

    if (
      !window.confirm(
        `Excluir a prova "${race.name}" e todos os seus registros?`,
      )
    ) {
      return;
    }

    setRaces((current) => current.filter((item) => item.id !== raceId));

    if (selectedRaceId === raceId) {
      setSelectedRaceId("");
    }
  }

  function startRace() {
    if (!selectedRace) return;

    if (selectedRace.competitors.length === 0) {
      window.alert("Não há equipes cadastradas nesta prova.");
      return;
    }

    if (
      selectedRace.startedAt !== null ||
      selectedRace.finishedAt !== null
    ) {
      return;
    }

    updateRace(selectedRace.id, (race) => ({
      ...race,
      startedAt: clock(),
      startedWallTime: new Date().toLocaleString("pt-BR"),
    }));
  }

  function finishRace() {
    if (!selectedRace || !raceRunning) return;

    if (!window.confirm("Deseja encerrar toda a prova?")) return;

    const instant = clock();

    updateRace(selectedRace.id, (race) => ({
      ...race,
      finishedAt: instant,
      competitors: race.competitors.map((competitor) => {
        if (competitor.finishedAt !== null) return competitor;

        const elapsed = elapsedAt(race.startedAt, instant, instant);

        return {
          ...competitor,
          finishedAt: elapsed,
          events: [
            ...competitor.events,
            createEvent("FINALIZACAO", elapsed),
          ],
        };
      }),
    }));
  }

  function registerLap(race: Race, competitor: Competitor) {
    if (
      race.startedAt === null ||
      race.finishedAt !== null ||
      competitor.finishedAt !== null
    ) {
      return;
    }

    const elapsed = elapsedAt(race.startedAt, null, clock());

    const previousLap =
      [...competitor.events]
        .reverse()
        .find((event) => event.type === "VOLTA")?.elapsed ?? 0;

    const lap =
      competitor.events.filter((event) => event.type === "VOLTA").length +
      1;

    updateCompetitor(race.id, competitor.id, (current) => ({
      ...current,
      events: [
        ...current.events,
        createEvent("VOLTA", elapsed, {
          lap,
          lapTime: elapsed - previousLap,
        }),
      ],
    }));
  }

  function registerPoint(race: Race, competitor: Competitor) {
    if (
      race.startedAt === null ||
      race.finishedAt !== null ||
      competitor.finishedAt !== null
    ) {
      return;
    }

    const label = pointNames.trim();

    if (!label) {
      window.alert("Digite o nome do ponto de passagem.");
      return;
    }

    const elapsed = elapsedAt(race.startedAt, null, clock());

    const count =
      competitor.events.filter((event) => event.type === "PONTO").length +
      1;

    updateCompetitor(race.id, competitor.id, (current) => ({
      ...current,
      events: [
        ...current.events,
        createEvent("PONTO", elapsed, {
          pointName: `${label} ${count}`,
        }),
      ],
    }));
  }

  function finishCompetitor(race: Race, competitor: Competitor) {
    if (
      race.startedAt === null ||
      race.finishedAt !== null ||
      competitor.finishedAt !== null
    ) {
      return;
    }

    const elapsed = elapsedAt(race.startedAt, null, clock());

    updateCompetitor(race.id, competitor.id, (current) => ({
      ...current,
      finishedAt: elapsed,
      events: [
        ...current.events,
        createEvent("FINALIZACAO", elapsed),
      ],
    }));
  }

  function startIndividual() {
    if (individual.startedAt !== null) return;

    const instant = clock();

    setIndividual({
      name: individualTeam,
      startedAt: instant,
      startedWallTime: new Date().toLocaleString("pt-BR"),
      finishedAt: null,
      events: [],
    });
  }

  function registerIndividualEvent(type: "VOLTA" | "PONTO") {
    if (!individualRunning || individual.startedAt === null) return;

    const elapsed = elapsedAt(individual.startedAt, null, clock());

    if (type === "VOLTA") {
      const previousLap =
        [...individual.events]
          .reverse()
          .find((event) => event.type === "VOLTA")?.elapsed ?? 0;

      const lap =
        individual.events.filter((event) => event.type === "VOLTA").length +
        1;

      setIndividual((current) => ({
        ...current,
        events: [
          ...current.events,
          createEvent("VOLTA", elapsed, {
            lap,
            lapTime: elapsed - previousLap,
          }),
        ],
      }));

      return;
    }

    const label = pointNames.trim();

    if (!label) {
      window.alert("Digite o nome do ponto de passagem.");
      return;
    }

    const count =
      individual.events.filter((event) => event.type === "PONTO").length +
      1;

    setIndividual((current) => ({
      ...current,
      events: [
        ...current.events,
        createEvent("PONTO", elapsed, {
          pointName: `${label} ${count}`,
        }),
      ],
    }));
  }

  function stopIndividual() {
    if (!individualRunning) return;

    const instant = clock();
    const elapsed = elapsedAt(individual.startedAt, null, instant);

    setIndividual((current) => ({
      ...current,
      finishedAt: instant,
      events: [
        ...current.events,
        createEvent("FINALIZACAO", elapsed),
      ],
    }));
  }

  function resetIndividual() {
    if (individualRunning) {
      window.alert("Encerre a sessão antes de iniciar outra.");
      return;
    }

    if (
      individual.startedAt !== null &&
      !window.confirm("Apagar os registros e iniciar outra sessão?")
    ) {
      return;
    }

    setIndividual(createIndividual());
  }

  function exportRace(race: Race) {
    const duration = elapsedAt(race.startedAt, race.finishedAt, now);

    const lines = [
      "SISTEMA DE CRONOMETRAGEM - COMPETIÇÃO DE BARCOS",
      `Prova: ${race.name}`,
      `Criada em: ${race.createdAt}`,
      `Início: ${race.startedWallTime ?? "Não iniciada"}`,
      `Situação: ${
        race.finishedAt !== null
          ? "Encerrada"
          : race.startedAt !== null
            ? "Em andamento"
            : "Não iniciada"
      }`,
      `Tempo geral: ${formatTime(duration)}`,
      "",
      "========================================",
      "RESULTADOS DOS COMPETIDORES",
      "========================================",
      "",
    ];

    race.competitors.forEach((competitor) => {
      const elapsed =
        competitor.finishedAt ??
        elapsedAt(race.startedAt, race.finishedAt, now);

      lines.push(
        `Equipe: ${competitor.name}`,
        `Número: ${competitor.number}`,
        `Situação: ${
          competitor.finishedAt !== null
            ? "Finalizado"
            : race.finishedAt !== null
              ? "Prova encerrada"
              : race.startedAt !== null
                ? "Em andamento"
                : "Aguardando início"
        }`,
        `Tempo total: ${formatTime(elapsed)}`,
        "Registros:",
        formatEvents(competitor.events),
        "",
        "----------------------------------------",
        "",
      );
    });

    exportText(`${safeFilename(race.name)}.txt`, lines.join("\n"));
  }

  function exportIndividual() {
    const duration = elapsedAt(
      individual.startedAt,
      individual.finishedAt,
      now,
    );

    const content = [
      "SISTEMA DE CRONOMETRAGEM - CRONÔMETRO INDIVIDUAL",
      `Equipe: ${individual.name}`,
      `Início: ${individual.startedWallTime ?? "Não iniciado"}`,
      `Situação: ${
        individual.finishedAt !== null
          ? "Encerrado"
          : individual.startedAt !== null
            ? "Em andamento"
            : "Não iniciado"
      }`,
      `Tempo total: ${formatTime(duration)}`,
      "",
      "REGISTROS",
      "========================================",
      formatEvents(individual.events),
      "",
    ].join("\n");

    exportText(
      `${safeFilename(individual.name)}_individual.txt`,
      content,
    );
  }

  const css = `
    * { box-sizing: border-box; }
    body { margin: 0; background: #0b1120; }
    button, input, select { font: inherit; }
    button { cursor: pointer; transition: .15s; }
    button:disabled { cursor: not-allowed; opacity: .35; }
    .app {
      --panel: #121b2d; --border: #29364d;
      --text: #f1f5f9; --muted: #91a0b7;
      min-height: 100vh; background: #0b1120; color: var(--text);
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }
    .topbar {
      min-height: 70px; padding: 12px 3%; display: flex;
      align-items: center; justify-content: space-between; gap: 16px;
      border-bottom: 1px solid var(--border); background: #0d1525;
    }
    .brand { display: flex; align-items: center; gap: 11px; }
    .brand-icon {
      width: 39px; height: 39px; display: grid; place-items: center;
      border-radius: 10px; background: #1e3a66; font-size: 21px;
    }
    .brand h1 { margin: 0; font-size: 19px; }
    .brand p { margin: 3px 0 0; color: var(--muted); font-size: 11px; }
    .status { color: #6ee7bb; font-size: 11px; }
    .tabs {
      display: flex; gap: 6px; padding: 0 3%;
      border-bottom: 1px solid var(--border); background: #0d1525;
    }
    .tab {
      padding: 14px 12px; border: 0; border-bottom: 2px solid transparent;
      background: transparent; color: var(--muted); font-size: 12px;
      font-weight: 600;
    }
    .tab.active { color: white; border-bottom-color: #3984ff; }
    .page { width: min(1400px, 96%); margin: 22px auto; }
    .heading { margin-bottom: 18px; }
    .eyebrow {
      margin: 0 0 6px; color: #7caeff; font-size: 9px;
      font-weight: 800; letter-spacing: 1.5px;
    }
    h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); }
    h3 { margin: 0; font-size: 14px; }
    h4 { margin: 0; font-size: 12px; }
    .muted { color: var(--muted); font-size: 10px; line-height: 1.5; }
    .heading .muted { font-size: 12px; }
    .panel, .timer-panel {
      padding: 16px; margin-bottom: 15px;
      border: 1px solid var(--border); border-radius: 12px;
      background: var(--panel);
    }
    .panel > h3 { margin-bottom: 12px; }
    .form-row { display: flex; flex-wrap: wrap; gap: 8px; }
    input, select {
      min-width: 0; padding: 9px 10px; border: 1px solid var(--border);
      border-radius: 7px; outline: none; background: #0c1423; color: white;
      font-size: 12px;
    }
    input:focus, select:focus { border-color: #3984ff; }
    input::placeholder { color: #66758e; }
    .form-row > input, .form-row > select { flex: 1 1 180px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 5px; padding: 8px 10px; border: 1px solid transparent;
      border-radius: 7px; font-size: 11px; font-weight: 700;
    }
    .primary { background: #3984ff; color: white; }
    .success { background: #116a50; border-color: #188263; color: #c4ffeb; }
    .secondary { background: #202e45; border-color: #354763; color: #d9e6fa; }
    .danger { background: #48222e; border-color: #6a343f; color: #ffbdc6; }
    .ghost { background: transparent; border-color: var(--border); color: var(--muted); }
    .btn:hover:not(:disabled) { filter: brightness(1.15); }
    .small { padding: 6px 8px; font-size: 10px; }
    .timer-panel {
      padding: 20px 16px; text-align: center;
      background: radial-gradient(ellipse at top, #1b3150, transparent 65%), var(--panel);
    }
    .timer-topline {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; text-align: left;
    }
    .pill {
      padding: 5px 8px; border: 1px solid var(--border); border-radius: 100px;
      color: var(--muted); font-size: 9px; font-weight: 700;
    }
    .pill.live { background: #123e35; border-color: #14684f; color: #6ee7bb; }
    .pill.ended { background: #48222e; border-color: #6a343f; color: #ffbdc6; }
    .big-timer {
      margin: 15px 0 3px; font-family: "Courier New", monospace;
      font-size: clamp(34px, 6vw, 58px); font-weight: 700;
      font-variant-numeric: tabular-nums; letter-spacing: -2px; line-height: 1.2;
    }
    .timer-panel > .muted { margin: 5px 0 15px; }
    .button-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 7px;
    }
    .centered { justify-content: center; }
    .section-heading {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; margin-bottom: 12px;
    }
    .section-heading .muted { margin: 4px 0 0; }
    .competitor-list {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr));
      gap: 9px;
    }
    .competitor-card {
      min-width: 0; padding: 11px;
      border: 1px solid var(--border); border-radius: 9px;
      background: #0e1727;
    }
    .competitor-main { display: flex; align-items: center; gap: 9px; }
    .boat-number {
      width: 32px; height: 32px; flex: 0 0 32px; display: grid;
      place-items: center; border: 1px solid #365078; border-radius: 8px;
      background: #1b2c47; color: #9cc4ff; font-size: 12px; font-weight: 800;
    }
    .competitor-info { flex: 1; min-width: 0; }
    .competitor-info h4 { overflow-wrap: anywhere; }
    .competitor-info p { margin: 3px 0 0; }
    .competitor-time {
      display: flex; flex-direction: column; align-items: flex-end;
      gap: 3px; flex: 0 0 auto;
    }
    .competitor-time strong {
      font-family: "Courier New", monospace; font-size: 15px;
      font-variant-numeric: tabular-nums; white-space: nowrap;
    }
    .mini-status { color: var(--muted); font-size: 9px; }
    .mini-status.live { color: #6ee7bb; }
    .mini-status.finished { color: #ffbdc6; }
    .competitor-actions {
      display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px;
      padding-top: 8px; border-top: 1px solid #202d42;
    }
    .competitor-actions .btn { flex: 1 1 auto; }
    .empty {
      padding: 24px 12px; text-align: center; color: var(--muted);
      font-size: 12px; line-height: 1.7;
    }
    .session-input {
      width: min(100%, 360px); display: block; margin: 0 auto 22px;
      text-align: center;
    }
    .field-label {
      display: block; margin-bottom: 8px; color: var(--muted); font-size: 11px;
    }
    .team-select {
      display: block; width: min(100%, 360px); margin: 0 auto 22px;
    }
    .event-list { display: flex; flex-direction: column; }
    .event-row {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border);
    }
    .event-row:last-child { border-bottom: 0; }
    .event-row strong { font-size: 12px; }
    .event-row p { margin: 4px 0 0; }
    .event-times {
      display: flex; flex-direction: column; align-items: flex-end;
      gap: 3px; text-align: right;
    }
    .footer {
      padding: 18px 12px; border-top: 1px solid var(--border);
      text-align: center; color: #64748b; font-size: 10px;
    }
    @media (min-width: 1100px) {
      .competitor-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (min-width: 700px) and (max-width: 1099px) {
      .competitor-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 520px) {
      .topbar { padding: 12px 3%; }
      .brand h1 { font-size: 17px; }
      .status { font-size: 0; }
      .status:before {
        content: ""; display: inline-block; width: 8px; height: 8px;
        border-radius: 50%; background: #19b981;
      }
      .tabs { padding: 0 2%; }
      .tab { flex: 1; padding: 13px 4px; font-size: 10px; }
      .page { width: 96%; margin: 18px auto; }
      .panel, .timer-panel { padding: 13px 10px; }
      .competitor-list { grid-template-columns: 1fr; }
      .button-row .btn { flex: 1 1 120px; }
      .form-row > input, .form-row > select, .form-row > button {
        flex-basis: 100%; width: 100%;
      }
    }
  `;

  return (
    <div className="app">
      <style>{css}</style>

      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">⏱</div>
          <div>
            <h1>RaceTime</h1>
            <p>Sistema de cronometragem náutica</p>
          </div>
        </div>
        <div className="status">● Cronometragem local</div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${tab === "competition" ? "active" : ""}`}
          onClick={() => setTab("competition")}
        >
          01 · Competição geral
        </button>
        <button
          className={`tab ${tab === "individual" ? "active" : ""}`}
          onClick={() => setTab("individual")}
        >
          02 · Cronômetro individual
        </button>
      </nav>

      {tab === "competition" && (
        <main className="page">
          <div className="heading">
            <p className="eyebrow">GESTÃO DE PROVAS</p>
            <h2>Cronômetro da competição</h2>
            <p className="muted">
              As 12 equipes são cadastradas automaticamente em cada nova prova.
            </p>
          </div>

          <section className="panel">
            <h3>Selecionar ou criar prova</h3>
            <div className="form-row">
              <select
                value={selectedRaceId}
                onChange={(e) => setSelectedRaceId(e.target.value)}
              >
                <option value="">Selecione uma prova</option>
                {races.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                    {race.finishedAt !== null ? " (encerrada)" : ""}
                  </option>
                ))}
              </select>
              <input
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRace();
                }}
                placeholder="Nome da nova prova"
              />
              <button className="btn primary" onClick={addRace}>
                + Criar prova
              </button>
            </div>
          </section>

          {selectedRace ? (
            <>
              <section className="timer-panel">
                <div className="timer-topline">
                  <div>
                    <p className="eyebrow">PROVA ATUAL</p>
                    <h3>{selectedRace.name}</h3>
                  </div>
                  <span
                    className={`pill ${
                      selectedRace.finishedAt !== null
                        ? "ended"
                        : raceRunning
                          ? "live"
                          : ""
                    }`}
                  >
                    {selectedRace.finishedAt !== null
                      ? "Encerrada"
                      : raceRunning
                        ? "Em andamento"
                        : "Aguardando início"}
                  </span>
                </div>

                <div className="big-timer">
                  {formatTime(
                    elapsedAt(
                      selectedRace.startedAt,
                      selectedRace.finishedAt,
                      now,
                    ),
                  )}
                </div>
                <p className="muted">Tempo geral da prova</p>

                <div className="button-row centered">
                  <button
                    className="btn success"
                    disabled={
                      selectedRace.startedAt !== null ||
                      selectedRace.finishedAt !== null
                    }
                    onClick={startRace}
                  >
                    ▶ Iniciar prova
                  </button>
                  <button
                    className="btn danger"
                    disabled={!raceRunning}
                    onClick={finishRace}
                  >
                    ■ Encerrar prova
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => exportRace(selectedRace)}
                  >
                    ↓ Exportar TXT
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => deleteRace(selectedRace.id)}
                  >
                    Excluir prova
                  </button>
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h3>Equipes participantes</h3>
                    <p className="muted">
                      {selectedRace.competitors.length} equipes cadastradas
                    </p>
                  </div>
                </div>

                <div className="competitor-list">
                  {selectedRace.competitors.map((competitor) => {
                    const elapsed =
                      competitor.finishedAt ??
                      elapsedAt(
                        selectedRace.startedAt,
                        selectedRace.finishedAt,
                        now,
                      );

                    const laps = competitor.events.filter(
                      (event) => event.type === "VOLTA",
                    );

                    const lastEvent =
                      competitor.events[competitor.events.length - 1];

                    return (
                      <article className="competitor-card" key={competitor.id}>
                        <div className="competitor-main">
                          <div className="boat-number">
                            {competitor.number}
                          </div>
                          <div className="competitor-info">
                            <h4>{competitor.name}</h4>
                            <p className="muted">
                              {laps.length} volta(s)
                              {lastEvent
                                ? ` · ${formatTime(lastEvent.elapsed)}`
                                : ""}
                            </p>
                          </div>
                          <div className="competitor-time">
                            <strong>{formatTime(elapsed)}</strong>
                            <span
                              className={`mini-status ${
                                competitor.finishedAt !== null
                                  ? "finished"
                                  : raceRunning
                                    ? "live"
                                    : ""
                              }`}
                            >
                              {competitor.finishedAt !== null
                                ? "Finalizado"
                                : raceRunning
                                  ? "Correndo"
                                  : "Aguardando"}
                            </span>
                          </div>
                        </div>

                        <div className="competitor-actions">
                          <button
                            className="btn small primary"
                            disabled={
                              !raceRunning ||
                              competitor.finishedAt !== null
                            }
                            onClick={() =>
                              registerLap(selectedRace, competitor)
                            }
                          >
                            + Volta
                          </button>
                          <button
                            className="btn small secondary"
                            disabled={
                              !raceRunning ||
                              competitor.finishedAt !== null
                            }
                            onClick={() =>
                              registerPoint(selectedRace, competitor)
                            }
                          >
                            ◉ Ponto
                          </button>
                          <button
                            className="btn small danger"
                            disabled={
                              !raceRunning ||
                              competitor.finishedAt !== null
                            }
                            onClick={() =>
                              finishCompetitor(selectedRace, competitor)
                            }
                          >
                            Finalizar
                          </button>
                          <button
                            className="btn small ghost"
                            onClick={() =>
                              window.alert(
                                `${competitor.name} — Nº ${competitor.number}\n` +
                                  `Tempo: ${formatTime(elapsed)}\n\n` +
                                  formatEvents(competitor.events),
                              )
                            }
                          >
                            Registros (${competitor.events.length})
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section className="panel empty">
              Crie uma prova para carregar automaticamente as 12 equipes.
            </section>
          )}
        </main>
      )}

      {tab === "individual" && (
        <main className="page">
          <div className="heading">
            <p className="eyebrow">MEDIÇÃO INDEPENDENTE</p>
            <h2>Cronômetro individual</h2>
            <p className="muted">
              Escolha uma das 12 equipes e registre seus tempos separadamente.
            </p>
          </div>

          <section className="timer-panel">
            <label className="field-label" htmlFor="individual-team">
              Equipe
            </label>
            <select
              id="individual-team"
              className="team-select"
              value={individualTeam}
              disabled={individual.startedAt !== null}
              onChange={(e) => setIndividualTeam(e.target.value)}
            >
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            <p className="eyebrow">TEMPO DECORRIDO</p>
            <div className="big-timer">{formatTime(individualElapsed)}</div>
            <p className="muted">
              {individual.finishedAt !== null
                ? `Sessão encerrada · ${individual.name}`
                : individualRunning
                  ? `Cronômetro em andamento · ${individual.name}`
                  : individual.startedAt !== null
                    ? `Sessão encerrada · ${individual.name}`
                    : `Pronto para iniciar · ${individualTeam}`}
            </p>

            <div className="button-row centered">
              <button
                className="btn success"
                disabled={individual.startedAt !== null}
                onClick={startIndividual}
              >
                ▶ Iniciar
              </button>
              <button
                className="btn primary"
                disabled={!individualRunning}
                onClick={() => registerIndividualEvent("VOLTA")}
              >
                + Volta
              </button>
              <button
                className="btn secondary"
                disabled={!individualRunning}
                onClick={() => registerIndividualEvent("PONTO")}
              >
                ◉ Marcar ponto
              </button>
              <button
                className="btn danger"
                disabled={!individualRunning}
                onClick={stopIndividual}
              >
                ■ Encerrar
              </button>
            </div>

            <div className="button-row centered" style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={exportIndividual}>
                ↓ Exportar TXT
              </button>
              <button className="btn ghost" onClick={resetIndividual}>
                ↻ Nova sessão
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <h3>Registros da sessão</h3>
                <p className="muted">
                  {individual.events.length} evento(s)
                </p>
              </div>
            </div>

            {individual.events.length === 0 ? (
              <div className="empty">
                As voltas e os pontos marcados aparecerão aqui.
              </div>
            ) : (
              <div className="event-list">
                {[...individual.events].reverse().map((event) => (
                  <div className="event-row" key={event.id}>
                    <div>
                      <strong>
                        {event.type === "VOLTA"
                          ? `Volta ${event.lap}`
                          : event.type === "PONTO"
                            ? event.pointName
                            : "Finalização"}
                      </strong>
                      <p className="muted">{event.recordedAt}</p>
                    </div>
                    <div className="event-times">
                      <strong>{formatTime(event.elapsed)}</strong>
                      {event.type === "VOLTA" && (
                        <span className="muted">
                          Volta: {formatTime(event.lapTime ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      <footer className="footer">
        RaceTime · Cronometragem de competições náuticas
      </footer>
    </div>
  );
}

export default App;
