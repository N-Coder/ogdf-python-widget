import json
import uuid


def color_to_dict(color):
    color = {"r": color.red(),
             "g": color.green(),
             "b": color.blue(),
             "a": color.alpha()}
    return color


def node_to_dict(ga, node):
    return {"id": str(node.index()),
            "name": str(ga.label(node)),
            "x": int(ga.x(node) + 0.5),
            "y": int(ga.y(node) + 0.5),
            "shape": ga.shape(node),
            "fillColor": color_to_dict(ga.fillColor(node)),
            "strokeColor": color_to_dict(ga.strokeColor(node)),
            "strokeWidth": ga.strokeWidth(node),
            "nodeWidth": ga.width(node),
            "nodeHeight": ga.height(node)}


def link_to_dict(ga, link):
    bends = []
    for i, point in enumerate(ga.bends(link)):
        bends.append([int(point.m_x + 0.5), int(point.m_y + 0.5)])

    link_dict = {"id": str(link.index()),
                 "label": str(ga.label(link)),
                 "source": str(link.source().index()),
                 "target": str(link.target().index()),
                 "t_shape": ga.shape(link.target()),
                 "strokeColor": color_to_dict(ga.strokeColor(link)),
                 "strokeWidth": ga.strokeWidth(link),
                 "sx": int(ga.x(link.source()) + 0.5),
                 "sy": int(ga.y(link.source()) + 0.5),
                 "tx": int(ga.x(link.target()) + 0.5),
                 "ty": int(ga.y(link.target()) + 0.5),
                 "arrow": ga.arrowType(link) == 1,
                 "bends": bends}

    if len(bends) > 0:
        link_dict["label_x"] = bends[0][0]
        link_dict["label_y"] = bends[0][1]
    else:
        link_dict["label_x"] = (link_dict["sx"] + link_dict["tx"]) / 2
        link_dict["label_y"] = (link_dict["sy"] + link_dict["ty"]) / 2

    return link_dict


def export_html(filename, nodes_data, links_data, force_directed):
    from importlib_resources import read_text
    data = read_text("ogdf_python_widget", filename)
    data = data.replace("let nodes_data = []", "let nodes_data = " + json.dumps(nodes_data))
    data = data.replace("let links_data = []", "let links_data = " + json.dumps(links_data))
    # the G is needed because CSS3 selector doesnt support ID selectors that start with a digit
    data = data.replace("placeholderId", 'G' + uuid.uuid4().hex)
    if not force_directed:
        data = data.replace("let forceDirected = true;", "let forceDirected = false;")
    return data


def GraphAttributes_to_html(self):
    from ogdf_python import ogdf
    if isinstance(self, ogdf.Graph):
        nodes_data = [{"id": str(node.index()), "name": str(node.index())}
                      for node in self.nodes]
        links_data = [{"source": str(edge.source().index()), "target": str(edge.target().index())}
                      for edge in self.edges]
        return export_html('basicGraphRepresentation.html', nodes_data, links_data, True)
    elif isinstance(self, ogdf.GraphAttributes):
        nodes_data = [node_to_dict(self, node) for node in self.constGraph().nodes]
        links_data = [link_to_dict(self, link) for link in self.constGraph().edges]
        return export_html('basicGraphRepresentation.html', nodes_data, links_data, False)
    else:
        return repr(self)


def pythonize_to_html():
    from ogdf_python import ogdf
    ogdf.Graph._repr_html_ = GraphAttributes_to_html
    ogdf.GraphAttributes._repr_html_ = GraphAttributes_to_html
    ogdf.ClusterGraph._repr_html_ = GraphAttributes_to_html
    ogdf.ClusterGraphAttributes._repr_html_ = GraphAttributes_to_html
