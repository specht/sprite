var currentColor = [0, 0, 0, 255];
var currentTool = 'draw';
var lastTool = null;
var penWidth = 1;
var imageWidth = 24;
var imageHeight = 24;
var MAX_UNDO_STACK = 41;
var SELECTION_OPACITY = 0.7
var lineStart = null;
var drawingOperationPending = false;
var selectionMask = [];
var generatorHash = {};

// current image data, with 4 byte RGBA pixels
var imageData = [];

// big pixel element for coordinates
var bigPixelGrid = [];

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
    function _fill(x, y, targetColor, replacementColor)
    {
        var color = imageData[y][x].join(',');
        if (color == replacementColor.join(','))
            return;
        if (color != targetColor.join(','))
            return;
        setPixel(x, y, replacementColor);
        if (x > 0)
            _fill(x - 1, y, targetColor, replacementColor);
        if (x < imageWidth - 1)
            _fill(x + 1, y, targetColor, replacementColor);
        if (y > 0)
            _fill(x, y - 1, targetColor, replacementColor);
        if (y < imageHeight - 1)
            _fill(x, y + 1, targetColor, replacementColor);
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
    
    for (var i = 0; i < 80; i++)
    {
        var element = $('<img>');
        element.addClass('sprite');
        element.attr('id', 'sprite_' + i);
        element.attr('width', imageWidth);
        element.attr('height', imageHeight);
        element.attr('src', 'images/transparent-1.png');
        if (i == 0)
            element.addClass('active');
        $('#sprites').append(element);
        $('#sprites').append(" ");
    }
    
    for (var i = 1; i <= 5; i++)
    {
        $('#pen_width_' + i).mousedown(function(event) {
            if (!(currentTool == 'picker' || currentTool == 'fill' || currentTool == 'move'))
            {
                penWidth = Number($(event.target).attr('id').replace('pen_width_', ''));
                $('.penwidth').removeClass('active');
                $(event.target).addClass('active');
            }
        });
    }
    $('#pen_width_' + penWidth).addClass('active');

    jQuery.each(['draw', 'fill', 'line', 'rect', 'fill_rect', 'ellipse', 'fill_ellipse',
        'picker', 'fill', 'move'], function(_, x) {
        $('#tool_' + x).mousedown(function(event) {
            lastTool = currentTool;
            currentTool = $(event.target).attr('id').replace('tool_', '');
            $('.tool').removeClass('active');
            $(event.target).addClass('active');
            if (x == 'picker' || x == 'fill' || x == 'move')
            {
                penWidth = 1;
                $('.penwidth').removeClass('active');
                $('#pen_width_1').addClass('active');
            }
            updateMouseCursor();
        });
    });
    $('#tool_' + currentTool).addClass('active');
    $('#tool_save').mousedown(function(event) {
        download();
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
    
    window.onbeforeunload = function()
    {
//         return "Wirklich?";
    };
    
    $(window).keydown(function(e) {
        var mapping = {
            81: 'tool_draw',
            87: 'tool_line',
            69: 'tool_rect',
            82: 'tool_ellipse',
            65: 'tool_picker',
            83: 'tool_fill',
            68: 'tool_fill_rect',
            70: 'tool_fill_ellipse'
        };
        
        if (typeof(mapping[e.which]) !== 'undefined')
        {
            if (!(e.shiftKey || e.ctrlKey || e.altKey))
            {
                $('#' + mapping[e.which]).mousedown();
                e.preventDefault();
            }
        }
        
        if (e.which == 37)
        {
            if (e.shiftKey)
                rotate_sprite(false);
            else if (e.ctrlKey)
                flip_sprite(true, false);
            else
                move_sprite(-1, 0);
            e.preventDefault();
        }
        if (e.which == 39)
        {
            if (e.shiftKey)
                rotate_sprite(true);
            else if (e.ctrlKey)
                flip_sprite(true, false);
            else
                move_sprite(1, 0);
            e.preventDefault();
        }
        if (e.which == 38)
        {
            if (e.ctrlKey)
                flip_sprite(false, true);
            else
                move_sprite(0, -1);
            e.preventDefault();
        }            
        if (e.which == 40)
        {
            if (e.ctrlKey)
                flip_sprite(false, true);
            else
                move_sprite(0, 1);
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
        finishDrawing(true);
    });
    
    generatorHash['line'] = linePattern;
    generatorHash['rect'] = rectPattern;
    generatorHash['fill_rect'] = fillRectPattern;
    generatorHash['ellipse'] = ellipsePattern;
    generatorHash['fill_ellipse'] = fillEllipsePattern;
    
    $(window).mouseup(function(event) {
        finishDrawing(false);
    });
    
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
        var x = i % 4;
        var y = Math.floor(i / 4);
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
            currentColor = listColor;
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
        swatch.mousedown(function(event) {
            var e = event.target || event.srcElement;
            $('.swatch').removeClass('active');
            currentColor = $(e).data('list_color');
            $(e).addClass('active');
        });
        if (i % 4 == 3 && i < cling_colors.length - 1)
            $('#palette').append($('<br />'));
    }
    fix_sizes();
});

function download()
{
    // http://eligrey.com/blog/post/saving-generated-files-on-the-client-side
    // http://stackoverflow.com/a/10667687
//     var s = '';
//     for (var y = 0; y < imageHeight; y++)
//     {
//         for (var x = 0; x < imageWidth; x++)
//         {
//             var color = imageData[y][x];
//             s += String.fromCharCode(color[0], color[1], color[2], color[3]);
//         }
//     }
//     png_data = generatePng(imageWidth, imageHeight, s);
//     var pom = $('<a>');
//     pom.attr('href', 'data:image/png;base64,' + Base64.encode(png_data));
//     pom.attr('download', 'picture.png');
//     pom[0].click();
    var canvas = $('#big_pixels')[0];
    var link = document.createElement('a');
    link.download = 'image.png';
    link.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    link.click();
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
    $('#sprite_0').attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
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
    updatePixels();
    update_sprite(false);
}

function fix_sizes()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var bigPixelSize = height - 120;
    if (bigPixelSize + 650 > width)
        bigPixelSize = width - 650;
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
        currentColor = imageData[ry][rx];
        currentTool = lastTool;
        $('.tool').removeClass('active');
        $('#tool_' + currentTool).addClass('active');
        $('.swatch').removeClass('active');
        $('.swatch').each(function(_, e) {
            if ($(e).data('list_color').join(',') == currentColor.join(','))
                $(e).addClass('active');
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
    else // include 'move'
    {
        drawingOperationPending = true;
        lineStart = null;
        handleDrawing(x, y);
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
        $('#sprite_0').attr('src', 'data:image/png;base64,' + Base64.encode(png_data));
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
                for (var y = 0; y < imageHeight; y++)
                {
                    for (var x = 0; x < imageWidth; x++)
                    {
                        if (selectionMask[y][x] == 1)
                            setPixel(x, y, currentColor);
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
}
