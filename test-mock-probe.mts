import { test } from "node:test";

test("probe mock module", (t) => {
  console.log("t.mock type:", typeof t.mock);
  if (t.mock) {
    console.log("mock methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(t.mock)));
    console.log("mock own props:", Object.getOwnPropertyNames(t.mock));
  }
});
