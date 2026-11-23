import { useState } from "react";
import {
    ArrowLeft,
    Crown,
    Maximize2,
    Settings2,
} from "lucide-react";
import type { Seat } from "../types/Cinema";
import InviteButton from "./InviteButton";

interface PlayerOverlayProps {
    seats: Seat[];
    selectedSeatId: string | null;
    roomName: string;
    isOwner: boolean;
    onSeat: (seatId: string) => void;
    onReleaseSeat: () => void;
    onOverview: () => void;
    onReaction: (emoji: string) => void;
    onUpdateRoomName: (name: string) => void;
    onLeave: () => void;
}

export default function PlayerOverlay(props: PlayerOverlayProps) {
    const [roomNameDraft, setRoomNameDraft] = useState({
        roomName: props.roomName,
        value: props.roomName,
    });
    const roomNameInput =
        roomNameDraft.roomName === props.roomName
            ? roomNameDraft.value
            : props.roomName;
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <main className="player-overlay">
            <header className="topbar">
                <div>
                    <button className="back-button" type="button" onClick={props.onLeave}>
                        <ArrowLeft size={16} /> На головну
                    </button>
                    <p className="eyebrow">CINEROOM <span>•</span> ПРИВАТНИЙ КІНОЗАЛ</p>
                    <h1>{props.roomName}</h1>
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
                    <button
                        className="secondary-button settings-button"
                        type="button"
                        aria-label="Налаштування кімнати"
                        onClick={() => setSettingsOpen((value) => !value)}
                    >
                        <Settings2 size={16} />
                    </button>
                </div>
            </header>

            {settingsOpen && (
                <section className="room-settings" aria-label="Налаштування кімнати">
                    <div className="settings-title">
                        <Settings2 size={17} />
                        <span>Налаштування кімнати</span>
                        {props.isOwner && <span className="owner-badge"><Crown size={13} /> Власник</span>}
                    </div>
                    {props.isOwner ? (
                        <form
                            className="room-name-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (roomNameInput.trim()) props.onUpdateRoomName(roomNameInput.trim());
                            }}
                        >
                            <input
                                className="text-field"
                                value={roomNameInput}
                                onChange={(event) =>
                                    setRoomNameDraft({
                                        roomName: props.roomName,
                                        value: event.target.value,
                                    })
                                }
                                maxLength={48}
                                aria-label="Назва кімнати"
                            />
                            <button className="small-action" type="submit">Зберегти</button>
                        </form>
                    ) : (
                        <p className="settings-note">Керувати кімнатою може лише її власник.</p>
                    )}
                </section>
            )}

            <section className="control-panel" aria-label="Місце та реакції">
                <div className="bottom-controls">
                    <label className="seat-picker">
                        Моє місце
                        <select
                            value={props.selectedSeatId ?? ""}
                            onChange={(event) => {
                                if (event.target.value) props.onSeat(event.target.value);
                                else props.onReleaseSeat();
                            }}
                        >
                            <option value="">Не вибрано</option>
                            {props.seats.map((seat) => (
                                <option
                                    key={seat.id}
                                    value={seat.id}
                                    disabled={seat.status === "occupied" && seat.id !== props.selectedSeatId}
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
            </section>
        </main>
    );
}