import { useState } from "react";
import {
    Pause,
    Play,
    Volume2,
    VolumeX,
} from "lucide-react";
import type { PlayerState } from "../types/Cinema";

interface ScreenControlsProps {
    state: PlayerState;
    error: string;
    isOwner: boolean;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onVolume: (volume: number) => void;
    onSource: (url: string) => void;
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function ScreenControls({
    state,
    error,
    isOwner,
    onTogglePlay,
    onSeek,
    onVolume,
    onSource,
}: ScreenControlsProps) {
    const [sourceDraft, setSourceDraft] = useState({
        sourceUrl: state.sourceUrl,
        value: state.sourceUrl,
    });
    const sourceInput =
        sourceDraft.sourceUrl === state.sourceUrl
            ? sourceDraft.value
            : state.sourceUrl;

    return (
        <div className="screen-ui-frame">
            {error && (
                <p className="screen-player-error" role="status">
                    {error}
                </p>
            )}
            <section className="screen-control-deck" aria-label="Керування відео">
                <form
                    className="screen-source-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSource(sourceInput.trim());
                    }}
                >
                    <input
                        type="url"
                        aria-label="Посилання на відео"
                        value={sourceInput}
                        onChange={(event) =>
                            setSourceDraft({
                                sourceUrl: state.sourceUrl,
                                value: event.target.value,
                            })
                        }
                        placeholder="Посилання на YouTube або відеофайл"
                        disabled={!isOwner}
                    />
                    <button type="submit" disabled={!isOwner}>Завантажити</button>
                </form>

                <div className="screen-transport-controls">
                    <button
                        className="screen-icon-button screen-play-button"
                        type="button"
                        onClick={onTogglePlay}
                        disabled={!state.sourceUrl}
                        aria-label={isOwner ? "Відтворити або призупинити" : "Увімкнути відтворення"}
                    >
                        {isOwner && state.isPlaying ? <Pause /> : <Play />}
                    </button>
                    <span className="screen-time-label">
                        {formatTime(state.currentTime)}
                    </span>
                    <input
                        className="screen-progress-control"
                        aria-label="Позиція відео"
                        type="range"
                        min="0"
                        max={Math.max(state.duration, 1)}
                        step="0.1"
                        value={Math.min(state.currentTime, state.duration || 0)}
                        onChange={(event) => onSeek(Number(event.target.value))}
                        disabled={!isOwner || !state.sourceUrl}
                    />
                    <span className="screen-time-label screen-duration">
                        {formatTime(state.duration)}
                    </span>
                    <button
                        className="screen-icon-button"
                        type="button"
                        aria-label="Вимкнути або увімкнути звук"
                        onClick={() => onVolume(state.volume > 0 ? 0 : 0.7)}
                        disabled={!isOwner}
                    >
                        {state.volume > 0 ? <Volume2 /> : <VolumeX />}
                    </button>
                    <input
                        className="screen-volume-control"
                        aria-label="Гучність"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={state.volume}
                        onChange={(event) => onVolume(Number(event.target.value))}
                        disabled={!isOwner}
                    />
                </div>
            </section>
        </div>
    );
}
