let passedTests = 0;
let failedTests = 0;
const results = [];
let testQueue = Promise.resolve();

export function describe(suiteName, fn) {
  testQueue = testQueue.then(async () => {
    console.log(`\n📂 SUITE: ${suiteName}`);
  });
  fn();
}

export function test(testName, fn) {
  const p = testQueue.then(async () => {
    try {
      await fn();
      passedTests++;
      results.push({ name: testName, status: "PASSED" });
      console.log(`  ✅ PASS: ${testName}`);
    } catch (err) {
      failedTests++;
      results.push({ name: testName, status: "FAILED", error: err?.message || String(err) });
      console.error(`  ❌ FAIL: ${testName}\n     Error: ${err?.message || String(err)}`);
    }
  });
  testQueue = p;
  return p;
}

export function testAsync(testName, fn) {
  return test(testName, fn);
}

export async function waitForAllTests() {
  await testQueue;
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected '${expected}' but got '${actual}'`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected '${JSON.stringify(expected)}' but got '${JSON.stringify(actual)}'`,
        );
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      if (diff > Math.pow(10, -precision)) {
        throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${diff})`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined but got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected value to be falsy but got ${actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected value to be truthy but got ${actual}`);
      }
    },
    toContain(expected) {
      if (typeof actual !== "string" && !Array.isArray(actual)) {
        throw new Error(`Expected string or array but got ${typeof actual}`);
      }
      if (!actual.includes(expected)) {
        throw new Error(`Expected '${actual}' to contain '${expected}'`);
      }
    },
  };
}

export function getSummary() {
  return { passedTests, failedTests, total: passedTests + failedTests, results };
}
