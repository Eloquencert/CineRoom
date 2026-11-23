import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import type { Seat } from "../types/Cinema";

interface CameraRigProps {
    selectedSeat: Seat | null;
    overview: boolean;
}

export default function CameraRig({ selectedSeat, overview}: CameraRigProps){

    const { camera, size } = useThree();
    const target = useRef(new Vector3(0, 2.5, -3));
    const destination = useMemo(() => new Vector3(), []);
    const overviewTarget = useMemo(() => new Vector3(0, 2.5, -3), []);
    const seatTarget = useMemo(() => new Vector3(), []);
    const screenCenter = useMemo(() => new Vector3(0, 5.2, -10.8), []);
    const cameraOffset = useMemo(() => new Vector3(), []);

    useFrame((_, delta) => {
        if ( overview || !selectedSeat){
            destination.set(0, 9, 17);
            target.current.lerp(overviewTarget, 1 - Math.exp(-3 * delta));

        } else {
            destination.set(
                selectedSeat.position.x,
                selectedSeat.position.y + 2.5,
                selectedSeat.position.z + 3.8,
            );
            seatTarget.set(selectedSeat.position.x, 3, -5);
            target.current.lerp(seatTarget, 1 - Math.exp(-3 * delta));
        }

        camera.position.lerp(destination, 1 - Math.exp(-3 * delta));
        const aspect = Math.max(size.width / Math.max(size.height, 1), 0.1);
        const distance = camera.position.distanceTo(screenCenter);
        const requiredDistance =
            (14.2 * 1.08) / (2 * Math.tan((48 * Math.PI) / 360) * aspect);
        if (distance < requiredDistance) {
            cameraOffset.subVectors(camera.position, screenCenter).normalize();
            camera.position.addScaledVector(
                cameraOffset,
                (requiredDistance - distance) * (1 - Math.exp(-3 * delta)),
            );
        }
        camera.lookAt(target.current);
    });

    return null;
}