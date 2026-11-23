import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
    AmbientLight,
    DirectionalLight,
    HemisphereLight,
    MathUtils,
    MeshStandardMaterial,
    PointLight,
} from "three";

interface CinemaHallProps {
    isPlaying: boolean;
}

export default function CinemaHall({ isPlaying }: CinemaHallProps) {
    const lightLevel = useRef(1);
    const sideLightRefs = useRef<(PointLight | null)[]>([]);
    const sideMaterialRefs = useRef<(MeshStandardMaterial | null)[]>([]);
    const rowMaterialRefs = useRef<(MeshStandardMaterial | null)[]>([]);
    const ambientRef = useRef<AmbientLight>(null);
    const hemisphereRef = useRef<HemisphereLight>(null);
    const directionalRef = useRef<DirectionalLight>(null);
    const rearPointRef = useRef<PointLight>(null);
    const aislePointRef = useRef<PointLight>(null);
    const screenPointRef = useRef<PointLight>(null);
    const sideLights = useMemo(
        () =>
            [-8, -3, 2, 7].flatMap((z) => [
                { position: [-12.35, 5.3, z] as [number, number, number] },
                { position: [12.35, 5.3, z] as [number, number, number] },
            ]),
        [],
    );

    useFrame((_, delta) => {
        const level = MathUtils.damp(
            lightLevel.current,
            isPlaying ? 0 : 1,
            2.4,
            delta,
        );
        lightLevel.current = level;

        if (ambientRef.current) ambientRef.current.intensity = 0.18 + 1.17 * level;
        if (hemisphereRef.current) hemisphereRef.current.intensity = 0.12 + 0.98 * level;
        if (directionalRef.current) directionalRef.current.intensity = 0.12 + 2.68 * level;
        if (rearPointRef.current) {
            rearPointRef.current.intensity = 1 + 31 * level;
            rearPointRef.current.distance = 15 + 15 * level;
        }
        if (aislePointRef.current) {
            aislePointRef.current.intensity = 0.35 + 17.65 * level;
            aislePointRef.current.distance = 12 + 13 * level;
        }
        if (screenPointRef.current) {
            screenPointRef.current.intensity = 0.12 + 2.88 * level;
            screenPointRef.current.distance = 5 + 7 * level;
        }
        sideLightRefs.current.forEach((light) => {
            if (!light) return;
            light.intensity = 1.1 + 3.9 * level;
            light.distance = 4 + 4 * level;
        });
        sideMaterialRefs.current.forEach((material) => {
            if (material) material.emissiveIntensity = 0.25 + level;
        });
        rowMaterialRefs.current.forEach((material) => {
            if (material) material.emissiveIntensity = 0.18 + 0.37 * level;
        });
    });

    return (
        <group>
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.25, 1]}
                receiveShadow
            >
                <planeGeometry args={[26, 34]} />
                <meshStandardMaterial color="#25282e" roughness={0.88} />
            </mesh>
            {Array.from({ length: 4 }, (_, index) => {
                const row = index + 1;
                const z = -0.8 + index * 2.2;
                const level = index * 0.18;
                return (
                    <group key={row}>
                        <mesh position={[0, level - 0.08, z]} receiveShadow>
                            <boxGeometry args={[24.5, 0.16, 2.15]} />
                            <meshStandardMaterial color="#303139" roughness={0.82} />
                        </mesh>
                        <mesh position={[0, level + 0.005, z + 1.04]}>
                            <boxGeometry args={[24.3, 0.025, 0.045]} />
                            <meshStandardMaterial
                                ref={(material) => {
                                    rowMaterialRefs.current[index] = material;
                                }}
                                color="#df9a61"
                                emissive="#d46b36"
                                emissiveIntensity={0.55}
                            />
                        </mesh>
                    </group>
                );
            })}

            <mesh position={[0, 5.7, -13]}>
                <boxGeometry args={[26, 11.5, 0.55]} />
                <meshStandardMaterial color="#34343a" roughness={0.76} />
            </mesh>
            <mesh position={[-13, 5.7, 1]}>
                <boxGeometry args={[0.55, 11.5, 30]} />
                <meshStandardMaterial color="#292b31" roughness={0.78} />
            </mesh>
            <mesh position={[13, 5.7, 1]}>
                <boxGeometry args={[0.55, 11.5, 30]} />
                <meshStandardMaterial color="#292b31" roughness={0.78} />
            </mesh>
            <mesh
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 11.35, 1]}
            >
                <planeGeometry args={[26, 30]} />
                <meshStandardMaterial color="#202126" roughness={0.9} />
            </mesh>

            {[-11.8, -11.2, -10.6, -10, -9.4, -8.8].map((x) => (
                <mesh key={x} position={[x, 0.7, -12.56]}>
                    <boxGeometry args={[0.08, 1.2, 0.03]} />
                    <meshStandardMaterial color="#393c43" roughness={0.7} />
                </mesh>
            ))}

            {sideLights.map(({ position }, index) => (
                <group key={index} position={position}>
                    <mesh>
                        <boxGeometry args={[0.12, 0.8, 0.34]} />
                        <meshStandardMaterial
                            ref={(material) => {
                                sideMaterialRefs.current[index] = material;
                            }}
                            color="#f3ca91"
                            emissive="#efa75d"
                            emissiveIntensity={1.25}
                        />
                    </mesh>
                    <pointLight
                        ref={(light) => {
                            sideLightRefs.current[index] = light;
                        }}
                        color="#e9a96f"
                        intensity={5}
                        distance={8}
                        decay={2}
                    />
                </group>
            ))}

            <ambientLight ref={ambientRef} intensity={1.35} />
            <hemisphereLight
                ref={hemisphereRef}
                args={["#f2e6d8", "#352a2a", 1.1]}
                intensity={1.1}
            />
            <directionalLight
                ref={directionalRef}
                position={[0, 12, 8]}
                color="#ffe7cc"
                intensity={2.8}
            />
            <pointLight
                ref={rearPointRef}
                position={[0, 8, -9]}
                color="#fff0d9"
                intensity={32}
                distance={30}
                decay={2}
            />
            <pointLight
                ref={aislePointRef}
                position={[0, 7, 8]}
                color="#d9e3ff"
                intensity={18}
                distance={25}
                decay={2}
            />
            <pointLight
                ref={screenPointRef}
                position={[0, 5, -10.4]}
                color="#f4e1bf"
                intensity={3}
                distance={12}
                decay={2}
            />
        </group>
    );
}
