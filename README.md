# @juxhouse/tardi.games-build

The single, central definition of how a [Tardi](https://tardi.games) game is built.

A game repo lists `@juxhouse/tardi-build` as a devDependency and runs it via npm
scripts; the game dev never configures a bundler. Output is two self-contained
ES5 IIFE bundles that load on a 2018 Tizen TV (Chromium ~38-56).

## Install

```sh
npm install --save-dev @juxhouse/tardi-build
```

## Usage

```sh
tardi-build        # build src/hand.js + src/table.js -> dist/ (ES5)
tardi-build dev    # same build in watch mode, served with the dev harness on port 3142
```

A build writes the whole publishable game into `dist/`:

```
dist/
  hand.js
  table.js
  game.json      copied from the repo root
  assets/        copied from the repo root
```

In a game's `package.json`:

```json
{
  "scripts": {
    "build": "tardi-build",
    "dev": "tardi-build dev"
  },
  "devDependencies": {
    "@juxhouse/tardi-build": "*"
  }
}
```

## The dev harness

`tardi-build dev` opens the harness at http://localhost:3142/dev/ in the browser
and prints that link when the build finishes, for when it cannot open a browser
itself (over SSH, in a container, in WSL). The root URL redirects there too.

The harness ships in this package (`harness/index.html`), so a game repo needs no
`dev/` folder of its own: it hosts the game's table and one hand per player in
iframes and routes messages between them, doing the same intent translation the
platform does, with no PeerJS and no lobby. It is generic — the title and the
number of hands come from the game's `game.json`, which the dev server serves at
`/game.json`.

A game that wants a different harness can still put its own `dev/index.html` in
its repo; that one is served instead.

The build only ever writes to `dist/`, which it clears first; it never touches the
rest of the game repo. `tardi-build dev` writes nothing to disk — it serves the
bundles from memory at the same URLs a build writes them to, `/dist/hand.js` and
`/dist/table.js`, which is what the harness loads.


## Testing Locally

  `npm pack --pack-destination /tmp`

  Writes /tmp/juxhouse-tardi-build-{version}.tgz — the exact artifact npm publish would upload.

Verify the generated version and install it into the game:

```
  cd /home/maxwell/tardi.games/games/tic-tac-toe
  npm i --no-save /tmp/juxhouse-tardi-build-{version}.tgz
  npm run dev
```

#### Undo when done

```
  cd /home/maxwell/tardi.games/games/tic-tac-toe
  npm i
```

--no-save left no reference in package.json, so a plain install restores the published version.





## Releasing New Versions

```
npm version patch
git push --follow-tags
```

This package is released by a GitHub Action: pushing the `v*` tag that
`npm version` creates runs `.github/workflows/publish.yml`, which publishes to
npm. Nothing is published from a developer's machine.
