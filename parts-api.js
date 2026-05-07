/**
 * Electronic Parts Search API
 * Identifies manufacturers by scraping DigiKey & Mouser first,
 * then falls back to a local prefix database.
 *
 * Run: node parts-api.js
 * No npm installs required — uses only Node.js built-ins + one optional dep for HTML parsing.
 */

const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// CORS helper
// ─────────────────────────────────────────────
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ─────────────────────────────────────────────
// Generic HTTPS fetch (returns body string)
// ─────────────────────────────────────────────
function fetchUrl(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
        ...(options.headers || {}),
      },
      timeout: 12000,
    };

    const req = https.request(reqOptions, (res) => {
      // Follow redirects (up to 5)
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const redirectUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : `https://${parsedUrl.hostname}${res.headers.location}`;
        return fetchUrl(redirectUrl, options)
          .then(resolve)
          .catch(reject);
      }

      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ body: data, status: res.statusCode }));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─────────────────────────────────────────────
// Minimal HTML text extractor (no dependencies)
// ─────────────────────────────────────────────
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractBetween(html, startStr, endStr) {
  const start = html.indexOf(startStr);
  if (start === -1) return null;
  const end = html.indexOf(endStr, start + startStr.length);
  if (end === -1) return null;
  return html.substring(start + startStr.length, end).trim();
}

