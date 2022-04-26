import { promises as fs } from "fs";
import path from "path";
import { MetadataBuilder, MetadataBuilderOptions, Token } from "./metadata";
import { RarityTable } from "./rarityTable";
import { LayerMerger } from "./layerMerger";
const CHUNK_SIZE = 10;
export async function generate(
    options: {
        rarityTable: RarityTable;
        ouput: string;
        count: number;
        oneOnOnesPath: string;
        layersPath: string;
        format: string;
        layerNameCompareFunction: (a: string, b: string) => boolean;
        metadata: {
            name: string;
            description: string;
            otherOptions?: MetadataBuilderOptions;
        };

    },
    random: () => number = Math.random
): Promise<void> {
    const files = (await fs.readdir(options.oneOnOnesPath))
        .filter((f) => f.endsWith(`.${options.format}`))
        .map((f) => path.join(options.oneOnOnesPath, f));
    const ooo = files.map(() => Math.round(random() * options.count));
    const metadataOutputPath = path.join(options.ouput, `./metadata/`);

    const metadataBuilder = new MetadataBuilder(options.metadata.name, options.metadata.description, {
        baseImageExtension: options.format,
        ...options.metadata.otherOptions,
    });

    const layerMerger = new LayerMerger(new Set(options.rarityTable.TRAITS));
    await layerMerger.loadLayers(options.layersPath, options.layerNameCompareFunction);

    await fs.mkdir(metadataOutputPath, { recursive: true });
    for (let k = 0; k < options.count; k += 10) {
        const promises: Promise<void | unknown>[] = [];
        for (let i = k; i < k + CHUNK_SIZE && i < options.count; i++) {
            if (ooo.includes(i)) {
                const file = files[ooo.indexOf(i)] as string;
                promises.push(fs.copyFile(file, path.join(options.ouput, `${i}.${options.format}`)));
                const token = new Token(metadataBuilder, i);
                token.addAttribute({
                    value: "Unique",
                });
                token.addAttribute({
                    trait_type: "Name",
                    value: path.basename(file, `.${options.format}`),
                });
                metadataBuilder.addToken(token);
                continue;
            }

            const token = new Token(metadataBuilder, i);
            const traits = options.rarityTable.randomTokenTraits(random);
            for (const trait of traits.toAttributesArray()) {
                token.addAttribute(trait);
            }
            metadataBuilder.addToken(token);
            promises.push(layerMerger.merge(traits.toLayerArray()).toFile(path.join(options.ouput, `${i}.${options.format}`)) as Promise<unknown>);
        }
        await Promise.all(promises);
    }
    await metadataBuilder.save(metadataOutputPath);
}
