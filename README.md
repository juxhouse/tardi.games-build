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
tardi-build        # build src/hand.js + src/table.js -> ./hand.js + ./table.js (ES5)
tardi-build dev    # same build in watch mode, served with the game's dev/ harness on port 3142
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

`tardi-build dev` opens the harness at http://localhost:3142/dev/ in the browser
and prints that link when the build finishes, for when it cannot open a browser
itself (over SSH, in a container, in WSL). The root URL redirects there too.

The build only emits `hand.js` and `table.js` next to `src/`; it never wipes the
game repo.


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
