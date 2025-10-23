/**
 * Cloudflare Worker for Expedia MCP Server
 * This worker handles SSE connections and MCP protocol for ChatGPT integration
 */

import { z } from "zod";

// Widget definitions
const WIDGETS = {
  hotels: {
    id: "search_hotels",
    title: "Hotel Search Results",
    templateUri: "ui://widgets/templates/hotel/recommendations/v1",
    invoking: "Searching for hotels",
    invoked: "Searched for hotels",
  },
  flights: {
    id: "search_flights",
    title: "Flight Search Results",
    templateUri: "ui://widgets/templates/flight/recommendations/v1",
    invoking: "Searching for flights",
    invoked: "Searched for flights",
  },
};

// UI Components as embedded HTML
const UI_COMPONENTS: Record<string, string> = {
  "hotel/recommendations/v1": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotel Search Results</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px; background: #f5f5f7; }
    .header { margin-bottom: 24px; }
    .search-title { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .search-subtitle { font-size: 16px; color: #666; }
    .hotels-container { display: grid; gap: 16px; }
    .hotel-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s; cursor: pointer; display: flex; }
    .hotel-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.12); }
    .hotel-image { width: 240px; height: 180px; object-fit: cover; background: #e0e0e0; }
    .hotel-info { flex: 1; padding: 20px; }
    .hotel-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
    .hotel-name { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .hotel-price { text-align: right; }
    .price-amount { font-size: 28px; font-weight: 800; color: #0066cc; }
    .price-label { font-size: 13px; color: #666; }
    .hotel-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .stars { color: #ffa500; font-size: 18px; }
    .rating-score { font-weight: 600; font-size: 16px; }
    .review-count { font-size: 14px; color: #666; }
    .hotel-location { font-size: 14px; color: #666; margin-bottom: 12px; }
    .amenities { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .amenity { padding: 6px 12px; background: #e3f2fd; color: #1976d2; border-radius: 16px; font-size: 12px; font-weight: 500; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const props = window.__WIDGET_PROPS__ || {};
      const { hotels = [], destination = '', checkIn = '', checkOut = '', totalResults = 0 } = props;
      
      const root = document.getElementById('root');
      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = '<div class="search-title">' + destination + '</div><div class="search-subtitle">' + checkIn + ' - ' + checkOut + ' · ' + totalResults + ' hotels found</div>';
      root.appendChild(header);
      
      const container = document.createElement('div');
      container.className = 'hotels-container';
      
      hotels.forEach(hotel => {
        const card = document.createElement('div');
        card.className = 'hotel-card';
        
        const starsHTML = '★'.repeat(hotel.starRating) + '☆'.repeat(5 - hotel.starRating);
        const amenitiesHTML = hotel.amenities.map(a => '<span class="amenity">' + a + '</span>').join('');
        
        card.innerHTML = '<img src="' + hotel.imageUrl + '" class="hotel-image" onerror="this.src=\'https://via.placeholder.com/240x180\'"><div class="hotel-info"><div class="hotel-header"><div><div class="hotel-name">' + hotel.name + '</div></div><div class="hotel-price"><div class="price-amount">$' + hotel.pricePerNight + '</div><div class="price-label">per night</div></div></div><div class="hotel-rating"><span class="stars">' + starsHTML + '</span><span class="rating-score">' + hotel.rating + '</span><span class="review-count">(' + hotel.reviewCount + ' reviews)</span></div><div class="hotel-location">📍 ' + hotel.distance + '</div><div class="amenities">' + amenitiesHTML + '</div></div>';
        
        container.appendChild(card);
      });
      
      root.appendChild(container);
    })();
  </script>
</body>
</html>`,

  "flight/recommendations/v1": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Search Results</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px; background: #f5f5f7; }
    .header { margin-bottom: 24px; }
    .search-title { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .search-subtitle { font-size: 16px; color: #666; }
    .flights-container { display: grid; gap: 16px; }
    .flight-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s; cursor: pointer; }
    .flight-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.12); }
    .flight-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .airline-info { display: flex; align-items: center; gap: 12px; }
    .airline-logo { width: 50px; height: 50px; border-radius: 8px; background: #e0e0e0; }
    .airline-name { font-weight: 600; font-size: 18px; }
    .flight-number { font-size: 14px; color: #666; }
    .price { font-size: 32px; font-weight: 800; color: #0066cc; }
    .flight-route { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .route-time { font-size: 24px; font-weight: 700; }
    .route-code { font-size: 14px; color: #666; margin-top: 4px; }
    .route-line { flex: 1; height: 2px; background: #e0e0e0; position: relative; }
    .route-plane { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); font-size: 18px; }
    .flight-details { display: flex; gap: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
    .detail { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #666; }
    .detail-value { font-weight: 600; color: #1a1a1a; }
    .stops-badge { padding: 4px 12px; background: #4caf50; color: white; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .stops-badge.has-stops { background: #ff9800; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const props = window.__WIDGET_PROPS__ || {};
      const { flights = [], origin = '', destination = '', departureDate = '', isRoundTrip = false, returnDate = '', totalResults = 0 } = props;
      
      const root = document.getElementById('root');
      const header = document.createElement('div');
      header.className = 'header';
      const tripType = isRoundTrip ? 'Round-trip' : 'One-way';
      header.innerHTML = '<div class="search-title">' + origin + ' → ' + destination + '</div><div class="search-subtitle">' + tripType + ' · ' + departureDate + (isRoundTrip ? ' - ' + returnDate : '') + ' · ' + totalResults + ' flights found</div>';
      root.appendChild(header);
      
      const container = document.createElement('div');
      container.className = 'flights-container';
      
      flights.forEach(flight => {
        const card = document.createElement('div');
        card.className = 'flight-card';
        
        const stopsText = flight.stops === 0 ? 'Nonstop' : flight.stops + ' stop' + (flight.stops > 1 ? 's' : '');
        const stopsBadgeClass = flight.stops === 0 ? 'stops-badge' : 'stops-badge has-stops';
        
        card.innerHTML = '<div class="flight-header"><div class="airline-info"><img src="' + flight.imageUrl + '" class="airline-logo" onerror="this.src=\'https://via.placeholder.com/50x50\'"><div><div class="airline-name">' + flight.airline + '</div><div class="flight-number">' + flight.flightNumber + '</div></div></div><div class="price">$' + flight.price + '</div></div><div class="flight-route"><div><div class="route-time">' + flight.departureTime + '</div><div class="route-code">' + flight.origin + '</div></div><div class="route-line"><span class="route-plane">✈️</span></div><div style="text-align: right;"><div class="route-time">' + flight.arrivalTime + '</div><div class="route-code">' + flight.destination + '</div></div></div><div class="flight-details"><div class="detail"><span>Duration:</span><span class="detail-value">' + flight.duration + '</span></div><div class="detail"><span class="' + stopsBadgeClass + '">' + stopsText + '</span></div><div class="detail"><span>Class:</span><span class="detail-value">' + flight.cabinClass + '</span></div></div>';
        
        container.appendChild(card);
      });
      
      root.appendChild(container);
    })();
  </script>
</body>
</html>`,
};

function widgetMeta(widget: typeof WIDGETS[keyof typeof WIDGETS]) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  };
}

// Zod parsers for input validation
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

// Define tools
const tools = [
  {
    name: WIDGETS.hotels.id,
    description: "Search for hotels worldwide with filters for dates, guests, amenities, and pricing. Returns detailed hotel information including availability, rates, and booking links.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Destination city or location" },
        checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
        checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
        guests: { type: "number", minimum: 1 },
        rooms: { type: "number", minimum: 1 },
        minPrice: { type: "number" },
        maxPrice: { type: "number" },
        starRating: { type: "number", minimum: 1, maximum: 5 },
        amenities: { type: "array", items: { type: "string" } },
      },
      required: ["destination", "checkIn", "checkOut"],
    },
    _meta: widgetMeta(WIDGETS.hotels),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: WIDGETS.flights.id,
    description: "Search for flights with comprehensive filters including airlines, stops, cabin class, and price range. Supports round-trip and one-way bookings.",
    inputSchema: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Origin airport code or city" },
        destination: { type: "string", description: "Destination airport code or city" },
        departureDate: { type: "string", description: "Departure date (YYYY-MM-DD)" },
        returnDate: { type: "string", description: "Return date (YYYY-MM-DD)" },
        passengers: { type: "number", minimum: 1 },
        cabinClass: { type: "string", enum: ["economy", "premium-economy", "business", "first"] },
        stops: { type: "string", enum: ["nonstop", "1-stop", "2+-stops", "any"] },
        airlines: { type: "array", items: { type: "string" } },
        maxPrice: { type: "number" },
      },
      required: ["origin", "destination", "departureDate"],
    },
    _meta: widgetMeta(WIDGETS.flights),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
];

