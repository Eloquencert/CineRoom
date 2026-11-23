import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import {
    MathUtils,
    MeshBasicMaterial,
    PointLight,
    SRGBColorSpace,
    VideoTexture,
} from "three";
import type { PlayerState } from "../types/Cinema";
import type { YouTubePlaybackController } from "../types/YouTube";
import { getYouTubeVideoId } from "../utils/videoSource";
import ScreenControls from "./ScreenControls";
import YouTubeScreen from "./YouTubeScreen";

interface ScreenProps {
    videoElement: HTMLVideoElement | null;
    sourceUrl: string;
    isPlaying: boolean;
    playerState: PlayerState;
    playerError: string;
    isOwner: boolean;
    onYouTubeReady: (player: YouTubePlaybackController | null) => void;
    onYouTubeStateChange: (state: number) => void;
    onYouTubeTimeUpdate: (currentTime: number, duration: number) => void;
    onYouTubeError: (message: string) => void;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onVolume: (volume: number) => void;
    onSource: (url: string) => void;
}

export default function Screen({
    videoElement,
    sourceUrl,
    isPlaying,
    playerState,
    playerError,
    isOwner,
    onYouTubeReady,
    onYouTubeStateChange,
    onYouTubeTimeUpdate,
    onYouTubeError,
    onTogglePlay,
    onSeek,
    onVolume,
    onSource,
}: ScreenProps) {
    const materialRef = useRef<MeshBasicMaterial>(null);
    const textureRef = useRef<VideoTexture | null>(null);
    const screenLightRef = useRef<PointLight>(null);
    const youtubeVideoId = getYouTubeVideoId(sourceUrl);

    useFrame((_, delta) => {
        const video = videoElement;
        const material = materialRef.current;
        const screenLight = screenLightRef.current;
        if (screenLight) {
            screenLight.intensity = MathUtils.damp(
                screenLight.intensity,
                isPlaying ? 0.4 : 12,
                2.8,
                delta,
            );
            screenLight.distance = MathUtils.damp(
                screenLight.distance,
                isPlaying ? 2 : 18,
                2.8,
                delta,
            );
        }
        if (!youtubeVideoId && sourceUrl && video && material && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            if (!textureRef.current) {
                textureRef.current = new VideoTexture(video);
                textureRef.current.colorSpace = SRGBColorSpace;
                material.map = textureRef.current;
                material.color.set("#ffffff");
                material.needsUpdate = true;
            }
        } else if ((!sourceUrl || youtubeVideoId) && material && textureRef.current) {
            material.map = null;
            material.color.set("#f0eee9");
            material.needsUpdate = true;
            textureRef.current.dispose();
            textureRef.current = null;
        }
    });

    useEffect(
        () => () => {
            textureRef.current?.dispose();
        },
        [],
    );

    return (
        <group position={[0, 5.2, -10.8]}>
            <mesh>
                <boxGeometry args={[14.6, 8.3, 0.35]} />
                <meshStandardMaterial color="#11131b" metalness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.19]}>
                <planeGeometry args={[14.2, 8]} />
                <meshBasicMaterial
                    ref={materialRef}
                    color={sourceUrl ? "#111111" : "#f0eee9"}
                    toneMapped={false}
                />
            </mesh>
            <pointLight
                ref={screenLightRef}
                position={[0, 0, 0.7]}
                color="#fff4e2"
                intensity={12}
                distance={18}
            />
            {youtubeVideoId && (
                <YouTubeScreen
                    key={youtubeVideoId}
                    videoId={youtubeVideoId}
                    sourceUrl={sourceUrl}
                    onReady={onYouTubeReady}
                    onStateChange={onYouTubeStateChange}
                    onTimeUpdate={onYouTubeTimeUpdate}
                    onError={onYouTubeError}
                />
            )}
            <Html
                transform
                distanceFactor={10}
                position={[0, 0, 0.22]}
                zIndexRange={[11, 0]}
                pointerEvents="auto"
            >
                <ScreenControls
                    state={playerState}
                    error={playerError}
                    isOwner={isOwner}
                    onTogglePlay={onTogglePlay}
                    onSeek={onSeek}
                    onVolume={onVolume}
                    onSource={onSource}
                />
            </Html>
        </group>
    );
}