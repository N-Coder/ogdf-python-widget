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

export function doesPatternExist(name, widgetView) {
    let t = d3.select(widgetView.svg)
        .selectAll("#" + name)
    return !t.empty()
}

export function getPatternName(node) {
    return "x" + node.fillPattern + "x" + node.nodeWidth + "x" + node.nodeHeight + "x"
        + node.fillColor.r + "x" + node.fillColor.g + "x" + node.fillColor.b + "x" + node.fillColor.a + "x"
        + node.bgColor.r + "x" + node.bgColor.g + "x" + node.bgColor.b + "x" + node.bgColor.a + "x"
}

export function createPattern(nodeData, patternName, widgetView) {
    let fillColor = widgetView.getColorStringFromJson(nodeData.fillColor)
    let bGColor = widgetView.getColorStringFromJson(nodeData.bgColor)
    let svg = d3.select(widgetView.svg)

    if (nodeData.fillPattern === "Horizontal" || nodeData.fillPattern.startsWith("Dense")) {
        let amount;

        if (nodeData.fillPattern === "Horizontal") amount = 1
        if (nodeData.fillPattern.startsWith("Dense")) {
            let matches = nodeData.fillPattern.match(/\d+$/)
            if (matches)
                amount = parseInt(matches[0]) + 1
        }

        constructHorizontalPattern(amount, nodeData.nodeHeight, nodeData.nodeWidth, fillColor, bGColor, patternName, svg)
    } else if (nodeData.fillPattern === "Vertical") {
        constructVerticalPattern(4, nodeData.nodeHeight, nodeData.nodeWidth, fillColor, bGColor, patternName, svg)
    } else if (nodeData.fillPattern === "Cross") {
        constructCrossPattern(nodeData.nodeHeight, nodeData.nodeWidth, fillColor, bGColor, patternName, svg)
    } else if (nodeData.fillPattern.endsWith("Diagonal")) {
        constructDiagonalPattern(nodeData.fillPattern.startsWith("Backward"), nodeData.nodeHeight, nodeData.nodeWidth, fillColor, bGColor, patternName, svg)
    } else if (nodeData.fillPattern === "DiagonalCross") {
        constructDiagonalCrossPattern(nodeData.nodeHeight, nodeData.nodeWidth, fillColor, bGColor, patternName, svg)
    }
}

function getBlankPatterns(svg, name) {
    return svg.append("svg:defs").selectAll("pattern")
        .data([name])
        .enter()
        .append("svg:pattern")
        .attr("id", name)
        .attr("width", 1)
        .attr("height", 1)
        .attr("patternUnits", "objectBoundingBox")
}

function constructHorizontalPattern(amount, nodeHeight, nodeWidth, fillColor, bGColor, name, svg) {
    let height = nodeHeight / amount / 2
    let pattern = getBlankPatterns(svg, name)

    pattern.append("svg:rect")
        .attr("x", "0")
        .attr("y", "0")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("fill", bGColor)
        .style("stroke", "none")

    for (let i = 0; i < amount; i++) {
        pattern.append("svg:rect")
            .attr("x", "0")
            .attr("y", "" + (height * 2 * i))
            .attr("width", nodeWidth)
            .attr("height", "" + height)
            .attr("fill", fillColor)
            .style("stroke", "none")
    }
}

function constructVerticalPattern(amount, nodeHeight, nodeWidth, fillColor, bGColor, name, svg) {
    let width = nodeWidth / amount / 2
    let pattern = getBlankPatterns(svg, name)

    pattern.append("svg:rect")
        .attr("x", "0")
        .attr("y", "0")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("fill", bGColor)
        .style("stroke", "none")

    for (let i = 0; i < amount; i++) {
        pattern.append("svg:rect")
            .attr("x", "" + (width * 2 * i))
            .attr("y", "0")
            .attr("width", "" + width)
            .attr("height", nodeHeight)
            .attr("fill", fillColor)
            .style("stroke", "none")
    }
}

