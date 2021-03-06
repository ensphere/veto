
$.ajaxSetup({
    headers: {
        'X-CSRF-TOKEN': $( 'meta[name="csrf-token"]' ).attr( 'content' )
    }
});

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};


/**
 * Laravel Routes
 * @type {{route}}
 */
var LaravelRoutes = new function() {

    var routes = null;

    /**
     * Load JSON
     * @param path
     * @param success
     * @param error
     */
    var loadJSON = function( path, success, error )
    {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (success)
                        success(JSON.parse(xhr.responseText));
                } else {
                    if (error)
                        error(xhr);
                }
            }
        };
        xhr.open( "GET", path, false );
        xhr.send();
    };

    /**
     * Get Router
     * @param name
     * @param callback
     * @returns {*}
     */
    var getRouter = function( name, callback )
    {
        if( typeof routes[ name ] !== 'undefined' ) {
            return callback( routes[ name ] );
        } else {
            console.log( 'route [' + name + '] does not exist' );
        }
    };

    /**
     * Generate Route Uri
     * @param router
     * @param _parameters
     * @returns {string}
     */
    var generateRouteUri = function( router, _parameters )
    {
        var parameters = _parameters || [];
        router.uri = router.path;
        router.uri_variables.forEach( function( variable ) {
            var replaceWith = parameters.shift() || null;
            var rExpression = new RegExp( "{" + variable + "\\??}", "g" );
            router.uri = router.uri.replace( rExpression, replaceWith );
        });
        return '/' + router.uri;
    };

    loadJSON( window.routesUrl ? window.routesUrl : '/routes.json', function( data ) {
        routes = data;
    });

    return {
        route : function( name, parameters )
        {
            return getRouter( name, function ( router ) {
                return generateRouteUri( router, parameters );
            });
        }
    }

};



