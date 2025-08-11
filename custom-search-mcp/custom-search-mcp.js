#!/usr/bin/env node

/**
 * Custom Search MCP Server
 *
 * Provides web search capabilities through DuckDuckGo and Bing
 * without requiring API keys. Uses HTML scraping with proper
 * error handling and rate limiting considerations.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

// Constants
const DEFAULT_MAX_RESULTS = 10;
const MAX_ALLOWED_RESULTS = 50;
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_LINKS = 20; // Maximum number of links to extract from a page

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

class CustomSearchServer {
  constructor() {
    this.server = new Server(
      {
        name: "custom-search-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // Common validation and utility methods
  validateSearchArgs(args) {
    const { query, max_results = DEFAULT_MAX_RESULTS } = args;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error(
        "Query parameter is required and must be a non-empty string"
      );
    }

    const validatedMaxResults = Math.min(
      Math.max(1, parseInt(max_results) || DEFAULT_MAX_RESULTS),
      MAX_ALLOWED_RESULTS
    );
    if (validatedMaxResults !== max_results) {
      console.warn(
        `max_results adjusted from ${max_results} to ${validatedMaxResults}`
      );
    }

    return { query: query.trim(), max_results: validatedMaxResults };
  }

  validatePageContentArgs(args) {
    const { url, include_links = false, max_length = 5000 } = args;

    if (!url || typeof url !== "string") {
      throw new Error("URL parameter is required and must be a string");
    }

    const trimmedUrl = url.trim();
    if (
      !trimmedUrl.startsWith("http://") &&
      !trimmedUrl.startsWith("https://")
    ) {
      throw new Error("URL must start with http:// or https://");
    }

    const validatedMaxLength = Math.min(
      Math.max(100, parseInt(max_length) || 5000),
      50000
    );

    return {
      url: trimmedUrl,
      include_links: Boolean(include_links),
      max_length: validatedMaxLength,
    };
  }

  async makeSearchRequest(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = this.getHttpErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      return response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(
          `Request timed out after ${REQUEST_TIMEOUT / 1000} seconds`
        );
      }
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        throw new Error(
          "Network connection failed. Please check your internet connection."
        );
      }
      throw error;
    }
  }

  getHttpErrorMessage(status) {
    const errorMessages = {
      429: "Rate limited. Please try again later.",
      403: "Access forbidden. The search engine may be blocking requests.",
      404: "Page not found.",
      500: "Server error. Please try again later.",
      502: "Bad gateway. The server is temporarily unavailable.",
      503: "Service unavailable. Please try again later.",
    };
    return errorMessages[status] || `HTTP error! status: ${status}`;
  }

  validatePageContentArgs(args) {
    const { url, include_links = false, max_length = 5000 } = args;

    if (!url || typeof url !== "string") {
      throw new Error("URL parameter is required and must be a string");
    }

    const trimmedUrl = url.trim();
    if (
      !trimmedUrl.startsWith("http://") &&
      !trimmedUrl.startsWith("https://")
    ) {
      throw new Error("URL must start with http:// or https://");
    }

    const validatedMaxLength = Math.min(
      Math.max(100, parseInt(max_length) || 5000),
      50000
    );

    return {
      url: trimmedUrl,
      include_links: Boolean(include_links),
      max_length: validatedMaxLength,
    };
  }

  formatSearchResponse(query, results) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              query,
              results,
              total_results: results.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  formatErrorResponse(message) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_duckduckgo",
          description: "Search the web using DuckDuckGo",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              max_results: {
                type: "number",
                description:
                  "Maximum number of results to return (default: 10)",
                default: 10,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "search_bing",
          description: "Search using Bing (without API key)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              max_results: {
                type: "number",
                description:
                  "Maximum number of results to return (default: 10)",
                default: 10,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "fetch_page_content",
          description: "Fetch and extract the main content from a web page",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL of the web page to fetch content from",
              },
              include_links: {
                type: "boolean",
                description:
                  "Whether to include links found on the page (default: false)",
                default: false,
              },
              max_length: {
                type: "number",
                description:
                  "Maximum length of content to return (default: 5000, max: 50000)",
                default: 5000,
              },
            },
            required: ["url"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "search_duckduckgo":
          return await this.searchDuckDuckGo(request.params.arguments);
        case "search_bing":
          return await this.searchBing(request.params.arguments);
        case "fetch_page_content":
          return await this.fetchPageContent(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async searchDuckDuckGo(args) {
    try {
      const { query, max_results } = this.validateSearchArgs(args);

      // DuckDuckGo HTML search
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        query
      )}`;
      const html = await this.makeSearchRequest(searchUrl);
      const $ = cheerio.load(html);

      const results = [];
      $(".result").each((_, element) => {
        if (results.length >= max_results) return false;

        const $element = $(element);
        const title = $element.find(".result__title a").text().trim();
        const link = $element.find(".result__title a").attr("href");
        const snippet = $element.find(".result__snippet").text().trim();

        if (title && link) {
          results.push({
            title,
            url: link.startsWith("http") ? link : `https:${link}`,
            snippet,
          });
        }
      });

      return this.formatSearchResponse(query, results);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching DuckDuckGo: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async searchBing(args) {
    try {
      const { query, max_results } = this.validateSearchArgs(args);

      // Bing search without API
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(
        query
      )}`;
      const html = await this.makeSearchRequest(searchUrl);
      const $ = cheerio.load(html);

      const results = [];
      $(".b_algo").each((_, element) => {
        if (results.length >= max_results) return false;

        const $element = $(element);
        const title = $element.find("h2 a").text().trim();
        const link = $element.find("h2 a").attr("href");
        const snippet = $element.find(".b_caption p").text().trim();

        if (title && link) {
          results.push({
            title,
            url: link,
            snippet,
          });
        }
      });

      return this.formatSearchResponse(query, results);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching Bing: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async fetchPageContent(args) {
    try {
      const { url, include_links, max_length } =
        this.validatePageContentArgs(args);

      // Fetch the page content
      const html = await this.makeSearchRequest(url);
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $(
        "script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .menu, .navigation, .breadcrumb, .social-share, .comments"
      ).remove();

      // Extract main content
      let content = "";
      const mainSelectors = [
        "main",
        "article",
        ".content",
        ".post",
        ".entry",
        "#content",
        ".main",
        ".article-content",
        ".post-content",
        ".entry-content",
        "[role='main']",
      ];

      let foundMain = false;
      for (const selector of mainSelectors) {
        const mainContent = $(selector);
        if (mainContent.length > 0) {
          const text = mainContent.text().trim();
          if (text.length > 200) {
            content = text;
            foundMain = true;
            break;
          }
        }
      }

      // If no main content found, extract from body
      if (!foundMain) {
        content = $("body").text().trim();
      }

      // Clean up text
      content = content
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, "\n") // Remove multiple empty lines
        .replace(/\t/g, " ") // Replace tabs with spaces
        .trim();

      // Extract links if requested
      let links = [];
      if (include_links) {
        const seenUrls = new Set();
        $("a[href]").each((_, element) => {
          const href = $(element).attr("href");
          const text = $(element).text().trim();

          if (href && text && href.length > 0 && text.length > 0) {
            let fullUrl = href;

            // Convert relative URLs to absolute
            if (href.startsWith("/")) {
              const urlObj = new URL(url);
              fullUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
            } else if (
              !href.startsWith("http") &&
              !href.startsWith("mailto:") &&
              !href.startsWith("tel:")
            ) {
              try {
                const urlObj = new URL(url);
                const basePath = urlObj.pathname.endsWith("/")
                  ? urlObj.pathname
                  : urlObj.pathname.split("/").slice(0, -1).join("/") + "/";
                fullUrl = `${urlObj.protocol}//${urlObj.host}${basePath}${href}`;
              } catch (e) {
                // Skip invalid URLs
                return;
              }
            }

            // Only include HTTP(S) links and avoid duplicates
            if (
              (fullUrl.startsWith("http://") ||
                fullUrl.startsWith("https://")) &&
              !seenUrls.has(fullUrl) &&
              text.length > 2 &&
              text.length < 200
            ) {
              seenUrls.add(fullUrl);
              links.push({ url: fullUrl, text: text.substring(0, 100) });
            }
          }
        });

        // Limit to MAX_LINKS and sort by text length (prefer descriptive links)
        links = links
          .sort((a, b) => b.text.length - a.text.length)
          .slice(0, MAX_LINKS);
      }

      // Truncate content if too long
      let wasTruncated = false;
      if (content.length > max_length) {
        content = content.substring(0, max_length) + "...";
        wasTruncated = true;
      }

      // Extract metadata
      const title =
        $("title").text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        $("h1").first().text().trim() ||
        "No title found";

      const description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "";

      const result = {
        url,
        title: title.substring(0, 200), // Limit title length
        description: description.substring(0, 300), // Limit description length
        content,
        content_length: content.length,
        original_length: wasTruncated ? ">" + max_length : content.length,
        was_truncated: wasTruncated,
        ...(include_links && { links, links_count: links.length }),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching page content: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Custom Search MCP server running on stdio");
  }
}

const server = new CustomSearchServer();
server.run().catch(console.error);
