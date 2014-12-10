#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var crypto = require('crypto');

// REST Client
var RestClient = require('node-rest-client').Client;
var restClient = new RestClient();

var secret = "vxus328fksd883s92j3rrld9";
var getHash = function (state,ts) {
    var text = state + "|" + ts + "|" + secret;
    var hmac = crypto.createHmac("sha256",secret);
    hmac.setEncoding('base64');
    hmac.write(text);
    hmac.end();
    var hash = hmac.read();
    console.log("Hash: " + hash);
    return hash;
}

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;

    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        // For Cloud 9 process.env.PORT, process.env.IP
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080;


        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/openshift'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
			res.render('index.ejs');
        };
        
        self.routes['/test'] = function(req,res){
            var count = "";
            restClient.get("http://gumballservice-rohancmpe281.rhcloud.com/gumball/1", function(data, response_raw){

                console.log(data.countGumballs) ;
                console.log(data.modelNumber) ;
                console.log(data.serialNumber) ;
                count =  data.countGumballs ;
                console.log(count) ;
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Hello REST Client! Count Gumballs ==> ' + count );
            });
        };
        
        self.routes['/'] = function(req, res) {
			restClient.get("http://gumballservice-rohancmpe281.rhcloud.com/gumball/1", function(data, response_raw){
                console.log(data.countGumballs) ;
                console.log(data.modelNumber) ;
                console.log(data.serialNumber) ;
                var count =  data.countGumballs ;
                var modelNumber = data.modelNumber ;
				var serialNumber = data.serialNumber ;
				var state = "NoCoinState";
				
				//Added for timestamp and hash
				var now = new Date().getTime();
				var hash = getHash(state,now);
				
                console.log(count) ;
				var msg = "--------------------------------------------------"
						+"\nMighty Gumball, Inc."
						+"\nGroovy-Enabled Standing Gumball"
						+"\nModel# " + modelNumber
						+"\nSerial# " + serialNumber 
						+"\n--------------------------------------------------"
						+"\nGumball Machine: "
						+"\nCurrent State: " + state ;
                var resData = {
                    "msg":msg,
					"model":modelNumber,
					"serial":serialNumber,
					"state":state,
					"ts":now,
					"hash":hash
                };							
                res.setHeader('Content-Type', 'text/html');
				res.render('gumball.ejs',resData);
            });
		
            
        };
        
    };

    self.createPostRoutes = function() {
        
        self.postRoutes = { };
        
        self.postRoutes['/gumball'] = function(req, res) {

            var action = req.body.event;
            var state = req.body.state;
			var modelNumber = req.body.model;
			var serialNumber = req.body.serial;
			var ts = parseInt(req.body.ts);
			var now = new Date().getTime();
			var diff = ((now-ts)/1000);
			var hash1 = req.body.hash;
			var hash2 = getHash(state,ts);
			
			if((diff > 120) || (hash1 != hash2)){
			  console.log("TS:"  + (diff > 120));
			  console.log("HASH:"  + (hash1 != hash2));
			    var errorData = {
						"msg":"**** SESSON IS INVALID ****",
						"model":modelNumber,
						"serial":serialNumber,
						"state":state,
						"ts":now,
					    "hash":hash2
					};							
				res.setHeader('Content-Type', 'text/html');
				res.render('gumball.ejs',errorData);
				return;
			} else if(action == 'Insert Quarter') {
				if(state == 'NoCoinState' || state == 'CoinAcceptedState' || state == 'CoinRejectedState')
					state = 'HasCoinState';
			} else if (action == 'Turn Crank') {
				if(state == 'HasCoinState')
					state = 'CoinAcceptedState'; 
				else if (state == 'CoinAcceptedState' || state == 'CoinRejectedState')
					state = 'NoCoinState';
			}
			
			var hash = getHash(state,now);
			
			if (state == 'CoinAcceptedState') {
				restClient.get("http://gumballservice-rohancmpe281.rhcloud.com/gumball/1", function(data, response_raw){
				
					var count =  data.countGumballs ;
					modelNumber = data.modelNumber ;
					serialNumber = data.serialNumber ;
					
					var msg = "";
					if (count>0)
					{	
					count = count - 1;
					
					var args = {
					                path:{"id":1},
					                headers:{"Content-Type": "application/json"},
									data: {"countGumballs": count}
								};
					
					restClient.put("http://gumballservice-rohancmpe281.rhcloud.com/gumball/${id}", args, function(data,response) {
						modelNumber = data.modelNumber ;
					    serialNumber = data.serialNumber ;
					});
					
					
					msg = "--------------------------------------------------"
							+"\nMighty Gumball, Inc."
							+"\nGroovy-Enabled Standing Gumball"
							+"\nModel# " + modelNumber
							+"\nSerial# " + serialNumber 
							+"\n--------------------------------------------------"
							+"\nGumball Machine: "
							+"\nCurrent State: " + state ;
					} else {
						msg = "Sorry We are out of gumballs !!";
					}
					
					var resData = {
						"msg":msg,
						"model":modelNumber,
						"serial":serialNumber,
						"state":state,
						"ts":now,
					    "hash":hash
					};							
					res.setHeader('Content-Type', 'text/html');
					res.render('gumball.ejs',resData);
				});
				
			} else {
				var msg = "--------------------------------------------------"
							+"\nMighty Gumball, Inc."
							+"\nGroovy-Enabled Standing Gumball"
							+"\nModel# " + modelNumber
							+"\nSerial# " + serialNumber 
							+"\n--------------------------------------------------"
							+"\nGumball Machine: "
							+"\nCurrent State: " + state ;
					var resData = {
						"msg":msg,
						"model":modelNumber,
						"serial":serialNumber,
						"state":state,
						"ts":now,
					    "hash":hash
					};							
					res.setHeader('Content-Type', 'text/html');
					res.render('gumball.ejs',resData);
			}
		};
    }   

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
		self.createPostRoutes();
        self.app = express();
		
		self.app.set ('views', __dirname + '/views');
		self.app.set ('view engine', 'ejs');
		
        self.app.use(express.bodyParser());
        self.app.use("/images", express.static(__dirname + '/images'));
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }

		//  Add handlers for the app (from the routes).
        for (var r in self.postRoutes) {
            self.app.post(r, self.postRoutes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

}; 

/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();