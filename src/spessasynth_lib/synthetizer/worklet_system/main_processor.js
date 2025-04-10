import { WorkletSequencer } from "../../sequencer/worklet_sequencer/worklet_sequencer.js";
import { SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { voiceKilling } from "./worklet_methods/stopping_notes/voice_killing.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    masterParameterType,
    returnMessageType
} from "./message_protocol/worklet_message.js";
import { stbvorbis } from "../../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { VOLUME_ENVELOPE_SMOOTHING_FACTOR } from "./worklet_utilities/volume_envelope.js";
import { callEvent } from "./message_protocol/message_sending.js";
import { systemExclusive } from "./worklet_methods/system_exclusive.js";
import { setMasterGain, setMasterPan, setMIDIVolume } from "./worklet_methods/controller_control/master_parameters.js";
import { resetAllControllers } from "./worklet_methods/controller_control/reset_controllers.js";
import { WorkletSoundfontManager } from "./worklet_methods/worklet_soundfont_manager/worklet_soundfont_manager.js";
import { interpolationTypes } from "./worklet_utilities/wavetable_oscillator.js";
import { WorkletKeyModifierManager } from "./worklet_methods/worklet_key_modifier.js";
import { getWorkletVoices } from "./worklet_utilities/worklet_voice.js";
import { PAN_SMOOTHING_FACTOR } from "./worklet_utilities/stereo_panner.js";
import { stopAllChannels } from "./worklet_methods/stopping_notes/stop_all_channels.js";
import { setEmbeddedSoundFont } from "./worklet_methods/soundfont_management/set_embedded_sound_font.js";
import { reloadSoundFont } from "./worklet_methods/soundfont_management/reload_sound_font.js";
import { clearSoundFont } from "./worklet_methods/soundfont_management/clear_sound_font.js";
import { sendPresetList } from "./worklet_methods/soundfont_management/send_preset_list.js";
import { getPreset } from "./worklet_methods/soundfont_management/get_preset.js";
import { transposeAllChannels } from "./worklet_methods/tuning_control/transpose_all_channels.js";
import { setMasterTuning } from "./worklet_methods/tuning_control/set_master_tuning.js";
import { applySynthesizerSnapshot } from "./snapshot/apply_synthesizer_snapshot.js";
import { createWorkletChannel } from "./worklet_methods/create_worklet_channel.js";
import { FILTER_SMOOTHING_FACTOR } from "./worklet_utilities/lowpass_filter.js";
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from "../synth_constants.js";
import { fillWithDefaults } from "../../utils/fill_with_defaults.js";
import { DEFAULT_SEQUENCER_OPTIONS } from "../../sequencer/default_sequencer_options.js";
import { getEvent, messageTypes } from "../../midi_parser/midi_message.js";
import { IndexedByteArray } from "../../utils/indexed_array.js";


/**
 * @typedef {"gm"|"gm2"|"gs"|"xg"} SynthSystem
 */

/**
 * worklet_processor.js
 * purpose: manages the synthesizer (and worklet sequencer) from the AudioWorkletGlobalScope and renders the audio data
 */

// if the note is released faster than that, it forced to last that long
// this is used mostly for drum channels, where a lot of midis like to send instant note off after a note on
export const MIN_NOTE_LENGTH = 0.03;
// this sounds way nicer for an instant hi-hat cutoff
export const MIN_EXCLUSIVE_LENGTH = 0.07;

export const SYNTHESIZER_GAIN = 1.0;


// the core synthesis engine of spessasynth.
class SpessaSynthProcessor
{
    
    /**
     * Cached voices for all presets for this synthesizer.
     * Nesting goes like this:
     * this.cachedVoices[bankNumber][programNumber][midiNote][velocity] = a list of workletvoices for that.
     * @type {WorkletVoice[][][][][]}
     */
    cachedVoices = [];
    
    /**
     * Synth's device id: -1 means all
     * @type {number}
     */
    deviceID = ALL_CHANNELS_OR_DIFFERENT_ACTION;
    
    /**
     * Synth's event queue from the main thread
     * @type {{callback: function(), time: number}[]}
     */
    eventQueue = [];
    
