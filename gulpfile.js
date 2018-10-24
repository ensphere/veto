var elixir = require('laravel-elixir');

elixir.config.assetsPath = 'src/assets';
elixir.config.publicPath = 'public';
elixir.config.css.outputFolder = 'dist';
elixir.config.js.outputFolder = 'dist';

elixir(function(mix) {
    mix
        .sass( ["main.scss"] )
        .scripts( [
            "bootstrap.js",
            "routes.js",
            "filter.js",
            "veto.js"
        ] )
        .copy( "src/assets/images/", "dist/images/" );
});
