const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const babel = require('@babel/core')
module.exports = function compile(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-typescript', { allExtensions: true }]],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  })
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name)
  mod._compile(code, filename)
  return mod.exports
}