    /**
     * Interpolation type used
     * @type {interpolationTypes}
     */
    interpolationType = interpolationTypes.fourthOrder;
    
    /**
     * The sequencer attached to this processor
     * @type {WorkletSequencer}
     */
    sequencer = new WorkletSequencer(this);
    
    /**
     * Global transposition in semitones
     * @type {number}
     */
    transposition = 0;
    
    /**
     * this.tunings[program][key] = tuning
     * @type {MTSProgramTuning[]}
     */
    tunings = [];
    
    
    /**
     * Bank offset for things like embedded RMIDIS. Added for every program change
     * @type {number}
     */
    soundfontBankOffset = 0;
    
    
    /**
     * The volume gain, set by user
     * @type {number}
     */
    masterGain = SYNTHESIZER_GAIN;
    
    /**
     * The volume gain, set by MIDI sysEx
     * @type {number}
     */
    midiVolume = 1;
    
    /**
     * Reverb linear gain
     * @type {number}
     */
    reverbGain = 1;
    /**
     * Chorus linear gain
     * @type {number}
     */
    chorusGain = 1;
    
    /**
     * Maximum number of voices allowed at once
     * @type {number}
     */
    voiceCap = VOICE_CAP;
    
    /**
     * (-1 to 1)
     * @type {number}
     */
    pan = 0.0;
    /**
     * the pan of the left channel
     * @type {number}
     */
    panLeft = 0.5;
    
    /**
     * the pan of the right channel
     * @type {number}
     */
    panRight = 0.5;
    
    /**
     * forces note killing instead of releasing
     * @type {boolean}
     */
    highPerformanceMode = false;
    
    /**
     * Handlese custom key overrides: velocity and preset
     * @type {WorkletKeyModifierManager}
     */
    keyModifierManager = new WorkletKeyModifierManager();
    
    /**
     * Overrides the main soundfont (embedded, for example)
     * @type {BasicSoundBank}
     */
    overrideSoundfont = undefined;
    
    /**
     * contains all the channels with their voices on the processor size
     * @type {WorkletProcessorChannel[]}
     */
    workletProcessorChannels = [];
    
    /**
     * Controls the bank selection & SysEx
     * @type {SynthSystem}
     */
    system = DEFAULT_SYNTH_MODE;
    /**
     * Current total voices amount
     * @type {number}
     */
    totalVoicesAmount = 0;
    
    /**
     * Synth's default (reset) preset
     * @type {BasicPreset}
     */
    defaultPreset;
    
    defaultPresetUsesOverride = false;
    
    /**
     * Synth's default (reset) drum preset
     * @type {BasicPreset}
     */
    drumPreset;
    
    defaultDrumsUsesOverride = false;
    
    /**
     * Controls if the worklet processor is fully initialized
     * @type {Promise<boolean>}
     */
    processorInitialized = stbvorbis.isInitialized;
    
    /**
     * Current audio time
     * @type {number}
     */
    currentSynthTime = 0;
    
