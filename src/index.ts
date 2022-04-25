import { parseExcel } from "./parse";
import path from "path";
parseExcel(path.join(__dirname, "../.data/moonies/Rarity Table.xlsx"))