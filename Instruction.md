# CineRoom — готовий код для ручного переписування

Цей документ містить повний код файлів, а не лише опис завдань. Створи файли за вказаними шляхами та перепиши вміст вручну. Не потрібно переносити цей Markdown у термінал.

## Послідовність

1. Перепиши типи, дані місць і frontend-компоненти.
2. Встанови Socket.io client наведеною командою.
3. Перепиши backend і головний компонент.
4. Перепиши стилі та запусти перевірки.

Файли assets з шаблону Vite можна залишити: CineRoom їх більше не імпортуватиме. `frontend/src/main.tsx` теж залишається без змін.

---

## 1. Типи

### `frontend/src/types/Cinema.ts`

```ts
export type SeatStatus = "available" | "selected" | "occupied";

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
  "select-seat": (roomId: string, seatId: string) => void;
  "release-seat": (roomId: string, seatId: string) => void;
  "player-state": (roomId: string, player: PlayerState) => void;
  reaction: (roomId: string, emoji: string) => void;
}

export interface ServerToClientEvents {
  "room-state": (state: RoomState) => void;
  "participant-updated": (user: CinemaUser) => void;
  "participant-left": (userId: string) => void;
  "player-state": (player: PlayerState) => void;
  reaction: (userId: string, emoji: string) => void;
}
```

---

## 2. Розташування крісел

### Створи `frontend/src/data/seats.ts`

```ts
import type { Seat } from "../types/Cinema";

export function createSeats(): Seat[] {
  const seats: Seat[] = [];

  for (let row = 1; row <= 4; row += 1) {
    for (let number = 1; number <= 8; number += 1) {
      seats.push({
        id: `${row}-${number}`,
        row,
        number,
        position: {
          x: (number - 4.5) * 1.5,
          y: 0.75 + row * 0.18,
          z: -3 + row * 2.2,
        },
        status: "available",
      });
    }
  }

  return seats;
}

export const SEATS = createSeats();

export function findSeatById(seats: Seat[], seatId: string): Seat | undefined {
  return seats.find((seat) => seat.id === seatId);
}
```

---

## 3. Крісло та зал

### Створи `frontend/src/components/SeatModel.tsx`

```tsx
import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Seat } from "../types/Cinema";

interface SeatModelProps {
  seat: Seat;
  selected: boolean;
  onSelect: (seat: Seat) => void;
}

export default function SeatModel({
  seat,
  selected,
  onSelect,
}: SeatModelProps) {
  const [hovered, setHovered] = useState(false);
  const unavailable = seat.status === "occupied";
  const color = unavailable
    ? "#713d49"
    : selected
      ? "#f5b942"
      : hovered
        ? "#69e0d0"
        : "#34445b";

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (!unavailable) onSelect(seat);
  }

  return (
    <group
      position={[seat.position.x, seat.position.y, seat.position.z]}
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.05, 0.22, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.65, 0.34]} castShadow>
        <boxGeometry args={[1.05, 1.2, 0.22]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[-0.58, 0.27, 0]} castShadow>
        <boxGeometry args={[0.16, 0.45, 0.85]} />
        <meshStandardMaterial color="#202b3b" />
      </mesh>
      <mesh position={[0.58, 0.27, 0]} castShadow>
        <boxGeometry args={[0.16, 0.45, 0.85]} />
        <meshStandardMaterial color="#202b3b" />
      </mesh>
    </group>
  );
}
```

### Створи `frontend/src/components/Screen.tsx`

```tsx
import { Html } from "@react-three/drei";
import type { RefObject } from "react";

interface ScreenProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceUrl: string;
}

export default function Screen({ videoRef, sourceUrl }: ScreenProps) {
  return (
    <group position={[0, 5.2, -10.8]}>
      <mesh>
        <boxGeometry args={[14.6, 8.3, 0.35]} />
        <meshStandardMaterial color="#11131b" metalness={0.3} />
      </mesh>
      <Html transform distanceFactor={10} position={[0, 0, 0.2]}>
        <video
          ref={videoRef}
          src={sourceUrl || undefined}
          controls={false}
          playsInline
          style={{
            display: "block",
            width: 800,
            height: 450,
            objectFit: "contain",
            background: "#050608",
          }}
        />
      </Html>
    </group>
  );
}
```

