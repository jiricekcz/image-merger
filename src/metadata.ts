import { promises as fs } from "fs";
import path from "path";
export class MetadataBuilder {
    public readonly tokens: Array<Token> = [];
    public readonly description: string;
    public readonly name: string;

    public readonly backgroundColor?: string;
    public readonly youtubeUrl?: string;

    public readonly baseImageUrl?: string;
    public readonly baseImageExtension?: string;

    public readonly baseAnimationUrl?: string;
    public readonly baseAnimationExtension?: string;

    public readonly baseExternalUrl?: string;
    public readonly baseExternalUrlExtention?: string;
    constructor(name: string, description: string, options?: MetadataBuilderOptions) {
        this.name = name;
        this.description = description;
        this.backgroundColor = options?.backgroundColor;
        this.youtubeUrl = options?.youtubeUrl;

        this.baseImageUrl = options?.baseImageUrl;
        this.baseImageExtension = options?.baseImageExtension;

        this.baseAnimationUrl = options?.baseAnimationUrl;
        this.baseAnimationExtension = options?.baseAnimationExtension;

        this.baseExternalUrl = options?.baseExternalUrl;
        this.baseExternalUrlExtention = options?.baseExternalUrlExtention;
    }
    addToken(token: Token): void {
        this.tokens.push(token);
    }
    public *tokenObjects(): IterableIterator<TokenMetadata> {
        for (const token of this.tokens) {
            yield token.toJSON();
        }
    }
    public *metadataFiles(): IterableIterator<string> {
        for (const token of this.tokens) {
            yield JSON.stringify(token);
        }
    }
    public *metadata(): IterableIterator<File> {
        for (const token of this.tokens) {
            yield {
                name: token.getFilename(),
                content: JSON.stringify(token),
            };
        }
    }
    public async save(filepath: string): Promise<void> {
        const ps: Array<Promise<void>> = [];
        for (const { name, content } of this.metadata()) {
            ps.push(fs.writeFile(path.join(filepath, name), content));
        }
        await Promise.all(ps);
    }
}

export interface File {
    name: string;
    content: string;
}
export class Token {
    protected readonly builder: MetadataBuilder;
    public readonly tokenID: number;

    public readonly description?: string;
    public readonly name?: string;
    public readonly backgroundColor?: string;
    public readonly youtubeUrl?: string;

    public readonly imageUrl?: string;
    public readonly imageExtension?: string;

    public readonly animationUrl?: string;
    public readonly animationExtension?: string;

    public readonly externalUrl?: string;
    public readonly externalUrlExtension?: string;

    public readonly attributes: TokenAttributes = [];
    constructor(builder: MetadataBuilder, tokenID: number, options?: TokenOptions) {
        this.builder = builder;
        this.tokenID = tokenID;

        this.description = options?.description;
        this.name = options?.name;
        this.backgroundColor = options?.backgroundColor;
        this.youtubeUrl = options?.youtubeUrl;

        this.imageUrl = options?.imageUrl;
        this.imageExtension = options?.imageExtension;

        this.animationUrl = options?.animationUrl;
        this.animationExtension = options?.animationExtension;

        this.externalUrl = options?.externalUrl;
        this.externalUrlExtension = options?.externalUrlExtension;
    }
    public getDescription(): string {
        if (this.description) return this.description;
        return this.builder.description;
    }
    public getImageUrl(): string {
        let ext: string;
        if (this.imageUrl) {
            if (this.imageExtension) throw new Error("Cannot provide image extension if image url is provided.");
            return this.imageUrl;
        } else if (!this.builder.baseImageUrl)
            throw new Error("You must either provide a base image url or provide a url for each token.");

        if (this.imageExtension) {
            ext = this.imageExtension;
        } else if (this.builder.baseImageExtension) {
            ext = this.builder.baseImageExtension;
        } else
            throw new Error("You must either provide a base image extension or provide an extension for each token.");

        return `${this.builder.baseImageUrl}${this.getTokenID()}.${ext}`;
    }
    public getName(): string {
        if (this.name) return this.name;
        return `${this.builder.name} #${this.getTokenID().toString()}`;
    }
    public getTokenID(): number {
        return this.tokenID;
    }
    public getAttributes(): TokenAttributes {
        return this.attributes;
    }

