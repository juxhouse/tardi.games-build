#!/usr/bin/env node
'use strict'

// tardi-build: the single, central definition of how a Tardi game is built.
//
//   tardi-build        build src/hand.js + src/table.js -> ./hand.js + ./table.js (ES5)
//   tardi-build dev    same build in watch mode, served with the game's dev/ harness
//
// A game repo lists @juxhouse/tardi-build as a devDependency and runs it via an npm
// script ("build": "tardi-build"); the dev never configures a bundler. Output
// is two self-contained ES5 IIFE bundles that load on a 2018 Tizen TV
// (Chromium ~38-56), per essence/docs/COMPATIBILITY.md.

var path = require('path')
var webpack = require('webpack')

var cwd = process.cwd()
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
      path: cwd,
      filename: '[name].js',
      publicPath: '/',
      iife: true,
      // Never wipe the game repo: we only emit hand.js/table.js next to src/.
      clean: false,
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
  runDev()
} else if (command === 'build') {
  runBuild()
} else {
  console.error('tardi-build: unknown command "' + command + '". Use "tardi-build" or "tardi-build dev".')
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
  })
}

function runDev() {
  var WebpackDevServer = require('webpack-dev-server')
  var compiler = webpack(makeConfig(true))
  var server = new WebpackDevServer({
    static: { directory: cwd, publicPath: '/' },
    devMiddleware: { publicPath: '/', writeToDisk: false },
    headers: { 'Access-Control-Allow-Origin': '*' },
    open: ['/dev/'],
    port: 3142,
    liveReload: true,
  }, compiler)

  server.start().catch(function (err) {
    console.error(err.stack || err)
    process.exit(1)
  })
}
