let d3 = require("d3");

export function getSVGType(shape) {
    if (shape === "RoundedRect" || shape === "Rect") {
        return document.createElementNS("http://www.w3.org/2000/svg", "rect");
    } else if (shape === "Ellipse") {
        return document.createElementNS("http://www.w3.org/2000/svg", "circle");
    } else {
        return document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    }
}

export function constructNode(nodeData, node_holder, text_holder, widgetView, basic) {
    let node = node_holder
        .data([nodeData])
        .enter()
        .append(function (d) {
            return getSVGType(d.shape);
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
        .attr('points', function (d) {
            return getPath(d.shape, d.nodeWidth, d.nodeHeight, d.x, d.y)
        })
        .attr("rx", function (d) {
            return d.shape === "RoundedRect" ? d.nodeWidth / 10 : null
        })
        .attr("ry", function (d) {
            return d.shape === "RoundedRect" ? d.nodeHeight / 10 : null
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
            if (d.arrow && d.t_shape === "Ellipse" && d.source !== d.target) {
                return "url(#endCircle)";
            } else if (d.source !== d.target) {
                return "url(#endSquare)";
            } else {
                return null
            }
        })
        .attr("d", function (d) {
            return widgetView.getPathForLine(d.sx, d.sy, d.bends, d.tx, d.ty, d.t_shape, d.source, d.target, d);
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
            return widgetView.getPathForLine(d.sx, d.sy, d.bends, d.tx, d.ty, d.t_shape, d.source, d.target, d);
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
            if (d.arrow && d.t_shape === "Ellipse" && d.source !== d.target) {
                return "url(#endCircle)";
            } else if (d.source !== d.target) {
                return "url(#endSquare)";
            } else {
                return null
            }
        })
        .attr("d", function (d) {
            return widgetView.getPathForLine(d.sx, d.sy, d.bends, d.tx, d.ty, d.t_shape, d.source, d.target, d);
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
            return sourceLink.curveX === undefined ? (sourceLink.sx + sourceLink.tx) / 2 : sourceLink.curveX
        })
        .attr("y1", function (d) {
            let sourceLink = widgetView.links[d.sourceId]
            return sourceLink.curveY === undefined ? (sourceLink.sy + sourceLink.ty) / 2 : sourceLink.curveY
        })
        .attr("x2", function (d) {
            let targetLink = widgetView.links[d.targetId]
            return targetLink.curveX === undefined ? (targetLink.sx + targetLink.tx) / 2 : targetLink.curveX
        })
        .attr("y2", function (d) {
            let targetLink = widgetView.links[d.targetId]
            return targetLink.curveY === undefined ? (targetLink.sy + targetLink.ty) / 2 : targetLink.curveY
        })
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class", "virtualLink");
}

export function getPath(shape, nodeWidth, nodeHeight, x, y) {
    let hexagonHalfHeight = 0.43301270189222 * nodeHeight;
    let pentagonHalfWidth = 0.475528258147577 * nodeWidth;
    let pentagonSmallHeight = 0.154508497187474 * nodeHeight;
    let pentagonSmallWidth = 0.293892626146236 * nodeWidth;
    let pentagonHalfHeight = 0.404508497187474 * nodeHeight;
    let octagonHalfWidth = 0.461939766255643 * nodeWidth;
    let octagonSmallWidth = 0.191341716182545 * nodeWidth;
    let octagonHalfHeight = 0.461939766255643 * nodeHeight;
    let octagonSmallHeight = 0.191341716182545 * nodeHeight;

    let points = []
    switch (shape) {
        case "Triangle":
            points = [
                x, y - nodeHeight / 2,
                x - nodeWidth / 2, y + nodeHeight / 2,
                x + nodeWidth / 2, y + nodeHeight / 2
            ]
            break;
        case "InvTriangle":
            points = [x, y + nodeHeight / 2,
                x - nodeWidth / 2, y - nodeHeight / 2,
                x + nodeWidth / 2, y - nodeHeight / 2
            ]
            break;
        case "Pentagon":
            points = [
                x, y - nodeHeight / 2,
                x + pentagonHalfWidth, y - pentagonSmallHeight,
                x + pentagonSmallWidth, y + pentagonHalfHeight,
                x - pentagonSmallWidth, y + pentagonHalfHeight,
                x - pentagonHalfWidth, y - pentagonSmallHeight
            ]
            break;
        case "Hexagon":
            points = [
                x + nodeWidth / 4, y + hexagonHalfHeight,
                x - nodeWidth / 4, y + hexagonHalfHeight,
                x - nodeWidth / 2, y,
                x - nodeWidth / 4, y - hexagonHalfHeight,
                x + nodeWidth / 4, y - hexagonHalfHeight,
                x + nodeWidth / 2, y
            ]
            break;
        case "Octagon":
            points = [
                x + octagonHalfWidth, y + octagonSmallHeight,
                x + octagonSmallWidth, y + octagonHalfHeight,
                x - octagonSmallWidth, y + octagonHalfHeight,
                x - octagonHalfWidth, y + octagonSmallHeight,
                x - octagonHalfWidth, y - octagonSmallHeight,
                x - octagonSmallWidth, y - octagonHalfHeight,
                x + octagonSmallWidth, y - octagonHalfHeight,
                x + octagonHalfWidth, y - octagonSmallHeight
            ]
            break;
        case "Rhomb":
            points = [
                x + nodeWidth / 2, y,
                x, y + nodeHeight / 2,
                x - nodeWidth / 2, y,
                x, y - nodeHeight / 2
            ]
            break;
        case "Trapeze":
            points = [
                x - nodeWidth / 2, y + nodeHeight / 2,
                x + nodeWidth / 2, y + nodeHeight / 2,
                x + nodeWidth / 4, y - nodeHeight / 2,
                x - nodeWidth / 4, y - nodeHeight / 2
            ]
            break;
        case "InvTrapeze":
            points = [
                x - nodeWidth / 2, y - nodeHeight / 2,
                x + nodeWidth / 2, y - nodeHeight / 2,
                x + nodeWidth / 4, y + nodeHeight / 2,
                x - nodeWidth / 4, y + nodeHeight / 2
            ]
            break;
        case "Parallelogram":
            points = [
                x - nodeWidth / 2, y + nodeHeight / 2,
                x + nodeWidth / 4, y + nodeHeight / 2,
                x + nodeWidth / 2, y - nodeHeight / 2,
                x - nodeWidth / 4, y - nodeHeight / 2
            ]
            break;
        case "InvParallelogram":
            points = [
                x - nodeWidth / 2, y - nodeHeight / 2,
                x + nodeWidth / 4, y - nodeHeight / 2,
                x + nodeWidth / 2, y + nodeHeight / 2,
                x - nodeWidth / 4, y + nodeHeight / 2
            ]
            break;
    }

    let polygonString = ""

    for (let i = 0; i < points.length; i++) {
        polygonString += points[i];
        if (i % 2 === 0) {
            polygonString += ","
        } else if (i % 2 === 1) {
            polygonString += " "
        }
    }

    return polygonString
}