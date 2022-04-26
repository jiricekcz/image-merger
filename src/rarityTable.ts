export class RarityTable<T extends string = string> {
    public readonly TRAIT_VALUES: Set<T>;
    public readonly TRAITS: Array<T>;
    public readonly traits: Map<T, Trait> = new Map<T, Trait>();
    constructor(traits: Array<T>, traitsOrder: Array<T> = traits) {
        this.TRAIT_VALUES = new Set(traits);
        this.TRAITS = traitsOrder;
    }
    public declareTrait<R extends T, O extends string>(trait: R, options: TraitOptions<O>): void {
        if (!this.TRAIT_VALUES.has(trait)) throw new Error(`Trait ${trait} is not declared in the rarity table.`);
        if (this.traits.has(trait)) throw new Error(`Trait ${trait} is already declared in the rarity table.`);
        this.traits.set(trait, new Trait(options));
    }
    public randomTokenTraits(random: () => number = Math.random, order: Array<T> = this.TRAITS): TokenTraits<T> {
        const traits: TokenTraits<T> = new TokenTraits(order);
        for (const trait of this.TRAIT_VALUES) {
            const t = this.traits.get(trait);
            if (!t) throw new Error(`Missing trait ${trait}`);
            traits.set(trait, t.randomOption(random).name);
        }
        return traits;
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
    public randomOption(random: () => number = Math.random): Option<O> {
        let rnd = random();
        for (const option of this.options.keys()) {
            if (rnd < option.value) return option;
            rnd -= option.value;
        }
        throw new Error("This should never happen.");
    }
}
export class TokenTraits<T extends string = string> extends Map<T, string> {
    public readonly ALL_TRAITS: Array<T>;
    constructor(allTraits: Array<T>) {
        super();
        this.ALL_TRAITS = allTraits;
    }
    toLayerArray(): Array<Layer> {
        const rv: Array<Layer> = [];
        for (const trait of this.ALL_TRAITS) {
            const value = this.get(trait);
            if (!value) continue;
            rv.push({name: trait, value});
        }
        return rv;
    }

}
export interface Layer {
    readonly name: string;
    readonly value: string;
}
export interface Option<T extends string = string> {
    name: T;
    value: number;
}
export type TraitOptions<T extends string = string> = Array<Option<T>>;
