var currentColor = [0, 0, 0, 255];
var currentTool = 'draw';
var lastTool = null;
var penWidth = 1;
var imageWidth = 24;
var imageHeight = 24;
var levelWidth = 28;
var levelHeight = 15;
var MAX_UNDO_STACK = 25;
var MAX_LEVELS = 25;
var MAX_SPRITES = 256;
var SELECTION_OPACITY = 0.7;
var lineStart = null;
var lineEnd = null;
var drawingOperationPending = false;
var selectionMask = [];
var generatorHash = {};
var currentSpriteId = 0;
var spray_pixels = [];
var mouseDownColor = [];
var level = {};
var currentlyDrawingLevel = false;
var level_use = [];
var animations = [];
// offset, background
var level_props = {};
var current_level = 0;
var shiftPressed = false;
var rightButtonPressed = false;
var sprite_properties = [];
var current_pane = null;
var game_options = {};
var level_small_scale = 4;
var level_small_move_offset = null;

var states = [];
states.push(['actor_front', 'Spielfigur von vorn', 'Spielfigur']);
states.push(['actor_back', 'Spielfigur von hinten']);
states.push(['actor_left', 'Spielfigur schaut nach links']);
states.push(['actor_right', 'Spielfigur schaut nach rechts']);
states.push(['actor_walk_left', 'Spielfigur l&auml;uft nach links']);
states.push(['actor_walk_right', 'Spielfigur l&auml;uft nach rechts']);
states.push(['actor_jump_left', 'Spielfigur springt nach links']);
states.push(['actor_jump_right', 'Spielfigur springt nach rechts']);
states.push(['can_stand_on', 'man f&auml;llt nicht runter, wenn man draufsteht', 'Feste und lose Bl&ouml;cke']);
states.push(['is_solid', 'man kann nicht von der Seite hineinlaufen']);
states.push(['appears', 'Block erscheint beim betreten', 'Verschwindende und erscheinende Bl&ouml;cke']);
states.push(['crumbles', 'Block f&auml;llt nach einer Weile runter']);
states.push(['door_1', 'T&uuml;r 1', 'T&uuml;ren und Schl&uuml;ssel']);
states.push(['key_1', 'Schl&uuml;ssel 1']);
states.push(['door_2', 'T&uuml;r 2']);
states.push(['key_2', 'Schl&uuml;ssel 2']);
states.push(['door_3', 'T&uuml;r 3']);
states.push(['key_3', 'Schl&uuml;ssel 3']);
states.push(['door_4', 'T&uuml;r 4']);
states.push(['key_4', 'Schl&uuml;ssel 4']);
states.push('');
states.push(['can_climb', 'man kann rauf und runter klettern (Leiter)', 'Leitern und Treppen']);
states.push(['stairs_up_left', 'Treppe nach links oben']);
states.push(['stairs_up_right', 'Treppe nach rechts oben']);
states.push(['stairs_up_left_2_1_left', 'Treppe nach links oben (linke H&auml;lfte)', 'Breite Treppen (2x1)']);
states.push(['stairs_up_left_2_1_right', 'Treppe nach links oben (rechte H&auml;lfte)']);
states.push(['stairs_up_right_2_1_left', 'Treppe nach rechts oben (linke H&auml;lfte)']);
states.push(['stairs_up_right_2_1_right', 'Treppe nach rechts oben (rechte H&auml;lfte)']);
states.push(['slide_down_left', 'Rutsche nach links unten', 'Rutschen (1x1)']);
states.push(['slide_down_right', 'Rutsche nach rechts unten']);
states.push(['slide_down_left_2_1_left', 'Rutsche nach links unten (linke H&auml;lfte)', 'Breite Rutschen (2x1)']);
states.push(['slide_down_left_2_1_right', 'Rutsche nach links unten (rechte H&auml;lfte)']);
states.push(['slide_down_right_2_1_left', 'Rutsche nach rechts unten (linke H&auml;lfte)']);
states.push(['slide_down_right_2_1_right', 'Rutsche nach rechts unten (rechte H&auml;lfte)']);
states.push(['slide_down_left_1_2_top', 'Rutsche nach links unten (obere H&auml;lfte)', 'Hohe Rutschen (1x2)']);
states.push(['slide_down_left_1_2_bottom', 'Rutsche nach links unten (untere H&auml;lfte)']);
states.push(['slide_down_right_1_2_top', 'Rutsche nach rechts unten (obere H&auml;lfte)']);
states.push(['slide_down_right_1_2_bottom', 'Rutsche nach rechts unten (untere H&auml;lfte)']);
states.push('');
states.push(['trap_1', 'Falle 1', 'T&ouml;dliche Fallen']);
states.push(['trap_1_actor', 'Spielfigur in Falle 1']);
states.push(['trap_2', 'Falle 2']);
states.push(['trap_2_actor', 'Spielfigur in Falle 2']);
states.push(['trap_3', 'Falle 3']);
states.push(['trap_3_actor', 'Spielfigur in Falle 3']);
states.push(['trap_4', 'Falle 4']);
states.push(['trap_4_actor', 'Spielfigur in Falle 4']);
states.push(['bad_guy_moving', 'Beweglicher Gegner', 'Fiese Gegner']);
states.push(['bad_guy_hovering', 'Schwebender Gegner']);
//states.push(['bad_guy_jumping', 'Springender Gegner']);
states.push(['bad_guy_hit_actor', 'Spielfigur tot']);
states.push(['invincible', 'Schutzschild', 'Power ups']);
states.push(['get_a_life', 'Extraleben']);
states.push(['level_finished', 'Ab ins n&auml;chste Level!', 'Level&uuml;bergang']);
states.push(['1p', '1 P', 'Punkte sammeln']);
states.push(['5p', '5 P']);
states.push(['10p', '10 P']);

function offset_x(e)
{
    return e.offsetX === undefined ? e.originalEvent.layerX - $(e.target).offset().left : e.offsetX;
}

function offset_y(e)
{
    return e.offsetY === undefined ? e.originalEvent.layerY - $(e.target).offset().top : e.offsetY;
}

function set_field(x, y, v)
{
    if (!(current_level in level))
        level[current_level] = {};
    if (v == -1)
        delete level[current_level]['' + x + ',' + y];
    else
        level[current_level]['' + x + ',' + y] = v;
}

function get_field(x, y)
{
    if (!(current_level in level))
        level[current_level] = {};
    return level[current_level]['' + x + ',' + y];
}


// current image data, with 4 byte RGBA pixels
var imageData = [];

// big pixel element for coordinates
var bigPixelGrid = [];

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function swap_sprites_in_all_levels(a, b)
{
    jQuery.each(level, function(_, l) {
        for (var key in l)
        {
            if (l[key] == a)
                l[key] = b;
            else if (l[key] == b)
                l[key] = a;
        }
    });
    // also swap sprite properties
    var temp = sprite_properties[a];
    sprite_properties[a] = sprite_properties[b];
    sprite_properties[b] = temp;
}

function set_current_level(which)
{
    if (!(which in level_props))
        level_props[which] = {offset: [0, 0], background: '#000'}
    current_level = which;
    draw_level();
    $('#level_lineup span').removeClass('active-level');
    $('span#level_' + which).addClass('active-level');
    $('#use-level').prop('checked', level_use[current_level] === true);
    $('#level-background-color').val(level_props[current_level].background);
    if (level_use[current_level] === true)
        $('span#level_' + which + ' div').removeClass('inactive');
    else
        $('span#level_' + which + ' div').addClass('inactive');
}

function updateSpriteProperties()
{
    $('#pane-options input').each(function(_) {
        var key = $(this).attr('id').replace('so-', '');
        $(this).prop('checked', key in sprite_properties[currentSpriteId]);
    });
}

function switchPane(which, finishplaytransition)
{
    current_pane = which;
    if (typeof(finishplaytransition) === 'undefined')
        finishplaytransition = false;
    if (which === 'play' && (!finishplaytransition))
    {
        play();
        return;
    }
    $('.pane').hide();
    $('#pane-' + which).show();
    $('#pane-switcher .toolbutton').removeClass('active-pane');
    $('#pane-switcher #pane_' + which + '.toolbutton').addClass('active-pane');
    if (which == 'levels')
        draw_level();
    if (which == 'sprites')
        fix_sizes();
    if (which == 'options')
        updateSpriteProperties();
}

