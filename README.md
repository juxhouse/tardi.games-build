# @juxhouse/tardi-build

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
    "@juxhouse/tardi-build": "^0.1.0"
  }
}
```

The build only emits `hand.js` and `table.js` next to `src/`; it never wipes the
game repo.
