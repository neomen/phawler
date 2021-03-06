import EventEmitter from '../vendor/smelly-event-emitter/dist/event-emitter.js';
import webPage from 'webpage';
import { findUrls } from './evaluates';
import { extractValue } from './helper';

/**
 * Crawler worker.
 *
 * @emit {onPageOpen} Emit when page has been open.
 * @emit {onPageOpenSuccess} Emit when page has been open with success status.
 * @emit {onPageCrawled} Emit when all actions on page have done.
 * @emit All PhantomJS events.
 */
export default class Worker extends EventEmitter {

  /**
   * @param {Array} constructors Modules constructors.
   * @param {Object} config Configuration object.
   */
  constructor(constructors, config) {
    super();

    this.page = webPage.create();
    this.page.viewportSize = extractValue(config, 'crawler.viewportSize') || {
        width: 1920,
        height: 1080
    };

    this.setPhantomEvents();

    this.modulesConfig = extractValue(config, 'modules') || {};
    let self = this;
    this.modules = constructors.map(construct => {
      return new construct(self);
    });
  }

  /**
   * Set PhantomJS events to crawler event emitter.
   */
  setPhantomEvents() {
    this.page.onAlert = (msg) => this.emit('onAlert', msg);
    this.page.onCallback = (data) => this.emit('onCallback', data);
    this.page.onClosing = (closingPage) => this.emit('onClosing', closingPage);
    this.page.onConfirm = (msg) => this.emit('onConfirm', msg);
    this.page.onConsoleMessage = (msg, lineNum, sourceId) => this.emit('onConsoleMessage', msg, lineNum, sourceId);
    this.page.onError = (msg, trace) => this.emit('onError', msg, trace);
    this.page.onFilePicker = (oldFile) => this.emit('onFilePicker', oldFile);
    this.page.onInitialized = () => this.emit('onInitialized');
    this.page.onLoadFinished = (status) => this.emit('onLoadFinished', status);
    this.page.onLoadStarted = () => this.emit('onLoadStarted');
    this.page.onNavigationRequested = (url, type, willNavigate, main) => this.emit('onNavigationRequested', url, type, willNavigate, main);
    this.page.onPageCreated = (newPage) => this.emit('onPageCreated', newPage);
    this.page.onPrompt = (msg, defaultVal) => this.emit('onPrompt', msg, defaultVal);
    this.page.onResourceError = (resourceError) => this.emit('onResourceError', resourceError);
    this.page.onResourceReceived = (response) => this.emit('onResourceReceived', response);
    this.page.onResourceRequested = (requestData, networkRequest) => this.emit('onResourceRequested', requestData, networkRequest);
    this.page.onResourceTimeout = (request) => this.emit('onResourceTimeout', request);
    this.page.onUrlChanged = (targetUrl) => this.emit('onUrlChanged', targetUrl);
  }

  /**
   * Open URL and emit events.
   *
   * @param {String} url URL for crawling.
   */
  process(url) {
    this.modules.forEach(module => module.clean());

    this.page.open(url, (status) => {
      this.emit('onPageOpen', this.page, status);

      let urls = [];
      let result = {};

      if (status == 'success') {
        this.emit('onPageOpenSuccess', this.page);
        urls = this.page.evaluate(findUrls);
      }

      this.modules.forEach(module => result[module.id] = module.getResult());
      this.emit('onPageCrawled', url, urls, result, status);
    });
  }

}
