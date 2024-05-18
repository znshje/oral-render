import {createSlice} from "@reduxjs/toolkit";
import {produce} from 'immer'
import {Matrix4} from "three";

const initialState = {
    fileList: [],
    index: -1,
    rootPath: '',
    finishedAt: -1,
    savePath: '',
    imageSize: [1280, 800],
    notification: true,
    camera: {
        orthographic: false,
        fov: 50,
    },
    view: {
        width: 400,
        height: 300,
        cols: 1,
        rows: 1,
        adjustCamera: true
    },
    dnd: {
        dragging: false,
        files: []
    },
    render: {
        spinning: false,
        spinningSpeed: 30,
        files: {},
        transformMatrix: new Matrix4().toArray(),
        flatShading: false,
        contactShadow: true,
        syncTransform: true,
        enableTransform: false,
        font: {
            bold: false,
            size: 28,
            absolute: false
        }
    }
}

export const baseSlice = createSlice({
    name: 'base',
    initialState,
    reducers: {
        set: (state, action) => {
            const newAttr = produce(state, action.payload);
            return {...state, ...newAttr};
        },
        setCamera: (state, action) => {
            return {...state, camera: {...state.camera, ...action.payload}}
        },
        setView: (state, action) => {
            return {...state, view: {...state.view, ...action.payload}}
        },
        setDnd: (state, action) => {
            return {...state, dnd: {...state.dnd, ...action.payload}}
        },
        setRender: (state, action) => {
            return {...state, render: {...state.render, ...action.payload}}
        }
    }
})

export const {set, setCamera, setView, setDnd, setRender} = baseSlice.actions;