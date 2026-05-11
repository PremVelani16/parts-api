/**
 * Electronic Parts Manufacturer Search API
 * Comprehensive database — 400+ manufacturers
 * Zero dependencies — just Node.js built-ins
 *
 * Run:  node parts-api.js
 * Port: 3000  (override with PORT env var)
 */

const http = require("http");
const url  = require("url");

const MANUFACTURERS = {

  // ── 3M ─────────────────────────────────────────────────────
  THREEM: {
    name: "3M Electronics", shortCode: "3M", website: "https://www.3m.com",
    categories: ["Adhesives", "Connectors", "EMI Shielding", "Cables"],
    prefixes: ["3M", "SJ", "8810", "8910", "1181", "1182", "1183", "1350", "1600"],
  },

  // ── SEMICONDUCTORS & ICs ───────────────────────────────────
  TI: {
    name: "Texas Instruments", shortCode: "TI", website: "https://www.ti.com",
    categories: ["ICs", "Analog", "MCUs", "Power Management"],
    prefixes: ["TMS", "LM", "TL", "SN", "CD", "AM", "TPS", "TPA", "TCA", "TDA", "BQ", "OPA", "INA", "REF", "DAC", "ADC", "MSP", "LMR", "LMV", "LMC", "LMH", "LMT", "LMX", "LMP", "LMK", "TLV", "TLC", "TLD", "TPD", "TPL", "UCC", "UC", "DRV", "ISO"],
  },
  ST: {
    name: "STMicroelectronics", shortCode: "ST", website: "https://www.st.com",
    categories: ["MCUs", "Power", "MEMS", "Motor Control"],
    prefixes: ["STM", "STE", "STL", "STG", "STP", "STD", "STW", "L4", "L6", "L7", "L9", "VN", "VNH", "TS", "TSB", "TSC", "TSV", "M24", "M25", "M35", "M45", "M95", "LD", "LDF", "BTA", "BTB", "Z01"],
  },
  NXP: {
    name: "NXP Semiconductors", shortCode: "NXP", website: "https://www.nxp.com",
    categories: ["MCUs", "RF", "Security", "Automotive"],
    prefixes: ["MK", "MPC", "LPC", "PCA", "PCF", "TJA", "S32", "SE", "SC", "SA", "PTN", "MFRC", "NTAG"],
  },
  MICROCHIP: {
    name: "Microchip Technology", shortCode: "MCHP", website: "https://www.microchip.com",
    categories: ["MCUs", "Memory", "Analog", "Networking"],
    prefixes: ["PIC32", "PIC24", "PIC18", "PIC16", "PIC12", "PIC10", "PIC", "AVR", "SAM", "ATMEGA", "ATTINY", "ATXMEGA", "AT90", "AT32", "MCP", "SST", "KSZ", "LAN", "ENC", "dsPIC", "DSPIC"],
  },
  INFINEON: {
    name: "Infineon Technologies", shortCode: "IFX", website: "https://www.infineon.com",
    categories: ["Power", "Automotive", "Security", "RF"],
    prefixes: ["IRF", "IRL", "IRFR", "IRFS", "IRFP", "IRFB", "IPB", "IPD", "IPP", "IPI", "BSC", "BSS", "BSP", "BTN", "BTS", "TLE", "TLF", "SLB", "SLI", "SLE", "XMC", "CY", "CYPD", "CYW"],
  },
  RENESAS: {
    name: "Renesas Electronics", shortCode: "REN", website: "https://www.renesas.com",
    categories: ["MCUs", "MPUs", "Automotive", "Industrial"],
    prefixes: ["RX", "RA", "RE", "RL", "R5F", "R7FA", "R9A", "ISL", "IDT", "HIP", "EL", "X9", "ZL", "DA1", "DA2", "DA7", "SLG"],
  },
  ADI: {
    name: "Analog Devices", shortCode: "ADI", website: "https://www.analog.com",
    categories: ["Data Converters", "Amplifiers", "RF", "Power"],
    prefixes: ["ADSP", "ADP", "ADM", "ADG", "ADA", "ADXL", "ADXRS", "LTC", "LTM", "LT1", "LT2", "LT3", "LT4", "LT6", "LT8", "LTL", "LTP", "ADuM", "ADUM", "TMC"],
  },
  AD_PREFIX: {
    name: "Analog Devices (AD-series)", shortCode: "ADI", website: "https://www.analog.com",
    categories: ["Data Converters", "Amplifiers"],
    prefixes: ["AD5", "AD6", "AD7", "AD8", "AD9"],
  },
  MAXIM: {
    name: "Maxim Integrated (ADI)", shortCode: "MAXIM", website: "https://www.maximintegrated.com",
    categories: ["Analog", "Power", "Interface", "Sensors"],
    prefixes: ["MAX", "DS"],
    note: "Acquired by Analog Devices",
  },
  ON: {
    name: "onsemi (ON Semiconductor)", shortCode: "ON", website: "https://www.onsemi.com",
    categories: ["Power", "Automotive", "Image Sensors"],
    prefixes: ["NCP", "NCV", "NCS", "NCE", "NCT", "NB", "FAN", "FDS", "FDC", "FDD", "FDG", "FDN", "FDT", "FDV", "MBR", "BCX", "MMBT", "MMBF", "MC33", "MC34", "MC78", "MC79"],
  },
  NORDIC: {
    name: "Nordic Semiconductor", shortCode: "NORDIC", website: "https://www.nordicsemi.com",
    categories: ["BLE", "Zigbee", "UWB", "WiFi"],
    prefixes: ["NRF52", "NRF53", "NRF91", "NRF70", "NRF24", "nRF"],
  },
  ESPRESSIF: {
    name: "Espressif Systems", shortCode: "ESP", website: "https://www.espressif.com",
    categories: ["WiFi", "Bluetooth", "IoT MCUs"],
    prefixes: ["ESP32", "ESP8266", "ESP8285", "ESP-"],
  },
  BROADCOM: {
    name: "Broadcom Inc.", shortCode: "AVGO", website: "https://www.broadcom.com",
    categories: ["Networking", "Storage", "Wireless", "Optocouplers"],
    prefixes: ["BCM", "ACPL", "HCPL", "AFBR", "MGA", "BRCM", "AFCT"],
  },
  SILICON_LABS: {
    name: "Silicon Laboratories", shortCode: "SLAB", website: "https://www.silabs.com",
    categories: ["MCUs", "Wireless", "Timing", "IoT"],
    prefixes: ["EFM32", "EFM8", "EFR32", "SI86", "SI84", "SI82", "CP21", "CP22", "C8051"],
  },
  MONOLITHIC: {
    name: "Monolithic Power Systems", shortCode: "MPS", website: "https://www.monolithicpower.com",
    categories: ["Power Management", "LED Drivers", "Motor Drivers"],
    prefixes: ["MP", "MPQ", "MPF", "MPM", "MPZ"],
  },
  SEMTECH: {
    name: "Semtech Corporation", shortCode: "SMTC", website: "https://www.semtech.com",
    categories: ["LoRa", "Protection ICs", "Timing", "Wireless"],
    prefixes: ["SX12", "SX13", "SX14", "SX15", "SX16", "SX17", "RClamp", "RCLAMP"],
  },
  RICHTEK: {
    name: "Richtek Technology", shortCode: "RT", website: "https://www.richtek.com",
    categories: ["Power Management", "LED Drivers"],
    prefixes: ["RT96", "RT97", "RT98", "RT84", "RT85", "RT86", "RT70", "RT71", "RT72", "RT73", "RT74", "RT75"],
  },
  TOREX: {
    name: "Torex Semiconductor", shortCode: "TRX", website: "https://www.torexsemi.com",
    categories: ["LDO", "DC-DC", "Voltage Detectors"],
    prefixes: ["XC6", "XC9", "XC2", "XC3", "XC4", "XC5"],
  },
  ROHM: {
    name: "ROHM Semiconductor", shortCode: "ROHM", website: "https://www.rohm.com",
    categories: ["Power ICs", "Diodes", "MOSFETs", "Sensors"],
    prefixes: ["BD", "BA", "BH", "BM", "BR", "BU", "BV", "BW", "RB", "RF", "RN", "RP", "RQ", "RR", "RV", "RZ", "SCS", "SCT"],
  },
  DIODES_INC: {
    name: "Diodes Incorporated", shortCode: "DI", website: "https://www.diodes.com",
    categories: ["Diodes", "MOSFETs", "Power", "Logic"],
    prefixes: ["ZXMN", "ZXMP", "ZXTN", "ZXTP", "DMN", "DMP", "DTC", "DTA", "DTB", "AP", "AL", "AZ", "PAM", "PI"],
  },
  NEXPERIA: {
    name: "Nexperia", shortCode: "NEX", website: "https://www.nexperia.com",
    categories: ["Discretes", "Logic", "MOSFETs", "ESD"],
    prefixes: ["74AHC", "74HC", "74HCT", "74LVC", "74LVCH", "74AUP", "BAS", "BAT", "BAV", "BAW", "BAP", "BGA", "BUK", "PMV", "PMBT", "PMBF"],
  },
  LITTELFUSE: {
    name: "Littelfuse Inc.", shortCode: "LF", website: "https://www.littelfuse.com",
    categories: ["TVS Diodes", "Fuses", "MOSFETs", "Protection"],
    prefixes: ["SMAJ", "SMBJ", "SMCJ", "P6KE", "P6SMB", "1.5KE", "TVSA", "TVSB", "TVSC", "5KP", "IXFN", "IXFK", "IXFH", "IXFR", "IXFT", "IXGF", "IXGH"],
  },
  MCC: {
    name: "MCC (Micro Commercial Components)", shortCode: "MCC", website: "https://www.mccsemi.com",
    categories: ["Diodes", "Transistors", "MOSFETs", "TVS"],
    prefixes: ["MCSH", "MCSM", "MCSB", "MCS"],
  },
  TAIWAN_SEMI: {
    name: "Taiwan Semiconductor", shortCode: "TSC", website: "https://www.taiwansemi.com",
    categories: ["Diodes", "Transistors", "Rectifiers", "TVS"],
    prefixes: ["TSM", "TSP", "TSS"],
  },
  MICROSEMI: {
    name: "Microsemi (Microchip)", shortCode: "MSCC", website: "https://www.microsemi.com",
    categories: ["Power Semiconductors", "RF", "Space Grade"],
    prefixes: ["APT", "APTGT", "JANTX", "JANTXV"],
    note: "Acquired by Microchip",
  },
  IXYS: {
    name: "IXYS (Littelfuse)", shortCode: "IXYS", website: "https://www.littelfuse.com",
    categories: ["Power MOSFETs", "IGBTs", "Thyristors"],
    prefixes: ["IXFB", "IXFP", "IXFA", "IXGK", "IXGN", "IXGP", "IXGQ"],
    note: "Acquired by Littelfuse",
  },
  CENTRAL_SEMI: {
    name: "Central Semiconductor", shortCode: "CSC", website: "https://www.centralsemi.com",
    categories: ["Transistors", "Diodes", "MOSFETs"],
    prefixes: ["CMBT", "CMBF", "CMHZ", "CMSH", "CMSZ", "CMDSH"],
  },
  FAIRCHILD: {
    name: "Fairchild Semiconductor (onsemi)", shortCode: "FSC", website: "https://www.onsemi.com",
    categories: ["MOSFETs", "IGBTs", "Logic", "Discretes"],
    prefixes: ["FQP", "FQD", "FQI", "FQL", "FQU", "FQB", "FQN", "FDW", "FDB", "BSS"],
    note: "Acquired by onsemi",
  },
  ALPHA_OMEGA: {
    name: "Alpha & Omega Semiconductor", shortCode: "AOS", website: "https://www.aosmd.com",
    categories: ["MOSFETs", "Power ICs", "ESD"],
    prefixes: ["AON", "AOP", "AOD", "AOR", "AOZ", "AOB", "AOL", "AOW", "AOF", "AOS"],
  },
  POWER_INT: {
    name: "Power Integrations", shortCode: "POWI", website: "https://www.power.com",
    categories: ["AC-DC Converters", "Gate Drivers"],
    prefixes: ["TOP", "LNK", "DPA", "HiperPFS", "HiperLCS", "TNY", "EcoSmart"],
  },
  UNITRODE: {
    name: "Unitrode (Texas Instruments)", shortCode: "UC", website: "https://www.ti.com",
    categories: ["PWM Controllers", "Power Management"],
    prefixes: ["UC1", "UC2", "UC3"],
    note: "Acquired by Texas Instruments",
  },
  INTERNATIONAL_RECT: {
    name: "International Rectifier (Infineon)", shortCode: "IR", website: "https://www.infineon.com",
    categories: ["MOSFETs", "IGBTs", "Gate Drivers"],
    prefixes: ["IRGB", "IRGP", "IRGR", "IRGS", "IRGT", "IRGU", "IRFSL", "IRFST", "IRFSU"],
    note: "Acquired by Infineon",
  },
  FREESCALE: {
    name: "Freescale Semiconductor (NXP)", shortCode: "FSL", website: "https://www.nxp.com",
    categories: ["MCUs", "MPUs", "Automotive"],
    prefixes: ["MK2", "MK3", "MK4", "MK5", "MK6", "MK7", "MPC5", "MPC8"],
    note: "Acquired by NXP",
  },
  LATTICE: {
    name: "Lattice Semiconductor", shortCode: "LSCC", website: "https://www.latticesemi.com",
    categories: ["FPGAs", "CPLDs", "Programmable Logic"],
    prefixes: ["ICE40", "ECP5", "MachXO", "LCMX", "LFEC", "LFSC", "LPTM", "iCE"],
  },
  XILINX: {
    name: "Xilinx (AMD)", shortCode: "XLNX", website: "https://www.xilinx.com",
    categories: ["FPGAs", "SoCs", "Programmable Logic"],
    prefixes: ["XC7", "XC6", "XC5", "XC4", "XC3", "XC2", "XCKU", "XCVU", "XCZU", "XCZUEV", "XCAU"],
    note: "Acquired by AMD",
  },
  AMD: {
    name: "AMD (Advanced Micro Devices)", shortCode: "AMD", website: "https://www.amd.com",
    categories: ["CPUs", "GPUs", "FPGAs"],
    prefixes: ["AM4", "AM5", "EPYC", "Ryzen", "Radeon"],
  },
  INTEL: {
    name: "Intel Corporation", shortCode: "INTC", website: "https://www.intel.com",
    categories: ["CPUs", "FPGAs", "Networking"],
    prefixes: ["FPGA", "Cyclone", "Stratix", "Arria", "Core i", "Xeon"],
  },
  ZILOG: {
    name: "Zilog (Littelfuse)", shortCode: "ZLG", website: "https://www.zilog.com",
    categories: ["MCUs", "Z80"],
    prefixes: ["Z80", "Z8F", "Z8L", "Z16F", "Z32F", "EZ80", "ZNEO"],
    note: "Acquired by Littelfuse",
  },
  WINBOND: {
    name: "Winbond Electronics", shortCode: "WB", website: "https://www.winbond.com",
    categories: ["Flash Memory", "SRAM", "DRAM"],
    prefixes: ["W25", "W27", "W29", "W74", "W78", "W83", "W9"],
  },
  ISSI: {
    name: "ISSI (Integrated Silicon Solution)", shortCode: "ISSI", website: "https://www.issi.com",
    categories: ["SRAM", "DRAM", "Flash", "LED Drivers"],
    prefixes: ["IS25", "IS62", "IS61", "IS42", "IS43", "IS45", "IS66", "IS31"],
  },
  MACRONIX: {
    name: "Macronix International", shortCode: "MX", website: "https://www.macronix.com",
    categories: ["NOR Flash", "NAND Flash"],
    prefixes: ["MX25", "MX66", "MX29", "MX30"],
  },
  MICRON: {
    name: "Micron Technology", shortCode: "MU", website: "https://www.micron.com",
    categories: ["DRAM", "Flash", "SSDs"],
    prefixes: ["MT4", "MT8", "MT16", "MT18", "MT25", "MT29", "MT40", "MT41", "MT47", "MT48", "MT52", "MT53"],
  },
  CYPRESS_MEM: {
    name: "Cypress (Infineon)", shortCode: "CY", website: "https://www.infineon.com",
    categories: ["SRAM", "F-RAM", "nvSRAM", "USB"],
    prefixes: ["CY62", "CY7C", "CY14", "FM24", "FM25", "CY15"],
    note: "Acquired by Infineon",
  },
  ALLIANCE_MEM: {
    name: "Alliance Memory", shortCode: "ALM", website: "https://www.alliancememory.com",
    categories: ["SRAM", "DRAM", "Flash"],
    prefixes: ["AS6C", "AS7C", "AS4C", "AS5C"],
  },
  ADESTO: {
    name: "Adesto Technologies (Renesas)", shortCode: "ADST", website: "https://www.renesas.com",
    categories: ["Flash Memory", "EEPROM"],
    prefixes: ["AT45", "AT25", "RM24", "RM25"],
    note: "Acquired by Renesas",
  },
  ATMEL: {
    name: "Atmel (Microchip)", shortCode: "ATM", website: "https://www.microchip.com",
    categories: ["MCUs", "Security ICs", "Memory"],
    prefixes: ["ATSHA", "ATECC", "AT88", "AT24", "AT93", "AT25D"],
    note: "Acquired by Microchip",
  },
  EVERSPIN: {
    name: "Everspin Technologies", shortCode: "MRAM", website: "https://www.everspin.com",
    categories: ["MRAM", "Non-volatile Memory"],
    prefixes: ["MR0", "MR1", "MR2", "MR4", "EMR", "EV"],
  },
  MICREL: {
    name: "Micrel (Microchip)", shortCode: "MIC", website: "https://www.microchip.com",
    categories: ["Analog", "Ethernet", "Timing"],
    prefixes: ["MIC28", "MIC29", "MIC37", "MIC39", "MIC4", "MIC5", "MIC6", "MIC7", "KSZ", "SY"],
    note: "Acquired by Microchip",
  },
  SIPEX: {
    name: "Sipex Corporation (MaxLinear)", shortCode: "SPX", website: "https://www.maxlinear.com",
    categories: ["Analog ICs", "RS-232/485"],
    prefixes: ["SP30", "SP48", "SP49", "SPX"],
    note: "Acquired by MaxLinear",
  },
  EXAR: {
    name: "Exar Corporation (MaxLinear)", shortCode: "EXAR", website: "https://www.maxlinear.com",
    categories: ["RS-232", "RS-485", "UART", "Power"],
    prefixes: ["XR", "XRA", "SP33", "SP34", "SP35"],
    note: "Acquired by MaxLinear",
  },
  SMSC: {
    name: "SMSC / Standard Microsystems (Microchip)", shortCode: "SMSC", website: "https://www.microchip.com",
    categories: ["USB", "Ethernet", "CAN"],
    prefixes: ["LAN7", "LAN8", "LAN9", "USB23", "USB32", "KSZ"],
    note: "Acquired by Microchip",
  },
  FTDI: {
    name: "FTDI (Future Technology Devices)", shortCode: "FTDI", website: "https://www.ftdichip.com",
    categories: ["USB-to-UART", "USB ICs"],
    prefixes: ["FT232", "FT230", "FT234", "FT240", "FT245", "FT260", "FT312", "FT600", "FT601"],
  },
  WCH: {
    name: "WCH (Nanjing Qinheng)", shortCode: "WCH", website: "https://www.wch.cn",
    categories: ["USB ICs", "MCUs"],
    prefixes: ["CH340", "CH341", "CH343", "CH344", "CH347", "CH32"],
  },
  WIZNET: {
    name: "WIZnet", shortCode: "WIZ", website: "https://www.wiznet.io",
    categories: ["Ethernet ICs", "TCP/IP Offload"],
    prefixes: ["W5500", "W5300", "W5200", "W5100", "W6100", "WIZ"],
  },
  QUALCOMM: {
    name: "Qualcomm / Atheros", shortCode: "QCOM", website: "https://www.qualcomm.com",
    categories: ["WiFi", "Cellular", "Bluetooth"],
    prefixes: ["QCA", "AR93", "AR92", "AR91", "AR81", "IPQ", "MDM", "MSM", "SDM"],
  },
  QUECTEL: {
    name: "Quectel Wireless", shortCode: "QCT", website: "https://www.quectel.com",
    categories: ["Cellular Modules", "GNSS", "WiFi Modules"],
    prefixes: ["EC2", "EC4", "EC6", "EC8", "BG9", "BG7", "MC6", "MC8", "RM5", "RM4", "SC2"],
  },
  SIMCOM: {
    name: "SIMCom Wireless", shortCode: "SIM", website: "https://www.simcom.com",
    categories: ["Cellular Modules", "GPS"],
    prefixes: ["SIM7", "SIM8", "SIM9", "SIM5", "SIM3", "SIM2", "SIM1"],
  },
  UBLOX: {
    name: "u-blox", shortCode: "UBX", website: "https://www.u-blox.com",
    categories: ["GNSS", "Cellular", "WiFi", "Bluetooth"],
    prefixes: ["NEO", "MAX", "ZED", "SAM", "EVA", "LEA", "ANN", "UBX", "SARA", "LARA", "LEXI", "NORA", "NINA"],
  },
  MARVELL: {
    name: "Marvell Technology", shortCode: "MRVL", website: "https://www.marvell.com",
    categories: ["Networking", "Storage", "Processors"],
    prefixes: ["MV", "88E", "88F", "88W", "88Q", "88X", "88H"],
  },
  QORVO: {
    name: "Qorvo", shortCode: "QRV", website: "https://www.qorvo.com",
    categories: ["RF Amplifiers", "Filters", "Switches"],
    prefixes: ["RF", "QPF", "QPD", "QPB", "QPA", "TQP", "TQM", "TQF", "RFFM"],
  },
  SKYWORKS: {
    name: "Skyworks Solutions", shortCode: "SKY", website: "https://www.skyworksinc.com",
    categories: ["RF ICs", "Amplifiers", "Switches", "Filters"],
    prefixes: ["SKY", "SE2", "SE5", "SFE", "SGL", "SHF", "SID"],
  },
  EM_MICRO: {
    name: "EM Microelectronic-Marin", shortCode: "EM", website: "https://www.emmicroelectronic.com",
    categories: ["Ultra-Low Power ICs", "RFID", "Sensors"],
    prefixes: ["EM3", "EM4", "EM6", "EM9", "EM23", "EM24", "EM35", "EM38"],
  },
  MICRONAS: {
    name: "Micronas (TDK)", shortCode: "MIC", website: "https://www.micronas.com",
    categories: ["Hall Sensors", "Motor Controllers"],
    prefixes: ["HAL", "HAS", "HAB", "HAF"],
    note: "Part of TDK",
  },
  SG_MICRO: {
    name: "SG Micro Corp", shortCode: "SGM", website: "https://www.sg-micro.com",
    categories: ["Power Management", "Op-Amps", "Logic"],
    prefixes: ["SGM", "SGM2", "SGM3", "SGM6", "SGM8"],
  },
  NOVOSENSE: {
    name: "Novosense Microelectronics", shortCode: "NS", website: "https://www.novosns.com",
    categories: ["Sensors", "Isolation ICs", "CAN"],
    prefixes: ["NSi", "NSm", "NSe"],
  },
  SITIME: {
    name: "SiTime Corporation", shortCode: "SIT", website: "https://www.sitime.com",
    categories: ["MEMS Oscillators", "TCXOs", "OCXOs"],
    prefixes: ["SIT1", "SIT2", "SIT3", "SIT5", "SIT8", "SIT9"],
  },
  BURR_BROWN: {
    name: "Burr-Brown (Texas Instruments)", shortCode: "BB", website: "https://www.ti.com",
    categories: ["Op-Amps", "DACs", "ADCs"],
    prefixes: ["OPA", "PCM", "PGA", "INA"],
    note: "Acquired by Texas Instruments",
  },
  HARRIS: {
    name: "Harris Semiconductor (Intersil/Renesas)", shortCode: "HRS", website: "https://www.renesas.com",
    categories: ["Linear ICs", "Power"],
    prefixes: ["HA", "HC", "HI", "HV", "HFA", "HI5"],
    note: "Now part of Renesas",
  },
  NSC: {
    name: "National Semiconductor (Texas Instruments)", shortCode: "NSC", website: "https://www.ti.com",
    categories: ["Analog", "Logic", "Power"],
    prefixes: ["LM3", "LM4", "LM5", "LM6", "LM7", "LM8", "LM9", "LMD", "LP"],
    note: "Acquired by Texas Instruments",
  },
  DALLAS: {
    name: "Dallas Semiconductor (Maxim/ADI)", shortCode: "DS", website: "https://www.analog.com",
    categories: ["RTC", "1-Wire", "Memory"],
    prefixes: ["DS1", "DS2", "DS3", "DS4", "DS7"],
    note: "Acquired by Maxim, now ADI",
  },
  SUPERTEX: {
    name: "Supertex (Microchip)", shortCode: "STX", website: "https://www.microchip.com",
    categories: ["HV MOSFETs", "LED Drivers", "Ultrasound"],
    prefixes: ["HV", "TC6", "TC7", "TC9", "MD14"],
    note: "Acquired by Microchip",
  },
  XICOR: {
    name: "Xicor (Intersil/Renesas)", shortCode: "XIC", website: "https://www.renesas.com",
    categories: ["EEPROM", "Potentiometers"],
    prefixes: ["X92", "X93", "X94", "X95", "X96", "X97", "X98"],
    note: "Acquired by Intersil, now Renesas",
  },
  RAMTRON: {
    name: "Ramtron (Cypress/Infineon)", shortCode: "RAM", website: "https://www.infineon.com",
    categories: ["F-RAM", "Non-volatile Memory"],
    prefixes: ["FM25", "FM22", "VRS"],
    note: "Acquired by Cypress, now Infineon",
  },

  // ── PASSIVE COMPONENTS ─────────────────────────────────────
  MURATA: {
    name: "Murata Manufacturing", shortCode: "MUR", website: "https://www.murata.com",
    categories: ["Capacitors", "Inductors", "Filters", "Sensors"],
    prefixes: ["GRM", "GCM", "GCJ", "GCD", "LQM", "LQH", "LQW", "LQG", "LQP", "BLM", "BLA", "BLE", "BLJ", "BLK", "NFM", "NFA", "DFE", "CSTCE", "CSTCR", "SFECF"],
  },
  TDK: {
    name: "TDK Corporation", shortCode: "TDK", website: "https://www.tdk.com",
    categories: ["Inductors", "Capacitors", "Sensors", "Magnetics"],
    prefixes: ["C3225", "C2012", "C1608", "MLZ", "MLG", "MLP", "SLF", "SLR", "SPM", "B82", "B57", "B58", "B59", "EPCOS", "B3292", "B3251"],
  },
  YAGEO: {
    name: "Yageo Corporation", shortCode: "YAG", website: "https://www.yageo.com",
    categories: ["Resistors", "Capacitors", "Inductors"],
    prefixes: ["RC0", "RC1", "RC2", "AC0", "AC1", "CC0", "CC1", "TC0", "TC1", "PE0", "RT0", "RL0", "FMP", "FPF", "SQP"],
  },
  VISHAY: {
    name: "Vishay Intertechnology", shortCode: "VSH", website: "https://www.vishay.com",
    categories: ["Resistors", "Capacitors", "Diodes", "Optocouplers"],
    prefixes: ["CRCW", "WSL", "WSLP", "TNPW", "DALE", "VS", "VO", "IL", "SFH", "BYV", "BYW", "BYT", "BZX", "BZT", "UF", "GS", "MBRS", "MBRB", "BAT4", "TSOP", "TCRT", "CNY"],
  },
  PANASONIC: {
    name: "Panasonic", shortCode: "PAN", website: "https://industry.panasonic.com",
    categories: ["Capacitors", "Resistors", "Inductors", "Relays"],
    prefixes: ["ERJ", "ECA", "ECQ", "EEE", "EEH", "EEU", "EEV", "EEW", "EEF", "ECW", "ECS", "ELJ", "ELL", "AGQ", "ALQ", "DS", "TX", "TQ", "EVQ", "ESE"],
  },
  SAMSUNG_EM: {
    name: "Samsung Electro-Mechanics", shortCode: "SEMCO", website: "https://www.samsungsem.com",
    categories: ["MLCCs", "Inductors", "PCBs"],
    prefixes: ["CL0", "CL1", "CL2", "CL3", "CL4", "CL5", "CI2", "CI3", "CM3", "KLMBG"],
  },
  KOA: {
    name: "KOA Speer Electronics", shortCode: "KOA", website: "https://www.koaspeer.com",
    categories: ["Resistors", "Sensors"],
    prefixes: ["RK73", "RN73", "SG73", "TK73", "MF1", "MF2", "SR73", "WU73", "UR73"],
  },
  BOURNS: {
    name: "Bourns Inc.", shortCode: "BRN", website: "https://www.bourns.com",
    categories: ["Resistors", "Inductors", "Potentiometers", "TVS", "Fuses"],
    prefixes: ["CR", "CRL", "CAT", "CAY", "CAZ", "SRF", "SRR", "SRU", "SRB", "SRC", "SRD", "SM", "3296", "3386", "3590", "CDNBS", "CDSOD", "CG0", "CG1", "MF-R", "MF-S"],
  },
  SUSUMU: {
    name: "Susumu Co.", shortCode: "SUS", website: "https://www.susumu.co.jp",
    categories: ["Thin Film Resistors"],
    prefixes: ["RG", "RR", "PRL", "PHC"],
  },
  STACKPOLE: {
    name: "Stackpole Electronics", shortCode: "SEI", website: "https://www.seielect.com",
    categories: ["Resistors"],
    prefixes: ["RMCF", "RNCP", "RMCP", "CSR", "CSRN", "HPSC", "HVCB"],
  },
  OHMITE: {
    name: "Ohmite Manufacturing", shortCode: "OHM", website: "https://www.ohmite.com",
    categories: ["Power Resistors", "Wirewound"],
    prefixes: ["OX", "OY", "RW"],
  },
  WELWYN: {
    name: "Welwyn Components (TT Electronics)", shortCode: "WEL", website: "https://www.ttelectronics.com",
    categories: ["Resistors", "Sensors"],
    prefixes: ["WA", "WC", "WH", "SM", "W21"],
  },
  RIEDON: {
    name: "Riedon Inc.", shortCode: "RID", website: "https://www.riedon.com",
    categories: ["Power Resistors", "Shunts"],
    prefixes: ["HS", "HB", "FW", "HTE", "UB", "ULT", "USF"],
  },
  ROYALOHM: {
    name: "Royal Ohm", shortCode: "ROH", website: "https://www.royalohm.com",
    categories: ["Resistors"],
    prefixes: ["WR", "PR", "CR", "MF"],
  },
  WALSIN: {
    name: "Walsin Technology", shortCode: "WTS", website: "https://www.walsin.com",
    categories: ["Resistors", "Capacitors", "Inductors"],
    prefixes: ["WR", "WC", "WI"],
  },
  NIC_COMP: {
    name: "NIC Components Corp", shortCode: "NIC", website: "https://www.niccomp.com",
    categories: ["Resistors", "Capacitors", "Inductors"],
    prefixes: ["NRSF", "NRSE", "NRSD", "NCR", "NMC", "NML", "NICS"],
  },
  RADIOHM: {
    name: "Radiohm", shortCode: "RAD", website: "https://www.radiohm.com",
    categories: ["Resistors", "Potentiometers"],
    prefixes: ["CA", "CO", "CP", "CR", "JK"],
  },
  VENKEL: {
    name: "Venkel Ltd.", shortCode: "VNK", website: "https://www.venkel.com",
    categories: ["Resistors", "Capacitors", "Inductors"],
    prefixes: ["CR", "CA", "CD", "CI", "CH"],
  },
  IRC: {
    name: "IRC / TT Electronics", shortCode: "IRC", website: "https://www.ttelectronics.com",
    categories: ["Resistors", "Sensors"],
    prefixes: ["IRC", "LRC", "OAR", "PWR"],
  },

  // ── CAPACITORS ─────────────────────────────────────────────
  KEMET: {
    name: "KEMET Electronics", shortCode: "KEM", website: "https://www.kemet.com",
    categories: ["Capacitors", "EMI Filters", "Inductors"],
    prefixes: ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "PHE", "ESR", "ESD", "ALS", "A700", "A750", "A760", "FK", "FKS", "FKP", "MKP", "R82", "R46", "R76"],
  },
  TAIYO_YUDEN: {
    name: "Taiyo Yuden", shortCode: "TY", website: "https://www.ty-top.com",
    categories: ["MLCCs", "Inductors", "Bluetooth Modules"],
    prefixes: ["UMK", "UMJ", "UMZ", "TMK", "EMK", "JMK", "LMK", "HMK", "PMK", "NMK", "CMK", "AMK", "BMK", "DMK", "EYGA", "BWMDA"],
  },
  AVX: {
    name: "Kyocera AVX", shortCode: "AVX", website: "https://www.kyocera-avx.com",
    categories: ["Capacitors", "Connectors", "Filters"],
    prefixes: ["AHA", "SR", "TAJ", "TPS", "TPSD", "TPSB", "TPSA", "TPSC", "TCJ", "TCN", "TPC", "SQCB", "SQCS", "SQCZ"],
  },
  NICHICON: {
    name: "Nichicon Corporation", shortCode: "NCH", website: "https://www.nichicon.co.jp",
    categories: ["Electrolytic Capacitors", "Film Capacitors"],
    prefixes: ["UCA", "UCB", "UCG", "UCJ", "UCK", "UCL", "UCM", "UCN", "UCO", "UCP", "UCQ", "UCR", "UCS", "UCT", "UCU", "UCV", "UHE", "UHW", "UHB", "UPL", "UPW"],
  },
  RUBYCON: {
    name: "Rubycon Corporation", shortCode: "RBY", website: "https://www.rubycon.co.jp",
    categories: ["Electrolytic Capacitors"],
    prefixes: ["ZLH", "ZLJ", "ZL", "MBZ", "MCZ", "MDZ", "MFZ", "MXZ", "YXF", "YXG", "PX", "PXF", "VXR"],
  },
  NIPPON_CHEMI_CON: {
    name: "Nippon Chemi-Con (United Chemi-Con)", shortCode: "NCC", website: "https://www.chemi-con.co.jp",
    categories: ["Electrolytic Capacitors", "Inductors", "Varistors"],
    prefixes: ["EGPD", "EGPA", "EGPB", "EGPC", "EGPE", "EGPF", "EGPH", "EGPJ", "EGPK", "EGPL", "TND", "LDFX", "LDFW", "LKKA", "SME", "SMF", "SMG"],
  },
  ELNA: {
    name: "Elna Co.", shortCode: "ELNA", website: "https://www.elna.co.jp",
    categories: ["Electrolytic Capacitors", "Film Capacitors"],
    prefixes: ["RJ", "RA", "RC", "RE", "RF", "RG", "RJE", "RHE", "RVE", "RVR", "RVZ"],
  },
  LELON: {
    name: "Lelon Electronics", shortCode: "LEL", website: "https://www.lelon.com.tw",
    categories: ["Electrolytic Capacitors"],
    prefixes: ["REA", "REC", "REH", "REJ", "REL", "REM", "REN", "REP", "REQ", "RER", "RES", "RET"],
  },
  SAMWHA: {
    name: "Samwha Capacitor", shortCode: "SWH", website: "https://www.samwha.com",
    categories: ["Electrolytic Capacitors"],
    prefixes: ["CA", "CB", "CD", "CE", "RD", "SC", "SD", "WB"],
  },
  CORNELL_DUBILIER: {
    name: "Cornell Dubilier Electronics", shortCode: "CDE", website: "https://www.cde.com",
    categories: ["Film Capacitors", "Electrolytic", "Mica"],
    prefixes: ["940C", "942C", "944C", "946C", "947C", "948C", "SLPX"],
  },
  WIMA: {
    name: "WIMA GmbH", shortCode: "WIMA", website: "https://www.wima.de",
    categories: ["Film Capacitors"],
    prefixes: ["MKS", "MKP", "MKC", "FKP", "FKS", "FKC", "MFP"],
  },
  EUROFARAD: {
    name: "Eurofarad", shortCode: "EFD", website: "https://www.eurofarad.eu",
    categories: ["Film Capacitors", "Power Capacitors"],
    prefixes: ["MKP", "MKT", "PEI"],
  },
  KNOWLES: {
    name: "Knowles Corporation", shortCode: "KNW", website: "https://www.knowlescapacitors.com",
    categories: ["RF Capacitors", "MEMS Microphones"],
    prefixes: ["B37", "B38", "B40", "B45", "MCH", "SPM", "SPU", "SPH"],
  },
  CALCHIP: {
    name: "CalChip Electronics", shortCode: "CLC", website: "https://www.calchip.com",
    categories: ["Capacitors", "Specialty Passives"],
    prefixes: ["GMC", "GMX", "CHV", "GHQ", "GUQ", "GMG", "GMT", "HTC", "GML", "CTC", "FTC", "FTF"],
  },
  HOLY_STONE: {
    name: "Holy Stone Enterprise", shortCode: "HS", website: "https://www.holystone.com.tw",
    categories: ["MLCCs", "Ceramic Capacitors"],
    prefixes: ["HK", "HL", "HM", "HN", "HP", "HQ", "HR"],
  },
  HITANO: {
    name: "Hitano Enterprise", shortCode: "HIT", website: "https://www.hitano.com",
    categories: ["Electrolytic Capacitors", "Film Capacitors"],
    prefixes: ["HV", "HF", "HR"],
  },
  FROLYT: {
    name: "Frolyt Kondensatoren", shortCode: "FRL", website: "https://www.frolyt.de",
    categories: ["Electrolytic Capacitors"],
    prefixes: ["CA", "CB", "DE", "E1", "E2", "E3", "E4"],
  },
  ROEDERSTEIN: {
    name: "Roederstein (KEMET)", shortCode: "ROE", website: "https://www.kemet.com",
    categories: ["Film Capacitors", "Electrolytic"],
    prefixes: ["EKS", "EKR", "EKE", "EKW", "EKZ"],
    note: "Acquired by KEMET",
  },
  BC_COMP: {
    name: "BC Components (Vishay)", shortCode: "BCC", website: "https://www.vishay.com",
    categories: ["Capacitors", "Resistors"],
    prefixes: ["224", "225", "226", "MPT", "BC"],
    note: "Now part of Vishay",
  },

  // ── INDUCTORS & MAGNETICS ──────────────────────────────────
  WURTH: {
    name: "Würth Elektronik", shortCode: "WE", website: "https://www.we-online.com",
    categories: ["Inductors", "Transformers", "Connectors", "EMC"],
    prefixes: ["744", "748", "749", "750", "760", "763", "764", "765", "820", "885", "890"],
  },
  COILCRAFT: {
    name: "Coilcraft Inc.", shortCode: "CCL", website: "https://www.coilcraft.com",
    categories: ["Inductors", "Transformers", "RF Inductors"],
    prefixes: ["XAL", "XGL", "XFL", "XFN", "XEL", "SER", "SRF", "MSS", "MSD", "LPS", "LPO", "LPR", "LPC", "LPD", "LPE", "DOC", "WBC"],
  },
  PULSE: {
    name: "Pulse Electronics", shortCode: "PLS", website: "https://www.pulseelectronics.com",
    categories: ["Inductors", "Transformers", "Network Magnetics"],
    prefixes: ["PE", "PA", "PB", "HX", "TX", "PM", "PH"],
  },
  SUMIDA: {
    name: "Sumida Corporation", shortCode: "SUM", website: "https://www.sumida.com",
    categories: ["Inductors", "Transformers"],
    prefixes: ["CDRH", "CDRR", "CDRT", "CDR", "MHVA", "CR32", "CR43", "CR54"],
  },
  FASTRON: {
    name: "Fastron GmbH", shortCode: "FAT", website: "https://www.fastrongroup.com",
    categories: ["Inductors", "Chokes", "Transformers"],
    prefixes: ["MESC", "MESC-", "MEC", "SH", "ML", "MCCK"],
  },
  TALEMA: {
    name: "Talema Electronic", shortCode: "TLM", website: "https://www.talema.com",
    categories: ["Transformers", "Inductors", "Current Sensors"],
    prefixes: ["AC", "AP", "AS", "ASM", "AN"],
  },
  MIDCOM: {
    name: "Midcom Inc. (Würth)", shortCode: "MDC", website: "https://www.we-online.com",
    categories: ["Transformers", "Inductors", "Telecom"],
    prefixes: ["750", "851", "852", "854"],
    note: "Acquired by Würth Elektronik",
  },
  API_DELEVAN: {
    name: "API Delevan", shortCode: "API", website: "https://www.apidelevan.com",
    categories: ["Inductors", "RF Chokes"],
    prefixes: ["A-", "B-", "C-", "AF", "CF", "BF"],
  },
  TRIAD_MAG: {
    name: "Triad Magnetics", shortCode: "TRI", website: "https://www.triadmagnetics.com",
    categories: ["Transformers", "Inductors", "Chokes"],
    prefixes: ["VPP", "VPS", "VPT", "F", "W", "D"],
  },
  FAIR_RITE: {
    name: "Fair-Rite Products", shortCode: "FRP", website: "https://www.fair-rite.com",
    categories: ["Ferrites", "EMI Suppression", "Inductors"],
    prefixes: ["0431", "2643", "2661", "2677", "5943", "5961", "FRP"],
  },
  FEROXCUBE: {
    name: "Ferroxcube", shortCode: "FXC", website: "https://www.ferroxcube.com",
    categories: ["Ferrite Cores", "Magnetic Materials"],
    prefixes: ["TX", "TN", "TC", "TR", "RM", "PM", "P"],
  },
  IBS_MAGNET: {
    name: "IBS Magnet", shortCode: "IBS", website: "https://www.ibs-magnet.de",
    categories: ["Magnets", "Magnetic Components"],
    prefixes: ["IBS"],
  },
  TOKO: {
    name: "Toko (TDK)", shortCode: "TOKO", website: "https://www.tdk.com",
    categories: ["Inductors", "Filters"],
    prefixes: ["A514", "A515", "A516", "A517", "A518", "TK1", "TK2", "TK3"],
    note: "Acquired by TDK",
  },
  INDUCTRON: {
    name: "Inductron", shortCode: "IDN", website: "https://www.inductron.de",
    categories: ["Custom Inductors", "Transformers"],
    prefixes: ["IDN"],
  },
  EPCOS: {
    name: "EPCOS (TDK)", shortCode: "EPC", website: "https://www.tdk.com",
    categories: ["Capacitors", "Inductors", "Filters", "Varistors"],
    prefixes: ["B3274", "B3251", "B3292", "B72", "B57", "B59", "B30", "B40", "B88"],
    note: "Part of TDK",
  },

  // ── CONNECTORS ─────────────────────────────────────────────
  MOLEX: {
    name: "Molex", shortCode: "MOL", website: "https://www.molex.com",
    categories: ["Connectors", "Cables", "Antennas"],
    prefixes: ["0022", "0039", "0430", "0701", "1053", "2004", "5055", "87831", "0015", "0016", "0050", "0051", "0090"],
  },
  TE: {
    name: "TE Connectivity", shortCode: "TE", website: "https://www.te.com",
    categories: ["Connectors", "Sensors", "Relays"],
    prefixes: ["MSTB", "1734", "AMP", "MTA", "AMPMODU", "SL", "282", "640", "770", "1375", "1469"],
  },
  AMPHENOL: {
    name: "Amphenol", shortCode: "APH", website: "https://www.amphenol.com",
    categories: ["Connectors", "Cables", "Sensors"],
    prefixes: ["SV", "FCI", "10056", "10114", "ICC", "LTSC", "RADSOK"],
  },
  JST: {
    name: "JST (Japan Solderless Terminal)", shortCode: "JST", website: "https://www.jst.com",
    categories: ["Connectors", "Terminals"],
    prefixes: ["PHR", "XHP", "ZHR", "GHR", "SHR", "EHR", "VHR", "PAR", "SMR", "CHR", "BHR", "NHR"],
  },
  HIROSE: {
    name: "Hirose Electric", shortCode: "HRS", website: "https://www.hirose.com",
    categories: ["Connectors", "Board-to-Board", "FPC/FFC"],
    prefixes: ["DF", "FH", "FX", "GT", "HR", "LE", "LX", "MQ", "MX", "PX", "QR", "ST", "ZX"],
  },
  SAMTEC: {
    name: "Samtec Inc.", shortCode: "SAM", website: "https://www.samtec.com",
    categories: ["High-Speed Connectors", "Board-to-Board"],
    prefixes: ["ESQT", "FTSH", "FTS", "FW", "HPAF", "HSEC", "SSM", "SSQ", "TFM", "TFW", "TMM", "TSM"],
  },
  HARTING: {
    name: "HARTING Technology Group", shortCode: "HAR", website: "https://www.harting.com",
    categories: ["Industrial Connectors", "D-Sub", "Ethernet"],
    prefixes: ["09", "10", "14", "15", "16", "17", "19", "21", "23", "24", "25"],
  },
  PHOENIX_CONTACT: {
    name: "Phoenix Contact", shortCode: "PHO", website: "https://www.phoenixcontact.com",
    categories: ["Terminal Blocks", "Connectors", "Relays"],
    prefixes: ["MSTB", "MSTBA", "MSTBC", "MC", "MCV", "FK", "FKC", "MKDS", "PTSA", "PTSM", "PCT"],
  },
  WAGO: {
    name: "WAGO Corporation", shortCode: "WAG", website: "https://www.wago.com",
    categories: ["Terminal Blocks", "PCB Terminals"],
    prefixes: ["231", "232", "233", "234", "235", "236", "237", "238", "250", "256", "257", "258"],
  },
  GCT: {
    name: "GCT (Global Connector Technology)", shortCode: "GCT", website: "https://gct.co",
    categories: ["USB Connectors", "Audio Connectors", "SIM", "SD"],
    prefixes: ["USB", "MEM", "SIM", "SD", "RFA", "RFB", "BG", "SF"],
  },
  CINCH: {
    name: "Cinch Connectivity Solutions", shortCode: "CIN", website: "https://www.cinch.com",
    categories: ["RF Connectors", "Coaxial", "Military"],
    prefixes: ["SMA", "SMB", "SMC", "SSMB", "TNC", "BNC", "SMP"],
  },
  WECO: {
    name: "WECO Electrical Connectors", shortCode: "WEC", website: "https://www.wecoconnectors.com",
    categories: ["PCB Connectors", "Terminal Blocks"],
    prefixes: ["4P", "AST", "ASW", "ASF"],
  },
  NORCOMP: {
    name: "Norcomp", shortCode: "NRC", website: "https://www.norcomp.net",
    categories: ["D-Sub Connectors", "RJ Connectors"],
    prefixes: ["182", "183", "185", "DBX", "DB9", "DB15", "DB25"],
  },
  DEGSON: {
    name: "Degson Electronics", shortCode: "DGS", website: "https://www.degson.com",
    categories: ["Terminal Blocks", "PCB Connectors"],
    prefixes: ["DG3", "DG4", "DG5", "DG9", "DG35", "DG308"],
  },
  CONEC: {
    name: "CONEC Elektronische Bauelemente", shortCode: "CON", website: "https://www.conec.com",
    categories: ["D-Sub Connectors", "Circular", "Industrial"],
    prefixes: ["131", "132", "133", "134", "141", "143", "16"],
  },
  HARWIN: {
    name: "Harwin plc", shortCode: "HRW", website: "https://www.harwin.com",
    categories: ["High-Reliability Connectors", "Board-to-Board"],
    prefixes: ["M22", "M30", "M50", "M80", "G70", "G125", "G8", "G9", "Gecko", "Datamate"],
  },
  SULLINS: {
    name: "Sullins Electronics", shortCode: "SUL", website: "https://www.sullinscorp.com",
    categories: ["Pin Headers", "Board-to-Board Connectors"],
    prefixes: ["SFH", "SBH", "PBC", "PBH", "PPPC", "PREC"],
  },
  MILL_MAX: {
    name: "Mill-Max Manufacturing", shortCode: "MMX", website: "https://www.mill-max.com",
    categories: ["Spring-Loaded Connectors", "IC Sockets"],
    prefixes: ["0305", "0307", "0347", "0456", "0457", "0489", "0907"],
  },
  ERNI: {
    name: "ERNI Electronics", shortCode: "ERNI", website: "https://www.erni.com",
    categories: ["Board-to-Board", "Wire-to-Board"],
    prefixes: ["284", "287", "999", "154", "232", "214"],
  },
  EPT: {
    name: "EPT GmbH", shortCode: "EPT", website: "https://www.ept.de",
    categories: ["Edge Connectors", "Board-to-Board"],
    prefixes: ["114", "308", "408", "ept"],
  },
  SOURIAU: {
    name: "Souriau (Esterline)", shortCode: "SRC", website: "https://www.souriau.com",
    categories: ["Military Connectors", "Circular Connectors", "High-Temperature"],
    prefixes: ["UTS", "UTG", "8STA", "8SFT", "TRIM"],
  },
  ODU: {
    name: "ODU - Otto Dunkel GmbH", shortCode: "ODU", website: "https://www.odu.de",
    categories: ["Circular Connectors", "Push-Pull", "Medical"],
    prefixes: ["ODU", "MEDI", "MINI"],
  },
  LEMO: {
    name: "LEMO", shortCode: "LMO", website: "https://www.lemo.com",
    categories: ["Push-Pull Connectors", "Coaxial", "Medical"],
    prefixes: ["FGA", "FGG", "EGA", "EGG", "RGA", "RGG", "PCA", "PCG"],
  },
  AB_CONN: {
    name: "AB Connectors", shortCode: "ABC", website: "https://www.abconnectors.com",
    categories: ["Military Connectors", "Circular MIL-SPEC"],
    prefixes: ["AB", "ABPE"],
  },
  TAG_CONNECT: {
    name: "Tag-Connect", shortCode: "TAG", website: "https://www.tag-connect.com",
    categories: ["Debug Connectors", "Programming Connectors"],
    prefixes: ["TC2", "TC3", "TC0"],
  },
  JAE: {
    name: "Japan Aviation Electronics (JAE)", shortCode: "JAE", website: "https://www.jae.com",
    categories: ["Board-to-Board", "FPC", "Automotive Connectors"],
    prefixes: ["IL-", "WP3", "WP6", "DD", "DX", "IX", "MX34"],
  },
  YAMAICHI: {
    name: "Yamaichi Electronics", shortCode: "YMC", website: "https://www.yamaichi.de",
    categories: ["IC Sockets", "Test Sockets", "SIM Card Connectors"],
    prefixes: ["IC5", "IC1", "YS1", "YS2", "SIM"],
  },
  GRADCONN: {
    name: "Gradconn", shortCode: "GRC", website: "https://www.gradconn.com",
    categories: ["PCB Connectors", "SMA", "U.FL"],
    prefixes: ["CA", "GRC"],
  },
  GRAYHILL: {
    name: "Grayhill Inc.", shortCode: "GHL", website: "https://www.grayhill.com",
    categories: ["Switches", "Encoders", "Connectors"],
    prefixes: ["70M", "70MBB", "61F", "61E", "96M", "96MB"],
  },
  POSITRONIC: {
    name: "Positronic Industries", shortCode: "POS", website: "https://www.connectpositronic.com",
    categories: ["High-Current Connectors", "Military", "Aerospace"],
    prefixes: ["FTB", "FTA", "SB", "GDB", "GDA"],
  },
  CINCON_CONN: {
    name: "Cincon Electronics", shortCode: "CCN", website: "https://www.cincon.com",
    categories: ["DC-DC Converters", "Power Modules"],
    prefixes: ["CHB", "CFM", "CB", "CF", "EC", "ECT"],
  },
  SWITCHCRAFT: {
    name: "Switchcraft / Conxall", shortCode: "SWC", website: "https://www.switchcraft.com",
    categories: ["Audio Connectors", "Circular Connectors", "Jacks"],
    prefixes: ["35", "42", "44", "48", "EN", "STP"],
  },

  // ── FUSES & PROTECTION ─────────────────────────────────────
  EATON: {
    name: "Eaton (Bussmann)", shortCode: "ETN", website: "https://www.eaton.com",
    categories: ["Fuses", "Circuit Breakers", "Varistors"],
    prefixes: ["BK/", "ATM", "ATC", "ATO", "AGC", "AGX", "AGU", "BAF", "ABC", "ABF", "FNM", "FRN", "KLK", "LPJ", "NON"],
  },
  SCHURTER: {
    name: "Schurter AG", shortCode: "SCH", website: "https://www.schurter.com",
    categories: ["Fuses", "Switches", "EMC Filters"],
    prefixes: ["FST", "UMT", "SMD", "OMF", "MST", "KMF"],
  },
  BELFUSE: {
    name: "Bel Fuse Inc.", shortCode: "BEL", website: "https://www.belfuse.com",
    categories: ["Fuses", "Transformers", "Magnetic Components"],
    prefixes: ["BLF", "BLN", "0ZCJ", "0ZCK", "MF-", "0685"],
  },
  WICKMANN: {
    name: "Wickmann (Littelfuse)", shortCode: "WCK", website: "https://www.littelfuse.com",
    categories: ["Fuses", "Fuse Holders"],
    prefixes: ["WK", "FSMD", "FSF"],
    note: "Acquired by Littelfuse",
  },
  MERSEN: {
    name: "Mersen (Ferraz Shawmut)", shortCode: "MSN", website: "https://www.mersen.com",
    categories: ["High-Power Fuses", "Surge Arresters"],
    prefixes: ["NH", "UK", "AJT", "CRS"],
  },
  PROTEK: {
    name: "Protek Devices", shortCode: "PTK", website: "https://www.protekdevices.com",
    categories: ["TVS", "ESD", "Gas Tubes"],
    prefixes: ["P4KE", "P6KE", "P6SMB", "P4SMB", "PSOT", "PGSOT"],
  },
  COMCHIP: {
    name: "Comchip Technology", shortCode: "CCT", website: "https://www.comchiptech.com",
    categories: ["Diodes", "TVS", "ESD", "Schottky"],
    prefixes: ["CDBM", "CDBF", "CDBU", "CDBV", "CBF", "CZRQR", "CBZ"],
  },
  DIOTEC: {
    name: "Diotec Semiconductor", shortCode: "DTC", website: "https://www.diotec.com",
    categories: ["Diodes", "Rectifiers", "Schottky", "Zener"],
    prefixes: ["1N4", "1N5", "1N6", "BY", "BZX", "BAT", "BAV", "BAS", "SF", "UF"],
  },
  WEEN_SEMI: {
    name: "WEEN Semiconductors", shortCode: "WSS", website: "https://www.ween-semi.com",
    categories: ["Discretes", "Protection"],
    prefixes: ["WS1", "WS2", "WS4", "WS6"],
  },

  // ── SENSORS ────────────────────────────────────────────────
  BOSCH: {
    name: "Bosch Sensortec", shortCode: "BST", website: "https://www.bosch-sensortec.com",
    categories: ["IMU", "Pressure", "Humidity", "Environmental"],
    prefixes: ["BMI", "BMG", "BMA", "BMP", "BME", "BHI", "BNO", "BMM", "BMX"],
  },
  INVENSENSE: {
    name: "InvenSense (TDK)", shortCode: "INV", website: "https://invensense.tdk.com",
    categories: ["IMU", "Accelerometers", "Gyroscopes", "Microphones"],
    prefixes: ["MPU", "ICM", "ICS", "IAM", "IIM", "ISM"],
    note: "Part of TDK",
  },
  HONEYWELL: {
    name: "Honeywell Sensing", shortCode: "HON", website: "https://sensing.honeywell.com",
    categories: ["Pressure", "Temperature", "Humidity", "Hall Effect"],
    prefixes: ["HIH", "HMC", "HMR", "RSCF", "MPRLS", "SS4"],
  },
  SENSIRION: {
    name: "Sensirion AG", shortCode: "SEN", website: "https://www.sensirion.com",
    categories: ["Humidity", "Temperature", "CO2", "Flow"],
    prefixes: ["SHT", "SHTW", "STS", "SDP", "SFM", "SPS", "SGP", "SLF"],
  },
  MELEXIS: {
    name: "Melexis", shortCode: "MLX", website: "https://www.melexis.com",
    categories: ["Hall Effect", "Temperature", "Magnetic", "Automotive"],
    prefixes: ["MLX9", "MLX7", "MLX8"],
  },
  ALLEGRO: {
    name: "Allegro MicroSystems", shortCode: "AMS", website: "https://www.allegromicro.com",
    categories: ["Hall Effect", "Current Sensors", "Motor Drivers"],
    prefixes: ["A13", "A14", "A15", "A16", "A17", "A18", "A19", "A11", "A12", "ACS", "APS"],
  },
  AMS_OSRAM: {
    name: "ams-OSRAM", shortCode: "AMS", website: "https://ams.com",
    categories: ["Color Sensors", "ToF", "Proximity", "Spectral"],
    prefixes: ["AS7", "AS6", "AS5", "AS4", "AS3", "AS2", "AS1", "TSL", "TMD", "TCS", "TMG"],
  },
  LEM: {
    name: "LEM International", shortCode: "LEM", website: "https://www.lem.com",
    categories: ["Current Sensors", "Voltage Transducers"],
    prefixes: ["LTS", "LF", "LA", "LTSR", "LFSR", "HAB", "HAX", "HAS"],
  },
  BETATHERM: {
    name: "BetaTherm (Measurement Specialties)", shortCode: "BET", website: "https://www.meas-spec.com",
    categories: ["NTC Thermistors", "Temperature Sensors"],
    prefixes: ["BT", "100M", "200M", "10K"],
  },
  AMETHERM: {
    name: "Ametherm", shortCode: "AMT", website: "https://www.ametherm.com",
    categories: ["NTC Thermistors", "Inrush Current Limiters"],
    prefixes: ["SL", "MS", "WH", "CL", "EL"],
  },
  RFBEAM: {
    name: "RFbeam Microwave GmbH", shortCode: "RFB", website: "https://www.rfbeam.ch",
    categories: ["Radar Sensors", "Microwave Modules"],
    prefixes: ["K-LC", "K-MC", "K-LD", "K-MD"],
  },
  ADVANCED_PHOTONIX: {
    name: "Advanced Photonix", shortCode: "APX", website: "https://www.advancedphotonix.com",
    categories: ["Photodetectors", "Light Sensors"],
    prefixes: ["PDV", "OD", "SD"],
  },
  IMI_SENSORS: {
    name: "IMI Sensors (PCB Piezotronics)", shortCode: "IMI", website: "https://www.imi-sensors.com",
    categories: ["Vibration Sensors", "Accelerometers"],
    prefixes: ["626", "622", "686", "640"],
  },
  SENSATA: {
    name: "Sensata Technologies", shortCode: "ST", website: "https://www.sensata.com",
    categories: ["Temperature", "Pressure", "Current Sensors", "Automotive"],
    prefixes: ["PT1", "PT2", "PT4", "TS", "EV"],
  },
  NVE_CORP: {
    name: "NVE Corporation", shortCode: "NVE", website: "https://www.nve.com",
    categories: ["GMR Sensors", "Spintronic Isolators"],
    prefixes: ["AA", "AB", "AC", "AD", "IL", "SM"],
  },

  // ── DISPLAYS & LIGHTING ────────────────────────────────────
  KINGBRIGHT: {
    name: "Kingbright", shortCode: "KB", website: "https://www.kingbrightusa.com",
    categories: ["LEDs", "7-Segment", "Dot Matrix"],
    prefixes: ["WP", "L-", "SA", "SB", "SC", "CA", "CB", "CC", "KA", "KB", "KC", "APT", "AM", "AC", "APA", "APG"],
  },
  LUMEX: {
    name: "Lumex Inc.", shortCode: "LMX", website: "https://www.lumex.com",
    categories: ["LEDs", "Fiber Optics", "LCD"],
    prefixes: ["SSF", "SSL", "SSI", "SSP", "SML", "SLE", "SLI", "SSH"],
  },
  CREE: {
    name: "Cree LED (CreeLED)", shortCode: "CRL", website: "https://www.cree-led.com",
    categories: ["High-Power LEDs", "COB LEDs"],
    prefixes: ["CLM", "CLA", "CLB", "XLamp", "XP", "XT", "XB", "XQ"],
  },
  OSRAM: {
    name: "OSRAM Opto Semiconductors", shortCode: "OSR", website: "https://ams.com",
    categories: ["LEDs", "Laser Diodes", "IR Emitters"],
    prefixes: ["SFH", "SFT", "SFL", "SFP", "LW", "LA", "LG", "LY", "LB", "LP", "LR", "LS", "LCW", "LRTB"],
  },
  NICHIA: {
    name: "Nichia Corporation", shortCode: "NIC", website: "https://www.nichia.co.jp",
    categories: ["LEDs", "Laser Diodes"],
    prefixes: ["NVSW", "NVSL", "NVSR", "NVSB", "NS6", "NSPW", "NSPL", "NSPB", "NSSB"],
  },
  EVERLIGHT: {
    name: "Everlight Electronics", shortCode: "EVL", website: "https://www.everlight.com",
    categories: ["LEDs", "Optocouplers", "IR Sensors"],
    prefixes: ["EL8", "ELT", "ELS", "EMI", "IR204", "IR333"],
  },
  LITEON: {
    name: "Lite-On Technology", shortCode: "LON", website: "https://www.liteon.com",
    categories: ["LEDs", "Optocouplers", "Photodetectors"],
    prefixes: ["LTL", "LTE", "LTW", "LTG", "LTR", "LTP", "LTV", "PS", "LPC"],
  },
  BIVAR: {
    name: "Bivar Inc.", shortCode: "BIV", website: "https://www.bivar.com",
    categories: ["LED Holders", "Fiber Optics", "Displays"],
    prefixes: ["CF", "EMB", "H4", "H5", "H6", "H8", "JD", "OFR", "SMF"],
  },
  DIALIGHT: {
    name: "Dialight Corporation", shortCode: "DLT", website: "https://www.dialight.com",
    categories: ["LED Indicators", "Panel Mount LEDs", "Industrial Lighting"],
    prefixes: ["598", "599", "500", "501", "5590", "5540"],
  },
  SUNLED: {
    name: "SunLED Company", shortCode: "SUN", website: "https://www.sunledusa.com",
    categories: ["SMD LEDs", "Through-Hole LEDs"],
    prefixes: ["XZM", "XZP", "XZMDK", "XZMPK", "XZFMK"],
  },
  VCC: {
    name: "VCC (Visual Communications Company)", shortCode: "VCC", website: "https://www.vcclite.com",
    categories: ["LED Indicators", "Panel Mounts", "Light Pipes"],
    prefixes: ["1091", "4090", "LFC", "SSL", "RT"],
  },
  INOLUX: {
    name: "Inolux Corporation", shortCode: "INO", website: "https://www.inolux-corp.com",
    categories: ["RGB LEDs", "SMD LEDs", "Addressable LEDs"],
    prefixes: ["IN-S", "IN-P", "IN-B", "IN-C", "IN-R"],
  },
  WOLFSPEED: {
    name: "Wolfspeed (Cree Power)", shortCode: "WS", website: "https://www.wolfspeed.com",
    categories: ["SiC MOSFETs", "SiC Diodes", "GaN"],
    prefixes: ["C3M", "C2M", "CAB", "CPW4", "CREE4D", "C4D"],
  },
  PANJIT: {
    name: "Panjit International", shortCode: "PJT", website: "https://www.panjit.com.tw",
    categories: ["Diodes", "Transistors", "MOSFETs"],
    prefixes: ["DB", "GBJ", "BR", "MB", "RS", "UF", "FR", "1N"],
  },

  // ── OPTOELECTRONICS ────────────────────────────────────────
  SHARP_OPTO: {
    name: "Sharp Microelectronics", shortCode: "SRP", website: "https://www.sharpsma.com",
    categories: ["Optocouplers", "IR Sensors", "Displays"],
    prefixes: ["PC8", "PC9", "GP1", "GP2", "LH"],
  },
  TOSHIBA_SEMI: {
    name: "Toshiba Semiconductor", shortCode: "TSB", website: "https://toshiba.semicon-storage.com",
    categories: ["Optocouplers", "MOSFETs", "Logic"],
    prefixes: ["TLP", "TLX", "TC", "TMM", "TMP"],
  },
  ISOCOM: {
    name: "Isocom Components", shortCode: "ISO", website: "https://www.isocom.com",
    categories: ["Optocouplers", "Solid State Relays"],
    prefixes: ["H11", "4N", "CNX", "ILD", "ILQ", "ILT"],
  },

  // ── CRYSTALS & OSCILLATORS ─────────────────────────────────
  ABRACON: {
    name: "Abracon LLC", shortCode: "ABR", website: "https://www.abracon.com",
    categories: ["Crystals", "Oscillators", "Inductors", "Antennas"],
    prefixes: ["ABM", "ABLS", "ABLNO", "ABMM", "ASFL", "ASDM", "ASEM", "ASVMB", "ACM"],
  },
  EPSON_TIMING: {
    name: "Seiko Epson (Crystals/Timing)", shortCode: "EPS", website: "https://www5.epsondevice.com",
    categories: ["Crystals", "Oscillators", "RTCs"],
    prefixes: ["FA", "FC", "FQ", "MA", "MB", "MC", "MF", "SG", "SH", "TG", "RX8", "RX4", "RX2", "RV3"],
  },
  IQD: {
    name: "IQD Frequency Products", shortCode: "IQD", website: "https://www.iqdfrequencyproducts.com",
    categories: ["Crystals", "Oscillators", "TCXOs", "VCXOs"],
    prefixes: ["LFXTAL", "LFSPXO", "LFTCXO", "LFVCXO", "CFPX"],
  },
  NDK: {
    name: "NDK (Nihon Dempa Kogyo)", shortCode: "NDK", website: "https://www.ndk.com",
    categories: ["Crystals", "Oscillators"],
    prefixes: ["NX3225", "NX2016", "NX1612", "NZ", "NT", "NV"],
  },
  RALTRON: {
    name: "Raltron Electronics", shortCode: "RAL", website: "https://www.raltron.com",
    categories: ["Crystals", "Oscillators", "Filters"],
    prefixes: ["AS", "R26", "R26F", "CO4", "CO5", "CO6", "E1S", "E2S"],
  },
  TXCO: {
    name: "TXC Corporation", shortCode: "TXC", website: "https://www.txccorp.com",
    categories: ["Crystals", "Oscillators"],
    prefixes: ["7X", "7M", "7B", "7V", "8Y", "9C", "9H"],
  },
  CTS: {
    name: "CTS Electronic Components", shortCode: "CTS", website: "https://www.ctscorp.com",
    categories: ["Crystals", "Oscillators", "Filters", "Sensors"],
    prefixes: ["407", "406", "CB3", "CB6", "CA-", "CX-", "MXO"],
  },
  ECS: {
    name: "ECS Inc International", shortCode: "ECS", website: "https://www.ecsxtal.com",
    categories: ["Crystals", "Oscillators", "Resonators"],
    prefixes: ["ECS-", "ECX-", "ECSMPI", "ECSMT"],
  },
  EUROQUARTZ: {
    name: "Euroquartz", shortCode: "EQZ", website: "https://www.euroquartz.co.uk",
    categories: ["Crystals", "Oscillators", "TCXOs"],
    prefixes: ["EQ", "EQX", "EQXO"],
  },
  FOX: {
    name: "Fox Electronics", shortCode: "FOX", website: "https://www.foxonline.com",
    categories: ["Crystals", "Oscillators"],
    prefixes: ["FOX", "FOXSDLF", "FXOSC", "FO7", "F4"],
  },
  MICRO_CRYSTAL: {
    name: "Micro Crystal AG (Swatch Group)", shortCode: "MC", website: "https://www.microcrystal.com",
    categories: ["Crystals", "RTCs", "Oscillators"],
    prefixes: ["CM8", "VM8", "RV3", "RV1", "RV2", "RV5", "RV-3"],
  },
  JAUCH: {
    name: "Jauch Quartz", shortCode: "JAU", website: "https://www.jauch.com",
    categories: ["Crystals", "Oscillators", "Batteries"],
    prefixes: ["Q", "JO", "JXO"],
  },
  MTRONPTI: {
    name: "Mtron PTI", shortCode: "MTP", website: "https://www.mtronpti.com",
    categories: ["TCXOs", "OCXOs", "VCXOs"],
    prefixes: ["M-", "MtronPTI"],
  },
  CRYSTEK: {
    name: "Crystek Crystals Corporation", shortCode: "CYSTEK", website: "https://www.crystek.com",
    categories: ["Crystals", "Oscillators", "VCOs"],
    prefixes: ["CCHD", "CVCXO", "CVCO", "CPRO", "CFPS", "CMOS"],
  },

  // ── SWITCHES ───────────────────────────────────────────────
  C_K: {
    name: "C&K Components", shortCode: "CK", website: "https://www.ckswitches.com",
    categories: ["Tactile", "Toggle", "Rocker Switches"],
    prefixes: ["PTS", "JS", "JM", "KG", "KMR", "PCM", "PG", "ES6", "OS", "SS"],
  },
  OMRON_SW: {
    name: "Omron Switches", shortCode: "OMR", website: "https://components.omron.com",
    categories: ["Microswitches", "Tactile", "Pushbutton"],
    prefixes: ["B3F", "B3G", "B3M", "B3P", "B3S", "B3T", "B3U", "B3W", "D2F", "D3V", "D6F"],
  },
  ALPS: {
    name: "Alps Alpine", shortCode: "ALPS", website: "https://www.alpsalpine.com",
    categories: ["Switches", "Encoders", "Potentiometers"],
    prefixes: ["SKRP", "SKRK", "SKRMAB", "SKHH", "EC", "RK", "RH", "RN"],
  },
  E_SWITCH: {
    name: "E-Switch", shortCode: "ESW", website: "https://www.e-switch.com",
    categories: ["Tactile", "Pushbutton", "Rocker"],
    prefixes: ["TL", "TW", "EG", "RP", "DM", "KS"],
  },
  APEM: {
    name: "APEM (IDC Technologies)", shortCode: "APM", website: "https://www.apem.com",
    categories: ["Industrial Switches", "Joysticks", "Keypads"],
    prefixes: ["AV", "IHR", "IP", "IM", "IS", "AHC", "C"],
  },
  NKK_SW: {
    name: "NKK Switches", shortCode: "NKK", website: "https://www.nkkswitches.com",
    categories: ["Toggle", "Pushbutton", "Rocker Switches"],
    prefixes: ["M2", "M2T", "BB", "BB15", "JB", "MB2", "S", "S-"],
  },
  MARQUARDT: {
    name: "Marquardt GmbH", shortCode: "MQT", website: "https://www.marquardt.de",
    categories: ["Switches", "Sensors", "Automotive Switches"],
    prefixes: ["1251", "1840", "1843", "3250", "3247"],
  },
  KISSLING: {
    name: "Kissling Elektrotechnik", shortCode: "KIS", website: "https://www.kissling.de",
    categories: ["Industrial Switches", "Rotary Switches"],
    prefixes: ["KIS", "01", "02", "03", "04"],
  },

  // ── RELAYS ─────────────────────────────────────────────────
  OMRON: {
    name: "Omron Corporation", shortCode: "OMR", website: "https://components.omron.com",
    categories: ["Relays", "Switches", "Sensors"],
    prefixes: ["G5V", "G6H", "G6J", "G6K", "G6L", "G6M", "G5CA", "G5CB", "G5LA", "G5LE", "G5NB", "G5PA", "G5Q", "MY", "MK", "LY"],
  },
  FINDER: {
    name: "Finder SpA", shortCode: "FND", website: "https://www.findernet.com",
    categories: ["Relays", "Timers", "Interface Modules"],
    prefixes: ["40.", "41.", "38.", "39.", "55.", "56.", "60.", "61.", "62."],
  },
  FUJITSU_RELAY: {
    name: "Fujitsu Components", shortCode: "FJS", website: "https://www.fujitsu.com",
    categories: ["Relays"],
    prefixes: ["FBR", "FTR", "FHR"],
  },
  MEDER: {
    name: "Meder Electronic (Standex-Meder)", shortCode: "MED", website: "https://www.standexelectronics.com",
    categories: ["Reed Relays", "Reed Sensors", "Hall Sensors"],
    prefixes: ["SIL", "DIL", "HE", "DIP"],
  },
  ZETTLER: {
    name: "Zettler Electronics (American Zettler)", shortCode: "ZTL", website: "https://www.azettler.com",
    categories: ["Relays", "Transformers"],
    prefixes: ["AZ", "AZ94", "AZ21", "AZ101", "AZ822"],
  },
  SCHRACK: {
    name: "Schrack (TE Connectivity)", shortCode: "SCR", website: "https://www.te.com",
    categories: ["Power Relays", "PCB Relays"],
    prefixes: ["RT", "RP", "RM", "RY", "PT"],
    note: "Part of TE Connectivity",
  },

  // ── POWER SUPPLIES & CONVERTERS ────────────────────────────
  VICOR: {
    name: "Vicor Corporation", shortCode: "VCR", website: "https://www.vicorpower.com",
    categories: ["DC-DC Converters", "Power Modules"],
    prefixes: ["VI-", "DCM", "BCM", "SAC", "PRM", "VTM", "ZVS"],
  },
  MEAN_WELL: {
    name: "MEAN WELL Enterprises", shortCode: "MWL", website: "https://www.meanwell.com",
    categories: ["Power Supplies", "LED Drivers"],
    prefixes: ["RS-", "SE-", "SD-", "DR-", "LRS-", "HLG-", "ELG-", "XLG-"],
  },
  RECOM: {
    name: "RECOM Power", shortCode: "REC", website: "https://www.recom-power.com",
    categories: ["DC-DC Converters", "AC-DC Converters"],
    prefixes: ["R-", "RP", "RS", "RK", "RH", "R05", "R1", "R2", "R3"],
  },
  TRACO: {
    name: "TRACO Power", shortCode: "TRP", website: "https://www.tracopower.com",
    categories: ["DC-DC Converters", "AC-DC Modules"],
    prefixes: ["TEN", "TDN", "TSR", "TMR", "THM", "THL", "TEL", "TDL", "TXL", "THD"],
  },
  XP_POWER: {
    name: "XP Power", shortCode: "XPP", website: "https://www.xppower.com",
    categories: ["AC-DC Converters", "DC-DC Converters"],
    prefixes: ["ECE", "ECF", "ECL", "ECM", "ECS", "JCE", "JCF", "JCL", "JCM", "JCS", "DHL", "DHB"],
  },
  GAIA: {
    name: "GAIA Converter", shortCode: "GAC", website: "https://www.gaiaconverter.com",
    categories: ["Space-Grade DC-DC Converters"],
    prefixes: ["MGDM", "MGHF", "MGDC", "MGDS"],
  },
  P_DUKE: {
    name: "P-Duke Technology", shortCode: "PDK", website: "https://www.p-duke.com",
    categories: ["DC-DC Converters", "AC-DC Converters"],
    prefixes: ["PDQ", "PDA", "MEC", "TMP", "TOF"],
  },
  MTM_POWER: {
    name: "MTM Power", shortCode: "MTM", website: "https://www.mtm-power.com",
    categories: ["DC-DC Converters", "Power Supplies"],
    prefixes: ["MTMS", "MTMD", "MTMQ"],
  },
  CUI: {
    name: "CUI Inc (Bel Fuse)", shortCode: "CUI", website: "https://www.cuidevices.com",
    categories: ["AC-DC Converters", "DC-DC Converters", "Connectors"],
    prefixes: ["SDI", "SDS", "SDP", "SDV", "VXO", "VX7", "VX1", "PJ-", "SJ-", "CP-"],
    note: "Acquired by Bel Fuse",
  },
  MORNSUN: {
    name: "Mornsun Guangzhou Science & Technology", shortCode: "MSN", website: "https://www.mornsun-power.com",
    categories: ["DC-DC Converters", "AC-DC Converters", "Isolated Converters"],
    prefixes: ["B", "F", "K", "L", "Q", "W", "URB", "WRB", "VRB"],
  },
  BLOCK: {
    name: "Block Transformatoren", shortCode: "BLK", website: "https://www.block.eu",
    categories: ["Transformers", "Power Supplies", "Chokes"],
    prefixes: ["STE", "STN", "TE6", "TE2", "SVR", "VCH"],
  },
  DELTA_ELEC: {
    name: "Delta Electronics", shortCode: "DEL", website: "https://www.deltaww.com",
    categories: ["Power Supplies", "Fans", "Converters"],
    prefixes: ["LFB", "DCP", "DAP", "PMD"],
  },
  POWERONE: {
    name: "Power-One (ABB)", shortCode: "P1", website: "https://new.abb.com",
    categories: ["Power Supplies", "DC-DC Converters"],
    prefixes: ["HB", "HBW", "RAM", "MAP", "PFC"],
    note: "Acquired by ABB",
  },

  // ── EMC & CABLE COMPONENTS ─────────────────────────────────
  SCHAFFNER: {
    name: "Schaffner Group", shortCode: "SFN", website: "https://www.schaffner.com",
    categories: ["EMI Filters", "Power Magnetics", "Chokes"],
    prefixes: ["FN", "RN", "SN", "EN", "BN"],
  },
  LAIRD: {
    name: "Laird Connectivity", shortCode: "LAI", website: "https://www.lairdconnect.com",
    categories: ["WiFi", "Bluetooth", "EMC", "Antennas"],
    prefixes: ["BL5", "BL6", "WB5", "WB6", "HH", "HC", "28B"],
  },
  FAIR_RITE_EMC: {
    name: "Fair-Rite (EMC Products)", shortCode: "FRP", website: "https://www.fair-rite.com",
    categories: ["Ferrite Beads", "Cable Cores", "EMI Suppression"],
    prefixes: ["0431", "2643", "2661", "2677", "5943"],
  },
  STEWARD: {
    name: "Laird/Steward Inc.", shortCode: "STW", website: "https://www.laird.com",
    categories: ["EMC Ferrite Products", "Chip Beads"],
    prefixes: ["HI", "LI", "MI", "SI"],
  },
  BELDEN: {
    name: "Belden Inc.", shortCode: "BLD", website: "https://www.belden.com",
    categories: ["Cables", "Connectors", "Networking"],
    prefixes: ["9", "1", "8", "7", "Y", "Z"],
  },
  TELEGAERTNER: {
    name: "Telegärtner", shortCode: "TLG", website: "https://www.telegaertner.com",
    categories: ["RF Connectors", "Cables", "Network Connectors"],
    prefixes: ["J01", "J15", "J01150", "J01070", "J01440"],
  },
  ROSENBERGER: {
    name: "Rosenberger", shortCode: "RSB", website: "https://www.rosenberger.de",
    categories: ["RF Connectors", "Fiber Optic", "High-Frequency"],
    prefixes: ["32", "17", "40", "65", "00"],
  },
  HUBER_SUHNER: {
    name: "HUBER+SUHNER", shortCode: "HSU", website: "https://www.hubersuhner.com",
    categories: ["RF Connectors", "Cables", "Fiber Optics"],
    prefixes: ["22", "82", "11", "65", "SMA", "SMB"],
  },

  // ── BATTERIES & ENERGY STORAGE ─────────────────────────────
  RENATA: {
    name: "Renata SA (Swatch Group)", shortCode: "RNT", website: "https://www.renata.com",
    categories: ["Coin Cell Batteries", "Lithium Batteries"],
    prefixes: ["CR", "SR", "BR", "MS", "CA"],
  },
  TADIRAN: {
    name: "Tadiran Batteries", shortCode: "TAD", website: "https://www.tadiranbat.com",
    categories: ["Lithium Batteries", "Bobbin Cells"],
    prefixes: ["TL", "SL", "ER"],
  },
  RAYOVAC: {
    name: "Rayovac (Spectrum Brands)", shortCode: "RYV", website: "https://www.rayovac.com",
    categories: ["Consumer Batteries"],
    prefixes: ["RYV", "RP", "RH"],
  },
  MAXWELL: {
    name: "Maxwell Technologies (Tesla)", shortCode: "MXW", website: "https://www.maxwell.com",
    categories: ["Ultracapacitors", "Energy Storage"],
    prefixes: ["BCAP", "PC5", "HC"],
    note: "Acquired by Tesla",
  },

  // ── THERMAL MANAGEMENT ─────────────────────────────────────
  AAVID: {
    name: "Aavid Thermalloy (Boyd)", shortCode: "AVD", website: "https://www.boydcorp.com",
    categories: ["Heatsinks", "Thermal Interface Materials"],
    prefixes: ["5801", "5821", "4101", "4110", "CSHL", "CHA"],
    note: "Part of Boyd Corporation",
  },
  BERGQUIST: {
    name: "Bergquist (Henkel)", shortCode: "BGQ", website: "https://www.henkel.com",
    categories: ["Thermal Interface Materials", "Insulation"],
    prefixes: ["GP", "GP3000", "GP5000", "TP"],
    note: "Acquired by Henkel",
  },
  BOYD: {
    name: "Boyd Corporation", shortCode: "BYD", website: "https://www.boydcorp.com",
    categories: ["Heatsinks", "Thermal Management", "EMI Shielding"],
    prefixes: ["BRD"],
  },
  KITAGAWA: {
    name: "Kitagawa Industries America", shortCode: "KGA", website: "https://www.kitagawa-ind.com",
    categories: ["EMI Shielding", "Grounding", "Spacers"],
    prefixes: ["SA", "FBS", "BCS", "SCO", "SPC"],
  },
  CHOMERICS: {
    name: "Chomerics (Parker)", shortCode: "CHO", website: "https://chomerics.com",
    categories: ["EMI Gaskets", "Thermal Interface Materials"],
    prefixes: ["CHO-SEAL", "SOFT-SHIELD", "THERMATTACH"],
  },

  // ── AUDIO ──────────────────────────────────────────────────
  CIRRUS: {
    name: "Cirrus Logic", shortCode: "CRL", website: "https://www.cirrus.com",
    categories: ["Audio ADC/DAC", "Codecs", "Amplifiers"],
    prefixes: ["CS4", "CS5", "WM8", "WM9"],
  },

  // ── ISOLATION ──────────────────────────────────────────────
  ADI_ISO: {
    name: "Analog Devices Isolators (iCoupler)", shortCode: "ADI", website: "https://www.analog.com",
    categories: ["Digital Isolators", "isoPower"],
    prefixes: ["ADuM1", "ADuM2", "ADuM3", "ADuM4", "ADuM5", "ADuM6"],
  },

  // ── INTERFACE & COMMUNICATION ──────────────────────────────
  MAXLINEAR: {
    name: "MaxLinear (Exar)", shortCode: "MXL", website: "https://www.maxlinear.com",
    categories: ["RS-232", "RS-485", "UART", "CAN", "Broadband"],
    prefixes: ["SP3", "SP4", "SP5", "SP6", "SP7", "SP8", "XR", "XRA"],
  },
  HALO: {
    name: "Halo Electronics", shortCode: "HAL", website: "https://www.haloelectronics.com",
    categories: ["Network Magnetics", "Transformers", "PoE"],
    prefixes: ["HFJ", "HFM", "HND", "TG", "SI-", "F"],
  },
  BEL_POWER_SIGNAL: {
    name: "Bel Signal Transformers", shortCode: "BEL", website: "https://www.belfuse.com",
    categories: ["Network Magnetics", "Signal Transformers"],
    prefixes: ["0826", "0878", "S558", "T60"],
  },
  SEMIKRON: {
    name: "Semikron International", shortCode: "SMK", website: "https://www.semikron.com",
    categories: ["Power Modules", "IGBTs", "Rectifiers", "Inverters"],
    prefixes: ["SKM", "SKD", "SKCH", "SKIIP", "SKKD", "MDD", "MDS", "SKB", "SKN"],
  },
  VINCOTECH: {
    name: "Vincotech GmbH", shortCode: "VCT", website: "https://www.vincotech.com",
    categories: ["Power Modules", "IGBT Modules"],
    prefixes: ["FCO", "FCT", "FCA", "FCB", "0MCA"],
  },

  // ── PROGRAMMABLE LOGIC ─────────────────────────────────────
  ALTERA: {
    name: "Altera (Intel)", shortCode: "ALT", website: "https://www.intel.com",
    categories: ["FPGAs", "CPLDs"],
    prefixes: ["EP1", "EP2", "EP3", "EP4", "EP9", "5A", "5M", "10M", "10A"],
    note: "Acquired by Intel",
  },
  ACTEL: {
    name: "Actel (Microsemi/Microchip)", shortCode: "ACT", website: "https://www.microsemi.com",
    categories: ["FPGAs", "Radiation-Hardened"],
    prefixes: ["A3P", "A2F", "RT3P", "RTAX", "RTG"],
    note: "Acquired by Microsemi, now Microchip",
  },

  // ── MISC SEMICONDUCTOR ─────────────────────────────────────
  AGAGILENT: {
    name: "Agilent Technologies (Keysight)", shortCode: "AGIL", website: "https://www.keysight.com",
    categories: ["Optocouplers", "Test Equipment"],
    prefixes: ["HCPL", "HCNR", "HLMP", "HDSP"],
    note: "Now Keysight Technologies",
  },
  AVAGO: {
    name: "Avago Technologies (Broadcom)", shortCode: "AVGO", website: "https://www.broadcom.com",
    categories: ["Optocouplers", "RF", "Fiber Optics"],
    prefixes: ["ACPL", "HCPL", "AFBR", "MGA", "ALT"],
    note: "Merged into Broadcom",
  },

  // ── MECHANICAL & HARDWARE ──────────────────────────────────
  KEYSTONE: {
    name: "Keystone Electronics Corp.", shortCode: "KEY", website: "https://www.keyelco.com",
    categories: ["Battery Holders", "PCB Standoffs", "Terminals"],
    prefixes: ["1042", "1043", "1060", "106", "209", "500", "501", "502", "503"],
  },
  ETTINGER: {
    name: "Ettinger GmbH", shortCode: "ETG", website: "https://www.ettinger.de",
    categories: ["PCB Standoffs", "Spacers", "Screws"],
    prefixes: ["05.", "06.", "08.", "09.", "10.", "12."],
  },
  BOSSARD: {
    name: "Bossard Group", shortCode: "BSS", website: "https://www.bossard.com",
    categories: ["Fasteners", "Screws", "Nuts", "Washers"],
    prefixes: ["BSS"],
  },
  PEM: {
    name: "PEM (Penn Engineering)", shortCode: "PEM", website: "https://www.pemnet.com",
    categories: ["Fasteners", "Standoffs", "Nuts"],
    prefixes: ["CLS", "CLSS", "FE", "FEI", "FH", "HN", "HNL", "BS", "S", "SC", "PEM"],
  },
  RICHCO: {
    name: "Richco Inc.", shortCode: "RHC", website: "https://www.richco-inc.com",
    categories: ["PCB Supports", "Cable Ties", "Spacers"],
    prefixes: ["RBS", "SBC", "SCB", "PCB"],
  },

  // ── ADDITIONAL MANUFACTURERS FROM SUPPLIED LIST ────────────
  AMIC: {
    name: "AMIC Technology", shortCode: "AMIC", website: "https://www.amictechnology.com",
    categories: ["Flash Memory", "EEPROM"],
    prefixes: ["A25", "A29", "A6", "AC"],
  },
  ANTHEM: {
    name: "Anthem (Anthem Blue Cross)", shortCode: "ANB", website: "https://www.amictechnology.com",
    categories: ["Memory ICs"],
    prefixes: [],
  },
  CAPAX: {
    name: "Capax Technologies", shortCode: "CPX", website: "https://www.capaxtech.com",
    categories: ["Capacitors", "Passive Components"],
    prefixes: ["CPC"],
  },
  CEGELEC: {
    name: "Cegelec", shortCode: "CEG", website: "https://www.cegelec.com",
    categories: ["Industrial Electronics", "Power Systems"],
    prefixes: ["CEG"],
  },
  CONCORD: {
    name: "Concord Semiconductor", shortCode: "CSD", website: "https://www.concordsemi.com",
    categories: ["Discretes", "MOSFETs"],
    prefixes: ["CS1", "CS2", "CS3", "CS4"],
  },
  COMUS: {
    name: "Comus International", shortCode: "COM", website: "https://www.comus-international.com",
    categories: ["Tilt Sensors", "Reed Switches", "Vibration Sensors"],
    prefixes: ["3400", "3500", "3600", "3700"],
  },
  DOLD: {
    name: "E. Dold & Söhne", shortCode: "DOL", website: "https://www.dold.com",
    categories: ["Safety Relays", "Monitoring Relays", "Timers"],
    prefixes: ["BA", "BH", "BI", "MK", "IL"],
  },
  ELESTA: {
    name: "Elesta Relays", shortCode: "ELS", website: "https://www.elesta.com",
    categories: ["Reed Relays", "Signal Relays"],
    prefixes: ["RM", "RH", "RE"],
  },
  GREENLIANTS: {
    name: "Greenliant Systems", shortCode: "GLS", website: "https://www.greenliant.com",
    categories: ["NAND Flash", "eMMC", "SSDs"],
    prefixes: ["GLS", "GN"],
  },
  HMS: {
    name: "HMS Industrial Networks", shortCode: "HMS", website: "https://www.hms-networks.com",
    categories: ["Industrial Communication", "Gateways", "IO-Link"],
    prefixes: ["AB", "HI"],
  },
  INPAQ: {
    name: "Inpaq Technology", shortCode: "INP", website: "https://www.inpaq.com.tw",
    categories: ["EMI Filters", "ESD Protection", "Ferrite Beads"],
    prefixes: ["ESD", "EMF", "SNL", "SMP"],
  },
  JOHANSEN_TECH: {
    name: "Johanson Technology", shortCode: "JTI", website: "https://www.johansontechnology.com",
    categories: ["RF Capacitors", "Inductors", "Filters"],
    prefixes: ["0402", "0603", "0805", "251", "302", "402", "502"],
  },
  JOHANSEN_DIEL: {
    name: "Johanson Dielectrics", shortCode: "JDI", website: "https://www.johansondielectrics.com",
    categories: ["MLCCs", "High-Voltage Capacitors"],
    prefixes: ["500S", "505S", "508S"],
  },
  KHATOD: {
    name: "Khatod Optoelectronic", shortCode: "KHD", website: "https://www.khatod.com",
    categories: ["Optical Lenses", "LED Optics"],
    prefixes: ["KHD", "QR", "M"],
  },
  LANTIQ: {
    name: "Lantiq GmbH (Intel)", shortCode: "LNT", website: "https://www.intel.com",
    categories: ["DSL ICs", "Home Gateway"],
    prefixes: ["LANTIQ", "GRX", "VRX", "PEF"],
    note: "Acquired by Intel",
  },
  LEACH: {
    name: "Leach International", shortCode: "LCH", website: "https://www.esterline.com",
    categories: ["Aerospace Relays", "Power Contactors"],
    prefixes: ["L"],
  },
  MAUCH: {
    name: "Mauch Elektronik", shortCode: "MAU", website: "https://www.mauch-electronic.com",
    categories: ["Current Sensors", "Power Modules", "UAV Electronics"],
    prefixes: ["PL-", "HS-", "BEC-"],
  },
  MURATA_VIOS: {
    name: "Murata Vios (Power Solutions)", shortCode: "MUR", website: "https://www.murata.com",
    categories: ["DC-DC Converters", "Power Modules"],
    prefixes: ["OKI", "MEE", "MEF", "MEM", "NCS"],
  },
  PANASONIC_EW: {
    name: "Panasonic Electric Works", shortCode: "PAN", website: "https://www.panasonic-electric-works.com",
    categories: ["Relays", "Sensors", "PLCs"],
    prefixes: ["AQ", "ALQ", "AGQ"],
  },
  PCA_ELEC: {
    name: "PCA Electronics", shortCode: "PCA", website: "https://www.pcaelectronics.com",
    categories: ["Inductors", "Transformers", "Custom Magnetics"],
    prefixes: ["PCA"],
  },
  QANTEK: {
    name: "Qantek Technology", shortCode: "QTK", website: "https://www.qantek.com.tw",
    categories: ["Crystals", "Oscillators"],
    prefixes: ["QC", "QX", "QST"],
  },
  SAAB: {
    name: "SAME SKY (Formerly Mouser Same Sky)", shortCode: "SSK", website: "https://www.samesky.com",
    categories: ["Crystals", "Oscillators", "Connectors", "Inductors"],
    prefixes: ["ECS", "ASR", "ASPI", "ABM3"],
  },
  SEMITEK: {
    name: "Semitec Corporation", shortCode: "STC", website: "https://www.semitec.co.jp",
    categories: ["NTC Thermistors", "Temperature Sensors"],
    prefixes: ["104NT", "103NT", "404NT", "202ET", "303ET"],
  },
  SWISSBIT: {
    name: "Swissbit AG", shortCode: "SWB", website: "https://www.swissbit.com",
    categories: ["NAND Flash", "eMMC", "Industrial SSDs"],
    prefixes: ["SFB", "SFCM", "SFEI", "SFEM"],
  },
  SYFER: {
    name: "Syfer Technology (Knowles)", shortCode: "SYF", website: "https://www.knowlescapacitors.com",
    categories: ["EMI Filters", "Feedthrough Capacitors"],
    prefixes: ["SYF", "0603Y", "1206Y", "2220Y"],
    note: "Part of Knowles",
  },
  TAI_TECH: {
    name: "Tai-Tech Advanced Electronics", shortCode: "TAI", website: "https://www.tai-tech.com",
    categories: ["Power Inductors", "Chokes"],
    prefixes: ["TAITEC", "SPC", "CDRH"],
  },
  TAITIEN: {
    name: "Taitien Electronics", shortCode: "TTN", website: "https://www.taitien.com",
    categories: ["Crystals", "Oscillators", "TCXOs"],
    prefixes: ["TXC", "NT", "NX", "NV", "VT"],
  },
  TAMURA: {
    name: "Tamura Corporation", shortCode: "TAM", website: "https://www.tamura-ss.co.jp",
    categories: ["Transformers", "Current Sensors", "Inductors"],
    prefixes: ["3FD", "A55", "A56", "FPT", "L01", "L08", "TSA"],
  },
  THOMAS_BETTS: {
    name: "Thomas & Betts (ABB)", shortCode: "TNB", website: "https://electrification.us.abb.com",
    categories: ["Connectors", "Cable Management", "Electrical"],
    prefixes: ["TY", "TYR", "MTY", "HW"],
    note: "Acquired by ABB",
  },
  TQ_SYSTEMS: {
    name: "TQ-Systems GmbH", shortCode: "TQS", website: "https://www.tq-group.com",
    categories: ["Embedded Modules", "Power Electronics"],
    prefixes: ["TQ", "MBa", "TQMa"],
  },
  TRANSCEND: {
    name: "Transcend Information", shortCode: "TSI", website: "https://www.transcend-info.com",
    categories: ["Flash Storage", "SSDs", "Memory"],
    prefixes: ["TS", "JF", "PSD"],
  },
  UNISONIC: {
    name: "Unisonic Technologies", shortCode: "UTC", website: "https://www.unisonic.com.tw",
    categories: ["Transistors", "MOSFETs", "Hall Sensors", "Op-Amps"],
    prefixes: ["UTC", "U", "L78", "L79", "LM2", "UPC"],
  },
  VIKING: {
    name: "Viking Tech", shortCode: "VKG", website: "https://www.viking.com.tw",
    categories: ["Resistors", "Capacitors"],
    prefixes: ["ARJ", "ARC", "ARL", "CSR", "CSNL"],
  },
  VPG: {
    name: "VPG Foil Resistors (Vishay)", shortCode: "VPG", website: "https://www.vpgsensors.com",
    categories: ["Precision Resistors", "Foil Resistors", "Load Cells"],
    prefixes: ["VPG", "Y1", "Y0", "S102", "S100"],
  },
  EPSON_CRYSTAL: {
    name: "Epson Crystal Device", shortCode: "ECD", website: "https://www5.epsondevice.com",
    categories: ["Crystals", "Gyroscopes"],
    prefixes: ["TSR", "XV"],
  },
  CTS_CORP: {
    name: "CTS Corporation", shortCode: "CTS", website: "https://www.ctscorp.com",
    categories: ["Frequency Control", "Sensors", "Actuators"],
    prefixes: ["CAT", "CAL", "CA4", "CB6", "406", "407", "MO"],
  },
  ECLIPTEK: {
    name: "Ecliptek Corporation", shortCode: "ECL", website: "https://www.ecliptek.com",
    categories: ["Oscillators", "Crystals", "TCXOs"],
    prefixes: ["EC2", "EC2645", "EC26", "ECX"],
  },
  CITIZEN: {
    name: "Citizen Finedevice", shortCode: "CFD", website: "https://www.citizenfinedevice.co.jp",
    categories: ["Crystals", "Oscillators", "Sensors"],
    prefixes: ["CS10", "CS20", "CX20", "CMR"],
  },
  NIDEC_COPAL: {
    name: "Nidec Copal Electronics", shortCode: "NCE", website: "https://www.nidec-copal-electronics.com",
    categories: ["Encoders", "Sensors", "Switches", "Pressure Sensors"],
    prefixes: ["PG7", "PG12", "RE11", "SR10", "SR15", "NPA", "NPP"],
  },
  COAX_CONN: {
    name: "Coax Connectors Ltd", shortCode: "CXC", website: "https://www.coaxconnectors.co.uk",
    categories: ["RF Coaxial Connectors"],
    prefixes: ["SMA", "BNC", "SMB", "TNC"],
  },
  CONIVERSS: {
    name: "Coninvers GmbH", shortCode: "CNV", website: "https://www.coninvers.de",
    categories: ["Circular Connectors", "Industrial Connectors"],
    prefixes: ["SP2", "SP1", "WB", "DB"],
  },
  E_TEC: {
    name: "E-TEC Interconnect", shortCode: "ETC", website: "https://www.e-tec.com",
    categories: ["Board-to-Board Connectors", "PCB Connectors"],
    prefixes: ["E-TEC", "ME", "CA"],
  },
  COMPAGNIE_DEUTSCH: {
    name: "Compagnie Deutsch (TE)", shortCode: "CDT", website: "https://www.te.com",
    categories: ["Aerospace Connectors", "Circular"],
    prefixes: ["DTS", "DTF", "DTP"],
    note: "Part of TE Connectivity",
  },
  BINDER_CONN: {
    name: "Binder GmbH", shortCode: "BDR", website: "https://www.binder-connector.com",
    categories: ["Circular Connectors", "Sensor Connectors"],
    prefixes: ["09-", "12-", "16-", "17-", "70-", "71-", "77-", "78-", "79-", "80-", "86-", "87-", "88-", "09"],
  },
  LUMBERG: {
    name: "Lumberg Holding", shortCode: "LMB", website: "https://www.lumberg.com",
    categories: ["Circular Connectors", "PCB Connectors", "Cable Connectors"],
    prefixes: ["RST", "RSMV", "RSCB", "1605", "1606", "3500"],
  },
  CAMDENB: {
    name: "Camdenboss", shortCode: "CMB", website: "https://www.camdenboss.com",
    categories: ["Terminal Blocks", "Enclosures"],
    prefixes: ["CTBP", "CTB", "CTC", "CDB"],
  },
  CLIFF_ELEC: {
    name: "Cliff Electronic Components", shortCode: "CLF", website: "https://www.cliffuk.co.uk",
    categories: ["Audio Connectors", "DC Connectors", "RCA"],
    prefixes: ["S1", "S2", "CL", "FC", "SK"],
  },
  GGP: {
    name: "GGP (Gebrüder Geyer)", shortCode: "GGP", website: "https://www.geyer-electronic.de",
    categories: ["Crystals", "Oscillators"],
    prefixes: ["GGP", "GY"],
  },
  CEL: {
    name: "California Eastern Laboratories (CEL)", shortCode: "CEL", website: "https://www.cel.com",
    categories: ["Wireless ICs", "Zigbee", "RF Modules"],
    prefixes: ["EKMB", "EKMC", "IS802", "IS2020"],
  },
  AKER: {
    name: "AKER Technology", shortCode: "AKR", website: "https://www.akertechnology.com",
    categories: ["Crystals", "Oscillators"],
    prefixes: ["AK", "CR"],
  },
  GEYER: {
    name: "Geyer Electronic", shortCode: "GYR", website: "https://www.geyer-electronic.de",
    categories: ["Crystals", "Oscillators", "Filters"],
    prefixes: ["GY", "QLCX", "QTLP"],
  },

  // ── POWER SEMICONDUCTORS (additional) ─────────────────────
  FUJI_ELEC: {
    name: "Fuji Electric", shortCode: "FJE", website: "https://www.fujielectric.com",
    categories: ["Power Modules", "IGBTs", "Power ICs"],
    prefixes: ["2MBI", "2MB", "6MB", "7MB", "7MBR", "FA", "FGH"],
  },
  MITSUBISHI: {
    name: "Mitsubishi Electric (Power Semi)", shortCode: "MIE", website: "https://www.mitsubishielectric.com",
    categories: ["Power Modules", "IGBTs", "IPMs"],
    prefixes: ["PM", "PS", "QM", "CM", "FM", "RM", "TM"],
  },
  SANREX: {
    name: "Sanrex Corporation", shortCode: "SRX", website: "https://www.sanrex.com",
    categories: ["Thyristors", "Diode Bridges", "Power Modules"],
    prefixes: ["SAP", "DF", "DY", "SPR", "MCD"],
  },
};

