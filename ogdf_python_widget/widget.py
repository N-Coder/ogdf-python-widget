import json
import random
from datetime import datetime

import cppyy
import ipywidgets as widgets
from traitlets import Unicode, Dict, Integer, Float, Bool
from ogdf_python import ogdf

# See js/lib/ogdf-python-widget-view.js for the frontend counterpart to this file.
from ogdf_python_widget.pythonize import color_to_dict


def get_link_stabilizer(source_id, target_id):
    twin_link_connector = {"id": source_id + target_id,
                           "virtualLink": True,
                           "label": "",
                           "source": source_id,
                           "target": target_id,
                           "t_shape": "Ellipse",
                           'strokeColor': {
                               'r': 100,
                               'g': 0,
                               'b': 0,
                               'a': 0
                           },
                           "strokeWidth": 1,
                           "sx": 0,
                           "sy": 0,
                           "tx": 0,
                           "ty": 0,
                           "arrow": False,
                           "bends": [],
                           "label_x": 0,
                           "label_y": 0}
    return twin_link_connector


def wait_for_frontend(func):
    def my_wrap(self, *args, **kwargs):
        if self.widget_ready:
            return func(self, *args, **kwargs)
        else:
            print("Try again the widget isn't ready yet.")
            return

    return my_wrap