function constructCrossPattern(nodeHeight, nodeWidth, fillColor, bGColor, name, svg) {
    let pattern = getBlankPatterns(svg, name)

    pattern.append("svg:rect")
        .attr("x", "0")
        .attr("y", "0")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("fill", bGColor)
        .style("stroke", "none")

    pattern.append("svg:rect")
        .attr("x", "0")
        .attr("y", "" + (nodeHeight / 5 * 2))
        .attr("width", nodeWidth)
        .attr("height", nodeHeight / 5)
        .attr("fill", fillColor)
        .style("stroke", "none")

    pattern.append("svg:rect")
        .attr("x", "" + (nodeWidth / 5 * 2))
        .attr("y", "0")
        .attr("width", nodeWidth / 5)
        .attr("height", nodeHeight)
        .attr("fill", fillColor)
        .style("stroke", "none")
}

function constructDiagonalCrossPattern(nodeHeight, nodeWidth, fillColor, bGColor, name, svg) {
    let pattern = getBlankPatterns(svg, name)

    pattern.append("svg:rect")
        .attr("x", "0")
        .attr("y", "0")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("fill", bGColor)
        .style("stroke", "none")

    pattern.append("svg:rect")
        .attr("x", -nodeWidth)
        .attr("y", "" + (nodeHeight / 5 * 2))
        .attr("width", nodeWidth * 3)
        .attr("height", nodeHeight / 5)
        .attr("fill", fillColor)
        .attr("transform", "rotate(45," + nodeWidth / 2 + "," + nodeHeight / 2 + ")")
        .style("stroke", "none")

    pattern.append("svg:rect")
        .attr("x", -nodeWidth)
        .attr("y", "" + (nodeHeight / 5 * 2))
        .attr("width", nodeWidth * 3)
        .attr("height", nodeHeight / 5)
        .attr("fill", fillColor)
        .attr("transform", "rotate(-45," + nodeWidth / 2 + "," + nodeHeight / 2 + ")")
        .style("stroke", "none")
}

function constructDiagonalPattern(isBackwards, nodeHeight, nodeWidth, fillColor, bGColor, name, svg) {
    let width = nodeWidth / 4 / 2
    let pattern = getBlankPatterns(svg, name)
    let angle = 20
    if (isBackwards) angle *= -1

    pattern.append("svg:rect")
        .attr("x", "0")
        .attr("y", "0")
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("fill", bGColor)
        .style("stroke", "none")

    for (let i = -1; i <= 4; i++) {
        pattern.append("svg:rect")
            .attr("x", "" + (width * 2 * i + width))
            .attr("y", "" + -width)
            .attr("width", "" + width)
            .attr("height", nodeHeight + 2 * width)
            .attr("fill", fillColor)
            .attr("transform", "rotate(" + angle + "," + (((width * 2 * i + width) + width / 2)) + "," + (nodeHeight / 2) + ")")
            .style("stroke", "none")
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
            return getShapePath(d.shape, d.nodeWidth, d.nodeHeight, d.x, d.y)
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
            if (d.fillPattern === "Solid")
                return widgetView.getColorStringFromJson(d.fillColor)

            if (d.fillPattern === "None")
                //todo test
                return "transparent"

            let patternName = getPatternName(nodeData)

            if (!doesPatternExist(patternName, widgetView)) {
                createPattern(nodeData, patternName, widgetView)
            }

            return "url(#" + patternName + ")"
        })
        .attr("stroke", function (d) {
            return widgetView.getColorStringFromJson(d.strokeColor)
        })
        .attr("stroke-width", function (d) {
            return d.strokeWidth
        })
        .attr("stroke-dasharray", function (d) {
            return getLineDash(d.strokeWidth, d.strokeType)
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
        .attr("stroke-dasharray", function (d) {
            return getLineDash(d.strokeWidth, d.strokeType)
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
        .attr("stroke-dasharray", function (d) {
            return getLineDash(d.strokeWidth, d.strokeType)
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

export function getShapePath(shape, nodeWidth, nodeHeight, x, y) {
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

export function getLineDash(strokeWidth, strokeType) {
    switch (strokeType) {
        case "Solid":
            return null;
        case "Dash":
            return 4 * strokeWidth + "," + 2 * strokeWidth;
        case "Dot":
            return 1 * strokeWidth + "," + 2 * strokeWidth;
        case "Dashdot":
            return 4 * strokeWidth + "," + 2 * strokeWidth + "," + 1 * strokeWidth + "," + 2 * strokeWidth;
        case "Dashdotdot":
            return 4 * strokeWidth + "," + 2 * strokeWidth + "," + 1 * strokeWidth + "," + 2 * strokeWidth + "," + 1 * strokeWidth + "," + 2 * strokeWidth;
    }
}