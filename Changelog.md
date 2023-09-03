# Changelog
All notable changes to this project will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2023-09-03
- Added support for most class DCs!

## [1.7.8] - 2023-09-01
- Fixed compatibility with Pathfinder 5.3.x+ (#26, #28, thanks @surged20)
- Improved text for flanked condition

## [1.7.6] - 2023-05-31
- Fixed armor/ac error for pf2e v4.12 (#23 and #22, see PR #24, thanks @adyoungblood!)
- 1.7.7 - marked as compatible with V11 

## [1.7.5] - 2023-05-23
- Fixed "localization" of a 3p module string

## [1.7.4] - 2023-05-05
- Added "Proficiency Without Level" string to ignored modifiers list, to be more compatible with pf2e-flatten

## [1.7.3] - 2023-04-19
- Fixed flanking flat-footed condition appearing twice (#21)

## [1.7.2] - 2023-04-12
- Fixed undefined targetedToken.actor TypeError

## [1.7.1] - 2023-04-08
- Fixed MM not working on unlinked tokens (#20)
- Added Traditional Chinese localization (#18, #19)

## [1.7.0] - 2023-03-27
- New features! Will now show DC modifiers on spell, skill, and perception DCs, not just AC (#12, #13)
- - (note that class DCs are still not included;  not easy to identify which actor they belong to) 
- Refactored code to make things even clearer (sometimes) 

## [1.6.0] - 2023-03-25
- Added modifiersMatter hook to allow integration
- Fixed accidental minor bug - console excludePatterns was popped each time

## [1.5.4] - 2023-03-07
- Added default ignore to some popular houserule-based bonuses: Spell Potency and Skill Potency
- Added Resilient armor bonuses to ignored modifiers (by ignoring armor item bonuses to saves) (#17)
- Added Simplified Chinese localization (#15)

## [1.5.3] - 2022-11-01
- Refactored AC condition code to directly use actor AC modifiers rather than items
- Added support for Forbidding Ward effect
- Added Drakeheart Mutagen to default list of ignored modifiers

## [1.5.2] - 2022-09-25
- Added "Modifier" to ignored modifiers list (shown for NPCs)

## [1.5.1] - 2022-09-17
- Added Doubling Rings to ignored modifiers list

## [1.5.0] - 2022-08-07
- Upgrade to V10 compatibility

## [1.4.6] - 2022-07-21
- Added battle form spells to ignore list

## [1.4.5] - 2022-07-03
- Fixed some conditions that broke in recent PF2e system update
- Fixed handling for the new "transparent" tag styles

## [1.4.3] - 2022-06-03
- Fixed bug that sometimes miscolored unnecessary modifiers

## [1.4.2] - 2022-04-19
- Added "Always show defense conditions" setting (#10)

## [1.4.1] - 2022-04-18
- Added handling for toggled rule-element effects that alter AC.  For example, the Kobold Warrior's Hurried Retreat.

## [1.4.0] - 2022-03-03
- Added setting to customize ignored modifiers ("additional ignored labels")
- Added familiar master-based save bonuses to ignored modifiers list
- Fixed PF2e v3.5.x compatibility (#9)

## [1.3.2] - 2022-02-25
- Added localization support for French
- Simplified AC modifier styling and changed it to say "Target has: (<conditions>)"
- 1.3.1 Fixed build
- 1.3.2 Improved handling of missing localization keys

## [1.2.1] - 2022-02-20
- Fixed cover calculation for NPCs

## [1.2.0] - 2022-02-20
- Added support for different languages (mostly)
- Fixed wrong flat-footed check (#6)
- Added support for Raise a Shield and for feats/items with rule elements (e.g. Nimble Dodge)
- Re-added support for Cover
- Fixed handling of multiple modifiers of the same type

## [1.1.2] - 2022-02-13
- Fixed compatibility with new automatic flanking (PF2e system 3.4.0)
- Improved behavior in case of future AC format errors

## [1.1.1] - 2022-02-06
- Added ignored modifiers: skill potency, flurry

## [1.1.0] - 2022-01-27
- Fixed attack rolls not being correctly highlighted (#4, #5)
- Added "Ignore Crit Fail over Fail on Attacks" setting.

## [1.0.7] - 2021-12-24
- Removed "Enable module" setting (it was redundant)
- Marked as compatible with Foundry v9.

## [1.0.6] - 2021-12-15
- Renamed to "Pf2E Modifiers Matter"
- Added Elite, Weak, and Handwraps of Mighty Blows to list of ignored modifiers

## [1.0.4] - 2021-11-23
- Fixed compatibility issue with Pf2e Tweaks by Ustin (#3)

## [1.0.3] - 2021-11-23
- Potential bug fix

## [1.0.2] - 2021-11-22
- Added more ignored potency bonus modifiers and slightly improved localization

## [1.0.1] - 2021-11-21
- Added 'Devise a Stratagem' and 'Wild Shape' to ignored modifiers list
- Added some extra logging

## [1.0.0] - 2021-11-01
- Publicly released module! \o/

## [0.3.2] - 2021-11-01
- Fixed bug (#1)

## [0.3.1] - 2021-10-31
- Improved logic and algorithm
- Renamed to "PF2e Modifiers Matter"
 
## [0.2.0] - 2021-10-30
- Fixed some issues and added support for cover
 
## [0.1.0] - 2021-10-30
- Created the module
- (Thanks Sionth#5174 for coming up with a name!)

## See also: [Unreleased]

[0.2.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/0.1.0...0.2.0
[0.3.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/0.2.0...0.3.1
[0.3.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/0.3.1...0.3.2
[1.0.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/0.3.2...1.0.0
[1.0.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.0...1.0.1
[1.0.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.1...1.0.2
[1.0.3]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.2...1.0.3
[1.0.4]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.3...1.0.4
[1.0.6]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.4...1.0.6
[1.0.7]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.6...1.0.7
[1.1.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.0.7...1.1.0
[1.1.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.1.0...1.1.1
[1.1.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.1.1...1.1.2
[1.2.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.1.2...1.2.0
[1.2.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.2.0...1.2.1
[1.3.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.2.1...1.3.2
[1.4.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.3.2...1.4.0
[1.4.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.4.0...1.4.1
[1.4.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.4.1...1.4.2
[1.4.3]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.4.2...1.4.3
[1.4.5]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.4.3...1.4.5
[1.4.6]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.4.5...1.4.6
[1.5.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.4.6...1.5.0
[1.5.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.5.0...1.5.1
[1.5.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.5.1...1.5.2
[1.5.3]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.5.2...1.5.3
[1.5.4]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.5.3...1.5.4
[1.6.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.5.4...1.6.0
[1.7.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.6.0...1.7.0
[1.7.1]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.0...1.7.1
[1.7.2]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.1...1.7.2
[1.7.3]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.2...1.7.3
[1.7.4]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.3...1.7.4
[1.7.5]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.4...1.7.5
[1.7.6]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.5...1.7.6
[1.7.7]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.6...1.7.7
[1.7.8]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.7...1.7.8
[1.8.0]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.7.8...1.8.0
[Unreleased]: https://github.com/shemetz/pf2e-modifiers-matter/compare/1.8.0...HEAD
