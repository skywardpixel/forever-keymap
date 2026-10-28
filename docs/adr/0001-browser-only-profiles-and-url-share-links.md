# Browser-only profiles and self-contained share links

Profiles live only in the player's browser storage, and sharing works by encoding the entire profile into the share link; there is no backend, no accounts, and no short links. We chose this to ship a static site before the WoW Forever launch (4 Nov 2026) with nothing to run or pay for.

## Consequences

- Published share links must keep opening forever, so the encoded format carries a version number and every past version must remain decodable. Profiles reference abilities by stable identifiers (not array positions) so data refreshes don't scramble old links.
- Clearing browser data loses profiles; sharing a link to yourself is the only backup.
- Opening a share link shows the profile read-only with "Copy to my profiles" rather than importing it silently.
- A future in-game import addon is anticipated (not built yet), so the profile data keeps enough to resolve each ability to an in-game spell ID and each binding target to a WoW binding name.
