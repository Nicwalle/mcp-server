#!/usr/bin/env node

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

class GoogleSearchServer {
  constructor() {
    this.server = new Server(
      {
        name: 'google-search-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'web_search',
            description: 'Search the web using Google Custom Search API',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to execute',
                },
                num: {
                  type: 'number',
                  description: 'Number of results to return (1-10, default: 10)',
                  minimum: 1,
                  maximum: 10,
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'web_search') {
        return await this.handleWebSearch(args);
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    });
  }

  async handleWebSearch(args) {
    const { query, num = 10 } = args;

    if (!query || typeof query !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Query parameter is required and must be a string'
      );
    }

    try {
      // Check for required environment variables
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey) {
        throw new McpError(
          ErrorCode.InternalError,
          'GOOGLE_API_KEY environment variable is required'
        );
      }

      if (!searchEngineId) {
        throw new McpError(
          ErrorCode.InternalError,
          'GOOGLE_SEARCH_ENGINE_ID environment variable is required'
        );
      }

      // Initialize Google Custom Search API
      const customSearch = google.customsearch('v1');

      const response = await customSearch.cse.list({
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: Math.min(Math.max(num, 1), 10),
      });

      const results = response.data.items || [];
      
      const formattedResults = results.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              totalResults: response.data.searchInformation?.totalResults || '0',
              searchTime: response.data.searchInformation?.searchTime || '0',
              results: formattedResults,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Search failed: ${error.message}`
      );
    }
  }

  async run() {
    const app = express();
    app.use(express.json());

    // Handle MCP requests via HTTP POST
    app.post('/mcp', async (req, res) => {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
          enableJsonResponse: true, // Return JSON responses instead of SSE streams
        });
        
        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        
        res.on('close', () => {
          transport.close();
        });
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'Google Search MCP server is running' });
    });

    // Start the HTTP server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Google Search MCP server running on HTTP port ${PORT}`);
      console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      process.exit(0);
    });
  }
}

const server = new GoogleSearchServer();
server.run().catch(console.error);