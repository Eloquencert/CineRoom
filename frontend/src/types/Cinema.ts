export type SeatStatus = "availaible" | "selected" | "occupied";

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Seat {
  id: string;
  row: number;
  number: number;
  position: Position3D;
  status: SeatStatus;
  occupantId?: string;
}

export interface CameraState {
  position: Position3D;
  target: Position3D;
  isMoving: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  sourceUrl: string;
}

export interface CinemaUser {
  id: string;
  name: string;
  seatId: string | null;
  avatarColor: string;
  reaction?: string;
}

export interface RoomState {
  roomId: string;
  users: CinemaUser[];
  seats: Seat[];
  player: PlayerState;
}

export interface ClientToServerEvents {
  "join-room": (roomId: string, user: CinemaUser) => void;
  "leave-room": (roomId: string) => void;
  select_seat: (roomId: string, seatId: string) => void;
  release_seat: (roomId: string, seatId: string) => void;
  player_seat: (roomId: string, emoji: string) => void;
  reaction: (roomId: string, emoji: string) => void;
}

export interface ServerToClientEvents {
  "room-state": (state: RoomState) => void;
  "participant-updated": (user: CinemaUser) => void;
  "participant-left": (userId: string) => void;
  "player-state": (player: PlayerState) => void;
  reaction: (userId: string, emoji: string) => void;
}
