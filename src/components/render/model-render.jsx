import { useAppDispatch, useAppSelector } from "@/lib/hooks";
// import {readFile,} from "@tauri-apps/plugin-fs";
import CameraRotation from "@/components/render/camera-rotation.jsx";
import { set } from "@/lib/slices/baseSlice";
import { ContactShadows, PivotControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DoubleSide, Matrix4, Quaternion, Vector3 } from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

let objectId = null;
const materialConfig = {
    roughness: 1.0, // metalness: 0.32,
    reflectivity: 1.0, // clearcoat: 0.3,
    // clearcoatRoughness: 0.2,
};

const readBindaryFile = async (pathObj) => {
    if (window.__TAURI__ && !(pathObj instanceof File)) {
        // import {readFile} from "@tauri-apps/plugin-fs";
        const {readFile} = await import('@tauri-apps/plugin-fs')
        // const {readFile} = window.require('@ta')
        return await readFile(pathObj)
    } else {
        return await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.addEventListener('load', e => {
                console.log('loaded', e, reader.result)
                resolve({
                    buffer: reader.result
                })
            })
            reader.readAsArrayBuffer(pathObj)
        })
    }
}

const Model = ({modelPath, setLoading}) => {
    const [model, setModel] = useState(null);
    const boxVec = useRef(new Vector3())
    const ref = useRef()
    const rotateRef = useRef()
    const [matrix, _setMatrix] = useState(new Matrix4())
    const cachedModelPath = useRef()
    const dispatch = useAppDispatch()
    const renderConfig = useAppSelector((state) => state.base.render);
    const {scene, invalidate} = useThree()

    const loadModel = useCallback(async () => {
        setModel((prev) => {
            if (prev !== null) {
                prev.dispose();
            }
            return null;
        });
        if (!modelPath) return;

        setLoading(0);
        const data = await readBindaryFile(modelPath);

        const loader = new PLYLoader();
        const geometry = loader.parse(data.buffer);

        geometry.computeBoundingSphere()
        const scale = 1 / geometry.boundingSphere.radius

        geometry.computeVertexNormals();
        geometry.center();
        geometry.scale(scale, scale, scale)

        geometry.computeBoundingBox()
        geometry.computeBoundsTree()
        boxVec.current.copy(geometry.boundingBox.min)

        setModel(geometry);

        setTimeout(() => {
            objectId = geometry.uuid;
        }, 500)
        setLoading(null);
    }, [modelPath, setLoading]);

    const transforms = useMemo(() => {
        const position = new Vector3()
        const quaternion = new Quaternion()
        const scale = new Vector3()
        matrix.decompose(position, quaternion, scale)
        return {position, quaternion, scale}
    }, [matrix])

    const setMatrix = useCallback(m => {
        _setMatrix(m)
        if (renderConfig.syncTransform) {
            dispatch(set(state => {
                state.render.transformMatrix = m.toArray()
            }))
        }
    }, [dispatch, renderConfig.syncTransform])

    useEffect(() => {
        if (renderConfig.syncTransform && renderConfig.transformMatrix) {
            _setMatrix(new Matrix4().fromArray(renderConfig.transformMatrix))
        }
    }, [renderConfig.syncTransform, renderConfig.transformMatrix]);

    useEffect(() => {
        if (!modelPath && model) {
            if (ref.current) {
                console.log(ref.current)
                scene.remove(ref.current)
                ref.current.material.dispose()
                model.dispose()
                invalidate()
            }
        }
    }, [invalidate, model, modelPath, scene])

    useEffect(() => {
        console.log('mount model', modelPath)
        if (cachedModelPath.current !== modelPath) {
            console.log('no cache, load')
            cachedModelPath.current = modelPath
            loadModel();
        }

        return () => {
            console.log('unmount model', modelPath)
        }
    }, [loadModel, modelPath]);

    useEffect(() => {
        if (ref.current) {
            ref.current.material.flatShading = renderConfig.flatShading
            ref.current.material.transparent = renderConfig.modelOpacity < 100.0
            ref.current.material.opacity = renderConfig.modelOpacity / 100.0
            ref.current.material.needsUpdate = true
        }
    }, [renderConfig.flatShading, renderConfig.modelOpacity]);

    return (model && (<>
        <PivotControls
            disableScaling
            visible={renderConfig.enableTransform}
            disableAxes={!renderConfig.enableTransform}
            disableRotations={!renderConfig.enableTransform}
            disableSliders={!renderConfig.enableTransform}
            autoTransform={false}
            matrix={matrix}
            onDrag={(l) => {
                setMatrix(l)
            }}
        >
            <group ref={rotateRef}>
                <mesh {...transforms} ref={ref} geometry={model} castShadow>
                    <meshPhongMaterial
                        color="#e1e1e1"
                        specular="#1c1c1c"
                        vertexColors={false}
                        side={DoubleSide}

                        {...materialConfig}
                    />
                </mesh>
            </group>
        </PivotControls>
        <CameraRotation object={rotateRef}/>
        {renderConfig.contactShadow &&
            <ContactShadows blur={0.8} opacity={0.4} far={10} position={[0, boxVec.current.y, 0]} color="#000000"/>}
    </>));
};

const Scene = ({index}) => {
    const lightRef = useRef()
    const renderConfig = useAppSelector((state) => state.base.render);

    useFrame(({camera}) => {
        if (lightRef.current) {
            lightRef.current.position.copy(camera.position)
        }
    })

    useEffect(() => {
        console.log('mount scene', index)
        return () => {
            console.log('unmount scene', index)
        }
    }, [index])

    return (<group>
        <Model modelPath={renderConfig.files[index]} setLoading={() => {
        }}/>
        <hemisphereLight intensity={0.1} groundColor="white"/>
        <spotLight
            color="white"
            decay={0.14}
            intensity={3.2}
            position={[4, 5, 8]}
        />
    </group>);
};

export default Scene