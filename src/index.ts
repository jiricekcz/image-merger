import { parseExcel } from "./parse";
import path from "path";
import { RarityTable } from "./rarityTable";
import { LayerMerger, alphaCompare } from "./layerMerger";
import { generate } from "./randomGenerator";

const filepath = path.join(__dirname, "../.data/moonies/Rarity Table.xlsx");
const traits = [
    "Background Base",
    "Background Layer",
    "Background Pattern",
    "Head",
    "Face Design",
    "Headpiece",
    "Clothing",
    "Eyes",
    "Mouth",
    "Neckwear",
];
const layerPath = path.join(__dirname, "../.data/moonies/");

const layerMerger = new LayerMerger(new Set(traits));
let rarityTable: RarityTable;
switch (path.extname(filepath)) {
    case ".xlsx":
        rarityTable = parseExcel(filepath, new Set(traits));
        break;
    default:
        throw Error("Invalid file extension for declaration file.");
}
async function main(): Promise<void> {
    await generate({
        count: 20,
        format: "png",
        rarityTable,
        metadata: {
            name: "Moonies",
            description: "A collection of moonies.",
            otherOptions: {
                baseImageUrl: "loltrol://moonies/",
            }
        },
        layerNameCompareFunction: alphaCompare,
        layersPath: path.join(__dirname, "../.data/moonies/"),
        oneOnOnesPath: path.join(__dirname, "../.data/moonies/Unique 1_1's/"),
        ouput: path.join(__dirname, "../.data/moonies/output/"),
    })
    rarityTable;
    layerMerger;
    layerPath;
    
    // await layerMerger.loadLayers(layerPath, alphaCompare);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access*/
    // await layerMerger.merge(rarityTable.randomTokenTraits(traits).toLayerArray()).toFile("test.png");

    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access*/
    // console.log(rarityTable);
}

void main();
