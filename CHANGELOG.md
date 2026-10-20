# The Wildsea (Unofficial) - FoundryVTT

## Unreleased

- Add a "Bloodlines, Origins & Posts" compendium ("Stirpi, Origini e Ruoli" with Babele): one entry for each of the 19 bloodlines, 11 origins and 33 posts, listing its traits, gear and companions as links to the Character Aspects compendium
- Add a "Drives, Mires & Milestones" compendium in Italian ("Motivazioni, Fardelli e Avanzamenti" with Babele): the suggested drives and mires from the quick creation of each bloodline, origin and post, plus the rulebook examples of drives, mires and major/minor milestones. Each bloodline, origin and post entry links its suggested drives and mires
- Add a "Temporary Tracks" compendium in Italian ("Tracciati Temporanei" with Babele): the rulebook example bonuses and injuries, the six advancement projects with their track lengths, and 2-box templates for cooked meals, potions and temporary gear. Drag them onto a character sheet to add them to its Temporary Tracks
- Add a "Resources" compendium in Italian ("Risorse" with Babele): the rulebook examples of salvage, specimens, charts and whispers, and the resources suggested by the quick creation of each bloodline, origin and post (linked from their entries). Drag them onto a character sheet to add them to its Resources
- Add a "Passengers" compendium in Italian ("Passeggeri" with Babele): the passengers from the six regions of chapter 11, with short summaries
- Ship sheet: dropping a passenger adds it to Cargo & Passengers
- Character sheet: dropping a bloodline, origin or post on it fills in that Background field instead of creating an item; dropping a drive, mire or milestone adds it to that list (mires with their 2-box track)

## v0.2.9

- Add a "Cargo" compendium in Italian ("Carichi" with Babele): the cargo examples from the rulebook and the cargo left by hazards, as resources tagged "Carico". Descriptions are summaries
- Add a "Factions" compendium in Italian ("Fazioni" with Babele): the twelve factions of the rulebook regions as journal entries, grouped by region, with home territory, goals and a summary
- Ship sheet: dropping a faction entry on it adds a Reputation track for that faction
- Character Aspects compendium: apply the rulebook v1.3 errata. Track lengths: Shard-Cloak 3, Ulcerous Alembic 3, Ridgeback Thick Skin 3, Mechanical Grinder 4, Lightning's Call 4. The Crash aspect Thick Skin is renamed I've Had Worse. Toolbelt now says it consumes salvage, and Multitasker and Ceaseless Tending say you roll once (Italian translations updated too). 19 more track lengths aligned with the Italian rulebook: All So Familiar 3, Arachnid Mobility 3, Archaeodermis 2, Calico Slink 4, Chipping Tools 3, Cramped Conditioning 3, Crushing Blows 4, Docker Threads 4, Drone Attendant 3, Elaborate Beard-Braids 4, Fragments Like Gods 3, Intricate Tattoos 5, Running Quiet 2, Seared Skin 4, Silkwire Coil 5, Sturdy Instrument 4, Tar-Scrawl Tattoos 4, Voltomotive Interfacing 3, Whirl-Crafted Rabir 4
- Ship sheet: dropping a resource on it adds it to Cargo & Passengers (with its tags, except "Carico") instead of creating an item the sheet cannot show

## v0.2.8

- Ship Aspects compendium: group the 58 flat folders into Design, Fittings (Motif, Additions, Rooms, Armaments, Outriders, Airborne, Delving, Gardens, Quiet) and Undercrew (Gangs, Beast Packs, Insect Packs, Officers, each split into Base/Delving/Gardening/Rising), with Italian folder names through Babele
- Character Aspects compendium: folders ordered Bloodline, Origin, Post, Extra; supplement folders moved under Extra and non-standard bloodlines under Bloodline; each bloodline, origin and post split into Traits, Gear and Companions
- Hazards compendium: each category split into Complex and Basic hazards (Complessi/Base); the compendium label is now "Hazards", translated to "Pericoli" through Babele
- Group the system's compendiums in a "The Wildsea" folder in the Compendium sidebar
- Rebuild all compendium packs so they include their LevelDB manifest again, and keep their JSON sources in `src/packs`

## v0.2.7

- Add a "Pericoli" (Hazards) compendium in Italian with the hazards from chapter 10 of the rulebook: 56 complex hazards (with drives, presence, resources, aspects and quirks) and 89 basic hazards, organised by category. Names follow the official Italian rulebook; descriptions are summaries, so keep the book at hand for the full text
- Hazard sheet: add the Leviathan size, a blank size option and the Touch sense to Presence

## v0.2.6

- Use the official Italian names for three translated aspects (Sentinella, Birra d'Acero, Farfalle Coda di Drago Verde)

## v0.2.5

- Add Italian translations of the compendiums (character aspects, ship aspects and the Quick Reference journal), applied through the Babele module

## v0.2.4

- Add Italian translation, using the terminology of the official Italian rulebook

## v0.2.2

- Updated to foundry V14. Removed some erroring code related to chat message posting for rolls.

## v0.2.1

- Fix expanding dice tooltips

## v0.2.0

- Basic FoundryVTT v13 compatibility

## v0.1.3

- Fix Hazard Attribute type on creation

## v0.1.2

- Add enricher for adding placeholder Tracks to journal entries

## v0.1.1

- Add Quick Reference rules Journal
- Attribute tooltips (Mutex)
- Fix access to Depth setting (#37)
- Fix display of ship aspect stake values

## v0.1.0

- FoundryVTT v12 support

## v0.0.14

- Add setting to change UI Track position

## v0.0.13

- Apply ratingMods for non-design ship items

## v0.0.12

- Fix errors in compendium pack entries

## v0.0.11

- Add compendium packs to the CI

## v0.0.10

- Add compendium packs of character and ship aspects

## v0.0.9

- Leaf bullet icon
- Sortable slim items
- Improve UI Track dialog
- Add basic FoundryVTT v12 support
- Use Prosemirror editor for rich text fields
- Minimum Stake cost for ship items is now 0

## v0.0.8

- Allow UI Tracks to be "Open", "Hidden" or "Secret"
- Add drag-drop reordering for UI Tracks

## v0.0.7

- Add UI Tracks

## v0.0.6

- Fix dice roll outcomes

## v0.0.5

- Add ship rating rolls
- Update Ship rating modifiers
- Fix burn in chat messages
- Add outcome tooltips to chat messages
- Add option to disable Burn tooltip message

## v0.0.4

- Resolves shift click issue with burn in Firefox

## v0.0.3

- Add Burn for tracks
- Add missing translation
- Ship rating styling

## v0.0.2

- Adds dice rolling

## v0.0.1

- First usable version of the player character sheet
