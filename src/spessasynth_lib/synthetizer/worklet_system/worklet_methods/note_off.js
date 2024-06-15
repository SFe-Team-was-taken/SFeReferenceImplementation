/**
 * Release a note
 * @param channel {number}
 * @param midiNote {number}
 * @this {SpessaSynthProcessor}
 */
export function noteOff(channel, midiNote)
{
    if(midiNote > 127 || midiNote < 0)
    {
        console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
        return;
    }

    // if high performance mode, kill notes instead of stopping them
    if(this.highPerformanceMode)
    {
        // if the channel is percussion channel, do not kill the notes
        if(!this.workletProcessorChannels[channel].drumChannel)
        {
            this.killNote(channel, midiNote);
            return;
        }
    }

    const channelVoices = this.workletProcessorChannels[channel].voices;
    channelVoices.forEach(v => {
        if(v.midiNote !== midiNote || v.isInRelease === true)
        {
            return;
        }
        // if hold pedal, move to sustain
        if(this.workletProcessorChannels[channel].holdPedal) {
            this.workletProcessorChannels[channel].sustainedVoices.push(v);
        }
        else
        {
            this.releaseVoice(v);
        }
    });
    this.callEvent("noteoff", {
        midiNote: midiNote,
        channel: channel
    });
}