var assert = require("assert");
var ParkApiSource = require("./index");

describe("ParkApiSource", function() {
  it("fetch data", (done) => {
    const source = new ParkApiSource("", done);
    assert.ok(source);
  });
});
