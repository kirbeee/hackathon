import assert from "node:assert/strict";
import test from "node:test";
import { rwaAmountForPayment } from "../lib/rwa-payment.ts";

test("one USDC buys one RWA; multiple whole units retain the same rate", () => {
  assert.equal(rwaAmountForPayment(1, "USDC"), 1);
  assert.equal(rwaAmountForPayment(5, "USDC"), 5);
  assert.equal(rwaAmountForPayment(30, "TWD"), 1);
  assert.equal(rwaAmountForPayment(150, "TWD"), 5);
});

test("reject invalid, below-minimum and fractional-unit payments without rounding down", () => {
  for (const amount of [0, -1, 0.99, 1.5, NaN, Infinity]) {
    assert.equal(rwaAmountForPayment(amount, "USDC"), null);
  }
  assert.equal(rwaAmountForPayment(29, "TWD"), null);
  assert.equal(rwaAmountForPayment(31, "TWD"), null);
});

test("preserve the 30,000 TWD per-payment limit in either currency", () => {
  assert.equal(rwaAmountForPayment(1000, "USDC"), 1000);
  assert.equal(rwaAmountForPayment(1001, "USDC"), null);
  assert.equal(rwaAmountForPayment(30000, "TWD"), 1000);
  assert.equal(rwaAmountForPayment(30030, "TWD"), null);
});
