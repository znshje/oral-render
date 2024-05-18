import {
    Flex, Progress, Heading, Button, Spinner, Checkbox,
} from "@radix-ui/themes";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {
    readFile, readTextFile, writeFile,
} from "@tauri-apps/plugin-fs";
import {useCallback, useEffect, useMemo, useState, useRef} from "react";
import {ArcballControls, Bvh, ContactShadows, OrthographicCamera, PivotControls} from "@react-three/drei";
import {Canvas, useThree, useFrame} from "@react-three/fiber";
import {set} from "@/lib/slices/baseSlice";
import {PLYLoader} from "three/examples/jsm/loaders/PLYLoader";
import {
    DoubleSide, Vector3, Layers, ACESFilmicToneMapping, Matrix4, Quaternion
} from "three";
import {
    isPermissionGranted, requestPermission, sendNotification,
} from "@tauri-apps/plugin-notification";
import * as THREE from 'three';
import {computeBoundsTree, disposeBoundsTree, acceleratedRaycast} from 'three-mesh-bvh';
import {useNavigate} from "react-router-dom";

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

const Model = ({modelPath, setLoading, flatShading = false}) => {
    const [model, setModel] = useState(null);
    const boxVec = useRef(new Vector3())
    const [ctrl, setCtrl] = useState(false)
    const ref = useRef()
    const [matrix, setMatrix] = useState(new Matrix4())

    const loadModel = useCallback(async () => {
        setModel((prev) => {
            if (prev !== null) {
                prev.dispose();
            }
            return null;
        });
        if (!modelPath) return;

        setLoading(0);
        const data = await readFile(modelPath.path);

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

    useEffect(() => {
        loadModel();
    }, [loadModel]);

    useFrame(({scene, gl, camera}) => {
        if (objectId !== null) {
            scene.traverse((child) => {
                if (child.isMesh && child.geometry.uuid === objectId) {
                    gl.render(scene, camera);
                    objectId = null;
                    onLoad();
                }
            });
        }
    });

    useEffect(() => {
        if (ref.current) {
            ref.current.material.flatShading = flatShading
            ref.current.material.needsUpdate = true
        }
    }, [flatShading]);

    return (model && (<>
        <PivotControls
            disableScaling
            visible={ctrl}
            autoTransform={false}
            matrix={matrix}
            onDrag={(l) => {
                setMatrix(l)
            }}
        >
            <group {...transforms}>
                <mesh ref={ref} geometry={model} castShadow onClick={e => {
                    if (e.intersections[0].object.uuid !== ref.current.uuid) {
                        return;
                    }
                    setCtrl(prev => !prev)
                }}>
                    <meshPhongMaterial
                        color="#e1e1e1"
                        specular="#1c1c1c"
                        vertexColors={false}
                        flatShading={flatShading}
                        side={DoubleSide}

                        {...materialConfig}
                    />
                </mesh>
            </group>
        </PivotControls>
        <ContactShadows blur={0.8} opacity={0.4} far={10} position={[0, boxVec.current.y, 0]} color="#000000"/>
    </>));
};

const Scene = ({children}) => {
    const lightRef = useRef()

    useFrame(({camera}) => {
        if (lightRef.current) {
            lightRef.current.position.copy(camera.position)
        }
    })

    return (<>
        <hemisphereLight intensity={0.1} groundColor="white"/>
        <spotLight
            color="white"
            decay={0.14}
            intensity={3.2}
            position={[4, 5, 8]}
        />
        <group>
            {children}
        </group>
        <BasicComponents/>
    </>);
};

const BasicComponents = () => {
    const {invalidate, controls} = useThree();

    useEffect(() => {
        if (controls) {
            controls.mouseActions = [];
            controls.setMouseAction("ZOOM", "WHEEL");
            controls.setMouseAction("PAN", 1);
            controls.setMouseAction("ROTATE", 2);
            controls.setMouseAction("PAN", 0, "CTRL");
            controls.setMouseAction("ZOOM", 2, "CTRL");
        }
    }, [controls]);

    return (<>
        <OrthographicCamera
            fov={0}
            position={[0, 0, 1]}
            left={-1.6}
            right={1.6}
            top={1}
            bottom={-1}
            up={[0, 1, 0]}
            zoom={1}
            near={0}
            far={10000}
            makeDefault
        />
        <ArcballControls
            makeDefault
            onChange={() => {
                invalidate();
            }}
        />
    </>);
};

export default function Render() {
    const dispatch = useAppDispatch();
    const fileList = useAppSelector((state) => state.base.fileList);
    const index = useAppSelector((state) => state.base.index);
    const finishedAt = useAppSelector((state) => state.base.finishedAt);
    const savePath = useAppSelector((state) => state.base.savePath);
    const imageSize = useAppSelector((state) => state.base.imageSize);
    const notification = useAppSelector((state) => state.base.notification);
    const [paused, setPaused] = useState(true);
    const [flatShading, setFlatShading] = useState(true);
    const [loading, setLoading] = useState(null);
    const router = useNavigate();
    const canvasRef = useRef();

    const fileDisplayName = useMemo(() => {
        if (index < 0) return "";
        return fileList[index]?.name;
    }, [fileList, index]);

    const notify = useCallback(async (args) => {
        if (notification) {
            let permissionGranted = await isPermissionGranted();
            if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === "granted";
            }
            if (permissionGranted) {
                sendNotification(args);
            }
        }
    }, [notification]);

    const capture = useCallback(() => {
        canvasRef.current.toBlob(
            async (blob) => {
                const data = await blob.arrayBuffer();
                const outputFileName =
                    (savePath + "/").replace(/\/\/$/, "/") +
                    fileList[index].name +
                    ".png";
                await writeFile(outputFileName, new Uint8Array(data));
                dispatch(
                    set((state) => {
                        state.finishedAt = state.index;
                    })
                );

                notify({
                    title: `口扫模型照片渲染 (${index + 1}/${fileList.length})`,
                    body: "照片已保存至 " + outputFileName,
                });

            },
            "png",
            100
        );
    }, [dispatch, fileList, index, notify, savePath]);

    const modelInst = useMemo(() => {
        if (fileList && index > -1) {
            return <Model
                modelPath={fileList[index]}
                setLoading={setLoading}
                onLoad={() => capture()}
                flatShading={flatShading}
            />
        }
        return undefined
    }, [capture, fileList, flatShading, index])

    useEffect(() => {
        if (index > -1 && paused) return;
        if (fileList.length > 0 && index < fileList.length - 1) {
            if (finishedAt === index) {
                dispatch(set((state) => {
                    state.index = index + 1;
                }));
            }
        }
    }, [dispatch, fileList.length, finishedAt, index, paused, notify]);

    useEffect(() => {
        if (finishedAt === index && fileList.length > 0 && index === fileList.length - 1) {
            notify({
                title: "口扫模型照片渲染", body: "已完成全部模型渲染",
            });
        }
    }, [fileList.length, finishedAt, index, notify])

    return (<div
        style={{
            width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
        }}
    >
        <Flex
            style={{
                width: "100%", height: 48, background: "#cccccc",
            }}
            direction="column"
        >
            <div
                style={{
                    flex: 1, alignItems: "center", display: "flex", padding: "0px 16px", gap: 8,
                }}
            >
                <Heading weight="regular">
                    {index + 1}/{fileList.length}
                </Heading>
                <Heading
                    weight="light"
                    style={{
                        flex: 1, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden",
                    }}
                >
                    {fileDisplayName}
                </Heading>
                <Button
                    onClick={() => setPaused((v) => !v)}
                    disabled={loading !== null}
                >
                    {paused ? "继续" : "暂停"}
                </Button>
                <Button
                    onClick={() => {
                        dispatch(set((state) => {
                            state.index = state.index - 1;
                        }));
                    }}
                    disabled={index <= 0 || loading !== null}
                >
                    上一个
                </Button>
                <Button
                    onClick={() => {
                        dispatch(set((state) => {
                            state.index = state.index + 1;
                        }));
                    }}
                    disabled={index >= fileList.length - 1 || loading !== null}
                >
                    下一个
                </Button>
                <Button onClick={capture} disabled={loading !== null}>
                    截图
                </Button>
                <Checkbox
                    checked={notification}
                    onCheckedChange={(v) => dispatch(set((state) => {
                        state.notification = v;
                    }))}
                />
                <span>打开通知</span>
                <Button onClick={() => router("/", {replace: true})}>返回</Button>
            </div>
            <div>
                <Progress
                    value={fileList.length === 0 ? 0 : (100 * (index + 1)) / fileList.length}
                    radius="none"
                />
            </div>
        </Flex>
        <div
            style={{
                flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            {loading !== null && (<Spinner
                size="3"
                style={{
                    position: "absolute", zIndex: 10, left: "50%", top: "50%", transform: "translate(-50%, -50%)",
                }}
            />)}
            <div style={{
                height: 32,
                padding: 8,
                display: 'flex'
            }}>
                <span>
                <Checkbox
                    checked={flatShading}
                    onCheckedChange={(v) => setFlatShading(v)}
                />
                <span>FlatShading</span>
                </span>
            </div>
            <div
                style={{
                    width: imageSize[0], height: imageSize[1], margin: "auto",
                }}
            >
                <Canvas
                    shadows
                    ref={canvasRef}
                    gl={{
                        toneMapping: ACESFilmicToneMapping,
                        alpha: true, preserveDrawingBuffer: true,
                    }}
                    style={{
                        border: "1px solid gray", boxShadow: "0 0 5px 10px #cccccc",
                    }}
                >
                    <color attach="background" args={["#ffffff"]}/>
                    <Bvh firstHitOnly>
                        <Scene>
                            {modelInst}
                        </Scene>
                    </Bvh>
                </Canvas>
            </div>
        </div>
    </div>);
}