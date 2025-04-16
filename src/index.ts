import fs from 'fs';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from './cosense.js';

const configDir = `${process.env.HOME}/.mcp-cosense`;
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const client = new Client({ chrome: { userDataDir: `${process.env.HOME}/.mcp-cosense/cosense-client` } });

declare global {
  interface Window {
    scrapbox: {
      Page: {
        insertLine: (index: number, text: string) => void;
        updateLine: (index: number, text: string) => void;
      };
    };
  }
}

const server = new McpServer({
  name: 'cosense',
  description: 'Cosense (Scrapbox) integration for MCP',
  version: '0.1.0',
  components: {
    resources: {},
    tools: {},
  },
});

server.tool('cosense_authenticate',
  'Authenticates the user with Cosense. Use this tool if a NotLoggedInError is thrown.',
  {},
  () => {
    client.authenticate();
    return {
      content: [{ type: 'text', text: 'You are not logged in. Please log in through the browser that has been launched.' }],
    };
  }
);

server.tool('cosense_list_projects',
  'Lists all projects the user has access to',
  {},
  async () => {
    try {
      const projects = await client.listProjects();
      return {
        content: [
          { type: 'text', text: JSON.stringify(projects, null, 2) },
        ],
      };
    } catch (error) {
      console.error('Error listing projects:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing projects: ${error}`
          },
        ],
      };
    }
  }
);

server.tool('cosense_retrieve_page',
  'Retrieves the content of a page with optional n-hop links',
  {
    project: z.string().describe('Cosense project name'),
    pageTitle: z.string().describe('Title of the page to retrieve'),
    includeNHopLinks: z.number().optional().describe('Number of hop links to include').default(2),
  },
  async ({ project, pageTitle, includeNHopLinks = 2 }) => {
    try {
      const pageData = await client.retrievePage(project, pageTitle);
      let text;
      if (includeNHopLinks == 0) {
        text = await client.retrievePageText(project, pageTitle);
      } else {
        text = await client.retrieveSmartContext(project, pageData.id, includeNHopLinks);
      }
      return {
        content: [
          { type: 'text', text, },
        ],
      };
    } catch (error) {
      console.error('Error retrieving page:', error);
      return {
        content: [
          { type: 'text', text: `Error retrieving page: ${error}` },
        ],
      };
    }
  }
);

server.tool('cosense_search_page',
  'Searches for pages matching a query',
  {
    project: z.string().describe('Cosense project name'),
    query: z.string().describe('Search query'),
  },
  async ({ project, query }) => {
    try {
      const searchResults = await client.searchPages(project, query);
      return {
        content: [
          { type: 'text', text: JSON.stringify(searchResults, null, 2) },
        ],
      };
    } catch (error) {
      console.error('Error searching pages:', error);
      return {
        content: [
          { type: 'text', text: `Error searching pages: ${error}` },
        ],
      };
    }
  }
);

server.tool('cosense_insert_line',
  'Inserts a new line at a specified position in a page. Note the line with index 0 is the title of the page.',
  {
    project: z.string().describe('Cosense project name'),
    pageTitle: z.string().describe('Title of the page to modify'),
    text: z.string().describe('Text to insert'),
    index: z.number().describe('Line index where to insert. Note the line with index 0 is the title of the page.'),
  },
  async ({ project, pageTitle, text, index }) => {
    if (text.includes('\n')) {
      return {
        content: [
          { type: 'text', text: 'Text cannot include newlines. Split the text into multiple lines and insert each line separately.' },
        ],
      };
    }

    try {
      const result = await client.insertLine(project, pageTitle, text, index);
      if (result.success) {
        return {
          content: [
            { type: 'text', text: 'Successfully inserted line.' },
          ],
        };
      } else {
        return {
          content: [
            { type: 'text', text: `Failed to insert line: ${result.message}` },
          ],
        };
      }
    } catch (error) {
      console.error('Error inserting line:', error);
      return {
        content: [
          { type: 'text', text: `Error inserting line: ${error}` },
        ],
      };
    }
  }
);

server.tool('cosense_update_line',
  'Updates an existing line at a specified position in a page. Note the line with index 0 is the title of the page.',
  {
    project: z.string().describe('Cosense project name'),
    pageTitle: z.string().describe('Title of the page to modify'),
    text: z.string().describe('New text for the line'),
    index: z.number().describe('Line index to update. Note the line with index 0 is the title of the page.'),
  },
  async ({ project, pageTitle, text, index }) => {
    if (text.includes('\n')) {
      return {
        content: [
          { type: 'text', text: 'Text cannot include newlines. Split the text into multiple lines and update each line separately.' },
        ],
      };
    }

    try {
      const result = await client.updateLine(project, pageTitle, text, index);
      if (result.success) {
        return {
          content: [
            { type: 'text', text: 'Successfully updated line.' },
          ],
        };
      } else {
        return {
          content: [
            { type: 'text', text: `Failed to update line: ${result.message}` },
          ],
        };
      }
    } catch (error) {
      console.error('Error updating line:', error);
      return {
        content: [
          { type: 'text', text: `Error updating line: ${error}` },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cosense MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