// ─────────────────────────────────────────────────────────────
// API KEYS  (set these as Railway environment variables)
// ─────────────────────────────────────────────────────────────
const DIGIKEY_CLIENT_ID     = process.env.DIGIKEY_CLIENT_ID     || "EcCzhW3OfDAfYDAp1WqnDTHapGSsbddZGVPBbJAJeDgWZlpA";
const DIGIKEY_CLIENT_SECRET = process.env.DIGIKEY_CLIENT_SECRET || "cHKuaRSEcoGd4f8ZaoFaM7eqPLqiubZFGJGGGtvLdJHd6wN9dQmcaqbkI3JHE3tJ";
const MOUSER_API_KEY        = process.env.MOUSER_API_KEY        || "4572a805-0ad7-4f75-b58b-ccbd691a3cf4";

// ─────────────────────────────────────────────────────────────
// DIGIKEY TOKEN CACHE
// ─────────────────────────────────────────────────────────────
let digikeyToken = null;
let digikeyTokenExpiry = 0;

async function getDigikeyToken() {
  if (digikeyToken && Date.now() < digikeyTokenExpiry) return digikeyToken;

  const body = new URLSearchParams({
    client_id:     DIGIKEY_CLIENT_ID,
    client_secret: DIGIKEY_CLIENT_SECRET,
    grant_type:    "client_credentials",
  }).toString();

  const res = await httpRequest("https://api.digikey.com/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error("DigiKey auth failed: " + res.text);
  const data = JSON.parse(res.text);
  digikeyToken = data.access_token;
  digikeyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return digikeyToken;
}

// ─────────────────────────────────────────────────────────────
// HTTP HELPER (no external deps)
// ─────────────────────────────────────────────────────────────
function httpRequest(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const http2 = require("http");
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http2;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: data }));
    });

    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