function draw_level()
{
    var context = $('canvas#level')[0].getContext('2d');
    context.beginPath();
    context.fillStyle = level_props[current_level].background;
    context.rect(0, 0, levelWidth * imageWidth, levelHeight * imageHeight);
    context.fill();
    for (var y = 0; y < levelHeight; y++)
    {
        for (var x = 0; x < levelWidth; x++)
        {
            var v = get_field(x + level_props[current_level].offset[0], y + level_props[current_level].offset[1]);
            if (v >= 0)
            {
                context.drawImage($('#sprite_' + v)[0], x * imageWidth, y * imageHeight, imageWidth, imageHeight);
            }
            else
            {
                context.beginPath();
                context.strokeStyle = '#666';
                context.rect(x * imageWidth + 5 + 0.5, y * imageHeight + 5 + 0.5, 13, 13);
                context.stroke();
            }
        }
    }
    var xmin = null, xmax = null, ymin = null, ymax = null;
    jQuery.each(Object.keys(level[current_level]), function(_, key) {
        if (level[current_level][key] != -1)
        {
            var k = key.split(',');
            var x = new Number(k[0]).valueOf();
            var y = new Number(k[1]).valueOf();
            if (xmin === null)
                xmin = x;
            if (xmax === null)
                xmax = x;
            if (ymin === null)
                ymin = y;
            if (ymax === null)
                ymax = y;
            if (x < xmin)
                xmin = x;
            if (x > xmax)
                xmax = x;
            if (y < ymin)
                ymin = y;
            if (y > ymax)
                ymax = y;
        }
    });
    if (xmin !== null)
    {
        var real_width = xmax - xmin + 1;
        var real_height = ymax - ymin + 1;

        var scale = level_small_scale;
        $('canvas#level_small').attr('width', real_width * imageWidth / scale).attr('height', real_height * imageHeight / scale);
        $('canvas#level_small').css('max-width', '' + (real_width * imageWidth / scale) + 'px');
        $('canvas#level_small').css('max-height', '' + (real_height * imageHeight / scale) + 'px');
        $('#level_small_container').show();
        var small_level_canvas = $('canvas#level_small')[0];

        var context_small = $('canvas#level_small')[0].getContext('2d');
        context_small.beginPath();
        context_small.fillStyle = level_props[current_level].background;
        context_small.rect(0, 0, real_width * imageWidth / scale, real_height * imageHeight / scale);
        context_small.fill();
        for (var y = 0; y < real_height; y++)
        {
            var ry = y - level_props[current_level].offset[1] + ymin;
            for (var x = 0; x < real_width; x++)
            {
                var rx = x - level_props[current_level].offset[0] + xmin;
                var v = get_field(x + xmin, y + ymin);
                if (v >= 0)
                {
                    if (rx >= 0 && rx < levelWidth && ry >= 0 && ry < levelHeight)
                        context_small.globalAlpha = 1.0;
                    else
                        context_small.globalAlpha = 0.5;
                    context_small.drawImage($('#sprite_' + v)[0], x * imageWidth / scale, y * imageHeight / scale, imageWidth / scale, imageHeight / scale);
                }
            }
        }
        context_small.beginPath();
        context_small.strokeStyle = '#729fcf';
        context_small.rect((level_props[current_level].offset[0] - xmin) * imageWidth / scale - 0.5,
                           (level_props[current_level].offset[1] - ymin) * imageHeight / scale - 0.5,
                           levelWidth * imageWidth / scale, levelHeight * imageHeight / scale);
        context_small.stroke();
        context_small.strokeStyle = '#204a87';
        context_small.rect((level_props[current_level].offset[0] - xmin) * imageWidth / scale + 0.5,
                           (level_props[current_level].offset[1] - ymin) * imageHeight / scale + 0.5,
                           levelWidth * imageWidth / scale, levelHeight * imageHeight / scale);
        context_small.stroke();
    }
    else
    {
        $('#level_small_container').hide();
    }
}

function rescue()
{
    $('textarea').remove();
    var textarea = $('<textarea>');
    $('body').append(textarea);
    textarea.css('width', '100%');
    textarea.css('height', '400px');
    var s = get_zip_package();
    var text = "";
    for (var i = 0; i < s.length; i += 70)
        text += s.substr(i, 70) + "\n";
    textarea.val(text);
    textarea.focus();
    textarea.select();
    document.execCommand('Copy');
}

function spray_next()
{
    if (spray_pixels.length == 0)
        return;
    var next_pos = spray_pixels.shift();
    setPixel(next_pos[0], next_pos[1], currentColor);
    updatePixels();
    update_sprite(false);
    if (spray_pixels.length > 0)
        window.setTimeout(spray_next, 20);
}

function setCurrentColor(color, update_variations)
{
    if (typeof(update_variations) === 'undefined')
        update_variations = true;
    currentColor = color;
    var htmlColor = '#';
    for (var i = 0; i < 3; i++)
    {
        var b = currentColor[i] & 0xff;
        var s = b.toString(16);
        while (s.length < 2)
            s = '0' + s;
        htmlColor += s;
    }
    $('#color-html').html('Farbe: ' + htmlColor);
    if (update_variations)
    {
        $('#color-variations').empty();
        for (var h = -4; h <= 4; h++)
        {
            var variation = tinycolor({r: color[0], g: color[1], b: color[2], a: color[3] / 255.0});
            if (h < 0)
                variation.darken(-h * 10);
            else
                variation.lighten(h * 10);
            var swatch = $("<span class='swatch swatch-mini'>");
            var b = "linear-gradient("+variation.toRgbString()+","+variation.toRgbString()+"), url(images/transparent.png)";
            swatch.css('background', b);
            swatch.data('html_color', variation.toRgbString());
            var rgb = variation.toRgb();
            swatch.data('list_color', [rgb.r, rgb.g, rgb.b, Math.floor(rgb.a * 255)]);
            $('#color-variations').append(swatch);
        }
        $('#color-variations').append('<br />');
        for (var h = -4; h <= 4; h++)
        {
            var variation = tinycolor({r: color[0], g: color[1], b: color[2], a: color[3] / 255.0});
            if (h < 0)
                variation.desaturate(-h * 20);
            else
                variation.saturate(h * 20);
            var swatch = $("<span class='swatch swatch-mini'>");
            var b = "linear-gradient("+variation.toRgbString()+","+variation.toRgbString()+"), url(images/transparent.png)";
            swatch.css('background', b);
            swatch.data('html_color', variation.toRgbString());
            var rgb = variation.toRgb();
            swatch.data('list_color', [rgb.r, rgb.g, rgb.b, Math.floor(rgb.a * 255)]);
            $('#color-variations').append(swatch);
        }
        $('#color-variations').append('<br />');
        for (var h = 1; h <= 9; h++)
        {
            var variation = tinycolor({r: color[0], g: color[1], b: color[2], a: color[3] * h / 10.0 / 255.0});
            var swatch = $("<span class='swatch swatch-mini'>");
            var b = "linear-gradient("+variation.toRgbString()+","+variation.toRgbString()+"), url(images/transparent.png)";
            swatch.css('background', b);
            swatch.data('html_color', variation.toRgbString());
            var rgb = variation.toRgb();
            swatch.data('list_color', [rgb.r, rgb.g, rgb.b, Math.floor(rgb.a * 255)]);
            $('#color-variations').append(swatch);
        }
    }
}

function penPattern(width)
{
    if (width == 1)
        return [[0, 0]];
    else if (width == 2)
        return [[0, 0], [1, 0], [0, 1], [1, 1]];
    else if (width == 3)
        return [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]];
    else if (width == 4)
        return [[0, -1], [1, -1],
                [-1, 0], [0, 0], [1, 0], [2, 0],
                [-1, 1], [0, 1], [1, 1], [2, 1],
                [0, 2], [1, 2]];
    else if (width == 5)
        return [[-1, -2], [0, -2], [1, -2],
                [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
                [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
                [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
                [-1, 2], [0, 2], [1, 2]];
}

// color must be 4 byte RGBA
function setPixel(px, py, color)
{
    if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight)
        return;
    imageData[py][px] = color;
}

function drawLine(x0, y0, x1, y1, color, width)
{
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx - dy;

    while (true) {
        jQuery.each(penPattern(width), function(_, delta) {
            var dx = x0 + delta[0];
            var dy = y0 + delta[1];
            if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                setPixel(dx, dy, color);
        });
        if (x0 == x1 && y0 == y1)
            break;
        var e2 = err * 2;
        if (e2 > -dy)
        {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx)
        {
            err += dx;
            y0 += sy;
        }
    }
}

function linePattern(x0, y0, x1, y1)
{
    var result = [];
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx - dy;

    while (true) {
        result.push([x0, y0]);
        if (x0 == x1 && y0 == y1)
            break;
        var e2 = err * 2;
        if (e2 > -dy)
        {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx)
        {
            err += dx;
            y0 += sy;
        }
    }
    return result;
}

function rectPattern(x0, y0, x1, y1)
{
    if (x0 > x1) { var t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { var t = y0; y0 = y1; y1 = t; }
    var result = [];
    for (var x = x0; x <= x1; x++)
    {
        result.push([x, y0]);
        result.push([x, y1]);
    }
    for (var y = y0 + 1; y < y1; y++)
    {
        result.push([x0, y]);
        result.push([x1, y]);
    }
    return result;
}

function fillRectPattern(x0, y0, x1, y1)
{
    if (x0 > x1) { var t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { var t = y0; y0 = y1; y1 = t; }
    var result = [];
    for (var y = y0; y <= y1; y++)
    {
        for (var x = x0; x <= x1; x++)
        {
            result.push([x, y]);
        }
    }
    return result;
}

function ellipsePattern(x0, y0, x1, y1)
{
    var xm = x0;
    var ym = y0;
    var a = Math.abs(x1 - x0);
    var b = Math.abs(y1 - y0);
    if (a == 0)
    if (a < 1 || b < 1)
        return linePattern(xm - a, ym - b, xm + a, ym + b);

    var result = [];
    var dx = 0;
    var dy = b;
    var a2 = a * a;
    var b2 = b * b;
    var err = b2 - (2 * b - 1) * a2;

    do {
        result.push([xm + dx, ym + dy]);
        result.push([xm - dx, ym + dy]);
        result.push([xm + dx, ym - dy]);
        result.push([xm - dx, ym - dy]);
        var e2 = 2 * err;
        if (e2 < (2 * dx + 1) * b2) { dx++; err += (2 * dx + 1) * b2; }
        if (e2 > -(2 * dy - 1) * a2) { dy--; err -= (2 * dy - 1) * a2; }
    } while (dy >= 0)
    while (dx++ < a)
    {
        result.push([xm + dx, ym]);
        result.push([xm - dx, ym]);
    }
    return result;
}

function fillEllipsePattern(x0, y0, x1, y1)
{
    var xm = x0;
    var ym = y0;
    var a = Math.abs(x1 - x0);
    var b = Math.abs(y1 - y0);
    if (a == 0)
    if (a < 1 || b < 1)
        return linePattern(xm - a, ym - b, xm + a, ym + b);

    var result = [];
    var dx = 0;
    var dy = b;
    var a2 = a * a;
    var b2 = b * b;
    var err = b2 - (2 * b - 1) * a2;

    do {
        for (var d = -dx; d <= dx; d++)
        {
            result.push([xm + d, ym + dy]);
            result.push([xm + d, ym - dy]);
        }
        var e2 = 2 * err;
        if (e2 < (2 * dx + 1) * b2) { dx++; err += (2 * dx + 1) * b2; }
        if (e2 > -(2 * dy - 1) * a2) { dy--; err -= (2 * dy - 1) * a2; }
    } while (dy >= 0)
    while (dx++ < a)
    {
        for (var d = -dx; d <= dx; d++)
            result.push([xm + d, ym]);
    }
    return result;
}

function floodFill(x, y, color)
{
    var visited_pixels = [];

    function _fill(x, y, targetColor, _replacementColor)
    {
        if (typeof(visited_pixels[[x, y]]) !== 'undefined')
            return;
        visited_pixels[[x, y]] = true;
        var color = imageData[y][x].join(',');
        var replacementColor = null;
        if (typeof(_replacementColor) === 'function')
            replacementColor = _replacementColor(x, y);
        else
            replacementColor = _replacementColor.slice();
//         if (color == replacementColor.join(','))
//             return;
        if (color != targetColor.join(','))
            return;
        setPixel(x, y, replacementColor);
        if (x > 0)
            _fill(x - 1, y, targetColor, _replacementColor);
        if (x < imageWidth - 1)
            _fill(x + 1, y, targetColor, _replacementColor);
        if (y > 0)
            _fill(x, y - 1, targetColor, _replacementColor);
        if (y < imageHeight - 1)
            _fill(x, y + 1, targetColor, _replacementColor);
    }

    _fill(x, y, imageData[y][x], color);
}

function updateMouseCursor()
{
    if (currentTool == 'fill')
        $('#big_pixels').css('cursor', 'url(images/color-fill.png) 2 16, crosshair');
    else if (currentTool == 'move')
        $('#big_pixels').css('cursor', 'url(images/transform-move.png) 11 11, crosshair');
    else if (currentTool == 'picker')
        $('#big_pixels').css('cursor', 'url(images/color-picker.png) 2 16, crosshair');
    else
        $('#big_pixels').css('cursor', 'crosshair');
}

function setCurrentSprite(sprite_id)
{
    // do nothing if the sprite is already the current one
    if (sprite_id == currentSpriteId)
        return;
    $('.sprite').removeClass('active');
    currentSpriteId = sprite_id;
    $('#current_sprite_index_here').html('' + currentSpriteId);
    $('#sprite_' + currentSpriteId).addClass('active');
    restore_image($('#sprite_' + currentSpriteId));
    updateSpriteProperties();
    var imageIsEmpty = true;
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            if (imageData[y][x] != [0, 0, 0, 0])
                imageIsEmpty = false;
        }
    }
    transform_sprite(function(newImageData, imageData) {
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
                newImageData[x][y] = imageData[x][y];
        }
    }, !imageIsEmpty);
}

