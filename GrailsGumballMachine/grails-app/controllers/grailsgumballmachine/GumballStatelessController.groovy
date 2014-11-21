package grailsgumballmachine

import gumball.GumballMachine

class GumballStatelessController {

	def String machineSerialNum = "12345"
	def GumballMachine gumballMachine
	
	def index() {
		
		String VCAP_SERVICES = System.getenv('VCAP_SERVICES')
		
		if (request.method == "GET") {

			// search db for gumball machine
			def gumball = Gumball.findBySerialNumber( machineSerialNum )
			if ( gumball )
			{
				// create a default machine
				gumballMachine = new GumballMachine(gumball.modelNumber, gumball.serialNumber)
				System.out.println(gumballMachine.getAbout())
			}
			else
			{
				flash.message = "Error! Gumball Machine Not Found!"
				render(view: "index")
			}
			
			// send machine state to client
			flash.state = gumballMachine.getCurrentState() 
			flash.model = gumball.modelNumber
			flash.serial = gumball.serialNumber
			flash.hash = (gumballMachine.getCurrentState() +  gumball.modelNumber + gumball.serialNumber).encodeAsSHA256()
			
			// report a message to user
			flash.message = gumballMachine.getAbout()

			// display view
			render(view: "index")

		}
		else if (request.method == "POST") {

			// dump out request object
			request.each { key, value ->
				println( "request: $key = $value")
			}

			// dump out params
			params?.each { key, value ->
				println( "params: $key = $value" )
			}

			// restore machine to client state (instead)
			def state = params?.state
			def modelNum = params?.model
			def serialNum = params?.serial
			def hashFromRequest = params?.hash
			
			// Calculate hash from the request parameters
			def hashFromParams = (state +  modelNum + serialNum).encodeAsSHA256()
			
			if (hashFromParams != hashFromRequest) {
				flash.message = "Error! Request data has been tempered !"
				render(view: "index")
			}
			
			gumballMachine = new GumballMachine(modelNum, serialNum) ;
			gumballMachine.setCurrentState(state) ;
			
			System.out.println(gumballMachine.getAbout())
			
			if ( params?.event == "Insert Quarter" )
			{
				gumballMachine.insertCoin()
			}
			if ( params?.event == "Turn Crank" )
			{
				gumballMachine.crankHandle();
				
				if ( gumballMachine.getCurrentState().equals("gumball.CoinAcceptedState") )
				{
					def gumball = Gumball.findBySerialNumber( machineSerialNum )
					if ( gumball )
					{						
						// gumball.lock() // pessimistic lock
						if ( gumball.countGumballs > 0)
							gumball.countGumballs-- ;
						gumball.save(flush: true); // default optimistic lock
					}
				}
				
			}
			
			// send machine state to client
			flash.state = gumballMachine.getCurrentState() 
			flash.model = modelNum 
			flash.serial = serialNum 
			flash.hash = (gumballMachine.getCurrentState() +  modelNum + serialNum).encodeAsSHA256()
						
			// report a message to user
			flash.message = gumballMachine.getAbout()

			// render view
			render(view: "index")
		}
		else {
			render(view: "/error")
		}
	}
}

