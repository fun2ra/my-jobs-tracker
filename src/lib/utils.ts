import { createCn } from "cn/config"

/**
 * Joins class names and resolves Tailwind conflicts. Knows the role-based type scale from
 * tokens.css, so cn("text-caption", "text-fg-muted") keeps both (a size and a color).
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "title", "heading", "body", "caption"] }],
    },
  },
})
