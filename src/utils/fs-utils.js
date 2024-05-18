import {readDir} from '@tauri-apps/plugin-fs';

export const join = (...a) => {
    let suffix = /[/\\]+$/;
    return a.map(v => v.replace(suffix, '')).join('/');
};

export const readDirRecursive = async path => {
    const flatPaths = async (rootPath, result) => {
        let arr = [];
        for (let item of result) {
            const newPath = join(rootPath, item.name);
            if (item.isDirectory) {
                const children = await readDir(newPath);
                arr = arr.concat(await flatPaths(newPath, children));
            } else {
                arr.push({
                    path: newPath,
                    name: item.name
                });
            }
        }
        return arr;
    };

    try {
        const entries = await readDir(path);
        return await flatPaths(path, entries);
    } catch (e) {
        console.error(e);
        return [];
    }
};
