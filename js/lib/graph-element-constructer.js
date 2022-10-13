let d3 = require("d3");

export function constructNode(nodeData, node_holder, text_holder, widgetView, basic) {
    let node = node_holder
        .data([nodeData])
        .enter()
        .append(function (d) {
            if (d.shape === 0) {
                return document.createElementNS("http://www.w3.org/2000/svg", "rect");
            } else {
                return document.createElementNS("http://www.w3.org/2000/svg", "circle");
            }
        })
        .attr("class", "node")
        .attr("width", function (d) {
            return d.nodeWidth
        })
        .attr("height", function (d) {
            return d.nodeHeight
        })
        .attr("x", function (d) {
            return d.x - d.nodeWidth / 2
        })
        .attr("y", function (d) {
            return d.y - d.nodeHeight / 2
        })
        .attr("cx", function (d) {
            return d.x
        })
        .attr("cy", function (d) {
            return d.y
        })
        .attr("id", function (d) {
            return d.id
        })
        .attr("r", function (d) {
            return d.nodeHeight / 2
        })
        .attr("fill", function (d) {
            return widgetView.getColorStringFromJson(d.fillColor)
        })
        .attr("stroke", function (d) {
            return widgetView.getColorStringFromJson(d.strokeColor)
        })
        .attr("stroke-width", function (d) {
            return d.strokeWidth
        })
        .on("click", function (event, d) {
            if (!basic && !widgetView.isNodeMovementEnabled) {
                widgetView.send({
                    "code": "nodeClicked",
                    "id": d.id,
                    "altKey": event.altKey,
                    "ctrlKey": event.ctrlKey
                });
            }
        })

    let text = text_holder
        .data([nodeData])
        .enter()
        .append("text")
        .attr("class", "nodeLabel")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "black")
        .attr("stroke-width", 1)
        .attr("stroke", "white")
        .attr("paint-order", "stroke")
        .attr("id", function (d) {
            return d.id
        })
        .text(function (d) {
            return d.name;
        })
        .style("font-size", "1em")
        .attr("transform", function (d) { //<-- use transform it's not a g
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on("click", function (event, d) {
            if (!basic && !widgetView.isNodeMovementEnabled) {
                widgetView.send({
                    "code": "nodeClicked",
                    "id": d.id,
                    "altKey": event.altKey,
                    "ctrlKey": event.ctrlKey
                });
            }
        })

    if (widgetView.isNodeMovementEnabled) {
        node.call(widgetView.node_drag_handler)
        text.call(widgetView.node_drag_handler)
    }
}

export function constructLink(linkData, line_holder, line_text_holder, line_click_holder, widgetView, clickThickness, basic) {
    line_holder
        .data([linkData])
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("id", function (d) {
            return d.id
        })
        .attr("marker-end", function (d) {
            if (d.arrow && d.t_shape === 0 && d.source !== d.target) {
                return "url(#endSquare)";
            } else if (d.arrow && d.t_shape !== 0 && d.source !== d.target) {
                return "url(#endCircle)";
            } else {
                return null;
            }
        })
        .attr("d", function (d) {
            return widgetView.getPathForLine(d.sx, d.sy, d.bends, d.tx, d.ty, d.t_shape, d.source, d.target);
        })
        .attr("stroke", function (d) {
            return widgetView.getColorStringFromJson(d.strokeColor)
        })
        .attr("stroke-width", function (d) {
            return d.strokeWidth
        })
        .attr("fill", "none");

    line_text_holder
        .data([linkData])
        .enter()
        .append("text")
        .attr("class", "linkLabel")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "black")
        .attr("stroke-width", 1)
        .attr("stroke", "white")
        .attr("paint-order", "stroke")
        .attr("id", function (d) {
            return d.id
        })
        .text(function (d) {
            return d.label;
        })
        .style("font-size", "0.5em")
        .attr("transform", function (d) { //<-- use transform it's not a g
            return "translate(" + d.label_x + "," + d.label_y + ")";
        })

    if (basic) return

    line_click_holder
        .data([linkData])
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("id", function (d) {
            return d.id
        })
        .attr("d", function (d) {
            return widgetView.getPathForLine(d.sx, d.sy, d.bends, d.tx, d.ty, d.t_shape, d.source, d.target);
        })
        .attr("stroke", "transparent")
        .attr("stroke-width", function (d) {
            return Math.max(d.strokeWidth, clickThickness)
        })
        .attr("fill", "none")
        .on("click", function (event, d) {
            widgetView.send({"code": "linkClicked", "id": d.id, "altKey": event.altKey, "ctrlKey": event.ctrlKey});
        })
}

export function constructClusters(clusterId, widgetView, calcNodeBoundingBox = true) {
    let cluster = widgetView.clusters[clusterId]
    for (let i = 0; i < cluster.children.length; i++) {
        constructClusters(cluster.children[i], widgetView, calcNodeBoundingBox)
    }

    if (calcNodeBoundingBox) widgetView.recalculateClusterBoundingBox(cluster)
    widgetView.calculateClusterSize(cluster)

    let alreadyExists = !d3.select(widgetView.svg)
        .selectAll(".cluster")
        .filter(function (d) {
            return d.id === cluster.id;
        }).empty()

    if (alreadyExists)
        widgetView.updateCluster(cluster, false)
    else
        widgetView.constructCluster(cluster, widgetView.cluster_holder, widgetView)
}

export function constructForceLink(linkData, line_holder, widgetView, basic) {
    line_holder
        .data([linkData])
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("id", function (d) {
            return d.id
        })
        .attr("marker-end", function (d) {
            if (d.arrow && d.t_shape === 0 && d.target !== d.source) {
                return "url(#endSquare)";
            } else if (d.arrow && d.t_shape !== 0 && d.target !== d.source) {
                return "url(#endCircle)";
            } else {
                return null;
            }
        })
        .attr("d", function (d) {
            return widgetView.getPathForLine(d.sx, d.sy, d.bends, d.tx, d.ty, d.t_shape, d.source, d.target);
        })
        .attr("stroke", function (d) {
            return widgetView.getColorStringFromJson(d.strokeColor)
        })
        .attr("stroke-width", function (d) {
            return d.strokeWidth
        })
        .attr("fill", "none")
        .on("click", function (event, d) {
            if (basic) return
            widgetView.send({
                "code": "linkClicked",
                "id": d.id,
                "altKey": event.altKey,
                "ctrlKey": event.ctrlKey
            });
        });
}

export function constructVirtualLink(vLinkData, line_holder, widgetView) {
    line_holder
        .data([vLinkData])
        .enter()
        .append("line")
        .style("stroke-dasharray", ("3, 3"))
        .attr("x1", function (d) {
            let sourceLink = widgetView.links[d.sourceId]
            return (sourceLink.sx + sourceLink.tx) / 2
        })
        .attr("y1", function (d) {
            let sourceLink = widgetView.links[d.sourceId]
            return (sourceLink.sy + sourceLink.ty) / 2
        })
        .attr("x2", function (d) {
            let targetLink = widgetView.links[d.targetId]
            return (targetLink.sx + targetLink.tx) / 2
        })
        .attr("y2", function (d) {
            let targetLink = widgetView.links[d.targetId]
            return (targetLink.sy + targetLink.ty) / 2
        })
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class", "virtualLink");
}