function loadSprites(data)
{
    $('#load_image').attr('src', data);
}

function loadLevels(info)
{
    if (shiftPressed)
        return;
    for (var i = 0; i < MAX_LEVELS; i++)
        $('span#level_' + i + ' div').addClass('inactive');
    jQuery.each(info, function(i, l) { set_current_level(i);
        level_use[i] = l.use;
        if (l.use)
            $('span#level_' + i + ' div').removeClass('inactive');
        else
            $('span#level_' + i + ' div').addClass('inactive');

        level_props[i].background = l.background;
        level[i] = {};
        jQuery.each(l.data, function(yd, row) {
            jQuery.each(row, function(xd, cell) {
                level[i]['' + (xd + l.xmin) + ',' + (yd + l.ymin)] = cell;
            });
        });
    });
    set_current_level(0);
}

function loadAnimations(info)
{
    console.log("Loading animations", info);
    animations = [];
    jQuery.each(info, function(_, a) {
        push_animation(a);
    });
}

function loadGameOptions(info)
{
    console.log("Loading game options", info);
    jQuery.each(['game_title', 'game_author', 'game_initial_lives'], function(_, x) {
        if (typeof(info[x]) !== 'undefined')
        {
            game_options[x] = info[x];
            $('#' + x).val(info[x]);
        }
    });
}

function setPenWidth(w)
{
    var target = $('#pen_width_' + w);
    if (!(currentTool == 'picker' || currentTool == 'fill' || currentTool == 'move' || currentTool == 'spray' || currentTool == 'gradient'))
    {
        penWidth = w;
        $('.penwidth').removeClass('active');
        target.addClass('active');
    }
}

function autoSave()
{
    var data = get_zip_package();
    jQuery.post('autosave.rb', data,
        function(data) {
            console.log(data);
        }
    );
}

// Tee hee ... http://stackoverflow.com/a/4835406
function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  var s = text.replace(/[&<>"']/g, function(m) { return map[m]; });
  if (s.length > 30)
      s = s.substr(0, 30) + '...';
  return s;
}

function get_saved_games() {
    jQuery.get('list.rb',
        function(data) {
            var container = $('#saved_games tbody');
            $('#saved_games_container').scrollTop(0);
            container.empty();
            var row = $('<tr>');
            row.append($('<th>').html('Code'));
            row.append($('<th>').html('Autor'));
            row.append($('<th>').html('Titel'));
            row.append($('<th>').html('Datum'));
            row.append($('<th>').html('Zeit'));
            container.append(row);
            jQuery.each(data.files, function(_, item) {
                var row = $('<tr>');
                row.css('vertical-align', 'top');
                var link = $('<a>').html('<tt>' + item.tag.substr(0, 8) + '</tt>').attr('href', '#');
                link.click(function() {
                    load_from_server(item.tag);
                    switchPane('sprites');
                    $('#link_sprites').hide();
                });
                row.append($('<td>').append(link));
                row.append($('<td>').html(escapeHtml(item.game_author) + '&nbsp;'));
                row.append($('<td>').html(escapeHtml(item.game_title) + '&nbsp;'));
                var date = new Date(Date.parse(item.mtime));
                row.append($('<td>').html(date.toLocaleDateString('de', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}) + '&nbsp;'));
                row.append($('<td>').html(date.toLocaleTimeString('de') + '&nbsp;'));
                container.append(row);
            });
//             console.log(data);
        }
    );
}

function load_from_server(tag, play_it_now)
{
    if (typeof(play_it_now) === 'undefined')
        play_it_now = false;
    jQuery.post('load.rb', tag,
        function(data) {
//             console.log('data:text/x-haskell;base64,' + btoa(data.data));
            loadFromZip('data:text/x-haskell;base64,' + btoa(data.data));
            if (play_it_now)
                play();
        }
    );
}

function initGameOptions()
{
    game_options['game_title'] = 'WIE SOLL DIESES SPIEL<br />NUR HEISSEN?';
    game_options['game_author'] = 'wem auch immer';
    game_options['game_initial_lives'] = '5';
    jQuery.each(Object.keys(game_options), function(_, x) {
        $('#' + x).val(game_options[x]);
    });
}

function loadFromZip(data)
{
    data = data.substr(data.indexOf('base64,') + 7);
    data = atob(data);
    data = atob(data);
    var zip = new JSZip(data);
    // remove all animations
    $('#animations_table_body').empty();
    animations = [];
    initGameOptions();
    $.each(zip.files, function (index, zipEntry) {
//                     console.log(zipEntry);
        if (zipEntry.name == 'sprites.png')
        {
            var blob = new Blob([zipEntry.asUint8Array()], {'type': 'image/png'});
            var urlCreator = window.URL || window.webkitURL;
            var imageUrl = urlCreator.createObjectURL(blob);
            loadSprites(imageUrl);
        }
        else if (zipEntry.name == 'sprite_props.json')
        {
            var info = JSON.parse(zipEntry.asText());
            for (var i = 0; i < info.length; i++)
                sprite_properties[i] = info[i];
        }
        else if (zipEntry.name == 'levels.json')
        {
            var info = JSON.parse(zipEntry.asText());
            loadLevels(info);
        }
        else if (zipEntry.name == 'game.json')
        {
            var info = JSON.parse(zipEntry.asText());
            loadGameOptions(info);
        }
        else if (zipEntry.name == 'animations.json')
        {
            var info = JSON.parse(zipEntry.asText());
            loadAnimations(info);
        }
    });
}

