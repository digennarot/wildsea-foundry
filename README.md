# The Wildsea (Unofficial) for Foundry VTT

A [Foundry VTT](https://foundryvtt.com/) game system for [The Wildsea](https://thewildsea.co.uk/) by Felix Isaacs: character, ship and adversary sheets, dice pools, and tracks.

![Player Sheet](https://i.imgur.com/8oHSKRu.png)

**Compatibility:** Foundry VTT v13 – v14

## Installation

In Foundry, open **Game Systems → Install System**, paste this URL into the **Manifest URL** field and click **Install**:

```
https://github.com/digennarot/wildsea-foundry/releases/latest/download/system.json
```

To install a specific version, use the `system.json` attached to that release on the [Releases page](https://github.com/digennarot/wildsea-foundry/releases).

## Features

- **Sheets** for players, ships, adversaries, and items (aspects, resources, ship designs and fittings)
- **Dice pool roller** with expandable dice tooltips in chat
- **UI tracks panel**: shared tracks for the whole table, with a configurable position
- **Compendiums**: character aspects, ship aspects, a Quick Reference rules journal, and an Italian-only hazards compendium ("Hazards", shown as "Pericoli" with Babele) with ready-to-use hazard actors, plus an Italian-only cargo compendium ("Cargo", shown as "Carichi") whose items can be dropped on a ship sheet
- **Ship ratings** that pick up modifiers from designs and fittings
- **Localization**: English, Ukrainian, and Italian. Italian translations of the compendiums are included and applied when the [Babele](https://foundryvtt.com/packages/babele) module is active

### Journal enrichers

You can embed these in any journal or rich-text field:

| Syntax | Result |
| --- | --- |
| `@Track[3,2]{Hull Breach}` | An inline track with slot groups of 3 and 2, labelled "Hull Breach" |
| `@DisplayItem[<uuid>]{Name}` | A link to an item that displays it in chat |

## Development

The system loads straight from the repository, so there's no build step. Clone it into your Foundry `Data/systems/` folder as `wildsea`:

```sh
git clone https://github.com/digennarot/wildsea-foundry.git wildsea
```

Styles are written in LESS (`styles/*.less`). Recompile them to `styles/wildsea.css` after making changes.

### Releasing

1. Bump `version` in `system.json` and add an entry to `CHANGELOG.md`.
2. Commit, then push a tag that matches the version with a `v` prefix:
   ```sh
   git tag v0.2.4
   git push origin v0.2.4
   ```
3. The [Release workflow](.github/workflows/release.yml) checks the version, zips the system, and publishes a GitHub release with `system.json` and the zip attached.

## Credits

- Original system by Paul Cosgrove (demondownload)
- Foundry v13/v14 updates by Max Schreifels
- Attribute tooltips by Dan Stricoff (Mutex)

## License

The source code (JavaScript, Handlebars, LESS) is MIT licensed. Icons come from [Game-Icons.net](https://game-icons.net/) (CC-BY 3.0), and fonts come from Google Fonts (SIL OFL). *The Wildsea* is © 2022 Felix Isaacs. This is an unofficial fan project and isn't affiliated with the publisher. See [LICENSE](LICENSE) for details.
