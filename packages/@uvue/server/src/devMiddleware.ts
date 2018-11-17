import * as consola from 'consola';
import * as MFS from 'memory-fs';
import * as path from 'path';
import * as webpack from 'webpack';
import * as webpackDevMiddleware from 'webpack-dev-middleware';
import * as webpackHotMiddleware from 'webpack-hot-middleware';
import { IServer } from './interfaces';

export const setupDevMiddleware = async (
  app: IServer,
  callback: (...args: any[]) => void,
): Promise<any> => {
  const { client, server } = app.options.webpack;

  // Vue SSR
  let serverBundle;
  let clientManifest;

  // Ready vars
  let resolve;
  let resolved = false;

  const readyPromise = new Promise(r => {
    resolve = r;
  });

  const ready = (...args) => {
    if (!resolved) {
      resolve();
    }
    resolved = true;
    callback(...args);
  };

  // Config for dev middleware
  client.entry.app.unshift('webpack-hot-middleware/client');
  client.output.filename = '[name].js';

  // Instanciate virtual file system
  const mfs = new MFS();

  // Function to read in mfs
  const readFile = file => {
    try {
      return mfs.readFileSync(path.join(client.output.path, file), 'utf-8');
    } catch (err) {
      return 'null';
    }
  };

  // Create Webpack compiler
  const compiler = webpack([client, server]);
  compiler.outputFileSystem = mfs;

  let devMiddleware = webpackDevMiddleware(compiler.compilers[0], {
    logLevel: 'silent',
    publicPath: client.output.publicPath,
    stats: false,
    ...(app.options.devServer.middleware || {}),
  });

  let hotMiddleware = webpackHotMiddleware(compiler.compilers[0], {
    heartbeat: 10000,
    log: false,
    ...(app.options.devServer.hot || {}),
  });

  if (app.getApp().__isKoa) {
    devMiddleware = require('koa-connect')(devMiddleware);
    hotMiddleware = require('koa-connect')(hotMiddleware);
  }

  // Install dev middlewares
  app.use(devMiddleware);
  app.use(hotMiddleware);

  // When a compilation finished
  const handleCompilation = () => {
    const { paths } = app.options;

    // Get templates
    const templates = {
      spa: readFile(paths.templates.spa),
      ssr: readFile(paths.templates.ssr),
    };

    // Get bundled files
    clientManifest = JSON.parse(readFile(paths.clientManifest));
    serverBundle = JSON.parse(readFile(paths.serverBundle));

    if (clientManifest && serverBundle) {
      ready(serverBundle, { clientManifest, templates });
    }
  };

  compiler.hooks.done.tap('WebapackClientDev', handleCompilation);
  compiler.compilers[1].watch({}, (err, stats) => {
    if (err) {
      throw err;
    }

    stats = stats.toJson();

    // tslint:disable-next-line
    stats.errors.forEach(err => consola.error(err));
    // tslint:disable-next-line
    stats.warnings.forEach(err => consola.warn(err));

    handleCompilation();
  });

  return readyPromise;
};
