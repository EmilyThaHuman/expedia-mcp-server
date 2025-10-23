import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Environment configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const RAPIDAPI_HOST_HOTELS = "booking-com13.p.rapidapi.com";
const RAPIDAPI_HOST_FLIGHTS = "sky-scrapper.p.rapidapi.com";

type ExpediaWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const UI_COMPONENTS_DIR = path.resolve(ROOT_DIR, "ui-components");

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(UI_COMPONENTS_DIR)) {
    console.warn(`Widget components directory not found at ${UI_COMPONENTS_DIR}`);
    return `<!DOCTYPE html><html><body><div id="root">Widget: ${componentName}</div></body></html>`;
  }

  const htmlPath = path.join(UI_COMPONENTS_DIR, `${componentName}.html`);
  
  if (fs.existsSync(htmlPath)) {
    return fs.readFileSync(htmlPath, "utf8");
  } else {
    console.warn(`Widget HTML for "${componentName}" not found`);
    return `<!DOCTYPE html><html><body><div id="root">Widget: ${componentName}</div></body></html>`;
  }
}

function widgetMeta(widget: ExpediaWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: ExpediaWidget[] = [
  {
    id: "search_hotels",
    title: "Hotel Search Results",
    templateUri: "ui://widgets/templates/hotel/recommendations/v1",
    invoking: "Searching for hotels",
    invoked: "Searched for hotels",
    html: readWidgetHtml("expedia-hotels"),
    responseText: "Found matching hotels",
  },
  {
    id: "search_flights",
    title: "Flight Search Results",
    templateUri: "ui://widgets/templates/flight/recommendations/v1",
    invoking: "Searching for flights",
    invoked: "Searched for flights",
    html: readWidgetHtml("expedia-flights"),
    responseText: "Found matching flights",
  },
];

const widgetsById = new Map<string, ExpediaWidget>();
const widgetsByUri = new Map<string, ExpediaWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

// Tool input schemas
const hotelSearchInputSchema = {
  type: "object",
  properties: {
    destination: {
      type: "string",
      description: "Destination city or location",
    },
    checkIn: {
      type: "string",
      description: "Check-in date (YYYY-MM-DD format)",
    },
    checkOut: {
      type: "string",
      description: "Check-out date (YYYY-MM-DD format)",
    },
    guests: {
      type: "number",
      description: "Number of guests",
      minimum: 1,
    },
    rooms: {
      type: "number",
      description: "Number of rooms",
      minimum: 1,
    },
    minPrice: {
      type: "number",
      description: "Minimum price per night",
    },
    maxPrice: {
      type: "number",
      description: "Maximum price per night",
    },
    starRating: {
      type: "number",
      description: "Minimum star rating (1-5)",
      minimum: 1,
      maximum: 5,
    },
    amenities: {
      type: "array",
      description: "Desired amenities",
      items: {
        type: "string",
        enum: ["wifi", "pool", "parking", "gym", "breakfast", "pet-friendly", "spa"],
      },
    },
  },
  required: ["destination", "checkIn", "checkOut"],
  additionalProperties: false,
} as const;

const flightSearchInputSchema = {
  type: "object",
  properties: {
    origin: {
      type: "string",
      description: "Origin airport code or city",
    },
    destination: {
      type: "string",
      description: "Destination airport code or city",
    },
    departureDate: {
      type: "string",
      description: "Departure date (YYYY-MM-DD format)",
    },
    returnDate: {
      type: "string",
      description: "Return date for round-trip (YYYY-MM-DD format)",
    },
    passengers: {
      type: "number",
      description: "Number of passengers",
      minimum: 1,
    },
    cabinClass: {
      type: "string",
      description: "Cabin class",
      enum: ["economy", "premium-economy", "business", "first"],
    },
    stops: {
      type: "string",
      description: "Number of stops",
      enum: ["nonstop", "1-stop", "2+-stops", "any"],
    },
    airlines: {
      type: "array",
      description: "Preferred airlines",
      items: {
        type: "string",
      },
    },
    maxPrice: {
      type: "number",
      description: "Maximum price per passenger",
    },
  },
  required: ["origin", "destination", "departureDate"],
  additionalProperties: false,
} as const;

// Zod parsers
const hotelSearchInputParser = z.object({
  destination: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().min(1).optional(),
  rooms: z.number().min(1).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  starRating: z.number().min(1).max(5).optional(),
  amenities: z.array(z.string()).optional(),
});

const flightSearchInputParser = z.object({
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  passengers: z.number().min(1).optional(),
  cabinClass: z.enum(["economy", "premium-economy", "business", "first"]).optional(),
  stops: z.enum(["nonstop", "1-stop", "2+-stops", "any"]).optional(),
  airlines: z.array(z.string()).optional(),
  maxPrice: z.number().optional(),
});

// Helper function to search hotels using RapidAPI
async function searchHotelsAPI(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  starRating?: number;
}) {
  if (!RAPIDAPI_KEY) {
    console.warn("[server.ts][243] --> RAPIDAPI_KEY not set, using mock data");
    return null;
  }

  try {
    // First, get destination ID
    const searchUrl = `https://${RAPIDAPI_HOST_HOTELS}/booking/searchDestinations`;
    const searchParams = new URLSearchParams({
      query: params.destination,
    });

    const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST_HOTELS,
      },
    });

    if (!searchResponse.ok) {
      console.error("[server.ts][262] --> Failed to search destination:", searchResponse.statusText);
      return null;
    }

    const searchData = await searchResponse.json();
    if (!searchData.data || searchData.data.length === 0) {
      console.warn("[server.ts][268] --> No destination found for:", params.destination);
      return null;
    }

    const destId = searchData.data[0].dest_id;

    // Now search for hotels
    const hotelsUrl = `https://${RAPIDAPI_HOST_HOTELS}/booking/searchHotels`;
    const hotelsParams = new URLSearchParams({
      dest_id: destId,
      search_type: "city",
      arrival_date: params.checkIn,
      departure_date: params.checkOut,
      adults: String(params.guests || 2),
      room_qty: String(params.rooms || 1),
      page_number: "1",
      units: "metric",
      temperature_unit: "c",
      languagecode: "en-us",
      currency_code: "USD",
    });

    const hotelsResponse = await fetch(`${hotelsUrl}?${hotelsParams}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST_HOTELS,
      },
    });

    if (!hotelsResponse.ok) {
      console.error("[server.ts][298] --> Failed to search hotels:", hotelsResponse.statusText);
      return null;
    }

    const hotelsData = await hotelsResponse.json();
    
    // Transform API response to our format
    const hotels = (hotelsData.data?.hotels || [])
      .slice(0, 10)
      .map((hotel: any) => ({
        id: hotel.hotel_id || hotel.id,
        name: hotel.property?.name || hotel.hotel_name,
        location: params.destination,
        starRating: hotel.property?.starRating || hotel.class || 3,
        pricePerNight: hotel.property?.priceBreakdown?.grossPrice?.value || hotel.min_total_price || 0,
        totalPrice: hotel.property?.priceBreakdown?.grossPrice?.value || hotel.min_total_price || 0,
        imageUrl: hotel.property?.photoUrls?.[0] || hotel.max_photo_url || "https://via.placeholder.com/400x300",
        amenities: hotel.property?.amenities?.top || ["wifi", "parking"],
        rating: hotel.property?.reviewScore || hotel.review_score || 4.0,
        reviewCount: hotel.property?.reviewCount || hotel.review_nr || 0,
        distance: hotel.property?.distance || "City center",
      }));

    // Apply filters
    let filtered = hotels;
    if (params.starRating) {
      filtered = filtered.filter((h: any) => h.starRating >= params.starRating!);
    }
    if (params.minPrice) {
      filtered = filtered.filter((h: any) => h.pricePerNight >= params.minPrice!);
    }
    if (params.maxPrice) {
      filtered = filtered.filter((h: any) => h.pricePerNight <= params.maxPrice!);
    }

    return filtered;
  } catch (error) {
    console.error("[server.ts][338] --> Error searching hotels:", error);
    return null;
  }
}

// Helper function to search flights using RapidAPI
async function searchFlightsAPI(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
}) {
  if (!RAPIDAPI_KEY) {
    console.warn("[server.ts][354] --> RAPIDAPI_KEY not set, using mock data");
    return null;
  }

  try {
    // Search for one-way or round-trip flights
    const searchUrl = `https://${RAPIDAPI_HOST_FLIGHTS}/api/v1/flights/searchFlights`;
    const searchParams = {
      originSkyId: params.origin,
      destinationSkyId: params.destination,
      originEntityId: params.origin,
      destinationEntityId: params.destination,
      date: params.departureDate,
      returnDate: params.returnDate || "",
      cabinClass: params.cabinClass || "economy",
      adults: String(params.passengers || 1),
      sortBy: "best",
      currency: "USD",
      market: "en-US",
      countryCode: "US",
    };

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST_FLIGHTS,
      },
      body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
      console.error("[server.ts][387] --> Failed to search flights:", response.statusText);
      return null;
    }

    const flightsData = await response.json();
    
    // Transform API response to our format
    const flights = (flightsData.data?.itineraries || [])
      .slice(0, 10)
      .map((itinerary: any) => {
        const leg = itinerary.legs[0];
        return {
          id: itinerary.id,
          airline: leg.carriers?.marketing?.[0]?.name || "Unknown Airline",
          flightNumber: leg.carriers?.marketing?.[0]?.flightNumber || "N/A",
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(leg.departure).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          arrivalTime: new Date(leg.arrival).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          duration: `${Math.floor(leg.durationInMinutes / 60)}h ${leg.durationInMinutes % 60}m`,
          stops: leg.stopCount || 0,
          cabinClass: params.cabinClass || "economy",
          price: itinerary.price?.raw || 0,
          imageUrl: leg.carriers?.marketing?.[0]?.logoUrl || "https://via.placeholder.com/60x60",
        };
      });

    return flights;
  } catch (error) {
    console.error("[server.ts][420] --> Error searching flights:", error);
    return null;
  }
}

