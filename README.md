# Cosense MCP Server

A Model Context Protocol server that provides integration with Cosense (Scrapbox) through Puppeteer-based browser automation. This server enables LLMs to interact with Cosense pages, create content, search, and modify existing pages.

## Components

### Tools

- **cosense_authenticate**

  - Launch Chrome and wait for authentication

- **cosense_list_projects**

  - Lists all projects the user has access to
  - No inputs required

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

## Setup and Installation

### Prerequisites

- Node.js (v16 or higher recommended)
- Google Chrome installed (the server uses puppeteer-core which requires a Chrome installation)

### Installation

```bash
# Clone the repository
git clone https://github.com/en30/mcp-cosense-server.git
cd mcp-cosense-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Running the Server

```bash
npm start
```

## Launch Chrome for AI

```bash
arch -arm64 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="chrome-for-ai"
```

## Configuration to use Cosense MCP Server with Claude Desktop

Add the following configuration to your Claude Desktop configuration file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

Make sure to replace `/ABSOLUTE/PATH/TO/PARENT/FOLDER` with the absolute path to the location where you have installed the server.

## Known Limitations

- The server depends on the Cosense UI structure, so changes to the Cosense website might break functionality
- Authentication is handled through cookies remembered by Chrome, so you may need to log in to Cosense when running the server for the first time
- The n-hop link feature is a simplified implementation and might not follow all complex link relationships

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License.

## References

- [API - Cosense ヘルプ](https://scrapbox.io/help-jp/API)
- [ページを作る - Cosense ヘルプ](https://scrapbox.io/help-jp/%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%92%E4%BD%9C%E3%82%8B#58ae7c9a97c29100005b886b)
- [UserScript Page Edit API - 橋本商会](https://scrapbox.io/shokai/UserScript_Page_Edit_API)
