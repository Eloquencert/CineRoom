import { RoundedBox } from "@react-three/drei";
import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Seat } from "../types/Cinema";

interface SeatModelProps {
    seat: Seat;
    selected: boolean;
    onSelect: (seat: Seat) => void;
}

export default function SeatModel({ seat, selected, onSelect }: SeatModelProps) {
    const [hovered, setHovered] = useState(false);
    const unavailable = seat.status === "occupied" && !selected;
    const upholstery = unavailable
        ? "#512a34"
        : selected
            ? "#d09b4e"
            : hovered
                ? "#d7434f"
                : "#942c3d";
    const trim = selected ? "#f5cf7a" : "#1d2027";

    function handleClick(event: ThreeEvent<MouseEvent>) {
        event.stopPropagation();
        if (!unavailable) onSelect(seat);
    }

    return (
        <group
            position={[seat.position.x, seat.position.y, seat.position.z]}
            onClick={handleClick}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
        >
            <mesh position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.22, 0.3, 12]} />
                <meshStandardMaterial color="#24262c" metalness={0.55} roughness={0.42} />
            </mesh>
            <mesh position={[0, -0.35, 0]} castShadow>
                <cylinderGeometry args={[0.36, 0.4, 0.08, 16]} />
                <meshStandardMaterial color="#15171c" metalness={0.62} roughness={0.34} />
            </mesh>
            <RoundedBox
                args={[1.13, 0.26, 0.96]}
                radius={0.12}
                smoothness={3}
                position={[0, 0.02, 0]}
                castShadow
            >
                <meshStandardMaterial color={upholstery} roughness={0.78} />
            </RoundedBox>
            <RoundedBox
                args={[1.13, 1.22, 0.24]}
                radius={0.14}
                smoothness={3}
                position={[0, 0.69, 0.36]}
                castShadow
            >
                <meshStandardMaterial color={upholstery} roughness={0.8} />
            </RoundedBox>
            <RoundedBox
                args={[0.12, 0.82, 0.12]}
                radius={0.045}
                smoothness={2}
                position={[0, 0.7, 0.23]}
            >
                <meshStandardMaterial
                    color={selected ? "#fff0bc" : "#d85a61"}
                    emissive={selected ? "#d7a54a" : "#701622"}
                    emissiveIntensity={selected ? 0.48 : 0.18}
                />
            </RoundedBox>
            {[-0.63, 0.63].map((x) => (
                <group key={x} position={[x, 0.28, 0]}>
                    <RoundedBox
                        args={[0.18, 0.46, 0.92]}
                        radius={0.08}
                        smoothness={3}
                        castShadow
                    >
                        <meshStandardMaterial color={trim} metalness={0.28} roughness={0.48} />
                    </RoundedBox>
                    <mesh position={[0, 0.24, -0.2]}>
                        <cylinderGeometry args={[0.09, 0.1, 0.035, 16]} />
                        <meshStandardMaterial
                            color="#15171b"
                            metalness={0.55}
                            roughness={0.32}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
