
module.exports = function(RED) {
	
	//recursive function searching for the Next node  
	 function getNextNode(id, ids, counter){
		if(ids.indexOf(id) !== -1)
			return;
		ids.push(id);
		var node = RED.nodes.getNode(id)
		counter += node.type === 'next' ? -1 : node.type === 'each' ? 1 : 0
		if(!node || node.type === 'next' && counter === 0){
			return node;
		}
		else{
			for(var i in node.wires){
				for(var j in node.wires[i]) {
					var n = getNextNode(node.wires[i][j], ids, counter);
					if(n)
						return n;
				}
			}
			return;
		}
	}

	function EachNode(n) {
	    RED.nodes.createNode(this,n);
	    var node = this;
	    node.args = n;
	
	    try {
	        node.on("input", function(msg) {
	        		if(!msg.eachData)
	                msg.eachData = {};
	            if(!msg.eachData[node.id])
	                msg.eachData[node.id] = {payload:msg.payload};
	            var data = msg.eachData[node.id];
	            if(data.eachIndex != null)
	            {
	                node.send(msg);
	            }
	            else
	            {
	            		if(!msg.loops)
	            			msg.loops = [];
	            		msg.loops.push(node.id);

	            		msg.eachData[node.id].eachIndex = 0;
	            		msg.eachData[node.id].eachItems = data.payload;
                  msg.eachData[node.id].eachResult = [];
                  msg.payload = msg.eachData[node.id].eachItems[data.eachIndex];
	                    
	                if(data.payload && data.payload.length && data.payload.length > 0) {
	                		node.send(msg);
	                }
	                else 
	                {
	                		var nextNode = getNextNode(node.id, [], 0);
                      if(nextNode)
                      	nextNode.receive(msg);
                      else
                      	node.send(msg);
	                }
	            }
	        });
	    } catch(err) {
	
	        node.error(err);
	    }
	}
	
	RED.nodes.registerType("each",EachNode);
	
	function NextNode(n) {
	    RED.nodes.createNode(this,n);
	    var node = this;
	    node.args = n;
	    
	    // if(!node.args.eachNode)
	    //     return node.warn('missing each node');
	    
	    node.on("input", function(msg) {
	        try {
	            var eachNodeId = msg.loops[msg.loops.length-1];
	            var data = msg.eachData[eachNodeId];
	
	            if(data.eachIndex != null)
	            {
	                if(data.eachIndex +1 < data.eachItems.length)
	                {
	                    msg.eachData[eachNodeId].eachResult.push(msg.eachData[eachNodeId].payload);
	                    msg.eachData[eachNodeId].eachIndex++;
	                    msg.payload = data.eachItems[msg.eachData[eachNodeId].eachIndex];
	                    var eachNode =  RED.nodes.getNode(eachNodeId);
	                    if(eachNode) 
	                    {
	                        eachNode.receive(msg);
	                    }
	                }
	                else 
	                {
	                    msg.eachData[eachNodeId].eachResult.push(msg.eachData[eachNodeId].payload);
	                    //msg.topic = "each";
	                    msg.payload = msg.eachData[eachNodeId].eachResult;
	                    delete msg.eachData[eachNodeId];
	                    msg.loops.pop();
	                    node.send(msg);
	                }
	            }
	            else 
	            {
	                node.send(msg);
	            }
	        } catch(err) {
	            node.error(err);
	        }
	    });
	   
	}
	
	RED.nodes.registerType("next",NextNode);
	
	
	function BreakNode(n) {
	    RED.nodes.createNode(this,n);
	    var node = this;
	    node.args = n;
	    
	    if(!node.args.eachNode)
	        return node.warn('missing each node');
	    
	    node.on("input", function(msg) {
	        try {
	            var eachNodeId = node.args.eachNode;
	            var data = msg.eachData[eachNodeId];
	
	            if(data.eachIndex != null)
	            {
	                msg.eachData[eachNodeId].eachResult.push(data.payload);
	                //msg.topic = "each";
	                msg.payload = msg.eachData[eachNodeId].eachResult;
	                delete msg.eachData[eachNodeId];
	                node.send(msg);
	            }
	            else 
	            {
	                node.send(msg);
	            }
	        } catch(err) {
	            node.error(err);
	        }
	    });
	   
	}
	
	RED.nodes.registerType("break",BreakNode);
}