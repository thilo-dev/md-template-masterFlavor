jQuery.sap.require("sap.ui.demo.mdskeleton.util.Controller");

sap.ui.demo.mdskeleton.util.Controller.extend("sap.ui.demo.mdskeleton.view.Master", {

		/* =========================================================== */
		/* begin: lifecycle methods                                    */
		/* =========================================================== */

		
		/**
		* Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		*/
		onInit : function () {
			// helper variables
			this.oList = this.byId("list");
			this.oListFilterState = {
				filter : [],
				search : []
			};
			this.oListSorterState = {
				group : [],
				sort : []
			};

			// TODO: what is to do here?
			this.bDeviceIsPhone = sap.ui.Device.system.phone;

			// Attach on routes
			this.getRouter().getRoute("main").attachPatternMatched(this.onMainRouteMatched, this);
			this.getRouter().getRoute("object").attachPatternMatched(this.onDetailRouteMatched, this);
			this.getRouter().getRoute("catchallMaster").attachPatternMatched(this.onNotFoundRouteMatched, this);
		},
	
		
		/* =========================================================== */
		/* begin: routing event handlers                               */
		/* =========================================================== */


		onNotFoundRouteMatched : function () {
			this.oList.removeSelections();
			//TODO: display not found view ?!!!
			// This is not called??? Why 
		},
	
		onMainRouteMatched : function(oEvent) {
			
			// TODO: replace with target (new routing feature)
			this.getRouter().myNavToWithoutHash({ 
				currentView : this.getView(),
				targetViewName : "sap.ui.demo.mdskeleton.view.Detail",
				targetViewType : "XML"
			});


			// if the Data is available we can continue and inform the detail
			this.oList.attachEventOnce("updateFinished", function(oEvent) {
				this._setListItemCount(oEvent.getParameter("total"));
				this._selectItemByPosition(0);
				// Tell the datail to set its context
				
				var sBindingPath = this.oList.getItems()[0].getBindingContext().getPath();

				// tell the detail to update its binding context
				this.getEventBus().publish("Master", "InitialLoadFinished", {
					bindingPath : sBindingPath
				});

				this.oList.attachEvent("updateFinished", function(oEvent){
					this._setListItemCount(oEvent.getParameter("total"));
					//this.oList.setBusy(false);
				}, this);
			}, this)
		},

		onDetailRouteMatched : function(oEvent){
			
			// TODO: replace with target (new routing feature)
			this.getRouter().myNavToWithoutHash({ 
				currentView : this.getView(),
				targetViewName : "sap.ui.demo.mdskeleton.view.Detail",
				targetViewType : "XML"
			});

			var oParameters = oEvent.getParameters();
			sObjectPath = "/Objects('"+ oParameters.arguments.objectId + "')";		
			
			// If there is already a item selected on the list we can select the new one
			if(this.oList.getSelectedItem()){
				this._selectItemByPath(sObjectPath);
				this.getEventBus().publish("Master", "ItemSelectedOnMaster", {
						bindingPath : sObjectPath
					});
			// If not we will have to wait for the data to arrive
			} else {
				this.oList.attachEventOnce("updateFinished", function(oEvent) {
					this._setListItemCount(oEvent.getParameter("total"));
					this._selectItemByPath(sObjectPath);
					this.getEventBus().publish("Master", "InitialLoadFinished", {
						bindingPath : sObjectPath
					});
				}, this);
			}
		},

	
	
		/* =========================================================== */
		/* begin: event handlers                                       */
		/* =========================================================== */
	
		/* 
		 * search handler for the master search field
		 * @param {sap.ui.base.Event} oEvent the search field event
		 */

		
		onSearch : function (oEvent) {
			var sQuery = oEvent.getParameter("query");
	
			if (sQuery && sQuery.length > 0) {
				this.oListFilterState.search = [new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sQuery)];
			} else {
				this.oListFilterState.search = [];
			}
			this._applyFilterSearch();
		},

		/*
		 *  SortGroupFilter can either be impplemented as single selects
		 *  or one View Settings Dialog. Use the respective code blocks 
		 *  to implement custom functionality
		 *  
		 */
		
		
		/* View Settings Dialog Based SortGroupFilter                 */ 
		/* =========================================================== */
		
		
		onOpenViewSettings : function(oEvent){
			if(!this.oViewSettingsDialog){
				this.oViewSettingsDialog = sap.ui.xmlfragment("sap.ui.demo.mdskeleton.view.ViewSettingsDialog", this);
			}
				this.getView().addDependent(this.oViewSettingsDialog)
			this.oViewSettingsDialog.open();
		},
		
		onConfirmViewSettingsDialog : function(oEvent) {
			var mParams = oEvent.getParameters();

			if(mParams.groupItem){
				var sKey = mParams.groupItem.getKey(),
					bDescending = mParams.groupDescending,
					oGroups = {
							Group1 : "Rating",
							Group2 : "UnitNumber"
						};
				
				this.oListSorterState.group = [new sap.ui.model.Sorter(oGroups[sKey], bDescending, sap.ui.demo.mdskeleton.util.groupers[sKey])];
					
			} else {
					this.oListSorterState.group = [];
			}

			if (mParams.sortItem) {
				var sPath = mParams.sortItem.getKey(),
					bDescending = mParams.sortDescending;

				this.oListSorterState.sort = [new sap.ui.model.Sorter(sPath, bDescending)];
			}

			this._applyGroupSort();
	
			if (mParams.filterItems) {
				var aFilters = [],
					sFilters = "";
				
				jQuery.each(mParams.filterItems, function (i, oItem) {
					var sKey = oItem.getKey(),
						sValue = oItem.getText();

					switch (sKey) {
					case "Filter1":
						aFilters.push(new sap.ui.model.Filter("UnitNumber", sap.ui.model.FilterOperator.LE, 100));	
						break;
					case "Filter2":
						aFilters.push(new sap.ui.model.Filter("UnitNumber", sap.ui.model.FilterOperator.GT, 100));	
						break;
					}
					sFilters += sValue + ", ";
				});
				sFilters = sFilters.substr(0, sFilters.length - 2);
				this.oListFilterState.filter = aFilters;
			}
			this.byId("filterBar").setVisible(this.oListFilterState.filter.length > 0);
			this.byId("filterBarLabel").setText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("masterFilterBarText", [sFilters]));
			this._applyFilterSearch();
		},
		
		/* Single Select Based SortGroupFilter                         */
		/* =========================================================== */
		
		onSort : function(oEvent){
			var sPath = oEvent.getParameter("selectedItem").getKey();

			this.oListSorterState.sort  = new sap.ui.model.Sorter(sPath, false);
			this._applyGroupSort();
		},

		onFilter : function (oEvent) {
			var sKey = oEvent.getParameter("selectedItem").getKey(),
				sValue = oEvent.getParameter("selectedItem").getText();
			switch (sKey) {
			case "Filter1":
				this.oListFilterState.filter = [new sap.ui.model.Filter("UnitNumber", sap.ui.model.FilterOperator.LE, 100)];	
				break;
			case "Filter2":
				this.oListFilterState.filter = [new sap.ui.model.Filter("UnitNumber", sap.ui.model.FilterOperator.GT, 100)];	
				break;
			default:
				this.oListFilterState.filter = [];
			}
			this.byId("filterBar").setVisible(this.oListFilterState.filter.length > 0);
			this.byId("filterBarLabel").setText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("masterFilterBarText", [sValue]));
			this._applyFilterSearch();
			
		},
		
		onFilterBarPressed: function () {
			// TODO : clarify!
		},
		
		onGroup : function(oEvent) {
			var sKey = oEvent.getParameter("selectedItem").getKey(),
				// TODO : make this better!
				oGroups = {
					Group1 : "Rating",
					Group2 : "UnitNumber"
				};

			if (sKey !== "none") {
				debugger;
				this.oListSorterState.group = [new sap.ui.model.Sorter(oGroups[sKey], false, jQuery.proxy(sap.ui.demo.mdskeleton.util.groupers[sKey], oEvent.getSource()))];
			} else {
				this.oListSorterState.group = [];
			}
			this._applyGroupSort();
		},
	
		
	
		onSelect : function(oEvent) {
			// get the list item, either from the listItem parameter or from the event's
			// source itself (will depend on the device-dependent mode).
			this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/*
		 * 
		 * 
		 */
		// _waitForInitialListLoading : function (fnToExecute) {
		// 	jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
		// },

		/*
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created 
		 * 
		 * @param: {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail : function(oItem) {
			var bReplace = jQuery.device.is.phone ? false : true,
				sPath = oItem.getBindingContext().getPath();
			
			// Tell the detail to diplay the new item
			this.getEventBus().publish("Master", "ItemSelectedOnMaster", {
				bindingPath : sPath,
				objectId : null
			});

			// make the hash
			this.getRouter().navTo("object", {
				objectPath: sPath
			}, bReplace);


		},
		
		/*
		 * Sets the item count on the master list header
		 * @private
		 */
		_setListItemCount : function(iTotalElements){
			
			// TODO: what to do if the length is not final????
			if(this.oList.getBinding('items').isLengthFinal()) {
				//var iItems = this.byId("list").getBinding("items").getLength(),
				var sTitle = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("masterTitleCount", [iTotalElements]);
	
				this.byId("page").setTitle(sTitle);			
			} else {
			}
		},

		_selectItemByPath : function(sObjectPath){

			var aItems = this.oList.getItems(),
				bItemSelected = false

			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].getBindingContext().getPath() === sObjectPath) {
					this.oList.setSelectedItem(aItems[i], true);
					bItemSelected = true;
					break;
				}
			}
			if(!bItemSelected){
				this.oList.removeSelections();
			}
		},
		 /*
		  * Internal helper method to apply both filter and search state together on the list binding
		  * @private
		  */
		_applyFilterSearch : function () {
			var aFilters = this.oListFilterState.search.concat(this.oListFilterState.filter);
			this.oList.getBinding("items").filter(aFilters, "Application");
		},
		
		/*
		 * Internal helper method to apply both group and sort state together on the list binding
		 * @private
		 */ 
		_applyGroupSort : function () {
			var aSorters = this.oListSorterState.group.concat(this.oListSorterState.sort);
			this.oList.getBinding("items").sort(aSorters);
		},
		
		/*
		 * Selects a list item by it's position in the list
		 * 
		 * @param {integer} iPosition the position in the list
		 *
		 * @private
		 */
		_selectItemByPosition : function(iPosition) {
			var aItems = this.oList.getItems();
	
			if (aItems.length) {
				this.oList.setSelectedItem(aItems[iPosition], true);
			}
		}

		
	
	});