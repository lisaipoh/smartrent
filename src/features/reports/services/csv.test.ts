import { describe, expect, it } from "vitest";

import { serializeCsv } from "./csv";

describe("serializeCsv", () => {
  it("quotes cells and escapes embedded quotes and line breaks", () => {
    expect(
      serializeCsv([
        ["Title", "Notes"],
        ["Unit 1", 'A "quoted" note\nnext'],
      ]),
    ).toBe('"Title","Notes"\r\n"Unit 1","A ""quoted"" note\nnext"');
  });

  it("neutralizes spreadsheet formula prefixes", () => {
    expect(serializeCsv([['=HYPERLINK("https://example.com")']])).toBe(
      '"\'=HYPERLINK(""https://example.com"")"',
    );
  });
});
