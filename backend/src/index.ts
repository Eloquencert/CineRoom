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
    roomName: string;
    ownerId: string | null;
    users: CinemaUser[];
    seats: Seat[];
    player: PlayerState;
}

interface ClientToServerEvents {
    "join-room": (roomId: string, user: CinemaUser, roomName?: string) => void;
    "leave-room": (roomId: string) => void;
    "update-room-settings": (roomId: string, settings: { roomName: string }) => void;
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
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://127.0.0.1:5173"];
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: allowedOrigins },
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
                    y: (row - 1) * 0.18,
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
            roomName: "Кінозал",
            ownerId: null,
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
        roomName: room.roomName,
        ownerId: room.ownerId,
        users: room.users.map((user) => ({ ...user })),
        seats: room.seats.map((seat) => ({ ...seat })),
        player: { ...room.player },
    };
}

function leaveRoom(socketId: string, roomId: string) {
    const room = rooms.get(roomId);
    const membership = socketUsers.get(socketId);
    if (!room || !membership || membership.roomId !== roomId) return;
    socketUsers.delete(socketId);
    const userStillConnected = [...socketUsers.values()].some(
        (item) =>
            item.roomId === roomId && item.userId === membership.userId,
    );
    if (!userStillConnected) {
        const user = room.users.find((item) => item.id === membership.userId);
        if (user?.seatId) {
            const seat = room.seats.find((item) => item.id === user.seatId);
            if (seat) {
                seat.status = "available";
                delete seat.occupantId;
            }
        }
        room.users = room.users.filter((item) => item.id !== membership.userId);
        io.to(roomId).emit("participant-left", membership.userId);
        if (room.ownerId === membership.userId) {
            room.ownerId = room.users[0]?.id ?? null;
            io.to(roomId).emit("room-state", snapshot(room));
        }
    }
    if (room.users.length === 0) rooms.delete(roomId);
}

app.use(cors({ origin: allowedOrigins }));
app.get("/health", (_request, response) => response.json({ ok: true }));

io.on("connection", (socket) => {
    socket.on("join-room", async (roomId, incomingUser, requestedRoomName) => {
        if (
            typeof roomId !== "string" ||
            roomId.length < 1 ||
            roomId.length > 64 ||
            typeof incomingUser?.id !== "string" ||
            !incomingUser.id ||
            incomingUser.id.length > 128 ||
            typeof incomingUser.name !== "string" ||
            !incomingUser.name.trim() ||
            incomingUser.name.length > 64
        )
            return;
        const previous = socketUsers.get(socket.id);
        if (previous) {
            leaveRoom(socket.id, previous.roomId);
            await socket.leave(previous.roomId);
        }

        const room = getRoom(roomId);
        if (!room.ownerId) {
            room.ownerId = incomingUser.id;
            if (typeof requestedRoomName === "string" && requestedRoomName.trim()) {
                room.roomName = requestedRoomName.trim().slice(0, 48);
            }
        }
        const existingUser = room.users.find((item) => item.id === incomingUser.id);
        const user: CinemaUser = {
            ...incomingUser,
            name: incomingUser.name.trim(),
            seatId: existingUser?.seatId ?? null,
        };
        room.users = [...room.users.filter((item) => item.id !== user.id), user];
        socketUsers.set(socket.id, { roomId, userId: user.id });
        await socket.join(roomId);
        socket.emit("room-state", snapshot(room));
        socket.to(roomId).emit("participant-updated", user);
    });

    socket.on("update-room-settings", (roomId, settings) => {
        const membership = socketUsers.get(socket.id);
        const room = rooms.get(roomId);
        if (
            !room ||
            membership?.roomId !== roomId ||
            membership.userId !== room.ownerId ||
            typeof settings?.roomName !== "string" ||
            !settings.roomName.trim()
        )
            return;
        room.roomName = settings.roomName.trim().slice(0, 48);
        io.to(roomId).emit("room-state", snapshot(room));
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
        if (
            !room ||
            membership?.roomId !== roomId ||
            membership.userId !== room.ownerId ||
            !player
        )
            return;
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
            emoji.trim().length < 1 ||
            emoji.length > 12
        )
            return;
        io.to(roomId).emit("reaction", membership.userId, emoji);
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