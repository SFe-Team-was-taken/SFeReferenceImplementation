# SFe reference implementation progress report

Some of the numbers may be arbitrary.

### Total progress: 40%

### Section 5

- [x] 5.1 File format extensions
    - SpessaSynth now accepts .sf4.
- [x] 5.2 RIFF-type format structures
    - Handles ds64 properly when using a RIFF64-specific chunk load function.
    - Todo: merge RIFF/RIFF64/RIFD functions into one function
- [ ] 5.3 Chunk header types: 90% complete
    - Detects `sfen` header and gives warning ("stub").
    - Can read structure of 64-bit static but not yet tested with large >4GB files, should work? 
- [ ] 5.5.4 String encoding: Not started
    - UTF-8 is not usable in `ICMT`.
    - Need to make UTF-8 decoder.
- [x] 5.6.1 ifil handling
- [ ] 5.6.4 isng handling: Not started
    - SpessaSynth does not currently use the `isng` value.
    - This would be used to enable/disable the LSB handler/SpessaSynth's "quirks mode".
    - The automatic soundfont creator has been updated to make SFe banks.
- [x] 5.6.6 ICRD handling
- [ ] 5.6.7 Other sub-chunks: Not started
    - SpessaSynth is already unaffected by the length limits.
    - This is basically just adding UTF-8 support to these fields.
    - Requires the UTF-8 decoder, which will be started later.
- [ ] 5.6.9 SFty sub-chunk: 50% complete
    - Detects banks that use 8-bit samples or TSC and gives error if found 
    - TSC and 8-bit not supported immediately
    - No need for TSC in initial implementation, would require rewrite of soundfont.js.
- [x] 5.6.10 SFvx sub-chunk
    - Includes error handling for unsupported versions
    - Warns user if file written to draft specification
- [ ] 5.6.11 flag sub-chunk: 50% complete
    - Outputs an array containing the feature flags
    - Flag comparison code not yet started
    - Feature flag detection code should be extensible so it is easy to add new feature branches
- [x] 5.7.1 smpl sub-chunk
    - Because everything is little endian, nothing needs to change!
- [ ] 5.7.3 24 and 32-bit samples: 30% complete
    - 24-bit and 32-bit sample data is now read but not processed yet
    - Limited loading of 8-bit samples implemented
- [ ] 5.7.4 8-bit samples: Not started
    - Not done immediately
- [ ] 5.8.2 Bank select LSB: 50% complete
    - Bank select LSB works properly with all files.
    - In the preset selection popup, bank selects are properly separated.
    - The code still uses a unified bank value and the values need to be separated.
    - Base preset fallback does not yet work properly for LSB values.
    - In the channel list, the bank value is still unified.
    - Todo: Reimplement "XG hacks" for SF2.0x banks as part of "quirks mode".  
    - Todo: Change `wBank` in code to `byBankMSB` and `byBankLSB`.
    - Todo: Change handling of percussion to use byte eight instead of hardcoded "128".
- [ ] 5.8.5 UTF-8 in sdta: Not started
    - Not started

### Section 8

- [x] 8.1 Structurally Unsound errors
    - Program can now properly handle a 64-bit chunk header.
- [ ] 8.3 Duplicated preset locations in bank: Not started
    - Such duplicated preset locations need to also be loaded.
    - Then, it should be possible to switch between them using the interface.
    - A warning must be shown.
    - This implementation is player-specific.
    - By default, use first preset (same way as SF2.04).
    - This is how SpessaSynth currently works.
- [ ] 8.4 Duplicated preset locations across banks: Not started
    - Does this need to be implemented if we're going to replace the soundfontManager system with Banklist?
    - In other words, should we replace soundfontManager with Banklist first?
- [x] 8.5 Undefined chunks
    - These are ignored already.
- [x] 8.6 Unknown enums
    - These are ignored already.
    
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