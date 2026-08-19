import assert from "node:assert/strict";
import { test } from "node:test";

import { prismaErrorHint } from "./client";

test("table-missing Prisma errors stay DB_SCHEMA", () => {
  const hint = prismaErrorHint({ code: "P2021", message: "The table `public.User` does not exist in the current database." });
  assert.equal(hint.code, "DB_SCHEMA");
});

test("column-missing Prisma errors are not reported as missing clinic tables", () => {
  const hint = prismaErrorHint({
    code: "P2022",
    message: "The column `phone` does not exist in the current database.",
  });
  assert.equal(hint.code, "DB_COLUMN");
  assert.equal(/clinic tables are missing/i.test(hint.message), false);
});