$.fn.ajaxFilter = function( _options )
{

    var _ajaxFilter = function( elm, options )
    {

        var handleOnSelectedItem = function( item, e, model )
        {
            $.post( options.addItemUrl, { relatedId: model[ options.itemIndex ] });
            addTableBodyRow( model );
        };

        options = $.extend( {

            sortable: false,
            extraQueryParameters: {},
            filterUrl: '',
            currentListUrl: '',
            removeItemUrl: '',
            addItemUrl: '',
            sortUrl: '',
            itemIndex: 'id',
            label: 'Start to type to filter:',
            noResultsText: 'No results',
            tableColumns: [ 'id', 'name' ],
            onSelectedItem : handleOnSelectedItem,
            displayRow: function( item ) {
                return '#' + item.id + ' - ' + item.name;
            }

        }, options );

        var items = {};

        var uuidv4 = function()
        {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return 'ID-' + v.toString(16);
            });
        };

        var searchTemplate = '' +
            '<div class="field c-ajax-filter">' +
            '<label class="c-ajax-filter__label">' + options.label + '</label>' +
            '<input type="text" class="form-control c-ajax-filter__input" />' +
            '</div>';

        var resultsTemplate = '' +
            '<div class="c-ajax-filter__results"></div>';

        var api = {

            search: null,
            searchBox: null,
            results: null,
            table:{
                head: null,
                body: null
            }

        };

        var xhr;

        var populateResults = function( response )
        {
            api.results.html('');
            for( var i in response ) {
                var item = response[i];
                var uid = uuidv4();
                var text = options.displayRow( item );
                var resultItem = $( '<div />' ).html( text ).addClass( 'c-ajax-filter__results__item' );
                items[uid] = item;
                api.results.prepend( resultItem );
                resultItemEvents( resultItem );
                resultItem[0].uid = uid;
            }
            api.results.width( api.searchBox.outerWidth() ).show();
        };

        var closeAndClearSearchBox = function()
        {
            api.searchBox.val( '' );
            api.results.html( '' ).hide();
        };

        var resultItemEvents = function( elm )
        {
            elm.on( 'mouseenter', onItemMouseEnterHandler );
            elm.on( 'mouseleave', onItemMouseLeaveHandler );
            elm.on( 'click', function(e) {
                options.onSelectedItem( $(this), e, items[ $( this )[0].uid ] );
                $(this).hide();
            });
        };

        var onItemMouseEnterHandler = function(e)
        {
            $(this).addClass( 'c-ajax-filter__results__item--hover' );
        };

        var onItemMouseLeaveHandler = function(e)
        {
            $(this).removeClass( 'c-ajax-filter__results__item--hover' );
        };

        var onDocumentClickHandler = function(e)
        {
            var elm = $( e.target );
            if( ! elm.parents( '.c-ajax-filter:eq(0)' ).length ) {
                closeAndClearSearchBox();
            }
        };

        var onSearchBoxKeyUpHandler = function(e)
        {
            e.preventDefault();
            if( xhr && xhr.readystate != 4 ) xhr.abort();
            xhr = $.getJSON( options.filterUrl, $.extend({ query: $(this).val() }, options.extraQueryParameters ), populateResults );
        };

        var bindEvents = function()
        {
            api.searchBox.on( 'keyup', onSearchBoxKeyUpHandler );
            $(document).on( 'click', onDocumentClickHandler );
        };

        var onClickRemoveItemHandler = function(e)
        {
            var payload = parseInt( $(this).attr('data-payload') );
            var row = $(this).parents('tr:eq(0)');
            $.post( options.removeItemUrl, $.extend({ relatedId: payload }, options.extraQueryParameters ), function(){
                row.remove();
                addNoResultsIfEmpty();
            });
        };

        var sortableHandle = function()
        {
            if( ! options.sortable ) return '';
            return '<a class="btn btn-info btn-sm handle"><i class="fa fa-arrows"></i></a>';
        };

        var addTableBodyRow = function( model )
        {
            var row = $('<tr />').attr( 'data-row-id', model[options.itemIndex] );
            if( $( '[data-for="no-results"]', api.table.body ).length ) {
                $( '[data-for="no-results"]', api.table.body ).remove();
            }
            options.tableColumns.forEach( function( column ) {
                $('<td />').text( model[column] ).appendTo( row );
            });
            $('<td />').html( '' +
                '<div class="btn-group">' +
                '<a class="btn btn-danger btn-sm js-delete" data-payload="' + model[options.itemIndex] + '"><i class="fa fa-trash"></i></a>' +
                sortableHandle() +
                '</div>'
            ).appendTo( row );
            row.appendTo( api.table.body );
            $( '[data-payload]', row ).on( 'click', onClickRemoveItemHandler );
        };

        var addNoResultsIfEmpty = function()
        {
            if( ! $( 'tr', api.table.body ).length ) {
                $('<tr />').attr( 'data-for', 'no-results' ).append( $( '<td />' ).attr( 'colspan', 20 ).text( options.noResultsText ) ).appendTo( api.table.body );
            }
        };

        var removeNoResultsIfNotEmpty = function()
        {
            if( $( 'tr', api.table.body ).length > 1 ) {
                $( '[data-for="no-results"]', api.table.body ).remove();
            }
        };

        var getCurrentList = function()
        {
            $.getJSON( options.currentListUrl, options.extraQueryParameters, function( response ) {
                for( var i in response ) {
                    addTableBodyRow( response[i] );
                }
                addNoResultsIfEmpty();

            });
        };

        var createTable = function()
        {
            var table = $('<table />').addClass( 'ui table' );
            var head = $( '<thead />');
            var body = $( '<tbody />');
            table.append( head ).append( body );
            table.insertAfter( elm );
            api.table.head = head;
            api.table.body = body;

            var row = $('<tr />');
            options.tableColumns.forEach( function( column ) {
                $('<th />').text( column.capitalize() ).appendTo( row );
            });
            $('<th width="95" />').text( 'Actions' ).appendTo( row );
            row.appendTo( api.table.head );
            getCurrentList();

        };

        var onSortEndHandler = function()
        {
            var data = [];
            $( 'tr', api.table.body ).each( function( index ) {
                data.push( $(this).attr( 'data-row-id' ) );
            });
            $.post( options.sortUrl, { sort: data } );
        };

        var init = function()
        {
            var search = $( searchTemplate ).appendTo( elm );
            var results = $( resultsTemplate ).appendTo( search );
            api.search = search;
            api.searchBox = $( '.c-ajax-filter__input', api.search );
            api.results = results;
            createTable();
            bindEvents();
            if( options.sortable ) {
                api.sortable = Sortable.create( api.table.body.get(0), {
                    handle: '.handle',
                    onUpdate: onSortEndHandler
                });
            }
        };

        init();

        return api;

    };

    return $(this).each( function() {

        $(this)[0].ajaxFilter = new _ajaxFilter( $(this), _options );

    });

};


