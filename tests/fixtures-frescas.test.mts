/**
 * Las fixtures doradas del backend (backend/tests/fixtures/*.json) tienen que ser
 * exactamente lo que genera hoy scripts/exportar-prompts.mts con el código TS.
 * Si falla: `node --experimental-strip-types scripts/exportar-prompts.mts` y
 * actualizar el PHP que las usa en la misma tarea.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("las fixtures doradas están al día con shared/", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fixtures-"));
  execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/exportar-prompts.mts", dir]);
  const generadas = readdirSync(dir);
  assert.ok(generadas.length > 0);
  for (const f of generadas) {
    const versionada = readFileSync(path.join("backend/tests/fixtures", f), "utf8");
    assert.equal(readFileSync(path.join(dir, f), "utf8"), versionada, `${f} desfasado: vuelve a ejecutar scripts/exportar-prompts.mts`);
  }
});
