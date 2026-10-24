// Reads the design tokens out of the web's globals.css: the custom properties of its top-level
// :root block, and the ones a @media block's :root overrides. Shared by the generator and the
// test that keeps the generated module in step with the stylesheet.

export type ParsedTokens = {
  /** --name (without the dashes) → its value, exactly as written. */
  base: Record<string, string>;
  /** Each @media block that overrides tokens: its condition, and the values it sets. */
  overrides: { media: string; tokens: Record<string, string> }[];
};

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of block.replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
    const m = decl.trim().match(/^--([a-z0-9-]+)\s*:\s*([\s\S]+)$/);
    if (m) out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  }
  return out;
}

export function parseTokens(css: string): ParsedTokens {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const root = withoutComments.match(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/);
  if (!root) throw new Error('globals.css: no top-level :root block');
  const overrides: ParsedTokens['overrides'] = [];
  for (const m of withoutComments.matchAll(/@media\s*([^{]+)\{\s*:root\s*\{([\s\S]*?)\}\s*\}/g)) {
    overrides.push({ media: m[1].trim(), tokens: declarations(m[2]) });
  }
  return { base: declarations(root[1]), overrides };
}
