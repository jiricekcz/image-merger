import { parseExcel } from "./parse";
import path from "path";
import { RarityTable } from "./rarityTable";

const filepath = path.join(__dirname, "../.data/moonies/Rarity Table.xlsx");
const traits = new Set(["Background Base", "Background Layer", "Background Pattern", "Head", "Face Design", "Headpiece", "Clothing", "Eyes", "Mouth", "Neckwear"])



let rarityTable: RarityTable;
switch (path.extname(filepath)) {
    case ".xlsx":
        rarityTable = parseExcel(filepath, traits);
        break;
    default:
        throw Error("Invalid file extension for declaration file.");
}
console.log(rarityTable);