import { RarityTable, TraitOptions } from "./rarityTable";
import * as XLSX from "xlsx";

export function parseExcel<T extends string = string>(
    path: string,
    traits: Set<T> = new Set(),
    sheetname?: string
): RarityTable {
    const file = XLSX.readFile(path);
    const sheetnames = file.SheetNames.filter((v) => !v.startsWith("A-"));
    const declarationSheet = new DeclarationSheet(file.Sheets["A-Declarations"]);
    console.log(declarationSheet.invalidTraitOptions);

    if (!sheetname)
        if (sheetnames.length > 1) {
            throw new Error("Multiple sheets in the excel file. Please specify the sheetname.");
        } else {
            sheetname = sheetnames[0];
        }
    sheetname = sheetname as string;

    const sheet = file.Sheets[sheetname];
    if (!verfiySheet(sheet)) throw new Error("Invalid sheet.");
    
    const table = new RarityTable(Array(...traits));
    for (const trait of traits) {
        const opts = findTrait(sheet, declarationSheet, trait);
        table.declareTrait(trait, opts);
    }

    return table;
}
function verfiySheet(sheet: XLSX.Sheet | undefined): sheet is XLSX.Sheet {
    return sheet !== undefined; // && sheet["!cols"] !== undefined;
}

function findCells(
    sheet: XLSX.Sheet,
    validate: (cell: XLSX.CellObject) => boolean
): Array<{ o: XLSX.CellObject; a: XLSX.CellAddress }> {
    const rv: Array<{ o: XLSX.CellObject; a: XLSX.CellAddress }> = [];
    for (const a in sheet) {
        const address = toCell(a);
        if (!verifyAddress(address)) continue;
        const cell = sheet[a] as XLSX.CellObject;
        if (validate(cell)) rv.push({ o: cell, a: address });
    }
    return rv;
}

function toCell(cellId: string): XLSX.CellAddress | undefined {
    if (cellId.startsWith("!")) return;
    return XLSX.utils.decode_cell(cellId);
}
function verifyAddress(address: XLSX.CellAddress | undefined): address is XLSX.CellAddress {
    return address !== undefined;
}
function isValidTraitOption(sheet: XLSX.Sheet, declarationSheet: DeclarationSheet, address: XLSX.CellAddress): boolean {
    const cell = sheet[XLSX.utils.encode_cell(address)] as XLSX.CellObject | undefined;
    if (cell === undefined || cell.v == undefined || typeof cell.v !== "string") return false;
    if (!declarationSheet.isValidTraitOptionName(cell.v.trim())) return false;
    return cell.v.trim() !== "";
}
function getValueFromValueCell(sheet: XLSX.Sheet, address: XLSX.CellAddress): number {
    const cell = sheet[XLSX.utils.encode_cell(address)] as XLSX.CellObject;
    if (typeof cell?.v !== "number") throw new Error("Invalid trait option value cell.");
    return cell.v;
}
function findTrait<T extends string>(
    sheet: XLSX.Sheet,
    declarationSheet: DeclarationSheet,
    trait: T
): TraitOptions {
    const rv: TraitOptions = [];
    const cells = findCells(sheet, (cell) => {
        if (typeof cell.v !== "string") return false;
        return cell.v.trim() == trait;
    });
    if (cells.length !== 1) {
        if (!declarationSheet.traitLocations.has(trait)) throw new Error(`Unable to find trait ${trait}. Please define its location in the decalaration sheet using the traitLocation directive.`);
        cells[0] = { o: { v: trait, t: "s" }, a: declarationSheet.traitLocations.get(trait) as XLSX.CellAddress };
    }
    const start = cells[0] as { o: XLSX.CellObject; a: XLSX.CellAddress };
    const startAddress = start.a;

    let it = under(startAddress);
    while (isValidTraitOption(sheet, declarationSheet, it)) {
        const cell = sheet[XLSX.utils.encode_cell(it)] as XLSX.CellObject;
        if (typeof cell?.v !== "string") throw new Error("Invalid trait option cell.");

        rv.push({ name: cell.v.trim(), value: getValueFromValueCell(sheet, right(it)) });
        it = under(it);
    }
    console.log(rv);
    return rv;
}

function under(address: XLSX.CellAddress, step = 1): XLSX.CellAddress {
    return { ...address, r: address.r + step };
}
function right(address: XLSX.CellAddress, step = 1): XLSX.CellAddress {
    return { ...address, c: address.c + step };
}

// interface DefinedSheet extends XLSX.Sheet {
//     "!rows": Array<XLSX.ColInfo>;
// }

class DeclarationSheet {
    protected readonly declarationSheet?: XLSX.Sheet;
    public readonly invalidTraitOptions: Array<string> = [];
    public readonly traitLocations: Map<string, XLSX.CellAddress> = new Map();
    public static readonly DECLARATIONS: string[] = ["invalidTraitOption", "traitLocation"];
    constructor(declarationSheet?: XLSX.Sheet) {
        this.declarationSheet = declarationSheet;
        if (this.declarationSheet === undefined) return;
        const origin = { r: 0, c: 0 };
        let it = origin;
        let cell = this.declarationSheet[XLSX.utils.encode_cell(it)] as XLSX.CellObject | undefined;
        while (isValidDeclarationName(cell)) {
            this.parseDeclaration(cell.v, (at) => {
                if (this.declarationSheet === undefined) throw new Error("Undefined declaration sheet.");
                const cell =
                    (this.declarationSheet[XLSX.utils.encode_cell(right(it, at + 1))] as XLSX.CellObject) || undefined;
                return cell == undefined
                    ? {
                          v: "",
                          t: "s",
                      }
                    : cell;
            });
            it = under(it);
            cell = this.declarationSheet[XLSX.utils.encode_cell(it)] as XLSX.CellObject | undefined;
        }
    }

    protected parseDeclaration(name: string, argAt: (at: number) => XLSX.CellObject): void {
        const parser = this.parsers[name];
        if (typeof parser !== "function") throw new Error("Invalid declaration name or undefined parser.");
        return parser(argAt);
    }
    protected parseInvalidTraitOption(argAt: (at: number) => XLSX.CellObject): void {
        for (let i = 0, arg = argAt(i); isNotEmpty(arg); i++, arg = argAt(i)) {
            this.invalidTraitOptions.push(arg.v);
        }
    }
    protected parseTraitLocation(argAt: (at: number) => XLSX.CellObject): void {
        const nameCell = argAt(0);
        const locationCell = argAt(1);
        if (!isNotEmpty(nameCell) || !isNotEmpty(locationCell)) return;
        this.traitLocations.set(nameCell.v, XLSX.utils.decode_cell(locationCell.v));
    }
    protected readonly parsers: Record<string, (argAt: (at: number) => XLSX.CellObject) => void> = {
        invalidTraitOption: (argAt) => {
            return this.parseInvalidTraitOption(argAt);
        },
        traitLocation: (argAt) => {
            return this.parseTraitLocation(argAt);
        }
    }
    public isValidTraitOptionName(name: string): boolean {
        return !this.invalidTraitOptions.includes(name);
    }
}

function isValidDeclarationName(cell: XLSX.CellObject | undefined): cell is XLSX.CellObject & { v: string } {
    return (
        cell != undefined &&
        cell.v !== undefined &&
        typeof cell.v === "string" &&
        DeclarationSheet.DECLARATIONS.includes(cell.v.trim())
    );
}

function isNotEmpty(cell: XLSX.CellObject | undefined): cell is XLSX.CellObject & { v: string } {
    return cell != undefined && cell.v !== undefined && typeof cell.v === "string" && cell.v.trim() !== "";
}