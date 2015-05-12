var sys = require("sys"),
	path = require("path"),
	url = require("url"),
	fs = require("fs"),
	jQuery = require("jquery");

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

function dirTree(filename, url) {
    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            name: path.basename(filename),
            url: url,
            link: "<a href='http://" + url + "'>" + path.basename(filename) + "</a><br>",
            parentlink: "<a href='http://" + path.dirname(url) + "'>Up a level</a><br>"
        };

	if (stats.isDirectory()) {
        info.type = "folder";
        info.children = fs.readdirSync(filename).map(function(child) {
        	childUrl = (child.charAt(0) == '/' ? url + child : url + '/' + child);

            return dirTree(filename + '/' + child, childUrl);
        });
    } else {
        info.type = "file";
    }

    return info;
}

function dirPage(dir, response) {
    response.writeHeader(200, {"Content-Type": "text/html"}); 
    response.write("<html>");

    var folders = "";
    var files = "";

	response.write(dir.parentlink);
	for(var i=0; i<dir.children.length; i++) {
		if (dir.children[i].type == 'folder') {
			folders += "&nbsp; &nbsp; &nbsp;" + dir.children[i].link;
		} else {
			files += dir.children[i].link;
		}
	}
	response.write(folders);
	response.write("<hr>");
	response.write(files);

	response.write("</html>");
	response.end();	
}
function tabPage(dir, response) {
	response.sendFile(__dirname + '/reader.html');
	fs.readFile(dir.path, "binary", function(err, file) {  
		if(err) {  
	        response.writeHeader(500, {"Content-Type": "text/plain"});  
	        response.write(err + "\n");  
	        response.end();
	    }  
	    else{
	    	io.on('connection', function(socket) {
	    		lines = file.split('\n');
	    		var startTime = Date.now(); 
				// console.log(startTime);
				line = 0;
	    		var sendLine = setInterval(function() {
	    			for (var i=0; i<=1; i++) {
			    		socket.emit('tab', lines[line++]);
			    		if (lines[line] == null) {
			    			clearInterval(sendLine);
			    		}
	    			}
	    		}, 1000);
	    	});
	    }  
    });
}

io.on('connection', function(socket) {
	console.log(socket.conn.remoteAddress + ' connected');
});
app.get('/*', function(request,response){
    var reqURL = request.url;
    var full_path = decodeURI(path.join(process.cwd(),reqURL));
    console.log('host: ' + request.get('host'));
    console.log('we have a buyer: ' + reqURL);
    console.log('full_path: ' + full_path);

    path.exists(full_path, function(exists){
		if (exists) {
	        sys.puts(full_path + " indeed exists");
	    	var dir = dirTree(full_path, request.get('host') + reqURL);
	    	if (dir.type == "folder") {
	  			dirPage(dir, response);
	    	} else {
	    		tabPage(dir, response);
	    	}
		} else {
			response.writeHeader(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");  
            response.end();
        }
	});
});

http.listen(80, function(){
  console.log('listening on *:80');
});
sys.puts("Server Running on 80");
