const path = require('path')
const minimist = require('minimist')
const bodyParser = require('body-parser')
const config = require('./config.json')
const express = require('express')
const builder = require('./builder')
const chokidar = require('chokidar')
const args = minimist(process.argv)
const { defineRootPath, definePath } = require('./path')
const rootPath = defineRootPath(args.embedded)
const componentsPath = definePath(args.componentsPath, rootPath, config.components)
const pagesPath = definePath(args.pagesPath, rootPath, config.pages)
const stylePath = definePath(args.stylePath, rootPath, config.styles)
const scriptPath = definePath(args.scriptPath, rootPath, config.scripts)
const assetsPath = definePath(args.assetsPath, rootPath, config.assets)
const directivePath = definePath(args.diretivePath, rootPath, config.directives)
const backendTemplates = args.backendTemplates || 'hbs'
const skipXSS = args.skipXSS

let aemMocksPath
if (backendTemplates === 'htl') {
  aemMocksPath = definePath(args.aemMocksPath, rootPath, config.aemMocks)
}

const potentialMockPaths = [componentsPath, aemMocksPath].filter(Boolean).map(dir => path.join(dir, '/**/*.js'))

// Watchers

const componentsWatcher = chokidar.watch(componentsPath, {
  ignored: (file) => !file.match(/\.vue$/)
})
const pagesWatcher = chokidar.watch(pagesPath)
const directivesWatcher = chokidar.watch(directivePath)
const assetsWatcher = chokidar.watch(assetsPath, {
  ignored: (file) => !file.match(/\.js$/)
})
const mocksWatcher = chokidar.watch(potentialMockPaths)

componentsWatcher.on('ready', function () {
  componentsWatcher.on('all', function () {
    console.log('rebuild components')
    builder.build(componentsPath, stylePath, scriptPath, path.resolve(__dirname, config.componentsImportFile))
  })
})

pagesWatcher.on('ready', function () {
  pagesWatcher.on('all', function () {
    console.log('rebuild pages')
    builder.buildPages(pagesPath, stylePath, scriptPath, path.resolve(__dirname, config.pagesImportFile))
  })
})

directivesWatcher.on('ready', function () {
  directivesWatcher.on('all', function () {
    console.log('rebuild directives')
    builder.buildDirectives(directivePath, path.resolve(__dirname, config.directivesImportFile))
  })
})

assetsWatcher.on('ready', function () {
  assetsWatcher.on('all', function () {
    console.log('get new assets')
    builder.build(componentsPath, stylePath, scriptPath, path.resolve(__dirname, config.componentsImportFile))
    builder.buildPages(pagesPath, stylePath, scriptPath, path.resolve(__dirname, config.pagesImportFile))
  })
})

mocksWatcher.on('ready', function () {
  mocksWatcher.on('all', function () {
    console.log('clear mock cache')
    Object.keys(require.cache).forEach((file, i) => {
      if ([componentsPath, aemMocksPath].find(dir => file.includes(dir))) {
        delete require.cache[file]
      }
    })
  })
})

const api = require('./api')(componentsPath, pagesPath, aemMocksPath, backendTemplates, skipXSS)

// Initial builder

console.log('build index for Vue components', componentsPath)
console.log('build index for Vue pages', pagesPath)
console.log('build path for styles', stylePath)
console.log('build path for scripts', scriptPath)
console.log('build path for assets', assetsPath)
console.log('build path for directives', directivePath)
if (aemMocksPath) {
  console.log('Your AEM mocks are in:', aemMocksPath)
}

// build Vue components importer
builder.build(componentsPath, stylePath, scriptPath, path.resolve(__dirname, config.componentsImportFile))
builder.buildPages(pagesPath, stylePath, scriptPath, path.resolve(__dirname, config.pagesImportFile))
builder.buildDirectives(directivePath, path.resolve(__dirname, config.directivesImportFile))

module.exports = app => {
  app.use('/assets', (req, res, next) => {
    // Rewrite POST to GET so `express.static` can handle it
    if (req.method === 'POST') {
      req.method = 'GET'
    }
    return next()
  }, express.static(assetsPath))
  app.use(bodyParser.json())
  app.use('/api', api)
  app.set('view engine', '.hbs')
}
