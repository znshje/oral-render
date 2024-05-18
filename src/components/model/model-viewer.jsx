import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import React, {forwardRef, useCallback, useEffect, useState} from "react";
import {set} from "@/lib/slices/baseSlice.js";
import * as Popover from '@radix-ui/react-popover';
import {MixerHorizontalIcon} from '@radix-ui/react-icons';
import {IconButton} from "@radix-ui/themes";

const FileHoverMask = ({name, count}) => {
    return <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        background: 'rgba(0, 0, 0, 0.1)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        border: '5px #7f7f7f dotted'
    }}>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 8,
            position: 'relative'
        }}>
            <span>释放以添加</span>
            <span>{count} 个文件</span>
            <div style={{display: 'flex'}}>
                <div style={{
                    maxWidth: 150,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    wordBreak: 'break-all'
                }}>{name}</div>
                {count > 1 ? ' 等' : ''}
            </div>
        </div>
    </div>
}

/**
 * Support DnD file selection
 * @constructor
 */
function ModelViewer({children, index}, ref) {
    const dispatch = useAppDispatch();
    const viewConfig = useAppSelector((state) => state.base.view);
    const dnd = useAppSelector((state) => state.base.dnd);
    const theFile = useAppSelector(state => state.base.render.files[index])
    const renderConfig = useAppSelector((state) => state.base.render);

    const [label, setLabel] = useState('')
    const [filePrepare, setFilePrepare] = useState(undefined)
    const [dragEnter, setDragEnter] = useState(false)
    const [hover, setHover] = useState(false)

    const setFile = useCallback(v => {
        dispatch(set(state => {
            if (v) {
                state.render.files[index] = v[0]
            } else {
                state.render.files[index] = undefined
            }
        }))
    }, [dispatch, index])

    const onDragEnter = useCallback(e => {
        setDragEnter(true)
    }, [])

    const onDragLeave = useCallback(e => {
        setDragEnter(false)
    }, [])

    useEffect(() => {
        if (dragEnter && dnd.dragging && dnd.files.length > 0) {
            setFilePrepare(dnd.files)
        } else {
            setFilePrepare(undefined)
        }
    }, [dragEnter, dnd.dragging, dnd.files.length, dnd.files])

    useEffect(() => {
        console.log(dnd.dragging, filePrepare)
        if (!dnd.dragging && filePrepare) {
            setFilePrepare(undefined)
            setFile(filePrepare)
        }
    }, [dnd.dragging, filePrepare, setFile])
    console.log('hover:', hover)

    return <div
        ref={ref}
        id={`multi-render-view-${index}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}
    >
        <div style={{
            width: viewConfig.width, height: viewConfig.height, position: 'absolute',
            left: 0,
            top: 0
        }}>{children}</div>

        <div style={{
            width: viewConfig.width, height: viewConfig.height, position: 'relative',
            boxShadow: !theFile ? '0 0 5px 5px #ddd inset' : 'none'
        }}>
            {dnd.dragging && dragEnter && <FileHoverMask name={dnd.files[0]} count={dnd.files.length}/>}
            {hover && <div style={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                zIndex: 20
            }}>
                <Popover.Root>
                    <Popover.Trigger asChild>
                        <IconButton aria-label="setting">
                            <MixerHorizontalIcon/>
                        </IconButton>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content sideOffset={5} style={{
                            boxShadow: '0 0 5px 5px #cdcdcd',
                            padding: 16,
                            borderRadius: 8,
                            background: 'white'
                        }}>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                                <h3 style={{marginBottom: 10}}>
                                    设置
                                </h3>
                                <div>
                                    <label htmlFor="model-label" style={{marginRight: 16}}>
                                        标签
                                    </label>
                                    <input id="model-label" value={label} onChange={e => {
                                        setLabel(e.target.value)
                                    }}/>
                                </div>
                                <button disabled={!theFile} onClick={() => {
                                    setFile(undefined)
                                }}>删除模型
                                </button>
                            </div>
                            <Popover.Arrow className="PopoverArrow"/>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>
            }
        </div>
        {/*<ContextMenu.Root>*/}
        {/*    <ContextMenu.Trigger>*/}
        {/*        <div style={{*/}
        {/*            width: viewConfig.width, height: viewConfig.height, position: 'relative'*/}
        {/*        }}>*/}
        {/*            {dnd.dragging && hover && <FileHoverMask name={dnd.files[0]} count={dnd.files.length}/>}*/}
        {/*        </div>*/}
        {/*    </ContextMenu.Trigger>*/}
        {/*    <ContextMenu.Portal>*/}
        {/*        <ContextMenu.Content>*/}
        {/*            <ContextMenu.Item className="ContextMenuItem">*/}
        {/*                Back <div className="RightSlot">⌘+[</div>*/}
        {/*            </ContextMenu.Item>*/}
        {/*        </ContextMenu.Content>*/}
        {/*    </ContextMenu.Portal>*/}
        {/*</ContextMenu.Root>*/}
        {/*<div ref={ref} style={{*/}
        {/*    inset: 0,*/}
        {/*    position: 'absolute',*/}
        {/*    zIndex: -1*/}
        {/*}}/>*/}
        {(label && label.length > 0) && <div style={{fontSize: renderConfig.font.size, fontWeight: renderConfig.font.bold ? 'bold' : 'normal', position: renderConfig.font.absolute ? 'absolute' : 'relative', bottom: 0}}>{label}</div>}
    </div>
}

export default forwardRef(ModelViewer)