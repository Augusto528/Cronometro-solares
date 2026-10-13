
import { supabase } from "./supabase";

export type RoomRole = "admin" | "operator";

export interface Room {
  id: string;
  name: string;
  code: string;
  created_at: string;
  role: RoomRole;
}

interface RoomMembership {
  room_id: string;
  role: RoomRole;
}

interface RoomRecord {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export async function listarSalas(): Promise<Room[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("room_members")
    .select("room_id, role");

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const membros = (memberships ?? []) as RoomMembership[];

  if (membros.length === 0) {
    return [];
  }

  const roomIds = membros.map((membership) => membership.room_id);

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, code, created_at")
    .in("id", roomIds)
    .order("created_at", { ascending: false });

  if (roomsError) {
    throw new Error(roomsError.message);
  }

  const salas = (rooms ?? []) as RoomRecord[];
  const funcoes = new Map(
    membros.map((membership) => [membership.room_id, membership.role])
  );

  return salas.map((room) => ({
    ...room,
    role: funcoes.get(room.id) ?? "operator",
  }));
}

export async function criarSala(nome: string): Promise<Room> {
  const nomeNormalizado = nome.trim();

  if (!nomeNormalizado || nomeNormalizado.length > 100) {
    throw new Error("O nome da sala deve ter entre 1 e 100 caracteres.");
  }

  const { data, error } = await supabase.rpc("create_room", {
    p_name: nomeNormalizado,
  });

  if (error) {
    throw new Error(error.message);
  }

  const criada = data as { id: string; name: string; code: string };

  return {
    ...criada,
    created_at: new Date().toISOString(),
    role: "admin",
  };
}

export async function entrarNaSala(codigo: string): Promise<void> {
  const codigoNormalizado = codigo.trim().toUpperCase();

  if (!codigoNormalizado) {
    throw new Error("Informe o código da sala.");
  }

  const { error } = await supabase.rpc("join_room", {
    p_code: codigoNormalizado,
  });

  if (error) {
    throw new Error(error.message);
  }
}
