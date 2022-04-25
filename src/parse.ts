import { RarityTable } from "./rarityTable";
import * as XLSX from "xlsx";

export function parseExcel(path: string, sheetname?: string): RarityTable | void {
    const file = XLSX.readFile(path);
    // console.log("Props", file.Props);
    console.log("Custprops", file.Custprops);
    console.log("Sheetnames", file.SheetNames);
    // console.log("Sheets", file.Sheets);
    if (!sheetname) if (file.SheetNames.length > 1) {
        throw new Error("Multiple sheets in the excel file. Please specify the sheetname.");
    } else {
        sheetname = file.SheetNames[0];
    }
    sheetname = sheetname as string;
    const sheet = file.Sheets[sheetname];
    if (!verfiySheet(sheet)) throw new Error("Invalid sheet.");
    console.log(sheet["!ref"]); 
    
}
function verfiySheet(sheet: XLSX.Sheet | undefined): sheet is XLSX.Sheet {
    return sheet !== undefined// && sheet["!cols"] !== undefined;
}
// interface DefinedSheet extends XLSX.Sheet {
//     "!rows": Array<XLSX.ColInfo>;
// }