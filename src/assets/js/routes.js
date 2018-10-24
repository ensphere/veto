
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
