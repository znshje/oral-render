import {useAppDispatch, useAppSelector} from "@/lib/hooks.js";
import {set} from "@/lib/slices/baseSlice.js";
import React from "react";

export default function ControlPanel() {
    const dispatch = useAppDispatch();
    const cameraConfig = useAppSelector((state) => state.base.camera);
    const viewConfig = useAppSelector((state) => state.base.view);
    const renderConfig = useAppSelector((state) => state.base.render);

    return <div style={{
        width: '100%',
        height: 64,
        display: 'flex',
        gap: 16,
        paddingLeft: 16,
        overflowX: 'scroll'
    }}>
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
            <input id="checkbox-sync-transform" type="checkbox" checked={renderConfig.syncTransform} onChange={e => {
                dispatch(set(state => {
                    state.render.syncTransform = e.target.checked
                }))
            }}/>
            <label htmlFor="checkbox-sync-transform">同步Transform</label>
        </div>
        <div>
            <input id="checkbox-spinning" type="checkbox" checked={renderConfig.spinning} onChange={e => {
                dispatch(set(state => {
                    state.render.spinning = e.target.checked
                }))
            }}/>
            <label htmlFor="checkbox-spinning">旋转</label>
        </div>
    </div>
}