$().ready(function() {
    function confirmExit() {
        return "Achtung! Bist du sicher, dass du die Seite verlassen willst? Wenn du noch nicht gespeichert hast, bleib auf dieser Seite.";
    }
    window.onbeforeunload = confirmExit;
    for (var i = 0; i < MAX_SPRITES; i++)
        sprite_properties[i] = {};
    for (var y = 0; y < imageHeight; y++)
    {
        var line = [];
        var mask_line = [];
        for (var x = 0; x < imageWidth; x++)
        {
            line.push([0, 0, 0, 0]);
            mask_line.push(0);
        }
        selectionMask.push(mask_line);
        imageData.push(line);
    }

    for (var i = 0; i < MAX_SPRITES; i++)
    {
        var element = $('<img>');
        element.addClass('sprite');
        element.attr('id', 'sprite_' + i);
        element.attr('width', imageWidth);
        element.attr('height', imageHeight);
        element.attr('src', 'images/transparent-1.png');
        if (i == 0)
        {
            element.addClass('active');
        }
        $('#sprites').append(element);
        element.data('sprite_id', i);
        element.mousedown(function(e) {
            var sprite_id = $(e.target).data('sprite_id');
            if (e.shiftKey)
                alphaMultiply(sprite_id, currentSpriteId);
            else if (e.ctrlKey)
                colorize(sprite_id, currentSpriteId);
            else
                setCurrentSprite(sprite_id);
        });
        $('#sprites').append(" ");
        element.draggable({
            containment: 'parent',
            stack: '#sprites',
            delay: 100,
            revert: true
        });
        element.droppable({ drop: function(event, ui) {
            var draggable = ui.draggable;
            var droppable = $(event.target);
            var aid = new Number(draggable.attr('id').replace('sprite_', '')).valueOf();
            var bid = new Number(droppable.attr('id').replace('sprite_', '')).valueOf();
            swap_sprites_in_all_levels(aid, bid);
            var temp = draggable.attr('src');
            draggable.attr('src', droppable.attr('src'));
            droppable.attr('src', temp);
            setCurrentSprite(droppable.data('sprite_id'));
        }});
    }

    for (var i = 1; i <= 4; i++)
    {
        $('#pen_width_' + i).mousedown(function(event) {
            setPenWidth(new Number($(event.target).attr('id').replace('pen_width_', '').valueOf()));
        });
    }
    $('#pen_width_' + penWidth).addClass('active');

    jQuery.each(['draw', 'fill', 'line', 'rect', 'fill_rect', 'ellipse', 'fill_ellipse',
        'picker', 'fill', 'move', 'spray', 'gradient'], function(_, x) {
        $('#tool_' + x).mousedown(function(event) {
            lastTool = currentTool;
            currentTool = $(event.target).attr('id').replace('tool_', '');
            $('.tool').removeClass('active');
            $(event.target).addClass('active');
            if (x == 'picker' || x == 'fill' || x == 'move' || x == 'spray' || x == 'gradient')
            {
                penWidth = 1;
                $('.penwidth').removeClass('active');
                $('#pen_width_1').addClass('active');
            }
            updateMouseCursor();
        });
    });
    $('#tool_' + currentTool).addClass('active');
    $('#tool_load').mousedown(function(event) {
        shiftPressed = (event.shiftKey === true);
        $('#image_upload').val('');
        $('#image_upload').click();
        $('#image_upload').change(function(e) {
            var reader = new FileReader(),
            files = e.dataTransfer ? e.dataTransfer.files : e.target.files, i = 0;
            reader.onload = onFileLoad;
            while (files[i])
                reader.readAsDataURL(files[i++]);
        });

        function onFileLoad(e)
        {
            if (!shiftPressed)
            {
                level = {};
                level_use = [];
                level_props = {};
                for (var i = 0; i < MAX_SPRITES; i++)
                    sprite_properties[i] = {};
            }
            var data = '' + e.target.result;
            if (e.target.result.substr(0, 14) === 'data:image/png')
            {
                loadSprites(data);
                if (!shiftPressed)
                {
                    set_current_level(0);
                    level_use[0] = true;
                }
            }
            else
            {
//                 data = data.replace("\n", '');
//                 console.log('loading hs file...');
                console.log(data);
                loadFromZip(data);
            }
            switchPane('sprites');
            if (!shiftPressed)
                set_current_level(0);
            $('#link_sprites').hide();
        }
    });
    Downloadify.create('tool_save',{
        filename: function() { return 'sprites.hs'; },
        dataType: 'string',
        data: function() { return get_zip_package(); },
        onComplete: function(){ $('#link_sprites').hide(); },
        onCancel: function(){ },
        onError: function(e){ },
        swf: 'js/downloadify.swf',
//         downloadImage: 'js/Downloadify-0.2.1/images/download.png',
//         width: 100,
//         height: 30,
        downloadImage: 'images/document-save-4-2.png',
        width: 32,
        height: 32,
        transparent: true,
        append: false
    });

    initGameOptions();
    $('.game_options_input').on('change keyup paste mouseup', function(e) {
        game_options[$(e.target).attr('id')] = $(e.target).val();
    });

    $('#tool_link').mousedown(function(event) {
        var data = get_zip_package();
        jQuery.post('autosave.rb', data,
            function(data) {
                var short_tag = data.tag.substr(0, 8);
                var play_link = window.location.origin + '/p#' + short_tag;
                if (window.location.origin.indexOf('hackschule.de') > -1)
                    play_link = window.location.origin + '/sprite/p#' + short_tag;
                $('#play_link').attr('href', play_link);
                $('#play_link').text(play_link);
                $('#edit_link').attr('href', window.location.origin + window.location.pathname + '#' + short_tag);
                $('#edit_link').text(window.location.origin + window.location.pathname + '#' + short_tag);
                $('#play_code_here').text(short_tag);
                $('#load_play_code').val('');
                $('#link_sprites').show();
                get_saved_games();
            }
        );

    });

    $('#tool_clear').mousedown(function(event) {
        transform_sprite(function(newImageData, imageData) {
            for (var y = 0; y < imageHeight; y++)
            {
                for (var x = 0; x < imageWidth; x++)
                    newImageData[x][y] = [0, 0, 0, 0];
            }
        }, true);
    });

    $('#tool_flip_h').mousedown(function(event) {
        flip_sprite(true, false);
    });

    $('#tool_flip_v').mousedown(function(event) {
        flip_sprite(false, true);
    });

    $('#tool_rotate_left').mousedown(function(event) {
        rotate_sprite(false);
    });

    $('#tool_rotate_right').mousedown(function(event) {
        rotate_sprite(true);
    });

    document.onselectstart = function(e)
    {
        console.log($(e.target));
        if (!$(e.target).is('.selectable'))
            window.getSelection().removeAllRanges();
    };

    document.oncontextmenu = function(e)
    {
        if (!$(e.target).is('.has_context_menu'))
            return false;
    };

    window.onresize = fix_sizes;

//     window.onbeforeunload = function()
//     {
//         return "Wirklich?";
//     };

    $('.overlay').mousedown(function(e) {
        $('#link_sprites').hide();
    });

    $('.popup').mousedown(function(e) {
        e.stopPropagation();
    });

    $('.popup').mousemove(function(e) {
        e.stopPropagation();
    });

    $(window).keydown(function(e) {
//         console.log(e.which);
//         console.log($(document.activeElement));
//         console.log($(document.activeElement).prop('tagName'));
        if (current_pane == 'play')
            return;
        if ($(document.activeElement).prop('tagName') === 'INPUT')
            return;
        var mapping = {
            81: 'tool_draw',
            87: 'tool_line',
            69: 'tool_rect',
            82: 'tool_ellipse',
            65: 'tool_fill',
            68: 'tool_fill_rect',
            70: 'tool_fill_ellipse',
            89: 'tool_spray',
            90: 'tool_spray',
            83: 'tool_gradient',
            88: 'tool_picker',
            67: 'tool_move'
        };

        if (typeof(mapping[e.which]) !== 'undefined')
        {
            if (!(e.shiftKey || e.ctrlKey || e.altKey))
            {
                $('#' + mapping[e.which]).mousedown();
                e.preventDefault();
            }
        }

        if (e.which == 33)
        {
            // set previous sprite
            setCurrentSprite((currentSpriteId + (MAX_SPRITES - 1)) % MAX_SPRITES);
            e.preventDefault();
        }
        if (e.which == 34)
        {
            // set next sprite
            setCurrentSprite((currentSpriteId + 1) % MAX_SPRITES);
            e.preventDefault();
        }
        if (e.which == 36)
        {
            if ($('#pane-levels').is(':visible'))
            {
                level_props[current_level].offset = [0, 0];
                draw_level();
            }
        }
        if (e.which == 37)
        {
            if ($('#pane-sprites').is(':visible'))
            {
                if (e.shiftKey)
                    rotate_sprite(false);
                else if (e.ctrlKey)
                    flip_sprite(true, false);
                else
                move_sprite(-1, 0);
            }
            else if ($('#pane-levels').is(':visible'))
            {
                level_props[current_level].offset[0] -= 1;
                draw_level();
            }
            e.preventDefault();
        }
        if (e.which == 39)
        {
            if ($('#pane-sprites').is(':visible'))
            {
                if (e.shiftKey)
                    rotate_sprite(true);
                else if (e.ctrlKey)
                    flip_sprite(true, false);
                else
                    move_sprite(1, 0);
            }
            else if ($('#pane-levels').is(':visible'))
            {
                level_props[current_level].offset[0] += 1;
                draw_level();
            }
            e.preventDefault();
        }
        if (e.which == 38)
        {
            if ($('#pane-sprites').is(':visible'))
            {
                if (e.ctrlKey)
                    flip_sprite(false, true);
                else
                    move_sprite(0, -1);
            }
            else if ($('#pane-levels').is(':visible'))
            {
                level_props[current_level].offset[1] -= 1;
                draw_level();
            }
            e.preventDefault();
        }
        if (e.which == 40)
        {
            if ($('#pane-sprites').is(':visible'))
            {
                if (e.ctrlKey)
                    flip_sprite(false, true);
                else
                    move_sprite(0, 1);
            }
            else if ($('#pane-levels').is(':visible'))
            {
                level_props[current_level].offset[1] += 1;
                draw_level();
            }
            e.preventDefault();
        }
        if (e.which == 49)
        {
            if ($(document.activeElement).prop('tagName') != 'INPUT')
            {
                switchPane('sprites');
                e.preventDefault();
            }
        }
        if (e.which == 50)
        {
            if ($(document.activeElement).prop('tagName') != 'INPUT')
            {
                switchPane('options');
                e.preventDefault();
            }
        }
        if (e.which == 51)
        {
            if ($(document.activeElement).prop('tagName') != 'INPUT')
            {
                switchPane('animation');
                e.preventDefault();
            }
        }
        if (e.which == 52)
        {
            if ($(document.activeElement).prop('tagName') != 'INPUT')
            {
                switchPane('levels');
                e.preventDefault();
            }
        }
        if (e.which == 53)
        {
            if ($(document.activeElement).prop('tagName') != 'INPUT')
            {
                switchPane('game');
                e.preventDefault();
            }
        }
        if (e.which == 80)
        {
            switchPane('play');
            e.preventDefault();
        }
        if (e.which == 77)
        {
            setPenWidth(1);
            e.preventDefault();
        }
        if (e.which == 188)
        {
            setPenWidth(2);
            e.preventDefault();
        }
        if (e.which == 190)
        {
            setPenWidth(3);
            e.preventDefault();
        }
        if (e.which == 191)
        {
            setPenWidth(4);
            e.preventDefault();
        }

    });

    $('#big_pixels').mouseenter(function(e) {
        updateCursor(offset_x(e), offset_y(e));
    });
    $('#big_pixels').mousemove(function(e) {
        handleDrawing(offset_x(e), offset_y(e));
        if (!drawingOperationPending)
            updateCursor(offset_x(e), offset_y(e));
        e.preventDefault();
    });
    $(window).mousemove(function(e) {
        if (currentTool === 'move' || currentTool === 'line' ||
            currentTool === 'rect' || currentTool === 'ellipse' ||
            currentTool === 'fill_rect' || currentTool === 'fill_ellipse')
        {
            var big_pixels_offset = $('#big_pixels').offset();
            handleDrawing(e.pageX - big_pixels_offset.left, e.pageY - big_pixels_offset.top);
            if (!drawingOperationPending)
                updateCursor(e.pageX - big_pixels_offset.left, e.pageY - big_pixels_offset.top);
        }
    });
    $('#big_pixels').mouseleave(function(e) {
        if (currentTool == 'draw')
            lineStart = null;
        clearMask();
        updateCursor(null, null);
    });
    $('#big_pixels').mousedown(function(e) {
        shiftPressed = (e.shiftKey === true);
        rightButtonPressed = (e.button == 2);
        initiateDrawing(offset_x(e), offset_y(e));
    });
    $(window).mouseup(function(e) {
        currentlyDrawingLevel = false;
//         console.log('currentlyDrawingLevel', currentlyDrawingLevel);
        finishDrawing(true);
        level_small_move_offset = null;
    });

    generatorHash['line'] = linePattern;
    generatorHash['gradient'] = linePattern;
    generatorHash['rect'] = rectPattern;
    generatorHash['fill_rect'] = fillRectPattern;
    generatorHash['ellipse'] = ellipsePattern;
    generatorHash['fill_ellipse'] = fillEllipsePattern;

    for (var py = 0; py < 3; py++)
    {
        for (var y = 0; y < imageHeight; y++)
        {
            var row = $('<tr>');
            for (var px = 0; px < 3; px++)
            {
                for (var x = 0; x < imageWidth; x++)
                {
                    var cell = $('<td>');
                    cell.data('x', x);
                    cell.data('y', y);
                    cell.addClass('small_pixels_' + x + '_' + y);
                    row.append(cell);
                }
            }
            $('.small_pixels_1_tile').append(row);
        }
    }

    for (var i = 0; i < cling_colors.length + 1; i++)
    {
        var swatch = $('<span>');
        swatch.addClass('swatch');
        var color = '';
        var x = i % 5;
        var y = Math.floor(i / 5);
        var k = x * 9 + y;
        if (k < cling_colors.length)
            color = cling_colors[k][0];
        swatch.data('html_color', color);
        var listColor = [Number.parseInt(color.substr(1, 2), 16),
                         Number.parseInt(color.substr(3, 2), 16),
                         Number.parseInt(color.substr(5, 2), 16), 255];
        swatch.attr('id', 'swatch_' + color.replace('#', ''));
        if (i == 0)
        {
            swatch.addClass('active');
            setCurrentColor(listColor, true);
        }
        if (i == cling_colors.length - 8)
            swatch.addClass('darkcolor');
        if (i == cling_colors.length)
        {
            swatch.css('background', 'url(images/transparent.png) repeat');
            listColor = [0, 0, 0, 0];
        }
        else
            swatch.css('background-color', color);
        swatch.data('list_color', listColor);
        $('#palette').append(swatch);
        $('#palette').append(' ');
        if (i % 5 == 4 && i < cling_colors.length - 1)
            $('#palette').append($('<br />'));
    }
    $('body').on('mousedown', '.swatch', function(event) {
        var e = event.target || event.srcElement;
        $('.swatch').removeClass('active');
        setCurrentColor($(e).data('list_color'), !$(e).hasClass('swatch-mini'));
        $(e).addClass('active');
    });
    $('canvas#level').attr('width', levelWidth * imageWidth).attr('height', levelHeight * imageHeight);
    $('canvas#level').css('max-width', '' + levelWidth * imageWidth + 'px');
    $('canvas#level').css('max-height', '' + levelHeight * imageHeight + 'px');
    var level_canvas = $('canvas#level')[0];
    level_canvas.getContext('2d').beginPath();
    level_canvas.getContext('2d').fillStyle = '#000';
    level_canvas.getContext('2d').rect(0, 0, levelWidth * imageWidth, levelHeight * imageHeight);
    level_canvas.getContext('2d').fill();
//     level_canvas.getContext('2d').drawImage(local_image, 0, 0, imageWidth, imageHeight);

    $('canvas#level').mousemove(function(e) {
        var context = $(e.target)[0].getContext('2d');
        var rx = Math.floor(offset_x(e) / imageWidth);
        var ry = Math.floor(offset_y(e) / imageHeight);
        if (currentlyDrawingLevel && rx >= 0 && rx < 28 && ry >= 0 && ry < 16)
        {
            set_field(rx + level_props[current_level].offset[0], ry + level_props[current_level].offset[1], e.button == 0 ? currentSpriteId : -1);
        }
        draw_level();
        context.drawImage($('#sprite_' + currentSpriteId)[0], rx * imageWidth, ry * imageHeight, imageWidth, imageHeight);
        context.beginPath();
        context.strokeStyle = '#888';
        context.penWidth = 1.0;
        context.rect(rx * imageWidth + 0.5, ry * imageHeight + 0.5, imageWidth - 1, imageHeight - 1);
        context.stroke();
    });
    $('canvas#level').mouseleave(function(e) {
        draw_level();
    });
    $('canvas#level').mousedown(function(e) {
        var rx = Math.floor(offset_x(e) / imageWidth);
        var ry = Math.floor(offset_y(e) / imageHeight);
        if (rx >= 0 && rx < 28 && ry >= 0 && ry < 16)
        {
            set_field(rx + level_props[current_level].offset[0], ry + level_props[current_level].offset[1], e.button == 0 ? currentSpriteId : -1);
            draw_level();
            currentlyDrawingLevel = true;
        }
    });
    $('canvas#level_small').mousedown(function(e) {
        var rx = Math.floor(offset_x(e) / (imageWidth / level_small_scale));
        var ry = Math.floor(offset_y(e) / (imageHeight / level_small_scale));
        level_small_move_offset = [rx, ry];
    });
    $('canvas#level_small').mousemove(function(e) {
        if (level_small_move_offset !== null)
        {
            var rx = Math.floor(offset_x(e) / (imageWidth / level_small_scale));
            var ry = Math.floor(offset_y(e) / (imageHeight / level_small_scale));
            if (rx != level_small_move_offset[0] || ry != level_small_move_offset[1])
            {
                level_props[current_level].offset[0] += rx - level_small_move_offset[0];
                level_props[current_level].offset[1] += ry - level_small_move_offset[1];
                level_small_move_offset = [rx, ry];
                draw_level();
            }
        }
    });

    level_use = [];
    for (var i = 0; i < MAX_LEVELS; i++)
    {
        level_use.push(i == 0 ? true : false);
        var level_indicator = $('<span>');
        level_indicator.addClass('sprite');
        level_indicator.attr('id', 'level_' + i);
        level_indicator.mousedown(function(e) {
            var which = new Number($(e.currentTarget).attr('id').replace('level_', '')).valueOf();
            set_current_level(which);
        });
        level_indicator.css('cursor', 'pointer');
        var level_number = $("<div class='level-number'>" + (i + 1) + '</div>');
        level_indicator.append(level_number);
        if (!level_use[i])
            level_number.addClass('inactive');

        $('#level_lineup').append(level_indicator);
    }

    set_current_level(0);

    switchPane('sprites');
    $('#pane-switcher .toolbutton').mousedown(function(e) {
        switchPane($(e.target).attr('id').replace('pane_', ''));
    });

    fix_sizes();

    $('#use-level').change(function(e) {
        level_use[current_level] = $(e.target).is(':checked');
        set_current_level(current_level);
    });
    $('#level-background-color').change(function(e) {
        level_props[current_level].background = $(e.target).val();
        set_current_level(current_level);
    });
    $('#load_image').load(function(e) {
        var image = $(e.target);
        console.log('loadSprites', e);
        var totalWidth = 192;
        var totalHeight = Math.floor(MAX_SPRITES / 8) * 24;
        var spriteIndex = currentSpriteId;
        if (image.width() == totalWidth)
        {
            var local_canvas = $('<canvas>').attr('width', image.width()).attr('height', image.height())[0];
            local_canvas.getContext('2d').drawImage(image[0], 0, 0, image.width(), image.height());
            var data = local_canvas.getContext('2d').getImageData(0, 0, image.width(), image.height()).data;
            for (var i = 0; i < MAX_SPRITES; i++)
            {
                var px = i % 8;
                var py = Math.floor(i / 8);
                if (py * imageHeight + imageHeight - 1 < image.height())
                {
                    var s = '';
                    var offset = ((py * imageHeight) * totalWidth + px * imageWidth) * 4;
                    for (var y = 0; y < imageHeight; y++)
                    {
                        for (var x = 0; x < imageWidth; x++)
                            s += String.fromCharCode(data[offset++], data[offset++], data[offset++], data[offset++]);
                        offset = offset - imageWidth * 4 + totalWidth * 4;
                    }
                    if (shiftPressed)
                    {
                        // append to sprite set if not empty
                        offset = ((py * imageHeight) * totalWidth + px * imageWidth) * 4;
                        var imageIsEmpty = true;
                        for (var y = 0; y < imageHeight; y++)
                        {
                            for (var x = 0; x < imageWidth * 4; x++)
                            {
                                if (data[offset++] != 0)
                                {
                                    imageIsEmpty = false;
                                    break;
                                }
                            }
                            if (!imageIsEmpty)
                                break;
                        }
                        if (!imageIsEmpty)
                        {
                            if (currentSpriteId < MAX_SPRITES)
                            {
                                png_data = generatePng(imageWidth, imageHeight, s);
                                $('#sprite_' + (spriteIndex++)).attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
                            }
                        }
                    }
                    else
                    {
                        // set in any case
                        png_data = generatePng(imageWidth, imageHeight, s);
                        $('#sprite_' + i).attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
                    }
                }
            }
        }
        currentSpriteId = -1;
        setCurrentSprite(0);
    });
    var panel = $('<div>').addClass('panel').css('display', 'inline-block');
    $('#pane-options').append(panel);

    jQuery.each(states, function(_, item) {
        if (item.length == 0)
        {
            panel = $('<div>').addClass('panel').css('display', 'inline-block');
            $('#pane-options').append(panel);
        }
        else
        {
            if (item.length > 2)
            {
                var snippet = $("<span class='heading'>" +item[2] + "</span><br />");
                $(panel).append(snippet);
            }
            var key = item[0];
            var label = item[1];
            var snippet = $("<input id='so-" + key + "' type='checkbox' /><label for='so-" + key + "'>" + label + "</label><br />");
            $(panel).append(snippet);
            $('#so-' + key).change(function(e) {
                var key = $(e.target).attr('id').replace('so-', '');
                if ($(e.target).is(':checked'))
                    sprite_properties[currentSpriteId][key] = true;
                else
                    delete sprite_properties[currentSpriteId][key];
            });
        }
    });
    $('#add_animation').click(function() {
        push_animation({start: 0, count: 1, speed: 1, shuffle: false, wait: 0});
    });
    setTimeout(auto_save_loop, Math.floor((Math.random() * (5 * 60) + (5 * 60)) * 1000));
    if (window.location.hash !== '')
    {
        var tag = window.location.hash.replace('#', '');
        var play_it_now = false;
        if (tag.substr(0, 1) == 'p')
        {
            tag = tag.substr(1, tag.length - 1);
            play_it_now = true;
        }
        load_from_server(tag, play_it_now);
    }
    $('#load_play_code_submit').click(function() {
        var tag = $('#load_play_code').val();
        jQuery.post('load.rb', tag,
            function(data) {

                level = {};
                level_use = [];
                level_props = {};
                for (var i = 0; i < MAX_SPRITES; i++)
                    sprite_properties[i] = {};

                loadFromZip('data:text/x-haskell;base64,' + btoa(data.data));
                $('#link_sprites').hide();
            }
        );
    });
});

