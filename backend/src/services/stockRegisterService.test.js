import { interpolateVolume } from "./stockRegisterService.js";
import assert from "assert";

const testInterpolateVolume = () => {
  const points = [
    { dipCm: 10, volumeLitres: 100 },
    { dipCm: 20, volumeLitres: 200 },
    { dipCm: 30, volumeLitres: 400 }, // non-linear
  ];

  // exact matches
  assert.strictEqual(interpolateVolume(10, points), 100);
  assert.strictEqual(interpolateVolume(20, points), 200);

  // interpolation
  assert.strictEqual(interpolateVolume(15, points), 150); // halfway between 10 and 20
  assert.strictEqual(interpolateVolume(25, points), 300); // halfway between 20 and 30

  // bounds
  assert.strictEqual(interpolateVolume(5, points), 100); // below min
  assert.strictEqual(interpolateVolume(35, points), 400); // above max

  // empty or null
  assert.strictEqual(interpolateVolume(15, []), null);
  assert.strictEqual(interpolateVolume(15, null), null);

  console.log("interpolateVolume tests passed!");
};

testInterpolateVolume();
