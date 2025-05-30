import { getDrumsSvg, getNoteSvg } from "../../utils/icons.js";

/**
 * @this {SynthetizerUI}
 */
export function setEventListeners()
{
    // add event listeners
    this.synth.eventHandler.addEvent("programchange", "synthui-program-change", e =>
    {
        const p = this.controllers[e.channel].preset;
        p.set(`${e.bank}:${e.program}`);
    });
    
    this.synth.eventHandler.addEvent("allcontrollerreset", "synthui-all-controller-reset", () =>
    {
        for (const controller of this.controllers)
        {
            for (const meter of Object.values(controller.controllerMeters))
            {
                meter.update(meter.defaultValue);
            }
        }
    });
    
    this.synth.eventHandler.addEvent("controllerchange", "synthui-controller-change", e =>
    {
        const controller = e.controllerNumber;
        const channel = e.channel;
        const value = e.controllerValue;
        const con = this.controllers[channel];
        if (con === undefined)
        {
            return;
        }
        const meter = con.controllerMeters[controller];
        if (meter !== undefined)
        {
            meter.update(value);
        }
    });
    
    this.synth.eventHandler.addEvent("pitchwheel", "synthui-pitch-wheel", e =>
    {
        const val = (e.MSB << 7) | e.LSB;
        // pitch wheel
        this.controllers[e.channel].pitchWheel.update(val - 8192);
    });
    
    this.synth.eventHandler.addEvent("drumchange", "synthui-drum-change", e =>
    {
        this.controllers[e.channel].drumsToggle.innerHTML = (e.isDrumChannel ? getDrumsSvg(32) : getNoteSvg(32));
        const preset = this.controllers[e.channel].preset;
        preset.reload(e.isDrumChannel ? this.percussionList : this.instrumentList);
        preset.set(preset.value);
    });
    
    this.synth.eventHandler.addEvent("newchannel", "synthui-new-channel", () =>
    {
        this.appendNewController(this.controllers.length);
        this.showControllerGroup(this.groupSelector.value);
        this.hideControllers();
    });
}