function auto_save_loop()
{
    autoSave();
    setTimeout(auto_save_loop, Math.floor((Math.random() * (5 * 60) + (5 * 60)) * 1000));
}

function push_animation(info)
{
    var anim_index = animations.length;
    var anim_key = 'animation_' + anim_index;
    animations.push(info);
    var animation = $('<tr>');
    var element = $('<input>');
    element.attr('id', 'animation_' + anim_key + '_start');
    element.val('' + info.start);
    element.attr('type', 'number');
    element.attr('min', '0');
    element.attr('max', '' + (MAX_SPRITES - 1));
    animation.append($('<td>').append(element));
    element.change(function(e) {
        var t = $(e.target);
        var anim_index = t.parent().parent().index()
        var v = new Number(t.val()).valueOf();
        if (v < 0)
            v = 0;
        if (v > MAX_SPRITES - 1)
            v = MAX_SPRITES - 1;
        t.val('' + v);
        animations[anim_index].start = v;
    });

    element = $('<input>');
    element.attr('id', 'animation_' + anim_key + '_count');
    element.val('' + info.count);
    element.attr('type', 'number');
    element.attr('min', '1');
    element.attr('max', '' + (MAX_SPRITES - 1));
    animation.append($('<td>').append(element));
    element.change(function(e) {
        var t = $(e.target);
        var anim_index = t.parent().parent().index()
        var v = new Number(t.val()).valueOf();
        if (v < 1)
            v = 1;
        if (v > MAX_SPRITES - 1)
            v = MAX_SPRITES - 1;
        t.val('' + v);
        animations[anim_index].count = v;
    });

    element = $('<select>');
    element.attr('id', 'animation_' + anim_key + '_speed');
    element.append($('<option>').attr('value', '1').html('30 fps'));
    element.append($('<option>').attr('value', '2').html('15 fps'));
    element.append($('<option>').attr('value', '3').html('10 fps'));
    element.append($('<option>').attr('value', '4').html('7.5 fps'));
    element.append($('<option>').attr('value', '5').html('6 fps'));
    element.append($('<option>').attr('value', '6').html('5 fps'));
    element.append($('<option>').attr('value', '10').html('3 fps'));
    element.append($('<option>').attr('value', '15').html('2 fps'));
    element.append($('<option>').attr('value', '30').html('1 fps'));
    animation.append($('<td>').append(element));
    element.val('' + info.speed);
    element.change(function(e) {
        var t = $(e.target);
        var anim_index = t.parent().parent().index()
        var v = new Number(t.val()).valueOf();
        animations[anim_index].speed = v;
    });

    element = $('<input>');
    element.attr('id', 'animation_' + anim_key + '_shuffle');
    element.attr('type', 'checkbox');
    animation.append($('<td>').append(element));
    element.prop('checked', info.shuffle);
    element.change(function(e) {
        var t = $(e.target);
        var anim_index = t.parent().parent().index()
        var v = new Number(t.val()).valueOf();
        animations[anim_index].shuffle = t.prop('checked');
    });

    element = $('<input>');
    element.attr('id', 'animation_' + anim_key + '_wait');
    if (typeof(info.wait) === 'undefined')
        info.wait = 0;
    element.val('' + info.wait);
    element.attr('type', 'number');
    element.attr('min', '0');
    element.attr('max', '9999');
    animation.append($('<td>').append(element));
    element.change(function(e) {
        var t = $(e.target);
        var anim_index = t.parent().parent().index()
        var v = new Number(t.val()).valueOf();
        if (v < 0)
            v = 0;
        if (v > 9999)
            v = 9999;
        t.val('' + v);
        animations[anim_index].wait = v;
    });

    element = $('<button>');
    animation.append($('<td>').append(element));
    element.html('L&ouml;schen');
    element.click(function(e) {
        var t = $(e.target);
        var anim_index = t.parent().parent().index()
        animations.splice(anim_index, 1);
        t.parent().parent().remove();
    });

    $('#animations_table_body').append(animation);
}