/**
 * Ensphere Container
 */
$.fn.ensphere = new function() {

    /**
     * Veto
     */
    this.veto = new function() {

        var modal;

        var wysiwygSelectors = [];

        var parseNotifications = function()
        {
            $('[type="ensphere/notification"]').each(function(){
                var options = JSON.parse( $(this).html() );
                new PNotify( options );
            });
        };

        var removePageLoader = function()
        {
            var loader = $('#loader');
            if( loader.length ) {
                loader.fadeOut( 200, function(){
                    $(this).remove();
                });
            }
        };

        var openMenuWhenActiveUrlParentIsPresent = function()
        {
            $( '> a', $('#sidebar-menu .active-url-parent:eq(0)').parents('#sidebar-menu .has-children:eq(0)') ).trigger( 'click' );
        };

        var forceModalCloseBox = function()
        {
            $(document).on( 'mousedown', '.ui-dialog-titlebar-close', function(){
                $('textarea').redactor('modal.close');
            });
        };

        var onDocumentReady = function()
        {
            parseNotifications();
            CharacterLimiter();
            forceModalCloseBox();

            $.fn.ensphere.veto.wysiwyg( '.veto-wysiwyg' );
            //openMenuWhenActiveUrlParentIsPresent();
        };

        var onWindowLoad = function()
        {
            removePageLoader();
        };

        /**
         *
         * @param errors
         * @param modal
         */
        var modalError = function( errors, modal )
        {
            var wrapper = $('<div class="alert alert-danger" role="alert"><div class="header">There was some errors with your submission</div><ul class="list"></ul></div>');
            errors.forEach(function(error){
                $('<li />').text(error).appendTo( $( 'ul', wrapper ) );
            });
            $('[data-for="error-wrapper"]', modal).html('').append(wrapper);
            modal.semanticUiModal('refresh');
        };

        /**
         *
         * @param obj
         */
        var attachWYSIWYG = function( obj )
        {
            if( obj.data( 'wysiwyg' ) ) return false;
            $.Redactor.prototype.scriptbuttons = function()
            {
                return {
                    init: function()
                    {
                        var cite = this.button.add('cite', 'Cite');

                        this.button.addCallback(cite, this.scriptbuttons.formatCite);

                        // Set icons
                        this.button.setAwesome('cite','fa-quote-right');
                    },
                    formatCite: function()
                    {
                        this.inline.format('cite');
                    }
                };
            };
            obj.data( 'wysiwyg', true );
            obj.redactor({
                minHeight : 300,
                toolbarFixed : true,
                cleanStyleOnEnter : true,
                buttons: ['html', 'formatting', 'bold', 'italic', 'deleted', 'unorderedlist', 'orderedlist',
                  'outdent', 'indent', 'link', 'alignment', 'horizontalrule'],
                deniedTags : ['html', 'head', 'link', 'body', 'meta', 'script', 'style', 'applet' ],
                plugins : [ 'mediaManager', 'scriptbuttons', 'properties' ]
            });
        };

        var checkForNewWysiwygInstances = function()
        {
            setTimeout( function(){
                wysiwygSelectors.forEach( function(selector) {
                    $( selector + ':visible' ).each( function(){
                        if( ! $(this).data( 'wysiwyg' ) ) {
                            attachWYSIWYG( $(this) );
                        }
                    });
                });
            }, 200 );

        };

        var CharacterLimiter = function()
        {

            var app = function( self )
            {

                var elm = $(self);

                var startElm = elm.clone();

                var counting = null;

                var input = null;

                var placeholder = null;

                var maxChars = parseInt( elm.attr( 'data-character-limit' ) );

                /**
                 *
                 * @returns {jQuery|HTMLElement}
                 */
                var buildPlaceholder = function()
                {
                    var template = '<div class="c-character-limiter"><div data-for="input" class="c-character-limiter__input"></div><div class="count"><span class="c-character-limiter__counting" data-for="counting">0</span></div></div>';
                    return $( template );
                };

                var destroy = function()
                {

                };

                var setCharCount = function()
                {
                    var remaining = maxChars - elm.val().length;
                    counting.text(remaining).removeClass( 'danger warning' );
                    if( remaining <= 0 ) {
                        counting.addClass( 'danger' );
                    } else if( remaining <= 10 ) {
                        counting.addClass( 'warning' );
                    }
                };

                var start = function()
                {
                    placeholder = buildPlaceholder();
                    placeholder.insertBefore( elm );
                    elm.appendTo( $( '[data-for="input"]', placeholder ) );
                    input = $( '[data-for="input"]', placeholder );
                    counting = $( '[data-for="counting"]', placeholder );

                    elm.on( 'keyup', setCharCount ).trigger( 'keyup' );
                };

                var api = {
                    destroy: destroy
                };

                start();

                return api;
            };

            $('[data-character-limit]').each( function () {
                $(this).data( 'character-limit', new app( this ) );
            });

        };

        $(document).bind( 'click.veto', checkForNewWysiwygInstances );

        $( ".js-delete" ).bind( "click", function(e) {
            var button = $(this);
            e.preventDefault();
            swal({
                title: "Are you sure?",
                text: "This action cannot be reversed",
                type: "warning",
                showCancelButton: true,
                confirmButtonClass: 'btn-danger',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: "No, cancel please!",
                closeOnConfirm: false,
                closeOnCancel: false
            }, function( isConfirm ) {
                if ( isConfirm ) {
                    window.location = button.attr('href');
                } else {
                    swal.close();
                }
            });
        });

        /**
         * Refreshes the modal
         */
        this.refreshModal = function()
        {
            modal.semanticUiModal( 'refresh' );
        };

        /**
         *
         * @param text
         * @returns {string}
         */
        this.slugify = function( text )
        {
            return text.toString().toLowerCase()
                .replace( /\s+/g, '-' )           // Replace spaces with -
                .replace( /[^\w\-]+/g, '' )       // Remove all non-word chars
                .replace( /\-\-+/g, '-' )         // Replace multiple - with single -
                .replace( /^-+/, '' )             // Trim - from start of text
                .replace( /-+$/, '' );            // Trim - from end of text
        };

        /**
         *
         * @param selector
         * @param context
         */
        this.wysiwyg = function( selector, context )
        {
            wysiwygSelectors.push( selector );
            context = context || $(document);
            attachWYSIWYG( $( selector, context ) );
        };

        /**
         *
         * @param selector
         * @param el
         * @returns {*}
         */
        this.select = function( selector, el ) {
            if ( ! el ) { el = document; }
            return Array.prototype.slice.call( el.querySelectorAll( selector ) );
        };

        /**
         *
         * @param node
         * @param _callbacks
         */
        this.singleSelect = function( selector, el ) {
            if ( ! el ) { el = document; }
            return el.querySelector( selector );
        };

        /**
         *
         * @param elm
         * @param callback
         */
        this.clickEvent = function( elm, callback )
        {
            elm.removeEventListener( "click", callback );
            elm.addEventListener( "click", callback );
        };

        /**
         *
         * @param node
         * @param _callbacks
         */
        this.keyUpEvent = function( elm, callback )
        {
            if( elm ) {
                elm.removeEventListener( "keyup", callback );
                elm.addEventListener( "keyup", callback );
            }
        };

        /**
         *
         * @param node
         * @param _callbacks
         */
        this.focusEvent = function( elm, callback )
        {
            if( elm ) {
                elm.removeEventListener( "focus", callback );
                elm.addEventListener( "focus", callback );
            }
        };

        /**
         *
         * @param node
         * @param _callbacks
         */
        this.modalEdit = function( node, _callbacks )
        {
            var form = $(node).parents( 'form:eq(0)' );
            _callbacks = _callbacks || {};
            var callbacks = $.extend({
                onVisible   : function(){},
                onComplete  : function(){},
                onError     : function(){},
                onSave      : function(){},
                onResponse  : function(){},
                closeModal  : true
            }, _callbacks);
            var attributes = $.fn.ensphere.veto.getAttributes( node );
            $(node).blur();
            $.get( attributes.href, function( response ) {
                callbacks.onResponse( response, attributes );
                if( typeof $( response )[0].ownerDocument !== 'undefined' ) {
                    $.fn.ensphere.veto.modalResponse( response, attributes, callbacks );
                }
            });
        };

        /**
         *
         * @param node
         * @returns {{}}
         */
        this.getAttributes = function( node )
        {
            var attributes = {};
            for( var i in node.attributes ) {
                if( node.attributes.hasOwnProperty( i ) ) {
                    attributes[node.attributes[i].name] = node.attributes[i].nodeValue;
                }
            }
            return attributes;
        };


        this.route  = function( name, parameters )
        {
            return LaravelRoutes.route( name, parameters );
        };

        /**
         *
         * @param response
         * @param attributes
         * @param callbacks
         */
        this.modalResponse = function( response, attributes, callbacks ){
            if( typeof modal !== 'undefined' ) {
                modal.semanticUiModal('close');
            }
            modal = $(response);
            modal.semanticUiModal({
                observeChanges : false,
                onVisible : function() {
                    var modalObj = $(this);
                    var buttons = $('.ui.button, .btn.btn-success', modalObj);
                    var _token = $('[name="_token"]', modalObj).val();
                    var form = $('form', modalObj);

                    buttons.each(function(){
                        $(this).click( function(e){
                            var button = $(this);
                            e.preventDefault();
                            if( form.length && button[0].tagName.toLowerCase() === 'button' ) {
                                var action = form.attr('action');
                            } else {
                                var action = $(this).attr('href');
                            }
                            callbacks.onSave( $(this), modalObj );
                            var ajaxOptions = {
                                type: 'GET',
                                async: false,
                                url: action,
                                data : $('input, select, textarea', form).not('[name="_token"]').serialize(),
                                success: function( response ){
                                    if( $(response)[0].id ) {
                                        callbacks.onComplete( response, attributes, modal );
                                    } else {
                                        $.fn.ensphere.veto.modalResponse( response, attributes, callbacks );
                                    }
                                },
                                error: function ( xhr, textstatus ) {
                                    switch( xhr.status ) {
                                        case 422 :
                                            var errors = [];
                                            /** Validation error */
                                            var response = JSON.parse( xhr.responseText );
                                            for( var i in response ) {
                                                errors.push( response[i][0] );
                                            }
                                            modalError( errors, modal );
                                            break;
                                        case 403 :
                                            modalError( ["Request middleware denied this action"], modal );
                                            break;
                                        default :
                                            modalError( ['Unknown error has occurred: ["' + xhr.status + '","' + textstatus + '"]'], modal );
                                            break;
                                    }
                                    callbacks.onError( modalObj, xhr );
                                }
                            };
                            if( form.length ) {
                                ajaxOptions.headers = { 'X-CSRF-TOKEN' : _token };
                                ajaxOptions.type = 'POST';
                            }
                            $.ajax(ajaxOptions);
                        });
                    });
                    callbacks.onVisible( modalObj );
                }
            }).semanticUiModal('show');
        };

        $(document).ready(onDocumentReady);
        $(window).load(onWindowLoad);


    };
};

//# sourceMappingURL=all.js.map
