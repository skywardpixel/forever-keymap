# Browser-only storage and self-contained share links

Characters and the account-wide keymap live only in the player's browser storage, and sharing works by encoding a character and the sharer's keymap into the share link; there is no backend, no accounts, and no short links. We chose this to ship a static site before the WoW Forever launch (4 Nov 2026) with nothing to run or pay for.

## Consequences

- Published share links must keep opening forever, so the encoded format carries a version number and every past version must remain decodable. Characters reference abilities by stable identifiers (not array positions) so data refreshes don't scramble old links.
- Clearing browser data loses characters and the keymap; sharing a link to yourself is the only backup.
- Opening a share link shows it read-only with "Copy to my characters" rather than importing it silently; replacing your own keymap with the sharer's is a separate, opt-in choice.
- A future in-game import addon is anticipated (not built yet), so the saved data keeps enough to resolve each ability to an in-game spell ID and each binding target to a WoW binding name.
