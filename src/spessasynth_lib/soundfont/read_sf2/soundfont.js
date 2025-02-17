import { IndexedByteArray } from "../../utils/indexed_array.js";
import { readSamples } from "./samples.js";
import { readLittleEndian } from "../../utils/byte_functions/little_endian.js";
import { readGenerators } from "./generators.js";
import { InstrumentZone, readInstrumentZones, readPresetZones } from "./zones.js";
import { readPresets } from "./presets.js";
import { readInstruments } from "./instruments.js";
import { readModulators } from "./modulators.js";
import { readRIFFChunk, RiffChunk } from "../basic_soundfont/riff_chunk.js";
import { consoleColors } from "../../utils/other.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthLogging, SpessaSynthWarn } from "../../utils/loggin.js";
import { readBytesAsString } from "../../utils/byte_functions/string.js";
import { stbvorbis } from "../../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { BasicSoundFont } from "../basic_soundfont/basic_soundfont.js";
import { Generator } from "../basic_soundfont/generator.js";
import { Modulator } from "../basic_soundfont/modulator.js";

/**
 * soundfont.js
 * purpose: parses a soundfont2 (or sfe) file
 */

export class SoundFont2 extends BasicSoundFont
{
    /**
     * Initializes a new SoundFont2/SFe Parser and parses the given data array
     * @param arrayBuffer {ArrayBuffer}
     * @param warnDeprecated {boolean}
     */
    constructor(arrayBuffer, warnDeprecated = true)
    {
        super();
        if (warnDeprecated)
        {
            console.warn("Using the constructor directly is deprecated. Use loadSoundFont instead.");
        }
        this.dataArray = new IndexedByteArray(arrayBuffer);
        SpessaSynthGroup("%cParsing SoundFont...", consoleColors.info);
        if (!this.dataArray)
        {
            SpessaSynthGroupEnd();
            this.parsingError("No data provided!");
        }
        
        // read the main read
        let firstChunk = readRIFFChunk(this.dataArray, false);
        
        if (firstChunk.header.toLowerCase() !== "riff" && firstChunk.header.toLowerCase() !== "rf64")
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid chunk header! Expected "RIFF" or "RF64" got "${chunk.header.toLowerCase()}"`);
        } else if (firstChunk.header.toLowerCase() === "rifx") {
            SpessaSynthGroupEnd();
            throw new SyntaxError("Big-endian SFe banks are not yet supported.");
        }
        
        const type = readBytesAsString(this.dataArray, 4).toLowerCase();

        /*
        Some SF2Pack description:
        this is essentially sf2, but the entire smpl chunk is compressed (we only support ogg vorbis here)
        and the only other difference is that the main chunk isn't "sfbk" but rather "sfpk"
         */
        const isSF2Pack = type === "sfpk";
        /*
        SFe with 64-bit static or dynamic chunk headers (later) uses an "sfen" main chunk instead of "sfbk".
        */
        const isSFe64 = (type === "sfen" && firstChunk.header.toLowerCase() === "rf64");

        if (type !== "sfbk" && type !== "sfpk" && type !== "sfen")
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid soundFont! Expected "sfbk", "sfpk" or "sfen" got "${type}"`);
        } else if (type === "sfen") {
            SpessaSynthWarn(`Main chunk "sfen" found. The file may be incompatible with SpessaSynth.`);
        } else if (type === "sfbk" && firstChunk.header.toLowerCase() === "rf64") {
            SpessaSynthWarn(`Main chunk must be "sfen" when 64-bit chunk headers are in use.`);
        }

        if (isSFe64)
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`SFe files with 64-bit chunk headers are currently unsupported!`);
        }

        // INFO
        let infoChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(infoChunk, "list");
        readBytesAsString(infoChunk.chunkData, 4);
        
        let bank_format;
        let infoValid = false;
        let text;
        let flags = [];

        while (infoChunk.chunkData.length > infoChunk.chunkData.currentIndex)
        {
            let chunk = readRIFFChunk(infoChunk.chunkData);
            let verMaj;
            let verMin;
            let date_value;
            let time_value;

            // special cases
            switch (chunk.header.toLowerCase())
            {
                case "ifil":
                    verMaj = readLittleEndian(chunk.chunkData, 2);
                    verMin = readLittleEndian(chunk.chunkData, 2);
                    this.soundFontInfo[chunk.header + `.verMaj`] = verMaj;
                    this.soundFontInfo[chunk.header + `.verMin`] = verMin;
                    if (this.soundFontInfo["ifil.verMin"] >= 1024)
                        { 
                            bank_format = "SFe";
                            SpessaSynthInfo(
                                "%cSFe bank detected.",
                                consoleColors.info
                            );
                        } else if ((this.soundFontInfo["ifil.verMin"] == 4)) {
                            bank_format = "SoundFont 2.04";
                            infoValid = true;
                        } else if ((this.soundFontInfo["ifil.verMin"] == 1)) {
                            bank_format = "SoundFont 2.01";
                            infoValid = true;
                        } else if ((this.soundFontInfo["ifil.verMin"] == 0)) {
                            bank_format = "SoundFont 2.00";
                            infoValid = true;
                        } else {
                            bank_format = "Unknown";
                            infoValid = true;
                            SpessaSynthWarn("Unrecognised ifil version");
                        }
                        this.soundFontInfo["BankFormat"] = bank_format;
                        SpessaSynthInfo(
                            `%c"${"BankFormat"}": %c"${bank_format}"`,
                            consoleColors.info,
                            consoleColors.recognized
                        );
                        break;
                case "iver":
                    verMaj = readLittleEndian(chunk.chunkData, 2);
                    verMin = readLittleEndian(chunk.chunkData, 2);
                    this.soundFontInfo[chunk.header + `.verMaj`] = verMaj;
                    this.soundFontInfo[chunk.header + `.verMin`] = verMin;
                    break;
                case "icrd":
                    let testChar;
                    if (chunk.size == 12 || chunk.size == 22)
                    {
                        let year = readBytesAsString(chunk.chunkData, 4, undefined, false); // yyyy 
                        testChar = readBytesAsString(chunk.chunkData, 1, undefined, false); // "-"
                        this.verifyTextWarn(testChar, '-'); 
                        let month = readBytesAsString(chunk.chunkData, 2, undefined, false); // mm 
                        testChar = readBytesAsString(chunk.chunkData, 1, undefined, false); // "-"
                        this.verifyTextWarn(testChar, '-'); 
                        let day = readBytesAsString(chunk.chunkData, 2, undefined, false); // dd 
                        date_value = `${year}-${month}-${day}`

                        this.soundFontInfo[chunk.header + `.date`] = date_value;
                        if (chunk.size == 22)
                        {
                            testChar = readBytesAsString(chunk.chunkData, 1, undefined, false); // "T"
                            this.verifyTextWarn(testChar, 'T'); 
                            let hour = readBytesAsString(chunk.chunkData, 2, undefined, false); // hh 
                            testChar = readBytesAsString(chunk.chunkData, 1, undefined, false); // ":"
                            this.verifyTextWarn(testChar, ':'); 
                            let minute = readBytesAsString(chunk.chunkData, 2, undefined, false); // mm
                            testChar = readBytesAsString(chunk.chunkData, 1, undefined, false); // ":"
                            this.verifyTextWarn(testChar, ':'); 
                            let second = readBytesAsString(chunk.chunkData, 2, undefined, false); // ss
                            readBytesAsString(chunk.chunkData, 1, undefined, false); // optional letter
                            time_value = `${hour}:${minute}:${second}`

                            this.soundFontInfo[chunk.header + `.time`] = time_value;
                        } else {
                            SpessaSynthInfo("Date-only icrd, assuming midnight for time");
                            this.soundFontInfo[chunk.header + `.time`] = "00:00:00";
                        }
                    } else {
                        text = readBytesAsString(chunk.chunkData, chunk.chunkData.length, undefined, false);
                        SpessaSynthWarn(`icrd not in ISO 8601 format: "${text}"`)
                        // Todo: Proper error handling
                    }

                case "icmt":
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length, undefined, false);
                    this.soundFontInfo[chunk.header] = text;
                    break;
                
                // dmod: default modulators
                case "dmod":
                    const newModulators = readModulators(chunk);
                    newModulators.pop(); // remove the terminal record
                    text = `Modulators: ${newModulators.length}`;
                    // override default modulators
                    const oldDefaults = this.defaultModulators;
                    
                    this.defaultModulators = newModulators;
                    this.defaultModulators.push(...oldDefaults.filter(m => !this.defaultModulators.find(mm => Modulator.isIdentical(
                        m,
                        mm
                    ))));
                    this.soundFontInfo[chunk.header] = chunk.chunkData;
                    break;
                case "list":
                    let list_name = new IndexedByteArray(chunk.chunkData.buffer.slice(chunk.chunkData, chunk.chunkData.currentIndex + 4));
                    let list_name_string = readBytesAsString(list_name, 4, undefined, false);
                    // special cases
                    switch (list_name_string.toLowerCase())
                    {
                        case "isfe":
                            if (bank_format === "SFe")
                            {
                                SpessaSynthInfo(
                                    "%cISFe sub-chunk detected, reading chunk...",
                                    consoleColors.info
                                )
                                infoValid = true;
                            } else {
                                SpessaSynthWarn("ISFe sub-chunk detected, but ifil version corresponds to soundfont2.")
                            }
                        default:
                            ;     
                        }
                    chunk.chunkData.currentIndex += 4;

                    while (chunk.chunkData.length > chunk.chunkData.currentIndex)
                    {
                        let nestedChunk = readRIFFChunk(chunk.chunkData);
                        let text;

                        switch (nestedChunk.header.toLowerCase()) {
                            case "sfty":
                                text = readBytesAsString(nestedChunk.chunkData, nestedChunk.chunkData.length);
                                this.soundFontInfo[nestedChunk.header] = text;
                                if (text === "SFe-static")
                                {
                                    SpessaSynthInfo(
                                        `%c"${list_name_string + `.` + nestedChunk.header}": %c"${text}"`,
                                        consoleColors.info,
                                        consoleColors.recognized
                                    );
                                } else if (text === "SFe-static (8-bit)") 
                                {
                                    SpessaSynthGroupEnd();
                                    throw new SyntaxError(`8-bit sample mode is currently unsupported.`);
                                } else {
                                    SpessaSynthGroupEnd();
                                    throw new SyntaxError(`Unsupported SFe bank type: "${text}"`);
                                }
                                break;
                            case "sfvx":
                                let sfeVerMaj = readLittleEndian(nestedChunk.chunkData, 2);
                                if (sfeVerMaj > 4) { // To do: add a global variable declaring the highest supported internal SFe version number.
                                    SpessaSynthGroupEnd();
                                    throw new SyntaxError(`Unsupported SFe version found: SFe "${sfeVerMaj}"`);
                                }
                                let sfeVerMin = readLittleEndian(nestedChunk.chunkData, 2);
                                if (sfeVerMin > 0) { // To do: add a global variable declaring the highest supported internal SFe version number.
                                    SpessaSynthGroupEnd();
                                    throw new SyntaxError(`Unsupported SFe version found: SFe "${sfeVerMaj}.${sfeVerMin}"`);
                                }
                                let sfeSpecType = readBytesAsString(nestedChunk.chunkData, 20, undefined, false);
                                if (sfeSpecType !== "Final") {
                                    SpessaSynthWarn("This SFe file was written to a draft specification.");
                                }
                                let sfeDraft = readLittleEndian(nestedChunk.chunkData, 2);
                                let sfeVerStr = readBytesAsString(nestedChunk.chunkData, 20, undefined, false);
                                this.soundFontInfo[nestedChunk.header + `.sfeVerMaj`] = sfeVerMaj;
                                this.soundFontInfo[nestedChunk.header + `.sfeVerMin`] = sfeVerMin;
                                this.soundFontInfo[nestedChunk.header + `.sfeSpecType`] = sfeSpecType;
                                this.soundFontInfo[nestedChunk.header + `.sfeDraft`] = sfeDraft;
                                this.soundFontInfo[nestedChunk.header + `.sfeVerStr`] = sfeVerStr;
                                SpessaSynthInfo(
                                    `%c"${list_name_string + `.` + nestedChunk.header + `.sfeVerMaj`}": %c"${sfeVerMaj}"`,
                                    consoleColors.info,
                                    consoleColors.recognized
                                );
                                SpessaSynthInfo(
                                    `%c"${list_name_string + `.` + nestedChunk.header + `.sfeVerMin`}": %c"${sfeVerMin}"`,
                                    consoleColors.info,
                                    consoleColors.recognized
                                );
                                SpessaSynthInfo(
                                    `%c"${list_name_string + `.` + nestedChunk.header + `.sfeSpecType`}": %c"${sfeSpecType}"`,
                                    consoleColors.info,
                                    consoleColors.recognized
                                );
                                SpessaSynthInfo(
                                    `%c"${list_name_string + `.` + nestedChunk.header + `.sfeDraft`}": %c"${sfeDraft}"`,
                                    consoleColors.info,
                                    consoleColors.recognized
                                );
                                SpessaSynthInfo(
                                    `%c"${list_name_string + `.` + nestedChunk.header + `.sfeVerStr`}": %c"${sfeVerStr}"`,
                                    consoleColors.info,
                                    consoleColors.recognized
                                );
                                break;
                            case "flag":
                                if ((nestedChunk.size % 6) != 0)
                                {
                                    SpessaSynthGroupEnd();
                                    throw new SyntaxError(`Bad flag chunk size expected multiple of 6 got "${nestedChunk.size}"`);
                                } else {
                                    while (nestedChunk.chunkData.length > nestedChunk.chunkData.currentIndex)
                                    {
                                        let branch = readLittleEndian(nestedChunk.chunkData, 1);
                                        let leaf = readLittleEndian(nestedChunk.chunkData, 1);
                                        let flagValue = readLittleEndian(nestedChunk.chunkData, 4);
                                        let featureFlag = [branch, leaf, flagValue];
                                        flags.push(featureFlag);
                                    }
                                }
                                break;
                            default:
                                text = readBytesAsString(nestedChunk.chunkData, nestedChunk.chunkData.length);
                                this.soundFontInfo[nestedChunk.header] = text;
        
                                SpessaSynthInfo(
                                    `%c"${list_name_string + `.` + nestedChunk.header}": %c"${text}"`,
                                    consoleColors.info,
                                    consoleColors.recognized
                                );
                        }
                    }
                    break;
                default:
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length);
                    this.soundFontInfo[chunk.header] = text;
            }
            switch (chunk.header.toLowerCase())
            {
                case "ifil":
                case "iver":
                    SpessaSynthInfo(
                        `%c"${chunk.header + `.verMaj`}": %c"${verMaj}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    SpessaSynthInfo(
                        `%c"${chunk.header + `.verMin`}": %c"${verMin}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    break;
                case "icrd":
                    SpessaSynthInfo(
                        `%c"${chunk.header + `.date`}": %c"${date_value}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                    SpessaSynthInfo(
                        `%c"${chunk.header + `.time`}": %c"${time_value}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
                case "list":
                    break;
                default:
                    SpessaSynthInfo(
                        `%c"${chunk.header}": %c"${text}"`,
                        consoleColors.info,
                        consoleColors.recognized
                    );
            }
        }

        if (infoValid == false)
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`No ISFe chunk found in SFe file.`);
        }

        // SDTA
        const sdtaChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(sdtaChunk, "list");
        this.verifyText(readBytesAsString(this.dataArray, 4), "sdta");
        
        // smpl
        let sampleDataChunk = readRIFFChunk(this.dataArray, false);
        if (this.soundFontInfo["ISFe.SFty"] == `SFe-static (8-bit)`)
        {
            SpessaSynthInfo("%c8-bit sample mode activated, ignoring smpl chunk...", consoleColors.warn);
        } else {
            SpessaSynthInfo("%cVerifying smpl chunk...", consoleColors.warn);
            this.verifyHeader(sampleDataChunk, "smpl");
        }

        /**
         * @type {IndexedByteArray|Float32Array}
         */
        let sampleData;
        // SF2Pack: the entire data is compressed
        if (isSF2Pack)
        {
            SpessaSynthInfo(
                "%cSF2Pack detected, attempting to decode the smpl chunk...",
                consoleColors.info
            );
            try
            {
                /**
                 * @type {Float32Array}
                 */
                sampleData = stbvorbis.decode(this.dataArray.buffer.slice(
                    this.dataArray.currentIndex,
                    this.dataArray.currentIndex + sampleDataChunk.size
                )).data[0];
            }
            catch (e)
            {
                SpessaSynthGroupEnd();
                throw new Error(`SF2Pack Ogg Vorbis decode error: ${e}`);
            }
            SpessaSynthInfo(
                `%cDecoded the smpl chunk! Length: %c${sampleData.length}`,
                consoleColors.info,
                consoleColors.value
            );
        }
        else
        {
            /**
             * @type {IndexedByteArray}
             */
            sampleData = this.dataArray;
            this.sampleDataStartIndex = this.dataArray.currentIndex;
        }
        
        SpessaSynthInfo(
            `%cSkipping sample chunk, length: %c${sampleDataChunk.size}`,
            consoleColors.info,
            consoleColors.value
        );
        this.dataArray.currentIndex += sampleDataChunk.size;
        
        console.log(sdtaChunk.size - sampleDataChunk.size);

        if ((sdtaChunk.size - sampleDataChunk.size) > 12) // Other chunks found
        {
            // sm24
            // This code could probably be way more elegant, but for now let's make something that works.
            let sample24DataChunk = readRIFFChunk(this.dataArray, false);
            if (sample24DataChunk.header === "sm24")
            {
                if ((this.soundFontInfo["ifil.verMaj"] == 2 && this.soundFontInfo["ifil.verMin"] <= 1) || this.soundFontInfo["ifil.verMaj"] == 3) // Mixed compressed/non-compressed 24-bit samples are not supported for now.
                {
                    SpessaSynthInfo(
                        `%cifil value does not support 24-bit samples, ignoring sm24 chunk...`,
                        consoleColors.info,
                        consoleColors.value
                    );
                } else {
                    /**
                     * @type {IndexedByteArray}
                     */
                    let sample24Data = this.dataArray;
                    this.sample24DataStartIndex = this.dataArray.currentIndex;
                    SpessaSynthInfo(
                        `%cSkipping 24-bit sample chunk, length: %c${sample24DataChunk.size}`,
                        consoleColors.info,
                        consoleColors.value
                    );
                    this.dataArray.currentIndex += sample24DataChunk.size;
                }
            } else if (sample24DataChunk.header === "sm32") // For now, the sm32 chunk must be after the sm24 chunk. 
            {
                SpessaSynthWarn(
                    `%csm32 chunk found, ignoring."`,
                    consoleColors.info,
                    consoleColors.value
                );
            } else {
                SpessaSynthWarn(
                    `%cUnrecognised chunk: "${sample24DataChunk.header}"`,
                    consoleColors.info,
                    consoleColors.value
                );
            }
            if ((sdtaChunk.size - sampleDataChunk.size - sample24DataChunk.size) > 20)
            {
                // sm32
                // There must not be an unknown chunk between sm24 and sm32. 
                let sample32DataChunk = readRIFFChunk(this.dataArray, false);
                if (sample32DataChunk.header === "sm32")
                {
                    if (this.soundFontInfo["ifil.verMaj"] <= 3)
                    {
                        SpessaSynthInfo(
                            `%cifil value does not support 32-bit samples, ignoring sm32 chunk...`,
                            consoleColors.info,
                            consoleColors.value
                        );
                    } else {
                        /**
                         * @type {IndexedByteArray}
                         */
                        let sample32Data = this.dataArray;
                        this.sample32DataStartIndex = this.dataArray.currentIndex;
                        SpessaSynthInfo(
                            `%cSkipping sample chunk, length: %c${sample32DataChunk.size}`,
                            consoleColors.info,
                            consoleColors.value
                        );
                        this.dataArray.currentIndex += sample32DataChunk.size;
                    }
                } else {
                    SpessaSynthWarn(
                        `%cUnrecognised chunk: "${sample32DataChunk.header}"`,
                        consoleColors.info,
                        consoleColors.value
                    );
                }
            }
        } 

        // PDTA
        SpessaSynthInfo("%cLoading preset data chunk...", consoleColors.warn);
        let presetChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(presetChunk, "list");
        readBytesAsString(presetChunk.chunkData, 4);
        
        // read the hydra chunks
        const presetHeadersChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetHeadersChunk, "phdr");
        
        const presetZonesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetZonesChunk, "pbag");
        
        const presetModulatorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetModulatorsChunk, "pmod");
        
        const presetGeneratorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetGeneratorsChunk, "pgen");
        
        const presetInstrumentsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentsChunk, "inst");
        
        const presetInstrumentZonesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentZonesChunk, "ibag");
        
        const presetInstrumentModulatorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentModulatorsChunk, "imod");
        
        const presetInstrumentGeneratorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentGeneratorsChunk, "igen");
        
        const presetSamplesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetSamplesChunk, "shdr");
        
        /**
         * read all the samples
         * (the current index points to start of the smpl read)
         */
        this.dataArray.currentIndex = this.sampleDataStartIndex;
        this.samples.push(...readSamples(presetSamplesChunk, sampleData, !isSF2Pack, 16));
        
        /**
         * read all the instrument generators
         * @type {Generator[]}
         */
        let instrumentGenerators = readGenerators(presetInstrumentGeneratorsChunk);
        
        /**
         * read all the instrument modulators
         * @type {Modulator[]}
         */
        let instrumentModulators = readModulators(presetInstrumentModulatorsChunk);
        
        /**
         * read all the instrument zones
         * @type {InstrumentZone[]}
         */
        let instrumentZones = readInstrumentZones(
            presetInstrumentZonesChunk,
            instrumentGenerators,
            instrumentModulators,
            this.samples
        );
        
        this.instruments = readInstruments(presetInstrumentsChunk, instrumentZones);
        
        /**
         * read all the preset generators
         * @type {Generator[]}
         */
        let presetGenerators = readGenerators(presetGeneratorsChunk);
        
        /**
         * Read all the preset modulatorrs
         * @type {Modulator[]}
         */
        let presetModulators = readModulators(presetModulatorsChunk);
        
        let presetZones = readPresetZones(presetZonesChunk, presetGenerators, presetModulators, this.instruments);
        
        this.presets.push(...readPresets(presetHeadersChunk, presetZones, this.defaultModulators));
        this.presets.sort((a, b) => (a.program - b.program) + (a.bank - b.bank));
        // preload the first preset
        SpessaSynthInfo(
            `%cParsing finished! %c"${this.soundFontInfo["INAM"]}"%c has %c${this.presets.length} %cpresets,
        %c${this.instruments.length}%c instruments and %c${this.samples.length}%c samples.`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info
        );
        SpessaSynthGroupEnd();
        
        if (isSF2Pack)
        {
            delete this.dataArray;
        }
    }

    /**
     * @param chunk {RiffChunk}
     * @param expected {string}
     */
    verifyHeader(chunk, expected)
    {
        if (chunk.header.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid chunk header! Expected "${expected.toLowerCase()}" got "${chunk.header.toLowerCase()}"`);
        }
    }
    
    /**
     * @param text {string}
     * @param expected {string}
     */
    verifyText(text, expected)
    {
        if (text.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            this.parsingError(`Invalid FourCC: Expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"\``);
        }
    }
    
    /**
     * @param text {string}
     * @param expected {string}
     */
    verifyTextWarn(text, expected)
    {
        if (text.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthWarn(`Unexpected text: expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"\``);
        }
    }

    destroySoundfont()
    {
        super.destroySoundfont();
        delete this.dataArray;
    }
}