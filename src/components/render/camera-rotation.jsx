import {useFrame} from "@react-three/fiber";
import {Euler, Matrix4} from "three";
import {useRef} from "react";
import {useAppSelector} from "@/lib/hooks.js";

export default function CameraRotation({object}) {
    const renderConfig = useAppSelector((state) => state.base.render);
    const aps = renderConfig.spinningSpeed
    const rps = aps * Math.PI / 180

    const euler = useRef(new Euler())
    const matrix = useRef(new Matrix4())

    useFrame((state) => {
        if (renderConfig.spinning && object?.current) {
            euler.current.y = (state.clock.elapsedTime % (Math.PI * 2 / rps)) * rps
            matrix.current.makeRotationFromEuler(euler.current)
            matrix.current.decompose(object.current.position, object.current.quaternion, object.current.scale)
        }
    })

    return <></>
}