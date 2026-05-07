/**
 * Electronic Parts Manufacturer Search API v4.0
 *
 * Live lookup priority:
 *   1. Mouser Search API  (free key — signup at mouser.com/api-search/)
 *   2. DigiKey API v4     (free key — signup at developer.digikey.com)
 *   3. LCSC internal API  (no key needed)
 *   4. Local prefix DB    (600+ manufacturers, last resort)
 *
 * Set these Railway environment variables for live lookups:
 *   MOUSER_API_KEY        → from mouser.com/api-search/
 *   DIGIKEY_CLIENT_ID     → from developer.digikey.com
 *   DIGIKEY_CLIENT_SECRET → from developer.digikey.com
 *
 * Without keys, LCSC + local DB are still used as fallback.
 *
 * Run: node parts-api.js
 */

const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 3000;
const MOUSER_API_KEY = process.env.MOUSER_API_KEY || "";
const DIGIKEY_CLIENT_ID = process.env.DIGIKEY_CLIENT_ID || "";
const DIGIKEY_CLIENT_SECRET = process.env.DIGIKEY_CLIENT_SECRET || "";

// Cache DigiKey token in memory
let dkTokenCache = { token: null, expiresAt: 0 };

// ─────────────────────────────────────────────────────────────────
// HTTPS fetch helper
// ─────────────────────────────────────────────────────────────────
function fetchUrl(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "PartsSearchAPI/4.0",
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      timeout: 12000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ body: data, status: res.statusCode }));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────
// 1. MOUSER OFFICIAL API (free key required)
//    Sign up: https://www.mouser.com/api-search/
//    Free, instant approval, no usage limits for search
// ─────────────────────────────────────────────────────────────────
async function searchMouserAPI(partNumber) {
  if (!MOUSER_API_KEY) return null;

  try {
    // Try exact part number match first
    const exactUrl = `https://api.mouser.com/api/v1/search/partnumber?apiKey=${MOUSER_API_KEY}`;
    const exactBody = JSON.stringify({
      SearchByPartRequest: {
        mouserPartNumber: partNumber,
        partSearchOptions: "Exact",
      },
    });

    const { body: respBody, status } = await fetchUrl(exactUrl, {
      method: "POST",
      body: exactBody,
      headers: { "Content-Type": "application/json" },
    });

    if (status === 200) {
      const data = JSON.parse(respBody);
      const parts = data.SearchResults?.Parts || [];
      const results = [];

      for (const part of parts) {
        const mfr = part.Manufacturer || part.ManufacturerName;
        if (mfr && mfr.trim().length > 1) {
          results.push({
            manufacturer: mfr.trim(),
            mpn: (part.ManufacturerPartNumber || partNumber).trim(),
            description: (part.Description || "").trim(),
            source: "mouser-exact",
            confidence: "high",
          });
        }
      }

      if (results.length > 0) return results;
    }

    // Fallback: keyword search
    return await searchMouserKeyword(partNumber);
  } catch (err) {
    console.error("[Mouser API Error]", err.message);
    return null;
  }
}

