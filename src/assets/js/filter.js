

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
                closeAndClearSearchBox();
                removeNoResultsIfNotEmpty();
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
                $('<th />').text( column ).appendTo( row );
            });
            $('<th width="95" />').text( 'actions' ).appendTo( row );
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
