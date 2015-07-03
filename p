<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no,maximum-scale=1">
<title>Hackschule</title>
<link rel="stylesheet" href="css/2dgame.css?5ykcFRrHA2qXL56u0qsWrh" type="text/css"/>
<script type="text/javascript" src="js/jquery-2.1.1.min.js"></script>
<script type="text/javascript" src="js/jquery-ui.min.js"></script>
<script type="text/javascript" src="js/cling-colors.js"></script>
<script type="text/javascript" src="js/generatepng.js"></script>
<script type="text/javascript" src="js/csscolorparser.js"></script>
<script type="text/javascript" src="js/jszip.min.js"></script>
<script type="text/javascript" src="js/TinyColor-1.0.0/tinycolor.js"></script>
<script type="text/javascript" src="js/2dgame.js?5ykcFRrHA2qXL56u0qsaWrh"></script>
<script type="text/javascript" src="js/sha1.js"></script>

</head>

<body>
<!--

// sprite list: drag and drop - swap only
[DUPLICATE] [DELETE] [ANIMATION]

[DRAW]   [LINE]    [RECT]     [CIRC]
[PICK]   [FLOOD]   [FILLRECT] [FILLCIRC]
[MOVE]   [ROT]     [FLIP X]   [FLIP Y]
[CLEAR]  [LOAD]   [SAVE]

// keyboard shortcuts!

[small] [medium] [big]   [huge]
[left]  [up]     [down]  [right]

-->
<div id='yt_placeholder'></div>
<!-- <object height="400" width="400"><param name="movie" value=" http://www.youtube.com/v/oehWQSda0ZA?version=3&feature=player_detailpage&autoplay=1&loop=1"><param name="allowFullScreen" value="true"><param name="allowScriptAccess" value="always"><embed src="http://www.youtube.com/v/oehWQSda0ZA?version=3&feature=player_detailpage&autoplay=1" type="application/x-shockwave-flash" allowfullscreen="true" allowScriptAccess="always" width="400" height="400"></object> -->

<script type='text/javascript'>
function switchPane(which) {
    if (which === 'sprites')
        window.location.href = 'http://hackschule.de/sprite/2015.html';
}

current_pane = 'play';
// not_in_editor = false;

if (window.location.hash !== '')
{
    var tag = window.location.hash.replace('#', '');
    jQuery.post('load.rb', tag,
        function(data) {
//             console.log('data:text/x-haskell;base64,' + btoa(data.data));
            init_game(28 * 24, 16 * 24, 2, data.data);
        }
    );
}

</script>

</body>
</html>