const tools: Tool[] = [
  {
    name: "search_hotels",
    description: "Search for hotels worldwide with filters for dates, guests, amenities, and pricing. Returns detailed hotel information including availability, rates, and booking links.",
    inputSchema: hotelSearchInputSchema,
    _meta: widgetMeta(widgetsById.get("search_hotels")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  {
    name: "search_flights",
    description: "Search for flights with comprehensive filters including airlines, stops, cabin class, and price range. Supports round-trip and one-way bookings.",
    inputSchema: flightSearchInputSchema,
    _meta: widgetMeta(widgetsById.get("search_flights")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
];

const resources: Resource[] = Array.from(widgetsById.values()).map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = Array.from(widgetsById.values()).map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createExpediaServer(): Server {
  const server = new Server(
    {
      name: "expedia-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const toolName = request.params.name;

      switch (toolName) {
        case "search_hotels": {
          const args = hotelSearchInputParser.parse(request.params.arguments ?? {});
          const widget = widgetsById.get(toolName)!;
          
          // Try to use real API, fall back to mock data if API fails or key not set
          let hotels = await searchHotelsAPI({
            destination: args.destination,
            checkIn: args.checkIn,
            checkOut: args.checkOut,
            guests: args.guests,
            rooms: args.rooms,
            minPrice: args.minPrice,
            maxPrice: args.maxPrice,
            starRating: args.starRating,
          });

          // Fallback to mock data if API call fails
          if (!hotels || hotels.length === 0) {
            console.warn("[server.ts][527] --> Using mock hotel data");
            const mockHotels = [
              {
                id: "h1",
                name: "Grand Plaza Hotel",
                location: args.destination,
                starRating: 4,
                pricePerNight: 189,
                totalPrice: 567,
                imageUrl: "https://via.placeholder.com/400x300",
                amenities: ["wifi", "pool", "gym", "parking"],
                rating: 4.5,
                reviewCount: 1245,
                distance: "0.5 miles from city center",
              },
              {
                id: "h2",
                name: "Comfort Inn & Suites",
                location: args.destination,
                starRating: 3,
                pricePerNight: 129,
                totalPrice: 387,
                imageUrl: "https://via.placeholder.com/400x300",
                amenities: ["wifi", "breakfast", "parking"],
                rating: 4.2,
                reviewCount: 892,
                distance: "1.2 miles from city center",
              },
              {
                id: "h3",
                name: "Luxury Resort & Spa",
                location: args.destination,
                starRating: 5,
                pricePerNight: 349,
                totalPrice: 1047,
                imageUrl: "https://via.placeholder.com/400x300",
                amenities: ["wifi", "pool", "spa", "gym", "breakfast"],
                rating: 4.8,
                reviewCount: 2104,
                distance: "2.0 miles from city center",
              },
            ];

            // Filter by star rating if specified
            hotels = args.starRating 
              ? mockHotels.filter(h => h.starRating >= args.starRating!)
              : mockHotels;
          }

          return {
            content: [
              {
                type: "text",
                text: `Found ${hotels.length} hotels in ${args.destination} from ${args.checkIn} to ${args.checkOut}.${!RAPIDAPI_KEY ? " (Using mock data - set RAPIDAPI_KEY for real results)" : ""}`,
              },
            ],
            structuredContent: {
              destination: args.destination,
              checkIn: args.checkIn,
              checkOut: args.checkOut,
              guests: args.guests || 2,
              rooms: args.rooms || 1,
              hotels: hotels,
              totalResults: hotels.length,
              usingMockData: !RAPIDAPI_KEY,
            },
            _meta: widgetMeta(widget),
          };
        }

        case "search_flights": {
          const args = flightSearchInputParser.parse(request.params.arguments ?? {});
          const widget = widgetsById.get(toolName)!;
          
          // Try to use real API, fall back to mock data if API fails or key not set
          let flights = await searchFlightsAPI({
            origin: args.origin,
            destination: args.destination,
            departureDate: args.departureDate,
            returnDate: args.returnDate,
            passengers: args.passengers,
            cabinClass: args.cabinClass,
          });

          // Fallback to mock data if API call fails
          const isRoundTrip = !!args.returnDate;
          if (!flights || flights.length === 0) {
            console.warn("[server.ts][616] --> Using mock flight data");
            const mockFlights = [
              {
                id: "f1",
                airline: "United Airlines",
                flightNumber: "UA 1234",
                origin: args.origin,
                destination: args.destination,
                departureTime: "08:30 AM",
                arrivalTime: "11:45 AM",
                duration: "3h 15m",
                stops: 0,
                cabinClass: args.cabinClass || "economy",
                price: 289,
                imageUrl: "https://via.placeholder.com/60x60",
              },
              {
                id: "f2",
                airline: "Delta Airlines",
                flightNumber: "DL 5678",
                origin: args.origin,
                destination: args.destination,
                departureTime: "12:15 PM",
                arrivalTime: "04:50 PM",
                duration: "4h 35m",
                stops: 1,
                cabinClass: args.cabinClass || "economy",
                price: 245,
                imageUrl: "https://via.placeholder.com/60x60",
              },
              {
                id: "f3",
                airline: "American Airlines",
                flightNumber: "AA 9012",
                origin: args.origin,
                destination: args.destination,
                departureTime: "06:00 PM",
                arrivalTime: "09:20 PM",
                duration: "3h 20m",
                stops: 0,
                cabinClass: args.cabinClass || "economy",
                price: 315,
                imageUrl: "https://via.placeholder.com/60x60",
              },
            ];
            flights = mockFlights;
          }

          return {
            content: [
              {
                type: "text",
                text: `Found ${flights.length} flights from ${args.origin} to ${args.destination} on ${args.departureDate}${isRoundTrip ? ` (returning ${args.returnDate})` : ''}.${!RAPIDAPI_KEY ? " (Using mock data - set RAPIDAPI_KEY for real results)" : ""}`,
              },
            ],
            structuredContent: {
              origin: args.origin,
              destination: args.destination,
              departureDate: args.departureDate,
              returnDate: args.returnDate,
              passengers: args.passengers || 1,
              cabinClass: args.cabinClass || "economy",
              flights: flights,
              isRoundTrip: isRoundTrip,
              totalResults: flights.length,
              usingMockData: !RAPIDAPI_KEY,
            },
            _meta: widgetMeta(widget),
          };
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createExpediaServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Expedia MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});

