export const exportAudio = {
    button: {
        title: "音声を保存",
        description: "音声をWAV、MIDI、SF2、またはRMIファイルとして保存"
    },

    formats: {
        title: "フォーマットを選択",
        formats: {
            wav: {
                button: {
                    title: "WAV音声",
                    description: "変更を加えた曲を.wavファイルとしてエクスポートします"
                },
                options: {
                    title: "音声エクスポートオプション",
                    confirm: "エクスポート",
                    normalizeVolume: {
                        title: "音量の正規化",
                        description: "MIDIの音量にかかわらず、音量を一定に保ちます。推奨設定です。",
                    },
                    additionalTime: {
                        title: "追加時間（秒）",
                        description: "音がフェードアウトするために曲の最後に追加する時間です。 (秒)",
                    }
                },
                exportMessage: {
                    message: "音声をエクスポートしています...",
                    estimated: "残り時間:"
                }
            },

            midi: {
                button: {
                    title: "変更されたMIDI",
                    description: "コントローラーと楽器の変更が適用されたMIDIファイルをエクスポートします"
                }
            },

            soundfont: {
                button: {
                    title: "トリミングされたサウンドフォント",
                    description: "MIDIファイルで使用されている楽器とサンプルだけにトリミングされたサウンドフォントをエクスポートします"
                },
                options: {
                    title: "SFエクスポートオプション",
                    confirm: "エクスポート",
                    compress: {
                        title: "圧縮",
                        description: "未圧縮のサンプルをOgg Vorbisのロス圧縮で圧縮します。ファイルサイズが大幅に削減されます。" +
                            "サウンドフォントがすでに圧縮されている場合は、このオプションを無効にしても再圧縮されることはありません"
                    },
                    quality: {
                        title: "圧縮品質",
                        description: "圧縮の品質です。高いほど良い"
                    }
                }
            },

            rmidi: {
                button: {
                    title: "埋め込まれたMIDI (.rmi)",
                    description: "変更されたMIDIとトリミングされたサウンドフォントを1つのファイルに埋め込んでエクスポートします。 " +
                        "この形式は広くサポートされていないことに注意してください"
                },
                progress: {
                    title: "埋め込まれたMIDIをエクスポート中...",
                    loading: "サウンドフォントとMIDIを読み込み中...",
                    modifyingMIDI: "MIDIを修正中...",
                    modifyingSoundfont: "サウンドフォントをトリミング中...",
                    saving: "RMIDIを保存中...",
                    done: "完了しました！"
                },
                options: {
                    title: "RMIDIエクスポートオプション",
                    confirm: "エクスポート",
                    compress: {
                        title: "圧縮",
                        description: "サウンドフォントをOgg Vorbisのロス圧縮で圧縮します。ファイルサイズが大幅に削減されます。推奨設定です。"
                    },
                    quality: {
                        title: "圧縮品質",
                        description: "圧縮の品質です。高いほど良い"
                    }
                }
            }
        }
    }
}