function get_sprites_as_png()
{
    var canvas = $('<canvas>').attr('width', imageWidth * 8).attr('height', imageHeight * 10)[0];

    var pixels = [];
    for (var vi = 0; vi < MAX_SPRITES * imageHeight * imageWidth * 4; vi++)
        pixels[vi] = 0;

    for (var vi = 0; vi < MAX_SPRITES; vi++)
    {
        var local_image = $('#sprite_' + vi)[0];
        if ($(local_image).attr('src').substr(0, 5) === 'data:')
        {
            var local_canvas = $('<canvas>').attr('width', imageWidth).attr('height', imageHeight)[0];
            local_canvas.getContext('2d').drawImage(local_image, 0, 0, imageWidth, imageHeight);
            var data = local_canvas.getContext('2d').getImageData(0, 0, imageWidth, imageHeight).data;
            var vx = vi % 8;
            var vy = Math.floor(vi / 8);
            for (var y = 0; y < imageHeight; y++)
            {
                for (var x = 0; x < imageWidth; x++)
                {
                    for (var c = 0; c < 4; c++)
                        pixels[((vy * imageWidth + y) * (imageWidth * 8) + vx * imageWidth + x) * 4 + c] = data[(y * imageHeight + x) * 4 + c];
                }
            }
        }
    }

    var s = '';
    for (var vi = 0; vi < MAX_SPRITES * imageHeight * imageWidth * 4; vi++)
        s += String.fromCharCode(pixels[vi]);

    png_data = generatePng(imageWidth * 8, Math.floor(MAX_SPRITES / 8) * imageWidth, s);
//     console.log(png_data);
//     return btoa(png_data);
//     console.log(btoa(png_data));
    return png_data;
}

function get_level_descriptions()
{
    var levels = [];
    for (var i = 0; i < MAX_LEVELS; i++)
    {
        if (!(i in level_props))
        {
            level_props[i] = {offset: [0, 0], background: '#000'}
        }
        if (typeof(level[i]) === 'undefined')
            level[i] = {};
        var l = {};
        l.use = level_use[i];
        l.background = level_props[i].background;
        // find x / y ranges
        var xmin = null, xmax = null, ymin = null, ymax = null;
        jQuery.each(Object.keys(level[i]), function(_, key) {
            if (level[i][key] != -1)
            {
                var k = key.split(',');
                var x = new Number(k[0]).valueOf();
                var y = new Number(k[1]).valueOf();
                if (xmin === null)
                    xmin = x;
                if (xmax === null)
                    xmax = x;
                if (ymin === null)
                    ymin = y;
                if (ymax === null)
                    ymax = y;
                if (x < xmin)
                    xmin = x;
                if (x > xmax)
                    xmax = x;
                if (y < ymin)
                    ymin = y;
                if (y > ymax)
                    ymax = y;
            }
        });
        l.xmin = xmin;
        l.ymin = ymin;
        l.data = [];
        l.width = xmax - xmin + 1;
        l.height = ymax - ymin + 1;
        if (xmin != null && xmax != null && ymin != null && ymax != null)
        {
            for (var y = ymin; y <= ymax; y++)
            {
                var row = [];
                for (var x = xmin; x <= xmax; x++)
                {
                    var k = '' + x + ',' + y;
                    if (k in level[i])
                        row.push(level[i][k]);
                    else
                        row.push(-1);
                }
                l.data.push(row);
            }
        }
        levels.push(l);
    }
    return levels;
}

function get_sprite_properties()
{
//     var props = [];
    return sprite_properties;
}

function get_zip_package()
{
    var zip = new JSZip();
    var d = new Date("October 26, 1985 01:20:00");
    zip.file("readme.txt", "Hackschule FTW!!!\n", {date: d});
    zip.file("sprites.png", btoa(get_sprites_as_png()), {base64: true, date: d});
    zip.file("sprite_props.json", btoa(JSON.stringify(get_sprite_properties())), {base64: true, date: d});
    zip.file("levels.json", btoa(JSON.stringify(get_level_descriptions())), {base64: true, date: d});
    zip.file("animations.json", btoa(JSON.stringify(animations)), {base64: true, date: d});
    // we have user-defined strings in here, so hack them into UTF-8!!!
    var options = {};
    jQuery.each(Object.keys(game_options), function(_, k) {
        var v = game_options[k];
        var v2 = v;
        if (typeof(v) === 'string')
            v2 = unescape(encodeURI(v));
        options[k] = v2;
    });
    console.log(options);
    zip.file("game.json", btoa(JSON.stringify(options)), {base64: true, date: d});
    return '' + zip.generate({compression: 'DEFLATE'});
}

