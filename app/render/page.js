"use client";

import {
    Flex, Progress, Heading, Button, Spinner, Checkbox,
} from "@radix-ui/themes";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {
    BaseDirectory,
    readFile, writeFile, writeTextFile,
} from "@tauri-apps/plugin-fs";
import {useCallback, useEffect, useMemo, useState, useRef} from "react";
import {ArcballControls, Bvh, OrthographicCamera} from "@react-three/drei";
import {Canvas, useThree, useFrame} from "@react-three/fiber";
import {set} from "@/lib/slices/baseSlice";
import {PLYLoader} from "three/examples/jsm/loaders/PLYLoader";
import {
    DoubleSide,
    Vector3,
    NeutralToneMapping,
    LinearSRGBColorSpace,
    MeshPhysicalMaterial,
    Color,
    Object3D,
    Mesh,
    MeshBasicMaterial, NoToneMapping, Box3, BufferGeometry
} from "three";
import {useRouter} from "next/navigation";
import {
    isPermissionGranted, requestPermission, sendNotification,
} from "@tauri-apps/plugin-notification";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

let objectId = null;
const materialConfig = {
    roughness: 0.2, // metalness: 0.32,
    reflectivity: 0.3, // clearcoat: 0.3,
    // clearcoatRoughness: 0.2,
};

const materialForMaskConfig = {
    color: '#000000'
}

const gumMaterialConfig = {
    roughness: 0.1, // metalness: 0.32,
    reflectivity: 0.2, // clearcoat: 0.3,
    // clearcoatRoughness: 0.2,
};

const Model = ({maskMode, modelPath, setLoading, onLoad}) => {
    const [model, setModel] = useState(null);

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
        geometry.computeVertexNormals();
        geometry.center();
        setModel(geometry);
        setTimeout(() => {
            objectId = geometry.uuid;
        }, 500)
        setLoading(null);
    }, [modelPath, setLoading]);

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

    return (
        model && (
            <mesh geometry={model}>
                <meshPhysicalMaterial
                    vertexColors={!maskMode}
                    side={DoubleSide}
                    {...(maskMode ? materialForMaskConfig : materialConfig)}
                />
            </mesh>
        )
    );
};

const materialMemory = {}

const PartsModel = ({maskMode, modelPath, setLoading, onLoad}) => {
    const [gumModel, setGumModel] = useState(null);
    const [teethModel, setTeethModel] = useState(null);

    const physicalMaterial = useMemo(() => new MeshPhysicalMaterial({
        vertexColors: true,
        side: DoubleSide,
        ...materialConfig
    }), [])

    const teethMeshes = useMemo(() => {
        if (!teethModel) return undefined
        const mesh = new Object3D()

        teethModel.forEach(g => {
            const tid = parseInt(g.name.split('_')[1])
            const color = new Color(`#${tid}${tid}${tid}`).convertLinearToSRGB()//.convertLinearToSRGB()

            const mat = !maskMode ? physicalMaterial : Object.keys(materialMemory).indexOf(tid.toString()) > -1 ? materialMemory[tid.toString()] : (() => {
                const m = new MeshBasicMaterial({
                    vertexColors: false,
                    color: color
                })
                materialMemory[tid.toString()] = m
                return m
            })()
            const tmesh = new Mesh(g, mat)
            mesh.add(tmesh)
        })
        return mesh
    }, [maskMode, physicalMaterial, teethModel])

    const loadModel = useCallback(async () => {
        setGumModel((prev) => {
            if (prev !== null) {
                prev.dispose();
            }
            return null;
        });
        setTeethModel((prev) => {
            if (prev !== null) {
                prev.forEach(g => g.dispose())
            }
            return null;
        });
        if (!modelPath) return;

        setLoading(0);
        const data = await readFile(modelPath.path);

        const loader = new GLTFLoader();
        const gltf = await loader.parseAsync(data.buffer, '.')

        let box = new Box3()
        let gumGeometry, teethGeometry = []
        gltf.scene.traverse(child => {
            if (child.name === 'gum') {
                child.geometry.computeVertexNormals()
                gumGeometry = child.geometry
                box.expandByObject(child)
            } else if (child.name.startsWith('tooth_')) {
                child.geometry.computeVertexNormals()
                child.geometry.name = child.name
                teethGeometry.push(child.geometry)
                box.expandByObject(child)
            }
        })

        const boxCenter = new Vector3()
        box.getCenter(boxCenter)

        gumGeometry.translate(-boxCenter.x, -boxCenter.y, -boxCenter.z)
        teethGeometry.forEach(g => g.translate(-boxCenter.x, -boxCenter.y, -boxCenter.z))

        setGumModel(gumGeometry);
        setTeethModel(teethGeometry);
        setTimeout(() => {
            const _oid = {}
            teethGeometry.forEach(g => _oid[g.uuid] = true)
            objectId = {
                [gumGeometry.uuid]: true,
                ..._oid
            };
        }, 500)
        setLoading(null);
    }, [modelPath, setLoading]);

    useEffect(() => {
        loadModel();
    }, [loadModel]);

    useFrame(({scene, gl, camera}) => {
        if (objectId !== null) {
            scene.traverse((child) => {
                if (child.isMesh && objectId && Object.keys(objectId).includes(child.geometry.uuid)) {
                    gl.render(scene, camera);
                    objectId = null;
                    onLoad();
                }
            });
        }
    });

    return (<>
            {gumModel && (
                <mesh geometry={gumModel} visible={!maskMode}>
                    <meshPhysicalMaterial
                        vertexColors={!maskMode}
                        side={DoubleSide}
                        {...gumMaterialConfig}
                    />
                </mesh>
            )}
            {teethModel && (
                // <mesh geometry={teethModel}>
                //     <meshPhysicalMaterial
                //         vertexColors={!maskMode}
                //         side={DoubleSide}
                //         {...(maskMode ? {color: new Color()} : materialConfig)}
                //     />
                // </mesh>
                <primitive object={teethMeshes}/>
            )}
        </>
    );
};

