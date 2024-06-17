import { settingsLocale } from './settings/settings.js'
import { musicPlayerModeLocale } from './music_player_mode.js'
import { synthesizerControllerLocale } from './synthesizer_controller/synthesizer_controller.js'
import { sequencerControllerLocale } from './sequencer_controller.js'

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localeJapanese = {
    localeName: "日本語",
    // title messsage
    titleMessage: "SpessaSynth: SoundFont2 Javascript シンセサイザー",
    demoTitleMessage: "SpessaSynth: SoundFont2 Javascript シンセサイザー オンラインデモ",

    // top bar buttons
    midiUploadButton: "MIDIファイルをアップロード",
    midiRenderButton: "MIDIオーディオをエクスポート",
    exportingAudio: "オーディオをエクスポート中...",

    demoSoundfontUploadButton: "サウンドフォントをアップロード",
    demoGithubPage: "プロジェクトのページ",
    demoBundledSoundfont: "バンドルされたSoundFontを使用 (22MB)",

    outOfMemory: "ブラウザのメモリが不足しました。FirefoxやSF3サウンドフォントの使用を検討してください。\n\n（エラーについてはコンソールを参照してください）。",

    hideTopBar: {
        title: "トップバーを隠す",
        description: "トップ（タイトル）バーを隠して、よりシームレスな体験を提供します",
    },

    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
}