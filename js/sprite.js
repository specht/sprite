var currentColor = [0, 0, 0, 255];
var currentTool = 'draw';
var lastTool = null;
var penWidth = 1;
var imageWidth = 24;
var imageHeight = 24;
var levelWidth = 28;
var levelHeight = 16;
var MAX_UNDO_STACK = 25;
var MAX_LEVELS = 25;
var MAX_SPRITES = 64;
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
// offset, background
var level_props = {};
var current_level = 0;
var loadWithShift = false;

function set_field(x, y, v)
{
    if (!(current_level in level))
        level[current_level] = {};
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
    if (level_use[current_level] === true)
        $('span#level_' + which + ' div').removeClass('inactive');
    else
        $('span#level_' + which + ' div').addClass('inactive');
}

function switchPane(which)
{
    $('.pane').hide();
    $('#pane-' + which).show();
    $('#pane-switcher .toolbutton').removeClass('active-pane');
    $('#pane-switcher #pane_' + which + '.toolbutton').addClass('active-pane');
    if (which == 'levels')
        draw_level();
    if (which == 'sprites')
        fix_sizes();
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
                context.drawImage($('#sprite_' + v)[0], x * imageWidth, y * imageHeight, imageWidth, imageHeight);
        }
    }
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
            swatch.data('list_color', [rgb.r, rgb.g, rgb.b, Math.trunc(rgb.a * 255)]);
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
            swatch.data('list_color', [rgb.r, rgb.g, rgb.b, Math.trunc(rgb.a * 255)]);
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
            swatch.data('list_color', [rgb.r, rgb.g, rgb.b, Math.trunc(rgb.a * 255)]);
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
    $('#sprite_' + currentSpriteId).addClass('active');
    restore_image($('#sprite_' + currentSpriteId));
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
    if (loadWithShift)
        return;
    jQuery.each(info, function(i, l) {
        set_current_level(i);
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
}

$().ready(function() {
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
            setCurrentSprite(sprite_id);
        });
        $('#sprites').append(" ");
        element.draggable({
            containment: 'parent', 
//             cursor: 'move', 
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

    for (var i = 1; i <= 5; i++)
    {
        $('#pen_width_' + i).mousedown(function(event) {
            if (!(currentTool == 'picker' || currentTool == 'fill' || currentTool == 'move' || currentTool == 'spray' || currentTool == 'gradient'))
            {
                penWidth = Number($(event.target).attr('id').replace('pen_width_', ''));
                $('.penwidth').removeClass('active');
                $(event.target).addClass('active');
            }
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
        loadWithShift = (event.shiftKey === true);
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
            if (!loadWithShift)
            {
                level = {};
                level_use = [];
                level_props = {};
            }
            var data = '' + e.target.result;
            if (e.target.result.substr(0, 14) === 'data:image/png')
            {
                loadSprites(data);
                if (!loadWithShift)
                {
                    set_current_level(0);
                    level_use[0] = true;
                }
            }
            else
            {
                console.log('loading hs file...');
                data = data.substr(data.indexOf('base64,') + 7);
                data = atob(data);
                data = atob(data);
                var zip_buffer = new Uint8Array(data);
                var zip = new JSZip(data);
                $.each(zip.files, function (index, zipEntry) {
                    console.log(zipEntry);
                    if (zipEntry.name == 'sprites.png')
                    {
                        var blob = new Blob([zipEntry.asUint8Array()], {'type': 'image/png'});
                        var urlCreator = window.URL || window.webkitURL;
                        var imageUrl = urlCreator.createObjectURL(blob);
                        loadSprites(imageUrl);
                    }
                    else if (zipEntry.name == 'levels.json')
                    {
                        var info = JSON.parse(zipEntry.asText());
                        loadLevels(info);
                    }
                });
            }
            switchPane('sprites');
            if (!loadWithShift)
                set_current_level(0);
        }
    });
    Downloadify.create('tool_save',{
        filename: function() { return 'sprites.hs'; },
        dataType: 'string',
        data: function() { return get_zip_package(); },
        onComplete: function(){  },
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

    document.onselectstart = function()
    {
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
        $('#save_sprites').hide();
    });

    $('.popup').mousedown(function(e) {
        e.stopPropagation();
    });

    $('.popup').mousemove(function(e) {
        e.stopPropagation();
    });

    $(window).keydown(function(e) {
//         console.log(e.which);
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
            switchPane('sprites');
            e.preventDefault();
        }
        if (e.which == 50)
        {
            switchPane('levels');
            e.preventDefault();
        }
    });

    $('#big_pixels').mouseenter(function(e) {
        updateCursor(e.offsetX, e.offsetY);
    });
    $('#big_pixels').mousemove(function(e) {
        handleDrawing(e.offsetX, e.offsetY);
        if (!drawingOperationPending)
            updateCursor(e.offsetX, e.offsetY);
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
        initiateDrawing(e.offsetX, e.offsetY);
    });
    $(window).mouseup(function(e) {
        currentlyDrawingLevel = false;
        console.log('currentlyDrawingLevel', currentlyDrawingLevel);
        finishDrawing(true);
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
        var rx = Math.trunc(e.offsetX / imageWidth);
        var ry = Math.trunc(e.offsetY / imageHeight);
        if (currentlyDrawingLevel)
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
        var rx = Math.trunc(e.offsetX / imageWidth);
        var ry = Math.trunc(e.offsetY / imageHeight);
        set_field(rx + level_props[current_level].offset[0], ry + level_props[current_level].offset[1], e.button == 0 ? currentSpriteId : -1);
        draw_level();
        currentlyDrawingLevel = true;
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
    $('#load_image').load(function(e) {
        var image = $(e.target);
        console.log('loadSprites', e);
        var totalWidth = 192;
        var totalHeight = 240;
        var spriteIndex = currentSpriteId;
        if (image.width() == totalWidth && image.height() == totalHeight)
        {
            var local_canvas = $('<canvas>').attr('width', totalWidth).attr('height', totalHeight)[0];
            local_canvas.getContext('2d').drawImage(image[0], 0, 0, totalWidth, totalHeight);
            var data = local_canvas.getContext('2d').getImageData(0, 0, totalWidth, totalHeight).data;
            for (var i = 0; i < MAX_SPRITES; i++)
            {
                var px = i % 8;
                var py = Math.floor(i / 8);
                var s = '';
                var offset = ((py * imageHeight) * totalWidth + px * imageWidth) * 4;
                for (var y = 0; y < imageHeight; y++)
                {
                    for (var x = 0; x < imageWidth; x++)
                        s += String.fromCharCode(data[offset++], data[offset++], data[offset++], data[offset++]);
                    offset = offset - imageWidth * 4 + totalWidth * 4;
                }
                if (loadWithShift)
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
        currentSpriteId = -1;
        setCurrentSprite(0);
    });
});

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

    png_data = generatePng(imageWidth * 8, imageHeight * 10, s);
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
            continue;
        if (typeof(level[i]) === 'undefined')
            continue;
        var l = {};
        l.use = level_use[i];
        l.background = level_props[i].background;
        // find x / y ranges
        var xmin = null, xmax = null, ymin = null, ymax = null;
        jQuery.each(Object.keys(level[i]), function(_, key) {
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
        });
        l.xmin = xmin;
        l.ymin = ymin;
        l.data = [];
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

function get_zip_package()
{
    var zip = new JSZip();
    zip.file("readme.txt", "Hackschule FTW!!!\n");
    zip.file("sprites.png", btoa(get_sprites_as_png()), {base64: true});
    zip.file("levels.json", btoa(JSON.stringify(get_level_descriptions())), {base64: true});
    return '' + zip.generate();
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
                    setPixel(dx, dy, currentColor);
            });
        }
        else
        {
            jQuery.each(linePattern(lineStart[0], lineStart[1], rx, ry), function(_, p) {
                jQuery.each(penPattern(penWidth), function(_, delta) {
                    var dx = p[0] + delta[0];
                    var dy = p[1] + delta[1];
                    if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                        setPixel(dx, dy, currentColor);
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
                                var q = 1.0 / 16;
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
                                setPixel(x, y, currentColor);
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
