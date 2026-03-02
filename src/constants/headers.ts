export const HeaderConstants = {
  JSON_HEADERS: { "content-type": "application/json" },
  IMAGE_HEADERS: {
    "content-type": "image/png",
    "cache-control": "public, max-age=300",
  },
} as const;
