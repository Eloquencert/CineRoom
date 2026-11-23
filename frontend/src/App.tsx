import { useEffect, useRef, useState } from "react";
import CinemaScene from "./components/CinemaScene";
import HomeScreen from "./components/HomeScreen";
import PlayerOverlay from "./components/PlayerOverlay";
import { SEATS } from "./data/seats";
import { useCinemaPlayer } from "./hooks/useCinemaPlayer";
import { useCinemaSocket } from "./hooks/useCinemaSocket";
import type { CinemaUser, Seat } from "./types/Cinema";
import { getYouTubeStartTime } from "./utils/videoSource";
import "./App.css";

function getRoomIdFromUrl() {
  return new URL(window.location.href).searchParams.get("room");
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
    avatarColor: "#e84a5f",
  };
}

function HiddenMediaSource({
  attachVideo,
}: {
  attachVideo: (video: HTMLVideoElement | null) => void;
}) {
  return (
    <video
      className="media-source"
      ref={attachVideo}
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

export default function App() {
  const [activeRoomId, setActiveRoomId] = useState(getRoomIdFromUrl);
  const [roomNameForJoin, setRoomNameForJoin] = useState("Кінозал");
  const [user] = useState(getUser);
  const player = useCinemaPlayer();
  const room = useCinemaSocket(activeRoomId, user, roomNameForJoin);
  const pendingSourceRef = useRef("");
  const [overview, setOverview] = useState(true);
  const seats = room.roomState.seats.length ? room.roomState.seats : SEATS;
  const users = room.roomState.users;
  const selectedSeatId =
    users.find((item) => item.id === user.id)?.seatId ?? null;

  const syncFromState = player.syncFromState;
  const sendPlayerState = room.sendPlayerState;
  const isConnected = room.isConnected;
  const isOwner = room.isOwner;
  const playerState = player.state;

  useEffect(() => {
    if (room.roomState.player.sourceUrl) {
      syncFromState(room.roomState.player);
    }
  }, [room.roomState.player, syncFromState]);

  useEffect(() => {
    if (!isConnected || !isOwner || !pendingSourceRef.current) return;
    sendPlayerState({
      ...playerState,
      sourceUrl: pendingSourceRef.current,
      isPlaying: false,
      currentTime: getYouTubeStartTime(pendingSourceRef.current),
    });
    pendingSourceRef.current = "";
  }, [isConnected, isOwner, sendPlayerState, playerState]);

  function updateRoomUrl(roomId: string | null) {
    const url = new URL(window.location.href);
    if (roomId) url.searchParams.set("room", roomId);
    else url.searchParams.delete("room");
    window.history.replaceState(null, "", url);
    setActiveRoomId(roomId);
  }

  function createRoom(name: string, sourceUrl: string) {
    const roomId = crypto.randomUUID();
    setRoomNameForJoin(name);
    if (sourceUrl) {
      player.changeSource(sourceUrl);
      pendingSourceRef.current = sourceUrl;
    }
    updateRoomUrl(roomId);
  }

  function joinRoom(roomId: string) {
    setRoomNameForJoin("Кінозал");
    updateRoomUrl(roomId);
  }

  function selectSeat(seat: Seat) {
    if (seat.status === "occupied" && seat.occupantId !== user.id) return;
    room.selectSeat(seat.id);
    setOverview(false);
  }

  function changeSource(url: string) {
    if (!room.isOwner) return;
    const trimmedUrl = url.trim();
    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported protocol");
        }
      } catch {
        player.setError("Введи коректне HTTP(S)-посилання на відеофайл.");
        return;
      }
    }
    player.changeSource(trimmedUrl);
    room.sendPlayerState({
      ...player.state,
      sourceUrl: trimmedUrl,
      currentTime: getYouTubeStartTime(trimmedUrl),
      duration: 0,
      isPlaying: false,
    });
  }

  async function togglePlay() {
    if (!room.isOwner) {
      await player.resumePlayback();
      return;
    }
    const isPlaying = await player.togglePlay();
    room.sendPlayerState({
      ...player.state,
      isPlaying,
    });
  }

  function leaveRoom() {
    pendingSourceRef.current = "";
    updateRoomUrl(null);
    setRoomNameForJoin("Кінозал");
  }

  if (!activeRoomId) {
    return (
      <>
        <HiddenMediaSource attachVideo={player.attachVideo} />
        <HomeScreen onCreate={createRoom} onJoin={joinRoom} />
      </>
    );
  }

  return (
    <>
      <HiddenMediaSource attachVideo={player.attachVideo} />
      <div className="app-shell">
      <CinemaScene
        seats={seats}
        selectedSeatId={selectedSeatId}
        overview={overview}
        isPlaying={player.state.isPlaying}
        playerState={player.state}
        playerError={player.error}
        isOwner={room.isOwner}
        users={users}
        videoElement={player.videoElement}
        sourceUrl={player.state.sourceUrl}
        onSeatSelect={selectSeat}
        onYouTubeReady={player.registerYouTubePlayer}
        onYouTubeStateChange={player.updateYouTubeState}
        onYouTubeTimeUpdate={player.updateYouTubeTime}
        onYouTubeError={player.handleYouTubeError}
        onTogglePlay={togglePlay}
        onSeek={(time) => {
          if (!room.isOwner) return;
          player.seek(time);
          room.sendPlayerState({ ...player.state, currentTime: time });
        }}
        onVolume={(volume) => {
          if (!room.isOwner) return;
          player.setVolume(volume);
          room.sendPlayerState({ ...player.state, volume });
        }}
        onSource={changeSource}
      />
      <PlayerOverlay
        seats={seats}
        selectedSeatId={selectedSeatId}
        roomName={room.roomState.roomName}
        isOwner={room.isOwner}
        onSeat={(seatId) => {
          const seat = seats.find((item) => item.id === seatId);
          if (seat) selectSeat(seat);
        }}
        onReleaseSeat={() => {
          if (selectedSeatId) room.releaseSeat(selectedSeatId);
        }}
        onOverview={() => setOverview(true)}
        onReaction={room.sendReaction}
        onUpdateRoomName={room.updateRoomName}
        onLeave={leaveRoom}
      />
      <div className={`connection-status ${isConnected ? "online" : ""}`}>
        <span className="connection-dot" />
        {isConnected ? "Кімната активна" : "Підключення…"}
      </div>
      {room.lastReaction && (
        <div
          key={room.lastReaction.id}
          className="reaction-toast"
        >
          {room.lastReaction.emoji}
        </div>
      )}
      </div>
    </>
  );
}
