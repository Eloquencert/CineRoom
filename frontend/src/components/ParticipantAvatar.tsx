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