### Створи `frontend/src/components/CinemaHall.tsx`

```tsx
interface CinemaHallProps {
  isPlaying: boolean;
}

export default function CinemaHall({ isPlaying }: CinemaHallProps) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[26, 30]} />
        <meshStandardMaterial color="#171923" roughness={0.9} />
      </mesh>
      <mesh position={[0, 5, -12]}>
        <boxGeometry args={[26, 10, 0.5]} />
        <meshStandardMaterial color="#10121a" />
      </mesh>
      <mesh position={[-13, 5, 1]}>
        <boxGeometry args={[0.5, 10, 26]} />
        <meshStandardMaterial color="#151722" />
      </mesh>
      <mesh position={[13, 5, 1]}>
        <boxGeometry args={[0.5, 10, 26]} />
        <meshStandardMaterial color="#151722" />
      </mesh>
      <ambientLight intensity={isPlaying ? 0.25 : 0.8} />
      <pointLight
        position={[-8, 7, 3]}
        color="#546bff"
        intensity={isPlaying ? 8 : 28}
      />
      <pointLight
        position={[8, 7, -1]}
        color="#42d7cc"
        intensity={isPlaying ? 6 : 22}
      />
      <pointLight
        position={[0, 8, -8]}
        color="#e8b866"
        intensity={isPlaying ? 5 : 18}
      />
    </group>
  );
}
```

### Створи `frontend/src/components/ParticipantAvatar.tsx`

```tsx
import { Html } from "@react-three/drei";
import type { CinemaUser, Seat } from "../types/Cinema";

interface ParticipantAvatarProps {
  user: CinemaUser;
  seat: Seat;
}

export default function ParticipantAvatar({
  user,
  seat,
}: ParticipantAvatarProps) {
  return (
    <group
      position={[
        seat.position.x,
        seat.position.y + 1.2,
        seat.position.z - 0.15,
      ]}
      rotation={[0, Math.PI, 0]}
    >
      <mesh castShadow>
        <capsuleGeometry args={[0.32, 0.55, 4, 8]} />
        <meshStandardMaterial color={user.avatarColor} roughness={0.4} />
      </mesh>
      <Html position={[0, 0.85, 0]} center distanceFactor={10}>
        <span className="avatar-name">{user.name}</span>
      </Html>
    </group>
  );
}
```

### Створи `frontend/src/components/CameraRig.tsx`

```tsx
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import type { Seat } from "../types/Cinema";

interface CameraRigProps {
  selectedSeat: Seat | null;
  overview: boolean;
}

export default function CameraRig({ selectedSeat, overview }: CameraRigProps) {
  const { camera } = useThree();
  const target = useRef(new Vector3(0, 2.5, -3));
  const destination = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (overview || !selectedSeat) {
      destination.set(0, 9, 17);
      target.current.lerp(new Vector3(0, 2.5, -3), 1 - Math.exp(-3 * delta));
    } else {
      destination.set(
        selectedSeat.position.x,
        selectedSeat.position.y + 2.5,
        selectedSeat.position.z + 3.8,
      );
      target.current.lerp(
        new Vector3(selectedSeat.position.x, 3, -5),
        1 - Math.exp(-3 * delta),
      );
    }

    camera.position.lerp(destination, 1 - Math.exp(-3 * delta));
    camera.lookAt(target.current);
  });

  return null;
}
```

### Створи `frontend/src/components/CinemaScene.tsx`

