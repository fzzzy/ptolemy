var port = 8888;

var connect = require('connect');
connect.createServer(
    connect.static(__dirname)
).listen(port);

console.log('### Running local server');
console.log('');
console.log('Running server at localhost:' + port);
