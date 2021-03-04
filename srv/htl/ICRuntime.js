const { Runtime } = require('@adobe/htlengine')

module.exports = class ICRuntime extends Runtime {
  constructor (useOptions) {
    super()

    // Optionally disable (broken) sanitation
    if (useOptions && useOptions.skipXSS) {
      this.xss = function (value) { return value }

      delete useOptions.skipXSS
    }

    this.useOptions = useOptions
  }

  use(uri, options) {
    return super.use(uri, Object.assign({}, this.useOptions, options))
  }
}
