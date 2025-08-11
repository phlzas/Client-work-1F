# SerpAPI MCP Server Documentation

## Overview

The SerpAPI MCP (Model Context Protocol) server provides search capabilities through the SerpAPI service. This server allows AI assistants to perform web searches across multiple search engines including Google, Bing, Yahoo, DuckDuckGo, and others.

## Features

- **Multiple Search Engines**: Support for 10+ search engines including Google, Bing, Yahoo, eBay, YouTube, DuckDuckGo, Yandex, and Baidu
- **Configurable Results**: Control the number of search results returned (1-100)
- **Location-based Search**: Optional location parameter for geographically relevant results
- **Structured Results**: Returns formatted JSON with title, link, snippet, and position data
- **Error Handling**: Comprehensive error handling with clear error messages

## Installation

### Prerequisites

- Python 3.7+
- SerpAPI account and API key
- Required Python packages:
  - `google-search-results` (serpapi)
  - `python-dotenv`
  - `mcp`

### Setup

1. **Install Dependencies**:

   ```bash
   pip install google-search-results python-dotenv mcp
   ```

2. **Get SerpAPI Key**:

   - Sign up at [SerpAPI](https://serpapi.com/)
   - Get your API key from the dashboard

3. **Configure Environment**:
   Create a `.env` file in the same directory as the server:
   ```env
   SERPAPI_API_KEY=your_api_key_here
   ```

## Configuration

### MCP Server Configuration

Add the following to your MCP configuration file (`.kiro/settings/mcp.json` or `~/.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "serpapi-search": {
      "command": "python",
      "args": [".kiro/serpapi_mcp_server.py"],
      "env": {
        "SERPAPI_API_KEY": "your_api_key_here"
      },
      "disabled": false,
      "autoApprove": ["search"]
    }
  }
}
```

### Environment Variables

- `SERPAPI_API_KEY`: Your SerpAPI API key (required)

## Usage

### Available Tools

#### search

Perform a search using SerpAPI with the following parameters:

**Parameters:**

- `query` (required): The search query string
- `engine` (optional): Search engine to use (default: "google")
- `location` (optional): Location for geographically relevant results
- `num` (optional): Number of results to return (1-100, default: 10)

**Supported Engines:**

- `google` - Google Search (default)
- `google_light` - Google Search (lightweight)
- `bing` - Bing Search
- `walmart` - Walmart Product Search
- `yahoo` - Yahoo Search
- `ebay` - eBay Product Search
- `youtube` - YouTube Video Search
- `duckduckgo` - DuckDuckGo Search
- `yandex` - Yandex Search
- `baidu` - Baidu Search

### Example Usage

```python
# Basic search
result = await call_tool("search", {
    "query": "Python programming tutorial"
})

# Search with specific engine and location
result = await call_tool("search", {
    "query": "restaurants near me",
    "engine": "google",
    "location": "New York, NY",
    "num": 5
})

# YouTube video search
result = await call_tool("search", {
    "query": "machine learning explained",
    "engine": "youtube",
    "num": 10
})
```

### Response Format

The search tool returns a JSON response with the following structure:

```json
{
  "query": "search query",
  "engine": "google",
  "location": "location if specified",
  "results": [
    {
      "title": "Result Title",
      "link": "https://example.com",
      "snippet": "Description of the result...",
      "position": 1
    }
  ],
  "total_results": 10
}
```

## Available Resources

### engines://supported

Returns a list of all supported search engines.

## Error Handling

The server provides comprehensive error handling for common scenarios:

- **Missing API Key**: Clear message when SERPAPI_API_KEY is not configured
- **Invalid Parameters**: Validation of required parameters
- **API Errors**: Forwarding of SerpAPI error messages
- **Network Issues**: Graceful handling of connection problems

## Development

### Running the Server

To run the server directly for testing:

```bash
python .kiro/serpapi_mcp_server.py
```

### Testing

Test the server functionality:

```python
# Test basic search
import asyncio
from mcp.client import ClientSession

async def test_search():
    # Your test code here
    pass

asyncio.run(test_search())
```

## Troubleshooting

### Common Issues

1. **"SERPAPI_API_KEY not found"**

   - Ensure your API key is set in the environment or .env file
   - Check that the .env file is in the correct directory

2. **"No results returned"**

   - Verify your search query is valid
   - Check if the selected search engine supports your query type
   - Ensure your API key has sufficient credits

3. **Connection errors**
   - Check your internet connection
   - Verify SerpAPI service status
   - Ensure firewall isn't blocking the connection

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export FASTMCP_LOG_LEVEL=DEBUG
python .kiro/serpapi_mcp_server.py
```

## API Limits

- **Free Plan**: 100 searches per month
- **Paid Plans**: Various limits based on subscription
- **Rate Limiting**: SerpAPI enforces rate limits based on your plan

Check your usage at the [SerpAPI dashboard](https://serpapi.com/dashboard).

## Security Considerations

- **API Key Protection**: Never commit API keys to version control
- **Environment Variables**: Use environment variables or secure configuration files
- **Access Control**: Consider using the `autoApprove` setting carefully in production

## Contributing

When modifying the server:

1. Follow Python best practices and PEP 8
2. Add appropriate error handling for new features
3. Update this documentation for any changes
4. Test with multiple search engines
5. Ensure backward compatibility

## License

This MCP server implementation is part of the Student Management System project. See the main project license for details.
