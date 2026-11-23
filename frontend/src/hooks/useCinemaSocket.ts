import { useCallback, useEffect, useRef, useState } from "react";
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

export function useCinemaSocket(
    roomId: string | null,
    user: CinemaUser,
    initialRoomName: string,
) {
    const socketRef = useRef<CinemaSocket | null>(null);
    const [roomState, setRoomState] = useState<RoomState>({
        roomId: roomId ?? "",
        roomName: "Кінозал",
        ownerId: null,
        users: [],
        seats: [],
        player: emptyPlayer,
    });
    const [isConnected, setIsConnected] = useState(false);
    const [lastReaction, setLastReaction] = useState<{
        id: number;
        userId: string;
        emoji: string;
    } | null>(null);
    const reactionSequence = useRef(0);

    useEffect(() => {
        if (!roomId) return;
        const client: CinemaSocket = io(
            import.meta.env.VITE_SOCKET_URL || "http://localhost:3001",
            { autoConnect: false },
        );
        socketRef.current = client;

        const join = () => client.emit("join-room", roomId, user, initialRoomName);
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
            setLastReaction({ id: ++reactionSequence.current, userId, emoji }),
        );
        client.connect();

        return () => {
            client.emit("leave-room", roomId);
            client.removeAllListeners();
            client.disconnect();
            socketRef.current = null;
        };
    }, [roomId, user, initialRoomName]);

    const selectSeat = useCallback(
        (seatId: string) => {
            if (roomId) socketRef.current?.emit("select-seat", roomId, seatId);
        },
        [roomId],
    );
    const releaseSeat = useCallback(
        (seatId: string) => {
            if (roomId) socketRef.current?.emit("release-seat", roomId, seatId);
        },
        [roomId],
    );
    const sendPlayerState = useCallback(
        (player: PlayerState) => {
            if (roomId) socketRef.current?.emit("player-state", roomId, player);
        },
        [roomId],
    );
    const sendReaction = useCallback(
        (emoji: string) => {
            if (roomId) socketRef.current?.emit("reaction", roomId, emoji);
        },
        [roomId],
    );
    const updateRoomName = useCallback(
        (roomName: string) => {
            if (roomId) {
                socketRef.current?.emit("update-room-settings", roomId, { roomName });
            }
        },
        [roomId],
    );

    return {
        roomState,
        isConnected,
        lastReaction,
        selectSeat,
        releaseSeat,
        sendPlayerState,
        sendReaction,
        updateRoomName,
        isOwner: roomState.ownerId === user.id,
    };
}