// DIGIKEY SEARCH
// ─────────────────────────────────────────────────────────────
async function searchDigikey(partNumber) {
  try {
    const token = await getDigikeyToken();
    const encoded = encodeURIComponent(partNumber);
    const res = await httpRequest(
      `https://api.digikey.com/products/v4/search/${encoded}/productdetails`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-DIGIKEY-Client-Id": DIGIKEY_CLIENT_ID,
          "X-DIGIKEY-Locale-Site": "US",
          "X-DIGIKEY-Locale-Language": "en",
          "X-DIGIKEY-Locale-Currency": "USD",
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      // Try keyword search as fallback
      const searchBody = JSON.stringify({
        Keywords: partNumber,
        RecordCount: 5,
        RecordStartPosition: 0,
        Filters: {},
        Sort: { SortParameter: "None" },
        RequestedQuantity: 1,
      });

      const searchRes = await httpRequest(
        "https://api.digikey.com/products/v4/search/keyword",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-DIGIKEY-Client-Id": DIGIKEY_CLIENT_ID,
            "X-DIGIKEY-Locale-Site": "US",
            "X-DIGIKEY-Locale-Language": "en",
            "X-DIGIKEY-Locale-Currency": "USD",
            "Content-Type": "application/json",
          },
          body: searchBody,
        }
      );

      if (!searchRes.ok) return null;
      const searchData = JSON.parse(searchRes.text);
      const products = searchData.Products || [];
      if (!products.length) return null;

      return products.slice(0, 5).map(p => ({
        source: "DigiKey",
        orderablePartNumber: p.ManufacturerProductNumber || p.DigiKeyPartNumber,
        digikeyPartNumber: p.DigiKeyPartNumber,
        manufacturer: p.Manufacturer?.Name || "Unknown",
        description: p.ProductDescription || "",
        status: normalizeStatus(p.ProductStatus),
        stock: p.QuantityAvailable ?? null,
        minQty: p.MinimumOrderQuantity ?? null,
        unitPrice: extractDigikeyPrice(p.UnitPrice),
        currency: "USD",
        datasheet: p.PrimaryDatasheet || null,
        productUrl: p.ProductUrl || `https://www.digikey.com/en/products/detail/${encodeURIComponent(p.DigiKeyPartNumber || "")}`,
        rohs: p.RoHSStatus || null,
        packageType: p.PackageType?.Name || null,
      }));
    }

    const data = JSON.parse(res.text);
    const p = data.Product;
    if (!p) return null;

    return [{
      source: "DigiKey",
      orderablePartNumber: p.ManufacturerProductNumber || p.DigiKeyPartNumber,
      digikeyPartNumber: p.DigiKeyPartNumber,
      manufacturer: p.Manufacturer?.Name || "Unknown",
      description: p.ProductDescription || "",
      status: normalizeStatus(p.ProductStatus),
      stock: p.QuantityAvailable ?? null,
      minQty: p.MinimumOrderQuantity ?? null,
      unitPrice: extractDigikeyPrice(p.UnitPrice),
      currency: "USD",
      datasheet: p.PrimaryDatasheet || null,
      productUrl: p.ProductUrl || null,
      rohs: p.RoHSStatus || null,
      packageType: p.PackageType?.Name || null,
    }];
  } catch (e) {
    console.error("DigiKey error:", e.message);
    return null;
  }
}