@widgets.register
class Widget(widgets.DOMWidget):
    # Name of the widget view class in front-end
    _view_name = Unicode('WidgetView').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('WidgetModel').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('ogdf-python-widget').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('ogdf-python-widget').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('^0.1.0').tag(sync=True)

    # Version of the front-end module containing widget model
    _model_module_version = Unicode('^0.1.0').tag(sync=True)

    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.

    width = Integer(960).tag(sync=True)
    height = Integer(540).tag(sync=True)
    x_pos = Float(0).tag(sync=True)
    y_pos = Float(0).tag(sync=True)
    zoom = Float(1).tag(sync=True)

    click_thickness = Integer(10).tag(sync=True)
    grid_size = Integer(0).tag(sync=True)
    animation_duration = Integer(1000).tag(sync=True)

    force_config = Dict().tag(sync=True)

    rescale_on_resize = Bool(True).tag(sync=True)
    node_movement_enabled = Bool(False).tag(sync=True)

    supported_shapes = ["Triangle", "InvTriangle", "Pentagon", "Hexagon", "Octagon", "Rhomb", "Trapeze", "InvTrapeze",
                        "Parallelogram", "InvParallelogram", "Rect", "Ellipse", "RoundedRect"]

    supported_stroke_types = ['Solid', 'Dash', 'Dot', 'Dashdot', 'Dashdotdot']

    # callbacks
    on_node_click_callback = None
    on_link_click_callback = None
    on_svg_click_callback = None
    on_node_moved_callback = None
    on_bend_moved_callback = None
    on_bend_clicked_callback = None
    on_cluster_click_callback = None

    def __init__(self, graph_attributes, debug=False):
        super().__init__()
        self.graph_attributes = graph_attributes
        self.on_msg(self.handle_msg)
        cppyy.include("ogdf/decomposition/DynamicSPQRTree.h")
        self.is_SPQR_tree = isinstance(self.graph_attributes,
                                       cppyy.gbl.ogdf.DynamicSPQRTree) or self.graph_attributes is None
        self.widget_ready = False
        if isinstance(self.graph_attributes, cppyy.gbl.ogdf.ClusterGraphAttributes):
            self.myClusterObserver = MyClusterGraphObserver(self.graph_attributes.constClusterGraph(), self)

        if not self.is_SPQR_tree:
            self.myObserver = MyGraphObserver(self.graph_attributes.constGraph(), self)

        self.debug = debug

    def set_graph_attributes(self, graph_attributes):
        self.graph_attributes = graph_attributes
        self.is_SPQR_tree = isinstance(self.graph_attributes, cppyy.gbl.ogdf.DynamicSPQRTree)
        self.export_graph()
        self.myObserver = MyGraphObserver(self.graph_attributes.constGraph(), self)
        if isinstance(self.graph_attributes, cppyy.gbl.ogdf.ClusterGraphAttributes):
            self.myClusterObserver = MyClusterGraphObserver(self.graph_attributes.constClusterGraph(), self)
        elif self.is_SPQR_tree:
            self.myObserver = MyGraphObserver(self.graph_attributes.constGraph(), self)
        self.stop_force_directed()

    def update_graph_attributes(self, graph_attributes):
        if self.graph_attributes.constGraph() is graph_attributes.constGraph():
            if self.force_config != {} and not self.force_config['stop']:
                self.stop_force_directed()
            self.graph_attributes = graph_attributes
            self.update_all_nodes()
            self.update_all_links()
        else:
            print("Your GraphAttributes need to depend on the same Graph in order to work. \nTo completely update the "
                  "GraphAttributes use set_graph_attributes(GA)")

    def handle_msg(self, *args):
        msg = args[1]
        if self.is_SPQR_tree and 'Clicked' in msg['code']:
            print("Click callbacks are disabled for SPQR-Trees.")
            return
        elif msg['code'] == 'linkClicked':
            if self.on_link_click_callback is not None:
                self.on_link_click_callback(self.get_link_from_id(msg['id']), msg['altKey'], msg['ctrlKey'])
        elif msg['code'] == 'nodeClicked':
            if self.on_node_click_callback is not None:
                self.on_node_click_callback(self.get_node_from_id(msg['id']), msg['altKey'], msg['ctrlKey'])
        elif msg['code'] == 'nodeMoved':
            node = self.get_node_from_id(msg['id'])
            self.move_node_to(node, msg['x'], msg['y'])
            if self.on_node_moved_callback is not None:
                self.on_node_moved_callback(node, msg['x'], msg['y'])
        elif msg['code'] == 'bendMoved':
            link = self.get_link_from_id(msg['linkId'])
            self.move_bend_to(link, msg['x'], msg['y'], msg['bendIndex'])
            if self.on_bend_moved_callback is not None:
                self.on_bend_moved_callback(link, msg['x'], msg['y'], msg['bendIndex'])
        elif msg['code'] == 'bendClicked':
            link = self.get_link_from_id(msg['linkId'])
            if self.on_bend_clicked_callback is not None:
                self.on_bend_clicked_callback(link, msg['bendIndex'], msg['altKey'])
        elif msg['code'] == 'svgClicked':
            if self.on_svg_click_callback is not None:
                self.on_svg_click_callback(msg['x'], msg['y'], msg['altKey'], msg['ctrlKey'], msg['backgroundClicked'])
        elif msg['code'] == 'clusterClicked':
            if self.on_cluster_click_callback is not None:
                self.on_cluster_click_callback(self.get_cluster_from_id(msg['id']), msg['altKey'], msg['ctrlKey'])
        elif msg['code'] == 'widgetReady':
            self.widget_ready = True
            self.export_graph()
        elif msg['code'] == 'positionUpdate':
            self.position_update(msg['nodes'].values())
        elif msg['code'] == 'updateClusterPosition':
            self.update_cluster_position(self.get_cluster_from_id(msg['id']), msg['x'], msg['y'], msg['width'],
                                         msg['height'])
        if self.debug and msg['code'] != 'positionUpdate' and msg['code'] != 'updateClusterPosition':
            print(msg)

    def position_update(self, nodes):
        if self.force_config == {} or self.force_config['stop']:
            return
        for node in nodes:
            n = self.get_node_from_id(node['id'])
            if n is not None:
                self.move_node_to(n, node['x'], node['y'])

    @wait_for_frontend
    def start_force_directed(self, charge_force=-300, force_center_x=None, force_center_y=None,
                             fix_start_position=False):
        if not self.is_SPQR_tree:
            for link in self.graph_attributes.constGraph().edges:
                self.graph_attributes.bends(link).clear()

        if force_center_x is None or force_center_y is None:
            center_coords = self.svgCoords_to_graphCoords(self.width / 2, self.height / 2)
            force_center_x = center_coords['x']
            force_center_y = center_coords['y']

        self.force_config = {"chargeForce": charge_force,
                             "forceCenterX": force_center_x,
                             "forceCenterY": force_center_y,
                             "fixStartPosition": fix_start_position,
                             "stop": False}

    @wait_for_frontend
    def stop_force_directed(self):
        self.force_config = {"stop": True}
        if not self.is_SPQR_tree:
            self.refresh_graph()

    def get_node_from_id(self, node_id):
        for node in self.graph_attributes.constGraph().nodes:
            if node.index() == int(node_id):
                return node

    def get_link_from_id(self, link_id):
        for link in self.graph_attributes.constGraph().edges:
            if link.index() == int(link_id):
                return link

    def get_cluster_from_id(self, cluster_id):
        for cluster in self.graph_attributes.constClusterGraph().clusters:
            if cluster.index() == int(cluster_id):
                return cluster

    def move_node_to(self, node, x, y):
        self.graph_attributes.x[node] = x
        self.graph_attributes.y[node] = y

    def move_bend_to(self, edge, x, y, bend_nr):
        bend = None

        for i, point in enumerate(self.graph_attributes.bends(edge)):
            if i == bend_nr:
                bend = point
                break

        bend.m_x = x
        bend.m_y = y

    def update_cluster_position(self, cluster, x, y, width, height):
        self.graph_attributes.x[cluster] = x
        self.graph_attributes.y[cluster] = y
        self.graph_attributes.width[cluster] = width
        self.graph_attributes.height[cluster] = height

    def refresh_graph(self):
        self.send({"code": "clearGraph"})
        self.export_graph()

    def move_link(self, link):
        self.send({"code": "moveLink", "data": self.link_to_dict(link)})

    def remove_all_bend_movers(self):
        self.send({"code": "removeAllBendMovers"})

    def remove_bend_mover_for_id(self, link_id):
        self.send({"code": "removeBendMoversFor", "data": str(link_id)})

    def move_cluster(self, cluster_id):
        self.send({"code": "moveCluster", "data": cluster_id})

    def remove_all_cluster_movers(self):
        self.send({"code": "removeAllClusterMovers"})

    def update_node(self, node, animated=True):
        self.send({"code": "updateNode", "data": self.node_to_dict(node), "animated": animated})

    def update_link(self, link, animated=True):
        self.send({"code": "updateLink", "data": self.link_to_dict(link), "animated": animated})

    def update_all_nodes(self, animated=True):
        for node in self.graph_attributes.constGraph().nodes:
            self.update_node(node, animated)

    def update_all_links(self, animated=True):
        for link in self.graph_attributes.constGraph().edges:
            self.update_link(link, animated)

    def download_svg(self, file_name=None):
        if file_name is None:
            file_name = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        self.send({"code": "downloadSvg", "fileName": file_name})

    def export_spqr(self, file_name=None):
        if file_name is None:
            file_name = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        self.send({"code": "exportSPQR", "fileName": file_name})

    def import_spqr(self, path):
        file = open(path)
        data = json.load(file)
        self.is_SPQR_tree = True
        self.graph_attributes = None
        self.send({'code': 'initGraph', 'nodes': data['nodes'], 'links': data['links'], 'clusters': {},
                   'rootClusterId': '-1', 'SPQRtree': True, 'virtualLinks': data['virtualLinks']})

    def svgCoords_to_graphCoords(self, svg_x, svg_y):
        g_x = svg_x / self.zoom - self.x_pos / self.zoom
        g_y = svg_y / self.zoom - self.y_pos / self.zoom
        return {'x': g_x, 'y': g_y}

    def node_to_dict(self, node):
        shape = ogdf.toString(ogdf.Shape(self.graph_attributes.shape(node))).decode("ASCII")
        stroke_type = ogdf.toString[ogdf.StrokeType](self.graph_attributes.strokeType(node)).decode("ASCII")
        fill_pattern = ogdf.toString[ogdf.FillPattern](self.graph_attributes.fillPattern(node)).decode("ASCII")

        node_data = {"id": str(node.index()),
                     "name": str(self.graph_attributes.label(node)),
                     "x": int(self.graph_attributes.x(node) + 0.5),
                     "y": int(self.graph_attributes.y(node) + 0.5),
                     "shape": shape if shape in self.supported_shapes else "Rect",
                     "fillColor": color_to_dict(self.graph_attributes.fillColor(node)),
                     "bgColor": color_to_dict(self.graph_attributes.fillBgColor(node)),
                     "strokeColor": color_to_dict(self.graph_attributes.strokeColor(node)),
                     "strokeWidth": self.graph_attributes.strokeWidth(node),
                     "strokeType": stroke_type if stroke_type in self.supported_stroke_types else "Solid",
                     "fillPattern": fill_pattern,
                     "nodeWidth": self.graph_attributes.width(node),
                     "nodeHeight": self.graph_attributes.height(node)}

        if isinstance(self.graph_attributes, cppyy.gbl.ogdf.ClusterGraphAttributes):
            node_data["clusterId"] = str(self.graph_attributes.constClusterGraph().clusterOf(node).index())

        return node_data

    def link_to_dict(self, link):
        bends = []
        for i, point in enumerate(self.graph_attributes.bends(link)):
            bends.append([int(point.m_x + 0.5), int(point.m_y + 0.5)])

        t_shape = ogdf.toString(ogdf.Shape(self.graph_attributes.shape(link.target()))).decode("ASCII")
        stroke_type = ogdf.toString[ogdf.StrokeType](self.graph_attributes.strokeType(link)).decode("ASCII")

        link_dict = {"id": str(link.index()),
                     "label": str(self.graph_attributes.label(link)),
                     "source": str(link.source().index()),
                     "target": str(link.target().index()),
                     "t_shape": t_shape if t_shape in self.supported_shapes else "Rect",
                     "strokeColor": color_to_dict(self.graph_attributes.strokeColor(link)),
                     "strokeWidth": self.graph_attributes.strokeWidth(link),
                     "strokeType": stroke_type if stroke_type in self.supported_stroke_types else "Solid",
                     "sx": int(self.graph_attributes.x(link.source()) + 0.5),
                     "sy": int(self.graph_attributes.y(link.source()) + 0.5),
                     "tx": int(self.graph_attributes.x(link.target()) + 0.5),
                     "ty": int(self.graph_attributes.y(link.target()) + 0.5),
                     "arrow": self.graph_attributes.arrowType(link) == 1,
                     "bends": bends}

        if len(bends) > 0:
            link_dict["label_x"] = bends[0][0]
            link_dict["label_y"] = bends[0][1]
        else:
            link_dict["label_x"] = (link_dict["sx"] + link_dict["tx"]) / 2
            link_dict["label_y"] = (link_dict["sy"] + link_dict["ty"]) / 2

        return link_dict

    def cluster_to_dict(self, cluster):
        nodes = []
        for node in cluster.nodes:
            nodes.append(str(node.index()))

        children_data = []
        for cluster_child in cluster.children:
            children_data.append(str(cluster_child.index()))

        parent_id = None
        if cluster.index() is not self.graph_attributes.constClusterGraph().rootCluster().index():
            parent_id = str(cluster.parent().index())

        return {"id": str(cluster.index()),
                "parentId": parent_id,
                "name": str(self.graph_attributes.label(cluster)),
                "x": int(self.graph_attributes.x(cluster) + 0.5),
                "y": int(self.graph_attributes.y(cluster) + 0.5),
                "clusterWidth": self.graph_attributes.width(cluster),
                "clusterHeight": self.graph_attributes.height(cluster),
                "strokeColor": color_to_dict(self.graph_attributes.strokeColor(cluster)),
                "strokeWidth": self.graph_attributes.strokeWidth(cluster),
                "children": children_data,
                "nodes": nodes}

    def export_spqr_tree(self):
        nodes_data = {}
        links_data = {}
        virtual_links = []

        for graph in self.graph_attributes.tree().nodes:
            skeleton = self.graph_attributes.skeleton(graph)
            node_type = self.graph_attributes.typeOf(graph)

            if node_type == 0:
                fill_color = {'r': 230, 'g': 0, 'b': 0, 'a': 255}
            elif node_type == 1:
                fill_color = {'r': 230, 'g': 230, 'b': 0, 'a': 255}
            else:
                fill_color = {'r': 0, 'g': random.randint(100, 255), 'b': random.randint(100, 255), 'a': 255}

            for node in skeleton.getGraph().nodes:
                node_id = "G" + str(graph.index()) + "N" + str(node.index())
                nodes_data[node_id] = {"id": node_id,
                                       "fillPattern": "Solid",
                                       "name": node_id,
                                       "x": 0,
                                       "y": 0,
                                       "shape": "Ellipse",
                                       "fillColor": fill_color,
                                       'strokeColor': {
                                           'r': 0,
                                           'g': 0,
                                           'b': 0,
                                           'a': 255
                                       },
                                       "strokeWidth": 2,
                                       "nodeWidth": 30,
                                       "nodeHeight": 30}

            for link in self.graph_attributes.skeleton(graph).getGraph().edges:
                link_data = {"id": "G" + str(graph.index()) + "E" + str(link.index()),
                             "label": "",
                             "source": "G" + str(graph.index()) + "N" + str(link.source().index()),
                             "target": "G" + str(graph.index()) + "N" + str(link.target().index()),
                             "t_shape": "Ellipse",
                             'strokeColor': {
                                 'r': 0,
                                 'g': 0,
                                 'b': 0,
                                 'a': 255
                             },
                             "strokeWidth": 1,
                             "sx": 0,
                             "sy": 0,
                             "tx": 0,
                             "ty": 0,
                             "arrow": False,
                             "bends": [],
                             "label_x": 0,
                             "label_y": 0,
                             "isPnode": node_type == 1}

                twin_link = skeleton.twinEdge(link)
                if bool(twin_link):
                    link_data["isVlinkAttached"] = True
                    sourceId = "G" + str(graph.index()) + "E" + str(link.index())
                    targetId = "G" + str(skeleton.twinTreeNode(link).index()) + "E" + str(twin_link.index())
                    duplicate_vlink = False

                    for virtualLink in virtual_links:
                        if virtualLink["sourceId"] == targetId and virtualLink["targetId"] == sourceId:
                            duplicate_vlink = True

                    if not duplicate_vlink:
                        virtual_links.append({"id": sourceId + targetId,
                                              "sourceId": sourceId,
                                              "targetId": targetId})

                    source_id_1 = "G" + str(graph.index()) + "N" + str(link.source().index())
                    target_id_1 = "G" + str(skeleton.twinTreeNode(link).index()) + "N" + str(
                        twin_link.source().index())

                    twin_link_connector_1 = get_link_stabilizer(source_id_1, target_id_1)

                    source_id_2 = "G" + str(graph.index()) + "N" + str(link.target().index())
                    target_id_2 = "G" + str(skeleton.twinTreeNode(link).index()) + "N" + str(
                        twin_link.target().index())

                    twin_link_connector_2 = get_link_stabilizer(source_id_2, target_id_2)

                    links_data[twin_link_connector_1['id']] = twin_link_connector_1
                    links_data[twin_link_connector_2['id']] = twin_link_connector_2

                links_data[link_data['id']] = link_data

        self.send({'code': 'initGraph', 'nodes': nodes_data, 'links': links_data, 'clusters': {},
                   'rootClusterId': '-1', 'SPQRtree': True, 'virtualLinks': virtual_links})
        return

    def export_graph(self):
        if self.graph_attributes is None:
            return

        if self.is_SPQR_tree:
            self.export_spqr_tree()
            self.start_force_directed()
            return

        nodes_data = {}
        links_data = {}

        for node in self.graph_attributes.constGraph().nodes:
            node_data = self.node_to_dict(node)
            nodes_data[node_data["id"]] = node_data

        for link in self.graph_attributes.constGraph().edges:
            link_data = self.link_to_dict(link)
            links_data[link_data['id']] = link_data

        cppyy.include("ogdf/basic/simple_graph_alg.h")
        parallels = ogdf.EdgeArray[ogdf.SListPure['ogdf::edge']](self.graph_attributes.constGraph())
        ogdf.getParallelFreeUndirected(self.graph_attributes.constGraph(), parallels)

        for link in self.graph_attributes.constGraph().edges:
            if parallels[link].empty():
                continue
            parallel_link_ids = [str(link.index())]
            for link2 in parallels[link]:
                parallel_link_ids.append(str(link2.index()))
            for link_id in parallel_link_ids:
                links_data[link_id]["parallel"] = parallel_link_ids

        cluster_data = {}
        root_cluster_id = '-1'
        if isinstance(self.graph_attributes, cppyy.gbl.ogdf.ClusterGraphAttributes):
            root_cluster_id = str(self.graph_attributes.constClusterGraph().rootCluster().index())

            for cluster in self.graph_attributes.constClusterGraph().clusters:
                cluster_dict = self.cluster_to_dict(cluster)
                cluster_data[cluster_dict["id"]] = cluster_dict

        self.send({'code': 'initGraph', 'nodes': nodes_data, 'links': links_data, 'clusters': cluster_data,
                   'rootClusterId': root_cluster_id})


class MyGraphObserver(cppyy.gbl.ogdf.GraphObserver):
    def __init__(self, graph, widget):
        super().__init__(graph)
        self.widget = widget

    def nodeDeleted(self, node):
        self.widget.send({'code': 'deleteNodeById', 'data': str(node.index())})

    def nodeAdded(self, node):
        self.widget.send({'code': 'nodeAdded', 'data': self.widget.node_to_dict(node)})

    def edgeDeleted(self, edge):
        self.widget.send({'code': 'deleteLinkById', 'data': str(edge.index())})

    def edgeAdded(self, edge):
        self.widget.send({'code': 'linkAdded', 'data': self.widget.link_to_dict(edge)})

    def reInit(self):
        self.widget.export_graph()

    def cleared(self):
        self.widget.send({'code': 'clearGraph'})


class MyClusterGraphObserver(cppyy.gbl.ogdf.ClusterGraphObserver):
    def __init__(self, graph, widget):
        super().__init__(graph)
        self.widget = widget

    def clusterDeleted(self, cluster):
        self.widget.send({'code': 'deleteClusterById', 'data': str(cluster.index())})

    def clusterAdded(self, cluster):
        self.widget.send({'addClusterById': 'test', 'data': self.widget.cluster_to_dict(cluster)})
