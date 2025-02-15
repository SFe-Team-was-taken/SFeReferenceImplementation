# SFe reference implementation progress report

Some of the numbers may be arbitrary.

### Total progress: 12%

### Section 5

- [x] 5.1 File format extensions
    - SpessaSynth now accepts .sf4.
- [ ] 5.2 RIFF-type format structures: Not started
    - Not started
- [ ] 5.3 Chunk header types: 10% complete
    - Detects `sfen` header and gives error ("stub"), because 64-bit headers aren't yet supported.
    - 64-bit development not started
    - RIFX not immediately supported
- [ ] 5.5.4 String encoding: Not started
    - UTF-8 is not usable in `ICMT`.
- [x] 5.6.1 ifil handling
    - Can detect a value of 1024 or above.
    - ISFe-list handling not started yet.
- [ ] 5.6.4 isng handling: Not started
    - Not started
- [ ] 5.6.6 ICRD handling: Not started
    - What features can be achieved with standardised ICRD?
    - Should a warning be shown if ICRD is non-standard?
- [ ] 5.6.7 Other sub-chunks: Not started
    - UTF-8 support not started
- [ ] 5.6.9 SFty sub-chunk: 50% complete
    - Detects banks that use 8-bit samples or TSC and gives error if found 
    - TSC and 8-bit not supported immediately
- [x] 5.6.10 SFvx sub-chunk
    - Includes error handling for unsupported versions
    - Warns user if file written to draft specification
- [ ] 5.6.11 flag sub-chunk: 50% complete
    - Outputs an array containing the feature flags
    - Flag comparison code not yet started
    - Feature flag detection code should be extensible so it is easy to add new feature branches
- [ ] 5.7.1 smpl sub-chunk: Not started
    - Not started
- [ ] 5.7.3 24 and 32-bit samples: Not started
    - SpessaSynth does not support 24-bit samples
    - This isn't done immediately
- [ ] 5.7.4 8-bit samples: Not started
    - Not done immediately
- [ ] 5.8.2 Bank select LSB: 50% complete
    - Bank select LSB works properly with all files.
    - In the preset selection popup, bank selects are properly separated.
    - The code still uses a unified bank value and the values need to be separated.
    - Base preset fallback does not yet work properly for LSB values.
    - In the channel list, the bank value is still unified.
    - This is a reference implementation and should not include any "XG hacks".
    - Todo: Change wBank in code to byBankMSB and byBankLSB.
    - Todo: Change handling of percussion to use byte eight instead of hardcoded "128".
- [ ] 5.8.5 UTF-8 in sdta: Not started
    - Not started

### Section 8

- [ ] 8.1 Structurally Unsound errors: Not started
    - Proper handling of 64-bit chunk headers (reference implementation doesn't support 64-bit immediately)
- [ ] 8.3 Duplicated preset locations in bank: Not started
    - Such duplicated preset locations need to also be loaded.
    - Then, it should be possible to switch between them using the interface.
    - A warning must be shown.
    - This implementation is player-specific.
    - By default, use first preset (same way as SF2.04).
- [ ] 8.4 Duplicated preset locations across banks: Not started
    - Does this need to be implemented if we're going to replace the soundfontManager system with Banklist?
    - In other words, should we replace soundfontManager with Banklist first?
- [x] 8.5 Undefined chunks
    - These are ignored already.
- [x] 8.6 Unknown enums
    - These are ignored already.

### Section 9

- [ ] 9.2 SiliconSFe headers: Not started
    - This isn't done immediately
    - Cacodemon feedback suggests that this can wait quite a bit.
- [ ] 9.3 AWE ROM emulator: Not started
    - This isn't done immediately
    - We need examples of old SF2.0x banks that used ROM samples.
    - Once that is done, we can test the AWE ROM emulator.
    - Reference implementation samples are already available!

### Section 11

- [ ] 11.2.1 SF2-to-SFe: Not started
    - Add ability for RIFF writer to write nested LIST chunks
- [ ] 11.2.2 SFe-to-SF2.04: Not started
    - Not started
    - Must add 24-bit support first
- [ ] 11.2.3 SFe-to-SF2.01: Not started
    - Not started
- [ ] 11.3.1 32bit-to-64bit: Not started
    - 64bit not supported yet
- [ ] 11.3.2 64bit-to-32bit: Not started
    - 64bit not supported yet
- [ ] 11.3.3 32bit-to-RIFX: Not started
    - Might not be necessary(?)
    - Despite being the case, it would be as simple as byteswapping everything to big-endian.
    - Is it necessary to byteswap the samples to big-endian as well?