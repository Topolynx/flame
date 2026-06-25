import { describe, expect, it } from 'vitest';

import { sanitizeSvg, sanitizeSvgBytes } from '@/lib/uploadSanitizers';

describe('sanitizeSvg', () => {
  it('strips a <script> block', () => {
    const dirty = '<svg><script>alert(1)</script><rect /></svg>';
    const clean = sanitizeSvg(dirty);

    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('<rect />');
  });

  it('strips a self-closing or unterminated <script> tag', () => {
    const dirty = '<svg><script src="bad.js"/></svg>';
    const clean = sanitizeSvg(dirty);

    expect(clean).not.toContain('<script');
  });

  it('strips inline event handler attributes', () => {
    const dirty = '<svg onload="alert(1)"><a onclick=\'do()\' onmouseover=stuff>x</a></svg>';
    const clean = sanitizeSvg(dirty);

    expect(clean).not.toMatch(/\son\w+/i);
    expect(clean).not.toContain('alert');
    expect(clean).not.toContain('do()');
    expect(clean).not.toContain('stuff');
  });

  it('strips <foreignObject> blocks', () => {
    const dirty = '<svg><foreignObject><div>bad</div></foreignObject></svg>';
    const clean = sanitizeSvg(dirty);

    expect(clean).not.toContain('foreignObject');
    expect(clean).not.toContain('<div>');
  });

  it('removes javascript: URLs from href and xlink:href', () => {
    const dirty =
      '<svg><a href="javascript:alert(1)"></a><use xlink:href="javascript:bad()"></use></svg>';
    const clean = sanitizeSvg(dirty);

    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('alert');
  });

  it('leaves a clean SVG untouched (no scripts, no handlers)', () => {
    const clean = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>';

    expect(sanitizeSvg(clean)).toBe(clean);
  });
});

describe('sanitizeSvgBytes', () => {
  it('returns a Buffer with the sanitized SVG content', () => {
    const dirty = Buffer.from('<svg><script>bad</script><rect /></svg>', 'utf8');
    const clean = sanitizeSvgBytes(dirty);

    expect(Buffer.isBuffer(clean)).toBe(true);
    expect(clean.toString('utf8')).not.toContain('<script');
    expect(clean.toString('utf8')).toContain('<rect />');
  });
});