function extractDigikeyPrice(unitPrice) {
  if (!unitPrice) return null;
  if (typeof unitPrice === "number") return unitPrice;
  return null;
}

// ─────────────────────────────────────────────────────────────
// MOUSER SEARCH
// ─────────────────────────────────────────────────────────────
async function searchMouser(partNumber) {
  try {
    const body = JSON.stringify({
      SearchByPartRequest: {
        mouserPartNumber: partNumber,
        partSearchOptions: "BeginsWith",
      },
    });

    const res = await httpRequest(
      `https://api.mouser.com/api/v1/search/partnumber?apiKey=${MOUSER_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body,
      }
    );

    if (!res.ok) return null;
    const data = JSON.parse(res.text);
    const parts = data.SearchResults?.Parts || [];
    if (!parts.length) return null;

    return parts.slice(0, 5).map(p => ({
      source: "Mouser",
      orderablePartNumber: p.ManufacturerPartNumber,
      mouserPartNumber: p.MouserPartNumber,
      manufacturer: p.Manufacturer || "Unknown",
      description: p.Description || "",
      status: normalizeMouserStatus(p.LifecycleStatus, p.Availability),
      stock: parseMouserStock(p.Availability),
      minQty: parseInt(p.Min) || null,
      unitPrice: parseMouserPrice(p.PriceBreaks),
      currency: "USD",
      datasheet: p.DataSheetUrl || null,
      productUrl: p.ProductDetailUrl
        ? `https://www.mouser.com${p.ProductDetailUrl}`
        : null,
      rohs: p.ROHSStatus || null,
      packageType: p.Category || null,
    }));
  } catch (e) {
    console.error("Mouser error:", e.message);
    return null;
  }
}

