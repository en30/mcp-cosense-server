import { Browser, Page as PuppeteerPage } from "puppeteer-core";
import * as puppeteer from 'puppeteer-core';
import { TargetCloseError } from "puppeteer-core/lib/cjs/puppeteer/common/Errors.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

declare global {
  interface Window {
    cosense: {
      Page: {
        insertLine: (text: string, index: number) => void;
        updateLine: (text: string, index: number) => void;
        waitForSave: () => Promise<void>;
      };
    };
  }
}

interface DumbCookie {
  name: string;
  value: string;
}

interface Project {
  title: string;
  url: string;
  isPrivate: boolean;
  id: string;
  name: string;
  displayName: string;
  publicVisible: boolean;
  loginStrategies: string[];
  plan: string;
  additionalPlans: {
    [key: string]: string;
  };
  theme: string;
  gyazoTeamsName: string | null;
  translation: boolean;
  infobox: boolean;
  created: number;
  updated: number;
  isMember: boolean;
  trialing: boolean;
}

interface User {
  id: string;
  name: string;
  displayName: string;
  photo: string;
}

interface Line {
  id: string;
  text: string;
  userId: string;
  created: number;
  updated: number;
}

interface RelatedPage {
  id: string;
  title: string;
  titleLc: string;
  image: string;
  descriptions: string[];
  linksLc: string[];
  linked: number;
  pageRank: number;
  created: number;
  updated: number;
  accessed: number;
  lastAccessed: number | null;
}

interface RelatedPages {
  links1hop: RelatedPage[];
  links2hop: RelatedPage[];
  fatHeadwordsLc: string[];
  hiddenHeadwordsLc: string[];
  projectLinks1hop: any[];
  hasBackLinksOrIcons: boolean;
  search: string;
  charsCount: {
    links1hop: number;
    links2hop: number;
  };
  searchBackend: string;
}

interface Page {
  id: string;
  title: string;
  image: string;
  descriptions: string[];
  user: User;
  lastUpdateUser: User;
  pin: number;
  views: number;
  linked: number;
  commitId: string;
  created: number;
  updated: number;
  accessed: number;
  snapshotCreated: number;
  pageRank: number;
  lastAccessed: number;
  linesCount: number;
  charsCount: number;
  helpfeels: any[];
  persistent: boolean;
  lines: Line[];
  links: string[];
  projectLinks: any[];
  icons: any[];
  files: any[];
  infoboxDefinition: any[];
  infoboxResult: any[];
  infoboxDisableLinks: any[];
  relatedPages: RelatedPages;
  collaborators: User[];
}

export class NotLoggedInError extends Error {
  constructor(message: string = "User is not logged in to Cosense") {
    super(message);
    this.name = "NotLoggedInError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotLoggedInError);
    }
  }
}

function route(strings: TemplateStringsArray, ...values: string[]): string {
  return 'https://scrapbox.io' +
    strings.reduce((acc, str, i) =>
      acc + str + (i < values.length ? encodeURIComponent(values[i]) : ''),
      '');
}

const routes = {
  api: {
    projects: () => route`/api/projects`,
    project: (project: string) => route`/api/projects/${project}`,
    pages: (project: string) => route`/api/pages/${project}`,
    page: (project: string, title: string) => route`/api/pages/${project}/${title}`,
    pageText: (project: string, title: string) => route`/api/pages/${project}/${title}/text`,
    smartContext: (project: string, pageId: string, n: number) => route`/api/smart-context/export-${n.toString()}hop-links/${project}.txt?pageId=${pageId}`,
    search: (project: string, query: string, opts: {
      skip?: number;
      sort?: string;
      filterType?: string;
      filterValue?: string;
      limit?: number;
      field?: string;
    } = {}) => {
      const params = new URLSearchParams({
        q: query,
        skip: opts.skip?.toString() ?? '0',
        sort: opts.sort ?? 'pageRank',
        filterType: opts.filterType ?? '',
        filterValue: opts.filterValue ?? '',
        limit: opts.limit?.toString() ?? '100',
        field: opts.field ?? 'lines'
      });
      const base = route`/api/pages/${project}/search/query`;
      return base + '?' + params.toString();
    }
  },
  web: {
    root: () => route`/`,
    page: (project: string, title: string) => route`/${project}/${title}`,
    login: () => route`/login/google`,
  }
}

let debuggingPort = 9022;

export class Client {
  #browser: Browser | null = null;
  #cookies: DumbCookie[] | null = null;
  chromeOptions: puppeteer.LaunchOptions;

  constructor({ chrome }: { chrome?: puppeteer.LaunchOptions } = {}) {
    this.chromeOptions = {
      debuggingPort: chrome?.debuggingPort ?? debuggingPort++,
      userDataDir: chrome?.userDataDir ?? "cosense-client",
      headless: chrome?.headless ?? true,
    };
    if (!this.chromeOptions.channel && !this.chromeOptions.executablePath) {
      this.chromeOptions.channel = "chrome"
    }
  }

  async cleanup() {
    if (this.#browser) {
      await this.#browser.close();
      this.#browser = null;
    }
  }

