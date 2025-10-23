# Expedia MCP Server with OpenAI Apps SDK

A TypeScript-based Model Context Protocol (MCP) server that integrates Expedia travel services with ChatGPT using the OpenAI Apps SDK. This server provides interactive UI widgets for hotel and flight searches with comprehensive filtering options.

## Features

- **2 Expedia Travel Tools** with rich UI widgets:
  - ✈️ **Flight Search** - Search flights with filters for airlines, stops, cabin class, and pricing
  - 🏨 **Hotel Search** - Find hotels worldwide with amenities, star ratings, and availability

- **Beautiful Interactive Widgets** - Custom HTML/CSS/JS components that render inline in ChatGPT
- **Real API Integration** - Uses RapidAPI for live hotel and flight data (with mock data fallback)
- **Cloudflare Workers Ready** - Deploy globally with zero-config scaling
- **TypeScript** - Fully typed for better development experience

## Project Structure

```
expedia-mcp-server/
├── src/
│   ├── server.ts          # Node.js MCP server (for local development)
│   └── worker.ts          # Cloudflare Workers deployment
├── ui-components/
│   ├── expedia-hotels.html   # Hotel search results widget
│   └── expedia-flights.html  # Flight search results widget
├── package.json
├── tsconfig.json
├── wrangler.toml          # Cloudflare Workers config
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)
- Wrangler CLI (for Cloudflare deployment)

## Installation

```bash
# Navigate to the project
cd expedia-mcp-server

# Install dependencies
npm install
# or
pnpm install

# Set up your API key (optional - uses mock data without key)
cp .env.example .env
# Edit .env and add your RAPIDAPI_KEY
```

## API Setup (Optional)

The server works without an API key using mock data. For real data:

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to:
   - **Booking.com API** for hotels
   - **Sky Scrapper API** for flights
3. Copy your API key to `.env`:
   ```
   RAPIDAPI_KEY=your_key_here
   ```

See [API_SETUP_GUIDE.md](../API_SETUP_GUIDE.md) for detailed instructions.

## Local Development

### Run the Node.js MCP Server

```bash
npm run dev
```

The server will start on `http://localhost:8000` with these endpoints:
- **SSE Stream**: `GET http://localhost:8000/mcp`
- **Message Post**: `POST http://localhost:8000/mcp/messages?sessionId=...`

### Test with ngrok

To test with ChatGPT locally, expose your server using ngrok:

```bash
# Install ngrok if you haven't
brew install ngrok  # macOS

# Expose your local server
ngrok http 8000
```

You'll get a public URL like `https://xyz789.ngrok-free.app`. Use this in ChatGPT:
- Go to ChatGPT Settings → Connectors
- Add connector: `https://xyz789.ngrok-free.app/mcp`

## Deployment to Cloudflare Workers

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Update wrangler.toml

Edit `wrangler.toml` and update:

```toml
name = "expedia-mcp-server"

[vars]
BASE_URL = "https://expedia-mcp.YOUR-SUBDOMAIN.workers.dev"
```

### Step 4: Deploy

```bash
npm run deploy
# or
wrangler deploy
```

After deployment, Wrangler will provide your worker URL:
```
https://expedia-mcp-server.YOUR-SUBDOMAIN.workers.dev
```

### Step 5: Add to ChatGPT

1. Open ChatGPT → Settings → Connectors
2. Click "Add Connector"
3. Enter your Cloudflare Worker URL with `/mcp/rpc` endpoint:
   ```
   https://expedia-mcp-server.YOUR-SUBDOMAIN.workers.dev/mcp/rpc
   ```
4. Save and test!

## Using in ChatGPT

Once connected, you can use natural language to search for hotels and flights:

**Hotel Search Examples:**

- "Find hotels in Paris from June 15 to June 22"
- "Show me 4-star hotels in Tokyo with pool and gym for 2 guests"
- "Search for hotels in New York under $200 per night with breakfast"
- "Find pet-friendly hotels in San Francisco with parking"

**Flight Search Examples:**

- "Find flights from LAX to JFK on December 20th"
- "Search for round-trip flights from New York to London departing March 5, returning March 15"
- "Show me nonstop flights from San Francisco to Seattle in business class"
- "Find cheapest flights from Chicago to Miami for 2 passengers"

The assistant will automatically invoke the appropriate tools and render the interactive widgets.

## Customization

### Current API Integration

The server now uses RapidAPI for real hotel and flight searches:

**With RAPIDAPI_KEY set:**
- Real-time hotel availability and pricing from Booking.com
- Live flight searches from Sky Scrapper API
- Actual ratings, reviews, and availability

**Without RAPIDAPI_KEY:**
- Automatically falls back to mock data
- Perfect for testing and development
- No API costs

