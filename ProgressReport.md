# SFe reference implementation progress report

Some of the numbers may be arbitrary.

### Total progress: 4%

### Section 5

- [x] 5.1 File format extensions
    - The index files provided now accept .sf4.
    - No other implementation of the SFe format has been completed.
- [ ] 5.2 RIFF-type format structures: Not started
    - Not started
- [ ] 5.3 Chunk header types: 10% complete
    - Detects `sfen` header and gives error ("stub"), because 64-bit headers aren't yet supported.
    - 64-bit development not started
    - RIFX not immediately supported
- [ ] 5.5.4 String encoding: Not started
    - UTF-8 is not usable in `ICMT`.
- [ ] 5.6.1 ifil handling: Not started
    - Not started
- [ ] 5.6.4 isng handling: Not started
    - Not started
- [ ] 5.6.6 ICRD handling: Not started
    - What features can be achieved with standardised ICRD?
    - Should a warning be shown if ICRD is non-standard?
- [ ] 5.6.7 Other sub-chunks: Not started
    - UTF-8 support not started
- [ ] 5.6.9 SFty sub-chunk: Not started
    - Not started
    - TSC and 8-bit not supported immediately
- [ ] 5.6.10 SFvx sub-chunk: Not started
    - Not started
- [ ] 5.6.11 flag sub-chunk: Not started
    - Not started
    - Feature flag detection code should be extensible so it is easy to add new feature branches
- [ ] 5.7.1 smpl sub-chunk: Not started
    - Not started
- [ ] 5.7.3 24 and 32-bit samples: Not started
    - SpessaSynth does not support 24-bit samples
    - This isn't done immediately
- [ ] 5.7.4 8-bit samples: Not started
    - Not done immediately
- [ ] 5.8.2 Bank select LSB: Not started
    - Change wBank in code to byBankMSB and byBankLSB
    - Change handling of percussion to use byte eight instead of hardcoded "128"
- [ ] 5.8.5 UTF-8 in sdta: Not started
    - Not started

### Section 8

- [ ] 8.1 Structurally Unsound errors: Not started
    - Proper handling of 64-bit chunk headers (reference implementation doesn't support 32-bit immediately)
- [ ] 8.3 Duplicated preset locations in bank: Not started
    - How does SpessaSynth handle it?
- [ ] 8.4 Duplicated preset locations across banks: Not started
    - How does SpessaSynth handle it?
- [ ] 8.5 Undefined chunks
    - How does SpessaSynth handle it?
- [ ] 8.6 Unknown enums
    - How does SpessaSynth handle it?
    - Test with SFCF and Viena

### Section 9

- [ ] 9.2 SiliconSFe headers: Not started
    - This isn't done immediately
- [ ] 9.3 AWE ROM emulator: Not started
    - This isn't done immediately

### Section 11

- [ ] 11.2.1 SF2-to-SFe: Not started
    - Not started
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