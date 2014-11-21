var RestClient = require('node-rest-client').Client;
var http = require("http");

var restClient = new RestClient();

// direct way
// restClient.get("http://grails-gumball-machine.cfapps.io/gumball", function(data, response){
//             // parsed response body as js object
//             console.log(data);
//             // raw response
//             //console.log(response);
//         });
        
restClient.registerMethod("getAllGumballs", "http://grails-gumball-machine.cfapps.io/gumball", "GET");
// restClient.methods.getAllGumballs(function(data,response){
//     console.log(data);
// });

http.createServer(function(req, res) {
    restClient.methods.getAllGumballs(function(data,response){
        console.log(data);
        res.writeHead(200,{'Content-Type': 'application/json'});
        res.end(JSON.stringify(data));
    });
}).listen(process.env.PORT, process.env.IP);