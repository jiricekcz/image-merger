import { promises as fs, Stats } from "fs";
import path from "path";
import sharp from "sharp";
export class LayerMerger<T extends string = string> {
    public readonly LAYER_VALUES: Set<T>;
    public readonly layers: Map<T, Layer<T>> = new Map<T, Layer<T>>();
    constructor(layers: Set<T>) {
        this.LAYER_VALUES = layers;
    }
    async loadLayers(
        folderPath: string,
        compare: (foldername: string, traitName: string) => boolean = (fn, tn) => fn.includes(tn)
    ): Promise<void> {
        const contents = await fs.readdir(folderPath);
        const folders: string[] = [];
        const ps: Promise<Stats | void>[] = [];
        for (const content of contents) {
            const fullPath = path.join(folderPath, content);
            ps.push(
                fs.stat(fullPath).then((stats) => {
                    if (stats.isDirectory()) {
                        folders.push(fullPath);
                    }
                })
            );
        }
        await Promise.all(ps);
        const ps2: Promise<void>[] = [];
        for (const name of this.LAYER_VALUES) {
            const vfs = folders.filter((folder) => compare(path.basename(folder), name));
            if (vfs.length !== 1) throw new Error(`Expected exactly one folder matching ${name}, found ${vfs.length}`);
            const folder = vfs[0] as string;
            const layer = new Layer<T>(name, folder);
            this.layers.set(name, layer);
            ps2.push(layer.load());
        }
        for (const value of this.LAYER_VALUES) {
            if (!this.layers.has(value)) throw new Error(`Missing layer ${value}`);
        }
        await Promise.all(ps2);
    }
    protected validateLayer(layerName: string): layerName is T {
        return this.LAYER_VALUES.has(layerName as T);
    }
    merge(layers: Array<LayerConfig>, gravity: sharp.Gravity = "northwest"): sharp.Sharp {
        // @es-lint-ignore

        if (!this.validateLayer((layers[0] as LayerConfig).name))
            throw new Error(`Missing layer ${(layers[0] as LayerConfig).name}`);
        const layer = this.layers.get((layers[0] as LayerConfig).name as T) as Layer;
        if (!layer.validateName((layers[0] as LayerConfig).value))
            throw new Error(
                `Option ${(layers[0] as LayerConfig).value} is not valid for layer ${(layers[0] as LayerConfig).name}`
            );
        const layerValue = layer.getPath((layers[0] as LayerConfig).value);
        const img: sharp.Sharp = sharp(layerValue); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const ar: { input: string; gravity: sharp.Gravity }[] = [];
        for (let i = 1; i < layers.length; i++) {
            const l = layers[i] as LayerConfig;

            if (!this.validateLayer(l.name)) throw new Error(`Missing layer ${l.name}`);
            const layer = this.layers.get(l.name) as Layer;
            if (!layer.validateName(l.value))
                throw new Error(`Option ${l.value as string} is not valid for layer ${l.name}`);
            const layerValue = layer.getPath(l.value);
            ar.push({ input: layerValue, gravity: gravity }); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        }
        return img.composite(ar); // eslint-disable-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    }
}

export class Layer<T extends string = string, O extends string = string> {
    public static readonly POSSIBLE_EXTENSIONS = [".png", ".jpg", ".jpeg"];
    public readonly name: T;
    public readonly folderPath: string;
    public readonly options: Map<O, string> = new Map();

    public readonly validateName: (name: string) => name is O;
    constructor(
        name: T,
        folderPath: string,
        validateName: (name: string) => name is O = (name: string): name is O => true
    ) {
        this.name = name;
        this.folderPath = folderPath;
        this.validateName = validateName;
    }
    getPath(name: O): string {
        if (!this.options.has(name)) throw new Error(`Missing option ${name}`);
        return this.options.get(name) as string;
    }
    async load(): Promise<void> {
        const contents = await fs.readdir(this.folderPath);
        const ps: Promise<Stats | void>[] = [];
        for (const content of contents) {
            const fullPath = path.join(this.folderPath, content);
            ps.push(
                fs.stat(fullPath).then((stats) => {
                    if (stats.isFile()) {
                        const ext = path.extname(fullPath);
                        if (Layer.POSSIBLE_EXTENSIONS.includes(ext)) {
                            const name = path.basename(fullPath, ext);
                            if (!this.validateName(name)) return;
                            this.options.set(name, fullPath);
                        }
                    }
                })
            );
        }
        await Promise.all(ps);
    }
}
export function alphaCompare(string1: string, string2: string): boolean {
    return toAlpha(string1) == toAlpha(string2);
}
function toAlpha(string: string) {
    return string.toLowerCase().replace(/[^a-z]/g, "");
}
interface LayerConfig<O extends string = string> {
    name: O;
    value: string;
}
