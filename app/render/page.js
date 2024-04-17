"use client";

import {
  Flex,
  Progress,
  Heading,
  Button,
  Spinner,
  Checkbox,
} from "@radix-ui/themes";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  readBinaryFile,
  writeBinaryFile,
} from "@tauri-apps/api/fs";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ArcballControls, Bvh, OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { set } from "@/lib/slices/baseSlice";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import {
  DoubleSide,
  Vector3,
  Layers,
  NeutralToneMapping
} from "three";
import { useRouter } from "next/navigation";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/api/notification";

let objectId = null;
const materialConfig = {
  roughness: 0.34,
  metalness: 0.32,
  reflectivity: 0.1,
  clearcoat: 0.3,
  clearcoatRoughness: 0.2,
};

const Model = ({ modelPath, setLoading, onLoad }) => {
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
    const data = await readBinaryFile(modelPath.path);

    const loader = new PLYLoader();
    const geometry = loader.parse(data.buffer);
    geometry.computeVertexNormals();
    geometry.center();
    setModel(geometry);
    objectId = geometry.uuid;
    setLoading(null);
  }, [modelPath, setLoading]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  useFrame(({ scene, gl, camera }) => {
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
          vertexColors={true}
          side={DoubleSide}
          {...materialConfig}
        />
      </mesh>
    )
  );
};

const Scene = ({ children }) => {
  return (
    <>
      {children}
      <BasicComponents />
    </>
  );
};

const BasicComponents = () => {
  const { camera, invalidate, controls } = useThree();

  const cameraLayers = useMemo(() => {
    const layers = new Layers();
    layers.enable(0);
    layers.enable(1);
    return layers;
  }, []);

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

  return (
    <>
      <ambientLight intensity={1 * Math.PI} color="#ffffff" />
      <directionalLight
        color="#ffffff"
        intensity={3.14}
        position={new Vector3(0, -150, 0)}
      />
      <directionalLight
        color="#ffffff"
        intensity={4.7}
        position={new Vector3(-200, 0, 0)}
      />
      <directionalLight
        color="#ffffff"
        intensity={4.7}
        position={new Vector3(200, 0, 0)}
      />
      <directionalLight
        color="#ffffff"
        intensity={2.3}
        position={new Vector3(0, 0, 200)}
      />
      <OrthographicCamera
        fov={0}
        position={[0, -150, 0]}
        zoom={15}
        near={0}
        far={10000}
        makeDefault
        layers={cameraLayers}
      />
      <ArcballControls
        makeDefault
        onChange={() => {
          invalidate();
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
  const router = useRouter();
  const canvasRef = useRef();

  const fileDisplayName = useMemo(() => {
    if (index < 0) return "";
    return fileList[index]?.name;
  }, [fileList, index]);

  const notify = useCallback(
    async (args) => {
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
    },
    [notification]
  );

  const capture = useCallback(() => {
    canvasRef.current.toBlob(
      async (blob) => {
        const data = await blob.arrayBuffer();
        const outputFileName =
          (savePath + "/").replace(/\/\/$/, "/") +
          fileList[index].name +
          ".png";
        await writeBinaryFile(outputFileName, new Uint8Array(data));
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
    console.log(index, finishedAt, fileList.length - 1);
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
          <Button onClick={capture} disabled={loading !== null}>
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
            }}
            style={{
              border: "1px solid gray",
              boxShadow: "0 0 5px 10px #cccccc",
            }}
          >
            <color attach="background" args={["#ffffff"]} />
            <Bvh firstHitOnly>
              <Scene>
                {index > -1 && (
                  <Model
                    modelPath={fileList[index]}
                    setLoading={setLoading}
                    onLoad={() => capture()}
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
