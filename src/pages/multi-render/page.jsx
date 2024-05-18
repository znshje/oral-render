import ModelViewer from "@/components/model/model-viewer.jsx";
import Scene from "@/components/render/model-render.jsx";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { set } from "@/lib/slices/baseSlice.js";
import { ArcballControls, PerspectiveCamera, View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";

const BaseComponents = ({cameraConfig}) => {

    return <PerspectiveCamera
        fov={cameraConfig.orthographic ? 0 : cameraConfig.fov}
        position={[0, 0, 2]}
        makeDefault
    />
}

const ToolDivider = () => {
    return <div style={{
        width: 1,
        height: '80%',
        background: '#aaa'
    }}/>
}

export default function MultiRender() {
    const containerRef = useRef()
    const canvasRef = useRef()
    const dispatch = useAppDispatch();
    const cameraConfig = useAppSelector((state) => state.base.camera);
    const viewConfig = useAppSelector((state) => state.base.view);
    const renderConfig = useAppSelector((state) => state.base.render);

    const totalWidth = useMemo(() => viewConfig.width * viewConfig.cols, [viewConfig.width, viewConfig.cols])
    const totalHeight = useMemo(() => viewConfig.height * viewConfig.rows, [viewConfig.height, viewConfig.rows])

    const panels = useMemo(() => {
        const ret = []

        for (let r = 0; r < viewConfig.rows * viewConfig.cols; r++) {
            const ref = React.createRef()
            ret.push(<ModelViewer index={r} key={`track-${r}`} id={`track-${r}`} ref={ref}>
                <View
                    id={`view-${r}`}
                    style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        width: viewConfig.width,
                        height: viewConfig.height
                    }}
                    onContextMenu={e => {
                        console.log(e)
                        e.preventDefault()
                    }}
                >
                    <Scene index={r}/>
                </View>
            </ModelViewer>)
            // refs.push(ref)
        }
        return ret;
    }, [viewConfig.rows, viewConfig.cols, viewConfig.width, viewConfig.height])

    return <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column'
    }}>
        <div style={{
            width: '100%', // height: 64,
            display: 'flex', paddingBottom: 16, gap: 16, paddingLeft: 16, overflowX: 'scroll', whiteSpace: 'nowrap',
            alignItems: 'center'
        }}>
            <div>
                <span>宽高</span>
                <input type="number" value={viewConfig.width} onChange={e => {
                    dispatch(set(state => {
                        state.view.width = parseInt(e.target.value)
                    }))
                }} style={{width: 60}}/>
                <span>&times;</span>
                <input type="number" value={viewConfig.height} onChange={e => {
                    dispatch(set(state => {
                        state.view.height = parseInt(e.target.value)
                    }))
                }} style={{width: 60}}/>
            </div>
            <div>
                <input type="number" value={viewConfig.cols} onChange={e => {
                    dispatch(set(state => {
                        state.view.cols = parseInt(e.target.value)
                    }))
                }} style={{width: 60}}/>
                <span>列</span>
            </div>
            <div>
                <input type="number" value={viewConfig.rows} onChange={e => {
                    dispatch(set(state => {
                        state.view.rows = parseInt(e.target.value)
                    }))
                }} style={{width: 60}}/>
                <span>行</span>
            </div>
            <ToolDivider/>
            <div>
                <span>FOV</span>
                <input type="number" value={cameraConfig.fov} onChange={e => {
                    dispatch(set(state => {
                        state.camera.fov = parseInt(e.target.value)
                    }))
                }} style={{width: 60}} disabled={cameraConfig.orthographic}/>
            </div>
            <div>
                <input id="checkbox-camera-orthographic" type="checkbox" checked={cameraConfig.orthographic}
                       onChange={e => {
                           dispatch(set(state => {
                               state.camera.orthographic = e.target.checked
                           }))
                       }}/>
                <label htmlFor="checkbox-camera-orthographic">正交相机</label>
            </div>
            <div>
                <input id="checkbox-adjust-camera" type="checkbox" checked={viewConfig.adjustCamera} onChange={e => {
                    dispatch(set(state => {
                        state.view.adjustCamera = e.target.checked
                    }))
                }}/>
                <label htmlFor="checkbox-adjust-camera">调整相机视角</label>
            </div>
            <ToolDivider/>
            <div>
                <span>模型透明度 (%)</span>
                <input type="number" value={renderConfig.modelOpacity} onChange={e => {
                    dispatch(set(state => {
                        state.render.modelOpacity = parseInt(e.target.value)
                    }))
                }} style={{width: 60}} />
            </div>
            <div>
                <input id="checkbox-flatshading" type="checkbox" checked={renderConfig.flatShading} onChange={e => {
                    dispatch(set(state => {
                        state.render.flatShading = e.target.checked
                    }))
                }}/>
                <label htmlFor="checkbox-flatshading">Flat shading</label>
            </div>
            <div>
                <input id="checkbox-shadow" type="checkbox" checked={renderConfig.contactShadow} onChange={e => {
                    dispatch(set(state => {
                        state.render.contactShadow = e.target.checked
                    }))
                }}/>
                <label htmlFor="checkbox-shadow">Contact shadow</label>
            </div>
            <div>
                <input id="checkbox-sync-transform" type="checkbox" checked={renderConfig.syncTransform}
                       onChange={e => {
                           dispatch(set(state => {
                               state.render.syncTransform = e.target.checked
                           }))
                       }}/>
                <label htmlFor="checkbox-sync-transform">同步Transform</label>
            </div>
            <div>
                <input id="checkbox-enable-transform" type="checkbox" checked={renderConfig.enableTransform}
                       onChange={e => {
                           dispatch(set(state => {
                               state.render.enableTransform = e.target.checked
                           }))
                       }}/>
                <label htmlFor="checkbox-enable-transform">开启Transform</label>
            </div>
            <div>
                <input id="checkbox-spinning" type="checkbox" checked={renderConfig.spinning} onChange={e => {
                    dispatch(set(state => {
                        state.render.spinning = e.target.checked
                    }))
                }}/>
                <label htmlFor="checkbox-spinning">旋转</label>
            </div>
            <div>
                <span>转速</span>
                <input type="number" value={renderConfig.spinningSpeed} onChange={e => {
                    dispatch(set(state => {
                        state.render.spinningSpeed = parseInt(e.target.value)
                    }))
                }} style={{width: 60}}/>
                <span>度/秒</span>
            </div>
            <ToolDivider/>
            <div>
                <span>标签字号</span>
                <input type="number" value={renderConfig.font.size} onChange={e => {
                    dispatch(set(state => {
                        state.render.font.size = parseInt(e.target.value)
                    }))
                }} style={{width: 60}}/>
            </div>
            <div>
                <input id="checkbox-font-bold" type="checkbox" checked={renderConfig.font.bold} onChange={e => {
                    dispatch(set(state => {
                        state.render.font.bold = e.target.checked
                    }))
                }}/>
                <label htmlFor="checkbox-font-bold">加粗</label>
            </div>
            <div>
                <input id="checkbox-font-absolute" type="checkbox" checked={renderConfig.font.absolute} onChange={e => {
                    dispatch(set(state => {
                        state.render.font.absolute = e.target.checked
                    }))
                }}/>
                <label htmlFor="checkbox-font-absolute">绝对定位</label>
            </div>
        </div>
        <div ref={containerRef} style={{
            display: 'flex',
            width: totalWidth,
            flexFlow: 'wrap',
            position: 'relative'
        }}>
            {panels}
            <Canvas
                ref={canvasRef}
                eventSource={containerRef}
                frameloop="always"
                gl={{
                    antialias: true, preserveDrawingBuffer: false, alpha: true, clearAlpha: 0.0
                }}
                style={{
                    width: totalWidth, position: 'absolute', left: 0, top: 0, zIndex: -1
                }}
            >
                {/*<Bvh>*/}
                <View.Port/>
                {/*</Bvh>*/}
                <BaseComponents cameraConfig={cameraConfig}/>
                <ArcballControls enabled={viewConfig.adjustCamera} makeDefault domElement={containerRef.current}/>
            </Canvas>
        </div>
    </div>
}