```tsx
import { Canvas } from "@react-three/fiber";
import type { RefObject } from "react";
import type { CinemaUser, Seat } from "../types/Cinema";
import CameraRig from "./CameraRig";
import CinemaHall from "./CinemaHall";
import ParticipantAvatar from "./ParticipantAvatar";
import Screen from "./Screen";
import SeatModel from "./SeatModel";

interface CinemaSceneProps {
  seats: Seat[];
  selectedSeatId: string | null;
  overview: boolean;
  isPlaying: boolean;
  users: CinemaUser[];
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceUrl: string;
  onSeatSelect: (seat: Seat) => void;
}

export default function CinemaScene({
  seats,
  selectedSeatId,
  overview,
  isPlaying,
  users,
  videoRef,
  sourceUrl,
  onSeatSelect,
}: CinemaSceneProps) {
  const selectedSeat = seats.find((seat) => seat.id === selectedSeatId) ?? null;

  return (
    <div className="cinema-canvas">
      <Canvas camera={{ position: [0, 9, 17], fov: 48 }} shadows>
        <color attach="background" args={["#090b12"]} />
        <CinemaHall isPlaying={isPlaying} />
        <Screen videoRef={videoRef} sourceUrl={sourceUrl} />
        {seats.map((seat) => (
          <SeatModel
            key={seat.id}
            seat={seat}
            selected={seat.id === selectedSeatId}
            onSelect={onSeatSelect}
          />
        ))}
        {users.map((user) => {
          const occupiedSeat = seats.find((seat) => seat.id === user.seatId);
          return occupiedSeat ? (
            <ParticipantAvatar key={user.id} user={user} seat={occupiedSeat} />
          ) : null;
        })}
        <CameraRig selectedSeat={selectedSeat} overview={overview} />
      </Canvas>
    </div>
  );
}
```

---

## 4. Плеєр та запрошення

### Створи `frontend/src/hooks/useCinemaPlayer.ts`

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerState } from "../types/Cinema";

const initialState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  sourceUrl: "",
};

export function useCinemaPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () =>
      setState((current) => ({ ...current, currentTime: video.currentTime }));
    const updateDuration = () =>
      setState((current) => ({ ...current, duration: video.duration || 0 }));
    const handleError = () => {
      setError("Не вдалося завантажити відео. Перевір посилання на джерело.");
      setState((current) => ({ ...current, isPlaying: false }));
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("error", handleError);
      video.pause();
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !state.sourceUrl) {
      setError("Спочатку додай URL відео.");
      return;
    }
    if (video.paused) {
      try {
        await video.play();
        setError("");
        setState((current) => ({ ...current, isPlaying: true }));
      } catch {
        setError("Браузер не зміг відтворити це відео.");
      }
    } else {
      video.pause();
      setState((current) => ({ ...current, isPlaying: false }));
    }
  }, [state.sourceUrl]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || time));
    setState((current) => ({ ...current, currentTime: video.currentTime }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const value = Math.max(0, Math.min(1, volume));
    if (videoRef.current) videoRef.current.volume = value;
    setState((current) => ({ ...current, volume: value }));
  }, []);

  const changeSource = useCallback((sourceUrl: string) => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setError("");
    setState({ ...initialState, sourceUrl });
  }, []);

  const syncFromState = useCallback(
    (remote: PlayerState) => {
      const video = videoRef.current;
      if (!video) return;
      if (remote.sourceUrl !== state.sourceUrl) {
        setState(remote);
        return;
      }
      if (Math.abs(video.currentTime - remote.currentTime) > 2) {
        video.currentTime = remote.currentTime;
      }
      video.volume = remote.volume;
      if (remote.isPlaying && video.paused) void video.play();
      if (!remote.isPlaying && !video.paused) video.pause();
      setState(remote);
    },
    [state.sourceUrl],
  );

  return {
    videoRef,
    state,
    error,
    togglePlay,
    seek,
    setVolume,
    changeSource,
    syncFromState,
  };
}
```

### Створи `frontend/src/components/InviteButton.tsx`

```tsx
import { useState } from "react";