function update_sprite(add_to_undo_stack)
{
    var s = '';
    var context2 = $('#small_pixels_2')[0].getContext('2d');
    var context3 = $('#small_pixels_3')[0].getContext('2d');
    var context_tile = $('#small_pixels_1_tile')[0].getContext('2d');
    var context_tile_h = $('#small_pixels_1_tile_h')[0].getContext('2d');
    var context_tile_v = $('#small_pixels_1_tile_v')[0].getContext('2d');
    context2.clearRect(0, 0, imageWidth * 2, imageHeight * 2);
    context3.clearRect(0, 0, imageWidth * 3, imageHeight * 3);
    context_tile.clearRect(0, 0, imageWidth * 3, imageHeight * 3);
    context_tile_h.clearRect(0, 0, imageWidth * 3, imageHeight);
    context_tile_v.clearRect(0, 0, imageWidth, imageHeight * 3);
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            var color = imageData[y][x];
            s += String.fromCharCode(color[0], color[1], color[2], color[3]);
            var htmlColor = "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + (color[3] / 255.0) + ")";
            context2.fillStyle = htmlColor;
            context2.fillRect(x * 2, y * 2, 2, 2);
            context3.fillStyle = htmlColor;
            context3.fillRect(x * 3, y * 3, 3, 3);
        }
    }
    png_data = generatePng(imageWidth, imageHeight, s);
    $('#sprite_' + currentSpriteId).attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
    var img = $('<img>');
    img.addClass('sprite');
    img.attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
    if (add_to_undo_stack)
    {
        var undo_stack = $('#undo_stack').find('img');
        var same_image_dont_store = false;
        if (undo_stack.length > 0)
        {
            if ($(undo_stack[undo_stack.length - 1]).attr('src') === img.attr('src'))
                same_image_dont_store = true;
        }
        if (!same_image_dont_store)
        {
            img.mousedown(function(event) {
                restore_image(event.target);
                $('#undo_stack').append(event.target);
            });
            $('#undo_stack').append(img);
            if (undo_stack.length > MAX_UNDO_STACK)
                $(undo_stack[0]).remove();
        }
    }
    for (var y = 0; y < 3; y++)
    {
        for (var x = 0; x < 3; x++)
        {
            context_tile.drawImage(img[0], 0, 0, imageWidth, imageHeight, x * imageWidth, y * imageHeight, imageWidth, imageHeight);
        }
        context_tile_h.drawImage(img[0], 0, 0, imageWidth, imageHeight, y * imageWidth, 0, imageWidth, imageHeight);
        context_tile_v.drawImage(img[0], 0, 0, imageWidth, imageHeight, 0, y * imageWidth, imageWidth, imageHeight);
    }
}

function restore_image(element)
{
    var canvas = $('<canvas>').attr('width', imageWidth).attr('height', imageHeight)[0];
    var image = $(element)[0];
    if ($(image).attr('src').substr(0, 5) === 'data:')
    {
        canvas.getContext('2d').drawImage(image, 0, 0, imageWidth, imageHeight);
        var data = canvas.getContext('2d').getImageData(0, 0, imageWidth, imageHeight).data;
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
                setPixel(x, y, [data[(y * imageWidth + x) * 4 + 0],
                                data[(y * imageWidth + x) * 4 + 1],
                                data[(y * imageWidth + x) * 4 + 2],
                                data[(y * imageWidth + x) * 4 + 3]]);
        }
    }
    else
    {
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
                setPixel(x, y, [0, 0, 0, 0]);
        }
    }
    updatePixels();
    update_sprite(false);
}

function fix_sizes()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var bigPixelSize = height - 120;
    if (bigPixelSize + 600 > width)
        bigPixelSize = width - 600;
    if (bigPixelSize > 650)
        bigPixelSize = 650;
    if (bigPixelSize < 200)
        bigPixelSize = 200;
//     console.log("Setting new size: ", bigPixelSize);
    $('#container_big_pixels').css('width', bigPixelSize);
    $('#container_big_pixels').css('height', bigPixelSize);
    $('#big_pixels').attr('width', bigPixelSize);
    $('#big_pixels').attr('height', bigPixelSize);
//     console.log($('#big_pixels').width());
    updatePixels();
}

function clearMask()
{
    for (var y = 0; y < imageHeight; y++)
        for (var x = 0; x < imageWidth; x++)
            selectionMask[y][x] = 0;
}

function renderImage(context)
{
    var width = $('#big_pixels').width();
    var height = $('#big_pixels').height();
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            var x0 = Math.floor(x * width / imageWidth) + 0.5;
            var y0 = Math.floor(y * height / imageHeight) + 0.5;
            var x1 = Math.floor((x + 1) * width / imageWidth) + 0.5;
            var y1 = Math.floor((y + 1) * height / imageHeight) + 0.5;
            var color = imageData[y][x];
            var htmlColor = "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + (color[3] / 255.0) + ")";
            context.fillStyle = htmlColor;
            context.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
    }
}

function renderGrid(context)
{
    var width = $('#big_pixels').width();
    var height = $('#big_pixels').height();

    context.beginPath();
    context.strokeStyle = 'rgba(255,255,255,0.3)';
    for (var x = 0; x < imageWidth + 1; x++)
    {
        var x0 = Math.floor(x * width / imageWidth) + 0.5;
        if (x == imageWidth)
            x0--;
        context.moveTo(x0 + 1, 0);
        context.lineTo(x0 + 1, height);
        context.moveTo(0, x0 + 1);
        context.lineTo(width, x0 + 1);
    }
    context.stroke();

    context.beginPath();
    context.strokeStyle = '#222';
    for (var x = 0; x < imageWidth + 1; x++)
    {
        var x0 = Math.floor(x * width / imageWidth) + 0.5;
        if (x == imageWidth)
            x0--;
        context.moveTo(x0, 0);
        context.lineTo(x0, height);
        context.moveTo(0, x0);
        context.lineTo(width, x0);
    }
    context.stroke();
}

function renderMaskOutline(context)
{
    var width = $('#big_pixels').width();
    var height = $('#big_pixels').height();
    context.strokeStyle = '#fff';
    context.beginPath();
    for (var y = 0; y < imageHeight + 1; y++)
    {
        for (var x = 0; x < imageWidth + 1; x++)
        {
            var here = 0;
            if (x < imageWidth && y < imageHeight)
                here = selectionMask[y][x];

            var other = 0;
            if (y > 0 && x < imageWidth)
                other = selectionMask[y - 1][x];

            if (here != other)
            {
                var x0 = Math.floor(x * width / imageWidth) + 0.5;
                var y0 = Math.floor(y * height / imageHeight) + 0.5;
                var x1 = Math.floor((x + 1) * width / imageWidth) + 0.5 - 1;
                var y1 = Math.floor(y * height / imageHeight) + 0.5;
                if (here < other)
                {
                    y0--; y1--;
                }
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
            }

            var other = 0;
            if (x > 0 && y < imageHeight)
                other = selectionMask[y][x - 1];

            if (here != other)
            {
                var x0 = Math.floor(x * width / imageWidth) + 0.5;
                var y0 = Math.floor(y * height / imageHeight) + 0.5;
                var x1 = Math.floor(x * width / imageWidth) + 0.5;
                var y1 = Math.floor((y + 1) * height / imageHeight) + 0.5 - 1;
                if (here < other)
                {
                    x0--; x1--;
                }
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
            }
            if (!(currentTool == 'picker' || currentTool == 'fill' || currentTool == 'move'))
            {
                if (here == 1)
                {
                    var x0 = Math.floor(x * width / imageWidth) + 0.5;
                    var y0 = Math.floor(y * height / imageHeight) + 0.5;
                    var x1 = Math.floor((x + 1) * width / imageWidth) + 0.5;
                    var y1 = Math.floor((y + 1) * height / imageHeight) + 0.5 - 1;
                    context.fillStyle = 'rgba(' + currentColor[0] + ',' + currentColor[1] + ',' + currentColor[2] + ',' + (currentColor[3] * SELECTION_OPACITY / 255.0) + ')';
                    context.fillRect(x0, y0, x1 - x0, y1 - y0);
                }
            }
        }
    }
    context.stroke();
}

function updatePixels()
{
    var width = $('#big_pixels').width();
    var height = $('#big_pixels').height();
    var context = $('#big_pixels')[0].getContext('2d');
    context.clearRect(0, 0, width, height);
    if (!(drawingOperationPending && (currentTool in generatorHash)))
        clearMask();
    renderImage(context);
    renderGrid(context);
}

function updateCursor(x, y)
{
    var width = $('#big_pixels').width();
    var height = $('#big_pixels').height();
    var context = $('#big_pixels')[0].getContext('2d');
    updatePixels();
    if (x != null && y != null)
    {
        var rx = Math.floor(x * imageWidth / width - ((penWidth + 1) % 2) * 0.5);
        var ry = Math.floor(y * imageHeight / height - ((penWidth + 1) % 2) * 0.5);
        jQuery.each(penPattern(penWidth), function(_, delta) {
            var dx = rx + delta[0];
            var dy = ry + delta[1];
            if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                selectionMask[dy][dx] = 1;
        });
    }
    renderMaskOutline(context);
}

function initiateDrawing(x, y)
{
    if (currentTool == 'picker')
    {
        var width = $('#big_pixels').width();
        var height = $('#big_pixels').height();
        var rx = Math.floor(x * imageWidth / width - ((penWidth + 1) % 2) * 0.5);
        var ry = Math.floor(y * imageHeight / height - ((penWidth + 1) % 2) * 0.5);
        setCurrentColor(imageData[ry][rx], true);
        currentTool = lastTool;
        $('.tool').removeClass('active');
        $('#tool_' + currentTool).addClass('active');
        $('.swatch').removeClass('active');
        $('.swatch').each(function(_, e) {
            if ($(e).data('list_color') && $(e).data('list_color').join(',') == currentColor.join(','))
            {
                $(e).addClass('active');
                return false;
            }
        });
        updateMouseCursor();
    }
    else if (currentTool == 'fill')
    {
        var width = $('#big_pixels').width();
        var height = $('#big_pixels').height();
        var rx = Math.floor(x * imageWidth / width - ((penWidth + 1) % 2) * 0.5);
        var ry = Math.floor(y * imageHeight / height - ((penWidth + 1) % 2) * 0.5);
        floodFill(rx, ry, currentColor);
        updatePixels();
        update_sprite(true);
    }
    else if (currentTool == 'spray')
    {
        var width = $('#big_pixels').width();
        var height = $('#big_pixels').height();
        var rx = Math.floor(x * imageWidth / width - ((penWidth + 1) % 2) * 0.5);
        var ry = Math.floor(y * imageHeight / height - ((penWidth + 1) % 2) * 0.5);
        var referenceColor = imageData[ry][rx].slice();
        referenceColor[3] /= 255.0;
        referenceColor = tinycolor({r: referenceColor[0], g: referenceColor[1], b: referenceColor[2], a: referenceColor[3]});
        spray_pixels = [];
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
            {
                var color = imageData[y][x].slice();
                color[3] /= 255.0;
                color = tinycolor({r: color[0], g: color[1], b: color[2], a: color[3]});

                if (tinycolor.equals(referenceColor, color))
                    spray_pixels.push([x, y]);
            }
        }
        shuffle(spray_pixels);
        spray_next();
    }
    else // include 'move'
    {
        drawingOperationPending = true;
        lineStart = null;
        handleDrawing(x, y);
    }

    if (currentTool == 'gradient')
    {
        var width = $('#big_pixels').width();
        var height = $('#big_pixels').height();
        var rx = Math.floor(x * imageWidth / width - ((penWidth + 1) % 2) * 0.5);
        var ry = Math.floor(y * imageHeight / height - ((penWidth + 1) % 2) * 0.5);
        var referenceColor = imageData[ry][rx].slice();
        referenceColor[3] /= 255.0;
        referenceColor = tinycolor({r: referenceColor[0], g: referenceColor[1], b: referenceColor[2], a: referenceColor[3]});
        spray_pixels = [];
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
            {
                var color = imageData[y][x].slice();
                color[3] /= 255.0;
                color = tinycolor({r: color[0], g: color[1], b: color[2], a: color[3]});

                if (tinycolor.equals(referenceColor, color))
                    spray_pixels.push([x, y]);
            }
        }
    }
}