// ─────────────────────────────────────────────
// DigiKey scraper
// Returns: { manufacturer, mpn, description } or null
// ─────────────────────────────────────────────
async function searchDigiKey(partNumber) {
  try {
    const searchUrl = `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(
      partNumber
    )}&pageSize=5`;

    const { body, status } = await fetchUrl(searchUrl);
    if (status !== 200 || !body) return null;

    const results = [];

    // Strategy 1: JSON-LD structured data
    const jsonLdMatches = body.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        try {
          const json = JSON.parse(
            block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
          );
          const items = Array.isArray(json) ? json : [json];
          for (const item of items) {
            if (item.brand && item.brand.name) {
              results.push({
                manufacturer: item.brand.name.trim(),
                mpn: (item.mpn || item.sku || partNumber).trim(),
                description: (item.description || item.name || "").trim(),
                source: "digikey",
              });
            }
          }
        } catch (_) {}
      }
    }

    if (results.length > 0) return results;

    // Strategy 2: Look for manufacturer name in HTML patterns
    // DigiKey typically has: "Manufacturer" label followed by manufacturer name
    const mfrPatterns = [
      /data-testid="manufacturer-value"[^>]*>([^<]+)</i,
      /"manufacturer"\s*:\s*"([^"]+)"/i,
      /class="[^"]*manufacturer[^"]*"[^>]*>([^<]{3,60})</i,
      /Manufacturer<\/[^>]+>[^<]*<[^>]+>([^<]{3,60})</i,
    ];

    for (const pattern of mfrPatterns) {
      const match = body.match(pattern);
      if (match && match[1] && match[1].trim().length > 1) {
        results.push({
          manufacturer: match[1].trim(),
          mpn: partNumber,
          description: "",
          source: "digikey",
        });
      }
    }

    // Strategy 3: Search for part number page directly
    if (results.length === 0) {
      const directUrl = `https://www.digikey.com/en/products/search#?keywords=${encodeURIComponent(
        partNumber
      )}`;
      // Try extracting from meta tags
      const metaMfr = body.match(
        /<meta[^>]*property="product:brand"[^>]*content="([^"]+)"/i
      );
      if (metaMfr) {
        results.push({
          manufacturer: metaMfr[1].trim(),
          mpn: partNumber,
          description: "",
          source: "digikey",
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (err) {
    console.error("DigiKey error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// DigiKey API v4 (public search endpoint, no key needed for basic search)
// ─────────────────────────────────────────────
async function searchDigiKeyAPI(partNumber) {
  try {
    // DigiKey has a public autocomplete / keyword search that returns JSON
    const apiUrl = `https://www.digikey.com/api/recommendations/v1/search?searchTerm=${encodeURIComponent(
      partNumber
    )}&limit=5&locale=en-US`;

    const { body, status } = await fetchUrl(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (status !== 200) return null;
    const data = JSON.parse(body);

    const results = [];
    const items = data.products || data.results || data.items || [];
    for (const item of items) {
      const mfr =
        item.manufacturer?.name ||
        item.manufacturerName ||
        item.brand?.name ||
        null;
      if (mfr) {
        results.push({
          manufacturer: mfr.trim(),
          mpn: (item.manufacturerPartNumber || item.mpn || partNumber).trim(),
          description: (item.description || item.productDescription || "").trim(),
          source: "digikey-api",
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────
// Mouser scraper
// ─────────────────────────────────────────────
async function searchMouser(partNumber) {
  try {
    const searchUrl = `https://www.mouser.com/c/?q=${encodeURIComponent(
      partNumber
    )}`;

    const { body, status } = await fetchUrl(searchUrl);
    if (status !== 200 || !body) return null;

    const results = [];

    // Strategy 1: JSON-LD
    const jsonLdMatches = body.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        try {
          const json = JSON.parse(
            block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
          );
          const items = Array.isArray(json) ? json : [json];
          for (const item of items) {
            const mfr =
              item.brand?.name ||
              item.manufacturer?.name ||
              item.manufacturer ||
              null;
            if (mfr && typeof mfr === "string") {
              results.push({
                manufacturer: mfr.trim(),
                mpn: (item.mpn || item.sku || partNumber).trim(),
                description: (item.description || item.name || "").trim(),
                source: "mouser",
              });
            }
          }
        } catch (_) {}
      }
    }

    if (results.length > 0) return results;

    // Strategy 2: HTML patterns
    const mfrPatterns = [
      /class="[^"]*mfr-name[^"]*"[^>]*>([^<]{3,80})</i,
      /data-manufacturer="([^"]{3,80})"/i,
      /"manufacturer"\s*:\s*"([^"]{3,80})"/i,
      /Manufacturer[^:]*:\s*<[^>]*>\s*([^<]{3,80})/i,
    ];

    for (const pattern of mfrPatterns) {
      const match = body.match(pattern);
      if (match && match[1].trim().length > 1) {
        results.push({
          manufacturer: match[1].trim(),
          mpn: partNumber,
          description: "",
          source: "mouser",
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (err) {
    console.error("Mouser error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Mouser API (free, no key for basic)
// ─────────────────────────────────────────────
async function searchMouserAPI(partNumber) {
  try {
    // Mouser public search suggestion endpoint
    const apiUrl = `https://www.mouser.com/api/Search/Find?SearchTerm=${encodeURIComponent(
      partNumber
    )}&country=US&language=en&currency=USD&partSearchOptions=BeginsWith`;

    const { body, status } = await fetchUrl(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (status !== 200) return null;
    const data = JSON.parse(body);

    const results = [];
    const parts =
      data.SearchResults?.Parts ||
      data.Parts ||
      data.parts ||
      [];

    for (const part of parts) {
      const mfr =
        part.Manufacturer ||
        part.manufacturer ||
        part.ManufacturerName ||
        null;
      if (mfr) {
        results.push({
          manufacturer: mfr.trim(),
          mpn: (
            part.ManufacturerPartNumber ||
            part.manufacturerPartNumber ||
            part.MPN ||
            partNumber
          ).trim(),
          description: (
            part.Description ||
            part.description ||
            part.ProductDescription ||
            ""
          ).trim(),
          source: "mouser-api",
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────
// OCTOPART / Nexar public search (no key for basic)
// ─────────────────────────────────────────────
async function searchOctopart(partNumber) {
  try {
    const apiUrl = `https://octopart.com/api/v4/rest/parts/search?q=${encodeURIComponent(
      partNumber
    )}&limit=5&apikey=&include[]=short_description`;

    const { body, status } = await fetchUrl(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (status !== 200) return null;
    const data = JSON.parse(body);
    const results = [];

    const hits = data.results || data.hits || data.data?.search?.results || [];
    for (const hit of hits) {
      const part = hit.part || hit;
      const mfr =
        part.manufacturer?.name ||
        part.brand?.name ||
        null;
      if (mfr) {
        results.push({
          manufacturer: mfr.trim(),
          mpn: (part.mpn || part.name || partNumber).trim(),
          description: (
            part.short_description ||
            part.description ||
            ""
          ).trim(),
          source: "octopart",
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────
// Consolidate results from multiple sources
// Deduplicates manufacturers, picks most frequent as primary
// ─────────────────────────────────────────────
function consolidateResults(allResults) {
  if (!allResults || allResults.length === 0) return null;

  // Count manufacturer mentions
  const mfrCount = {};
  const mfrDetails = {};

  for (const r of allResults) {
    const key = r.manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "");
    mfrCount[key] = (mfrCount[key] || 0) + 1;
    if (!mfrDetails[key]) {
      mfrDetails[key] = {
        name: r.manufacturer,
        mpn: r.mpn,
        description: r.description,
        sources: [],
      };
    }
    mfrDetails[key].sources.push(r.source);
    if (r.description && !mfrDetails[key].description)
      mfrDetails[key].description = r.description;
  }

  // Sort by count (most mentioned = primary)
  const sorted = Object.keys(mfrCount).sort(
    (a, b) => mfrCount[b] - mfrCount[a]
  );

  const primary = mfrDetails[sorted[0]];
  const alternates = sorted.slice(1).map((k) => mfrDetails[k]);

  return { primary, alternates };
}

// ─────────────────────────────────────────────
// LOCAL FALLBACK DATABASE (prefix-based)
// 600+ manufacturers
// ─────────────────────────────────────────────
const LOCAL_DB = [
  // ── Semiconductors & ICs ─────────────────────────────────────────
  { name: "Texas Instruments", shortCode: "TI", website: "https://www.ti.com", categories: ["ICs", "Analog", "Embedded", "Power"], prefixes: ["LM", "TL", "TMS", "MSP", "CC", "AM", "OPA", "INA", "UCC", "REG", "CSD", "SN", "CD", "UC", "TPA", "TCA", "TPD", "TUSB", "DS", "DP"] },
  { name: "STMicroelectronics", shortCode: "ST", website: "https://www.st.com", categories: ["Microcontrollers", "Power", "Analog"], prefixes: ["STM", "STM32", "STM8", "L6", "L7", "LD", "VL", "SPC", "STEVAL", "M24", "M95", "HTS", "LIS", "LSM", "VNH", "STSPIN"] },
  { name: "NXP Semiconductors", shortCode: "NXP", website: "https://www.nxp.com", categories: ["Microcontrollers", "RF", "Automotive"], prefixes: ["MK", "MKL", "MKV", "LPC", "K2", "K6", "K8", "PN", "MPC", "S32", "IMX", "MIMX", "MC", "FXOS", "FXAS", "PCF", "PCA"] },
  { name: "Microchip Technology", shortCode: "MCHP", website: "https://www.microchip.com", categories: ["Microcontrollers", "Memory", "Analog"], prefixes: ["PIC", "AT", "ATMEL", "ATmega", "ATtiny", "ATxmega", "ATA", "SAM", "SAME", "SAMD", "SAML", "PIC32", "PIC24", "PIC18", "dsPIC", "MCP", "SST", "DSPIC", "TC"] },
  { name: "Infineon Technologies", shortCode: "IFX", website: "https://www.infineon.com", categories: ["Power", "Automotive", "Security"], prefixes: ["IRF", "IRFZ", "IRFL", "IR2", "IRS", "IPP", "IPB", "IPA", "IPD", "IPI", "BSZ", "BSP", "BTS", "TLE", "SAK", "XMC", "CY", "PSoC", "AURIX", "TC2", "TC3", "SLB", "SLE"] },
  { name: "Renesas Electronics", shortCode: "REN", website: "https://www.renesas.com", categories: ["Microcontrollers", "Analog", "Automotive"], prefixes: ["R5F", "RL78", "RX", "RZ", "RA", "RE", "RH850", "V850", "M16C", "H8", "ISL", "ICL", "X9", "EL", "CA3", "HA", "HIP", "HSP"] },
  { name: "Analog Devices", shortCode: "ADI", website: "https://www.analog.com", categories: ["Analog", "Signal Processing", "Power"], prefixes: ["AD", "ADA", "ADAR", "ADATE", "ADAU", "ADAV", "ADCM", "ADDI", "ADGM", "ADL", "ADM", "ADMP", "ADN", "ADP", "ADR", "ADS", "ADT", "ADV", "ADW", "ADUM", "ADXL", "ADXRS"] },
  { name: "Maxim Integrated", shortCode: "MAX", website: "https://www.maximintegrated.com", categories: ["Analog", "Interface", "Power"], prefixes: ["MAX", "MAX1", "MAX2", "MAX3", "MAX4", "MAX5", "MAX6", "MAX7", "MAX8", "MAX9", "DS1", "DS2", "DS3", "DS4"] },
  { name: "onsemi", shortCode: "ON", website: "https://www.onsemi.com", categories: ["Power", "Analog", "Logic"], prefixes: ["MC", "MBR", "MBRA", "MBRB", "MBRF", "NCP", "NCE", "NCS", "NDS", "NIS", "NL", "NTD", "NTP", "NTS", "NVMFS", "NVS", "NX", "CAT", "ESD", "FAN", "LC", "LV", "2N", "BC", "BAS", "BAV"] },
  { name: "Vishay", shortCode: "VSH", website: "https://www.vishay.com", categories: ["Passives", "Semiconductors", "Sensors"], prefixes: ["VS", "VF", "VI", "VB", "VDRM", "RCA", "CRCW", "CRCW0", "CRCW1", "WSL", "Dale", "SI", "SSA", "SSB", "SiA", "SiZ", "VLMU", "VLMS", "VLED"] },
  { name: "Broadcom", shortCode: "BRCM", website: "https://www.broadcom.com", categories: ["Networking", "RF", "Optical"], prefixes: ["BCM", "AFBR", "ACMD", "ACPL", "HCNR", "HCPL", "MGA", "MSA", "VMMK"] },
  { name: "Espressif Systems", shortCode: "ESP", website: "https://www.espressif.com", categories: ["WiFi", "Bluetooth", "IoT"], prefixes: ["ESP", "ESP8", "ESP32", "ESP32-S", "ESP32-C", "ESP32-H", "ESP-WROOM", "ESP-WROVER"] },
  { name: "Nordic Semiconductor", shortCode: "NRF", website: "https://www.nordicsemi.com", categories: ["Bluetooth", "Ultra-Low Power", "IoT"], prefixes: ["NRF", "NRF5", "NRF52", "NRF53", "NRF91", "NRF21", "NRF7"] },
  { name: "Silicon Labs", shortCode: "SLAB", website: "https://www.silabs.com", categories: ["IoT", "Wireless", "MCU"], prefixes: ["EFM", "EFR", "EZR", "BGM", "MGM", "WGM", "SI", "CP2", "TS"] },
  { name: "Diodes Incorporated", shortCode: "DI", website: "https://www.diodes.com", categories: ["Diodes", "MOSFETs", "Logic"], prefixes: ["DMP", "DMPH", "DMN", "AP", "APC", "APX", "AS", "AZ", "ZXMS", "ZXMN", "ZXMP", "BAT", "BAV", "BAS"] },
  { name: "ROHM Semiconductor", shortCode: "ROHM", website: "https://www.rohm.com", categories: ["Power", "Analog", "Optoelectronics"], prefixes: ["BD", "BR", "BU", "BA", "BCR", "BM", "BP", "ML", "ML51", "SML", "ROHM"] },
  { name: "Nexperia", shortCode: "NEX", website: "https://www.nexperia.com", categories: ["Discretes", "Logic", "MOSFETs"], prefixes: ["PMBT", "PBSS", "PSMN", "PSMP", "BUK", "PHD", "PHP", "PH", "PMV", "PMZ"] },
  { name: "Littelfuse", shortCode: "LFUSE", website: "https://www.littelfuse.com", categories: ["Protection", "Fuses", "Sensors"], prefixes: ["LF", "0251", "0452", "0453", "KLK", "SL", "MF-S", "NANO2", "NANO3", "SRP"] },
  { name: "MCC (Micro Commercial Components)", shortCode: "MCC", website: "https://www.mccsemi.com", categories: ["Discretes", "Diodes", "Transistors"], prefixes: ["SS", "SK", "SF", "SR", "SD", "ES", "RB"] },
  { name: "Taiwan Semiconductor", shortCode: "TSC", website: "https://www.taiwansemi.com", categories: ["Discretes", "Rectifiers"], prefixes: ["TS", "1N", "FR"] },
  { name: "Panasonic", shortCode: "PAN", website: "https://www.panasonic.com", categories: ["Capacitors", "Resistors", "Sensors"], prefixes: ["ERA", "ERJ", "EEE", "EEH", "ECQ", "ECQE", "FK", "FC", "ELJ", "EVQP", "AQY", "PAN"] },
  { name: "Toshiba", shortCode: "TOSH", website: "https://toshiba.semicon-storage.com", categories: ["MOSFETs", "Logic", "Storage"], prefixes: ["TMP", "TC", "TC74", "TLP", "TPC", "TPH", "TPW", "TK", "SSM"] },
  { name: "Mitsubishi Electric", shortCode: "MITS", website: "https://www.mitsubishielectric.com", categories: ["Power Modules", "IGBTs"], prefixes: ["CM", "PM", "QM", "RM", "FM", "PSS", "MLX"] },
  { name: "Fuji Electric", shortCode: "FUJI", website: "https://www.fujielectric.com", categories: ["Power Modules", "IGBTs"], prefixes: ["2MBI", "6MBI", "7MBR", "2MBR", "3MBR"] },
  { name: "IXYS", shortCode: "IXYS", website: "https://www.ixys.com", categories: ["Power", "MOSFETs", "IGBTs"], prefixes: ["IXFN", "IXFP", "IXFT", "IXFV", "IXTH", "IXTP", "IXYS"] },
  { name: "Semikron", shortCode: "SEMIKRON", website: "https://www.semikron.com", categories: ["Power Modules"], prefixes: ["SKM", "SKB", "SKET", "SKT", "SKD", "SKIIP"] },
  { name: "Microsemi", shortCode: "MSCC", website: "https://www.microsemi.com", categories: ["FPGAs", "Space-Grade ICs"], prefixes: ["RTAX", "RTSX", "RTSXSU", "M55"] },
  { name: "Lattice Semiconductor", shortCode: "LSCC", website: "https://www.latticesemi.com", categories: ["FPGAs", "PLDs"], prefixes: ["LCMX", "LFE", "LFEX", "LC4", "M4A", "iCE", "iCE40"] },
  { name: "Xilinx (AMD)", shortCode: "XLX", website: "https://www.xilinx.com", categories: ["FPGAs", "SoCs"], prefixes: ["XC", "XA", "XCKU", "XCVU", "XCZU"] },
  { name: "Altera (Intel)", shortCode: "ALT", website: "https://www.intel.com/fpga", categories: ["FPGAs", "CPLDs"], prefixes: ["EP", "EPM", "10M", "5M", "1SG"] },
  { name: "Marvell Technology", shortCode: "MRVL", website: "https://www.marvell.com", categories: ["Networking", "Storage"], prefixes: ["MV", "88E", "88F", "88Q"] },
  { name: "MediaTek", shortCode: "MTK", website: "https://www.mediatek.com", categories: ["SoC", "Wireless"], prefixes: ["MT", "MT6", "MT7", "MT8", "MT9"] },
  { name: "Qualcomm", shortCode: "QCOM", website: "https://www.qualcomm.com", categories: ["RF", "SoC", "Wireless"], prefixes: ["QCA", "QCX", "SDM", "SM8", "IPQ"] },
  { name: "Samsung Semiconductor", shortCode: "SEC", website: "https://semiconductor.samsung.com", categories: ["Memory", "SoC"], prefixes: ["K4", "K9", "SEC", "S3C", "S5P", "S5E"] },
  { name: "SK Hynix", shortCode: "SKH", website: "https://www.skhynix.com", categories: ["Memory", "DRAM", "NAND"], prefixes: ["HMT", "H5T", "H27", "H9H", "HMA"] },
  { name: "Micron Technology", shortCode: "MU", website: "https://www.micron.com", categories: ["Memory", "Storage"], prefixes: ["MT", "MT4", "MT8", "MT16", "MT25", "MT29", "MT41"] },
  { name: "Western Digital", shortCode: "WDC", website: "https://www.westerndigital.com", categories: ["Storage", "NAND"], prefixes: ["WDC", "SDINBDG", "SDINBBG"] },
  { name: "Winbond", shortCode: "WB", website: "https://www.winbond.com", categories: ["Memory", "Flash"], prefixes: ["W25", "W29", "W27", "W24", "W74"] },
  { name: "Macronix", shortCode: "MX", website: "https://www.macronix.com", categories: ["Flash Memory"], prefixes: ["MX25", "MX29", "MX66", "MX79"] },
  { name: "ISSI (Integrated Silicon Solution)", shortCode: "ISSI", website: "https://www.issi.com", categories: ["Memory", "LED Drivers"], prefixes: ["IS6", "IS23", "IS25", "IS42", "IS43", "IS61", "IS62", "IS64", "IS66"] },
  { name: "GigaDevice", shortCode: "GD", website: "https://www.gigadevice.com", categories: ["Flash", "MCU"], prefixes: ["GD25", "GD32", "GD77"] },
  { name: "Realtek", shortCode: "RTK", website: "https://www.realtek.com", categories: ["Networking", "Audio"], prefixes: ["RTL", "ALC", "RTL8"] },
  { name: "Cypress Semiconductor (Infineon)", shortCode: "CY", website: "https://www.infineon.com", categories: ["MCU", "Memory", "USB"], prefixes: ["CY7", "CY8", "CY14", "CY15", "CY22", "CY62", "CYS"] },
  { name: "Allegro MicroSystems", shortCode: "ALG", website: "https://www.allegromicro.com", categories: ["Sensors", "Motor Drivers"], prefixes: ["A13", "A14", "A29", "A39", "A49", "A59", "ACS", "ATS", "AMT"] },
  { name: "Melexis", shortCode: "MLX", website: "https://www.melexis.com", categories: ["Sensors", "Automotive"], prefixes: ["MLX90", "MLX91", "AH", "TH"] },
  { name: "Sensirion", shortCode: "SENS", website: "https://www.sensirion.com", categories: ["Sensors", "Environmental"], prefixes: ["STS", "SHT", "SCD", "SGP", "SPS", "SFM"] },
  { name: "ams OSRAM", shortCode: "AMS", website: "https://ams-osram.com", categories: ["Sensors", "Lighting", "Optical"], prefixes: ["AS", "TSL", "TMD", "TMF", "TCS", "GU", "SFH"] },
  { name: "Bosch Sensortec", shortCode: "BOSCH", website: "https://www.bosch-sensortec.com", categories: ["MEMS Sensors"], prefixes: ["BMI", "BMG", "BMA", "BME", "BMP", "BHI", "BSX", "BMF"] },
  { name: "Honeywell", shortCode: "HON", website: "https://sensing.honeywell.com", categories: ["Sensors", "Switches"], prefixes: ["SS", "SDE", "SDG", "HIH", "HMC", "RTY", "PX2"] },
  { name: "TE Connectivity", shortCode: "TE", website: "https://www.te.com", categories: ["Connectors", "Sensors", "Relays"], prefixes: ["2-", "1-", "5-", "6-", "282", "640", "1825", "TE"] },
  { name: "Molex", shortCode: "MOL", website: "https://www.molex.com", categories: ["Connectors", "Cables"], prefixes: ["0", "15", "22", "43", "50", "51", "53", "87", "90", "MOL"] },
  { name: "Amphenol", shortCode: "APH", website: "https://www.amphenol.com", categories: ["Connectors", "RF", "Fiber"], prefixes: ["FCI", "APH", "10", "17", "31", "MUSB", "MAMF", "SV"] },
  { name: "Hirose Electric", shortCode: "HRS", website: "https://www.hirose.com", categories: ["Connectors"], prefixes: ["DF", "FH", "FX", "GT", "DF12", "DF13", "UX"] },
  { name: "JST", shortCode: "JST", website: "https://www.jst.com", categories: ["Connectors"], prefixes: ["PHR", "XAP", "ZHR", "BM", "ELP", "JST"] },
  { name: "Samtec", shortCode: "SAM", website: "https://www.samtec.com", categories: ["Connectors", "RF"], prefixes: ["TSM", "TMM", "TFC", "HLQ", "HSEC", "FTSH", "QSH"] },
  { name: "Phoenix Contact", shortCode: "PHX", website: "https://www.phoenixcontact.com", categories: ["Terminal Blocks", "Connectors"], prefixes: ["MSTB", "MC", "FK", "PCB", "PTFIX"] },
  { name: "Weidmuller", shortCode: "WDM", website: "https://www.weidmuller.com", categories: ["Terminal Blocks"], prefixes: ["WDU", "WQV", "AKF"] },
  { name: "Keystone Electronics", shortCode: "KEY", website: "https://www.keystoneelectronics.com", categories: ["Hardware", "Connectors"], prefixes: ["1040", "1053", "5020", "8604"] },
  // ── Passives ─────────────────────────────────────────────────────
  { name: "Murata Manufacturing", shortCode: "MUR", website: "https://www.murata.com", categories: ["Capacitors", "Inductors", "Filters"], prefixes: ["GRM", "GCM", "GCD", "LQH", "LQM", "LQW", "BLM", "NFM", "SFW", "DE5", "DLP"] },
  { name: "TDK Corporation", shortCode: "TDK", website: "https://www.tdk.com", categories: ["Capacitors", "Inductors", "Ferrites"], prefixes: ["CGA", "C2012", "C3216", "CLQ", "MLK", "MPZ", "NLV", "SLF", "HHV", "B4", "MKS"] },
  { name: "Yageo", shortCode: "YAG", website: "https://www.yageo.com", categories: ["Resistors", "Capacitors", "Inductors"], prefixes: ["RC", "RT", "RL", "AC", "CC", "SC", "PE", "YAG"] },
  { name: "Samsung Electro-Mechanics", shortCode: "SEMCO", website: "https://www.samsungsem.com", categories: ["MLCCs", "Inductors"], prefixes: ["CL", "CI"] },
  { name: "Kemet", shortCode: "KEM", website: "https://www.kemet.com", categories: ["Capacitors"], prefixes: ["C0805", "C1206", "T491", "R82", "PHE", "F861", "C315", "ESR"] },
  { name: "Nichicon", shortCode: "NCH", website: "https://www.nichicon.co.jp", categories: ["Electrolytic Capacitors"], prefixes: ["UCW", "UCD", "UKW", "UFW", "ULD", "UPW"] },
  { name: "Rubycon", shortCode: "RBY", website: "https://www.rubycon.co.jp", categories: ["Electrolytic Capacitors"], prefixes: ["ZLJ", "ZL", "UBC", "MCZ", "RBY"] },
  { name: "Nippon Chemi-Con", shortCode: "NCC", website: "https://www.chemi-con.co.jp", categories: ["Electrolytic Capacitors"], prefixes: ["KYB", "KZN", "EKZE", "ESMH", "NCC"] },
  { name: "Panasonic Electronic Devices", shortCode: "PANA", website: "https://www.panasonic.com", categories: ["Capacitors", "Resistors", "Inductors"], prefixes: ["EEE", "EEH", "ERJ", "ERA", "ELJ", "ELL"] },
  { name: "Bourns", shortCode: "BRN", website: "https://www.bourns.com", categories: ["Resistors", "Inductors", "Potentiometers"], prefixes: ["CR", "CAT16", "CHV", "SRF", "SRP", "SDR", "SRR", "3296", "3362", "3386", "3590"] },
  { name: "Vishay Dale", shortCode: "VSH-DALE", website: "https://www.vishay.com", categories: ["Resistors", "Inductors"], prefixes: ["CRCW", "WSL", "RLP", "IHLP", "IHSR"] },
  { name: "KOA Speer", shortCode: "KOA", website: "https://www.koaspeer.com", categories: ["Resistors"], prefixes: ["RK73", "SG73", "RN73"] },
  { name: "Rohm Resistors", shortCode: "ROHMR", website: "https://www.rohm.com", categories: ["Resistors"], prefixes: ["MCR", "ESR", "PSR"] },
  { name: "Ohmite", shortCode: "OHM", website: "https://www.ohmite.com", categories: ["Power Resistors"], prefixes: ["TAP", "TEH", "TWH", "OEMC"] },
  { name: "Stackpole Electronics", shortCode: "SEI", website: "https://www.seielect.com", categories: ["Resistors"], prefixes: ["RNCP", "RMCF", "RPC", "CSR", "HVR"] },
  { name: "Susumu", shortCode: "SUS", website: "https://www.susumu.co.jp", categories: ["Thin Film Resistors"], prefixes: ["RR", "KRL", "RGH", "PRL"] },
  { name: "Panasonic Industrial", shortCode: "PAN-IND", website: "https://industrial.panasonic.com", categories: ["Relays", "Switches"], prefixes: ["AGQ", "AQY", "EVQP", "EVQ", "ESE"] },
  { name: "Taiyo Yuden", shortCode: "TY", website: "https://www.ty-top.com", categories: ["MLCCs", "Inductors", "Wireless"], prefixes: ["JMK", "EMK", "TMK", "HMK", "AMK", "LB", "EYMD", "EYSGJNZWY"] },
  { name: "AVX (Kyocera AVX)", shortCode: "AVX", website: "https://www.kyocera-avx.com", categories: ["Capacitors", "Connectors"], prefixes: ["08055", "12065", "TAJB", "TAJA", "TMJE", "SQCS"] },
  { name: "Wurth Elektronik", shortCode: "WE", website: "https://www.we-online.com", categories: ["Inductors", "Connectors", "EMC"], prefixes: ["744", "7447", "7448", "7490", "7491", "748", "742", "749", "WE", "74"] },
  { name: "Coilcraft", shortCode: "CLS", website: "https://www.coilcraft.com", categories: ["Inductors", "Transformers"], prefixes: ["XAL", "XFL", "SER", "DO3", "DO4", "PFC"] },
  { name: "Vishay Cera-Mite", shortCode: "CM", website: "https://www.vishay.com", categories: ["Capacitors"], prefixes: ["VJ", "MAL"] },
  { name: "Cornell Dubilier", shortCode: "CDE", website: "https://www.cde.com", categories: ["Capacitors"], prefixes: ["SLPX", "SLPD", "TAP", "940"] },
  { name: "Illinois Capacitor", shortCode: "ILC", website: "https://www.illinoiscapacitor.com", categories: ["Electrolytic Capacitors"], prefixes: ["159CKS"] },
  { name: "Holy Stone Enterprise", shortCode: "HS", website: "https://www.holystone.com.tw", categories: ["MLCCs"], prefixes: ["HX"] },
  { name: "Hitano Enterprise", shortCode: "HIT", website: "https://www.hitano.com.tw", categories: ["Electrolytic Capacitors"], prefixes: ["HAT"] },
  { name: "United Chemi-Con", shortCode: "UCC", website: "https://www.chemi-con.co.jp", categories: ["Electrolytic Capacitors"], prefixes: ["ESMH", "EKY", "EKR", "EKZ"] },
  // ── Crystals, Oscillators & Timing ───────────────────────────────
  { name: "Epson Electronics", shortCode: "EPS", website: "https://www5.epsondevice.com", categories: ["Crystals", "Oscillators"], prefixes: ["FA", "FC", "TSX", "SG", "SG-8018", "SG-8019", "MG"] },
  { name: "NDK (Nihon Dempa Kogyo)", shortCode: "NDK", website: "https://www.ndk.com", categories: ["Crystals", "Oscillators"], prefixes: ["NX3225", "NX8045", "AT", "NT"] },
  { name: "Abracon", shortCode: "ABR", website: "https://abracon.com", categories: ["Crystals", "Oscillators", "Antennas"], prefixes: ["ABM", "ABS", "ABLS", "ASDM", "ASFL", "ASTMR", "AISC"] },
  { name: "CTS Corporation", shortCode: "CTS", website: "https://www.ctscorp.com", categories: ["Crystals", "Oscillators"], prefixes: ["ATS", "MXO", "XO", "CS" ] },
  { name: "Microcrystal", shortCode: "MC", website: "https://www.microcrystal.com", categories: ["Crystals", "RTC"], prefixes: ["CM", "VM", "UM", "CC"] },
  // ── Optoelectronics ──────────────────────────────────────────────
  { name: "Cree (Wolfspeed)", shortCode: "CREE", website: "https://www.wolfspeed.com", categories: ["LEDs", "SiC Power"], prefixes: ["CLM", "CLN", "XPEBWT", "XPGBWT", "C4D", "CAS", "CAB"] },
  { name: "Lumileds", shortCode: "LUM", website: "https://www.lumileds.com", categories: ["LEDs"], prefixes: ["L1RX", "LXML", "LXZ1", "LXHL"] },
  { name: "Osram Opto Semiconductors", shortCode: "OSR", website: "https://ams-osram.com", categories: ["LEDs", "Laser Diodes"], prefixes: ["SFH", "LA", "LB", "LC", "LD", "LE", "LO", "LP", "LR", "LT", "LUW", "LW", "LY"] },
  { name: "Everlight", shortCode: "EVL", website: "https://www.everlight.com", categories: ["LEDs", "Optoelectronics"], prefixes: ["19", "27", "67", "ER", "EL", "T-1"] },
  { name: "Kingbright", shortCode: "KBR", website: "https://www.kingbright.com", categories: ["LEDs", "Displays"], prefixes: ["AA", "WP", "KB", "SA", "SC", "KM"] },
  { name: "Lumex", shortCode: "LMX", website: "https://www.lumex.com", categories: ["LEDs", "Displays"], prefixes: ["SSL", "SSI", "SML"] },
  { name: "Broadcom (Avago)", shortCode: "AVGO", website: "https://www.broadcom.com", categories: ["Optical", "Fiber"], prefixes: ["AFBR", "HFBR", "HCPL", "ACNW", "ACPL", "ACSL", "ACSS"] },
  { name: "Sharp Microelectronics", shortCode: "SHR", website: "https://www.sharpsma.com", categories: ["Optoelectronics", "Displays"], prefixes: ["GP", "PC", "LH", "LQ", "PQ"] },
  { name: "Rohm Opto", shortCode: "ROHO", website: "https://www.rohm.com", categories: ["LEDs", "Photo Sensors"], prefixes: ["SML", "SFH", "RPI"] },
  // ── Power & Batteries ─────────────────────────────────────────────
  { name: "MEAN WELL", shortCode: "MW", website: "https://www.meanwell.com", categories: ["Power Supplies"], prefixes: ["SE", "SD", "DDR", "DR", "SP", "NES", "RS", "LPV", "HLG", "ELG"] },
  { name: "Vicor", shortCode: "VCR", website: "https://www.vicorpower.com", categories: ["DC-DC Converters"], prefixes: ["VI", "DCM", "BCM", "ICM", "FIAM"] },
  { name: "Murata Power Solutions", shortCode: "MUR-PS", website: "https://power.murata.com", categories: ["DC-DC Converters"], prefixes: ["OKR", "OKI", "UWE", "UWR", "MEF", "MEE"] },
  { name: "Bel Fuse", shortCode: "BEL", website: "https://www.belfuse.com", categories: ["Power", "Fuses", "Magnetics"], prefixes: ["SLIN", "UP", "LM50", "SI"] },
  { name: "Cosel", shortCode: "COS", website: "https://www.cosel.com", categories: ["Power Supplies"], prefixes: ["ACDK", "AU", "FHB", "LDC", "LMH", "PAA"] },
  { name: "SL Power", shortCode: "SLP", website: "https://www.slpower.com", categories: ["Power Supplies"], prefixes: ["SL", "MEND", "MENB"] },
  { name: "Murata GS Yuasa", shortCode: "GSY", website: "https://www.gsyuasabattery.com", categories: ["Batteries"], prefixes: ["REH", "UB", "SYH"] },
  { name: "Tadiran Batteries", shortCode: "TAD", website: "https://www.tadiranbat.com", categories: ["Batteries"], prefixes: ["TL", "TER"] },
  { name: "Panasonic Batteries", shortCode: "PAN-BAT", website: "https://www.panasonic.com", categories: ["Batteries"], prefixes: ["CR", "BR", "HHR"] },
  { name: "Renata Batteries", shortCode: "REN-BAT", website: "https://www.renata.com", categories: ["Batteries"], prefixes: ["CR2032", "CR2016", "CR2025"] },
  { name: "Saft Batteries", shortCode: "SAFT", website: "https://www.saft.com", categories: ["Batteries"], prefixes: ["LS", "LSH", "MP", "LST"] },
  { name: "Varta", shortCode: "VARTA", website: "https://www.varta-consumer.com", categories: ["Batteries"], prefixes: ["CR", "V6HR"] },
  // ── RF & Wireless ─────────────────────────────────────────────────
  { name: "Skyworks Solutions", shortCode: "SWKS", website: "https://www.skyworksinc.com", categories: ["RF", "Wireless"], prefixes: ["SKY", "SE2", "SE4", "AAT", "CXO", "SC70"] },
  { name: "Qorvo", shortCode: "QRVO", website: "https://www.qorvo.com", categories: ["RF", "Wireless", "Filters"], prefixes: ["RF", "TQP", "QPL", "QPA", "QPF", "QPC"] },
  { name: "MACOM Technology", shortCode: "MACOM", website: "https://www.macom.com", categories: ["RF", "Microwave"], prefixes: ["MAMF", "MAAP", "MA0", "M/A-COM"] },
  { name: "Microwave Technology", shortCode: "MWT", website: "https://www.mwtinc.com", categories: ["RF Transistors"], prefixes: ["MWT"] },
  { name: "Taoglas", shortCode: "TAO", website: "https://www.taoglas.com", categories: ["Antennas"], prefixes: ["FXP", "GW", "PC", "AA", "TG"] },
  { name: "Linx Technologies", shortCode: "LNX", website: "https://www.linxtechnologies.com", categories: ["RF Modules", "Antennas"], prefixes: ["ANT", "CW-", "HHX", "TX", "RX"] },
  { name: "u-blox", shortCode: "UBLX", website: "https://www.u-blox.com", categories: ["GNSS", "Cellular", "WiFi"], prefixes: ["NEO", "MAX", "SAM", "LEA", "ANN", "NINA", "ODIN", "SARA"] },
  { name: "SIMCom", shortCode: "SIMC", website: "https://www.simcom.com", categories: ["Cellular Modules"], prefixes: ["SIM7", "SIM8", "SIM9", "SIM5", "A7", "A9"] },
  { name: "Quectel", shortCode: "QUEC", website: "https://www.quectel.com", categories: ["Cellular Modules", "GNSS"], prefixes: ["EC2", "EC6", "BG9", "BC6", "UC", "M26", "M66", "BC95", "UG"] },
  { name: "Telit", shortCode: "TEL", website: "https://www.telit.com", categories: ["Cellular Modules"], prefixes: ["GE", "GL", "GM", "GS", "HE", "LE", "ME", "ML", "SE"] },
  { name: "Sierra Wireless", shortCode: "SWIR", website: "https://www.sierrawireless.com", categories: ["Cellular Modules"], prefixes: ["HL", "WP", "EM7", "MC7"] },
  // ── Display & Touch ───────────────────────────────────────────────
  { name: "Innolux Corporation", shortCode: "INX", website: "https://www.innolux.com", categories: ["LCDs"], prefixes: ["N070", "N101", "AT"] },
  { name: "BOE Technology", shortCode: "BOE", website: "https://www.boe.com", categories: ["LCDs", "OLEDs"], prefixes: ["BOE"] },
  { name: "AUO (AU Optronics)", shortCode: "AUO", website: "https://www.auo.com", categories: ["LCDs"], prefixes: ["G", "B1", "B13", "B15", "B17"] },
  { name: "Lumineq (Beneq)", shortCode: "LMQ", website: "https://www.lumineq.com", categories: ["EL Displays"], prefixes: ["LA"] },
  { name: "Newhaven Display", shortCode: "NHD", website: "https://www.newhavendisplay.com", categories: ["LCDs", "OLEDs"], prefixes: ["NHD", "C0220", "C0420"] },
  { name: "Vishay Optoelectronics", shortCode: "VOP", website: "https://www.vishay.com", categories: ["LED Displays", "Optocouplers"], prefixes: ["TOPT", "TSOP", "VISHAY"] },
  // ── Interface & Protocol ──────────────────────────────────────────
  { name: "Maxim (now ADI)", shortCode: "MAXADI", website: "https://www.analog.com", categories: ["Interface", "Power"], prefixes: ["MAX3", "MAX4", "MAX9", "DS9", "DS28"] },
  { name: "FTDI", shortCode: "FTDI", website: "https://www.ftdichip.com", categories: ["USB", "Interface"], prefixes: ["FT", "FT2", "FT4", "FT23", "FT22", "FT24", "FT813"] },
  { name: "Prolific Technology", shortCode: "PL", website: "https://www.prolific.com.tw", categories: ["USB"], prefixes: ["PL", "PL2303", "PL23"] },
  { name: "WCH (Nanjing Qinheng)", shortCode: "WCH", website: "https://www.wch.cn", categories: ["USB", "Interface"], prefixes: ["CH3", "CH34", "CH55", "CH57", "CH58", "CH59", "CH32"] },
  { name: "Silergy (Monolithic Power)", shortCode: "SLG", website: "https://www.monolithicpower.com", categories: ["Power Management"], prefixes: ["SY", "MP"] },
  { name: "MPS (Monolithic Power Systems)", shortCode: "MPS", website: "https://www.monolithicpower.com", categories: ["Power ICs"], prefixes: ["MP1", "MP2", "MP3", "MP4", "MP5", "MP6", "MP8", "MP9"] },
  { name: "Semtech", shortCode: "SMTC", website: "https://www.semtech.com", categories: ["LoRa", "ESD Protection", "Wireless"], prefixes: ["SX1", "SX9", "SC", "SPS", "LC", "XE", "ZSC"] },
  { name: "Richtek Technology", shortCode: "RCK", website: "https://www.richtek.com", categories: ["Power Management"], prefixes: ["RT", "RT8", "RT9"] },
  { name: "Diodes Inc.", shortCode: "DIOINC", website: "https://www.diodes.com", categories: ["Transistors", "Regulators"], prefixes: ["DMP", "DMN", "DGD", "AS431", "AZ431"] },
  { name: "SGS-Thomson (ST)", shortCode: "SGS", website: "https://www.st.com", categories: ["Power", "Logic"], prefixes: ["L29", "L293", "L298", "L297", "L200", "L7805"] },
  { name: "Supertex (Microchip)", shortCode: "SPRX", website: "https://www.microchip.com", categories: ["HV Analog", "MOSFET Drivers"], prefixes: ["HV", "LD", "TC4"] },
  // ── Switches, Relays & Mechanical ────────────────────────────────
  { name: "Omron", shortCode: "OMR", website: "https://www.omron.com", categories: ["Relays", "Switches", "Sensors"], prefixes: ["G2", "G3", "G5", "G6", "G8", "MY", "LY", "MK", "D2", "B3", "SS"] },
  { name: "TE Connectivity (Tyco)", shortCode: "TYC", website: "https://www.te.com", categories: ["Relays", "Connectors"], prefixes: ["IM", "RTE", "T9"] },
  { name: "Carling Technologies", shortCode: "CAR", website: "https://www.carlingtech.com", categories: ["Switches", "Circuit Breakers"], prefixes: ["RA", "LA", "FA", "TA", "CA"] },
  { name: "C&K Components", shortCode: "CK", website: "https://www.ckswitches.com", categories: ["Switches"], prefixes: ["PTS", "JS", "KMR", "PTS645", "ET"] },
  { name: "Alps Alpine", shortCode: "ALPS", website: "https://www.alpsalpine.com", categories: ["Switches", "Encoders", "Sensors"], prefixes: ["EC1", "EC2", "SKHH", "SKQY", "SKRK", "STEC", "RK09", "RK16"] },
  { name: "E-Switch", shortCode: "ESW", website: "https://www.e-switch.com", categories: ["Switches"], prefixes: ["RP", "TL", "KS", "EG"] },
  { name: "Grayhill", shortCode: "GRH", website: "https://www.grayhill.com", categories: ["Encoders", "Switches"], prefixes: ["61", "62", "70", "72", "91"] },
  { name: "Bourns Potentiometers", shortCode: "BRN-POT", website: "https://www.bourns.com", categories: ["Potentiometers", "Encoders"], prefixes: ["PTV", "PTD", "ACE", "EN1"] },
  // ── EMC & Protection ──────────────────────────────────────────────
  { name: "Laird Technologies", shortCode: "LAIRD", website: "https://www.laird.com", categories: ["EMI Shielding", "Wireless"], prefixes: ["BMF", "BMG", "SMH", "RS232", "WMRC"] },
  { name: "Würth Elektronik", shortCode: "WE2", website: "https://www.we-online.com", categories: ["Ferrites", "EMC", "Transformers"], prefixes: ["742", "744", "748", "749", "74", "WE-"] },
  { name: "TDK EMC", shortCode: "TDK-EMC", website: "https://product.tdk.com", categories: ["Ferrite Beads", "Common Mode Chokes"], prefixes: ["MMZ", "ACM", "ZCAT", "HF30", "SRF"] },
  { name: "Murata EMI Suppression", shortCode: "MUR-EMI", website: "https://www.murata.com", categories: ["EMI Filters", "Ferrites"], prefixes: ["BLM", "BLJ", "DLW", "NFL"] },
  { name: "Epcos (TDK)", shortCode: "EPC", website: "https://www.tdk.com/epcos", categories: ["Varistors", "Capacitors", "Inductors"], prefixes: ["B3", "B4", "B7", "B8", "B9", "S14", "S20"] },
  // ── Fuses ─────────────────────────────────────────────────────────
  { name: "Eaton Bussmann", shortCode: "EAT", website: "https://www.eaton.com/bussmann", categories: ["Fuses"], prefixes: ["AGC", "BK", "FNQ", "MDL", "GMD", "LP-CC"] },
  { name: "Littelfuse Inc.", shortCode: "LITL", website: "https://www.littelfuse.com", categories: ["Fuses", "PTC", "TVS"], prefixes: ["0251", "0452", "MF-R", "NANO2", "POWR-GARD"] },
  { name: "Schurter", shortCode: "SCH", website: "https://www.schurter.com", categories: ["Fuses", "Inlets"], prefixes: ["3401", "3411", "4301", "UMT", "MST", "SMD"] },
  { name: "Bel Fuse (inc. Wickmann)", shortCode: "BEL-F", website: "https://www.belfuse.com", categories: ["Fuses"], prefixes: ["0672", "1025", "C14"] },
  // ── Test & Misc ───────────────────────────────────────────────────
  { name: "Amphenol ICC", shortCode: "AICC", website: "https://www.amphenol-icc.com", categories: ["Connectors"], prefixes: ["10118", "10166", "47589", "68786"] },
  { name: "GCT (Global Connector Technology)", shortCode: "GCT", website: "https://gct.co", categories: ["Connectors", "USB"], prefixes: ["USB4", "USB3", "USB1", "SD", "SIM", "DC", "TB"] },
  { name: "Adafruit Industries", shortCode: "ADA", website: "https://www.adafruit.com", categories: ["Modules", "Breakouts"], prefixes: ["ADA"] },
  { name: "SparkFun Electronics", shortCode: "SFE", website: "https://www.sparkfun.com", categories: ["Modules", "Breakouts"], prefixes: ["SFE", "DEV", "BOB", "SEN", "COM"] },
  { name: "Raspberry Pi Foundation", shortCode: "RPI", website: "https://www.raspberrypi.com", categories: ["SBCs"], prefixes: ["SC", "RPI", "CM4", "RP"] },
  { name: "Arduino", shortCode: "ARD", website: "https://www.arduino.cc", categories: ["Microcontrollers", "Modules"], prefixes: ["A000", "ABX"] },
  { name: "Seeed Studio", shortCode: "SEED", website: "https://www.seeedstudio.com", categories: ["Modules", "Grove"], prefixes: ["SLD", "SKU"] },
  { name: "DFRobot", shortCode: "DFR", website: "https://www.dfrobot.com", categories: ["Modules"], prefixes: ["DFR"] },
  { name: "Kalmer (Israel)", shortCode: "KAL", website: "https://www.kalmer.co.il", categories: ["Passive Components"], prefixes: ["KAL"] },
  { name: "Isabellenhütte", shortCode: "ISH", website: "https://www.isabellenhuette.de", categories: ["Shunt Resistors", "Current Sensors"], prefixes: ["BVS", "IVT", "BVR", "PBV"] },
  { name: "CalChip Electronics", shortCode: "CCE", website: "https://www.calchipelectronics.com", categories: ["Wireless Modules"], prefixes: ["RN2", "RN4", "RN1"] },
  { name: "Knowles Acoustics", shortCode: "KNW", website: "https://www.knowles.com", categories: ["Microphones", "Audio"], prefixes: ["SPM", "SPU", "SPK", "FG", "BK", "EM"] },
  { name: "TT Electronics", shortCode: "TTE", website: "https://www.ttelectronics.com", categories: ["Resistors", "Sensors"], prefixes: ["OPB", "OP5", "OP9", "IPT", "HTA", "WH"] },
  { name: "Keystone Electronics Corp", shortCode: "KEST", website: "https://www.keystoneelectronics.com", categories: ["Hardware", "Spacers", "Terminals"], prefixes: ["PEM", "SEM", "HEX"] },
  { name: "Cinch Connectivity", shortCode: "CIN", website: "https://www.cinchconnectivity.com", categories: ["Connectors", "Switches"], prefixes: ["SD-", "SJ-"] },
  { name: "CUI Inc", shortCode: "CUI", website: "https://www.cuidevices.com", categories: ["Power", "Connectors", "Encoders"], prefixes: ["PES", "PBO", "ACE", "AMT", "CUI", "PDMD", "PDQ30"] },
  { name: "Bürklin Elektronik", shortCode: "BEL2", website: "https://www.buerklin.com", categories: ["Distribution"], prefixes: [] },
  { name: "W+P Products", shortCode: "WPP", website: "https://www.wp-products.com", categories: ["Connectors"], prefixes: ["WR"] },
  { name: "3M Electronic Solutions", shortCode: "3M", website: "https://www.3m.com", categories: ["Connectors", "Cables", "EMI"], prefixes: ["9L", "7000", "8000", "3M"] },
  { name: "Harting", shortCode: "HAR", website: "https://www.harting.com", categories: ["Industrial Connectors"], prefixes: ["09", "19", "21"] },
  { name: "Deutsch (TE Connectivity)", shortCode: "DTH", website: "https://www.te.com", categories: ["Automotive Connectors"], prefixes: ["DT", "DTM", "DTN", "DRC", "DRB"] },
  { name: "Souriau", shortCode: "SOU", website: "https://www.souriau.com", categories: ["Military Connectors"], prefixes: ["UTG", "UT", "UTWE"] },
  { name: "ITT Cannon", shortCode: "ITC", website: "https://www.ittcannon.com", categories: ["Military Connectors"], prefixes: ["KPT", "KPX", "MIL"] },
  { name: "Positronic", shortCode: "POS", website: "https://www.positronic.com", categories: ["High Reliability Connectors"], prefixes: ["MS3", "GT"] },
  { name: "Radiall", shortCode: "RAD", website: "https://www.radiall.com", categories: ["RF Connectors"], prefixes: ["R"] },
  { name: "Rosenberger", shortCode: "RSB", website: "https://www.rosenberger.de", categories: ["RF Connectors"], prefixes: ["32"] },
  { name: "SMA Connectors (Amphenol RF)", shortCode: "SMAC", website: "https://www.amphenolrf.com", categories: ["RF Connectors"], prefixes: ["132360", "901-", "SMA"] },
  { name: "Cinch Connectivity (Bel)", shortCode: "CINB", website: "https://www.cinchconnectivity.com", categories: ["RF Connectors"], prefixes: ["415-", "112-", "115-"] },
  { name: "Pasternack Enterprises", shortCode: "PST", website: "https://www.pasternack.com", categories: ["RF Connectors", "Cables"], prefixes: ["PE", "PETT", "PCAN"] },
  { name: "Times Microwave", shortCode: "TMW", website: "https://www.timesmicrowave.com", categories: ["RF Cables"], prefixes: ["LMR", "SilverLine"] },
];

function localLookup(orderCode) {
  if (!orderCode) return null;
  const code = orderCode.trim().toUpperCase();
  const matches = [];

  for (const mfr of LOCAL_DB) {
    for (const prefix of mfr.prefixes) {
      if (code.startsWith(prefix.toUpperCase())) {
        matches.push({
          manufacturer: mfr.name,
          shortCode: mfr.shortCode,
          website: mfr.website,
          categories: mfr.categories,
          mpn: orderCode,
          description: "",
          source: "local-db",
          prefixMatch: prefix,
        });
        break;
      }
    }
  }

  return matches.length > 0 ? matches : null;
}

// ─────────────────────────────────────────────
// Build distributor links
// ─────────────────────────────────────────────
function distributorLinks(orderCode) {
  const encoded = encodeURIComponent(orderCode);
  return {
    digikey: `https://www.digikey.com/en/products/result?keywords=${encoded}`,
    mouser: `https://www.mouser.com/c/?q=${encoded}`,
    arrow: `https://www.arrow.com/en/products/search?q=${encoded}`,
    farnell: `https://uk.farnell.com/search?st=${encoded}`,
    lcsc: `https://www.lcsc.com/search?q=${encoded}`,
    octopart: `https://octopart.com/search?q=${encoded}`,
  };
}

// ─────────────────────────────────────────────
// MAIN search orchestrator
// Priority: DigiKey → Mouser → local DB
// ─────────────────────────────────────────────
async function identifyManufacturer(orderCode) {
  if (!orderCode || orderCode.trim().length < 2) {
    return {
      success: false,
      error: "Invalid order code",
      orderCode,
    };
  }

  const cleanCode = orderCode.trim();
  console.log(`[Search] ${cleanCode}`);

  // Run live lookups in parallel
  const [dkApi, mouseApi, dkScrape, mouScrape] = await Promise.allSettled([
    searchDigiKeyAPI(cleanCode),
    searchMouserAPI(cleanCode),
    searchDigiKey(cleanCode),
    searchMouser(cleanCode),
  ]);

  // Collect all live results
  const liveResults = [
    ...(dkApi.status === "fulfilled" && dkApi.value ? dkApi.value : []),
    ...(mouseApi.status === "fulfilled" && mouseApi.value ? mouseApi.value : []),
    ...(dkScrape.status === "fulfilled" && dkScrape.value ? dkScrape.value : []),
    ...(mouScrape.status === "fulfilled" && mouScrape.value ? mouScrape.value : []),
  ];

  console.log(`[Results] Live hits: ${liveResults.length}`);

  let primaryMfr = null;
  let alternateMfrs = [];
  let dataSource = "none";

  if (liveResults.length > 0) {
    const consolidated = consolidateResults(liveResults);
    if (consolidated && consolidated.primary) {
      primaryMfr = {
        name: consolidated.primary.name,
        mpn: consolidated.primary.mpn,
        description: consolidated.primary.description,
        sources: consolidated.primary.sources,
        website: `https://www.google.com/search?q=${encodeURIComponent(consolidated.primary.name + " " + cleanCode)}`,
      };
      alternateMfrs = consolidated.alternates.map((a) => ({
        name: a.name,
        mpn: a.mpn,
        description: a.description,
        sources: a.sources,
      }));
      dataSource = "live";
    }
  }

  // If live lookup returned nothing, fall back to local DB
  if (!primaryMfr) {
    console.log("[Fallback] Using local database");
    const localMatches = localLookup(cleanCode);
    if (localMatches && localMatches.length > 0) {
      const first = localMatches[0];
      primaryMfr = {
        name: first.manufacturer,
        shortCode: first.shortCode,
        website: first.website,
        categories: first.categories,
        mpn: cleanCode,
        description: "",
        sources: ["local-db"],
      };
      alternateMfrs = localMatches.slice(1).map((m) => ({
        name: m.manufacturer,
        shortCode: m.shortCode,
        website: m.website,
        categories: m.categories,
        mpn: cleanCode,
      }));
      dataSource = "local-db";
    }
  }

  if (!primaryMfr) {
    return {
      success: false,
      orderCode: cleanCode,
      error: "Manufacturer not identified",
      message:
        "Could not identify manufacturer from live distributors or local database. Try the distributor links to check manually.",
      distributorLinks: distributorLinks(cleanCode),
      dataSource: "none",
    };
  }

  return {
    success: true,
    orderCode: cleanCode,
    dataSource,
    primaryManufacturer: primaryMfr,
    alternateManufacturers: alternateMfrs,
    totalManufacturers: 1 + alternateMfrs.length,
    distributorLinks: distributorLinks(cleanCode),
    note:
      dataSource === "live"
        ? "Manufacturer identified from live DigiKey/Mouser data."
        : "Manufacturer identified from local prefix database (live lookup returned no results).",
  };
}

// ─────────────────────────────────────────────
// OpenAPI spec
// ─────────────────────────────────────────────
const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: {
    title: "Electronic Parts Manufacturer API",
    description:
      "Identifies the manufacturer and alternate manufacturers from an electronic component order code by querying DigiKey and Mouser live, then falling back to a 600+ manufacturer local database.",
    version: "3.0.0",
  },
  servers: [{ url: `http://localhost:${PORT}` }],
  paths: {
    "/search": {
      get: {
        operationId: "searchByOrderCode",
        summary: "Identify manufacturer from order code",
        description:
          "Queries DigiKey and Mouser live for accurate manufacturer data, with local DB fallback.",
        parameters: [
          {
            name: "orderCode",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Electronic component order code or part number",
          },
        ],
        responses: {
          200: {
            description: "Search result with manufacturer info",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
      post: {
        operationId: "searchByOrderCodePost",
        summary: "Identify manufacturer from order code (POST)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { orderCode: { type: "string" } },
                required: ["orderCode"],
              },
            },
          },
        },
        responses: {
          200: { description: "Search result" },
        },
      },
    },
    "/health": {
      get: {
        operationId: "healthCheck",
        summary: "Health check",
        responses: { 200: { description: "OK" } },
      },
    },
  },
};

// ─────────────────────────────────────────────
// HTTP Server
// ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCORS(res);
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  if (path === "/health" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({ status: "ok", version: "3.0.0", time: new Date().toISOString() }));
    return;
  }

  if (path === "/openapi.json" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(OPENAPI_SPEC, null, 2));
    return;
  }

  if (path === "/search") {
    let orderCode = null;

    if (req.method === "GET") {
      orderCode = parsedUrl.query.orderCode || parsedUrl.query.ordercode;
    } else if (req.method === "POST") {
      try {
        const body = await new Promise((resolve, reject) => {
          let data = "";
          req.on("data", (c) => (data += c));
          req.on("end", () => resolve(data));
          req.on("error", reject);
        });
        const parsed = JSON.parse(body);
        orderCode = parsed.orderCode || parsed.ordercode;
      } catch (_) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
    }

    if (!orderCode) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing orderCode parameter" }));
      return;
    }

    try {
      const result = await identifyManufacturer(orderCode);
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("Search error:", err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal error", message: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found", availableEndpoints: ["/search?orderCode=STM32F103C8T6", "/health", "/openapi.json"] }));
});

server.listen(PORT, () => {
  console.log(`\n Electronic Parts API v3.0 running on port ${PORT}`);
  console.log(` Search:    http://localhost:${PORT}/search?orderCode=STM32F103C8T6`);
  console.log(` Health:    http://localhost:${PORT}/health`);
  console.log(` OpenAPI:   http://localhost:${PORT}/openapi.json\n`);
  console.log(" Live lookups: DigiKey → Mouser → Local DB (600+ manufacturers)\n");
});
