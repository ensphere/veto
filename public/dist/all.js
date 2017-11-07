
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

        var onDocumentReady = function()
        {
            parseNotifications();
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

                        /**
                         * Add a dropdown list containing elements that can be applied to the selected text:
                         */
                        var dropdown = {
                            'Button': {
                                'title': 'Button',
                                'func': function() {
                                    // this.selection.format('a.c-btn.c-btn--primary');
                                    console.log(this.selection.getNodes());
                                    $.each(this.selection.getNodes(), function(key, item) {
                                        $(item).replaceWith($('<button>' + this.innerHTML + '</button>'));
                                    });
                                    this.code.sync();
                                }
                            }
                        };

                        var button = this.button.add('styles', 'Other Elements');
                        this.button.addDropdown(button, dropdown);
                        this.button.setAwesome('styles', 'fa-cogs');
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
                deniedTags : ['html', 'head', 'link', 'body', 'meta', 'script', 'style', 'applet' ],
                plugins : [ 'mediaManager', 'scriptbuttons' ]
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
