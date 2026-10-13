
import { supabase } from "./supabase";

export type RaceEventType = "VOLTA" | "PONTO" | "FINALIZACAO";

export interface RaceEventData {
  id: string;
  type: RaceEventType;
  elapsed: number;
  lap?: number;
  lapTime?: number;
  pointName?: string;
  recordedAt: string;
}

export interface CompetitorData {
  id: string;
  name: string;
  number: string;
  events: RaceEventData[];
  finishedAt: number | null;
}

export interface RaceData {
  id: string;
  name: string;
  createdAt: string;
  startedAt: number | null;
  startedWallTime: string | null;
  finishedAt: number | null;
  competitors: CompetitorData[];
}

interface RaceRow {
  id: string;
  name: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface CompetitorRow {
  id: string;
  race_id: string;
  name: string;
  number: number | string;
  finished_at: string | null;
}

interface RaceEventRow {
  id: string;
  race_id: string;
  competitor_id: string;
  type: RaceEventType;
  elapsed_ms: number;
  lap: number | null;
  lap_time_ms: number | null;
  point_name: string | null;
  recorded_at: string;
}

function toTimestamp(value: string | null): number | null {
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function elapsedBetween(
  start: number | null,
  finish: number | null,
): number | null {
  if (start === null || finish === null) return null;
  return Math.max(0, finish - start);
}

function formatDate(value: string | null): string | null {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return null;

  return new Date(timestamp).toLocaleString("pt-BR");
}

function mapEvent(row: RaceEventRow): RaceEventData {
  return {
    id: row.id,
    type: row.type,
    elapsed: Number(row.elapsed_ms),
    ...(row.lap !== null ? { lap: Number(row.lap) } : {}),
    ...(row.lap_time_ms !== null
      ? { lapTime: Number(row.lap_time_ms) }
      : {}),
    ...(row.point_name !== null
      ? { pointName: row.point_name }
      : {}),
    recordedAt: formatDate(row.recorded_at) ?? row.recorded_at,
  };
}

export async function carregarProvas(
  roomId: string,
): Promise<RaceData[]> {
  const { data: raceRows, error: racesError } = await supabase
    .from("races")
    .select("id, name, created_at, started_at, finished_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (racesError) {
    throw new Error(`Erro ao carregar provas: ${racesError.message}`);
  }

  const races = (raceRows ?? []) as RaceRow[];

  if (races.length === 0) return [];

  const raceIds = races.map((race) => race.id);

  const { data: competitorRows, error: competitorsError } =
    await supabase
      .from("competitors")
      .select("id, race_id, name, number, finished_at")
      .in("race_id", raceIds);

  if (competitorsError) {
    throw new Error(
      `Erro ao carregar equipes: ${competitorsError.message}`,
    );
  }

  const competitors = (competitorRows ?? []) as CompetitorRow[];
  const competitorIds = competitors.map((competitor) => competitor.id);

  let events: RaceEventRow[] = [];

  if (competitorIds.length > 0) {
    const { data: eventRows, error: eventsError } = await supabase
      .from("race_events")
      .select(
        "id, race_id, competitor_id, type, elapsed_ms, lap, lap_time_ms, point_name, recorded_at",
      )
      .in("competitor_id", competitorIds)
      .order("recorded_at", { ascending: true });

    if (eventsError) {
      throw new Error(
        `Erro ao carregar registros: ${eventsError.message}`,
      );
    }

    events = (eventRows ?? []) as RaceEventRow[];
  }

  return races.map((race) => {
    const startedAt = toTimestamp(race.started_at);
    const finishedTimestamp = toTimestamp(race.finished_at);

    return {
      id: race.id,
      name: race.name,
      createdAt:
        formatDate(race.created_at) ?? race.created_at,
      startedAt,
      startedWallTime: formatDate(race.started_at),
      finishedAt: elapsedBetween(startedAt, finishedTimestamp),
      competitors: competitors
        .filter((competitor) => competitor.race_id === race.id)
        .sort(
          (a, b) => Number(a.number) - Number(b.number),
        )
        .map((competitor) => ({
          id: competitor.id,
          name: competitor.name,
          number: String(competitor.number),
          finishedAt: elapsedBetween(
            startedAt,
            toTimestamp(competitor.finished_at),
          ),
          events: events
            .filter(
              (event) => event.competitor_id === competitor.id,
            )
            .map(mapEvent),
        })),
    };
  });
}

export async function criarProva(
  roomId: string,
  name: string,
  teams: string[],
): Promise<string> {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Digite o nome da prova.");
  }

  const { data, error } = await supabase.rpc("create_race", {
    p_room_id: roomId,
    p_name: normalizedName,
    p_teams: teams,
  });

  if (error) {
    throw new Error(`Erro ao criar prova: ${error.message}`);
  }

  if (typeof data !== "string" || !data) {
    throw new Error(
      "A prova foi solicitada, mas o banco não retornou seu identificador.",
    );
  }

  return data;
}

export async function iniciarProva(
  raceId: string,
): Promise<void> {
  const { error } = await supabase.rpc("start_race", {
    p_race_id: raceId,
  });

  if (error) {
    throw new Error(`Erro ao iniciar prova: ${error.message}`);
  }
}

export async function registrarVolta(
  raceId: string,
  competitorId: string,
): Promise<void> {
  const { error } = await supabase.rpc("register_lap", {
    p_race_id: raceId,
    p_competitor_id: competitorId,
  });

  if (error) {
    throw new Error(`Erro ao registrar volta: ${error.message}`);
  }
}

export async function registrarPonto(
  raceId: string,
  competitorId: string,
  pointName = "Boia",
): Promise<void> {
  const { error } = await supabase.rpc("register_point", {
    p_race_id: raceId,
    p_competitor_id: competitorId,
    p_point_name: pointName,
  });

  if (error) {
    throw new Error(`Erro ao registrar ponto: ${error.message}`);
  }
}

export async function finalizarEquipe(
  raceId: string,
  competitorId: string,
): Promise<void> {
  const { error } = await supabase.rpc("finish_competitor", {
    p_race_id: raceId,
    p_competitor_id: competitorId,
  });

  if (error) {
    throw new Error(`Erro ao finalizar equipe: ${error.message}`);
  }
}

export async function encerrarProva(
  raceId: string,
): Promise<void> {
  const { error } = await supabase.rpc("finish_race", {
    p_race_id: raceId,
  });

  if (error) {
    throw new Error(`Erro ao encerrar prova: ${error.message}`);
  }
}

export function observarProvas(
  roomId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`racetime-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "races",
        filter: `room_id=eq.${roomId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "competitors",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "race_events",
      },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function excluirProva(raceId: string): Promise<void> {
  const { error } = await supabase
    .from("races")
    .delete()
    .eq("id", raceId);

  if (error) {
    throw new Error(`Erro ao excluir prova: ${error.message}`);
  }
}
