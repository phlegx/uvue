import { readFileSync } from 'fs-extra';
import { merge } from 'lodash-es';
import { join } from 'path';
import * as pino from 'pino';
import 'pino-pretty';
import { ConnectAdapter } from './adapters/ConnectAdapter';
import { setupDevMiddleware } from './devMiddleware';
import { IAdapter, IRenderer, IServer, IServerOptions } from './interfaces';
import { Renderer } from './Renderer';

export class Server implements IServer {
  /**
   * Started boolean
   */
  public started: boolean = false;

  /**
   * Vue renderer
   */
  public renderer: IRenderer;

  /**
   * Logger instance
   */
  public logger: pino.Logger;

  /**
   * HTTP server adapter
   */
  private adapter: IAdapter;

  /**
   * Plugins stack
   */
  private plugins: Array<{
    plugin: any;
    options?: any;
  }> = [];

  /**
   * Constructor
   */
  constructor(public options: IServerOptions) {
    if (!this.options.adapter) {
      this.options.adapter = ConnectAdapter;
    }
    this.adapter = new this.options.adapter(this, options.httpOptions);
    this.adapter.createApp(options.adapterArgs);

    this.logger = pino(
      merge(
        {
          prettyPrint: process.env.NODE_ENV !== 'production',
        },
        options.logger,
      ),
    );
  }

  /**
   * Return current http adapter
   */
  public getAdapter(): IAdapter {
    return this.adapter;
  }

  /**
   * Return current adapter framework instance
   */
  public getApp(): any {
    return this.adapter.getApp();
  }

  /**
   * Method to add middlewares
   */
  public use(...args: any[]): Server {
    if (args.length === 2) {
      this.adapter.use(args[0], args[1]);
    } else {
      this.adapter.use(args[0]);
    }
    return this;
  }

  /**
   * Method to declare a plugin
   */
  public addPlugin(plugin: any, options: any = {}) {
    this.plugins.push(plugin);
    if (typeof plugin.install === 'function') {
      plugin.install(this, options);
    }
  }

  /**
   * Call hooks from plugins
   */
  public invoke(name: string, ...args: any[]) {
    for (const plugin of this.plugins) {
      if (typeof plugin[name] === 'function') {
        plugin[name].bind(plugin)(...args);
      }
    }
  }

  /**
   * Call hooks from plugins
   */
  public async invokeAsync(name: string, ...args: any[]) {
    for (const plugin of this.plugins) {
      if (typeof plugin[name] === 'function') {
        await plugin[name].bind(plugin)(...args);
      }
    }
  }

  /**
   * Start server
   */
  public async start() {
    let readyPromise = Promise.resolve();

    // Setup renderer
    if (this.options.webpack) {
      // Development mode
      readyPromise = setupDevMiddleware(this, (serverBundle, { clientManifest, templates }) => {
        this.renderer = this.createRenderer({ serverBundle, clientManifest, templates });
      });
    } else {
      // Production mode
      const { clientManifest, serverBundle, templates } = this.getBuiltFiles();
      this.renderer = this.createRenderer({ serverBundle, clientManifest, templates });
    }

    await readyPromise;

    // Setup last middleware: renderer
    this.adapter.setupRenderer();

    return this.adapter.start().then(() => {
      this.started = true;

      this.logger.info(`Server listening: ${this.getListenUri()}`);

      // Handle kill
      const signals = ['SIGINT', 'SIGTERM'];
      for (const signal of signals) {
        (process.once as any)(signal, () => {
          this.stop().then(() => process.exit(0));
        });
      }
    });
  }

  /**
   * Stop server
   */
  public async stop() {
    this.logger.info(`Stopping server...`);
    if (this.started) {
      process.removeAllListeners('SIGINT');
      process.removeAllListeners('SIGTERM');
      return this.adapter.stop();
    }
  }

  /**
   * Return new instance of a renderer
   */
  public createRenderer({ serverBundle, clientManifest, templates }) {
    return new Renderer(serverBundle, {
      ...this.options.renderer,
      clientManifest,
      templates,
    });
  }

  /**
   * Read files content for renderer
   */
  private getBuiltFiles() {
    const { outputDir, serverBundle, clientManifest } = this.options.paths;
    const { spa, ssr } = this.options.paths.templates;
    return {
      clientManifest: require(join(outputDir, clientManifest)),
      serverBundle: require(join(outputDir, serverBundle)),
      templates: {
        spa: readFileSync(join(outputDir, spa), 'utf-8'),
        ssr: readFileSync(join(outputDir, ssr), 'utf-8'),
      },
    };
  }

  /**
   * Return listening URI
   */
  private getListenUri() {
    const protocol = this.adapter.isHttps() ? 'https' : 'http';
    return `${protocol}://${this.adapter.getHost()}:${this.adapter.getPort()}`;
  }
}
