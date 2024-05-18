import { useAppDispatch } from "@/lib/hooks";
import { set } from "@/lib/slices/baseSlice";
import { join, readDirRecursive } from "@/utils/fs-utils";
import { useEffect, useState } from "react";
import MultiRender from "../multi-render/page";

const BASE_DIR = 'D:/render/';
const METHODS = {
    ndf: 'NDF',
    igr: 'IGR',
    siren: 'SIREN',
    gifs: 'GIFS',
    cap: 'CAP-UDF',
    digs: 'DiGS',
    geo: 'GeoUDF',
    level: 'LevelSetUDF',
    nsh: 'NSH',
    steik: 'StEik',
    ours: 'Ours',
    gt: 'GT'
}

const predictLabelName = fn => {
    let name = undefined
    for (let k of Object.keys(METHODS)) {
        if (fn.toLowerCase().indexOf(k) > -1) {
            name = METHODS[k]
            break;
        }
    }
    if (!name) {
        console.warn("Unrecognized file label:", fn)
        name = '';
    }
    return name;
}

const extractIndexFromFileName = fn => {
    let s = ''
    for (let i = 0; i < fn.length; i++) {
        if ('0' <= fn[i] && fn[i] <= '9') {
            s += fn[i]
        } else {
            return parseInt(s)
        }
    }
    return -1;
}

export default function MultiRenderHack() {
    const [fileList, setFileList] = useState([])
    const [index, setIndex] = useState(-1)
    const dispatch = useAppDispatch()

    useEffect(() => {
        readDirRecursive(BASE_DIR).then(items => {
            const projects = {}
            items.forEach(item => {
                let projectName = item.path.substring(BASE_DIR.length)
                projectName = projectName.substring(0, projectName.length - item.name.length - 1)
                if (!projects[projectName]) {
                    projects[projectName] = []
                }
                // add sorted file names
                projects[projectName].push(item.name)
            })
            
            const projectsArr = []
            for (let projectName in projects) {
                const sortedFiles = projects[projectName].sort((a, b) => {
                    return extractIndexFromFileName(a) - extractIndexFromFileName(b)
                })
                projectsArr.push({
                    key: projectName,
                    files: sortedFiles,
                    paths: sortedFiles.map(fn => join(BASE_DIR, projectName, fn)),
                    labels: sortedFiles.map(fn => predictLabelName(fn))
                })
            }

            setFileList(projectsArr)
        })
    }, [])

    useEffect(() => {
        if (index < 0 || fileList.length === 0) {
            dispatch(set(state => {
                state.render.labels = {}
                state.render.files = {}
                state.view.cols = 1
                state.view.rows = 1
            }))
        } else {
            const labelMap = {}
            const fileMap = {}

            const cols = fileList.length > 3 ? Math.ceil(fileList.length / 2) : fileList.length
            const rows = fileList.length > 3 ? 2 : 1

            for (let i = 0; i < cols * rows; i++) {
                labelMap[i] = ''
                fileMap[i] = ''

                if (i < fileList.length) {
                    labelMap[i] = fileList[index].labels[i]
                    fileMap[i] = fileList[index].paths[i]
                }
            }

            dispatch(set(state => {
                state.render.labels = labelMap
                state.render.files = fileMap
                state.view.cols = cols
                state.view.rows = rows
            }))
        }
    }, [dispatch, fileList, index])

    return <>
        <div style={{
            width: '100%',
            background: 'yellow',
            display: 'flex',
            gap: 16
        }}>
            <div>{index + 1} / {fileList.length}</div>
            <div>{index > -1 ? `${fileList[index].key}` : ``}</div>
            <button disabled={index <= 0} onClick={() => {
                setIndex(prev => Math.max(-1, Math.min(prev - 1, fileList.length - 1)))
            }}>上一个</button>
            <button disabled={index >= fileList.length - 1} onClick={() => {
                setIndex(prev => Math.max(-1, Math.min(prev + 1, fileList.length - 1)))
            }}>下一个</button>
        </div>
        <MultiRender />
    </>
}