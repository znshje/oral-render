import { createSlice } from "@reduxjs/toolkit";
import {produce} from 'immer';

const initialState = {
    fileList: [],
    index: -1,
    rootPath: '',
    finishedAt: -1,
    savePath: '',
    imageSize: [1280, 800],
    notification: true
}

export const baseSlice = createSlice({
    name: 'base',
    initialState,
    reducers: {
        set: (state, action) => {
            const newAttr = produce(state, action.payload);
            return {...state, ...newAttr};
        }
    }
})

export const {set} = baseSlice.actions;