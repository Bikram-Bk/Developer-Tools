export const CATEGORIES = [
  { id: "formatters", name: "Formatters", description: "Format and validate data structures" },
  { id: "generators", name: "Generators", description: "Generate placeholder text, identifiers, and files" },
  { id: "encoders-decoders", name: "Encoders & Decoders", description: "Encode and decode text or binary data" },
  { id: "converters", name: "Converters", description: "Convert between formats, timezones, and units" },
  { id: "cryptography", name: "Cryptography", description: "Generate secure hashes and decode tokens" },
  { id: "text-utils", name: "Text Utilities", description: "Test patterns and inspect text properties" },
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  iconName: string;
}

export const TOOLS: Tool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter & Validator",
    description: "Format, validate, and minify JSON data with interactive syntax checking.",
    category: "formatters",
    iconName: "Braces",
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate RFC 4122 compliant UUIDs (v4 and v1) in bulk.",
    category: "generators",
    iconName: "Fingerprint",
  },
  {
    id: "base64-tool",
    name: "Base64 Encoder / Decoder",
    description: "Encode and decode text or files to/from Base64 format.",
    category: "encoders-decoders",
    iconName: "Binary",
  },
  {
    id: "url-tool",
    name: "URL Encoder / Decoder",
    description: "Encode and decode URL parameters safely.",
    category: "encoders-decoders",
    iconName: "Link",
  },
  {
    id: "timestamp-tool",
    name: "Timestamp Converter",
    description: "Convert Unix epoch timestamps to human-readable dates and relative time.",
    category: "converters",
    iconName: "Clock",
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions with real-time match highlighting and flags support.",
    category: "text-utils",
    iconName: "Code2",
  },
  {
    id: "hash-generator",
    name: "SHA-256 Hash Generator",
    description: "Generate SHA-256 hashes from text or verify file checksums locally.",
    category: "cryptography",
    iconName: "Hash",
  },
  {
    id: "color-picker",
    name: "Color Picker",
    description: "Pick colors, convert between HEX/RGB/HSL, and check WCAG contrast compliance.",
    category: "converters",
    iconName: "Palette",
  },
  {
    id: "lorem-generator",
    name: "Lorem Ipsum Generator",
    description: "Generate placeholder text paragraphs, sentences, words, or lists.",
    category: "generators",
    iconName: "FileText",
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode JSON Web Tokens, inspect header and payload data, and verify expiration.",
    category: "cryptography",
    iconName: "KeyRound",
  },
];
