# Google Search MCP Server

A Model Context Protocol (MCP) server that provides web search capabilities using the Google Custom Search API.

## Features

- Web search functionality via Google Custom Search API
- Configurable number of results (1-10)
- Returns structured search results with titles, links, and snippets
- Built with the official MCP SDK for JavaScript

## Prerequisites

- Node.js 18.0.0 or higher
- Google API Key
- Google Custom Search Engine ID

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Custom Search API

1. Get a Google API key:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Custom Search API"
   - Create credentials (API key)

2. Create a Custom Search Engine:
   - Go to [Google Custom Search](https://cse.google.com/)
   - Create a new search engine
   - Configure it to search the entire web or specific sites
   - Copy the Search Engine ID

### 3. Environment Configuration

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```
GOOGLE_API_KEY=your_actual_api_key
GOOGLE_SEARCH_ENGINE_ID=your_actual_search_engine_id
PORT=3000  # Optional: HTTP server port (default: 3000)
```

## Usage

### Running the Server

```bash
npm start
```

The server will start an HTTP server on port 3000 (or the port specified in the `PORT` environment variable).

**Endpoints:**
- `POST /mcp` - Main MCP endpoint for tool requests
- `GET /health` - Health check endpoint

**Example HTTP Request:**
```bash
curl -X POST -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     http://localhost:3000/mcp
```

### Available Tools

#### `web_search`

Searches the web using Google Custom Search API.

**Parameters:**
- `query` (string, required): The search query to execute
- `num` (number, optional): Number of results to return (1-10, default: 10)

**Example Tool Call:**
```bash
curl -X POST -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "web_search",
         "arguments": {
           "query": "MCP protocol documentation",
           "num": 5
         }
       }
     }' \
     http://localhost:3000/mcp
```

**Response:**
Returns a JSON object containing:
- `query`: The original search query
- `totalResults`: Total number of results found
- `searchTime`: Time taken for the search
- `results`: Array of search results with title, link, snippet, and displayLink

## Integration with MCP Clients

This server can be used with any MCP-compatible client that supports HTTP transport. 

**For HTTP-based integration:**
- Server URL: `http://localhost:3000/mcp`
- Protocol: JSON-RPC 2.0 over HTTP
- Content-Type: `application/json`
- Accept: `application/json, text/event-stream`

**For legacy stdio-based clients**, you would need to modify the server to use `StdioServerTransport` instead of `StreamableHTTPServerTransport`.

## Development

### Development Mode

Run the server in development mode with auto-restart:

```bash
npm run dev
```

## Error Handling

The server includes comprehensive error handling for:
- Missing or invalid API credentials
- Invalid search parameters
- API rate limits and errors
- Network connectivity issues

## License

MIT