function parseMouserStock(availability) {
  if (!availability) return null;
  const match = String(availability).replace(/,/g, "").match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function parseMouserPrice(priceBreaks) {
  if (!priceBreaks || !priceBreaks.length) return null;
  const first = priceBreaks[0];
  if (!first || !first.Price) return null;
  const price = parseFloat(String(first.Price).replace(/[^0-9.]/g, ""));
  return isNaN(price) ? null : price;
}

// ─────────────────────────────────────────────────────────────
// STATUS NORMALIZER
// ─────────────────────────────────────────────────────────────
function normalizeStatus(status) {
  if (!status) return "Unknown";
  const s = String(status).toLowerCase();
  if (s.includes("active") || s.includes("in production")) return "Active";
  if (s.includes("obsolete") || s.includes("discontinued")) return "Discontinued";
  if (s.includes("last time") || s.includes("ltb")) return "Last Time Buy";
  if (s.includes("not recommend") || s.includes("nrnd")) return "Not Recommended for New Designs";
  if (s.includes("preview") || s.includes("pre-production")) return "Preview";
  return status;
}

function normalizeMouserStatus(lifecycle, availability) {
  if (lifecycle) return normalizeStatus(lifecycle);
  if (!availability) return "Unknown";
  const a = String(availability).toLowerCase();
  if (a.includes("in stock") || a.match(/\d+/)) return "Active";
  if (a.includes("obsolete")) return "Discontinued";
  if (a.includes("last time")) return "Last Time Buy";
  return "Check Availability";
}

// ─────────────────────────────────────────────────────────────
// DETECTION LOGIC
// ─────────────────────────────────────────────────────────────
function detectManufacturers(orderCode) {
  const code = orderCode.trim().toUpperCase();
  const matches = [];
  const seenNames = new Set();

  for (const mfr of Object.values(MANUFACTURERS)) {
    if (!mfr.prefixes || mfr.prefixes.length === 0) continue;
    let score = 0;
    let reason = "";
    for (const prefix of mfr.prefixes) {
      if (code.startsWith(prefix.toUpperCase())) {
        score = prefix.length;
        reason = `Starts with "${prefix}"`;
        break;
      }
    }
    if (score > 0 && !seenNames.has(mfr.name)) {
      matches.push({ ...mfr, score, reason });
      seenNames.add(mfr.name);
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

function formatResult(orderCode, matches, distributorData) {
  const fmt = ({ name, shortCode, website, categories, reason, note }) =>
    ({ name, shortCode, website, categories, matchReason: reason, ...(note ? { note } : {}) });

  const result = {
    success: true,
    orderCode,
    message: matches.length
      ? `Found ${matches.length} manufacturer(s) for "${orderCode}".`
      : `No manufacturer in local DB for "${orderCode}" — see live distributor data below.`,
    primaryManufacturer: matches.length ? fmt(matches[0]) : null,
    alternateManufacturers: matches.length > 1 ? matches.slice(1).map(fmt) : [],
    totalMatches: matches.length,
    distributorLinks: {
      mouser:        `https://www.mouser.com/Search/Refine?Keyword=${encodeURIComponent(orderCode)}`,
      digikey:       `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(orderCode)}`,
      farnell:       `https://www.farnell.com/search?st=${encodeURIComponent(orderCode)}`,
      rs_components: `https://uk.rs-online.com/web/c/?searchTerm=${encodeURIComponent(orderCode)}`,
    },
    liveData: distributorData || null,
  };

  if (distributorData) {
    const allParts = [
      ...(distributorData.digikey || []),
      ...(distributorData.mouser  || []),
    ];
    const statuses = [...new Set(allParts.map(p => p.status).filter(Boolean))];
    const bestStatus = statuses.includes("Active") ? "Active"
      : statuses.includes("Last Time Buy") ? "Last Time Buy"
      : statuses.includes("Discontinued") ? "Discontinued"
      : statuses[0] || "Unknown";
    const totalStock = allParts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const prices = allParts.map(p => p.unitPrice).filter(p => p != null);
    const minPrice = prices.length ? Math.min(...prices) : null;
    result.summary = {
      status: bestStatus,
      statusIndicator: bestStatus === "Active" ? "🟢"
        : bestStatus === "Last Time Buy" ? "🟡"
        : bestStatus === "Discontinued" ? "🔴" : "⚪",
      totalStockAcrossDistributors: totalStock,
      lowestUnitPrice: minPrice != null ? `$${minPrice.toFixed(4)}` : null,
      currency: "USD",
      sourcesChecked: ["DigiKey", "Mouser"],
    };
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// OPENAPI SPEC
// ─────────────────────────────────────────────────────────────
const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: {
    title: "Electronic Parts Manufacturer API",
    description: "Identifies manufacturer(s) from electronic component order codes. Covers 400+ manufacturers across all major categories.",
    version: "3.0.0",
  },
  servers: [{ url: "https://parts-api-production.up.railway.app", description: "Production" }],
  paths: {
    "/search": {
      get: {
        operationId: "identifyManufacturer",
        summary: "Identify manufacturer(s) from an order code",
        parameters: [{
          name: "orderCode",
          in: "query",
          required: true,
          description: "Electronic component order code or part number",
          schema: { type: "string", example: "STM32F103C8T6" },
        }],
        responses: { 200: { description: "Manufacturer identification result" } },
      },
      post: {
        operationId: "identifyManufacturerPost",
        summary: "Identify manufacturer(s) — POST",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["orderCode"], properties: { orderCode: { type: "string" } } } } },
        },
        responses: { 200: { description: "OK" } },
      },
    },
    "/manufacturers": {
      get: { operationId: "listManufacturers", summary: "List all manufacturers", responses: { 200: { description: "Full list" } } },
    },
    "/health": {
      get: { operationId: "healthCheck", summary: "Health check", responses: { 200: { description: "ok" } } },
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

  if (pathname === "/health")
    return json(res, 200, { status: "ok", timestamp: new Date().toISOString(), manufacturerCount: Object.keys(MANUFACTURERS).length });

  if (pathname === "/openapi.json")
    return json(res, 200, OPENAPI_SPEC);

  if (pathname === "/manufacturers") {
    const list = Object.values(MANUFACTURERS).map(
      ({ name, shortCode, website, categories, prefixes }) =>
        ({ name, shortCode, website, categories, prefixes })
    );
    return json(res, 200, { success: true, count: list.length, manufacturers: list });
  }

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

    // Fetch live data from DigiKey + Mouser in parallel
    const [digikeyResults, mouserResults] = await Promise.allSettled([
      searchDigikey(orderCode),
      searchMouser(orderCode),
    ]);

    const distributorData = {
      digikey: digikeyResults.status === "fulfilled" ? digikeyResults.value : null,
      mouser:  mouserResults.status  === "fulfilled" ? mouserResults.value  : null,
    };

    return json(res, 200, formatResult(orderCode, matches, distributorData));
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
  const count = Object.keys(MANUFACTURERS).length;
  console.log(`Parts API → http://localhost:${port}`);
  console.log(`Manufacturers in DB: ${count}`);
  console.log(`Test → http://localhost:${port}/search?orderCode=STM32F103C8T6`);
});
