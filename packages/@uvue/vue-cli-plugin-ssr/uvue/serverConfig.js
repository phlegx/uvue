/**
 * Default config
 */
module.exports = () => ({
  adapter: null,
  adapterArgs: [],
  https: {
    cert: null,
    key: null,
  },
  renderer: {
    directives: {},
    cache: null,
    shoudPrefetch: null,
    shoudPreload: null,
  },
  generate: {
    paths: [],
    scanRouter: true,
    params: {},
  },
  devServer: {
    middleware: {},
    hot: {},
  },
  plugins: [],
  watch: ['server.config.js'],
  watchIgnore: ['dist/**/*'],
});
