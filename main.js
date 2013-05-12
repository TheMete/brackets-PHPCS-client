/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, CSSLint, Mustache */

define(function (require, exports, module) {
    'use strict';

    var Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        Menus                   = brackets.getModule("command/Menus"),
        Resizer                 = brackets.getModule("utils/Resizer"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils");
    
    var panelHtml               = require("text!templates/bottom-panel.html"),
        tableHtml               = require("text!templates/phpcs-table.html"),
        HEADER_HEIGHT           = 27;
    
    var lintUrl                 = "http://slofish.net/PHPCS/PHPCS.php";

    //commands 
    var VIEW_HIDE_PHPCS = "phpsc.run";
    
    function _handleLint() {
        var editor = EditorManager.getCurrentFullEditor();
        if (!editor) {
            _handleShowPHPCS();
            return;
        }
        var text = editor.document.getText();
        var currentDoc = DocumentManager.getCurrentDocument();
        var filename = currentDoc.file.fullPath.replace(/^.*[\\\/]/, '');
        
        $.post(lintUrl, {filename: filename, data: text}, function (messages) {
            
            var jsonStartNdx = messages.indexOf("{");
            
            messages = messages.substr(jsonStartNdx);
            messages = $.parseJSON(messages);
            messages = messages.reportList;
            if (messages.length) {
                var $selectedRow;
    
                var html = Mustache.render(tableHtml, {reportList: messages});
    
                $("#phpcs .resizable-content")
                    .empty()
                    .append(html);
                
                $("#phpcs .resizable-content").find("tr").on("click", function (e) {
                    if ($selectedRow) {
                        $selectedRow.removeClass("selected");
                    }
    
                    $(this).addClass("selected");
                    $selectedRow = $(this);
                    var lineTd = $(this).find("td.line");
                    var line = lineTd.text();
                    var col = lineTd.data("col");
    
                    var editor = EditorManager.getCurrentFullEditor();
                    editor.setCursorPos(line - 1, col - 1);
                    EditorManager.focusEditor();
    
                });
    
            } else {
                $("#phpcs .resizable-content")
                    .empty()
                    .append("<p>No issues.</p>");
            }
        }, "text");
    }

    function _handleShowPHPCS() {
        var $phpcs = $("#phpcs");
        
        if ($phpcs.css("display") === "none") {
            $phpcs.show();
            CommandManager.get(VIEW_HIDE_PHPCS).setChecked(true);
            _handleLint();
            $(DocumentManager).on("currentDocumentChange documentSaved", _handleLint);
        } else {
            $phpcs.hide();
            CommandManager.get(VIEW_HIDE_PHPCS).setChecked(false);
            $(DocumentManager).off("currentDocumentChange documentSaved", null,  _handleLint);
        }
        EditorManager.resizeEditor();

    }
    
    CommandManager.register("Enable PHPCS", VIEW_HIDE_PHPCS, _handleShowPHPCS);

    function init() {
        
        var s;

        ExtensionUtils.loadStyleSheet(module, "phpcs.css");

        s = Mustache.render(panelHtml);
        $(s).insertBefore("#status-bar");

        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(VIEW_HIDE_PHPCS, "", Menus.AFTER);

        $('#phpcs .phpcs-close').click(function () {
            CommandManager.execute(VIEW_HIDE_PHPCS);
        });


        // AppInit.htmlReady() has already executed before extensions are loaded
        // so, for now, we need to call this ourself
        Resizer.makeResizable($('#phpcs').get(0), "vert", "top", 200);

    }
    
    init();
    
});