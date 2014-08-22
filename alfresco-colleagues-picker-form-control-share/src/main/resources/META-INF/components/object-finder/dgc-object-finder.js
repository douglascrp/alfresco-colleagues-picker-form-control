(function() {
	var Dom = YAHOO.util.Dom, Event = YAHOO.util.Event;

	Alfresco.DGCObjectFinder = function Alfresco_DGCObjectFinder(htmlId,
			currentValueHtmlId) {

		Alfresco.DGCObjectFinder.superclass.constructor.call(this, htmlId,
				currentValueHtmlId);

				Alfresco.ObjectRenderer.prototype._createControls = function DGCObjectRenderer__createControls() {
					var me = this;

					// DataSource definition
					var pickerChildrenUrl = Alfresco.constants.PROXY_URI
							+ "form/control/dgcolleaguespicker";

					this.widgets.dataSource = new YAHOO.util.DataSource(
							pickerChildrenUrl, {
								responseType : YAHOO.util.DataSource.TYPE_JSON,
								connXhrMode : "queueRequests",
								responseSchema : {
									resultsList : "items",
									metaFields : {
										parent : "parent"
									}
								}
							});

					this.widgets.dataSource.doBeforeParseData = function ObjectRenderer_doBeforeParseData(
							oRequest, oFullResponse) {
						var updatedResponse = oFullResponse;

						if (oFullResponse) {
							var items = oFullResponse.data.items;

							// Crop item list to max length if required
							if (me.options.maxSearchResults > -1
									&& items.length > me.options.maxSearchResults) {
								items = items.slice(0,
										me.options.maxSearchResults - 1);
							}

							// Add the special "Create new" record if required
							if (me.options.createNewItemUri !== ""
									&& me.createNewItemId === null) {
								items = [ {
									type : IDENT_CREATE_NEW
								} ].concat(items);
							}

							// Special case for tags, which we want to render
							// differently to
							// categories
							var index, item;
							for (index in items) {
								if (items.hasOwnProperty(index)) {
									item = items[index];
									if (item.type == "cm:category"
											&& item.displayPath
													.indexOf("/categories/Tags") !== -1) {
										item.type = "tag";
										// Also set the parent type to display
										// the
										// drop-down
										// correctly. This may need revising for
										// future
										// type
										// support.
										oFullResponse.data.parent.type = "tag";
									}
								}
							}

							// Notify interested parties of the parent details
							YAHOO.Bubbling.fire("parentDetails", {
								eventGroup : me,
								parent : oFullResponse.data.parent
							});

							// we need to wrap the array inside a JSON object so
							// the
							// DataTable
							// is happy
							updatedResponse = {
								parent : oFullResponse.data.parent,
								items : items
							};
						}

						return updatedResponse;
					};

					// DataTable column defintions
					var columnDefinitions = [ {
						key : "nodeRef",
						label : "Icon",
						sortable : false,
						formatter : this.fnRenderItemIcon(),
						width : this.options.compactMode ? 10 : 26
					}, {
						key : "name",
						label : "Item",
						sortable : false,
						formatter : this.fnRenderItemName()
					}, {
						key : "add",
						label : "Add",
						sortable : false,
						formatter : this.fnRenderCellAdd(),
						width : 16
					} ];

					var initialMessage = this
							.msg("form.control.object-picker.items-list.loading");
					if (this._inAuthorityMode()) {
						initialMessage = this
								.msg("form.control.object-picker.items-list.search");
					}

					this.widgets.dataTable = new YAHOO.widget.DataTable(this.id
							+ "-results", columnDefinitions,
							this.widgets.dataSource, {
								renderLoopSize : 100,
								initialLoad : false,
								MSG_EMPTY : initialMessage
							});

					// Rendering complete event handler
					this.widgets.dataTable
							.subscribe(
									"renderEvent",
									function() {
										if (this.options.createNewItemUri !== "") {
											if (!this.widgets.enterListener) {
												this.widgets.enterListener = new KeyListener(
														this.createNewItemId,
														{
															keys : KeyListener.KEY.ENTER
														},
														{
															fn : function ObjectRenderer__createControls_fn(
																	eventName,
																	keyEvent,
																	obj) {
																// Clear any
																// previous
																// autocomplete
																// timeout
																if (this.autocompleteDelayId != -1) {
																	window
																			.clearTimeout(this.autocompleteDelayId);
																}
																this
																		.onCreateNewItem();
																Event
																		.stopEvent(keyEvent[1]);
																return false;
															},
															scope : this,
															correctScope : true
														},
														YAHOO.env.ua.ie > 0 ? KeyListener.KEYDOWN
																: "keypress");
												this.widgets.enterListener
														.enable();
											}

											me.autocompleteDelayId = -1;
											Event
													.addListener(
															this.createNewItemId,
															"keyup",
															function(p_event) {
																var sQuery = this.value;

																// Filter out
																// keys that
																// don't
																// trigger
																// queries
																if (!Alfresco.util
																		.isAutocompleteIgnoreKey(p_event.keyCode)) {
																	// Clear
																	// previous
																	// timeout
																	if (me.autocompleteDelayId != -1) {
																		window
																				.clearTimeout(me.autocompleteDelayId);
																	}
																	// Set new
																	// timeout
																	me.autocompleteDelayId = window
																			.setTimeout(
																					function() {
																						YAHOO.Bubbling
																								.fire(
																										"refreshItemList",
																										{
																											eventGroup : me,
																											searchTerm : sQuery
																										});
																					},
																					500);
																}
															});

											Dom.get(this.createNewItemId)
													.focus();
										}
									}, this, true);

					// Hook add item action click events (for Compact mode)
					var fnAddItemHandler = function ObjectRenderer__createControls_fnAddItemHandler(
							layer, args) {
						var owner = YAHOO.Bubbling.getOwnerByTagName(
								args[1].anchor, "div");
						if (owner !== null) {
							var target, rowId, record;

							target = args[1].target;
							rowId = target.offsetParent;
							record = me.widgets.dataTable.getRecord(rowId);
							if (record) {
								YAHOO.Bubbling.fire("selectedItemAdded", {
									eventGroup : me,
									item : record.getData(),
									highlight : true
								});
							}
						}
						return true;
					};
					YAHOO.Bubbling.addDefaultAction("add-" + this.eventGroup,
							fnAddItemHandler, true);

					// Hook create new item action click events (for Compact
					// mode)
					var fnCreateNewItemHandler = function ObjectRenderer__createControls_fnCreateNewItemHandler(
							layer, args) {
						var owner = YAHOO.Bubbling.getOwnerByTagName(
								args[1].anchor, "div");
						if (owner !== null) {
							me.onCreateNewItem();
						}
						return true;
					};
					YAHOO.Bubbling.addDefaultAction("create-new-item-"
							+ this.eventGroup, fnCreateNewItemHandler, true);

					// Hook navigation action click events
					var fnNavigationHandler = function ObjectRenderer__createControls_fnNavigationHandler(
							layer, args) {
						var owner = YAHOO.Bubbling.getOwnerByTagName(
								args[1].anchor, "div");
						if (owner !== null) {
							var target, rowId, record;

							target = args[1].target;
							rowId = target.offsetParent;
							record = me.widgets.dataTable.getRecord(rowId);
							if (record) {
								YAHOO.Bubbling.fire("parentChanged", {
									eventGroup : me,
									label : record.getData("name"),
									nodeRef : record.getData("nodeRef")
								});
							}
						}
						return true;
					};
					YAHOO.Bubbling.addDefaultAction(
							"parent-" + this.eventGroup, fnNavigationHandler,
							true);
				},

				Alfresco.ObjectRenderer.prototype._updateItems = function ObjectRenderer__updateItems(
						nodeRef, searchTerm) {
					// Empty results table - leave tag entry if it's been
					// rendered
					if (this.createNewItemId !== null) {
						this.widgets.dataTable.deleteRows(1,
								this.widgets.dataTable.getRecordSet()
										.getLength() - 1);
					} else {
						this.widgets.dataTable
								.set(
										"MSG_EMPTY",
										this
												.msg("form.control.object-picker.items-list.loading"));
						this.widgets.dataTable.deleteRows(0,
								this.widgets.dataTable.getRecordSet()
										.getLength());
					}

					var successHandler = function ObjectRenderer__updateItems_successHandler(
							sRequest, oResponse, oPayload) {
						this.options.parentNodeRef = oResponse.meta.parent ? oResponse.meta.parent.nodeRef
								: nodeRef;
						this.widgets.dataTable
								.set(
										"MSG_EMPTY",
										this
												.msg("form.control.object-picker.items-list.empty"));
						if (this.createNewItemId !== null) {
							this.widgets.dataTable.onDataReturnAppendRows.call(
									this.widgets.dataTable, sRequest,
									oResponse, oPayload);
						} else {
							this.widgets.dataTable.onDataReturnInitializeTable
									.call(this.widgets.dataTable, sRequest,
											oResponse, oPayload);
						}
					};

					var failureHandler = function ObjectRenderer__updateItems_failureHandler(
							sRequest, oResponse) {
						if (oResponse.status == 401) {
							// Our session has likely timed-out, so refresh to
							// offer the
							// login
							// page
							window.location.reload();
						} else {
							try {
								var response = YAHOO.lang.JSON
										.parse(oResponse.responseText);
								this.widgets.dataTable.set("MSG_ERROR",
										response.message);
								this.widgets.dataTable.showTableMessage(
										response.message,
										YAHOO.widget.DataTable.CLASS_ERROR);
							} catch (e) {
							}
						}
					};

					// build the url to call the pickerchildren data webscript
					var url = this._generatePickerChildrenUrlParams(searchTerm);

					if (Alfresco.logger.isDebugEnabled()) {
						Alfresco.logger
								.debug("Generated pickerchildren url fragment: "
										+ url);
					}

					// call the pickerchildren data webscript
					this.widgets.dataSource.sendRequest(url, {
						success : successHandler,
						failure : failureHandler,
						scope : this
					});

					// the start location is now resolved
					this.startLocationResolved = true;
				};

		return this;
	};

	YAHOO.extend(Alfresco.DGCObjectFinder, Alfresco.ObjectFinder, {});

})();