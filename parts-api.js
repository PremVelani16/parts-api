/**
 * Electronic Parts Manufacturer Search API
 * Zero dependencies — just Node.js built-ins
 * 
 * Run:  node parts-api.js
 * Port: 3000  (override with PORT env var)
 *
 * Endpoints:
 *   GET  /search?orderCode=STM32F103C8T6
 *   POST /search   { "orderCode": "STM32F103C8T6" }
 *   GET  /manufacturers
 *   GET  /openapi.json
 *   GET  /health
 */

const http = require("http");
const url  = require("url");

// ─────────────────────────────────────────────────────────────
// MANUFACTURER DATABASE
// Add entries here to extend coverage.
// Each entry needs:  name, shortCode, website, categories, prefixes[]
// ─────────────────────────────────────────────────────────────
const MANUFACTURERS = {
  TI: {
    name: "Texas Instruments",
    shortCode: "TI",
    website: "https://www.ti.com",
    categories: ["ICs", "Analog", "Microcontrollers", "Power Management"],
    prefixes: ["TMS", "LM", "TL", "SN", "CD", "AM", "TPS", "BQ", "OPA", "INA", "REF", "DAC", "ADC", "CC", "MSP"],
  },
  ST: {
    name: "STMicroelectronics",
    shortCode: "ST",
    website: "https://www.st.com",
    categories: ["MCUs", "Power", "MEMS", "Motor Control"],
    prefixes: ["STM", "STE", "STL", "L4", "L6", "VN", "TS", "M24", "M95"],
  },
  NXP: {
    name: "NXP Semiconductors",
    shortCode: "NXP",
    website: "https://www.nxp.com",
    categories: ["MCUs", "RF", "Security", "Automotive"],
    prefixes: ["MK", "MPC", "LPC", "PCA", "PCF", "TJA", "S32"],
  },
  MICROCHIP: {
    name: "Microchip Technology",
    shortCode: "MCHP",
    website: "https://www.microchip.com",
    categories: ["MCUs", "Memory", "Analog", "Networking"],
    prefixes: ["PIC", "AVR", "SAM", "ATMEGA", "ATTINY", "MCP", "SST", "KSZ", "LAN", "ENC"],
  },
  INFINEON: {
    name: "Infineon Technologies",
    shortCode: "IFX",
    website: "https://www.infineon.com",
    categories: ["Power", "Automotive", "Security", "RF"],
    prefixes: ["IRF", "IRL", "IPB", "BSC", "BTN", "TLE", "SLB", "XMC", "CY"],
  },
  RENESAS: {
    name: "Renesas Electronics",
    shortCode: "REN",
    website: "https://www.renesas.com",
    categories: ["MCUs", "MPUs", "Automotive", "Industrial"],
    prefixes: ["RX", "RA", "RE", "RL", "R5F", "R7FA", "ISL", "IDT"],
  },
  ADI: {
    name: "Analog Devices",
    shortCode: "ADI",
    website: "https://www.analog.com",
    categories: ["Data Converters", "Amplifiers", "RF", "Power"],
    prefixes: ["ADSP", "ADP", "ADM", "ADG", "ADA", "ADXL", "LTC"],
  },
  MAXIM: {
    name: "Maxim Integrated (ADI)",
    shortCode: "MAXIM",
    website: "https://www.maximintegrated.com",
    categories: ["Analog", "Power", "Interface", "Sensors"],
    prefixes: ["MAX", "DS"],
    note: "Acquired by Analog Devices",
  },
  ON: {
    name: "onsemi",
    shortCode: "ON",
    website: "https://www.onsemi.com",
    categories: ["Power", "Automotive", "Image Sensors"],
    prefixes: ["NCP", "NCV", "NCS", "FAN", "FDS", "MBR", "BCX", "MMBT"],
  },
  VISHAY: {
    name: "Vishay Intertechnology",
    shortCode: "VSH",
    website: "https://www.vishay.com",
    categories: ["Resistors", "Capacitors", "Diodes", "Optocouplers"],
    prefixes: ["CRCW", "WSL", "VS", "VO", "IL", "SFH", "BYV"],
  },
  MURATA: {
    name: "Murata Manufacturing",
    shortCode: "MUR",
    website: "https://www.murata.com",
    categories: ["Capacitors", "Inductors", "Filters", "Sensors"],
    prefixes: ["GRM", "LQM", "BLM", "NFM", "CSTCE", "LQH"],
  },
  TDK: {
    name: "TDK Corporation",
    shortCode: "TDK",
    website: "https://www.tdk.com",
    categories: ["Inductors", "Capacitors", "Sensors", "Magnetics"],
    prefixes: ["C3225", "C2012", "MLZ", "SLF", "B3274", "HAL"],
  },
  YAGEO: {
    name: "Yageo Corporation",
    shortCode: "YAG",
    website: "https://www.yageo.com",
    categories: ["Resistors", "Capacitors", "Inductors"],
    prefixes: ["RC", "AC", "TC", "PE"],
  },
  SAMSUNG: {
    name: "Samsung Electro-Mechanics",
    shortCode: "SEMCO",
    website: "https://www.samsungsem.com",
    categories: ["MLCCs", "Inductors", "PCBs"],
    prefixes: ["CL", "CI", "CM", "KLMBG"],
  },
  MOLEX: {
    name: "Molex",
    shortCode: "MOL",
    website: "https://www.molex.com",
    categories: ["Connectors", "Cables", "Antennas"],
    prefixes: ["0022", "0039", "0430", "0701", "1053", "2004", "5055"],
  },
  TE: {
    name: "TE Connectivity",
    shortCode: "TE",
    website: "https://www.te.com",
    categories: ["Connectors", "Sensors", "Relays"],
    prefixes: ["MSTB", "1734"],
  },
  BROADCOM: {
    name: "Broadcom Inc.",
    shortCode: "AVGO",
    website: "https://www.broadcom.com",
    categories: ["Networking", "Storage", "Wireless", "Optocouplers"],
    prefixes: ["BCM", "ACPL", "HCPL", "AFBR", "MGA"],
  },
  ESPRESSIF: {
    name: "Espressif Systems",
    shortCode: "ESP",
    website: "https://www.espressif.com",
    categories: ["WiFi", "Bluetooth", "IoT MCUs"],
    prefixes: ["ESP32", "ESP8266", "ESP-", "ESP"],
  },
  NORDIC: {
    name: "Nordic Semiconductor",
    shortCode: "NORDIC",
    website: "https://www.nordicsemi.com",
    categories: ["BLE", "Zigbee", "UWB", "WiFi"],
    prefixes: ["NRF52", "NRF53", "NRF91", "NRF"],
  },
  AD: {
    name: "Analog Devices (legacy AD-prefix)",
    shortCode: "ADI",
    website: "https://www.analog.com",
    categories: ["Data Converters", "Amplifiers", "RF"],
    prefixes: ["AD"],
    note: "AD-prefix parts belong to Analog Devices",
  },
};

