var assert = require("assert");
var ParkApiSource = require("./index");

describe("ParkApiSource", function() {
  it("fetch data", function() {
    const source = new ParkApiSource();
    assert.ok(source);
  });
});