  async authenticate(): Promise<{ success: boolean, message?: string }> {
    await this.cleanup();
    const browser = await puppeteer.launch({ channel: 'chrome', headless: false, userDataDir: this.chromeOptions.userDataDir });

    try {
      const page = await browser.newPage();
      await page.goto(routes.web.login(), { waitUntil: 'networkidle2' });

      for (let i = 0; i < 300; i++) {
        await sleep(1000);
        try {
          const hostname = await page.evaluate(() => window.location.hostname);
          if (hostname.includes('scrapbox.io')) {
            await this.#fetchCookies(browser);
            return { success: true };
          }
        } catch (e) {
          if (e instanceof TargetCloseError) continue;
          throw e;
        }
      }

      return { success: false, message: 'Authentication timed out' };
    } finally {
      browser.close();
    }
  }

  async #getBrowser() {
    if (this.#browser !== null) return this.#browser;

    this.#browser = await puppeteer.launch(this.chromeOptions);
    process.on('beforeExit', () => this.cleanup());
    return this.#browser;
  }

  async #fetchCookies(browser: Browser) {
    this.#cookies = (await browser.cookies())
      .filter(cookie => cookie.domain === 'scrapbox.io')
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value
      }));
    return this.#cookies!;
  }

  async #getCookies() {
    if (this.#cookies !== null) return this.#cookies;

    const browser = await this.#getBrowser();
    return this.#fetchCookies(browser);
  }

  async visit(url: string): Promise<PuppeteerPage> {
    const browser = await this.#getBrowser();

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2' });

    return page;
  }

  async fetch(url: string, init: RequestInit = {}) {
    return fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        'Cookie': (await this.#getCookies()).map(c => `${c.name}=${c.value}`).join('; ')
      }
    }).then((res) => {
      const setCookieHeaders = res.headers.getSetCookie();
      this.#updateCookiesFromHeaders(setCookieHeaders);
      if (res.status === 401) {
        throw new NotLoggedInError();
      }
      return res;
    });
  }

  #updateCookiesFromHeaders(setCookieHeaders: string[]) {
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      const newCookies = setCookieHeaders.map(cookieStr => {
        const [nameValue, ..._] = cookieStr.split(';');
        const [name, value] = nameValue.split('=');

        const cookie: DumbCookie = {
          name: name.trim(),
          value: value.trim(),
        };

        return cookie;
      });

      if (this.#cookies) {
        newCookies.forEach(newCookie => {
          const existingIndex = this.#cookies!.findIndex(c => c.name === newCookie.name);

          if (existingIndex >= 0) {
            this.#cookies![existingIndex] = newCookie;
          } else {
            this.#cookies!.push(newCookie);
          }
        });
      }
    }
  }

  async listProjects(): Promise<Project[]> {
    return this.fetch(routes.api.projects()).then(res => res.json()).then(json => json.projects);
  }

  async retrieveProject(project: string): Promise<Project> {
    return this.fetch(routes.api.project(project)).then(res => res.json());
  }

  async listPages(project: string): Promise<{ projectName: string, skip: number, limit: number, count: number, pages: Page[] }> {
    return this.fetch(routes.api.pages(project)).then(res => res.json());
  }

  async retrievePage(project: string, pageTitle: string) {
    return this.fetch(routes.api.page(project, pageTitle)).then(res => res.json());
  }

  async retrievePageText(project: string, pageTitle: string) {
    return this.fetch(routes.api.pageText(project, pageTitle)).then(res => res.text());
  }

  async retrieveSmartContext(project: string, pageId: string, n: number) {
    return this.fetch(routes.api.smartContext(project, pageId, n)).then(res => res.text());
  }

  async searchPages(project: string, query: string, opts: {
    skip?: number;
    sort?: string;
    filterType?: string;
    filterValue?: string;
    limit?: number;
  } = {}) {
    return this.fetch(routes.api.search(project, query, opts)).then(res => res.json());
  }

  async insertLine(project: string, pageTitle: string, text: string, index: number) {
    const url = routes.web.page(project, pageTitle);
    const page = await this.visit(url);

    try {
      const result = await page.evaluate(async (lineText, lineIndex) => {
        if (typeof window.cosense === 'undefined' || !window.cosense.Page) {
          return { success: false, message: 'Cosense editor not found' };
        }

        try {
          window.cosense.Page.insertLine(lineText, lineIndex);
          await window.cosense.Page.waitForSave();
          return { success: true };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      }, text, index);
      return result;
    } finally {
      page.close();
    }
  }

  async updateLine(project: string, pageTitle: string, text: string, index: number) {
    const url = routes.web.page(project, pageTitle);
    const page = await this.visit(url);

    try {
      const result = await page.evaluate(async (lineText, lineIndex) => {
        if (typeof window.cosense === 'undefined' || !window.cosense.Page) {
          return { success: false, message: 'Cosense editor not found' };
        }

        try {
          window.cosense.Page.updateLine(lineText, lineIndex);
          await window.cosense.Page.waitForSave();
          return { success: true };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      }, text, index);
      return result;
    } finally {
      page.close();
    }
  }
}