async function searchMouserKeyword(partNumber) {
  if (!MOUSER_API_KEY) return null;
  try {
    const apiUrl = `https://api.mouser.com/api/v1/search/keyword?apiKey=${MOUSER_API_KEY}`;
    const body = JSON.stringify({
      SearchByKeywordRequest: {
        keyword: partNumber,
        records: 10,
        startingRecord: 0,
        searchOptions: "",
        searchWithSvhcRestrictions: false,
      },
    });

    const { body: respBody, status } = await fetchUrl(apiUrl, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

    if (status !== 200) return null;
    const data = JSON.parse(respBody);
    const parts = data.SearchResults?.Parts || [];
    const results = [];
    const search = partNumber.toLowerCase();

    for (const part of parts) {
      const mfr = part.Manufacturer || part.ManufacturerName;
      const mpn = (part.ManufacturerPartNumber || "").toLowerCase();
      // Only include if MPN closely matches what we searched for
      if (mfr && mpn && (mpn === search || mpn.includes(search) || search.includes(mpn.substring(0, Math.max(5, mpn.length - 2))))) {
        results.push({
          manufacturer: mfr.trim(),
          mpn: (part.ManufacturerPartNumber || partNumber).trim(),
          description: (part.Description || "").trim(),
          source: "mouser-keyword",
          confidence: mpn === search ? "high" : "medium",
        });
      }
    }
    return results.length > 0 ? results : null;
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. DIGIKEY API v4 (free key required)
//    Sign up: https://developer.digikey.com/get_started
//    Free tier: 1000 requests/day
// ─────────────────────────────────────────────────────────────────
async function getDigiKeyToken() {
  if (dkTokenCache.token && Date.now() < dkTokenCache.expiresAt) {
    return dkTokenCache.token;
  }

  const body =
    `grant_type=client_credentials` +
    `&client_id=${encodeURIComponent(DIGIKEY_CLIENT_ID)}` +
    `&client_secret=${encodeURIComponent(DIGIKEY_CLIENT_SECRET)}`;

  const { body: respBody, status } = await fetchUrl(
    "https://api.digikey.com/v1/oauth2/token",
    {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (status !== 200) throw new Error("DigiKey auth failed: " + status);
  const data = JSON.parse(respBody);
  dkTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return dkTokenCache.token;
}

async function searchDigiKeyAPI(partNumber) {
  if (!DIGIKEY_CLIENT_ID || !DIGIKEY_CLIENT_SECRET) return null;

  try {
    const token = await getDigiKeyToken();

    // Try exact MPN lookup first
    const mpnUrl = `https://api.digikey.com/products/v4/search/${encodeURIComponent(partNumber)}/mpn`;
    const { body: mpnBody, status: mpnStatus } = await fetchUrl(mpnUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-DIGIKEY-Client-Id": DIGIKEY_CLIENT_ID,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD",
      },
    });

    if (mpnStatus === 200) {
      const data = JSON.parse(mpnBody);
      const products = data.Products || data.ExactMatches || [];
      const results = [];

      for (const p of products) {
        const mfr = p.Manufacturer?.Name || p.ManufacturerName;
        if (mfr) {
          results.push({
            manufacturer: mfr.trim(),
            mpn: (p.ManufacturerProductNumber || partNumber).trim(),
            description: (p.Description?.ProductDescription || p.ProductDescription || "").trim(),
            source: "digikey-mpn",
            confidence: "high",
          });
        }
      }
      if (results.length > 0) return results;
    }

    // Fallback: keyword search
    return await searchDigiKeyKeyword(partNumber, token);
  } catch (err) {
    console.error("[DigiKey API Error]", err.message);
    return null;
  }
}

async function searchDigiKeyKeyword(partNumber, token) {
  try {
    const searchUrl = "https://api.digikey.com/products/v4/search/keyword";
    const body = JSON.stringify({
      Keywords: partNumber,
      Limit: 10,
      Offset: 0,
    });

    const { body: respBody, status } = await fetchUrl(searchUrl, {
      method: "POST",
      body,
      headers: {
        Authorization: `Bearer ${token}`,
        "X-DIGIKEY-Client-Id": DIGIKEY_CLIENT_ID,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD",
        "Content-Type": "application/json",
      },
    });

    if (status !== 200) return null;
    const data = JSON.parse(respBody);
    const products = data.Products || [];
    const results = [];
    const search = partNumber.toLowerCase();

    for (const p of products) {
      const mfr = p.Manufacturer?.Name || p.ManufacturerName;
      const mpn = (p.ManufacturerProductNumber || "").toLowerCase();

      if (mfr && mpn && (mpn === search || mpn.includes(search) || search.includes(mpn.substring(0, Math.max(5, mpn.length - 2))))) {
        results.push({
          manufacturer: mfr.trim(),
          mpn: (p.ManufacturerProductNumber || partNumber).trim(),
          description: (p.Description?.ProductDescription || "").trim(),
          source: "digikey-keyword",
          confidence: mpn === search ? "high" : "medium",
        });
      }
    }
    return results.length > 0 ? results : null;
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. LCSC API (no key needed)
// ─────────────────────────────────────────────────────────────────
async function searchLCSC(partNumber) {
  try {
    const apiUrl = `https://wmsc.lcsc.com/ftps/wm/product/search?keyword=${encodeURIComponent(partNumber)}&currentPage=1&pageSize=5`;

    const { body, status } = await fetchUrl(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://www.lcsc.com/",
        Origin: "https://www.lcsc.com",
      },
    });

    if (status !== 200) return null;
    const data = JSON.parse(body);

    const products =
      data.result?.productSearchResultVO?.productList ||
      data.result?.productList ||
      data.data?.productList ||
      data.productList ||
      [];

    const results = [];
    const search = partNumber.toLowerCase().replace(/\s+/g, "");

    for (const p of products) {
      const mfr = p.brandNameEn || p.brandName || p.manufacturerName || null;
      const mpn = (p.productModel || p.mpn || "").toLowerCase().replace(/\s+/g, "");

      if (mfr && mpn && (mpn === search || mpn.includes(search) || search.includes(mpn) || mpn.startsWith(search.substring(0, Math.max(4, search.length - 3))))) {
        results.push({
          manufacturer: mfr.trim(),
          mpn: (p.productModel || partNumber).trim(),
          description: (p.productIntroEn || p.productDescEn || "").trim(),
          source: "lcsc",
          confidence: mpn === search ? "high" : "medium",
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (err) {
    console.error("[LCSC Error]", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Consolidate results — deduplicate, rank by confidence + count
// ─────────────────────────────────────────────────────────────────
function consolidateResults(allResults) {
  if (!allResults || allResults.length === 0) return null;

  const mfrMap = {};

  for (const r of allResults) {
    const key = r.manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);

    if (!mfrMap[key]) {
      mfrMap[key] = {
        name: r.manufacturer,
        mpn: r.mpn,
        description: r.description || "",
        sources: [],
        score: 0,
      };
    }

    mfrMap[key].sources.push(r.source);
    mfrMap[key].score += r.confidence === "high" ? 3 : r.confidence === "medium" ? 2 : 1;

    if (r.description && r.description.length > mfrMap[key].description.length) {
      mfrMap[key].description = r.description;
    }
  }

  const sorted = Object.values(mfrMap).sort((a, b) => b.score - a.score);
  return { primary: sorted[0], alternates: sorted.slice(1) };
}

// ─────────────────────────────────────────────────────────────────
// LOCAL FALLBACK DATABASE (prefix-based, 80+ key manufacturers)
// ─────────────────────────────────────────────────────────────────
const LOCAL_DB = [
  { name: "Texas Instruments", shortCode: "TI", website: "https://www.ti.com", categories: ["ICs", "Analog", "Power"], prefixes: ["LM", "TL", "TMS", "MSP", "CC3", "AM3", "OPA", "INA", "UCC", "CSD", "SN7", "SN5", "CD4", "UC3", "TPA", "TCA", "TPD", "TUSB", "LMV", "LMC", "LMH", "LMK", "LMR", "LMX"] },
  { name: "STMicroelectronics", shortCode: "ST", website: "https://www.st.com", categories: ["Microcontrollers", "Power", "Analog"], prefixes: ["STM32", "STM8", "L6", "L7", "LD3", "VL", "SPC", "HTS", "LIS", "LSM", "VNH", "STSPIN", "M24", "M95", "STA", "STP", "STB"] },
  { name: "NXP Semiconductors", shortCode: "NXP", website: "https://www.nxp.com", categories: ["Microcontrollers", "RF", "Automotive"], prefixes: ["MK2", "MK6", "MKL", "MKV", "LPC", "PN5", "MPC", "S32", "IMX", "MIMX", "FXOS", "FXAS", "PCF", "PCA9", "SC16", "TEA", "TJA"] },
  { name: "Microchip Technology", shortCode: "MCHP", website: "https://www.microchip.com", categories: ["Microcontrollers", "Memory", "Analog"], prefixes: ["PIC32", "PIC24", "PIC18", "PIC16", "PIC12", "dsPIC", "ATSAM", "ATmega", "ATtiny", "ATxmega", "ATA6", "SAME", "SAMD", "SAML", "MCP2", "MCP3", "MCP4", "MCP6", "MCP7", "SST25", "SST26", "TC"] },
  { name: "Infineon Technologies", shortCode: "IFX", website: "https://www.infineon.com", categories: ["Power", "Automotive", "Security"], prefixes: ["IRF", "IRFZ", "IRFL", "IR21", "IRS", "IPP", "IPB", "IPA", "IPD", "BSZ", "BSP", "BTS", "TLE", "XMC", "CY8C", "CY7C", "AURIX", "SLB", "SLE", "BGT", "IMC"] },
  { name: "Renesas Electronics", shortCode: "REN", website: "https://www.renesas.com", categories: ["Microcontrollers", "Analog", "Automotive"], prefixes: ["R5F", "RL78", "RX6", "RX7", "RZA", "RAA", "RH850", "ISL", "ICL76", "X9C", "EL34", "EL45", "IDT7", "ICS65"] },
  { name: "Analog Devices", shortCode: "ADI", website: "https://www.analog.com", categories: ["Analog", "Signal Processing", "Power"], prefixes: ["AD8", "AD9", "AD7", "AD5", "AD4", "AD6", "ADA4", "ADM", "ADP", "ADR", "ADXL", "ADXRS", "ADUM", "LT3", "LT4", "LT1", "LT6", "LT8", "LTC3", "LTC4", "LTC1", "LTC6"] },
  { name: "Maxim Integrated (ADI)", shortCode: "MAX", website: "https://www.maximintegrated.com", categories: ["Analog", "Interface", "Power"], prefixes: ["MAX1", "MAX2", "MAX3", "MAX4", "MAX5", "MAX6", "MAX7", "MAX8", "MAX9", "DS18B", "DS1302", "DS1307", "DS2401"] },
  { name: "onsemi", shortCode: "ON", website: "https://www.onsemi.com", categories: ["Power", "Analog", "Logic"], prefixes: ["NCP", "NCE", "NCS", "NDS", "NTD", "NTP", "NVMFS", "CAT", "FAN", "MC33", "MC34", "MBR", "2N3", "2N4", "2N5", "2N6", "2N7", "FSL"] },
  { name: "Vishay", shortCode: "VSH", website: "https://www.vishay.com", categories: ["Passives", "Semiconductors", "Sensors"], prefixes: ["CRCW", "WSL", "SiP", "SiB", "SUD", "SUM", "SUP", "SI72", "SI74", "VLMU", "VLMS", "TSOP"] },
  { name: "Broadcom", shortCode: "BRCM", website: "https://www.broadcom.com", categories: ["Networking", "RF", "Optical"], prefixes: ["BCM", "AFBR", "ACPL", "HCNR", "HCPL", "HEDL"] },
  { name: "Espressif Systems", shortCode: "ESP", website: "https://www.espressif.com", categories: ["WiFi", "Bluetooth", "IoT"], prefixes: ["ESP32", "ESP8266", "ESP-WROOM", "ESP-WROVER", "ESP-C"] },
  { name: "Nordic Semiconductor", shortCode: "NRF", website: "https://www.nordicsemi.com", categories: ["Bluetooth", "Ultra-Low Power", "IoT"], prefixes: ["NRF52", "NRF53", "NRF91", "NRF21", "NRF70"] },
  { name: "Silicon Labs", shortCode: "SLAB", website: "https://www.silabs.com", categories: ["IoT", "Wireless", "MCU"], prefixes: ["EFM32", "EFR32", "EZR32", "BGM", "MGM", "WGM", "CP210", "TS33"] },
  { name: "Diodes Incorporated", shortCode: "DI", website: "https://www.diodes.com", categories: ["Diodes", "MOSFETs", "Logic"], prefixes: ["DMP", "DMPH", "DMN", "AP22", "AP61", "AP63", "AZ", "ZXMN", "ZXMP", "PI4"] },
  { name: "ROHM Semiconductor", shortCode: "ROHM", website: "https://www.rohm.com", categories: ["Power", "Analog", "Optoelectronics"], prefixes: ["BD00", "BD3", "BD4", "BD6", "BD9", "BR", "BU"] },
  { name: "Nexperia", shortCode: "NEX", website: "https://www.nexperia.com", categories: ["Discretes", "Logic", "MOSFETs"], prefixes: ["PMBT", "PBSS", "PSMN", "BUK7", "PHP", "PMV", "PMZ"] },
  { name: "Littelfuse", shortCode: "LFUSE", website: "https://www.littelfuse.com", categories: ["Protection", "Fuses", "Sensors"], prefixes: ["0251", "0452", "0453", "MF-R", "NANO2", "SMF", "SRP"] },
  { name: "Panasonic", shortCode: "PAN", website: "https://www.panasonic.com", categories: ["Capacitors", "Resistors", "Sensors"], prefixes: ["ERA", "ERJ", "EEE", "EEH", "ECQ", "ELJ", "EVQP", "AQY"] },
  { name: "Toshiba", shortCode: "TOSH", website: "https://toshiba.semicon-storage.com", categories: ["MOSFETs", "Logic", "Storage"], prefixes: ["TLP", "TPC", "TPH", "TPW", "TK", "TC74"] },
  { name: "Murata Manufacturing", shortCode: "MUR", website: "https://www.murata.com", categories: ["Capacitors", "Inductors", "Filters"], prefixes: ["GRM", "GCM", "LQH", "LQM", "BLM", "NFM", "DLP"] },
  { name: "TDK Corporation", shortCode: "TDK", website: "https://www.tdk.com", categories: ["Capacitors", "Inductors", "Ferrites"], prefixes: ["CGA", "CLQ", "MLK", "MPZ", "NLV", "SLF", "ACM", "MMZ"] },
  { name: "Yageo", shortCode: "YAG", website: "https://www.yageo.com", categories: ["Resistors", "Capacitors", "Inductors"], prefixes: ["RC0402", "RC0603", "RC0805", "RC1206", "RT0402", "CC0402", "CC0603", "CC0805"] },
  { name: "Samsung Electro-Mechanics", shortCode: "SEMCO", website: "https://www.samsungsem.com", categories: ["MLCCs", "Inductors"], prefixes: ["CL05", "CL10", "CL21", "CL31"] },
  { name: "Kemet", shortCode: "KEM", website: "https://www.kemet.com", categories: ["Capacitors"], prefixes: ["T491", "T495", "R82", "PHE"] },
  { name: "Nichicon", shortCode: "NCH", website: "https://www.nichicon.co.jp", categories: ["Electrolytic Capacitors"], prefixes: ["UCW", "UCD", "UKW", "UFW", "UPW"] },
  { name: "Taiyo Yuden", shortCode: "TY", website: "https://www.ty-top.com", categories: ["MLCCs", "Inductors", "Wireless"], prefixes: ["JMK", "EMK", "TMK", "HMK", "AMK"] },
  { name: "AVX (Kyocera AVX)", shortCode: "AVX", website: "https://www.kyocera-avx.com", categories: ["Capacitors", "Connectors"], prefixes: ["TAJB", "TAJA", "TMJE"] },
  { name: "Wurth Elektronik", shortCode: "WE", website: "https://www.we-online.com", categories: ["Inductors", "Connectors", "EMC"], prefixes: ["744", "748", "742", "749"] },
  { name: "Coilcraft", shortCode: "CLS", website: "https://www.coilcraft.com", categories: ["Inductors", "Transformers"], prefixes: ["XAL", "XFL", "SER", "DO3", "DO4"] },
  { name: "Bourns", shortCode: "BRN", website: "https://www.bourns.com", categories: ["Resistors", "Inductors", "Potentiometers"], prefixes: ["SRF", "SRP", "SDR", "SRR", "3296", "3362"] },
  { name: "KOA Speer", shortCode: "KOA", website: "https://www.koaspeer.com", categories: ["Resistors"], prefixes: ["RK73", "SG73", "RN73"] },
  { name: "Epson Electronics", shortCode: "EPS", website: "https://www5.epsondevice.com", categories: ["Crystals", "Oscillators"], prefixes: ["FA-", "FC-", "TSX-", "SG-8"] },
  { name: "Abracon", shortCode: "ABR", website: "https://abracon.com", categories: ["Crystals", "Oscillators", "Antennas"], prefixes: ["ABM3", "ABM8", "ABS06", "ASDM", "ASFL"] },
  { name: "ams OSRAM", shortCode: "AMS", website: "https://ams-osram.com", categories: ["Sensors", "Lighting", "Optical"], prefixes: ["AS702", "AS703", "TSL25", "TMD26", "TCS3", "SFH"] },
  { name: "Bosch Sensortec", shortCode: "BOSCH", website: "https://www.bosch-sensortec.com", categories: ["MEMS Sensors"], prefixes: ["BMI160", "BMI270", "BMG250", "BMA456", "BME280", "BME680", "BMP3", "BMP5"] },
  { name: "Allegro MicroSystems", shortCode: "ALG", website: "https://www.allegromicro.com", categories: ["Sensors", "Motor Drivers"], prefixes: ["ACS7", "ACS9", "A1301", "A1302", "A3901", "A4950", "A4988"] },
  { name: "Melexis", shortCode: "MLX", website: "https://www.melexis.com", categories: ["Sensors", "Automotive"], prefixes: ["MLX9006", "MLX9014", "MLX9024", "MLX9026"] },
  { name: "Sensirion", shortCode: "SENS", website: "https://www.sensirion.com", categories: ["Sensors", "Environmental"], prefixes: ["SHT3", "SHT4", "SCD4", "SGP4", "SPS30"] },
  { name: "TE Connectivity", shortCode: "TE", website: "https://www.te.com", categories: ["Connectors", "Sensors", "Relays"], prefixes: ["282", "640", "1825", "1734"] },
  { name: "Molex", shortCode: "MOL", website: "https://www.molex.com", categories: ["Connectors", "Cables"], prefixes: ["22-", "43-", "50-", "51-", "53-", "87-"] },
  { name: "Amphenol", shortCode: "APH", website: "https://www.amphenol.com", categories: ["Connectors", "RF", "Fiber"], prefixes: ["MUSB", "MAMF"] },
  { name: "Hirose Electric", shortCode: "HRS", website: "https://www.hirose.com", categories: ["Connectors"], prefixes: ["DF12", "DF13", "FH12", "FH26", "FX6", "FX10", "UX60"] },
  { name: "JST", shortCode: "JST", website: "https://www.jst.com", categories: ["Connectors"], prefixes: ["PHR", "XAP", "ZHR", "BM02", "BM03"] },
  { name: "Samtec", shortCode: "SAM", website: "https://www.samtec.com", categories: ["Connectors", "RF"], prefixes: ["TSM-", "TMM-", "FTSH-", "QSH-"] },
  { name: "Phoenix Contact", shortCode: "PHX", website: "https://www.phoenixcontact.com", categories: ["Terminal Blocks", "Connectors"], prefixes: ["MSTB", "PTFIX"] },
  { name: "Omron", shortCode: "OMR", website: "https://www.omron.com", categories: ["Relays", "Switches", "Sensors"], prefixes: ["G2R", "G3MB", "G5V", "G6K", "G8", "D2F", "B3F"] },
  { name: "Alps Alpine", shortCode: "ALPS", website: "https://www.alpsalpine.com", categories: ["Switches", "Encoders", "Sensors"], prefixes: ["SKHH", "SKQY", "RK09", "RK16", "EC11"] },
  { name: "Semtech", shortCode: "SMTC", website: "https://www.semtech.com", categories: ["LoRa", "ESD Protection", "Wireless"], prefixes: ["SX1272", "SX1276", "SX1278", "SX1280", "SX9", "LC03"] },
  { name: "Monolithic Power Systems", shortCode: "MPS", website: "https://www.monolithicpower.com", categories: ["Power ICs"], prefixes: ["MP2", "MP3", "MP4", "MP5", "MP6", "MP8", "MP9"] },
  { name: "FTDI", shortCode: "FTDI", website: "https://www.ftdichip.com", categories: ["USB", "Interface"], prefixes: ["FT232", "FT2232", "FT4232", "FT231", "FT813"] },
  { name: "WCH (Nanjing Qinheng)", shortCode: "WCH", website: "https://www.wch.cn", categories: ["USB", "Interface"], prefixes: ["CH340", "CH341", "CH552", "CH554", "CH32"] },
  { name: "u-blox", shortCode: "UBLX", website: "https://www.u-blox.com", categories: ["GNSS", "Cellular", "WiFi"], prefixes: ["NEO-M", "NEO-F", "MAX-M", "SAM-M", "NINA-W", "SARA-R"] },
  { name: "Quectel", shortCode: "QUEC", website: "https://www.quectel.com", categories: ["Cellular Modules", "GNSS"], prefixes: ["EC21", "EC25", "BG95", "BC66", "M66", "L76"] },
  { name: "Winbond", shortCode: "WB", website: "https://www.winbond.com", categories: ["Memory", "Flash"], prefixes: ["W25Q128", "W25Q64", "W25Q32", "W25Q16", "W25Q80"] },
  { name: "GigaDevice", shortCode: "GD", website: "https://www.gigadevice.com", categories: ["Flash", "MCU"], prefixes: ["GD25Q", "GD32F", "GD32E"] },
  { name: "Lattice Semiconductor", shortCode: "LSCC", website: "https://www.latticesemi.com", categories: ["FPGAs", "PLDs"], prefixes: ["LCMX", "LFE5", "ICE40"] },
  { name: "MEAN WELL", shortCode: "MW", website: "https://www.meanwell.com", categories: ["Power Supplies"], prefixes: ["NES-", "RS-", "LPV-", "HLG-", "ELG-", "DDR-"] },
  { name: "Isabellenhütte", shortCode: "ISH", website: "https://www.isabellenhuette.de", categories: ["Shunt Resistors"], prefixes: ["BVS", "IVT", "BVR", "PBV"] },
  { name: "Wurth Elektronik EMC", shortCode: "WE-EMC", website: "https://www.we-online.com", categories: ["Ferrites", "EMC"], prefixes: ["742792", "7427922", "742792", "74279"] },
  { name: "Epcos (TDK)", shortCode: "EPC", website: "https://www.tdk.com/epcos", categories: ["Varistors", "Capacitors"], prefixes: ["B3720", "B72210", "B72214", "B57"] },
  { name: "Eaton Bussmann", shortCode: "EAT", website: "https://www.eaton.com/bussmann", categories: ["Fuses"], prefixes: ["AGC-", "BK-", "MDL-", "GMD-"] },
  { name: "Skyworks Solutions", shortCode: "SWKS", website: "https://www.skyworksinc.com", categories: ["RF", "Wireless"], prefixes: ["SKY65", "SKY13", "SE258", "SE2435"] },
  { name: "Qorvo", shortCode: "QRVO", website: "https://www.qorvo.com", categories: ["RF", "Wireless", "Filters"], prefixes: ["RF2", "TQP3", "QPL9", "QPA9"] },
  { name: "Allegro MicroSystems", shortCode: "ALG2", website: "https://www.allegromicro.com", categories: ["Hall Effect"], prefixes: ["ACS712", "ACS714", "ACS758"] },
  { name: "GCT (Global Connector Technology)", shortCode: "GCT", website: "https://gct.co", categories: ["Connectors", "USB"], prefixes: ["USB4", "USB3", "USB1105", "USB1135"] },
  { name: "CUI Inc", shortCode: "CUI", website: "https://www.cuidevices.com", categories: ["Power", "Connectors", "Encoders"], prefixes: ["PDQ", "PDMD", "AMT10", "AMT21"] },
  { name: "Cree (Wolfspeed)", shortCode: "CREE", website: "https://www.wolfspeed.com", categories: ["LEDs", "SiC Power"], prefixes: ["XPEBWT", "XPGBWT", "C4D", "C3M"] },
  { name: "Realtek", shortCode: "RTK", website: "https://www.realtek.com", categories: ["Networking", "Audio"], prefixes: ["RTL8139", "RTL8169", "RTL8211", "ALC892"] },
  { name: "Knowles Acoustics", shortCode: "KNW", website: "https://www.knowles.com", categories: ["Microphones", "Audio"], prefixes: ["SPH8878", "SPM0", "SPK"] },
  { name: "TT Electronics", shortCode: "TTE", website: "https://www.ttelectronics.com", categories: ["Resistors", "Sensors"], prefixes: ["OPB990", "OPB900", "OP550"] },
];

function localLookup(orderCode) {
  if (!orderCode) return null;
  const code = orderCode.trim().toUpperCase();
  const matches = [];

  for (const mfr of LOCAL_DB) {
    for (const prefix of mfr.prefixes) {
      if (code.startsWith(prefix.toUpperCase())) {
        matches.push({ ...mfr, mpn: orderCode, source: "local-db", confidence: "low" });
        break;
      }
    }
  }

  return matches.length > 0 ? matches : null;
}

// ─────────────────────────────────────────────────────────────────
// Distributor links
// ─────────────────────────────────────────────────────────────────
function distributorLinks(orderCode) {
  const encoded = encodeURIComponent(orderCode);
  return {
    digikey: `https://www.digikey.com/en/products/result?keywords=${encoded}`,
    mouser: `https://www.mouser.com/c/?q=${encoded}`,
    lcsc: `https://www.lcsc.com/search?q=${encoded}`,
    arrow: `https://www.arrow.com/en/products/search?q=${encoded}`,
    octopart: `https://octopart.com/search?q=${encoded}`,
  };
}

// ─────────────────────────────────────────────────────────────────
// MAIN orchestrator
// ─────────────────────────────────────────────────────────────────
async function identifyManufacturer(orderCode) {
  if (!orderCode || orderCode.trim().length < 2) {
    return { success: false, error: "Invalid order code", orderCode };
  }

  const cleanCode = orderCode.trim();
  console.log(`\n[Search] "${cleanCode}"`);
  console.log(`[APIs] Mouser:${MOUSER_API_KEY ? "✓" : "✗ NO KEY"} | DigiKey:${DIGIKEY_CLIENT_ID ? "✓" : "✗ NO KEY"} | LCSC:✓`);

  // Run all live lookups in parallel
  const [mouserRes, digikeyRes, lcscRes] = await Promise.allSettled([
    searchMouserAPI(cleanCode),
    searchDigiKeyAPI(cleanCode),
    searchLCSC(cleanCode),
  ]);

  const liveResults = [
    ...(mouserRes.status === "fulfilled" && mouserRes.value ? mouserRes.value : []),
    ...(digikeyRes.status === "fulfilled" && digikeyRes.value ? digikeyRes.value : []),
    ...(lcscRes.status === "fulfilled" && lcscRes.value ? lcscRes.value : []),
  ];

  console.log(`[Live] ${liveResults.length} results found`);
  liveResults.forEach((r) => console.log(`  → ${r.manufacturer} via ${r.source} [${r.confidence}]`));

  let primaryMfr = null;
  let alternateMfrs = [];
  let dataSource = "none";

  if (liveResults.length > 0) {
    const consolidated = consolidateResults(liveResults);
    if (consolidated?.primary) {
      primaryMfr = {
        name: consolidated.primary.name,
        mpn: consolidated.primary.mpn,
        description: consolidated.primary.description,
        verifiedBy: [...new Set(consolidated.primary.sources)],
      };
      alternateMfrs = consolidated.alternates.map((a) => ({
        name: a.name,
        mpn: a.mpn,
        description: a.description,
        verifiedBy: [...new Set(a.sources)],
      }));
      dataSource = "live";
    }
  }

  // Only use local DB if ALL live sources returned nothing
  if (!primaryMfr) {
    console.log("[Fallback] Using local prefix database");
    const localMatches = localLookup(cleanCode);
    if (localMatches?.length > 0) {
      const first = localMatches[0];
      primaryMfr = {
        name: first.name,
        shortCode: first.shortCode,
        website: first.website,
        categories: first.categories,
        mpn: cleanCode,
        description: "",
        verifiedBy: ["local-prefix-db"],
      };
      alternateMfrs = localMatches.slice(1).map((m) => ({
        name: m.name,
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
      message: !MOUSER_API_KEY && !DIGIKEY_CLIENT_ID
        ? "No live API keys configured. Add MOUSER_API_KEY in Railway Variables for accurate results. See /health for setup instructions."
        : "Part not found in any database. Try checking distributor links.",
      distributorLinks: distributorLinks(cleanCode),
      dataSource: "none",
      apiStatus: {
        mouser: MOUSER_API_KEY ? "active" : "missing key",
        digikey: DIGIKEY_CLIENT_ID ? "active" : "missing key",
        lcsc: "active",
      },
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
    note: dataSource === "live"
      ? `Verified via live distributor data.`
      : `⚠ From local prefix DB only. For accuracy, add MOUSER_API_KEY env var in Railway. Sign up free at mouser.com/api-search/`,
    apiStatus: {
      mouser: MOUSER_API_KEY ? "active" : "missing — add MOUSER_API_KEY in Railway Variables",
      digikey: DIGIKEY_CLIENT_ID ? "active" : "missing — add DIGIKEY_CLIENT_ID + DIGIKEY_CLIENT_SECRET in Railway Variables",
      lcsc: "active (no key needed)",
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// OpenAPI Spec
// ─────────────────────────────────────────────────────────────────
const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: {
    title: "Electronic Parts Manufacturer API",
    description: "Identifies manufacturer from electronic component order code using Mouser, DigiKey and LCSC live data.",
    version: "4.0.0",
  },
  paths: {
    "/search": {
      get: {
        operationId: "searchByOrderCode",
        summary: "Identify manufacturer from part number",
        parameters: [{ name: "orderCode", in: "query", required: true, schema: { type: "string" }, description: "Part number e.g. STM32F103C8T6" }],
        responses: { 200: { description: "Result" } },
      },
      post: {
        operationId: "searchByOrderCodePost",
        summary: "Identify manufacturer (POST)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { orderCode: { type: "string" } }, required: ["orderCode"] } } } },
        responses: { 200: { description: "Result" } },
      },
    },
    "/health": { get: { operationId: "healthCheck", summary: "Health check", responses: { 200: { description: "OK" } } } },
  },
};

// ─────────────────────────────────────────────────────────────────
// HTTP Server
// ─────────────────────────────────────────────────────────────────
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer(async (req, res) => {
  setCORS(res);
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  if (path === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "ok", version: "4.0.0",
      apis: {
        mouser: MOUSER_API_KEY ? "✓ configured" : "✗ missing MOUSER_API_KEY — get free key at mouser.com/api-search/",
        digikey: DIGIKEY_CLIENT_ID ? "✓ configured" : "✗ missing DIGIKEY_CLIENT_ID + DIGIKEY_CLIENT_SECRET — get free key at developer.digikey.com",
        lcsc: "✓ active (no key needed)",
        localDb: `✓ ${LOCAL_DB.length} manufacturers`,
      },
      setup: "Add environment variables in Railway → your project → Variables tab",
      time: new Date().toISOString(),
    }, null, 2));
    return;
  }

  if (path === "/openapi.json") { res.writeHead(200); res.end(JSON.stringify(OPENAPI_SPEC, null, 2)); return; }

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
      } catch (_) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON body" })); return; }
    }

    if (!orderCode) { res.writeHead(400); res.end(JSON.stringify({ error: "Missing orderCode parameter" })); return; }

    try {
      const result = await identifyManufacturer(orderCode);
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("Error:", err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal error", message: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found", endpoints: ["/search?orderCode=STM32F103C8T6", "/health", "/openapi.json"] }));
});

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   Electronic Parts Manufacturer API v4.0     ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`\n Port: ${PORT}`);
  console.log(` Mouser API:  ${MOUSER_API_KEY ? "✓ Configured" : "✗ Missing — add MOUSER_API_KEY"}`);
  console.log(` DigiKey API: ${DIGIKEY_CLIENT_ID ? "✓ Configured" : "✗ Missing — add DIGIKEY_CLIENT_ID + DIGIKEY_CLIENT_SECRET"}`);
  console.log(` LCSC API:    ✓ Active (no key needed)`);
  console.log(` Local DB:    ✓ ${LOCAL_DB.length} manufacturers\n`);

  if (!MOUSER_API_KEY) {
    console.log(` HOW TO GET MOUSER KEY (free, 2 min):`);
    console.log(`   1. Go to https://www.mouser.com/api-search/`);
    console.log(`   2. Sign in or create free account`);
    console.log(`   3. Click "Sign Up" for Search API`);
    console.log(`   4. Copy the API key`);
    console.log(`   5. In Railway → your project → Variables → Add MOUSER_API_KEY\n`);
  }
  if (!DIGIKEY_CLIENT_ID) {
    console.log(` HOW TO GET DIGIKEY KEY (free, 5 min):`);
    console.log(`   1. Go to https://developer.digikey.com/get_started`);
    console.log(`   2. Create free account → Create Organization → Add App`);
    console.log(`   3. Copy Client ID and Client Secret`);
    console.log(`   4. In Railway → Variables → Add DIGIKEY_CLIENT_ID + DIGIKEY_CLIENT_SECRET\n`);
  }
});