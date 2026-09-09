#!/usr/bin/env node
'use strict'

// tardi-build: the single, central definition of how a Tardi game is built.
//
//   tardi-build        build src/hand.js + src/table.js -> dist/ (ES5), plus a copy
//                      of assets/ and game.json: dist/ is the whole publishable game,
//                      and the only place the build ever writes
//   tardi-build dev    same build in watch mode, served with the dev harness
//
// A game repo lists @juxhouse/tardi-build as a devDependency and runs it via an npm
// script ("build": "tardi-build"); the dev never configures a bundler. Output
// is two self-contained ES5 IIFE bundles that load on a 2018 Tizen TV
// (Chromium ~38-56), per essence/docs/COMPATIBILITY.md.

var fs = require('fs')
var path = require('path')
var webpack = require('webpack')

var cwd = process.cwd()
var dist = path.join(cwd, 'dist')
var command = process.argv[2] || 'build'

// Babel resolves loaders/presets from this package's own install location, so
// resolution works whether @juxhouse/tardi-build is hoisted or nested in a game repo.
function makeConfig(isDev) {
  return {
    mode: isDev ? 'development' : 'production',
    target: ['web', 'es5'],
    context: cwd,
    entry: {
      hand: './src/hand.js',
      table: './src/table.js',
    },
    output: {
      path: dist,
      filename: '[name].js',
      publicPath: '/dist/',
      iife: true,
      clean: !isDev,
    },
    optimization: {
      // Readable output and one self-contained file per entry: no minify, no
      // shared runtime or vendor chunk to load separately.
      minimize: false,
      runtimeChunk: false,
      splitChunks: false,
    },
    performance: { hints: false },
    module: {
      rules: [
        {
          test: /\.js$/,
          // Transpile the game's src and the bundled @tardi/* libs; leave the
          // rest of node_modules (already ES5, e.g. core-js) untouched.
          exclude: /node_modules[\\/](?!@tardi[\\/])/,
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [
                [
                  require.resolve('@babel/preset-env'),
                  {
                    targets: { chrome: '38' },
                    useBuiltIns: 'usage',
                    corejs: '3.46',
                    modules: false,
                  },
                ],
              ],
            },
          },
        },
      ],
    },
  }
}

if (command === 'dev') {
  readGameJson()
  runDev()
} else if (command === 'build') {
  readGameJson()
  runBuild()
} else {
  console.error('tardi-build: unknown command "' + command + '". Use "tardi-build" or "tardi-build dev".')
  process.exit(1)
}

// game.json is what the platform and the dev harness read to know how to run a
// game, so a game missing it, or missing a field the platform switches on, is
// broken before it is ever published. Check it here, at the one step every game
// runs, and check it before building rather than after: a dev who forgot a field
// hears about it immediately, and a broken game.json never reaches dist/.
function readGameJson() {
  var file = path.join(cwd, 'game.json')

  if (!fs.existsSync(file)) {
    fail('no game.json found. Every game needs one in its repo root.')
  }

  var game
  try {
    game = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    fail('game.json is not valid JSON: ' + e.message)
  }

  checkSharedScreen(game)
  return game
}

// Whether the game uses the table on a TV is not a detail the platform can infer:
// it decides whether the game can be offered at all when there is no shared
// screen, so every game has to say.
function checkSharedScreen(game) {
  var value = game.sharedScreen
  var valid = ['required', 'optional', 'none']

  if (value === undefined) {
    fail('game.json has no "sharedScreen".' + sharedScreenHelp())
  }
  if (valid.indexOf(value) === -1) {
    fail('game.json has "sharedScreen": ' + JSON.stringify(value) + '.' + sharedScreenHelp())
  }
}

function sharedScreenHelp() {
  return '\n\n' +
    '  Every game must declare how it uses the shared screen (the TV table):\n\n' +
    '    "sharedScreen": "required"   the game cannot be played without the table\n' +
    '    "sharedScreen": "optional"   plays either way; the table adds to it\n' +
    '    "sharedScreen": "none"       hands only; the game shows no table\n\n' +
    '  Add one of those to game.json and run again.'
}

function fail(message) {
  console.error('tardi-build: ' + message)
  process.exit(1)
}

function runBuild() {
  webpack(makeConfig(false), function (err, stats) {
    if (err) {
      console.error(err.stack || err)
      process.exit(1)
    }

    process.stdout.write(stats.toString({ colors: true, modules: false, children: false }) + '\n')

    if (stats.hasErrors()) {
      process.exit(1)
    }

    copyStaticFiles()
  })
}

// dist/ is what gets published, so it needs everything the platform reads from a
// game: the two bundles webpack just wrote, plus the game's metadata and assets.
// game.json is already known to be there and valid; readGameJson checked it
// before the build started.
function copyStaticFiles() {
  copy('game.json')
  copy('assets')
}

function copy(name) {
  var from = path.join(cwd, name)
  if (!fs.existsSync(from)) {
    console.error('tardi-build: warning: no ' + name + ' found, so dist/ has none either.')
    return
  }
  fs.cpSync(from, path.join(dist, name), { recursive: true })
}

function runDev() {
  var WebpackDevServer = require('webpack-dev-server')
  var port = 3142
  var url = 'http://localhost:' + port + '/dev/'
  var compiler = webpack(makeConfig(true))
  var server = new WebpackDevServer({
    // The harness ships with this package, so a game repo needs no dev/ of its
    // own; one is still served first if it has one, for a game that wants to
    // replace the harness.
    static: [
      { directory: path.join(cwd, 'dev'), publicPath: '/dev' },
      { directory: path.join(__dirname, 'harness'), publicPath: '/dev' },
      { directory: cwd, publicPath: '/' },
    ],
    devMiddleware: { publicPath: '/dist/', writeToDisk: false },
    headers: { 'Access-Control-Allow-Origin': '*' },
    open: ['/dev/'],
    port: port,
    liveReload: true,
    // The game repo is served at the root, so bare localhost:3142 would show a
    // file listing. Send it to the dev harness instead: the root URL is what a
    // dev types or what the browser keeps from a previous session.
    setupMiddlewares: function (middlewares, devServer) {
      devServer.app.get('/', function (_req, res) {
        res.redirect('/dev/')
      })
      return middlewares
    },
  }, compiler)

  server.start().then(function () {
    // `open` above launches the browser, but it fails silently over SSH, in
    // containers and in WSL, so always print the link too. Announce it after the
    // first build instead of at startup: that is when the harness is actually
    // ready, and the link ends up under the webpack stats rather than above them.
    var announced = false
    compiler.hooks.done.tap('tardi-build', function () {
      if (announced) return
      announced = true
      // webpack-dev-middleware prints the build stats from a nextTick callback,
      // so defer past it to keep the link on the last line.
      setImmediate(function () {
        process.stdout.write('\n  Open your game here: ' + url + '\n\n')
      })
    })
  }).catch(function (err) {
    console.error(err.stack || err)
    process.exit(1)
  })
}