export default function InviteButton() {
  const [message, setMessage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Скопійовано");
    } catch {
      setMessage("Не вдалося скопіювати");
    }
    window.setTimeout(() => setMessage(""), 1800);
  }

  return (
    <button className="secondary-button" type="button" onClick={copyLink}>
      {message || "Запросити друзів"}
    </button>
  );
}
```

### Створи `frontend/src/components/PlayerOverlay.tsx`

```tsx
import { useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { PlayerState, Seat } from "../types/Cinema";
import InviteButton from "./InviteButton";

interface PlayerOverlayProps {
  state: PlayerState;
  error: string;
  seats: Seat[];
  selectedSeatId: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  onSource: (url: string) => void;
  onSeat: (seatId: string) => void;
  onReleaseSeat: () => void;
  onOverview: () => void;
  onReaction: (emoji: string) => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function PlayerOverlay(props: PlayerOverlayProps) {
  const [sourceInput, setSourceInput] = useState(props.state.sourceUrl);
  const [seatInput, setSeatInput] = useState(props.selectedSeatId ?? "");
  const volume = props.state.volume;

  return (
    <main className="player-overlay">
      <header className="topbar">
        <div>
          <p className="eyebrow">PRIVATE WATCH ROOM</p>
          <h1>CineRoom</h1>
        </div>
        <div className="top-actions">
          <InviteButton />
          <button
            className="secondary-button"
            type="button"
            onClick={props.onOverview}
          >
            <Maximize2 size={16} /> Огляд залу
          </button>
        </div>
      </header>

      <section className="control-panel" aria-label="Керування кімнатою">
        <form
          className="source-form"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSource(sourceInput.trim());
          }}
        >
          <label htmlFor="source-url">Посилання на відео</label>
          <div className="input-row">
            <input
              id="source-url"
              type="url"
              value={sourceInput}
              onChange={(event) => setSourceInput(event.target.value)}
              placeholder="https://example.com/video.mp4"
            />
            <button type="submit">Завантажити</button>
          </div>
        </form>

        <div className="transport-controls">
          <button
            className="icon-button"
            type="button"
            onClick={props.onTogglePlay}
            aria-label="Відтворити або призупинити"
          >
            {props.state.isPlaying ? <Pause /> : <Play />}
          </button>
          <span className="time-label">
            {formatTime(props.state.currentTime)}
          </span>
          <input
            className="progress-control"
            aria-label="Позиція відео"
            type="range"
            min="0"
            max={Math.max(props.state.duration, 1)}
            step="0.1"
            value={Math.min(props.state.currentTime, props.state.duration || 0)}
            onChange={(event) => props.onSeek(Number(event.target.value))}
          />
          <span className="time-label">{formatTime(props.state.duration)}</span>
          <button
            className="icon-button"
            type="button"
            aria-label="Вимкнути або увімкнути звук"
            onClick={() => props.onVolume(volume > 0 ? 0 : 0.7)}
          >
            {volume > 0 ? <Volume2 /> : <VolumeX />}
          </button>
          <input
            className="volume-control"
            aria-label="Гучність"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => props.onVolume(Number(event.target.value))}
          />
        </div>

        <div className="bottom-controls">
          <label className="seat-picker">
            Моє місце
            <select
              value={seatInput}
              onChange={(event) => {
                setSeatInput(event.target.value);
                if (event.target.value) props.onSeat(event.target.value);
                else props.onReleaseSeat();
              }}
            >
              <option value="">Не вибрано</option>
              {props.seats.map((seat) => (
                <option
                  key={seat.id}
                  value={seat.id}
                  disabled={seat.status === "occupied"}
                >
                  Ряд {seat.row}, місце {seat.number}
                </option>
              ))}
            </select>
          </label>
          <div className="reaction-picker" aria-label="Надіслати реакцію">
            {["❤️", "😂", "👏", "🍿"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => props.onReaction(emoji)}
                aria-label={`Реакція ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        {props.error && (
          <p className="error-message" role="status">
            {props.error}
          </p>
        )}
      </section>
    </main>
  );
}
```

---

## 5. Socket.io клієнт

### Встанови залежність один раз

```powershell
cd frontend
npm install socket.io-client
```

### Створи `frontend/src/hooks/useCinemaSocket.ts`

```ts
import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  CinemaUser,
  ClientToServerEvents,
  PlayerState,
  RoomState,
  ServerToClientEvents,
} from "../types/Cinema";

type CinemaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const emptyPlayer: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  sourceUrl: "",
};

export function useCinemaSocket(roomId: string, user: CinemaUser) {
  const [socket, setSocket] = useState<CinemaSocket | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    roomId,
    users: [],
    seats: [],
    player: emptyPlayer,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastReaction, setLastReaction] = useState<{
    userId: string;
    emoji: string;
  } | null>(null);

  useEffect(() => {
    const client = io<ServerToClientEvents, ClientToServerEvents>(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001",
    );
    setSocket(client);

    const join = () => client.emit("join-room", roomId, user);
    client.on("connect", join);
    client.on("connect", () => setIsConnected(true));
    client.on("disconnect", () => setIsConnected(false));
    client.on("room-state", setRoomState);
    client.on("participant-updated", (updatedUser) => {
      setRoomState((current) => ({
        ...current,
        users: [
          ...current.users.filter((item) => item.id !== updatedUser.id),
          updatedUser,
        ],
      }));
    });
    client.on("participant-left", (userId) => {
      setRoomState((current) => ({
        ...current,
        users: current.users.filter((item) => item.id !== userId),
        seats: current.seats.map((seat) =>
          seat.occupantId === userId
            ? { ...seat, status: "available", occupantId: undefined }
            : seat,
        ),
      }));
    });
    client.on("player-state", (player) => {
      setRoomState((current) => ({ ...current, player }));
    });
    client.on("reaction", (userId, emoji) =>
      setLastReaction({ userId, emoji }),
    );

    return () => {
      client.emit("leave-room", roomId);
      client.removeAllListeners();
      client.disconnect();
    };
  }, [roomId, user]);

  const selectSeat = useCallback(
    (seatId: string) => socket?.emit("select-seat", roomId, seatId),
    [roomId, socket],
  );
  const releaseSeat = useCallback(
    (seatId: string) => socket?.emit("release-seat", roomId, seatId),
    [roomId, socket],
  );
  const sendPlayerState = useCallback(
    (player: PlayerState) => socket?.emit("player-state", roomId, player),
    [roomId, socket],
  );
  const sendReaction = useCallback(
    (emoji: string) => socket?.emit("reaction", roomId, emoji),
    [roomId, socket],
  );

  return {
    roomState,
    isConnected,
    lastReaction,
    selectSeat,
    releaseSeat,
    sendPlayerState,
    sendReaction,
  };
}
```

---

## 6. Backend кімнат і синхронізації

### Замінити вміст `backend/src/index.ts`

```ts
import cors from "cors";
import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

interface CinemaUser {
  id: string;
  name: string;
  seatId: string | null;
  avatarColor: string;
}

interface Seat {
  id: string;
  row: number;
  number: number;
  position: { x: number; y: number; z: number };
  status: "available" | "selected" | "occupied";
  occupantId?: string;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  sourceUrl: string;
}

interface RoomState {
  roomId: string;
  users: CinemaUser[];
  seats: Seat[];
  player: PlayerState;
}

interface ClientToServerEvents {
  "join-room": (roomId: string, user: CinemaUser) => void;
  "leave-room": (roomId: string) => void;
  "select-seat": (roomId: string, seatId: string) => void;
  "release-seat": (roomId: string, seatId: string) => void;
  "player-state": (roomId: string, player: PlayerState) => void;
  reaction: (roomId: string, emoji: string) => void;
}

interface ServerToClientEvents {
  "room-state": (state: RoomState) => void;
  "participant-updated": (user: CinemaUser) => void;
  "participant-left": (userId: string) => void;
  "player-state": (player: PlayerState) => void;
  reaction: (userId: string, emoji: string) => void;
}

const app = express();
const httpServer = createServer(app);
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: allowedOrigin },
});
const rooms = new Map<string, RoomState>();
const socketUsers = new Map<string, { roomId: string; userId: string }>();

const initialPlayer: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  sourceUrl: "",
};

function makeSeats(): Seat[] {
  const seats: Seat[] = [];
  for (let row = 1; row <= 4; row += 1) {
    for (let number = 1; number <= 8; number += 1) {
      seats.push({
        id: `${row}-${number}`,
        row,
        number,
        position: {
          x: (number - 4.5) * 1.5,
          y: 0.75 + row * 0.18,
          z: -3 + row * 2.2,
        },
        status: "available",
      });
    }
  }
  return seats;
}

function getRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      users: [],
      seats: makeSeats(),
      player: { ...initialPlayer },
    };
    rooms.set(roomId, room);
  }
  return room;
}

function snapshot(room: RoomState): RoomState {
  return {
    roomId: room.roomId,
    users: room.users.map((user) => ({ ...user })),
    seats: room.seats.map((seat) => ({ ...seat })),
    player: { ...room.player },
  };
}

function leaveRoom(socketId: string, roomId: string) {
  const room = rooms.get(roomId);
  const membership = socketUsers.get(socketId);
  if (!room || !membership || membership.roomId !== roomId) return;
  const user = room.users.find((item) => item.id === membership.userId);
  if (user?.seatId) {
    const seat = room.seats.find((item) => item.id === user.seatId);
    if (seat) {
      seat.status = "available";
      delete seat.occupantId;
    }
  }
  room.users = room.users.filter((item) => item.id !== membership.userId);
  socketUsers.delete(socketId);
  io.to(roomId).emit("participant-left", membership.userId);
  if (room.users.length === 0) rooms.delete(roomId);
}

app.use(cors({ origin: allowedOrigin }));
app.get("/health", (_request, response) => response.json({ ok: true }));

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId, incomingUser) => {
    if (!roomId || !incomingUser?.id || !incomingUser.name) return;
    const previous = socketUsers.get(socket.id);
    if (previous) {
      leaveRoom(socket.id, previous.roomId);
      await socket.leave(previous.roomId);
    }

    const room = getRoom(roomId);
    const user = { ...incomingUser, seatId: null };
    room.users = [...room.users.filter((item) => item.id !== user.id), user];
    socketUsers.set(socket.id, { roomId, userId: user.id });
    await socket.join(roomId);
    socket.emit("room-state", snapshot(room));
    socket.to(roomId).emit("participant-updated", user);
  });

  socket.on("leave-room", async (roomId) => {
    leaveRoom(socket.id, roomId);
    await socket.leave(roomId);
  });

  socket.on("select-seat", (roomId, seatId) => {
    const membership = socketUsers.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || membership?.roomId !== roomId) return;
    const user = room.users.find((item) => item.id === membership.userId);
    const seat = room.seats.find((item) => item.id === seatId);
    if (!user || !seat || (seat.occupantId && seat.occupantId !== user.id))
      return;
    if (user.seatId) {
      const oldSeat = room.seats.find((item) => item.id === user.seatId);
      if (oldSeat) {
        oldSeat.status = "available";
        delete oldSeat.occupantId;
      }
    }
    user.seatId = seatId;
    seat.status = "occupied";
    seat.occupantId = user.id;
    io.to(roomId).emit("room-state", snapshot(room));
  });

  socket.on("release-seat", (roomId, seatId) => {
    const membership = socketUsers.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || membership?.roomId !== roomId) return;
    const user = room.users.find((item) => item.id === membership.userId);
    const seat = room.seats.find((item) => item.id === seatId);
    if (!user || !seat || seat.occupantId !== user.id) return;
    user.seatId = null;
    seat.status = "available";
    delete seat.occupantId;
    io.to(roomId).emit("room-state", snapshot(room));
  });

  socket.on("player-state", (roomId, player) => {
    const membership = socketUsers.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || membership?.roomId !== roomId || !player) return;
    if (
      typeof player.isPlaying !== "boolean" ||
      !Number.isFinite(player.currentTime) ||
      !Number.isFinite(player.duration) ||
      !Number.isFinite(player.volume) ||
      typeof player.sourceUrl !== "string"
    )
      return;
    room.player = {
      isPlaying: player.isPlaying,
      currentTime: Math.max(0, player.currentTime),
      duration: Math.max(0, player.duration),
      volume: Math.max(0, Math.min(1, player.volume)),
      sourceUrl: player.sourceUrl,
    };
    socket.to(roomId).emit("player-state", room.player);
  });

  socket.on("reaction", (roomId, emoji) => {
    const membership = socketUsers.get(socket.id);
    if (
      membership?.roomId !== roomId ||
      typeof emoji !== "string" ||
      emoji.length > 12
    )
      return;
    socket.to(roomId).emit("reaction", membership.userId, emoji);
  });

  socket.on("disconnect", () => {
    const membership = socketUsers.get(socket.id);
    if (membership) leaveRoom(socket.id, membership.roomId);
  });
});

const port = Number(process.env.PORT) || 3001;
httpServer.listen(port, () => {
  console.log(`CineRoom server listening on port ${port}`);
});
```

---

## 7. Головна сторінка

### Замінити вміст `frontend/src/App.tsx`

```tsx
import { useEffect, useMemo, useState } from "react";
import CinemaScene from "./components/CinemaScene";
import PlayerOverlay from "./components/PlayerOverlay";
import { SEATS } from "./data/seats";
import { useCinemaPlayer } from "./hooks/useCinemaPlayer";
import { useCinemaSocket } from "./hooks/useCinemaSocket";
import type { CinemaUser, Seat } from "./types/Cinema";
import "./App.css";

function getRoomId() {
  const url = new URL(window.location.href);
  let roomId = url.searchParams.get("room");
  if (!roomId) {
    roomId = crypto.randomUUID().slice(0, 8);
    url.searchParams.set("room", roomId);
    window.history.replaceState(null, "", url);
  }
  return roomId;
}

function getUser(): CinemaUser {
  const storedId = window.localStorage.getItem("cineroom-user-id");
  const id = storedId || crypto.randomUUID();
  window.localStorage.setItem("cineroom-user-id", id);
  return {
    id,
    name:
      window.localStorage.getItem("cineroom-user-name") ||
      `Гість ${id.slice(0, 4)}`,
    seatId: null,
    avatarColor: "#69e0d0",
  };
}

export default function App() {
  const roomId = useMemo(getRoomId, []);
  const user = useMemo(getUser, []);
  const player = useCinemaPlayer();
  const room = useCinemaSocket(roomId, user);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [overview, setOverview] = useState(true);
  const [visibleReaction, setVisibleReaction] = useState<{
    userId: string;
    emoji: string;
  } | null>(null);

  const seats = room.roomState.seats.length ? room.roomState.seats : SEATS;
  const users = room.roomState.users;

  useEffect(() => {
    if (room.roomState.player.sourceUrl)
      player.syncFromState(room.roomState.player);
  }, [room.roomState.player, player.syncFromState]);

  useEffect(() => {
    const currentUser = users.find((item) => item.id === user.id);
    setSelectedSeatId(currentUser?.seatId ?? null);
  }, [users, user.id]);

  useEffect(() => {
    if (!room.lastReaction) return;
    setVisibleReaction(room.lastReaction);
    const timeout = window.setTimeout(() => setVisibleReaction(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [room.lastReaction]);

  function selectSeat(seat: Seat) {
    if (seat.status === "occupied" && seat.occupantId !== user.id) return;
    room.selectSeat(seat.id);
    setSelectedSeatId(seat.id);
    setOverview(false);
  }

  function changeSource(url: string) {
    player.changeSource(url);
    room.sendPlayerState({
      ...player.state,
      sourceUrl: url,
      currentTime: 0,
      isPlaying: false,
    });
  }

  function togglePlay() {
    if (!player.state.sourceUrl) {
      void player.togglePlay();
      return;
    }
    void player.togglePlay();
    room.sendPlayerState({
      ...player.state,
      isPlaying: !player.state.isPlaying,
    });
  }

  return (
    <div className="app-shell">
      <CinemaScene
        seats={seats}
        selectedSeatId={selectedSeatId}
        overview={overview}
        isPlaying={player.state.isPlaying}
        users={users}
        videoRef={player.videoRef}
        sourceUrl={player.state.sourceUrl}
        onSeatSelect={selectSeat}
      />
      <PlayerOverlay
        state={player.state}
        error={player.error}
        seats={seats}
        selectedSeatId={selectedSeatId}
        onTogglePlay={togglePlay}
        onSeek={(time) => {
          player.seek(time);
          room.sendPlayerState({ ...player.state, currentTime: time });
        }}
        onVolume={(volume) => {
          player.setVolume(volume);
          room.sendPlayerState({ ...player.state, volume });
        }}
        onSource={changeSource}
        onSeat={(seatId) => {
          const seat = seats.find((item) => item.id === seatId);
          if (seat) selectSeat(seat);
        }}
        onReleaseSeat={() => {
          if (selectedSeatId) room.releaseSeat(selectedSeatId);
          setSelectedSeatId(null);
        }}
        onOverview={() => setOverview(true)}
        onReaction={room.sendReaction}
      />
      <div className={`connection-status ${room.isConnected ? "online" : ""}`}>
        {room.isConnected ? "У кімнаті" : "Підключення…"}
      </div>
      {visibleReaction && (
        <div
          key={`${visibleReaction.userId}-${visibleReaction.emoji}`}
          className="reaction-toast"
        >
          {visibleReaction.emoji}
        </div>
      )}
    </div>
  );
}
```

---

## 8. Стилі

### Замінити вміст `frontend/src/index.css`

```css
@import "tailwindcss";

:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color: #f4f4f5;
  background: #090b12;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-optical-sizing: auto;
  font-weight: 400;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  min-width: 320px;
  overflow: hidden;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}
```

### Замінити вміст `frontend/src/App.css`

```css
.app-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #090b12;
}

.cinema-canvas {
  position: absolute;
  inset: 0;
}

.player-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 28px clamp(16px, 4vw, 56px);
  pointer-events: none;
}

.topbar,
.control-panel {
  pointer-events: auto;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #69e0d0;
  font-size: 10px;
  letter-spacing: 0.2em;
}

h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.top-actions,
.input-row,
.transport-controls,
.bottom-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.secondary-button,
.source-form button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid #343844;
  border-radius: 10px;
  color: #f4f4f5;
  background: #171a24e8;
}

.secondary-button:hover,
.source-form button:hover {
  border-color: #69e0d0;
}

.control-panel {
  width: min(760px, 100%);
  align-self: center;
  padding: 18px;
  border: 1px solid #343844;
  border-radius: 18px;
  background: #10131bdc;
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 70px #0008;
}

.source-form label,
.seat-picker {
  display: grid;
  gap: 7px;
  color: #a7aab5;
  font-size: 12px;
}

.input-row input,
.seat-picker select {
  min-width: 0;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid #343844;
  border-radius: 9px;
  outline: none;
  color: #f4f4f5;
  background: #090b12;
}

.input-row input {
  flex: 1;
}

.input-row input:focus,
.seat-picker select:focus {
  border-color: #69e0d0;
}

.transport-controls {
  margin-top: 16px;
}

.icon-button,
.reaction-picker button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: #f4f4f5;
  background: #252936;
}

.icon-button svg {
  width: 17px;
  height: 17px;
}

.progress-control,
.volume-control {
  accent-color: #69e0d0;
}

.progress-control {
  flex: 1;
  min-width: 40px;
}

.volume-control {
  width: 84px;
}

.time-label {
  color: #b7bac5;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.bottom-controls {
  justify-content: space-between;
  margin-top: 16px;
}

.seat-picker select {
  min-width: 170px;
}

.reaction-picker {
  display: flex;
  gap: 6px;
}

.reaction-picker button {
  width: 36px;
  height: 36px;
  font-size: 18px;
}

.error-message {
  margin: 12px 0 0;
  color: #ff9a9a;
  font-size: 13px;
}

.connection-status {
  position: absolute;
  right: 24px;
  bottom: 20px;
  color: #c1c3ca;
  font-size: 12px;
}

.connection-status.online {
  color: #69e0d0;
}

.reaction-toast {
  position: absolute;
  top: 44%;
  left: 50%;
  font-size: 60px;
  animation: float-away 2s ease-out forwards;
  pointer-events: none;
}

.avatar-name {
  display: inline-block;
  padding: 3px 8px;
  border: 1px solid #ffffff30;
  border-radius: 999px;
  color: #fff;
  background: #10131bdc;
  font:
    12px/1.2 Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  white-space: nowrap;
}

@keyframes float-away {
  to {
    opacity: 0;
    transform: translateY(-90px) scale(1.3);
  }
}

@media (max-width: 700px) {
  .player-overlay {
    padding: 16px;
  }

  .topbar {
    align-items: flex-start;
  }

  h1 {
    font-size: 22px;
  }

  .top-actions {
    flex-direction: column;
    align-items: flex-end;
  }

  .control-panel {
    padding: 13px;
  }

  .transport-controls {
    gap: 6px;
  }

  .volume-control {
    width: 58px;
  }

  .bottom-controls {
    align-items: flex-end;
  }

  .seat-picker select {
    min-width: 130px;
  }
}
```

---

## 9. Перевірка

У першому терміналі запусти сервер:

```powershell
cd backend
npm run dev
```

У другому терміналі запусти frontend:

```powershell
cd frontend
npm run dev
```

Збірка frontend:

```powershell
cd frontend
npm run build
npm run lint
```

Health check сервера у браузері: `http://localhost:3001/health`.
Для спільної кімнати відкрий адресу з однаковим `?room=...` у двох вікнах.

> Відео має бути доступним як пряме посилання на файл, яке дозволяє браузерне відтворення (наприклад MP4). Посилання на сторінку YouTube не є прямим URL відеофайлу.

### Відомі межі цієї версії

- Кімнати зберігаються в пам'яті процесу і очищуються після виходу всіх учасників.
- Синхронізація часу надсилається при діях плеєра, а не щокадру.
- Плеєр не обходить CORS або обмеження відеохостингів.
