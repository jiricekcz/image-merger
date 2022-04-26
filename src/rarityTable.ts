export class RarityTable<T extends string = string> {
    public readonly TRAIT_VALUES: Set<T>;
    public readonly traits: Map<T, Trait> = new Map<T, Trait>();
    constructor(traits: Array<T>) {
        this.TRAIT_VALUES = new Set(traits);
    }
    public declareTrait<R extends T, O extends string>(trait: R, options: TraitOptions<O>): void {
        if (!this.TRAIT_VALUES.has(trait)) throw new Error(`Trait ${trait} is not declared in the rarity table.`);
        if (this.traits.has(trait)) throw new Error(`Trait ${trait} is already declared in the rarity table.`);
        this.traits.set(trait, new Trait(options));
    }
}
export class Trait<O extends string = string> {
    protected readonly options: Map<Option<O>, number> = new Map();
    constructor(options: TraitOptions<O>) {
        const sum = options.reduce((acc, cur) => acc + cur.value, 0);
        for (const option of options) {
            this.options.set(option, option.value / sum);
        }
    }
}
export interface Option<T extends string = string> {
    name: T;
    value: number;
}
export type TraitOptions<T extends string = string> = Array<Option<T>>;