    /**
     * in hertz
     * @type {number}
     */
    sampleRate;
    
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param midiChannels {number}
     * @param soundfont {ArrayBuffer}
     * @param enableEventSystem {boolean}
     * @param startRenderingData {StartRenderingDataConfig}
     * @param postCallback {function(data: WorkletReturnMessage)}
     * @param sampleRate {number}
     * @param initialTime {number}
     * @param effectsEnabled {boolean}
     */
    constructor(midiChannels,
                soundfont,
                enableEventSystem,
                startRenderingData,
                postCallback,
                sampleRate,
                initialTime = 0,
                effectsEnabled = true)
    {
        /**
         * Midi output count
         * @type {number}
         */
        this.midiOutputsCount = midiChannels;
        /**
         * are the chorus and reverb effects enabled?
         * @type {boolean}
         */
        this.effectsEnabled = effectsEnabled;
        let initialChannelCount = this.midiOutputsCount;
        /**
         * @type {function(WorkletReturnMessage)}
         */
        this.postCallback = postCallback;
        
        this.currentSynthTime = initialTime;
        this.sampleRate = sampleRate;
        
        /**
         * Sample time in seconds
         * @type {number}
         */
        this.sampleTime = 1 / sampleRate;
        
        this.enableEventSystem = enableEventSystem && typeof postCallback === "function";
        
        
        for (let i = 0; i < 127; i++)
        {
            this.tunings.push([]);
        }
        
        try
        {
            /**
             * @type {WorkletSoundfontManager}
             */
            this.soundfontManager = new WorkletSoundfontManager(
                soundfont,
                this.postReady.bind(this)
            );
        }
        catch (e)
        {
            this.post({
                messageType: returnMessageType.soundfontError,
                messageData: e
            });
            throw e;
        }
        this.sendPresetList();
        
        this.getDefaultPresets();
        
        
        for (let i = 0; i < initialChannelCount; i++)
        {
            this.createWorkletChannel(false);
        }
        
        this.workletProcessorChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.workletProcessorChannels[DEFAULT_PERCUSSION].drumChannel = true;
        
        // these smoothing factors were tested on 44,100 Hz, adjust them to target sample rate here
        this.volumeEnvelopeSmoothingFactor = VOLUME_ENVELOPE_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.panSmoothingFactor = PAN_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.filterSmoothingFactor = FILTER_SMOOTHING_FACTOR * (44100 / sampleRate);
        
        /**
         * The snapshot that synth was restored from
         * @type {SynthesizerSnapshot|undefined}
         * @private
         */
        this._snapshot = startRenderingData?.snapshot;
        
        // if sent, start rendering
        if (startRenderingData)
        {
            if (this._snapshot !== undefined)
            {
                this.applySynthesizerSnapshot(this._snapshot);
                this.resetAllControllers();
            }
            
            SpessaSynthInfo("%cRendering enabled! Starting render.", consoleColors.info);
            if (startRenderingData.parsedMIDI)
            {
                if (startRenderingData?.loopCount !== undefined)
                {
                    this.sequencer.loopCount = startRenderingData?.loopCount;
                    this.sequencer.loop = true;
                }
                else
                {
                    this.sequencer.loop = false;
                }
                // set voice cap to unlimited
                this.voiceCap = Infinity;
                this.processorInitialized.then(() =>
                {
                    /**
                     * set options
                     * @type {SequencerOptions}
                     */
                    const seqOptions = fillWithDefaults(
                        startRenderingData.sequencerOptions,
                        DEFAULT_SEQUENCER_OPTIONS
                    );
                    this.sequencer.skipToFirstNoteOn = seqOptions.skipToFirstNoteOn;
                    this.sequencer.preservePlaybackState = seqOptions.preservePlaybackState;
                    // autoplay is ignored
                    this.sequencer.loadNewSongList([startRenderingData.parsedMIDI]);
                });
            }
        }
        
        this.postReady();
    }
    
    /**
     * @returns {number}
     */
    get currentGain()
    {
        return this.masterGain * this.midiVolume;
    }
    
    getDefaultPresets()
    {
        // override this to XG, to set the default preset to NOT be XG drums!
        const sys = this.system;
        this.system = "xg";
        this.defaultPreset = this.getPreset(0, 0);
        this.defaultPresetUsesOverride = this.overrideSoundfont?.presets?.indexOf(this.defaultPreset) >= 0;
        this.system = sys;
        this.drumPreset = this.getPreset(128, 0);
        this.defaultDrumsUsesOverride = this.overrideSoundfont?.presets?.indexOf(this.drumPreset) >= 0;
    }
    
    /**
     * @param value {SynthSystem}
     */
    setSystem(value)
    {
        this.system = value;
        this.post({
            messageType: returnMessageType.masterParameterChange,
            messageData: [masterParameterType.midiSystem, this.system]
        });
    }
    
    /**
     * @param bank {number}
     * @param program {number}
     * @param midiNote {number}
     * @param velocity {number}
     * @returns {WorkletVoice[]|undefined}
     */
    getCachedVoice(bank, program, midiNote, velocity)
    {
        return this.cachedVoices?.[bank]?.[program]?.[midiNote]?.[velocity];
    }
    
