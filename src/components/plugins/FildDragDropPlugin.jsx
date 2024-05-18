import {useEffect, useRef} from "react";
import {listen, TauriEvent} from "@tauri-apps/api/event";
import {useAppDispatch} from "@/lib/hooks.js";
import {set} from "@/lib/slices/baseSlice.js";

export default function FileDragDropPlugin()  {
    const dispatch = useAppDispatch();
    const dropListenerInit = useRef(false)
    const dragListenerInit = useRef(false)
    const dragEndListenerInit = useRef(false)
    const fileDropListener = useRef()
    const fileDragListener = useRef()
    const fileDragEndListener = useRef()

    useEffect(() => {
        if (dragListenerInit.current) return;
        dragListenerInit.current = true;

        if (fileDragListener.current) {
            fileDragListener.current()
            fileDragListener.current = null
        }

        listen(TauriEvent.DRAG, e => {
            dispatch(set(state => {
                state.dnd.dragging = true;
                state.dnd.files = e.payload.paths;
            }))
        }).then(o => {
            fileDragListener.current = o
            dragListenerInit.current = false;
        })

        return () => {
            if (fileDragListener.current) fileDragListener.current()
        }
    }, [dispatch]);

    useEffect(() => {
        if (dropListenerInit.current) return;
        dropListenerInit.current = true;

        if (fileDropListener.current) {
            fileDropListener.current()
            fileDropListener.current = null
        }

        listen(TauriEvent.DROP, e => {
            dispatch(set(state => {
                state.dnd.dragging = false;
                state.dnd.files = e.payload.paths;
            }))
        }).then(o => {
            fileDropListener.current = o
            dropListenerInit.current = false;
        })

        return () => {
            if (fileDropListener.current) fileDropListener.current()
        }
    }, [dispatch]);

    useEffect(() => {
        if (dragEndListenerInit.current) return;
        dragEndListenerInit.current = true;

        if (fileDragEndListener.current) {
            fileDragEndListener.current()
            fileDragEndListener.current = null
        }

        listen(TauriEvent.DROP_CANCELLED, e => {
            dispatch(set(state => {
                state.dnd.dragging = false;
                state.dnd.files = [];
            }))
        }).then(o => {
            fileDragEndListener.current = o
            dragEndListenerInit.current = false;
        })

        return () => {
            if (fileDragEndListener.current) fileDragEndListener.current()
        }
    }, [dispatch]);

    return <></>
}