    public getAnimationUrl(): string | undefined {
        if (this.animationUrl) {
            if (this.animationExtension)
                throw new Error("Cannot provide animation extension if animation url is provided.");
            return this.animationUrl;
        }
        let ext: string;
        if (this.animationExtension) ext = this.animationExtension;
        else if (this.builder.baseAnimationExtension) ext = this.builder.baseAnimationExtension;
        else return undefined;

        if (!this.builder.baseAnimationUrl) return undefined;
        return `${this.builder.baseAnimationUrl}${this.getTokenID()}.${ext}`;
    }
    public getBackgroundColor(): string | undefined {
        if (this.backgroundColor) return this.backgroundColor;
        if (this.builder.backgroundColor) return this.builder.backgroundColor;
        return undefined;
    }
    public getExternalUrl(): string | undefined {
        if (this.externalUrl) {
            if (this.externalUrlExtension)
                throw new Error("Cannot provide external url extension if external url is provided.");
            return this.externalUrl;
        }
        let ext: string;
        if (this.externalUrlExtension) ext = this.externalUrlExtension;
        else if (this.builder.baseExternalUrlExtention) ext = this.builder.baseExternalUrlExtention;
        else return undefined;

        if (!this.builder.baseExternalUrl) return undefined;
        return `${this.builder.baseExternalUrl}${this.getTokenID()}.${ext}`;
    }
    public getYoutubeUrl(): string | undefined {
        if (this.youtubeUrl) return this.youtubeUrl;
        if (this.builder.youtubeUrl) return this.builder.youtubeUrl;
        return undefined;
    }
    public addAttribute(attribute: TokenAttribute): void {
        if (
            this.attributes.find(
                (a) => isNamedAttribute(a) && isNamedAttribute(attribute) && a.trait_type === attribute.trait_type
            )
        )
            throw new Error("Attribute already exists.");
        if (isNumericAttribue(attribute) && attribute.value > attribute.max_value)
            throw new Error("Attribute value cannot be greater than max value.");
        this.attributes.push(attribute);
    }
    public toJSON(): TokenMetadata {
        return {
            description: this.getDescription(),
            image: this.getImageUrl(),
            name: this.getName(),
            tokenID: this.getTokenID(),
            attributes: this.attributes,
            animation_url: this.getAnimationUrl(),
            background_color: this.getBackgroundColor(),
            external_url: this.getExternalUrl(),
            youtube_url: this.getYoutubeUrl(),
        };
    }
    public getFilename(): string {
        return `${this.getTokenID()}.json`;
    }

    public static fromJSON(builder: MetadataBuilder, json: TokenMetadata): ImportedToken {
        return new ImportedToken(builder, json);
    }
    public static async fromFile(builder: MetadataBuilder, filepath: string): Promise<ImportedToken> {
        const json = JSON.parse((await fs.readFile(filepath)).toString()) as TokenMetadata;

        return new ImportedToken(builder, json);
    }
}
/**
 * Acts as an imported token from a json File.
 * **WARN**: All metadata provided in json file will override the metadata provided in the builder.
 */
export class ImportedToken extends Token {
    constructor(metadataBuilder: MetadataBuilder, metadata: TokenMetadata) {
        super(metadataBuilder, metadata.tokenID, {
            description: metadata.description,
            name: metadata.name,
            backgroundColor: metadata.background_color,
            youtubeUrl: metadata.youtube_url,
            imageUrl: metadata.image,
            animationUrl: metadata.animation_url,
            externalUrl: metadata.external_url,
        });
        for (const attribute of metadata.attributes) {
            this.addAttribute(attribute);
        }
    }
}
export function isNamedAttribute(attribute: TokenAttribute): attribute is NamedAttribute {
    return "trait_type" in attribute;
}
export function areNamedAttributes(attributes: TokenAttribute[]): attributes is NamedAttribute[] {
    return attributes.every(isNamedAttribute);
}
export function isNumericAttribue(attribute: TokenAttribute): attribute is NumericAttribute {
    return "trait_type" in attribute && "value" in attribute && "max_value" in attribute;
}

interface TokenOptions {
    description?: string;
    name?: string;
    backgroundColor?: string;
    youtubeUrl?: string;

    imageUrl?: string;
    imageExtension?: string;

    animationUrl?: string;
    animationExtension?: string;

    externalUrl?: string;
    externalUrlExtension?: string;
}
export interface MetadataBuilderOptions {
    backgroundColor?: string;
    youtubeUrl?: string;

    baseImageUrl?: string;
    baseImageExtension?: string;

    baseAnimationUrl?: string;
    baseAnimationExtension?: string;

    baseExternalUrl?: string;
    baseExternalUrlExtention?: string;
}
export interface TokenMetadata {
    description: string;
    tokenID: number;
    name: string;
    image: string;
    animation_url?: string;
    external_url?: string;
    background_color?: string;
    youtube_url?: string;
    attributes: TokenAttributes;
}
export interface UnnamedAttribute {
    value: string;
}
/**
 * Generic trait.
 */
export interface BaseAttribute<N extends string | number = string | number> {
    trait_type: string;
    value: N;
}
/**
 * Generic numeric trait.
 * Displayed as a bar. Max value defines full bar value.
 */
export interface NumericAttribute extends BaseAttribute<number> {
    max_value: number;
}
/**
 * A numeric trait displayed in a circle
 */
export interface CircleNumericAttribute extends NumericAttribute {
    display_type: "number";
}
/**
 * A numeric trait displayed as circle progress bar. Max value defines full bar value.
 */
export interface BoostNumericAttribute extends NumericAttribute {
    display_type: "boost_number";
}
/**
 * A numeric trait displayed as a circle progress bar. Max value defines full bar value. Value is in percent.
 */
export interface BoostPercentageAttribute extends NumericAttribute {
    display_type: "boost_percentage";
}
/**
 * A date trait. Value is a unix timestamp in seconds.
 */
export interface DateAttribure extends BaseAttribute<number> {
    display_type: "date";
}
export type NamedAttribute =
    | NumericAttribute
    | CircleNumericAttribute
    | BoostNumericAttribute
    | BoostPercentageAttribute
    | DateAttribure;
export type TokenAttribute = UnnamedAttribute | NamedAttribute;

export type TokenAttributes = Array<TokenAttribute>;