### Custom API Integration

To use different APIs:

1. Sign up for [Expedia Rapid API](https://developers.expediagroup.com/) or use [RapidAPI Expedia endpoints](https://rapidapi.com/search/expedia)

2. Update the tool handlers in `src/worker.ts` (for Cloudflare) or `src/server.ts` (for Node):

```typescript
case WIDGETS.hotels.id: {
  const parsed = hotelSearchInputParser.parse(args);
  
  // Replace mock data with actual API call
  const response = await fetch('https://expedia-api.endpoint/hotels/search', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${env.EXPEDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      destination: parsed.destination,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      // ... other parameters
    })
  });
  
  const hotels = await response.json();
  
  return {
    content: [{ type: "text", text: `Found ${hotels.length} hotels` }],
    structuredContent: { hotels, destination: parsed.destination },
    _meta: widgetMeta(WIDGETS.hotels),
  };
}
```

3. Add API keys to Cloudflare Workers secrets:

```bash
wrangler secret put EXPEDIA_API_KEY
```

### Customizing UI Widgets

Edit the HTML files in `ui-components/` to customize the appearance:

- `expedia-hotels.html` - Hotel search results display
- `expedia-flights.html` - Flight search results display

The widgets receive data via `window.__WIDGET_PROPS__` and can be styled with inline CSS.

## Architecture

### How It Works

1. **ChatGPT** sends a user query to the MCP server
2. **MCP Server** exposes tools via the Model Context Protocol
3. **Tool Handler** processes the request and returns:
   - Plain text response
   - Structured data (JSON)
   - Widget metadata (`_meta.openai/outputTemplate`)
4. **ChatGPT** renders the widget inline using the HTML template
5. **Widget** hydrates with the structured data from the tool response

### MCP Protocol Flow

```
ChatGPT → GET /mcp (SSE connection)
       ← tools/list (available tools)
       ← resources/list (widget templates)
       
ChatGPT → tools/call (invoke tool)
       ← content + structuredContent + _meta
       
ChatGPT → resources/read (fetch widget HTML)
       ← HTML template
       
ChatGPT renders widget with data
```

## Tool Schemas

### search_hotels

**Input Parameters:**
- `destination` (required) - Destination city or location
- `checkIn` (required) - Check-in date (YYYY-MM-DD format)
- `checkOut` (required) - Check-out date (YYYY-MM-DD format)
- `guests` - Number of guests (default: 2)
- `rooms` - Number of rooms (default: 1)
- `minPrice` - Minimum price per night
- `maxPrice` - Maximum price per night
- `starRating` - Minimum star rating (1-5)
- `amenities` - Array of desired amenities (wifi, pool, parking, gym, breakfast, pet-friendly, spa)

**Output Widget:** Hotel cards showing name, price, rating, amenities, and location

### search_flights

**Input Parameters:**
- `origin` (required) - Origin airport code or city
- `destination` (required) - Destination airport code or city
- `departureDate` (required) - Departure date (YYYY-MM-DD format)
- `returnDate` - Return date for round-trip
- `passengers` - Number of passengers (default: 1)
- `cabinClass` - Cabin class (economy, premium-economy, business, first)
- `stops` - Number of stops filter (nonstop, 1-stop, 2+-stops, any)
- `airlines` - Array of preferred airlines
- `maxPrice` - Maximum price per passenger

**Output Widget:** Flight cards showing airline, times, duration, stops, and pricing

## Troubleshooting

### Server won't start

```bash
# Check if port 8000 is available
lsof -i :8000

# Use a different port
PORT=8001 npm run dev
```

### Widgets not rendering in ChatGPT

1. Check that the connector URL is correct
2. Verify CORS headers are set (already configured)
3. Check browser console for errors
4. Ensure `_meta.openai/outputTemplate` matches the resource URI

### Cloudflare deployment fails

```bash
# Check your Cloudflare account
wrangler whoami

# Test locally first
wrangler dev
```

## Performance

- **Cloudflare Workers**: ~50ms cold start, ~10ms warm requests
- **Global CDN**: Deploy to 200+ cities worldwide
- **No Database**: Stateless design for maximum scalability

## Security

- **No Auth Required**: This example doesn't use authentication (mock data only)
- **CORS Enabled**: Allows ChatGPT to connect from any origin
- **Input Validation**: Uses Zod schemas to validate all inputs
- **Sandboxed Widgets**: HTML widgets run in isolated iframes

## License

MIT License - feel free to use this as a template for your own MCP servers!

## Resources

- [OpenAI Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Expedia API Documentation](https://developers.expediagroup.com/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using TypeScript, MCP, and OpenAI Apps SDK