// ─────────────────────────────────────────────────────────────
// DETECTION LOGIC
// ─────────────────────────────────────────────────────────────
function detectManufacturers(orderCode) {
  const code = orderCode.trim().toUpperCase();
  const matches = [];

  for (const mfr of Object.values(MANUFACTURERS)) {
    let score = 0;
    let reason = "";
    for (const prefix of mfr.prefixes) {
      if (code.startsWith(prefix.toUpperCase())) {
        score = prefix.length;
        reason = `Starts with "${prefix}"`;
        break;
      }
    }
    if (score > 0) matches.push({ ...mfr, score, reason });
  }

  // Higher score = longer prefix match = more specific
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

function formatResult(orderCode, matches) {
  if (!matches.length) {
    return {
      success: false,
      orderCode,
      message: `No manufacturer found for "${orderCode}".`,
      hint: "Check Mouser / DigiKey / Farnell for this part number.",
      primaryManufacturer: null,
      alternateManufacturers: [],
      totalMatches: 0,
    };
  }

  const fmt = ({ name, shortCode, website, categories, reason, note }) =>
    ({ name, shortCode, website, categories, matchReason: reason, ...(note ? { note } : {}) });

  const [primary, ...alts] = matches;
  return {
    success: true,
    orderCode,
    message: `Found ${matches.length} manufacturer(s) for "${orderCode}".`,
    primaryManufacturer: fmt(primary),
    alternateManufacturers: alts.map(fmt),
    totalMatches: matches.length,
    distributorLinks: {
      mouser:       `https://www.mouser.com/Search/Refine?Keyword=${encodeURIComponent(orderCode)}`,
      digikey:      `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(orderCode)}`,
      farnell:      `https://www.farnell.com/search?st=${encodeURIComponent(orderCode)}`,
      rs_components:`https://uk.rs-online.com/web/c/?searchTerm=${encodeURIComponent(orderCode)}`,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// OPENAPI SPEC (served at /openapi.json)
// ─────────────────────────────────────────────────────────────
const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: {
    title: "Electronic Parts Manufacturer API",
    description: "Identifies the manufacturer (and alternate manufacturers) from an electronic component order code / part number.",
    version: "1.0.0",
  },
  servers: [{ url: "http://localhost:3000", description: "Local" }],
  paths: {
    "/search": {
      get: {
        operationId: "identifyManufacturer",
        summary: "Identify manufacturer(s) from an order code",
        parameters: [{
          name: "orderCode",
          in: "query",
          required: true,
          description: "Electronic component order code or part number (e.g. STM32F103C8T6, LM358N, NRF52840)",
          schema: { type: "string", example: "STM32F103C8T6" },
        }],
        responses: {
          200: {
            description: "Manufacturer identification result",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SearchResult" } } },
          },
        },
      },
      post: {
        operationId: "identifyManufacturerPost",
        summary: "Identify manufacturer(s) — POST variant",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orderCode"],
                properties: { orderCode: { type: "string", example: "LM358N" } },
              },
            },
          },
        },
        responses: { 200: { description: "OK" } },
      },
    },
    "/manufacturers": {
      get: {
        operationId: "listManufacturers",
        summary: "List all supported manufacturers",
        responses: { 200: { description: "Full manufacturer list" } },
      },
    },
    "/health": {
      get: {
        operationId: "healthCheck",
        summary: "Health check",
        responses: { 200: { description: "ok" } },
      },
    },
  },
  components: {
    schemas: {
      Manufacturer: {
        type: "object",
        properties: {
          name:        { type: "string" },
          shortCode:   { type: "string" },
          website:     { type: "string" },
          categories:  { type: "array", items: { type: "string" } },
          matchReason: { type: "string" },
          note:        { type: "string" },
        },
      },
      SearchResult: {
        type: "object",
        properties: {
          success:                { type: "boolean" },
          orderCode:              { type: "string" },
          message:                { type: "string" },
          primaryManufacturer:    { $ref: "#/components/schemas/Manufacturer" },
          alternateManufacturers: { type: "array", items: { $ref: "#/components/schemas/Manufacturer" } },
          totalMatches:           { type: "integer" },
          distributorLinks:       { type: "object" },
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────
// HTTP SERVER
// ─────────────────────────────────────────────────────────────
function json(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", c => buf += c);
    req.on("end", () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch { reject(); } });
    req.on("error", reject);
  });
}

http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  const method = req.method;

  if (method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  // Health
  if (pathname === "/health")
    return json(res, 200, { status: "ok", timestamp: new Date().toISOString() });

  // OpenAPI spec
  if (pathname === "/openapi.json")
    return json(res, 200, OPENAPI_SPEC);

  // Manufacturers list
  if (pathname === "/manufacturers") {
    const list = Object.values(MANUFACTURERS).map(
      ({ name, shortCode, website, categories, prefixes }) =>
        ({ name, shortCode, website, categories, prefixes })
    );
    return json(res, 200, { success: true, count: list.length, manufacturers: list });
  }

  // Search
  if (pathname === "/search") {
    let orderCode = "";

    if (method === "GET") {
      orderCode = (query.orderCode || query.order_code || "").trim();
    } else if (method === "POST") {
      try {
        const body = await readBody(req);
        orderCode = (body.orderCode || body.order_code || "").trim();
      } catch {
        return json(res, 400, { success: false, message: "Invalid JSON body." });
      }
    } else {
      return json(res, 405, { success: false, message: "Method not allowed." });
    }

    if (!orderCode)
      return json(res, 400, { success: false, message: "Missing orderCode.", example: "GET /search?orderCode=STM32F103C8T6" });

    if (orderCode.length > 100)
      return json(res, 400, { success: false, message: "orderCode too long (max 100 chars)." });

    const matches = detectManufacturers(orderCode);
    return json(res, 200, formatResult(orderCode, matches));
  }

  json(res, 404, {
    success: false,
    message: "Not found.",
    endpoints: [
      "GET  /search?orderCode=XXXX",
      "POST /search  { orderCode: 'XXXX' }",
      "GET  /manufacturers",
      "GET  /openapi.json",
      "GET  /health",
    ],
  });

}).listen(process.env.PORT || 3000, () => {
  const port = process.env.PORT || 3000;
  console.log(`Parts API → http://localhost:${port}`);
  console.log(`OpenAPI  → http://localhost:${port}/openapi.json`);
  console.log(`Test     → http://localhost:${port}/search?orderCode=STM32F103C8T6`);
});
