var connect = require('connect');
connect.createServer(
    connect.static(__dirname)
).listen(8888);

console.log('### Running local server');
console.log('');
console.log('Running server at localhost:8888');