function handleDrawing(x, y)
{
    if (!drawingOperationPending)
        return;

    var width = $('#big_pixels').width();
    var height = $('#big_pixels').height();
    var rx = Math.floor(x * imageWidth / width - ((penWidth + 1) % 2) * 0.5);
    var ry = Math.floor(y * imageHeight / height - ((penWidth + 1) % 2) * 0.5);
    lineEnd = [rx, ry];

    if (currentTool == 'draw')
    {
        if (lineStart == null)
        {
            jQuery.each(penPattern(penWidth), function(_, delta) {
                var dx = rx + delta[0];
                var dy = ry + delta[1];
                if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                    setPixel(dx, dy, rightButtonPressed ? [0,0,0,0] : currentColor);
            });
        }
        else
        {
            jQuery.each(linePattern(lineStart[0], lineStart[1], rx, ry), function(_, p) {
                jQuery.each(penPattern(penWidth), function(_, delta) {
                    var dx = p[0] + delta[0];
                    var dy = p[1] + delta[1];
                    if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                        setPixel(dx, dy, rightButtonPressed ? [0,0,0,0] : currentColor);
                });
            });
        }
        lineStart = [rx, ry];
        updateCursor(x, y);
        update_sprite(false);
    }
    else if (currentTool == 'move')
    {
        if (lineStart !== null)
            move_sprite(rx - lineStart[0], ry - lineStart[1]);
        lineStart = [rx, ry];
        updateCursor(x, y);
        update_sprite(false);
    }
    else if (currentTool in generatorHash)
    {
        var generator = generatorHash[currentTool];
        clearMask();
        if (lineStart == null)
            lineStart = [rx, ry];
        jQuery.each(generator(lineStart[0], lineStart[1], rx, ry), function(_, p) {
            jQuery.each(penPattern(penWidth), function(_, delta) {
                var dx = p[0] + delta[0];
                var dy = p[1] + delta[1];
                if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                    selectionMask[dy][dx] = 1;
            });
        });
        updateCursor(null, null);
    }
}

function transform_sprite(f, is_destructive)
{
    if (typeof(is_destructive) === 'undefined')
        is_destructive = false;

    var newImageData = [];
    for (var y = 0; y < imageHeight; y++)
    {
        var line = [];
        for (var x = 0; x < imageWidth; x++)
            line.push([0, 0, 0, 0]);
        newImageData.push(line);
    }
    f(newImageData, imageData);
    imageData = newImageData;
    updatePixels();
    update_sprite(is_destructive);

    var undo_stack = $('#undo_stack').find('img');
    if (undo_stack.length > 0)
    {
        var s = '';
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
            {
                var color = imageData[y][x];
                s += String.fromCharCode(color[0], color[1], color[2], color[3]);
            }
        }
        png_data = generatePng(imageWidth, imageHeight, s);
        $('#sprite_' + currentSpriteId).attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
        var img = $('<img>');
        img.addClass('sprite');
        img.attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
        img.mousedown(function(event) {
            restore_image(event.target);
        });
        $(undo_stack[undo_stack.length - 1]).remove();
        $('#undo_stack').append(img);
    }
}

function get_sprite_pixels(sprite_id)
{
    var pixels = [];
    var local_image = $('#sprite_' + sprite_id)[0];
    if ($(local_image).attr('src').substr(0, 5) === 'data:')
    {
        var local_canvas = $('<canvas>').attr('width', imageWidth).attr('height', imageHeight)[0];
        local_canvas.getContext('2d').drawImage(local_image, 0, 0, imageWidth, imageHeight);
        var data = local_canvas.getContext('2d').getImageData(0, 0, imageWidth, imageHeight).data;
        return data;
    }
    return null;
}

function alphaMultiply(color_source, alpha_source)
{
    var c = get_sprite_pixels(color_source);
    var a = get_sprite_pixels(alpha_source);
    var p = 0;
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            setPixel(x, y, [c[p + 0], c[p + 1], c[p + 2], Math.floor((c[p + 3] / 255.0) * (a[p + 3] / 255.0) * 255)]);
            p += 4;
        }
    }
    update_sprite(true);
    updatePixels();
}

function colorize(pattern_source, color_source)
{
    var a = get_sprite_pixels(pattern_source);
    var b = get_sprite_pixels(color_source);
    var p = 0;
    var maxg = 0.0;
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            var g = (a[p + 0] / 255.0) * 0.299 +
                    (a[p + 1] / 255.0) * 0.587 +
                    (a[p + 2] / 255.0) * 0.114;
            if (g > maxg)
                maxg = g;
            p += 4;
        }
    }
    if (maxg == 0.0)
        return;
    maxg = 1.0 / maxg;
    p = 0;
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            var g = (a[p + 0] / 255.0) * 0.299 +
                    (a[p + 1] / 255.0) * 0.587 +
                    (a[p + 2] / 255.0) * 0.114;
            g *= maxg;
            setPixel(x, y, [Math.floor(b[p + 0] * g), Math.floor(b[p + 1] * g), Math.floor(b[p + 2] * g),
                     Math.floor((b[p + 3] / 255.0) * (a[p + 3] / 255.0) * 255)]);
            p += 4;
        }
    }
    update_sprite(true);
    updatePixels();
}

function move_sprite(dx, dy)
{
    while (dx < 0)
        dx += imageWidth;
    while (dy < 0)
        dy += imageHeight;
    dx %= imageWidth;
    dy %= imageHeight;
    transform_sprite(function(newImageData, imageData) {
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
            {
                var tx = (x + dx + imageWidth) % imageWidth;
                var ty = (y + dy + imageHeight) % imageHeight;
                newImageData[ty][tx] = imageData[y][x];
            }
        }
    });
}

function flip_sprite(flip_x, flip_y)
{
    transform_sprite(function(newImageData, imageData) {
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
            {
                var tx = x;
                var ty = y;
                if (flip_x)
                    tx = imageWidth - x - 1;
                if (flip_y)
                    ty = imageHeight - y - 1;
                newImageData[ty][tx] = imageData[y][x];
            }
        }
    });
}

function rotate_sprite(right)
{
    transform_sprite(function(newImageData, imageData) {
        for (var y = 0; y < imageHeight; y++)
        {
            for (var x = 0; x < imageWidth; x++)
                {
                if (right)
                    newImageData[x][y] = imageData[imageHeight - y - 1][x];
                else
                    newImageData[x][y] = imageData[y][imageWidth - x - 1];
            }
        }
    });
}

function finishDrawing(success)
{
    if (drawingOperationPending)
    {
        if (currentTool in generatorHash)
        {
            if (success)
            {
                if (currentTool === 'gradient')
                {
                    var d = [lineEnd[0] - lineStart[0], lineEnd[1] - lineStart[1]];
                    var dx2 = d[0] * d[0] + d[1] * d[1];
                    if (dx2 > 0)
                    {
                        var dx = Math.sqrt(dx2);
                        d[0] /= dx;
                        d[1] /= dx;
                        floodFill(lineStart[0], lineStart[1], function(x, y) {
                            var p = [x, y];
                            var r = [p[0] - lineStart[0], p[1] - lineStart[1]];
                            r[0] /= dx;
                            r[1] /= dx;
                            var g = r[0] * d[0] + r[1] * d[1];
                            if (g >= 0.0)
                            {
                                if (g < 0.0)
                                    g = 0.0;
                                if (g > 1.0)
                                    g = 1.0;
                                var a = imageData[p[1]][p[0]];
                                var b = currentColor;
                                var c = [0,0,0,0];
                                for (var i = 0; i < 4; i++)
                                    c[i] = Math.floor(a[i] * (1.0 - g) + b[i] * g);
                                c = tinycolor({r: c[0], g: c[1], b: c[2], a: c[3] / 255.0}).toHsl();
                                var q = 1.0 / (shiftPressed ? 256 : 16);
                                c.l += Math.random() * q * 2.0 - q;
                                if (c.l < 0)
                                    c.l = 0;
                                if (c.l > 1.0)
                                    c.l = 1.0;
                                c.l = Math.floor(c.l / q) * q;
                                c = tinycolor(c);
                                c = [Math.floor(c._r), Math.floor(c._g), Math.floor(c._b), Math.floor(c._a * 255.0)];
                                for (var i = 0; i < 4; i++)
                                {
                                    if (c[i] < 0)
                                        c[i] = 0;
                                    if (c[i] > 255)
                                        c[i] = 255;
                                }
                                return c;
                            }
                            return imageData[y][x].slice();
                        });
                    }
                }
                else
                {
                    for (var y = 0; y < imageHeight; y++)
                    {
                        for (var x = 0; x < imageWidth; x++)
                        {
                            if (selectionMask[y][x] == 1)
                                setPixel(x, y, rightButtonPressed ? [0,0,0,0] : currentColor);
                        }
                    }
                }
                update_sprite(true);
            }
        }
        else
        {
            update_sprite(true);
        }
        lineStart = null;
        updatePixels();
        drawingOperationPending = false;
    }
    if (currentTool === 'spray')
    {
        spray_pixels = [];
        update_sprite(true);
    }
}

function play()
{
    init_game(28 * 24, 16 * 24, 2, get_zip_package());
}

