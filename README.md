# Cosense MCP Server

A Model Context Protocol server that provides integration with Cosense (Scrapbox) through Puppeteer-based browser automation. This server enables LLMs to interact with Cosense pages, create content, search, and modify existing pages.

## Components

### Tools

- **cosense_list_page**

  - Lists all projects the user has access to
  - No inputs required

- **cosense_create_page**

  - Creates a new page in a specified project
  - Inputs:
    - `project` (string, required): Cosense project name
    - `pageTitle` (string, required): Title for the new page

- **cosense_retrieve_page**

  - Retrieves the content of a page with optional n-hop links
  - Inputs:
    - `project` (string, required): Cosense project name
    - `pageTitle` (string, required): Title of the page to retrieve
    - `includeNHopLinks` (number, optional, default: 2): Number of hop links to include

- **cosense_search_page**

  - Searches for pages matching a query
  - Inputs:
    - `query` (string, required): Search query

- **cosense_insert_line**

  - Inserts a new line at a specified position in a page
  - Inputs:
    - `project` (string, required): Cosense project name
    - `pageTitle` (string, required): Title of the page to modify
    - `text` (string, required): Text to insert
    - `index` (number, required): Line index where to insert

- **cosense_update_line**
  - Updates an existing line at a specified position in a page
  - Inputs:
    - `project` (string, required): Cosense project name
    - `pageTitle` (string, required): Title of the page to modify
    - `text` (string, required): New text for the line
    - `index` (number, required): Line index to update

### Resources

The server provides access to page content and search results from Cosense.

## Key Features

- Cosense project browsing
- Page creation and modification
- Content retrieval with n-hop links
- Search functionality
- Line-level page editing

## How It Works

The Cosense MCP server uses Puppeteer to automate browser interactions with Cosense. Since Cosense doesn't provide a traditional HTTP API, this server leverages:

1. URL-based navigation for page access and creation
2. JavaScript execution within the page for operations like inserting and updating lines
3. Export for AI functionality to retrieve page content with n-hop links

## Configuration to use Cosense MCP Server

Here's the configuration to use the Cosense MCP server:

### Git

```console
$ git fetch https://github.com/en30/mcp-server-cosense
$ cd mcp-server-cosense
$ npm install
$ npm run build
```

```json
{
  "mcpServers": {
    "cosense": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/PARENT/FOLDER/mcp-cosense-server/build/index.js"
      ]
    }
  }
}
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License.
