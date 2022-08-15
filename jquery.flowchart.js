if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
        if (this.parentNode) {
            alert(this.innerHTML);
            this.parentNode.removeChild(this);

        }
    };
}

jQuery(function ($) {
// the widget definition, where "custom" is the namespace,
// "colorize" the widget name
    $.widget("flowchart.flowchart", {
        // default options
        options: {
            canUserEditLinks: true,
            canUserMoveOperators: true,
            data: {},
            distanceFromArrow: 3,
            defaultOperatorClass: 'flowchart-default-operator',

			// RGT
            linksLayerClass: 'flowchart-links-layer',
            operatorsLayerClass: 'flowchart-operators-layer',
            opGroupsLayerClass: 'flowchart-opGroups-layer',

			readOnly: false,
			// ---------------------------------------------------

			defaultLinkColor: 'black',
            defaultSelectedLinkColor: '#3366ff',
            defaultOpGroupColor: 'black',
            defaultSelectedOpGroupColor: '#3366ff',
            linkWidth: 10,
            grid: 20,
            multipleLinksOnOutput: false,
            multipleLinksOnInput: false,
            linkVerticalDecal: 0,
            verticalConnection: false,
            onOperatorCreate: function (operatorId, operatorData, fullElement) {
                return true;
            },
            onOperatorDelete: function (operatorId) {
                return true;
            },
            onOperatorSelect: function (operatorId) {
                return true;
            },
            onOperatorUnselect: function () {
                return true;
            },
            onOperatorMouseOver: function (operatorId) {
                return true;
            },
            onOperatorMouseOut: function (operatorId) {
                return true;
            },
            onOperatorMoved: function (operatorId, position) {

            },
            onLinkCreate: function (linkId, linkData) {
                return true;
            },
            onLinkDelete: function (linkId, forced) {
                return true;
            },
            onLinkSelect: function (linkId) {
                return true;
            },
            onLinkUnselect: function () {
                return true;
            },
            onOpGroupCreate: function (opGroupId, opGroupData) {
                return true;
            },
            onOpGroupDelete: function (opGroupId, forced) {
                return true;
            },
            onOpGroupSelect: function (opGroupId) {
                return true;
            },
            onOpGroupUnselect: function () {
                return true;
            },
            onAfterChange: function (changeType) {

            }
        },
        canvas: null,
        data: null,
        objs: null,
        maskNum: 0,
        linkNum: 0,
        operatorNum: 0,
        lastOutputConnectorClicked: null,
        selectedOperatorId: null,
        selectedLinkId: null,
        selectedOpGroupId: null,
        positionRatio: 1,
        globalId: null,
		
		// ---------------------------------------------------
		// RGT
		selectedOperators: [],
		// ---------------------------------------------------

        // the constructor
        _create: function () {
            if (typeof document.__flowchartNumber == 'undefined') {
                document.__flowchartNumber = 0;
            } else {
                document.__flowchartNumber++;
            }
            this.globalId = document.__flowchartNumber;
            this._initVariables();

            this.element.addClass('flowchart-container');

            if (this.options.verticalConnection) {
                this.element.addClass('flowchart-vertical');
            }

			this.canvas = this.element;

            this.objs.layers.links = $('<svg id="linksLayer" class="flowchart-links-layer"></svg>');
			// ---------------------------------------------------
			// RGT
			this.objs.layers.links.addClass(this.options.linksLayerClass);
			// ---------------------------------------------------
			this.objs.layers.links.appendTo(this.element);

            this.objs.layers.operators = $('<div id="operatorsLayer" class="flowchart-operators-layer unselectable"></div>');
			// ---------------------------------------------------
			// RGT
			this.objs.layers.operators.addClass(this.options.operatorsLayerClass);
			// ---------------------------------------------------
            this.objs.layers.operators.appendTo(this.element);

            this.objs.layers.temporaryLink = $('<svg class="flowchart-temporary-link-layer"></svg>');
			// ---------------------------------------------------
			// RGT
			this.objs.layers.temporaryLink.addClass(this.options.linksLayerClass);
            // ---------------------------------------------------
			this.objs.layers.temporaryLink.appendTo(this.element);

            var shape = document.createElementNS("http://www.w3.org/2000/svg", "line");
            shape.setAttribute("x1", "0");
            shape.setAttribute("y1", "0");
            shape.setAttribute("x2", "0");
            shape.setAttribute("y2", "0");
            shape.setAttribute("stroke-dasharray", "6,6");
            shape.setAttribute("stroke-width", "4");
            shape.setAttribute("stroke", "black");
            shape.setAttribute("fill", "none");
            this.objs.layers.temporaryLink[0].appendChild(shape);
            this.objs.temporaryLink = shape;

            //this.objs.layers.opGroups = $('<svg id="opGroupsLayer" class="flowchart-opGroups-layer"></svg>');
            this.objs.layers.opGroups = $('<div id="opGroupsLayer" class="flowchart-opGroups-layer unselectable"></div>');
            this.objs.layers.opGroups.addClass(this.options.opGroupsLayerClass);
            this.objs.layers.opGroups.appendTo(this.element);

            this._initEvents();

            if (typeof this.options.data != 'undefined') {
                this.setData(this.options.data);
            }
        },

        _initVariables: function () {
            this.data = {
                operators: {},
                links: {},
                opGroups: {}
            };
            this.objs = {
                layers: {
                    operators: null,
                    temporaryLink: null,
                    links: null,
                    opGroups: null
                },
                linksContext: null,
                temporaryLink: null
            };
        },

        _initEvents: function () {

            var self = this;

            this.element.mousemove(function (e) {
                var $this = $(this);
                var offset = $this.offset();
                self._mousemove((e.pageX - offset.left) / self.positionRatio, (e.pageY - offset.top) / self.positionRatio, e);
            });

            this.element.click(function (e) {
                var $this = $(this);
                var offset = $this.offset();
                self._click((e.pageX - offset.left) / self.positionRatio, (e.pageY - offset.top) / self.positionRatio, e);
            });

			// RGT
            this.element.on('scroll', function (e) {
                self.redrawLinksLayer();
            });
			// ---------------------------------------------------

            this.objs.layers.operators.on('pointerdown mousedown touchstart', '.flowchart-operator', function (e) {
                console.log("pointerdown");
               e.stopImmediatePropagation();
            });

            this.objs.layers.operators.on('click', '.flowchart-operator', function (e) {
                if ($(e.target).closest('.flowchart-operator-connector').length == 0) {
                    self.selectOperator($(this).data('operator_id'));
                }
            });

            this.objs.layers.operators.on('click', '.flowchart-operator-connector', function () {
                var $this = $(this);
                if (self.options.canUserEditLinks) {
                    self._connectorClicked($this.closest('.flowchart-operator').data('operator_id'), $this.data('connector'), $this.data('sub_connector'), $this.closest('.flowchart-operator-connector-set').data('connector_type'));
                }
            });

            this.objs.layers.operators.on('mouseover', '.flowchart-operator', function (e) {
                self._operatorMouseOver($(this).data('operator_id'));
            });

            this.objs.layers.operators.on('mouseout', '.flowchart-operator', function (e) {
                self._operatorMouseOut($(this).data('operator_id'));
            });

            this.objs.layers.links.on('mousedown touchstart', '.flowchart-link', function (e) {
                e.stopImmediatePropagation();
            });

            this.objs.layers.links.on('mouseover', '.flowchart-link', function () {
                self._connecterMouseOver($(this).data('link_id'));
            });

			this.objs.layers.links.on('mouseout', '.flowchart-link', function () {
                self._connecterMouseOut($(this).data('link_id'));
            });

			this.objs.layers.links.on('click', '.flowchart-link', function () {
                self.selectLink($(this).data('link_id'));
            });

			this.objs.layers.opGroups.on('pointerdown mousedown touchstart', '.flowchart-opGroup', function (e) {
			    e.stopImmediatePropagation();
			    self.holdOpGroup($(this).data('opGroup_id'));
			});

			this.objs.layers.opGroups.on('pointerup mouseup touchstop', '.flowchart-opGroup', function (e) {
			    //e.stopImmediatePropagation();
			    self.releaseOpGroup($(this).data('opGroup_id'));
			});

            this.objs.layers.opGroups.on('mouseover', '.flowchart-opGroup', function () {
                self._opGroupBorderMouseOver($(this).data('opGroup_id'));
            });

            this.objs.layers.opGroups.on('mouseout', '.flowchart-opGroup', function () {
                self._opGroupBorderMouseOut($(this).data('opGroup_id'));
            });

            this.objs.layers.opGroups.on('click', '.flowchart-opGroup', function () {
                self.selectOpGroup($(this).data('opGroup_id'));
            });

        },

        holdOpGroup: function (opGroupId) {
            var opGroupData = this.data.opGroups[opGroupId];
            console.log("holdOpGroup");
            //console.log(opGroupData);
            var rect = opGroupData.internal.els.rect;
        },

        releaseOpGroup: function(opGroupId){
            console.log("releaseOpGroup " + opGroupId);

        },

        setData: function (data) {
            this._clearOperatorsLayer();
            this.data.operatorTypes = {};
            if (typeof data.operatorTypes != 'undefined') {
                this.data.operatorTypes = data.operatorTypes;
            }

            this.data.operators = {};
            for (var operatorId in data.operators) {
                if (data.operators.hasOwnProperty(operatorId)) {
                    this.createOperator(operatorId, data.operators[operatorId]);
                }
            }
            this.data.links = {};
            for (var linkId in data.links) {
                if (data.links.hasOwnProperty(linkId)) {
                    this.createLink(linkId, data.links[linkId]);
                }
            }
            this.redrawLinksLayer();
        },

		// ---------------------------------------------------
		// RGT
		clearCanvas: function () {
            this._clearOperatorsLayer();
			this._clearLinksLayer();
            this.data.operatorTypes = {};
            this.data.links = {};
            this.data.operators = {};
            this.redrawLinksLayer();
			// Scroll to the top and left...
			this.canvas.scrollTop(0);
			this.canvas.scrollLeft(0);
			this.options.readOnly = false;
		},

		setToReadOnly: function (value) {
			this.options.readOnly = value;
			this.options.canUserEditLinks = !value;
		},

		getReadOnly: function () {
			return this.options.readOnly;
		},

		setSelectedOperators: function (selectedOperators) {
			this.selectedOperators = selectedOperators;
		},
		// ---------------------------------------------------

        addLink: function (linkData) {
            while (typeof this.data.links[this.linkNum] != 'undefined') {
                this.linkNum++;
            }

            this.createLink(this.linkNum, linkData);
            return this.linkNum;
        },

        createLink: function (linkId, linkDataOriginal) {
            var linkData = $.extend(true, {}, linkDataOriginal);
            if (!this.callbackEvent('linkCreate', [linkId, linkData])) {
                return;
            }

            var subConnectors = this._getSubConnectors(linkData);
            var fromSubConnector = subConnectors[0];
            var toSubConnector = subConnectors[1];

            var multipleLinksOnOutput = this.options.multipleLinksOnOutput;
            var multipleLinksOnInput = this.options.multipleLinksOnInput;
            if (!multipleLinksOnOutput || !multipleLinksOnInput) {
                for (var linkId2 in this.data.links) {
                    if (this.data.links.hasOwnProperty(linkId2)) {
                        var currentLink = this.data.links[linkId2];

                        var currentSubConnectors = this._getSubConnectors(currentLink);
                        var currentFromSubConnector = currentSubConnectors[0];
                        var currentToSubConnector = currentSubConnectors[1];

                        if (!multipleLinksOnOutput && !this.data.operators[linkData.fromOperator].properties.outputs[linkData.fromConnector].multipleLinks && currentLink.fromOperator == linkData.fromOperator && currentLink.fromConnector == linkData.fromConnector && currentFromSubConnector == fromSubConnector) {
                            this.deleteLink(linkId2);
                            continue;
                        }
                        if (!multipleLinksOnInput && !this.data.operators[linkData.toOperator].properties.inputs[linkData.toConnector].multipleLinks && currentLink.toOperator == linkData.toOperator && currentLink.toConnector == linkData.toConnector && currentToSubConnector == toSubConnector) {
                            this.deleteLink(linkId2);
                        }
                    }
                }
            }

            this._autoCreateSubConnector(linkData.fromOperator, linkData.fromConnector, 'outputs', fromSubConnector);
            this._autoCreateSubConnector(linkData.toOperator, linkData.toConnector, 'inputs', toSubConnector);

            this.data.links[linkId] = linkData;
            this._drawLink(linkId);

            this.callbackEvent('afterChange', ['link_create']);
        },

        _autoCreateSubConnector: function (operator, connector, connectorType, subConnector) {
            var connectorInfos = this.data.operators[operator].internal.properties[connectorType][connector];
            if (connectorInfos.multiple) {
                var fromFullElement = this.data.operators[operator].internal.els;
                var nbFromConnectors = this.data.operators[operator].internal.els.connectors[connector].length;
                for (var i = nbFromConnectors; i < subConnector + 2; i++) {
                    this._createSubConnector(connector, connectorInfos, fromFullElement);
                }
            }
        },

        _refreshOperatorConnectors: function (operatorId) {
            for (var linkId in this.data.links) {
                if (this.data.links.hasOwnProperty(linkId)) {
                    var linkData = this.data.links[linkId];
                    if (linkData.fromOperator == operatorId || linkData.toOperator == operatorId)
                    {
                        var subConnectors = this._getSubConnectors(linkData);
                        var fromSubConnector = subConnectors[0];
                        var toSubConnector = subConnectors[1];

                        this._autoCreateSubConnector(linkData.fromOperator, linkData.fromConnector, 'outputs', fromSubConnector);
                        this._autoCreateSubConnector(linkData.toOperator, linkData.toConnector, 'inputs', toSubConnector);
                    }
                }
            }
        },

        redrawLinksLayer: function () {
            this._clearLinksLayer();
            for (var linkId in this.data.links) {
                if (this.data.links.hasOwnProperty(linkId)) {
                    this._drawLink(linkId);
                }
            }
        },

        _clearLinksLayer: function () {
            this.objs.layers.links.empty();
            if (this.options.verticalConnection) {
                this.objs.layers.operators.find('.flowchart-operator-connector-small-arrow').css('border-top-color', 'transparent');
            } else {
                this.objs.layers.operators.find('.flowchart-operator-connector-small-arrow').css('border-left-color', 'transparent');
            }
        },

        _clearOperatorsLayer: function () {
            this.objs.layers.operators.empty();
        },

        getConnectorPosition: function (operatorId, connectorId, subConnector) {
            var operatorData = this.data.operators[operatorId];
            var $connector = operatorData.internal.els.connectorArrows[connectorId][subConnector];

            var connectorOffset = $connector.offset();
            var elementOffset = this.element.offset();
            var x = (connectorOffset.left - elementOffset.left) / this.positionRatio;
            var width = parseInt($connector.css('border-top-width'), 10);
            var y = (connectorOffset.top - elementOffset.top - 1) / this.positionRatio + parseInt($connector.css('border-left-width'), 10);

            return {x: x, width: width, y: y};
        },

        getLinkMainColor: function (linkId) {
            var color = this.options.defaultLinkColor;
            var linkData = this.data.links[linkId];
            if (typeof linkData.color != 'undefined') {
                color = linkData.color;
            }
            return color;
        },

        setLinkMainColor: function (linkId, color) {
            this.data.links[linkId].color = color;
            this.callbackEvent('afterChange', ['link_change_main_color']);
        },

        _drawLink: function (linkId) {
            var linkData = this.data.links[linkId];

            if (typeof linkData.internal == 'undefined') {
                linkData.internal = {};
            }
            linkData.internal.els = {};

            var fromOperatorId = linkData.fromOperator;
            var fromConnectorId = linkData.fromConnector;
            var toOperatorId = linkData.toOperator;
            var toConnectorId = linkData.toConnector;

            var subConnectors = this._getSubConnectors(linkData);
            var fromSubConnector = subConnectors[0];
            var toSubConnector = subConnectors[1];

            var color = this.getLinkMainColor(linkId);

            var fromOperator = this.data.operators[fromOperatorId];
            var toOperator = this.data.operators[toOperatorId];

            var fromSmallConnector = fromOperator.internal.els.connectorSmallArrows[fromConnectorId][fromSubConnector];
            var toSmallConnector = toOperator.internal.els.connectorSmallArrows[toConnectorId][toSubConnector];

            linkData.internal.els.fromSmallConnector = fromSmallConnector;
            linkData.internal.els.toSmallConnector = toSmallConnector;

            var overallGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.objs.layers.links[0].appendChild(overallGroup);
            linkData.internal.els.overallGroup = overallGroup;

            var mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
            var maskId = "fc_mask_" + this.globalId + "_" + this.maskNum;
            this.maskNum++;
            mask.setAttribute("id", maskId);

            overallGroup.appendChild(mask);

            var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            shape.setAttribute("x", "0");
            shape.setAttribute("y", "0");
            shape.setAttribute("width", "100%");
            shape.setAttribute("height", "100%");
            shape.setAttribute("stroke", "none");
            shape.setAttribute("fill", "white");
            mask.appendChild(shape);

            var shape_polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            shape_polygon.setAttribute("stroke", "none");
            shape_polygon.setAttribute("fill", "black");
            mask.appendChild(shape_polygon);
            linkData.internal.els.mask = shape_polygon;

            var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute('class', 'flowchart-link');
            group.setAttribute('data-link_id', linkId);
            overallGroup.appendChild(group);

            var shape_path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            shape_path.setAttribute("stroke-width", this.options.linkWidth.toString());
            shape_path.setAttribute("fill", "none");
            group.appendChild(shape_path);
            linkData.internal.els.path = shape_path;

            var shape_rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            shape_rect.setAttribute("stroke", "none");
            shape_rect.setAttribute("mask", "url(#" + maskId + ")");
            group.appendChild(shape_rect);
            linkData.internal.els.rect = shape_rect;

            var shape_text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            shape_text.setAttribute("fill", "black");
            group.appendChild(shape_text);
            linkData.internal.els.text = shape_text;


            this._refreshLinkPositions(linkId);
            this.uncolorizeLink(linkId);
        },

        _getSubConnectors: function (linkData) {
            var fromSubConnector = 0;
            if (typeof linkData.fromSubConnector != 'undefined') {
                fromSubConnector = linkData.fromSubConnector;
            }

            var toSubConnector = 0;
            if (typeof linkData.toSubConnector != 'undefined') {
                toSubConnector = linkData.toSubConnector;
            }

            return [fromSubConnector, toSubConnector];
        },

        _refreshLinkPositions: function (linkId) {
            var linkData = this.data.links[linkId];

            var subConnectors = this._getSubConnectors(linkData);
            var fromSubConnector = subConnectors[0];
            var toSubConnector = subConnectors[1];

            var fromPosition = this.getConnectorPosition(linkData.fromOperator, linkData.fromConnector, fromSubConnector);
            var toPosition = this.getConnectorPosition(linkData.toOperator, linkData.toConnector, toSubConnector);

			// RGT
			var xScroll = this.canvas.scrollLeft() / this.positionRatio;
			fromPosition.x += xScroll;
			toPosition.x += xScroll;
			var yScroll = this.canvas.scrollTop() / this.positionRatio;
			fromPosition.y += yScroll;
			toPosition.y += yScroll;
			// ---------------------------------------------------

            var fromX = fromPosition.x;
            var offsetFromX = fromPosition.width;
            var fromY = fromPosition.y;

            var toX = toPosition.x;
            var toY = toPosition.y;

            fromY += this.options.linkVerticalDecal;
            toY += this.options.linkVerticalDecal;

            var distanceFromArrow = this.options.distanceFromArrow;

            linkData.internal.els.mask.setAttribute("points", fromX + ',' + (fromY - offsetFromX - distanceFromArrow) + ' ' + (fromX + offsetFromX + distanceFromArrow) + ',' + fromY + ' ' + fromX + ',' + (fromY + offsetFromX + distanceFromArrow));

            var bezierFromX, bezierToX, bezierIntensity;

            if (this.options.verticalConnection) {
                fromY = fromY - 10;
                toY = toY - 10;
                bezierFromX = (fromX + offsetFromX + distanceFromArrow - 3);
                bezierToX = (toX + offsetFromX + distanceFromArrow - 3);

                bezierIntensity = Math.min(100, Math.max(Math.abs(bezierFromX - bezierToX) / 2, Math.abs(fromY - toY)));
                linkData.internal.els.path.setAttribute("d", 'M' + bezierFromX + ',' + (fromY) + ' C' + bezierFromX + ',' + (fromY + bezierIntensity) + ' ' + bezierToX + ',' + (toY - bezierIntensity) + ' ' + bezierToX + ',' + toY);
                linkData.internal.els.rect.setAttribute("x", fromX - 1 + this.options.linkWidth / 2);
                linkData.internal.els.text.setAttribute("x", (fromX + toX) / 2 + 10);
                linkData.internal.els.text.setAttribute("y", (fromY + toY) / 2 + 10);
                linkData.internal.els.text.innerHTML = "[1, 1]";
            } else {
                bezierFromX = (fromX + offsetFromX + distanceFromArrow);
                bezierToX = toX + 1;
                bezierIntensity = Math.min(100, Math.max(Math.abs(bezierFromX - bezierToX) / 2, Math.abs(fromY - toY)));
                linkData.internal.els.path.setAttribute("d", 'M' + bezierFromX + ',' + (fromY) + ' C' + (fromX + offsetFromX + distanceFromArrow + bezierIntensity) + ',' + fromY + ' ' + (toX - bezierIntensity) + ',' + toY + ' ' + bezierToX + ',' + toY);
                linkData.internal.els.rect.setAttribute("x", fromX);
                linkData.internal.els.text.setAttribute("x", (fromX + toX) / 2 + 10);
                linkData.internal.els.text.setAttribute("y", (fromY + toY) / 2 + 10);
                linkData.internal.els.text.innerHTML = "[x, x]";
            }

            linkData.internal.els.rect.setAttribute("y", fromY - this.options.linkWidth / 2);
			linkData.internal.els.rect.setAttribute("width", offsetFromX + distanceFromArrow + 1);
            linkData.internal.els.rect.setAttribute("height", this.options.linkWidth);
        },

        getOperatorCompleteData: function (operatorData) {
            if (typeof operatorData.internal == 'undefined') {
                operatorData.internal = {};
            }
            this._refreshInternalProperties(operatorData);
            var infos = $.extend(true, {}, operatorData.internal.properties);
            //console.log(infos);
            for (var connectorId_i in infos.inputs) {
                if (infos.inputs.hasOwnProperty(connectorId_i)) {
                    if (infos.inputs[connectorId_i] == null) {
                        delete infos.inputs[connectorId_i];
                    }
                }
            }

            for (var connectorId_o in infos.outputs) {
                if (infos.outputs.hasOwnProperty(connectorId_o)) {
                    if (infos.outputs[connectorId_o] == null) {
                        delete infos.outputs[connectorId_o];
                    }
                }
            }
            if (typeof infos.class == 'undefined') {
                infos.class = this.options.defaultOperatorClass;
            }
            //console.log(infos);
            return infos;
        },

        _getOperatorFullElement: function (operatorData) {
            var infos = this.getOperatorCompleteData(operatorData);

            var $operator = $('<div class="flowchart-operator"></div>');
            $operator.addClass(infos.class);

            var $operator_title = $('<div class="flowchart-operator-title"></div>');
            $operator_title.html(infos.title);
            $operator_title.appendTo($operator);

            var $operator_body = $('<div class="flowchart-operator-body"></div>');
            $operator_body.html(infos.body);
            if (infos.body) {
                $operator_body.appendTo($operator);
            }

            var $operator_inputs_outputs = $('<div class="flowchart-operator-inputs-outputs"></div>');

            var $operator_inputs = $('<div class="flowchart-operator-inputs"></div>');

            var $operator_outputs = $('<div class="flowchart-operator-outputs"></div>');

            if (this.options.verticalConnection) {
                $operator_inputs.prependTo($operator);
                $operator_outputs.appendTo($operator);
            } else {
                $operator_inputs_outputs.appendTo($operator);
                $operator_inputs.appendTo($operator_inputs_outputs);
                $operator_outputs.appendTo($operator_inputs_outputs);
            }

            var self = this;

            var connectorArrows = {};
            var connectorSmallArrows = {};
            var connectorSets = {};
            var connectors = {};

            var fullElement = {
                operator: $operator,
                title: $operator_title,
                body: $operator_body,
                connectorSets: connectorSets,
                connectors: connectors,
                connectorArrows: connectorArrows,
                connectorSmallArrows: connectorSmallArrows
            };

            function addConnector(connectorKey, connectorInfos, $operator_container, connectorType) {
                var $operator_connector_set = $('<div class="flowchart-operator-connector-set"></div>');
                $operator_connector_set.data('connector_type', connectorType);
                $operator_connector_set.appendTo($operator_container);

                connectorArrows[connectorKey] = [];
                connectorSmallArrows[connectorKey] = [];
                connectors[connectorKey] = [];
                connectorSets[connectorKey] = $operator_connector_set;

                if ($.isArray(connectorInfos.label)) {
                    for (var i = 0; i < connectorInfos.label.length; i++) {
                        self._createSubConnector(connectorKey, connectorInfos.label[i], fullElement);
                    }
                } else {
                    self._createSubConnector(connectorKey, connectorInfos, fullElement);
                }
            }

            for (var key_i in infos.inputs) {
                if (infos.inputs.hasOwnProperty(key_i)) {
                    addConnector(key_i, infos.inputs[key_i], $operator_inputs, 'inputs');
                }
            }

            for (var key_o in infos.outputs) {
                if (infos.outputs.hasOwnProperty(key_o)) {
                    addConnector(key_o, infos.outputs[key_o], $operator_outputs, 'outputs');
                }
            }
            //console.log(fullElement);
            return fullElement;
        },

        _createSubConnector: function (connectorKey, connectorInfos, fullElement) {
            var $operator_connector_set = fullElement.connectorSets[connectorKey];

            var subConnector = fullElement.connectors[connectorKey].length;

            var $operator_connector = $('<div class="flowchart-operator-connector"></div>');
            $operator_connector.appendTo($operator_connector_set);
            $operator_connector.data('connector', connectorKey);
            $operator_connector.data('sub_connector', subConnector);

            var $operator_connector_label = $('<div class="flowchart-operator-connector-label"></div>');
            $operator_connector_label.text(connectorInfos.label.replace('(:i)', subConnector + 1));
            $operator_connector_label.appendTo($operator_connector);

            var $operator_connector_arrow = $('<div class="flowchart-operator-connector-arrow"></div>');

            $operator_connector_arrow.appendTo($operator_connector);

            var $operator_connector_small_arrow = $('<div class="flowchart-operator-connector-small-arrow"></div>');
            $operator_connector_small_arrow.appendTo($operator_connector);

            fullElement.connectors[connectorKey].push($operator_connector);
            fullElement.connectorArrows[connectorKey].push($operator_connector_arrow);
            fullElement.connectorSmallArrows[connectorKey].push($operator_connector_small_arrow);
        },

        getOperatorElement: function (operatorData) {
            var fullElement = this._getOperatorFullElement(operatorData);
            return fullElement.operator;
        },

        addOperator: function (operatorData) {
            while (typeof this.data.operators[this.operatorNum] != 'undefined') {
                this.operatorNum++;
            }

            this.createOperator(this.operatorNum, operatorData);
            return this.operatorNum;
        },

        createOperator: function (operatorId, operatorData) {
            operatorData.internal = {};
            this._refreshInternalProperties(operatorData);

            var fullElement = this._getOperatorFullElement(operatorData);
            if (!this.callbackEvent('operatorCreate', [operatorId, operatorData, fullElement])) {
                return false;
            }

            var grid = this.options.grid;

            if (grid) {
                operatorData.top = Math.round(operatorData.top / grid) * grid;
                operatorData.left = Math.round(operatorData.left / grid) * grid;
            }

			// ---------------------------------------------------
			// RGT
			var xScroll = this.element.scrollLeft() / this.positionRatio;
			var yScroll = this.element.scrollTop() / this.positionRatio;
			operatorData.left += xScroll;
			operatorData.top += yScroll;
			// ---------------------------------------------------

            fullElement.operator.appendTo(this.objs.layers.operators);
            fullElement.operator.css({top: operatorData.top, left: operatorData.left});
            fullElement.operator.data('operator_id', operatorId);

            this.data.operators[operatorId] = operatorData;
            this.data.operators[operatorId].internal.els = fullElement;

            if (operatorId == this.selectedOperatorId) {
                this._addSelectedClass(operatorId);
            }

            var self = this;

            function operatorChangedPosition(operator_id, pos) {
                var newHeight = pos.top;
                var newWidth = pos.left;
                var currentHight = parseFloat($('.flowchart-operators-layer').css('height'));
                var currentWidth = parseFloat($('.flowchart-operators-layer').css('width'));
                var minHeight = $('#flowchartwindow').height();
                var minWidth = $('#flowchartwindow').width();

                //console.log(pos);
                //console.log(currentHight, currentWidth);

                operatorData.top = pos.top;
                operatorData.left = pos.left;

                for (var operatorId in self.data.operators) {
                    if (self.data.operators.hasOwnProperty(operatorId)) {
                        var opData = self.data.operators[operatorId];
                        newHeight = newHeight > opData.top ? newHeight : opData.top;
                        newWidth = newWidth > opData.left ? newWidth : opData.left;
                    }
                }

                newHeight = newHeight + 300;
                newWidth = newWidth + 300;

                /*
                $('.flowchart-operators-layer').css('height', newHeight);
                $('.flowchart-links-layer').css('height', newHeight);

                $('.flowchart-operators-layer').css('width', newWidth);
                $('.flowchart-links-layer').css('width', newWidth);
                */

                if (newHeight > minHeight) {
                    $('.flowchart-container').css('height', newHeight);
                    $('.flowchart-operators-layer').css('height', newHeight);
                    $('.flowchart-links-layer').css('height', newHeight);
                } else if (currentHight != minHeight) {
                    newHeight = minHeight;
                    $('.flowchart-container').css('height', newHeight);
                    $('.flowchart-operators-layer').css('height', newHeight);
                    $('.flowchart-links-layer').css('height', newHeight);
                }

                if (newWidth > minWidth) {
                    $('.flowchart-container').css('width', newWidth);
                    $('.flowchart-operators-layer').css('width', newWidth);
                    $('.flowchart-links-layer').css('width', newWidth);
                } else if (currentWidth != minWidth) {
                    newWidth = minWidth;
                    $('.flowchart-container').css('width', newWidth);
                    $('.flowchart-operators-layer').css('width', newWidth);
                    $('.flowchart-links-layer').css('width', newWidth);
                }
                
                for (var linkId in self.data.links) {
                    if (self.data.links.hasOwnProperty(linkId)) {
                        var linkData = self.data.links[linkId];
                        if (linkData.fromOperator == operator_id || linkData.toOperator == operator_id) {
                            self._refreshLinkPositions(linkId);
                        }
                    }
                }
            }

            // Small fix has been added in order to manage eventual zoom
            // http://stackoverflow.com/questions/2930092/jquery-draggable-with-zoom-problem
            if (this.options.canUserMoveOperators) {
                var pointerX;
                var pointerY;
                fullElement.operator.draggable({
                    containment: operatorData.internal.properties.uncontained ? false : this.element,
                    handle: '.flowchart-operator-title, .flowchart-operator-body',
                    start: function (e, ui) {
						// ---------------------------------------------------
						// RGT
						// Stop the drag if the canUserMoveOperators is false...
						// RGT replace the line below with the other line...
                        //if (self.lastOutputConnectorClicked != null) {
                        if (self.lastOutputConnectorClicked != null || self.options.readOnly == true) {
						// ---------------------------------------------------
                            e.preventDefault();
                            return;
                        }
                        var elementOffset = self.element.offset();
                        pointerX = (e.pageX - elementOffset.left) / self.positionRatio - parseInt($(e.target).css('left'), 10);
                        pointerY = (e.pageY - elementOffset.top) / self.positionRatio - parseInt($(e.target).css('top'), 10);
                    },
                    drag: function (e, ui) {
                        if (self.options.grid) {
                            var grid = self.options.grid;

							// Save the original left and right so we can calculate the change...
							var uiLeft = ui.position.left;
							var uiTop = ui.position.top;

                            var elementOffset = self.element.offset();
                            ui.position.left = Math.round(((e.pageX - elementOffset.left) / self.positionRatio - pointerX) / grid) * grid;
							ui.position.top = Math.round(((e.pageY - elementOffset.top) / self.positionRatio - pointerY) / grid) * grid;
                            

                            if (!operatorData.internal.properties.uncontained) {
                                var $this = $(this);

								// ---------------------------------------------------
								// RGT
								// Stop it from going too far left or too far right...
                                ui.position.left = Math.min(Math.max(ui.position.left, 0), self.objs.layers.operators.width() - (fullElement.operator[0].offsetWidth + 20));
								// .. same with the top...
                                ui.position.top = Math.min(Math.max(ui.position.top, 0), self.objs.layers.operators.height() - (fullElement.operator[0].offsetHeight));
								// ---------------------------------------------------
                            }
                            
							ui.offset.left = Math.round(ui.position.left + elementOffset.left);
                            ui.offset.top = Math.round(ui.position.top + elementOffset.top);

							// ---------------------------------------------------
							// RGT
							// Calculate the diffs of the operator being moved so they can be applied to the other operators...
							var originalLeft = parseInt(fullElement.operator.css('left'));
							var originalTop = parseInt(fullElement.operator.css('top'));

                            fullElement.operator.css({left: ui.position.left, top: ui.position.top});

							var diffLeft = parseInt(fullElement.operator.css('left')) - originalLeft;
							var diffTop = parseInt(fullElement.operator.css('top')) - originalTop;

							// Try to find the dragged operator in the selectedOperators list...
							// .. if it isn't there then cancel the move of the other operators but keep the list...
							if (self.selectedOperators.find( operator => { return operator._operatorID == $(this).data('operator_id'); } ) != null) {
								// Filter out the operator that is being dragged...
								var filteredOperators = self.selectedOperators.filter( operator => { return operator._operatorID != $(this).data('operator_id'); } );
								filteredOperators.forEach( operator => {
									// Move the other operator...
									// Get the original position...
									var currentPosition = $(operator).position();
									// Update the position with the difference...
									currentPosition.left += diffLeft;
									currentPosition.top += diffTop;

									// Set the position on the screen...
									$(operator).css({ left: currentPosition.left, top: currentPosition.top });

									// Update the operator data to set the new position...
									self.data.operators[operator._operatorID].left = currentPosition.left;
									self.data.operators[operator._operatorID].top = currentPosition.top;

									// Trigger the link redraws...
									operatorChangedPosition(operator._operatorID, currentPosition);
								});
							}
							// ---------------------------------------------------
                        }
						// Need to somehow change the positions of all of the operators in the drag select list...
                        operatorChangedPosition($(this).data('operator_id'), ui.position);
                   },
                    stop: function (e, ui) {
                        self._unsetTemporaryLink();
                        var operatorId = $(this).data('operator_id');
                        operatorChangedPosition(operatorId, ui.position);
                        fullElement.operator.css({
                            height: 'auto'
                        });

                        self.callbackEvent('operatorMoved', [operatorId, ui.position]);
                        self.callbackEvent('afterChange', ['operator_moved']);
                    }
                });
            }

            this.callbackEvent('afterChange', ['operator_create']);
        },

        createOpGroup: function (opGroupId, opGroupDataOriginal) {
            var opGroupData = $.extend(true, {}, opGroupDataOriginal);
            if (!this.callbackEvent('opGroupCreate', [opGroupId, opGroupData])) {
                return;
            }
            this.data.opGroups[opGroupId] = opGroupData;
            this._drawOpGroup(opGroupId);

            this.callbackEvent('afterChange', ['opGroup_create']);
        },

        _drawOpGroup: function (opGroupId) {
            var opGroupData = this.data.opGroups[opGroupId];

            if (typeof opGroupData.internal == 'undefined') {
                opGroupData.internal = {};
            }
            opGroupData.internal.els = {};

            /*
            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", opGroupData.geometric.rect_x);
            rect.setAttribute("y", opGroupData.geometric.rect_y);
            rect.setAttribute("width", opGroupData.geometric.rect_width);
            rect.setAttribute("height", opGroupData.geometric.rect_height);
            rect.setAttribute("stroke", this.options.defaultOpGroupColor);
            rect.setAttribute("stroke-width", "2");
            rect.setAttribute("fill", "none");
            rect.setAttribute('class', 'flowchart-opGroup');
            //rect.setAttribute('data-opGroup_id', opGroupId); //This doesn't work somehow!?
            rect.dataset.opGroup_id = opGroupId;
            this.objs.layers.opGroups[0].appendChild(rect);
            opGroupData.internal.els.rect = rect;
            */

            var $opGroupRect = $('<div class="flowchart-opGroup"></div>');
            $opGroupRect.appendTo(this.objs.layers.opGroups);
            $opGroupRect.css({
                top: opGroupData.geometric.rect_y,
                left: opGroupData.geometric.rect_x,
                width: opGroupData.geometric.rect_width,
                height: opGroupData.geometric.rect_height,
                fill: "none"
            });
            $opGroupRect.data('opGroup_id', opGroupId);
            $opGroupRect.resizable({ handles: 'n, e, s, w' });
            $opGroupRect.draggable();
            opGroupData.internal.els.rect = $opGroupRect;
        },

        selectOpGroup: function (opGroupId) {
            this.unselectOpGroup();
            if (!this.callbackEvent('opGroupSelect', [opGroupId])) {
                return;
            }
            this.unselectLink();
            this.unselectOperator();
            this.selectedOpGroupId = opGroupId;
            this.colorizeOpGroup(opGroupId, this.options.defaultSelectedOpGroupColor);
        },

        unselectOpGroup: function () {
            //console.log("unselectOpGroup");
            if (this.selectedOpGroupId != null) {
                if (!this.callbackEvent('opGroupUnselect', [])) {
                    return;
                }
                this.uncolorizeOpGroup(this.selectedOpGroupId, this.options.defaultOpGroupColor);
                this.selectedOpGroupId = null;
            }
        },

        colorizeOpGroup: function (opGroupId, color) {
            //console.log("colorizeOpGroup ");
            //console.log(this.data.opGroups);
            var opGroupData = this.data.opGroups[opGroupId];
            //opGroupData.internal.els.rect.setAttribute('stroke', color);
        },

        uncolorizeOpGroup: function (opGroupId, color) {
            this.colorizeOpGroup(opGroupId, color);//FIXME
        },

        _opGroupBorderMouseOver: function (opGroupId) {
            if (this.selectedOpGroupId != opGroupId) {
                this.colorizeOpGroup(opGroupId, this._shadeColor(this.options.defaultSelectedOpGroupColor, -0.4));//FIXME
            }
        },

        _opGroupBorderMouseOut: function (opGroupId) {
            if (this.selectedOpGroupId != opGroupId) {
                this.uncolorizeOpGroup(opGroupId, this.options.defaultOpGroupColor);
            }
        },

        getOpGroupInfos: function (opGroupId) {
            var opGroupData = this.data.opGroups[opGroupId];
            var infos = {
                title: opGroupData.title,
                parent: opGroupData.parent,
                geometric: opGroupData.geometric
            };
            return infos;
        },

        setOpGroupInfos: function (opGroupId, infos) {
            var rect = this.data.opGroups[opGroupId].internal.els.rect;
            rect.setAttribute("x", infos.geometric.rect_x);
            rect.setAttribute("y", infos.geometric.rect_y);
            rect.setAttribute("width", infos.geometric.rect_width);
            rect.setAttribute("height", infos.geometric.rect_height);

            this.data.opGroups[opGroupId].title = infos.title;
            this.data.opGroups[opGroupId].parent = infos.parent;
            this.data.opGroups[opGroupId].geometric = infos.geometric;
            this.callbackEvent('afterChange', ['opGroup_change_geometric']);
        },

        _connectorClicked: function (operator, connector, subConnector, connectorCategory) {
            if (connectorCategory == 'outputs') {
                var d = new Date();
                // var currentTime = d.getTime();
                this.lastOutputConnectorClicked = {
                    operator: operator,
                    connector: connector,
                    subConnector: subConnector
                };
                this.objs.layers.temporaryLink.show();
                var position = this.getConnectorPosition(operator, connector, subConnector);
                var x = position.x + position.width;
                var y = position.y;

				// RGT
				var xScroll = this.canvas.scrollLeft() / this.positionRatio;
				var yScroll = this.canvas.scrollTop() / this.positionRatio;
				var xNew = x + xScroll;
				var yNew = y + yScroll;
				// ---------------------------------------------------

                this.objs.temporaryLink.setAttribute('x1', xNew.toString());
                this.objs.temporaryLink.setAttribute('y1', yNew.toString());
                this._mousemove(x, y);
            }
            if (connectorCategory == 'inputs' && this.lastOutputConnectorClicked != null) {
                var linkData = {
                    fromOperator: this.lastOutputConnectorClicked.operator,
                    fromConnector: this.lastOutputConnectorClicked.connector,
                    fromSubConnector: this.lastOutputConnectorClicked.subConnector,
                    toOperator: operator,
                    toConnector: connector,
                    toSubConnector: subConnector
                };

                this.addLink(linkData);
                this._unsetTemporaryLink();
            }
        },
        
        _unsetTemporaryLink: function () {
            this.lastOutputConnectorClicked = null;
            this.objs.layers.temporaryLink.hide();
        },

        _mousemove: function (x, y, e) {
            if (this.lastOutputConnectorClicked != null) {

				// RGT
				var xScroll = this.canvas.scrollLeft() / this.positionRatio;
				var yScroll = this.canvas.scrollTop() / this.positionRatio;
				x += xScroll;
				y += yScroll;
				// ---------------------------------------------------

                this.objs.temporaryLink.setAttribute('x2', x);
                this.objs.temporaryLink.setAttribute('y2', y);
            }
        },

        _click: function (x, y, e) {
            var $target = $(e.target);
            if ($target.closest('.flowchart-opGroup').length == 0) {
                this.unselectOpGroup();
            }

            if ($target.closest('.flowchart-operator-connector').length == 0) {
                this._unsetTemporaryLink();
            }

            if ($target.closest('.flowchart-operator').length == 0) {
                this.unselectOperator();
            }

            if ($target.closest('.flowchart-link').length == 0) {
                this.unselectLink();
            }
        },

        _removeSelectedClassOperators: function () {
            this.objs.layers.operators.find('.flowchart-operator').removeClass('selected');
        },

        unselectOperator: function () {
            if (this.selectedOperatorId != null) {
                if (!this.callbackEvent('operatorUnselect', [])) {
                    return;
                }
                this._removeSelectedClassOperators();
                this.selectedOperatorId = null;
            }
        },

        _addSelectedClass: function (operatorId) {
            this.data.operators[operatorId].internal.els.operator.addClass('selected');
        },
        
        callbackEvent: function(name, params) {
            var cbName = 'on' + name.charAt(0).toUpperCase() + name.slice(1);
            var ret = this.options[cbName].apply(this, params);
            if (ret !== false) {
                var returnHash = {'result': ret};
                this.element.trigger(name, params.concat([returnHash]));
                ret = returnHash['result'];
            }
            return ret;
        },

        selectOperator: function (operatorId) {
            if (!this.callbackEvent('operatorSelect', [operatorId])) {
                return;
            }
            this.unselectLink();
            this.unselectOpGroup();
            this._removeSelectedClassOperators();
            this._addSelectedClass(operatorId);
            this.selectedOperatorId = operatorId;
        },

        addClassOperator: function (operatorId, className) {
            this.data.operators[operatorId].internal.els.operator.addClass(className);
        },

        removeClassOperator: function (operatorId, className) {
            this.data.operators[operatorId].internal.els.operator.removeClass(className);
        },

        removeClassOperators: function (className) {
            this.objs.layers.operators.find('.flowchart-operator').removeClass(className);
        },

        _addHoverClassOperator: function (operatorId) {
            this.data.operators[operatorId].internal.els.operator.addClass('hover');
        },

        _removeHoverClassOperators: function () {
            this.objs.layers.operators.find('.flowchart-operator').removeClass('hover');
        },

        _operatorMouseOver: function (operatorId) {
            if (!this.callbackEvent('operatorMouseOver', [operatorId])) {
                return;
            }
            this._addHoverClassOperator(operatorId);
        },

        _operatorMouseOut: function (operatorId) {
            if (!this.callbackEvent('operatorMouseOut', [operatorId])) {
                return;
            }
            this._removeHoverClassOperators();
        },


        getSelectedOperatorId: function () {
            return this.selectedOperatorId;
        },

        getSelectedLinkId: function () {
            return this.selectedLinkId;
        },

        getSelectedOpGroupId: function () {
            return this.selectedOpGroupId;
        },

        // Found here : http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
        _shadeColor: function (color, percent) {
            var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
            return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
        },

        colorizeLink: function (linkId, color) {
            var linkData = this.data.links[linkId];
            linkData.internal.els.path.setAttribute('stroke', color);
            linkData.internal.els.rect.setAttribute('fill', color);
            if (this.options.verticalConnection) {
                linkData.internal.els.fromSmallConnector.css('border-top-color', color);
                linkData.internal.els.toSmallConnector.css('border-top-color', color);
            } else {
                linkData.internal.els.fromSmallConnector.css('border-left-color', color);
                linkData.internal.els.toSmallConnector.css('border-left-color', color);
            }
        },

        uncolorizeLink: function (linkId) {
            this.colorizeLink(linkId, this.getLinkMainColor(linkId));
        },

        _connecterMouseOver: function (linkId) {
            if (this.selectedLinkId != linkId) {
                this.colorizeLink(linkId, this._shadeColor(this.getLinkMainColor(linkId), -0.4));
            }
        },

        _connecterMouseOut: function (linkId) {
            if (this.selectedLinkId != linkId) {
                this.uncolorizeLink(linkId);
            }
        },

        unselectLink: function () {
            if (this.selectedLinkId != null) {
                if (!this.callbackEvent('linkUnselect', [])) {
                    return;
                }
                this.uncolorizeLink(this.selectedLinkId, this.options.defaultSelectedLinkColor);
                this.selectedLinkId = null;
            }
        },

        selectLink: function (linkId) {
            this.unselectLink();
            if (!this.callbackEvent('linkSelect', [linkId])) {
                return;
            }
            this.unselectOperator();
            this.unselectOpGroup();
            this.selectedLinkId = linkId;
            this.colorizeLink(linkId, this.options.defaultSelectedLinkColor);
        },

        deleteOperator: function (operatorId) {
            this._deleteOperator(operatorId, false);
        },

        _deleteOperator: function (operatorId, replace) {
            if (!this.callbackEvent('operatorDelete', [operatorId, replace])) {
                return false;
            }
            if (!replace) {
                for (var linkId in this.data.links) {
                    if (this.data.links.hasOwnProperty(linkId)) {
                        var currentLink = this.data.links[linkId];
                        if (currentLink.fromOperator == operatorId || currentLink.toOperator == operatorId) {
                            this._deleteLink(linkId, true);
                        }
                    }
                }
            }
            if (!replace && operatorId == this.selectedOperatorId) {
                this.unselectOperator();
            }
            this.data.operators[operatorId].internal.els.operator.remove();
            delete this.data.operators[operatorId];

            this.callbackEvent('afterChange', ['operator_delete']);
        },

        deleteOpGroup: function (opGroupId) {
            this._deleteOpGroup(opGroupId, false);
        },

        _deleteOpGroup: function (opGroupId, forced) {
            if (this.selectedOpGroupId == opGroupId) {
                this.unselectOpGroup();
            }
            if (!this.callbackEvent('opGroupDelete', [opGroupId, forced])) {
                if (!forced) {
                    return;
                }
            }

            this.colorizeOpGroup(opGroupId, 'transparent');
            var opGroupData = this.data.opGroups[opGroupId];
            var rect = opGroupData.internal.els.rect;
            if (rect.remove) {
                rect.remove();
            } else {
                rect.parentNode.removeChild(rect);
            }
            delete this.data.opGroups[opGroupId];
            this.callbackEvent('afterChange', ['opGroup_delete']);
        },

        deleteLink: function (linkId) {
            this._deleteLink(linkId, false);
        },

        _deleteLink: function (linkId, forced) {
            if (this.selectedLinkId == linkId) {
                this.unselectLink();
            }
            if (!this.callbackEvent('linkDelete', [linkId, forced])) {
                if (!forced) {
                    return;
                }
            }
            this.colorizeLink(linkId, 'transparent');
            var linkData = this.data.links[linkId];
            var fromOperator = linkData.fromOperator;
            var fromConnector = linkData.fromConnector;
            var toOperator = linkData.toOperator;
            var toConnector = linkData.toConnector;
            var overallGroup = linkData.internal.els.overallGroup;
            if (overallGroup.remove) {
                overallGroup.remove();
            } else {
                overallGroup.parentNode.removeChild(overallGroup);
            }
            delete this.data.links[linkId];

            this._cleanMultipleConnectors(fromOperator, fromConnector, 'from');
            this._cleanMultipleConnectors(toOperator, toConnector, 'to');

            this.callbackEvent('afterChange', ['link_delete']);
        },

        _cleanMultipleConnectors: function (operator, connector, linkFromTo) {
            if (!this.data.operators[operator].internal.properties[linkFromTo == 'from' ? 'outputs' : 'inputs'][connector].multiple) {
                return;
            }

            var maxI = -1;
            var fromToOperator = linkFromTo + 'Operator';
            var fromToConnector = linkFromTo + 'Connector';
            var fromToSubConnector = linkFromTo + 'SubConnector';
            var els = this.data.operators[operator].internal.els;
            var subConnectors = els.connectors[connector];
            var nbSubConnectors = subConnectors.length;

            for (var linkId in this.data.links) {
                if (this.data.links.hasOwnProperty(linkId)) {
                    var linkData = this.data.links[linkId];
                    if (linkData[fromToOperator] == operator && linkData[fromToConnector] == connector) {
                        if (maxI < linkData[fromToSubConnector]) {
                            maxI = linkData[fromToSubConnector];
                        }
                    }
                }
            }

            var nbToDelete = Math.min(nbSubConnectors - maxI - 2, nbSubConnectors - 1);
            for (var i = 0; i < nbToDelete; i++) {
                subConnectors[subConnectors.length - 1].remove();
                subConnectors.pop();
                els.connectorArrows[connector].pop();
                els.connectorSmallArrows[connector].pop();
            }
        },

        deleteSelected: function () {
            if (this.selectedLinkId != null) {
                this.deleteLink(this.selectedLinkId);
            }
            if (this.selectedOperatorId != null) {
                this.deleteOperator(this.selectedOperatorId);
            }
            if (this.selectedOpGroupId != null) {
                this.deleteOpGroup(this.selectedOpGroupId);
            }
        },

        setPositionRatio: function (positionRatio) {
            this.positionRatio = positionRatio;
        },

        getPositionRatio: function () {
            return this.positionRatio;
        },

        getData: function () {
            var keys = ['operators', 'links'];
            var data = {};
            data.operators = $.extend(true, {}, this.data.operators);
            data.links = $.extend(true, {}, this.data.links);
            for (var keyI in keys) {
                if (keys.hasOwnProperty(keyI)) {
                    var key = keys[keyI];
                    for (var objId in data[key]) {
                        if (data[key].hasOwnProperty(objId)) {
                            delete data[key][objId].internal;
                        }
                    }
                }
            }
            data.operatorTypes = this.data.operatorTypes;
            return data;
        },

        getDataRef: function () {
            return this.data;
        },

        setOperatorTitle: function (operatorId, title) {
            this.data.operators[operatorId].internal.els.title.html(title);
            if (typeof this.data.operators[operatorId].properties == 'undefined') {
                this.data.operators[operatorId].properties = {};
            }
            this.data.operators[operatorId].properties.title = title;
            this._refreshInternalProperties(this.data.operators[operatorId]);
            this.callbackEvent('afterChange', ['operator_title_change']);
        },

        setOperatorBody: function (operatorId, body) {
            this.data.operators[operatorId].internal.els.body.html(body);
            if (typeof this.data.operators[operatorId].properties == 'undefined') {
                this.data.operators[operatorId].properties = {};
            }
            this.data.operators[operatorId].properties.body = body;
            this._refreshInternalProperties(this.data.operators[operatorId]);
            this.callbackEvent('afterChange', ['operator_body_change']);
        },

        getOperatorTitle: function (operatorId) {
            return this.data.operators[operatorId].internal.properties.title;
        },

        getOperatorBody: function (operatorId) {
            return this.data.operators[operatorId].internal.properties.body;
        },

        setOperatorData: function (operatorId, operatorData) {
            var infos = this.getOperatorCompleteData(operatorData);
            for (var linkId in this.data.links) {
                if (this.data.links.hasOwnProperty(linkId)) {
                    var linkData = this.data.links[linkId];
                    if ((linkData.fromOperator == operatorId && typeof infos.outputs[linkData.fromConnector] == 'undefined') ||
                        (linkData.toOperator == operatorId && typeof infos.inputs[linkData.toConnector] == 'undefined')) {
                        this._deleteLink(linkId, true);
                    }
                }
            }
            this._deleteOperator(operatorId, true);
            this.createOperator(operatorId, operatorData);
            this._refreshOperatorConnectors(operatorId);
            this.redrawLinksLayer();
            this.callbackEvent('afterChange', ['operator_data_change']);
        },
        
        doesOperatorExists: function (operatorId) {
            return typeof this.data.operators[operatorId] != 'undefined';
        },

        getOperatorData: function (operatorId) {
            var data = $.extend(true, {}, this.data.operators[operatorId]);
            delete data.internal;
            return data;
        },

        getLinksFrom: function(operatorId) {
            var result = [];

            for (var linkId in this.data.links) {
                if (this.data.links.hasOwnProperty(linkId)) {
                    var linkData = this.data.links[linkId];
                    if (linkData.fromOperator === operatorId) {
                        result.push(linkData);
                    }
                }
            }

            return result;
        },

        getLinksTo: function(operatorId) {
            var result = [];

            for (var linkId in this.data.links) {
                if (this.data.links.hasOwnProperty(linkId)) {
                    var linkData = this.data.links[linkId];
                    if (linkData.toOperator === operatorId) {
                        result.push(linkData);
                    }
                }
            }

            return result;
        },

        getOperatorFullProperties: function (operatorData) {
            if (typeof operatorData.type != 'undefined') {
                var typeProperties = this.data.operatorTypes[operatorData.type];
                var operatorProperties = {};
                if (typeof operatorData.properties != 'undefined') {
                    operatorProperties = operatorData.properties;
                }
                return $.extend({}, typeProperties, operatorProperties);
            } else {
                return operatorData.properties;
            }
        },

        _refreshInternalProperties: function (operatorData) {
            operatorData.internal.properties = this.getOperatorFullProperties(operatorData);
        },

    });
});