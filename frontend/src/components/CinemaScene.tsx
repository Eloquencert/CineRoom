import { Canvas } from "@react-three/fiber";
import type { CinemaUser, PlayerState, Seat } from "../types/Cinema";
import type { YouTubePlaybackController } from "../types/YouTube";
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
    playerState: PlayerState;
    playerError: string;
    isOwner: boolean;
    users: CinemaUser[];
    videoElement: HTMLVideoElement | null;
    sourceUrl: string;
    onSeatSelect: (seat: Seat) => void;
    onYouTubeReady: (player: YouTubePlaybackController | null) => void;
    onYouTubeStateChange: (state: number) => void;
    onYouTubeTimeUpdate: (currentTime: number, duration: number) => void;
    onYouTubeError: (message: string) => void;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onVolume: (volume: number) => void;
    onSource: (url: string) => void;
}

export default function CinemaScene({
  seats,
  selectedSeatId,
  overview,
  isPlaying,
  playerState,
  playerError,
  isOwner,
  users,
  videoElement,
  sourceUrl,
  onSeatSelect,
  onYouTubeReady,
  onYouTubeStateChange,
  onYouTubeTimeUpdate,
  onYouTubeError,
  onTogglePlay,
  onSeek,
  onVolume,
  onSource,
}: CinemaSceneProps) {
  const selectedSeat = seats.find((seat) => seat.id === selectedSeatId) ?? null;

  return (
    <div className="cinema-canvas">
      <Canvas camera={{ position: [0, 9, 17], fov: 48 }} shadows>
        <color attach="background" args={["#090b12"]} />
        <CinemaHall isPlaying={isPlaying} />
        <Screen
          videoElement={videoElement}
          sourceUrl={sourceUrl}
          isPlaying={isPlaying}
          playerState={playerState}
          playerError={playerError}
          isOwner={isOwner}
          onYouTubeReady={onYouTubeReady}
          onYouTubeStateChange={onYouTubeStateChange}
          onYouTubeTimeUpdate={onYouTubeTimeUpdate}
          onYouTubeError={onYouTubeError}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onVolume={onVolume}
          onSource={onSource}
        />
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