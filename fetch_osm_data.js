var request = require("request");
var options = {
  url: "http://overpass-api.de/api/interpreter",
  form: {
    data: null
  }
};

module.exports = function (s, w, n, e) {
  options.form.data = "( way(" + s + "," + w + "," + n + "," + e + "); ); (._;>;); out;";
  return request.post(options);
};

