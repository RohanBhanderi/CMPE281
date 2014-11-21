package grailshelloworld

class HelloController {

    def index() { 
		render "<H1>Hello World.</H1>"
	}
	
	def hiGroovy() {
		render "<H1>Hi Groovy.</H1>"
	}
	
	def hiGG() {
		render "<H1>Hi Groovy and Grails.</H1>"
	}
}