const Scene = ({children, maskMode, onPoseChange}) => {
    const {gl} = useThree()

    useEffect(() => {
        if (maskMode) {
            gl.outputColorSpace = LinearSRGBColorSpace
            gl.toneMapping = NoToneMapping
        } else {
            gl.outputColorSpace = LinearSRGBColorSpace
            gl.toneMapping = NeutralToneMapping
        }
    }, [gl, maskMode])

    return (
        <>
            {children}
            <BasicComponents maskMode={maskMode} onPoseChange={onPoseChange}/>
        </>
    );
};

const BasicComponents = ({maskMode, onPoseChange}) => {
    const {invalidate, controls} = useThree();
    const lightRef = useRef()
    const cameraRef = useRef()
    const colorWhite = useMemo(() => new Color("#ffffff").convertLinearToSRGB(), [])

    useFrame(({camera}) => {
        if (lightRef.current) {
            lightRef.current.position.copy(camera.position)
        }
    })

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

    useEffect(() => {
        if (cameraRef.current) {
            onPoseChange && onPoseChange([
                ...cameraRef.current.rotation.toArray().map(x => x * 180 / Math.PI).filter((_, i) => i < 3),
                ...cameraRef.current.position.toArray()
            ]);
        }
    }, [onPoseChange]);

    return (
        <>
            {
                maskMode === true ? <>
                    <ambientLight intensity={1 * Math.PI / 2} color={"#000000"}/>
                </> : (
                    <>
                        <ambientLight intensity={1 * Math.PI / 2} color={colorWhite}/>
                        <directionalLight
                            ref={lightRef}
                            color={colorWhite}
                            intensity={3.14 / 2.5}
                            position={new Vector3(0, -150, 0)}
                        />
                        <directionalLight
                            color={colorWhite}
                            intensity={4.7 / 2.5}
                            position={new Vector3(-200, 0, 0)}
                        />
                        <directionalLight
                            color={colorWhite}
                            intensity={4.7 / 2.5}
                            position={new Vector3(200, 0, 0)}
                        />
                        <directionalLight
                            color={colorWhite}
                            intensity={2.3 / 2.5}
                            position={new Vector3(0, 0, 200)}
                        />
                    </>
                )
            }
            <OrthographicCamera
                ref={cameraRef}
                fov={0}
                position={[0, 0, 150]}
                zoom={13}
                near={0}
                far={10000}
                makeDefault
            />
            <ArcballControls
                makeDefault
                onChange={() => {
                    invalidate();
                    onPoseChange && onPoseChange([
                        ...cameraRef.current.rotation.toArray().map(x => x * 180 / Math.PI).filter((_, i) => i < 3),
                        ...cameraRef.current.position.toArray()
                    ]);
                }}
            />
        </>
    );
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
    const [loading, setLoading] = useState(null);
    const [isMask, setIsMask] = useState(false);
    const [captureState, setCaptureState] = useState({
        mask: false,
        normal: false,
        start: false
    })
    const [cameraPose, setCameraPose] = useState([0, 0, 0, 0, 0, 150])
    const router = useRouter();
    const canvasRef = useRef();
    const captureLock = useRef(false)

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

    const capture = useCallback(async (isMask) => {
        if (!captureState.start) return;
        return new Promise((resolve, reject) => {
            console.log('capturing in maskMode = ', isMask)

            try {
                canvasRef.current.toBlob(
                    async (blob) => {
                        const data = await blob.arrayBuffer();
                        const outputFileName =
                            (savePath + "/").replace(/\/\/$/, "/") +
                            fileList[index].name.replace('.glb', '') + (isMask ? '_mask' : '') + ".png";
                        const outputCamFileName =
                            (savePath + "/").replace(/\/\/$/, "/") +
                            fileList[index].name.replace('.glb', '') + "_post.txt";
                        try {
                            // await writeTextFile('file.txt', "Hello world", { baseDir: BaseDirectory.Home });
                            await writeTextFile(outputCamFileName, cameraPose.join(' '))
                            await writeFile(outputFileName, new Uint8Array(data));
                        } catch (e) {
                            reject(e)
                        }

                        resolve()
                    },
                    "png",
                    100
                );
            } catch (e) {
                reject(e)
            }
        })
    }, [captureState.start, fileList, index, savePath, cameraPose]);

    const wait = useCallback(async () => {
        return new Promise(resolve => setTimeout(resolve, 500));
    }, [])

    useEffect(() => {
        if (captureState.start && !captureLock.current) {
            captureLock.current = true;
            new Promise(async (resolve, reject) => {
                try {
                    setIsMask(false);
                    await wait()
                    await capture(false)

                    setIsMask(true);
                    await wait()
                    await capture(true)

                    setIsMask(false);
                    resolve()
                } catch (e) {
                    reject(e)
                }
            }).catch(e => {
                console.log('catch error', e)
                captureLock.current = false;
                setCaptureState({
                    start: false,
                    mask: false,
                    normal: false
                })
            }).then(() => {
                dispatch(
                    set((state) => {
                        state.finishedAt = state.index;
                    })
                );
                notify({
                    title: `口扫模型照片渲染 (${index + 1}/${fileList.length})`,
                    body: "照片已保存",
                });
            }).finally(() => {
                captureLock.current = false;
                setCaptureState({
                    start: false,
                    mask: false,
                    normal: false
                })
            });
        }
    }, [capture, captureState.start, dispatch, fileList.length, index, notify, wait])

    useEffect(() => {
        if (index > -1 && paused) return;
        if (fileList.length > 0 && index < fileList.length - 1) {
            if (finishedAt === index) {
                dispatch(
                    set((state) => {
                        state.index = index + 1;
                    })
                );
            }
        }
    }, [dispatch, fileList.length, finishedAt, index, paused, notify]);

    useEffect(() => {
        if (finishedAt === index && fileList.length > 0 && index === fileList.length - 1) {
            notify({
                title: "口扫模型照片渲染",
                body: "已完成全部模型渲染",
            });
        }
    }, [fileList.length, finishedAt, index, notify])

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Flex
                style={{
                    width: "100%",
                    height: 48,
                    background: "#cccccc",
                }}
                direction="column"
            >
                <div
                    style={{
                        flex: 1,
                        alignItems: "center",
                        display: "flex",
                        padding: "0px 16px",
                        gap: 8,
                    }}
                >
                    <Heading weight="regular">
                        {index + 1}/{fileList.length}
                    </Heading>
                    <Heading
                        weight="light"
                        style={{
                            flex: 1,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
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
                            dispatch(
                                set((state) => {
                                    state.index = state.index - 1;
                                })
                            );
                        }}
                        disabled={index <= 0 || loading !== null}
                    >
                        上一个
                    </Button>
                    <Button
                        onClick={() => {
                            dispatch(
                                set((state) => {
                                    state.index = state.index + 1;
                                })
                            );
                        }}
                        disabled={index >= fileList.length - 1 || loading !== null}
                    >
                        下一个
                    </Button>
                    <Button onClick={() => {
                        setCaptureState({
                            start: true,
                            mask: false,
                            normal: false
                        })
                    }} disabled={loading !== null}>
                        截图
                    </Button>
                    <Checkbox
                        checked={notification}
                        onCheckedChange={(v) =>
                            dispatch(
                                set((state) => {
                                    state.notification = v;
                                })
                            )
                        }
                    />
                    <span>打开通知</span>

                    <Checkbox
                        checked={isMask}
                        onCheckedChange={(v) =>
                            setIsMask(v => !v)
                        }
                    />
                    <span>Mask Mode</span>
                    <Button onClick={() => router.replace("/")}>返回</Button>
                </div>
                <div>
                    <Progress
                        value={
                            fileList.length === 0 ? 0 : (100 * (index + 1)) / fileList.length
                        }
                        radius="none"
                    />
                </div>
            </Flex>
            <div
                style={{
                    flex: 1,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {loading !== null && (
                    <Spinner
                        size="3"
                        style={{
                            position: "absolute",
                            zIndex: 10,
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                    />
                )}
                <div
                    style={{
                        width: imageSize[0],
                        height: imageSize[1],
                        margin: "auto",
                    }}
                >
                    <Canvas
                        ref={canvasRef}
                        gl={{
                            toneMapping: NeutralToneMapping,
                            alpha: false,
                            preserveDrawingBuffer: true,
                            outputColorSpace: LinearSRGBColorSpace,
                            antialias: false
                        }}
                        style={{
                            border: "1px solid gray",
                            boxShadow: "0 0 5px 10px #cccccc",
                        }}
                    >
                        <color attach="background" args={["#ffffff"]}/>
                        <Bvh firstHitOnly>
                            <Scene maskMode={isMask} onPoseChange={setCameraPose}>
                                {index > -1 && (
                                    <PartsModel
                                        maskMode={isMask}
                                        modelPath={fileList[index]}
                                        setLoading={setLoading}
                                        onLoad={() => {
                                            setCaptureState({
                                                start: true,
                                                mask: false,
                                                normal: false
                                            })
                                        }}
                                    />
                                )}
                            </Scene>
                        </Bvh>
                    </Canvas>
                </div>
            </div>
        </div>
    );
}
