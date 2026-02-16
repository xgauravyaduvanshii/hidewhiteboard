import { validateLibraryUrl } from "./library";

describe("validateLibraryUrl", () => {
  it("should validate hostname & pathname", () => {
    // valid hostnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard", ["hidewhiteboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard", ["hidewhiteboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.hidewhiteboard.com", ["hidewhiteboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.hidewhiteboard.com", [
        "library.hidewhiteboard.com",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/", ["hidewhiteboard.com/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard", ["hidewhiteboard.com/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/", ["hidewhiteboard.com"]),
    ).toBe(true);

    // valid pathnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/path", ["hidewhiteboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/path/", ["hidewhiteboard.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/path", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/path/", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/path", [
        "hidewhiteboard.com/specific/path/",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/path/other", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toBe(true);

    // invalid hostnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://xhidewhiteboard.com", ["hidewhiteboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://x-hidewhiteboard.com", ["hidewhiteboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboardx", ["hidewhiteboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboardx", ["hidewhiteboard.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard.mx", ["hidewhiteboard.com"]),
    ).toThrow();
    // protocol must be https
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard.mx", ["hidewhiteboard.com"]),
    ).toThrow();

    // invalid pathnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/other/path", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/paths", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/specific/path-s", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://github.com/xgauravyaduvanshii/hidewhiteboard/some/specific/path", [
        "hidewhiteboard.com/specific/path",
      ]),
    ).toThrow();
  });
});
