import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

test("route-prefix placeholders render valid JavaScript assignments in both SPA shells", () => {
  for (const relativePath of ["public/index.html", "public/app.html"]) {
    const html = readFileSync(`${projectRoot}/${relativePath}`, "utf8");
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1])
      .find((source) => source.includes("window.__PROJECTB_RESERVED_ROUTE_PREFIXES__"));

    assert.ok(script, `${relativePath} has a route-prefix bootstrap script`);
    assert.match(script, /window\.__PROJECTB_RESERVED_ROUTE_PREFIXES__ = __PROJECTB_RESERVED_ROUTE_PREFIXES_JSON__;/);

    const renderedScript = script.replace("__PROJECTB_RESERVED_ROUTE_PREFIXES_JSON__", '["admin","assets"]');
    assert.equal(renderedScript, 'window.__PROJECTB_RESERVED_ROUTE_PREFIXES__ = ["admin","assets"];');
    assert.doesNotThrow(() => new vm.Script(renderedScript));
  }
});
