
//-------------------------------------------------------------------------------------------------------------
// Utilities
//-------------------------------------------------------------------------------------------------------------

function pageToPDF(page) {
	var pageArray = [page];
	MSPDFBookExporter.exportPages_defaultFilename(pageArray, page.name() + ".pdf");
}


//-------------------------------------------------------------------------------------------------------------
// Export all pages to PDF
//-------------------------------------------------------------------------------------------------------------


function allPagesToPDF(context) {
	var doc = context.document;
	var pages = doc.pages();
	var documentName = doc.hudClientName().replace(".sketch", "");

	MSPDFBookExporter.exportPages_defaultFilename(pages, documentName + ".pdf");
}


//-------------------------------------------------------------------------------------------------------------
// Export current page to PDF
//-------------------------------------------------------------------------------------------------------------


function currentPageToPDF(context) {
	pageToPDF(context.document.currentPage());
}


//-------------------------------------------------------------------------------------------------------------
// Export only selected artboards to PDF
//-------------------------------------------------------------------------------------------------------------


function selectedArtboardsToPDF(context) {

	var doc = context.document;
	var pages = doc.pages();
	var selectedLayers = NSArray.array();

	for (var i = 0; i < pages.length; i++) {
		var selectedLayersInPage = pages[i].selectedLayers().layers();
		var numLayers = selectedLayersInPage.length;

		if (numLayers > 0) {
			selectedLayers = selectedLayers.arrayByAddingObjectsFromArray(selectedLayersInPage);
		}
	};

	var selection = selectedLayers

	// Check for artboards in selection

	var selectionContainsArtboards = false;

	var indexx = 0
	for (var i = 0; i < selection.length; i++) {
		if (selection[i].isMemberOfClass(MSArtboardGroup)) {
			selectionContainsArtboards = true;
			indexx = i
		}
	}
	if (!selectionContainsArtboards) {
		doc.showMessage("未选中任何画板！")
		return;
	}


	// Creat temporary page to house selected artboards

	var tempPage = MSPage.new();
	doc.documentData().addPage(tempPage);
	//改动这个变量来自定义输出名称
	var exportName = selection[indexx].name() + " " + getStandardTime()
	///——————————————————————
	tempPage.setName(exportName);
	//tempPage.addLayers(selection);//
	for (var j = 0; j < selection.length; j++) {
		if (selection[j].isMemberOfClass(MSArtboardGroup)) {
			copyArtboardToPage(tempPage, selection[j])
		}
	}

	// Remove hidden layers

	var tempLayers = tempPage.children()
	for (var i = 0; i < tempLayers.length; i++) {
		var layer = tempLayers[i];
		if (layer.isVisible() == 0) {
			layer.removeFromParent();
		}
	}

	// Detach symbols to prevent display bug

	var pageChildren = tempPage.children();
	for (var i = 0; i < pageChildren.length; i++) {
		var layer = pageChildren[i];
		if (layer.isMemberOfClass(MSSymbolInstance)) {
			findAndDetachFromSymbol(layer);
		}
	}

	function findAndDetachFromSymbol(layer) {
		if (layer.isMemberOfClass(MSSymbolInstance)) {
			var group = layer.detachStylesAndReplaceWithGroupRecursively(true);
			var children = group.children();
			for (var i = 0; i < children.length; i++) {
				findAndDetachFromSymbol(children[i]);
			}
		}
	}
	function copyArtboardToPage(newPage, artboard) {
		var layersArray = [artboard layers];
		var copyArray = new Array();
		for (var i = 0; i < layersArray.length; i++) {
			log("happening" + i)
			var layerCopy = layersArray[i].duplicate()
			copyArray.push(layerCopy);
			artboard.removeLayer(layerCopy)
			layersArray = [artboard layers];
		}
		var Artboard = require("sketch/dom").Artboard;
		var Rectangle = require('sketch/dom').Rectangle;
		var properties = {
			name: artboard.name(),
			parent: newPage,
			frame: new Rectangle(
				artboard.frame().x(),
				artboard.frame().y(),
				artboard.frame().width(),
				artboard.frame().height()
			),
			layers: copyArray,
			selected: false
		};
		new Artboard(properties);
	}
	pageToPDF(tempPage);
	tempPage.removeFromParent();
	doc.documentData().removePage(tempPage)



	function getStandardTime() {
		var date = new Date();
		var month = date.getMonth();
		month += 1;
		if (month < 10) {
			month = "0" + month
		}

		var day = date.getDate();
		if (day < 10) {
			day = "0" + day
		}
		return "" + date.getFullYear() + month + day;
	}
}
function customizePagesToPDF(context) {
	var sketch = require("sketch");
	var conformingArtboards = getConformingArtboards(context)
	var conformingArtboardNames = new Array();

	var twoDimArtboards = new Array()
	
	for(var i = 0;i<conformingArtboards.length;i++){
		var name = conformingArtboards[i].name()
		name = name.substring(name.indexOf("【")+1,name.indexOf("】"))
		var nameIndex = conformingArtboardNames.indexOf(name)
		log("nameIndex:"+nameIndex)
		if(nameIndex == -1){
			conformingArtboardNames = conformingArtboardNames.concat(name)
			twoDimArtboards.push(new Array);
			twoDimArtboards[twoDimArtboards.length-1].push(conformingArtboards[i]);
		}else{
			twoDimArtboards[nameIndex].push(conformingArtboards[i]);
		}
	}
	
	
	//仅供查看组名使用
	// for(var j = 0;j<conformingArtboardNames.length;j++){
	// 	log(conformingArtboardNames[j])
	// }

	var Dialog = require("../modules/Dialog").dialog;
	var ui = require("../modules/Dialog").ui;
	var dialog = new Dialog(
		"导出符合规则的画板",
		"当画板命名符合一定规则时，这些画板可以被集合导出为 PDF 。",
		300,
		["导出","关闭"]
	);
	var pageLabelView = ui.textLabel("选择要导出的画板组：");
	dialog.addView(pageLabelView);

	var pageNames = conformingArtboardNames;
	var choosePageView = ui.popupButton(pageNames, 200);
	dialog.addView(choosePageView);
	// Run
	//监听选中的操作
	// choosePageView.setCOSJSTargetFunction(function(sender) {
	// 	log(pageNames[sender.indexOfSelectedItem()]);
	// });
	var responseCode = dialog.run();
	if(responseCode == 1000){
		log("当前选中的画板"+pageNames[choosePageView.indexOfSelectedItem()])
		artboardsToPDF(twoDimArtboards[choosePageView.indexOfSelectedItem()],conformingArtboardNames[choosePageView.indexOfSelectedItem()],context)
	}
}
function getConformingArtboards(context){
	var doc = context.document;
	var pages = [doc pages];
	var artboardArray = new Array();
	for (var i = 0; i < pages.count(); i++) {
		var eachPage = pages[i]
        var eachPageArtboards = [eachPage artboards];
        //遍历每个画板除了组件page

        if (pages[i].name() == "Symbols" || pages[i].name() == "组件") {
            log("跳过了page" + pages[i].name())
            continue;
        }
        for (var j = 0; j < eachPageArtboards.count(); j++) {
			var eachArtboard = eachPageArtboards[j]
			if(eachArtboard.name().indexOf("【") != -1 && eachArtboard.name().indexOf("】") != -1 && (eachArtboard.name().indexOf("】") >= eachArtboard.name().indexOf("【"))){
				log(eachArtboard.name())
				artboardArray = artboardArray.concat(eachArtboard)
			}
        }
	}
	log(artboardArray.length)
	return artboardArray
}
function artboardsToPDF(artboards,name,context){
    var doc = context.document;
	var selection = artboards;

	var selectionContainsArtboards = false;

	for (var i = 0; i < selection.length; i++) {
		if (selection[i].isMemberOfClass(MSArtboardGroup)) {
			selectionContainsArtboards = true;
		}
	}
	if (!selectionContainsArtboards) {
		doc.showMessage("未选中任何画板！")
		return;
	}


	// Creat temporary page to house selected artboards

	var tempPage = MSPage.new();
	doc.documentData().addPage(tempPage);
	//改动这个变量来自定义输出名称
	var exportName = name + " " + getStandardTime()
	///——————————————————————
	tempPage.setName(exportName);
	//tempPage.addLayers(selection);//
	for (var j = 0; j < selection.length; j++) {
		if (selection[j].isMemberOfClass(MSArtboardGroup)) {
			copyArtboardToPage(tempPage, selection[j])
		}
	}

	// Remove hidden layers

	var tempLayers = tempPage.children()
	for (var i = 0; i < tempLayers.length; i++) {
		var layer = tempLayers[i];
		if (layer.isVisible() == 0) {
			layer.removeFromParent();
		}
	}

	// Detach symbols to prevent display bug

	var pageChildren = tempPage.children();
	for (var i = 0; i < pageChildren.length; i++) {
		var layer = pageChildren[i];
		if (layer.isMemberOfClass(MSSymbolInstance)) {
			findAndDetachFromSymbol(layer);
		}
	}

	function findAndDetachFromSymbol(layer) {
		if (layer.isMemberOfClass(MSSymbolInstance)) {
			var group = layer.detachStylesAndReplaceWithGroupRecursively(true);
			var children = group.children();
			for (var i = 0; i < children.length; i++) {
				findAndDetachFromSymbol(children[i]);
			}
		}
	}
	function copyArtboardToPage(newPage, artboard) {
		var layersArray = [artboard layers];
		var copyArray = new Array();
		for (var i = 0; i < layersArray.length; i++) {
			log("happening" + i)
			var layerCopy = layersArray[i].duplicate()
			copyArray.push(layerCopy);
			artboard.removeLayer(layerCopy)
			layersArray = [artboard layers];
		}
		var Artboard = require("sketch/dom").Artboard;
		var Rectangle = require('sketch/dom').Rectangle;
		var properties = {
			name: artboard.name(),
			parent: newPage,
			frame: new Rectangle(
				artboard.frame().x(),
				artboard.frame().y(),
				artboard.frame().width(),
				artboard.frame().height()
			),
			layers: copyArray,
			selected: false
		};
		new Artboard(properties);
	}
	pageToPDF(tempPage);
	tempPage.removeFromParent();
	doc.documentData().removePage(tempPage)



	function getStandardTime() {
		var date = new Date();
		var month = date.getMonth();
		month += 1;
		if (month < 10) {
			month = "0" + month
		}

		var day = date.getDate();
		if (day < 10) {
			day = "0" + day
		}
		return "" + date.getFullYear() + month + day;
	}
}