    /**
     * @param bank {number}
     * @param program {number}
     * @param midiNote {number}
     * @param velocity {number}
     * @param voices {WorkletVoice[]}
     */
    setCachedVoice(bank, program, midiNote, velocity, voices)
    {
        // make sure that it exists
        if (!this.cachedVoices)
        {
            this.cachedVoices = [];
        }
        if (!this.cachedVoices[bank])
        {
            this.cachedVoices[bank] = [];
        }
        if (!this.cachedVoices[bank][program])
        {
            this.cachedVoices[bank][program] = [];
        }
        if (!this.cachedVoices[bank][program][midiNote])
        {
            this.cachedVoices[bank][program][midiNote] = [];
        }
        
        // cache
        this.cachedVoices[bank][program][midiNote][velocity] = voices;
    }
    
    
    /**
     * @param data {WorkletReturnMessage}
     * @param force {boolean}
     */
    post(data, force = false)
    {
        if (!this.enableEventSystem && !force)
        {
            return;
        }
        if (this.postCallback)
        {
            this.postCallback(data);
        }
    }
    
    postReady()
    {
        // ensure stbvorbis is fully initialized
        this.processorInitialized.then(() =>
        {
            // post-ready cannot be constrained by the event system
            this.post({
                messageType: returnMessageType.isFullyInitialized,
                messageData: undefined
            }, true);
            SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
        });
    }
    
    debugMessage()
    {
        SpessaSynthInfo({
            channels: this.workletProcessorChannels,
            voicesAmount: this.totalVoicesAmount
        });
    }
    
    /**
     * Renders the float32 audio data
     * @param reverbChannels {Float32Array[]} reverb stereo channels
     * @param chorusChannels {Float32Array[]} chorus stereo channels
     * @param separateChannels {Float32Array[][]} a total of 16 stereo pairs for each MIDI channel
     */
    renderAudio(reverbChannels, chorusChannels, separateChannels)
    {
        // process the sequencer playback
        this.sequencer.processTick();
        
        // process event queue
        const time = this.currentSynthTime;
        while (this.eventQueue[0]?.time <= time)
        {
            this.eventQueue.shift().callback();
        }
        const revL = reverbChannels[0];
        const revR = reverbChannels[1];
        const chrL = chorusChannels[0];
        const chrR = chorusChannels[1];
        
        // for every channel
        this.totalVoicesAmount = 0;
        this.workletProcessorChannels.forEach((channel, index) =>
        {
            if (channel.voices.length < 1 || channel.isMuted)
            {
                // there's nothing to do!
                return;
            }
            let voiceCount = channel.voices.length;
            const ch = index % 16;
            
            // render to the appropriate output
            channel.renderAudio(
                separateChannels[ch][0], separateChannels[ch][1],
                revL, revR,
                chrL, chrR
            );
            
            this.totalVoicesAmount += channel.voices.length;
            // if voice count changed, update voice amount
            if (channel.voices.length !== voiceCount)
            {
                channel.sendChannelProperty();
            }
        });
        
        // advance the time appropriately
        this.currentSynthTime += separateChannels[0][0].length * this.sampleTime;
    }
    
    destroySynthProcessor()
    {
        this.workletProcessorChannels.forEach(c =>
        {
            delete c.midiControllers;
            delete c.voices;
            delete c.sustainedVoices;
            delete c.lockedControllers;
            delete c.preset;
            delete c.customControllers;
        });
        delete this.cachedVoices;
        delete this.workletProcessorChannels;
        delete this.sequencer.midiData;
        delete this.sequencer;
        this.soundfontManager.destroyManager();
        delete this.soundfontManager;
    }
    
