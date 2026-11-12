// Generated from backend/src/integrations/manifest.ts by backend/scripts/automation-generate.ts. Do not edit.
"use strict";

module.exports = {
  "API_BASE": "https://api.kovapdf.com/api/v1",
  "SITE_URL": "https://www.kovapdf.com",
  "ATTRIBUTION": "Done with KovaPDF (kovapdf.com).",
  "MESSAGES": {
    "integration_paused": "KovaPDF has paused connections from this app for now. Nothing was changed. Please try again later, or use https://www.kovapdf.com.",
    "tool_paused": "This KovaPDF tool is paused for apps right now. It still works on https://www.kovapdf.com.",
    "unavailable": "This KovaPDF feature is not available yet."
  },
  "TOOLS": [
    {
      "id": "verify",
      "key": "tool_verify",
      "title": "Check PDF Signatures",
      "description": "Checks every digital signature in a PDF: who signed, when, whether the document changed after signing, and whether the certificate is trusted. Returns a report. The file is not changed.",
      "inputs": {
        "kinds": [
          "pdf"
        ],
        "min": 1,
        "max": 1,
        "multi": false
      },
      "options": [],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": true,
          "helpText": "A PDF."
        }
      ]
    },
    {
      "id": "compress",
      "key": "tool_compress",
      "title": "Compress PDF",
      "description": "Makes a PDF smaller. Choose a level, or a target size in KB. Returns a link to the smaller PDF; the original is not changed.",
      "inputs": {
        "kinds": [
          "pdf"
        ],
        "min": 1,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "level",
          "kind": "enum",
          "required": false
        },
        {
          "name": "targetKb",
          "kind": "integer",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": true,
          "helpText": "A PDF."
        },
        {
          "key": "level",
          "label": "Level",
          "required": false,
          "helpText": "basic (the usual) keeps good quality, strong makes it smallest, quality changes the least.",
          "type": "string",
          "choices": [
            "basic",
            "strong",
            "quality"
          ],
          "default": "basic"
        },
        {
          "key": "targetKb",
          "label": "Target Size (KB)",
          "required": false,
          "helpText": "Aim for this size in KB instead of a level.",
          "type": "integer"
        }
      ]
    },
    {
      "id": "merge",
      "key": "tool_merge",
      "title": "Merge PDFs",
      "description": "Joins two or more PDFs into one, in the order given. Returns a link to the merged PDF.",
      "inputs": {
        "kinds": [
          "pdf"
        ],
        "min": 2,
        "max": 20,
        "multi": true
      },
      "options": [],
      "fields": [
        {
          "key": "files",
          "label": "Files",
          "type": "file",
          "list": true,
          "required": true,
          "helpText": "2 to 20 files, in order. Each is a PDF."
        }
      ]
    },
    {
      "id": "split",
      "key": "tool_split",
      "title": "Split PDF",
      "description": "Splits a PDF: every page on its own (all), chosen pages into one PDF (range), every N pages (every), or into parts under a size (size). Returns a link to a PDF or a ZIP of PDFs.",
      "inputs": {
        "kinds": [
          "pdf"
        ],
        "min": 1,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "mode",
          "kind": "enum",
          "required": false
        },
        {
          "name": "pages",
          "kind": "string",
          "required": false
        },
        {
          "name": "pagesPerPart",
          "kind": "integer",
          "required": false
        },
        {
          "name": "maxMb",
          "kind": "number",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": true,
          "helpText": "A PDF."
        },
        {
          "key": "mode",
          "label": "Mode",
          "required": false,
          "helpText": "all, range, every or size.",
          "type": "string",
          "choices": [
            "all",
            "range",
            "every",
            "size"
          ],
          "default": "all"
        },
        {
          "key": "pages",
          "label": "Pages",
          "required": false,
          "helpText": "For range: pages like 1-3,5.",
          "type": "string"
        },
        {
          "key": "pagesPerPart",
          "label": "Pages Per Part",
          "required": false,
          "helpText": "For every: pages in each part.",
          "type": "integer"
        },
        {
          "key": "maxMb",
          "label": "Most MB Per Part",
          "required": false,
          "helpText": "For size: the most MB in each part.",
          "type": "number"
        }
      ]
    },
    {
      "id": "organize",
      "key": "tool_organize",
      "title": "Reorder, Rotate or Delete Pages",
      "description": "Builds a new PDF from the pages listed, in that order. Each item is a page number, or { page, rotate } with rotate 90, 180 or 270. Pages left out are deleted. The original is not changed.",
      "inputs": {
        "kinds": [
          "pdf"
        ],
        "min": 1,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "pages",
          "kind": "json",
          "required": true
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": true,
          "helpText": "A PDF."
        },
        {
          "key": "pages",
          "label": "Pages",
          "required": true,
          "helpText": "The new document's pages in order: page numbers, or { page, rotate }. Page numbers with commas (3,1,2) or a JSON list.",
          "type": "string"
        }
      ]
    },
    {
      "id": "convert",
      "key": "tool_convert",
      "title": "Convert Files",
      "description": "Converts a PDF to Word (word), Excel (excel) or pictures (jpg, png); or a Word, Excel, PowerPoint or OpenDocument file, or pictures, to PDF (pdf). Returns a link to the result.",
      "inputs": {
        "kinds": [
          "pdf",
          "image",
          "office"
        ],
        "min": 1,
        "max": 20,
        "multi": true
      },
      "options": [
        {
          "name": "to",
          "kind": "enum",
          "required": true
        },
        {
          "name": "pages",
          "kind": "string",
          "required": false
        },
        {
          "name": "dpi",
          "kind": "numberEnum",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "files",
          "label": "Files",
          "type": "file",
          "list": true,
          "required": true,
          "helpText": "1 to 20 files, in order. Each is a PDF, picture (PNG or JPG) or Word, Excel, PowerPoint or OpenDocument file."
        },
        {
          "key": "to",
          "label": "Convert To",
          "required": true,
          "helpText": "What to make: word, excel, jpg, png or pdf.",
          "type": "string",
          "choices": [
            "word",
            "excel",
            "jpg",
            "png",
            "pdf"
          ]
        },
        {
          "key": "pages",
          "label": "Pages",
          "required": false,
          "helpText": "For pictures: pages like 1-3.",
          "type": "string"
        },
        {
          "key": "dpi",
          "label": "Resolution (DPI)",
          "required": false,
          "helpText": "For pictures: 72, 150 or 300.",
          "type": "string",
          "choices": [
            "72",
            "150",
            "300"
          ]
        }
      ]
    },
    {
      "id": "ocr",
      "key": "tool_ocr",
      "title": "Read Text From a Scan",
      "description": "Reads the text in a scanned PDF or a picture with text recognition. Returns the text and a link to a .txt file. Up to 30 pages per call; use pages to choose.",
      "inputs": {
        "kinds": [
          "pdf",
          "image"
        ],
        "min": 1,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "language",
          "kind": "string",
          "required": false
        },
        {
          "name": "pages",
          "kind": "string",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": true,
          "helpText": "A PDF or picture (PNG or JPG)."
        },
        {
          "key": "language",
          "label": "Language",
          "required": false,
          "helpText": "A language code such as eng, ben or hin; left out, it is detected.",
          "type": "string"
        },
        {
          "key": "pages",
          "label": "Pages",
          "required": false,
          "helpText": "Pages like 1-3,5.",
          "type": "string"
        }
      ]
    },
    {
      "id": "redact",
      "key": "tool_redact",
      "title": "Redact a PDF",
      "description": "Permanently removes words or kinds of details (email, phone, card, date, url, iban, ssn) from a copy of the PDF, and lists every place something was removed as proof. The original is not changed.",
      "inputs": {
        "kinds": [
          "pdf"
        ],
        "min": 1,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "terms",
          "kind": "stringList",
          "required": false
        },
        {
          "name": "patterns",
          "kind": "enumList",
          "required": false
        },
        {
          "name": "matchCase",
          "kind": "boolean",
          "required": false
        },
        {
          "name": "wholeWord",
          "kind": "boolean",
          "required": false
        },
        {
          "name": "label",
          "kind": "string",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": true,
          "helpText": "A PDF."
        },
        {
          "key": "terms",
          "label": "Words To Remove",
          "required": false,
          "helpText": "Words or phrases to remove.",
          "type": "string",
          "list": true
        },
        {
          "key": "patterns",
          "label": "Kinds Of Details",
          "required": false,
          "helpText": "Kinds of details to remove.",
          "type": "string",
          "choices": [
            "email",
            "phone",
            "card",
            "date",
            "url",
            "iban",
            "ssn"
          ],
          "list": true
        },
        {
          "key": "matchCase",
          "label": "Match Case",
          "required": false,
          "helpText": "Match capital letters exactly.",
          "type": "boolean"
        },
        {
          "key": "wholeWord",
          "label": "Whole Words Only",
          "required": false,
          "helpText": "Match whole words only.",
          "type": "boolean"
        },
        {
          "key": "label",
          "label": "Box Label",
          "required": false,
          "helpText": "Words printed in each box, such as REDACTED.",
          "type": "string"
        }
      ]
    },
    {
      "id": "bijoy_to_unicode",
      "key": "tool_bijoy_to_unicode",
      "title": "Bijoy to Unicode",
      "description": "Converts Bangla text typed in Bijoy (SutonnyMJ and similar fonts) to Unicode Bangla. English words are kept as they are. Pass the text, or a .txt file.",
      "inputs": {
        "kinds": [
          "text"
        ],
        "min": 0,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "text",
          "kind": "string",
          "required": false
        },
        {
          "name": "keepEnglish",
          "kind": "boolean",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": false,
          "helpText": "A .txt file. Leave empty to send text instead."
        },
        {
          "key": "text",
          "label": "Text",
          "required": false,
          "helpText": "The text to convert.",
          "type": "text"
        },
        {
          "key": "keepEnglish",
          "label": "Keep English Words",
          "required": false,
          "helpText": "Keep English words as they are (the usual).",
          "type": "boolean"
        }
      ]
    },
    {
      "id": "unicode_to_bijoy",
      "key": "tool_unicode_to_bijoy",
      "title": "Unicode to Bijoy",
      "description": "Converts Unicode Bangla text to Bijoy, for SutonnyMJ and similar fonts. Pass the text, or a .txt file.",
      "inputs": {
        "kinds": [
          "text"
        ],
        "min": 0,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "text",
          "kind": "string",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": false,
          "helpText": "A .txt file. Leave empty to send text instead."
        },
        {
          "key": "text",
          "label": "Text",
          "required": false,
          "helpText": "The text to convert.",
          "type": "text"
        }
      ]
    },
    {
      "id": "kruti_to_unicode",
      "key": "tool_kruti_to_unicode",
      "title": "Kruti Dev to Unicode",
      "description": "Converts Hindi text typed in Kruti Dev to Unicode Hindi. English words are kept as they are. Pass the text, or a .txt file.",
      "inputs": {
        "kinds": [
          "text"
        ],
        "min": 0,
        "max": 1,
        "multi": false
      },
      "options": [
        {
          "name": "text",
          "kind": "string",
          "required": false
        },
        {
          "name": "keepEnglish",
          "kind": "boolean",
          "required": false
        }
      ],
      "fields": [
        {
          "key": "file",
          "label": "File",
          "type": "file",
          "required": false,
          "helpText": "A .txt file. Leave empty to send text instead."
        },
        {
          "key": "text",
          "label": "Text",
          "required": false,
          "helpText": "The text to convert.",
          "type": "text"
        },
        {
          "key": "keepEnglish",
          "label": "Keep English Words",
          "required": false,
          "helpText": "Keep English words as they are (the usual).",
          "type": "boolean"
        }
      ]
    }
  ]
};
