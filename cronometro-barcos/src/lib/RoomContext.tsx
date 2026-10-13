
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { Room } from "./rooms";

const RoomContext = createContext<Room | null>(null);

export function RoomProvider({
  room,
  children,
}: {
  room: Room;
  children: ReactNode;
}) {
  return (
    <RoomContext.Provider value={room}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): Room {
  const room = useContext(RoomContext);

  if (!room) {
    throw new Error(
      "Nenhuma sala está selecionada. O componente deve estar dentro de RoomProvider."
    );
  }

  return room;
}