    /**
     * @param channel {number}
     * @param controllerNumber {number}
     * @param controllerValue {number}
     * @param force {boolean}
     */
    controllerChange(channel, controllerNumber, controllerValue, force = false)
    {
        this.workletProcessorChannels[channel].controllerChange(controllerNumber, controllerValue, force);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param velocity {number}
     */
    noteOn(channel, midiNote, velocity)
    {
        this.workletProcessorChannels[channel].noteOn(midiNote, velocity);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     */
    noteOff(channel, midiNote)
    {
        this.workletProcessorChannels[channel].noteOff(midiNote);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param pressure {number}
     */
    polyPressure(channel, midiNote, pressure)
    {
        this.workletProcessorChannels[channel].polyPressure(midiNote, pressure);
    }
    
    /**
     * @param channel {number}
     * @param pressure {number}
     */
    channelPressure(channel, pressure)
    {
        this.workletProcessorChannels[channel].channelPressure(pressure);
    }
    
    /**
     * @param channel {number}
     * @param MSB {number}
     * @param LSB {number}
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.workletProcessorChannels[channel].pitchWheel(MSB, LSB);
    }
    
    /**
     * @param channel {number}
     * @param programNumber {number}
     */
    programChange(channel, programNumber)
    {
        this.workletProcessorChannels[channel].programChange(programNumber);
    }
    
    /**
     * @param message {Uint8Array}
     * @param channelOffset {number}
     * @param force {boolean} cool stuff
     * @param options {SynthMethodOptions}
     */
    processMessage(message, channelOffset, force, options)
    {
        const call = () =>
        {
            const statusByteData = getEvent(message[0]);
            
            const channel = statusByteData.channel + channelOffset;
            // process the event
            switch (statusByteData.status)
            {
                case messageTypes.noteOn:
                    const velocity = message[2];
                    if (velocity > 0)
                    {
                        this.noteOn(channel, message[1], velocity);
                    }
                    else
                    {
                        this.noteOff(channel, message[1]);
                    }
                    break;
                
                case messageTypes.noteOff:
                    if (force)
                    {
                        this.workletProcessorChannels[channel].killNote(message[1]);
                    }
                    else
                    {
                        this.noteOff(channel, message[1]);
                    }
                    break;
                
                case messageTypes.pitchBend:
                    this.pitchWheel(channel, message[2], message[1]);
                    break;
                
                case messageTypes.controllerChange:
                    this.controllerChange(channel, message[1], message[2], force);
                    break;
                
                case messageTypes.programChange:
                    this.programChange(channel, message[1]);
                    break;
                
                case messageTypes.polyPressure:
                    this.polyPressure(channel, message[0], message[1]);
                    break;
                
                case messageTypes.channelPressure:
                    this.channelPressure(channel, message[1]);
                    break;
                
                case messageTypes.systemExclusive:
                    this.systemExclusive(new IndexedByteArray(message.slice(1)), channelOffset);
                    break;
                
                case messageTypes.reset:
                    this.stopAllChannels(true);
                    this.resetAllControllers();
                    break;
                
                default:
                    break;
            }
        };
        
        const time = options.time;
        if (time > this.currentSynthTime)
        {
            this.eventQueue.push({
                callback: call.bind(this),
                time: time
            });
            this.eventQueue.sort((e1, e2) => e1.time - e2.time);
        }
        else
        {
            call();
        }
    }
}

// include other methods
// voice related
SpessaSynthProcessor.prototype.voiceKilling = voiceKilling;
SpessaSynthProcessor.prototype.getWorkletVoices = getWorkletVoices;

// message port related
SpessaSynthProcessor.prototype.callEvent = callEvent;

// system-exclusive related
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

// channel related
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;
SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;

// master parameter related
SpessaSynthProcessor.prototype.setMasterGain = setMasterGain;
SpessaSynthProcessor.prototype.setMasterPan = setMasterPan;
SpessaSynthProcessor.prototype.setMIDIVolume = setMIDIVolume;

// tuning related
SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;

// program related
SpessaSynthProcessor.prototype.getPreset = getPreset;
SpessaSynthProcessor.prototype.reloadSoundFont = reloadSoundFont;
SpessaSynthProcessor.prototype.clearSoundFont = clearSoundFont;
SpessaSynthProcessor.prototype.setEmbeddedSoundFont = setEmbeddedSoundFont;
SpessaSynthProcessor.prototype.sendPresetList = sendPresetList;

// snapshot related
SpessaSynthProcessor.prototype.applySynthesizerSnapshot = applySynthesizerSnapshot;

export { SpessaSynthProcessor };