var currentColor = '';
var currentTool = 'draw';
var penWidth = 1;
var imageWidth = 24;
var imageHeight = 24;
var MAX_UNDO_STACK = 42;
var lineStart = null;
var drawingOperationPending = false;

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
}

// color must be 4 byte RGBA
function setPixel(px, py, color)
{
    if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight)
        return;
    imageData[py][px] = color;
    var htmlColor = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (color[3] / 255.0) + ')';
    $('#pixel_' + px + '_' + py).css('background-color', htmlColor);
    $('.small_pixels_' + px + '_' + py).css('background-color', htmlColor);
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

$().ready(function() {

    for (var y = 0; y < imageHeight; y++)
    {
        var line = [];
        for (var x = 0; x < imageWidth; x++)
            line.push([0, 0, 0, 0]);
        imageData.push(line);
    }
    
    for (var i = 0; i < 64; i++)
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
    
    for (var i = 1; i <= 4; i++)
    {
        $('#pen_width_' + i).mousedown(function(event) {
            penWidth = Number($(event.target).attr('id').replace('pen_width_', ''));
            $('.penwidth').removeClass('active');
            $(event.target).addClass('active');
        });
    }
    $('#pen_width_' + penWidth).addClass('active');

    jQuery.each(['draw', 'fill'], function(_, x) {
        $('#tool_' + x).mousedown(function(event) {
            currentTool = $(event.target).attr('id').replace('tool_', '');
            $('.tool').removeClass('active');
            $(event.target).addClass('active');
        });
    });
    $('#tool_' + currentTool).addClass('active');

    document.onselectstart = function()
    {
        window.getSelection().removeAllRanges();
    };
    
    document.oncontextmenu = function()
    {
        return false;
    };
    
    window.onresize = fix_sizes;
    
    window.onbeforeunload = function()
    {
//         return "Wirklich?";
    };
    
    for (y = 0; y < imageHeight; y++)
    {
        var row = $('<tr>');
        var arrayRow = [];
        for (var x = 0; x < imageWidth; x++)
        {
            var cell = $('<td>');
            cell.addClass('big_pixel');
            cell.data('x', x);
            cell.data('y', y);
            cell.attr('id', 'pixel_' + x + '_' + y);
            cell.mouseenter(function(event) {
                var e = event.target || event.srcElement;
                var x = $(e).data('x');
                var y = $(e).data('y');
                $('.big_pixel').removeClass('hover');
                jQuery.each(penPattern(penWidth), function(_, delta) {
                    var dx = x + delta[0];
                    var dy = y + delta[1];
                    if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                        $(bigPixelGrid[dy][dx]).addClass('hover');
                });
                if (event.which == 1)
                {
                    if (currentTool == 'draw')
                    {
                        if (lineStart == null)
                        {
                            jQuery.each(penPattern(penWidth), function(_, delta) {
                                var dx = x + delta[0];
                                var dy = y + delta[1];
                                if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                                    setPixel(dx, dy, currentColor);
                            });
                            lineStart = [$(e).data('x'), $(e).data('y')];
                        }
                        else
                        {
                            drawLine(lineStart[0], lineStart[1], $(e).data('x'), $(e).data('y'), currentColor, penWidth);
                            lineStart = [$(e).data('x'), $(e).data('y')];
                        }
                    }
                }
            });
            cell.mouseleave(function(event) {
                $('.big_pixel').removeClass('hover');
            });
            cell.mousedown(function(event) {
                var e = event.target || event.srcElement;
                var x = $(e).data('x');
                var y = $(e).data('y');
                drawingOperationPending = true;
                if (currentTool == 'draw')
                {
                    lineStart = [$(e).data('x'), $(e).data('y')];
                    jQuery.each(penPattern(penWidth), function(_, delta) {
                        var dx = x + delta[0];
                        var dy = y + delta[1];
                        if (dx >= 0 && dy >= 0 && dx < imageWidth && dy < imageHeight)
                            setPixel(dx, dy, currentColor);
                    });
                }
                else if (currentTool == 'fill')
                {
                    floodFill($(e).data('x'), $(e).data('y'), currentColor);
                }
            });
            row.append(cell);
            arrayRow.push(cell);
        }
        bigPixelGrid.push(arrayRow);
        $('#big_pixels').append(row);
        
        var row = $('<tr>');
        for (var x = 0; x < imageWidth; x++)
        {
            var cell = $('<td>');
            cell.data('x', x);
            cell.data('y', y);
            cell.addClass('small_pixels_' + x + '_' + y);
            row.append(cell);
        }
        $('.small_pixels_2').append(row);
        
        var row = $('<tr>');
        for (var x = 0; x < imageWidth; x++)
        {
            var cell = $('<td>');
            cell.data('x', x);
            cell.data('y', y);
            cell.addClass('small_pixels_' + x + '_' + y);
            row.append(cell);
        }
        $('.small_pixels_1').append(row);
    }
    $(window).mouseup(function(event) {
        if (drawingOperationPending)
        {
            lineStart = null;
            update_sprite(true);
            drawingOperationPending = false;
        }
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
        var k = x * 11 + y;
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
    var s = '';
    for (var y = 0; y < imageHeight; y++)
    {
        for (var x = 0; x < imageWidth; x++)
        {
            var color = parseCSSColor($('#pixel_' + x + '_' + y).css('background-color'));
            color[3] = color[3] * 255;
            s += String.fromCharCode(color[0], color[1], color[2], color[3]);
        }
    }
    png_data = generatePng(imageWidth, imageHeight, s);
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:image/png;base64,' + Base64.encode(png_data));
    pom.setAttribute('download', 'picture.png');
    pom.click();
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
            var htmlColor = $('#pixel_' + x + '_' + y).css('background-color');
            var color = parseCSSColor(htmlColor);
            color[3] = color[3] * 255;
            s += String.fromCharCode(color[0], color[1], color[2], color[3]);
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
        img.click(function(event) {
            restore_image(event.target);
        });
        $('#undo_stack').append(img);
        var undo_stack = $('#undo_stack').find('img');
        if (undo_stack.length > MAX_UNDO_STACK)
            $(undo_stack[0]).remove();
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
        {
            for (var i = 0; i < 4; i++)
                imageData[y][x][i] = data[(y * imageWidth + x) * 4 + i];
            setPixel(x, y, imageData[y][x]);
        }
    }
    update_sprite(false);
}

function fix_sizes()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var bigPixelSize = height - 120;
    if (bigPixelSize + 600 > width)
        bigPixelSize = width - 600;
    if (bigPixelSize > 600)
        bigPixelSize = 600;
    if (bigPixelSize < 200)
        bigPixelSize = 200;
    console.log("Setting new size: ", bigPixelSize);
    $('#container_big_pixels').css('width', bigPixelSize);
    $('#container_big_pixels').css('height', bigPixelSize);
};
