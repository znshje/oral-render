"use client";

import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {BaseDirectory, readDir} from "@tauri-apps/plugin-fs";
import {useCallback, useEffect, useState} from "react";
import {
    Badge,
    Box,
    Button,
    Container,
    DecorativeBox,
    Flex,
    TextField,
} from "@radix-ui/themes";
import {set} from "@/lib/slices/baseSlice";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import "./styles.css";
import Link from "next/link";
import {open} from "@tauri-apps/plugin-dialog";
import {useRouter} from "next/navigation";

export default function Files() {
    const dispatch = useAppDispatch();
    const rootPath = useAppSelector((state) => state.base.rootPath);
    const fileList = useAppSelector((state) => state.base.fileList);
    const index = useAppSelector((state) => state.base.index);
    const finishedAt = useAppSelector((state) => state.base.finishedAt);
    const savePath = useAppSelector((state) => state.base.savePath);
    const [value, setValue] = useState(rootPath ?? "");
    const router = useRouter();

    const getFileList = useCallback(() => {
        getEntries(rootPath).then((result) => {
            dispatch(
                set((state) => {
                    state.fileList = result;
                    state.index = -1;
                    state.finishedAt = -1;
                })
            );
        });
    }, [dispatch, rootPath]);

    useEffect(() => {
        getFileList();
    }, [getFileList]);

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                textAlign: "center",
                padding: 32,
            }}
        >
            <h2>选择模型路径</h2>
            <Flex direction="row" gap="3" align="center" justify="center">
                <TextField.Root
                    style={{width: "50%"}}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                    }}
                />
                <Button
                    onClick={() => {
                        open({
                            directory: true,
                        }).then((selected) => {
                            setValue(selected);
                            dispatch(
                                set((state) => {
                                    state.rootPath = selected;
                                })
                            );
                        });
                    }}
                >
                    浏览…
                </Button>
                <Button
                    onClick={() => {
                        dispatch(
                            set((state) => {
                                state.rootPath = value;
                            })
                        );
                    }}
                >
                    查询
                </Button>
            </Flex>
            <ScrollArea.Root className="ScrollAreaRoot">
                <ScrollArea.Viewport className="ScrollAreaViewport">
                    <div
                        style={{
                            padding: "8px 0 0 0",
                        }}
                    >
                        共查询到 {fileList.length} 条结果
                    </div>
                    <div
                        style={{
                            padding: "8px 16px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                        }}
                    >
                        {fileList.map((file, i) => (
                            <Badge
                                size="3"
                                key={`file-${i}`}
                                variant={
                                    i < index ? "soft" : i === finishedAt ? "solid" : "outline"
                                }
                                color={
                                    i < index ? "indigo" : i === finishedAt ? "crimson" : "orange"
                                }
                            >
                                {file.name}
                            </Badge>
                        ))}
                    </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                    className="ScrollAreaScrollbar"
                    orientation="vertical"
                >
                    <ScrollArea.Thumb className="ScrollAreaThumb"/>
                </ScrollArea.Scrollbar>
                <ScrollArea.Scrollbar
                    className="ScrollAreaScrollbar"
                    orientation="horizontal"
                >
                    <ScrollArea.Thumb className="ScrollAreaThumb"/>
                </ScrollArea.Scrollbar>
                <ScrollArea.Corner className="ScrollAreaCorner"/>
            </ScrollArea.Root>
            <h2>选择保存路径</h2>
            <Flex direction="row" gap="3" align="center" justify="center">
                <TextField.Root
                    style={{width: "50%"}}
                    value={savePath}
                    onChange={(e) => {
                        dispatch(set(state => {
                            state.savePath = e.target.value
                        }))
                    }}
                />
                <Button
                    onClick={() => {
                        open({
                            directory: true,
                        }).then((selected) => {
                            setValue(selected);
                            dispatch(
                                set((state) => {
                                    state.savePath = selected;
                                })
                            );
                        });
                    }}
                >
                    浏览…
                </Button>
            </Flex>
            <Button
                onClick={() => {
                    router.push("/render");
                }}
            >
                开始
            </Button>
        </div>
    );
}

const join = (...a) => {
    let suffix = /[/\\]+$/
    return a.map(v => v.replace(suffix, '')).join('/')
}

const flatPaths = async (rootPath, result) => {
    let arr = []
    for (let item of result) {
        const newPath = join(rootPath, item.name)
        if (item.isDirectory) {
            const children = await readDir(newPath)
            arr = arr.concat(await flatPaths(newPath, children))
        } else {
            if (item.name.toLowerCase().endsWith('.ply'))
                arr.push({
                    path: newPath,
                    name: item.name
                })
        }
    }
    return arr
}

// const flatPaths = async (rootPath, result) => {
//     if (result instanceof Array || result.isDirectory) {
//         // dir
//         let arr = [];
//         let toTraverse;
//         if (result instanceof Array) toTraverse = result;
//         else if (result.isDirectory) {
//             result = await readDir(join(rootPath, result.name))
//         } else toTraverse = result["children"];
//         toTraverse.forEach((child) => {
//             try {
//                 arr = arr.concat(flatPaths(child)).filter((v) => !!v);
//             } catch (e) {
//             }
//         });
//         return arr;
//     } else {
//         // file
//         return result.name.toLowerCase().endsWith(".ply") ? join(rootPath, result) : undefined;
//     }
// };

export async function getEntries(path) {
    try {
        const entries = await readDir(path);
        return await flatPaths(path, entries);
    } catch (e) {
        console.error(e);
        return [];
    }
}