// Create resources for widgets
const resources = Object.values(WIDGETS).map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates = Object.values(WIDGETS).map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

// Cloudflare Worker handler
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/mcp" && request.method === "GET") {
      return new Response("SSE not fully supported. Use POST /mcp/rpc", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (url.pathname === "/mcp/rpc" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const method = body.method;

        let response: any;

        switch (method) {
          case "tools/list":
            response = { tools };
            break;

          case "resources/list":
            response = { resources };
            break;

          case "resources/templates/list":
            response = { resourceTemplates };
            break;

          case "resources/read": {
            const uri = body.params?.uri;
            const templatePath = uri?.replace("ui://widgets/templates/", "");
            const html = UI_COMPONENTS[templatePath];

            if (!html) {
              return new Response(JSON.stringify({ error: "Resource not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            response = {
              contents: [{
                uri,
                mimeType: "text/html+skybridge",
                text: html,
              }],
            };
            break;
          }

          case "tools/call": {
            const toolName = body.params?.name;
            const args = body.params?.arguments || {};

            response = await handleToolCall(toolName, args);
            break;
          }

          default:
            return new Response(JSON.stringify({ error: "Unknown method" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};

async function handleToolCall(toolName: string, args: any) {
  switch (toolName) {
    case WIDGETS.hotels.id: {
      const parsed = hotelSearchInputParser.parse(args);
      const mockHotels = [
        {
          id: "h1",
          name: "Grand Plaza Hotel",
          location: parsed.destination,
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
          location: parsed.destination,
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
          location: parsed.destination,
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

      const filteredHotels = parsed.starRating 
        ? mockHotels.filter(h => h.starRating >= parsed.starRating!)
        : mockHotels;

      return {
        content: [{ type: "text", text: `Found ${filteredHotels.length} hotels in ${parsed.destination}` }],
        structuredContent: {
          destination: parsed.destination,
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
          guests: parsed.guests || 2,
          rooms: parsed.rooms || 1,
          hotels: filteredHotels,
          totalResults: filteredHotels.length,
        },
        _meta: widgetMeta(WIDGETS.hotels),
      };
    }

    case WIDGETS.flights.id: {
      const parsed = flightSearchInputParser.parse(args);
      const isRoundTrip = !!parsed.returnDate;
      const mockFlights = [
        {
          id: "f1",
          airline: "United Airlines",
          flightNumber: "UA 1234",
          origin: parsed.origin,
          destination: parsed.destination,
          departureTime: "08:30 AM",
          arrivalTime: "11:45 AM",
          duration: "3h 15m",
          stops: 0,
          cabinClass: parsed.cabinClass || "economy",
          price: 289,
          imageUrl: "https://via.placeholder.com/60x60",
        },
        {
          id: "f2",
          airline: "Delta Airlines",
          flightNumber: "DL 5678",
          origin: parsed.origin,
          destination: parsed.destination,
          departureTime: "12:15 PM",
          arrivalTime: "04:50 PM",
          duration: "4h 35m",
          stops: 1,
          cabinClass: parsed.cabinClass || "economy",
          price: 245,
          imageUrl: "https://via.placeholder.com/60x60",
        },
        {
          id: "f3",
          airline: "American Airlines",
          flightNumber: "AA 9012",
          origin: parsed.origin,
          destination: parsed.destination,
          departureTime: "06:00 PM",
          arrivalTime: "09:20 PM",
          duration: "3h 20m",
          stops: 0,
          cabinClass: parsed.cabinClass || "economy",
          price: 315,
          imageUrl: "https://via.placeholder.com/60x60",
        },
      ];

      return {
        content: [{ type: "text", text: `Found ${mockFlights.length} flights from ${parsed.origin} to ${parsed.destination}` }],
        structuredContent: {
          origin: parsed.origin,
          destination: parsed.destination,
          departureDate: parsed.departureDate,
          returnDate: parsed.returnDate,
          passengers: parsed.passengers || 1,
          cabinClass: parsed.cabinClass || "economy",
          flights: mockFlights,
          isRoundTrip: isRoundTrip,
          totalResults: mockFlights.length,
        },
        _meta: widgetMeta(WIDGETS.flights),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

