// fields: 28x16

var vars = {};

var CAN_STAND_ON = 1;
var CAN_CLIMB = 2;

function _get_field(x, y)
{
    var clevel = vars.levels[vars.current_level];
    if (clevel.use !== true)
        return -1;
    var ly = y - clevel.ymin;
    if (ly < 0 || ly >= clevel.data.length)
        return -1;
    var lx = x - clevel.xmin;
    if (lx < 0 || lx >= clevel.data[ly].length)
        return -1;
    return clevel.data[ly][lx];
}

function _set_field(x, y, v)
{
    var clevel = vars.levels[vars.current_level];
    if (clevel.use !== true)
        return;
    var ly = y - clevel.ymin;
    if (ly < 0 || ly >= clevel.data.length)
        return;
    var lx = x - clevel.xmin;
    if (lx < 0 || lx >= clevel.data[ly].length)
        return;
    clevel.data[ly][lx] = v;
}

function _fix_sizes()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var canvas = $('#canvas');
    if (width * vars.game_height < height * vars.game_width)
    {
        height = width * vars.game_height / vars.game_width;
        canvas.css('left', 0);
        canvas.css('top', (window.innerHeight - height) / 2);
        $('.ontop').css('left', 0);
        $('.ontop').css('top', (window.innerHeight - height) / 2);
    }
    else
    {
        width = height * vars.game_width / vars.game_height;
        canvas.css('left', (window.innerWidth - width) / 2);
        canvas.css('top', 0);
        $('.ontop').css('left', (window.innerWidth - width) / 2);
        $('.ontop').css('top', 0);
    }
    canvas.css('width', width);
    canvas.css('height', height);
    $('.ontop').css('font-size', '' + height / 40.0 + 'px');
}

function applies(which, key)
{
    if (which < 0 || which >= vars.sprite_properties.length)
        return false;
    return (key in vars.sprite_properties[which]);
}

function def(trait, elements)
{
}

function loop(time)
{
    clear('#000');
    var dx = 0;
    var dy = 0;
//     dy = 100;
    for (var y = 0; y < 16; y++)
    {
        for (var x = 0;  x < 28; x++)
        {
            var v = _get_field(x + Math.floor(dx / 24), y + Math.floor(dy / 24));
            var poskey = '' + (x + Math.floor(dx / 24)) + '/' + (y + Math.floor(dy / 24));
//             var drawn_something = false;
//             for (var i = 0; i < vars.max_keys; i++)
//             {
//                 if (applies(v, 'door_' + (i + 1)))
//                 {
//                     draw_sprite_part_y(x * 24 - (dx % 24), y * 24 - (dy % 24), v, 'sprites_default', vars.door_open[i], 24 - vars.door_open[i], 0);
//                     drawn_something = true;
//                 }
//             }
//             if (!drawn_something)
//                 draw_sprite(x * 24 - (dx % 24), y * 24 - (dy % 24), v);
            if (poskey in vars.field_offset)
            {
                draw_sprite_special(x * 24 - (dx % 24) + vars.field_offset[poskey].dx,
                                    y * 24 - (dy % 24) + vars.field_offset[poskey].dy,
                                    v, 'sprites_default',
                                    vars.field_offset[poskey].alpha,
                                    vars.field_offset[poskey].osx, vars.field_offset[poskey].osy,
                                    vars.field_offset[poskey].w, vars.field_offset[poskey].h,
                                    vars.field_offset[poskey].odx, vars.field_offset[poskey].ody);
            }
            else
                draw_sprite(x * 24 - (dx % 24), y * 24 - (dy % 24), v);

        }
    }
    var player_shift_x = 0;
    var player_shift_y = 0;
    if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_left') ||
        applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_right'))
        player_shift_y = 12;
    draw_sprite(vars.player_x * 24 + player_shift_x - dx, vars.player_y * 24 + player_shift_y - dy, vars.player_sprite);
}

function move_player(move_x, move_y)
{
    if (move_y == 0 && move_x < 0)
    {
        // left
        if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'stairs_up_left'))
            move_y -= 1;
        if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_right'))
            move_y += 1;
    }
    else if (move_y == 0 && move_x > 0)
    {
        // right
        if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'stairs_up_right'))
            move_y -= 1;
        if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_left'))
            move_y += 1;
    }


    var move_ok = false;
    if (move_x != 0 || move_y != 0)
    {
        if (!applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'is_solid'))
            move_ok = true;
        // check if doors are open
        for (var i = 0; i < vars.max_keys; i++)
        {
            if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'door_' + (i + 1)) && vars.door_open[i])
                move_ok = true;
        }
    }

    if (move_ok)
    {
        vars.player_x += move_x;
        vars.player_y += move_y;
        if (move_x < 0)
            vars.player_sprite = vars.player_sprite_left;
        else if (move_x > 0)
            vars.player_sprite = vars.player_sprite_right;
        else {
            if (applies(_get_field(vars.player_x, vars.player_y), 'can_climb'))
                vars.player_sprite = vars.player_sprite_back;
            else if (applies(_get_field(vars.player_x, vars.player_y + 1), 'can_climb'))
                vars.player_sprite = vars.player_sprite_front;
        }

        // see if we found a key
        for (var i = 0; i < vars.max_keys; i++)
        {
            if (applies(_get_field(vars.player_x, vars.player_y), 'key_' + (i + 1)))
            {
                vars.got_key[i] = true;
                var anim_key = '' + (vars.player_x) + '/' + vars.player_y;
                if (!(anim_key in vars.animations))
                {
                    vars.animations[anim_key] = {type: 'pick_up', done: function(x, y) {
                        _set_field(x, y, -1);
                    }};
                }
            }
        }

        // see if we can open a door
        for (var i = 0; i < vars.max_keys; i++)
        {
            if (vars.got_key[i] && !vars.door_open[i])
            {
                for (var dx = -1; dx <= 1; dx += 2)
                {
                    if (applies(_get_field(vars.player_x + dx, vars.player_y), 'door_' + (i + 1)))
                    {
                        var anim_key = '' + (vars.player_x + dx) + '/' + vars.player_y;
                        if (!(anim_key in vars.animations))
                        {
                            vars.animations[anim_key] = {type: 'slide_door_up', door: i};
                        }
                    }
                }
            }
        }
    }
}

function game_logic_loop()
{
//     animation_phase++;
    if (applies(_get_field(vars.player_x, vars.player_y + 1), 'slide_down_left'))
        move_player(-1, 1);
    else if (applies(_get_field(vars.player_x, vars.player_y + 1), 'slide_down_right'))
        move_player(1, 1);
    else if (!applies(_get_field(vars.player_x, vars.player_y + 1), 'can_stand_on') &&
        !(applies(_get_field(vars.player_x, vars.player_y), 'can_climb')) &&
        !(applies(_get_field(vars.player_x, vars.player_y + 1), 'can_climb')))
        move_player(0, 1);

    // handle animations
    var remove_animations = [];
    jQuery.each(Object.keys(vars.animations), function(_, key) {
        var info = vars.animations[key];
        if (info.type == 'slide_door_up')
        {
            if (!(key in vars.field_offset))
                vars.field_offset[key] = {dx: 0, dy: 0, alpha: 1.0, osx: 0, osy: 0, w: 24, h: 24, odx: 0, ody: 0};
            vars.field_offset[key].osy += 2;
            vars.field_offset[key].h -= 2;
            if (vars.field_offset[key].osy > 14)
            {
                vars.door_open[info.door] = true;
            }
            if (vars.field_offset[key].osy > 18)
            {
                if (typeof(info.done) === 'function')
                {
                    var xy = key.split('/');
                    info.done(new Number(xy[0]).valueOf(), new Number(xy[1]).valueOf());
                }
                remove_animations.push(key);
            }
        }
        if (info.type == 'pick_up')
        {
            if (!(key in vars.field_offset))
                vars.field_offset[key] = {dx: 0, dy: 0, alpha: 1.0, osx: 0, osy: 0, w: 24, h: 24, odx: 0, ody: 0};
            vars.field_offset[key].dy -= 4;
            vars.field_offset[key].alpha -= 0.15;
            if (vars.field_offset[key].dy < -24)
            {
                if (typeof(info.done) === 'function')
                {
                    var xy = key.split('/');
                    info.done(new Number(xy[0]).valueOf(), new Number(xy[1]).valueOf());
                }
                remove_animations.push(key);
            }
        }
    });
    jQuery.each(remove_animations, function(_, which) {
        delete vars.animations[which];
    });
}

function stopTheGame()
{
    vars.stopGame = true;
    $('body').removeAttr('style');
    $('#play_container').empty();
    $('#play_container').remove();
    switchPane('sprites');
}

function keydown(code)
{
    if (code == 27)
    {
        stopTheGame();
    }
    if (code == 39)
    {
        move_player(1, 0);
    }
    if (code == 37)
    {
        move_player(-1, 0);
    }
    if (code == 38)
    {
        if (applies(_get_field(vars.player_x, vars.player_y), 'can_climb'))
            move_player(0, -1);
    }
    if (code == 40)
    {
        if (applies(_get_field(vars.player_x, vars.player_y), 'can_climb') ||
            applies(_get_field(vars.player_x, vars.player_y + 1), 'can_climb'))
            move_player(0, 1);
    }
}

function init() {
//     init();
//     defs();

    vars.canvas = document.getElementById("canvas");
    vars.imageContext = vars.canvas.getContext("2d");
    vars.imageContext.mozImageSmoothingEnabled = false;
    vars.imageContext.webkitImageSmoothingEnabled = false;
    vars.imageContext.msImageSmoothingEnabled = false;
    vars.imageContext.imageSmoothingEnabled = false;

    window.onresize = _fix_sizes;
    _fix_sizes();

    function _loop(time)
    {
        if (vars.stopGame)
            return;
        loop(time / 1000.0);
        requestAnimationFrame(_loop);
    }

    function _game_logic_loop()
    {
        if (vars.stopGame)
            return;
        vars.game_logic_loop_counter++;
        jQuery.each(vars.pressed_keys, function(keyCode, info) {
            if (vars.game_logic_loop_counter > info.key_delay_passed)
                keydown(keyCode);
        });
        if (typeof(game_logic_loop) !== 'undefined')
            game_logic_loop();
        setTimeout(_game_logic_loop, 66);
    }

    function _keydown(e)
    {
        if (typeof(vars.pressed_keys[e.keyCode]) === 'undefined')
        {
            keydown(e.keyCode);
            vars.pressed_keys[e.keyCode] = {
                key_down: vars.game_logic_loop_counter,
                key_delay_passed: vars.game_logic_loop_counter + 5
            };
        }
    }

    function _keyup(e)
    {
        delete vars.pressed_keys[e.keyCode];
    }

    window.addEventListener("keydown", _keydown, false);
    window.addEventListener("keyup", _keyup, false);
    requestAnimationFrame(_loop);
    setTimeout(_game_logic_loop, 66);
}

function initLevel(which)
{
    var found_player = false;
    jQuery.each(vars.levels[which].data, function(y, row) {
        jQuery.each(row, function(x, cell) {
            if (applies(cell, 'actor_front') || applies(cell, 'actor_back') ||
                applies(cell, 'actor_left') || applies(cell, 'actor_right'))
            {
                vars.player_x = x + vars.levels[which].xmin;
                vars.player_y = y + vars.levels[which].ymin;
                console.log('setting player at', vars.player_x, vars.player_y);
                vars.player_sprite = cell;
                row[x] = -1;
                found_player = true;
            }
            if (found_player)
                return false;
        });
        if (found_player)
            return false;
    });
    // reset all keys
    for (var i = 0; i < vars.max_keys; i++)
    {
        vars.got_key[i] = false;
        vars.door_open[i] = false;
    }
}

function init_game(width, height, supersampling, data)
{
    vars = {
        game_width: null,
        game_height: null,
        game_supersampling: null,
        canvas: null,
        imageContext: null,
        fields: [],
        game_logic_loop_counter: 0,
        pressed_keys: {},
        player_x: 0,
        player_y: 0,
        player_sprite: 0,
        stopGame: false,
        levels: [],
        sprite_properties: [],
        current_level: 0,
        player_sprite_left: 0,
        player_sprite_right: 0,
        player_sprite_front: 0,
        player_sprite_back: 0,
        max_keys: 1,
        got_key: [],
        door_open: [],
        animations: {},
        field_offset: {},
    };
    if (typeof(supersampling) == 'undefined')
        supersampling = 4;
    vars.game_width = width;
    vars.game_height = height;
    vars.game_supersampling = supersampling;
    var container = $('<div>');
    container.attr('id', 'play_container');
    var canvas = $('<canvas>');
    canvas.attr('id', 'canvas');
    canvas.attr('width', width * supersampling);
    canvas.attr('height', height * supersampling);
    canvas.css('position', 'absolute');
    canvas.css('z-index', '1000');
    canvas.css('left', 0);
    canvas.css('top', 0);
    var title = $('<div>');
    title.addClass('ontop');
//     title.html("Pyramide");
    var backdrop = $('<div>');
    backdrop.css('position', 'absolute');
    backdrop.css('background-color', '#000');
    backdrop.css('top', '0px');
    backdrop.css('bottom', '0px');
    backdrop.css('left', '0px');
    backdrop.css('right', '0px');
    backdrop.css('z-index', 999);
    $(container).append(backdrop);
    $(container).append(canvas);
    $(container).append(title);
    backdrop.css('display', 'none');
    canvas.css('display', 'none');
    $('body').append(container);
    var zip = new JSZip(atob(data));
    $.each(zip.files, function (index, zipEntry) {
        console.log(zipEntry);
        if (zipEntry.name == 'sprites.png')
        {
            var blob = new Blob([zipEntry.asUint8Array()], {'type': 'image/png'});
            var urlCreator = window.URL || window.webkitURL;
            var imageUrl = urlCreator.createObjectURL(blob);
            load_sprites(imageUrl);
        }
        else if (zipEntry.name == 'levels.json')
        {
            var info = JSON.parse(zipEntry.asText());
            vars.levels = info.slice();
//             loadLevels(info);
        }
        else if (zipEntry.name == 'sprite_props.json')
        {
            var info = JSON.parse(zipEntry.asText());
            vars.sprite_properties = info;
//             loadLevels(info);
        }
    });
    jQuery.each(vars.sprite_properties, function(_, props) {
        if ('actor_left' in props)
            vars.player_sprite_left = _;
        if ('actor_right' in props)
            vars.player_sprite_right = _;
        if ('actor_front' in props)
            vars.player_sprite_front = _;
        if ('actor_back' in props)
            vars.player_sprite_back = _;
    });
    backdrop.fadeIn(function() {
        $('body').css('padding', '0');
        $('body').css('margin', '0');
        $('body').css('overflow', 'hidden');
        canvas.fadeIn();
        switchPane('play', true);
        init();
        initLevel(0);
    });
}

function load_sprites(path, id)
{
    if (typeof(id) === 'undefined')
        id = 'sprites_default';
    var img = $('<img>').attr('id', id).attr('src', path).css('display', 'none');
    $('#play_container').append(img);
}

function load_game(url)
{
    $.get(url, function(data) {
        console.log(data);
    });
}

function fill_rect(x0, y0, x1, y1, color)
{
    vars.imageContext.fillStyle = color;
    vars.imageContext.strokeStyle = "none";
    vars.imageContext.fillRect(x0 + 0.5, y0 + 0.5, x1 - x0 + 1, y1 - y0 + 1);
}

function clear(color)
{
    fill_rect(0, 0, vars.game_width * vars.game_supersampling, vars.game_height * vars.game_supersampling, color);
}

function fill_rect_semi(x0, y0, x1, y1)
{
    vars.imageContext.fillStyle = 'rgba(0, 0, 0, 0.4)'
    vars.imageContext.strokeStyle = "none";
    vars.imageContext.fillRect(x0 + 0.5, y0 + 0.5, x1 - x0 + 1, y1 - y0 + 1);
}

function draw_rect(x0, y0, x1, y1, color)
{
    vars.imageContext.strokeStyle = window.defaultHtml[color % 16];
    vars.imageContext.fillStyle = "none";
    vars.imageContext.strokeWidth = 1.0;
    vars.imageContext.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 + 1, y1 - y0 + 1);
}

function draw_sprite(x, y, which, id)
{
    if (typeof(id) === 'undefined')
        id = 'sprites_default';
    if (which < 0)
        return;
    x = Math.round(x);
    y = Math.round(y);
    var px = Math.floor(which % 8);
    var py = Math.floor(which / 8);
    vars.imageContext.drawImage(document.getElementById(id), px * 24, py * 24, 24, 24,
                                x * vars.game_supersampling, y * vars.game_supersampling,
                                24 * vars.game_supersampling, 24 * vars.game_supersampling);
}

function draw_sprite_special(x, y, which, id, alpha, osx, osy, w, h, odx, ody)
{
    if (typeof(id) === 'undefined')
        id = 'sprites_default';
    if (which < 0)
        return;
    if (alpha != 1.0)
    {
        vars.imageContext.save();
        vars.imageContext.globalAlpha = alpha;
    }
    x = Math.round(x);
    y = Math.round(y);
    var px = Math.floor(which % 8);
    var py = Math.floor(which / 8);
    vars.imageContext.drawImage(document.getElementById(id), px * 24 + osx, py * 24 + osy, w, h,
                                (x + odx) * vars.game_supersampling, (y + ody) * vars.game_supersampling,
                                w * vars.game_supersampling, h * vars.game_supersampling);
    if (alpha != 1.0)
    {
        vars.imageContext.restore();
    }
}

function draw_sprite_part_y(x, y, which, id, sy, h, dy)
{
    if (typeof(id) === 'undefined')
        id = 'sprites_default';
    if (which < 0)
        return;
    x = Math.round(x);
    y = Math.round(y);
    var px = Math.floor(which % 8);
    var py = Math.floor(which / 8);
    vars.imageContext.drawImage(document.getElementById(id), px * 24, py * 24 + sy, 24, h,
                                x * vars.game_supersampling, (y + dy) * vars.game_supersampling,
                                24 * vars.game_supersampling, h * vars.game_supersampling);
}

function draw_part(which, x, y, sx, sy, sw, sh, alpha)
{
    vars.imageContext.save();
    vars.imageContext.globalAlpha = alpha;
    x = Math.round(x);
    y = Math.round(y);
    vars.imageContext.drawImage(document.getElementById(which), sx, sy, sw, sh,
                                x * vars.game_supersampling, y * vars.game_supersampling,
                                sw * vars.game_supersampling, sh * vars.game_supersampling);
    vars.imageContext.restore();
}

function draw_image(which, x, y)
{
    x = Math.round(x);
    y = Math.round(y);
    var img = $('#' + which);
    vars.imageContext.drawImage(document.getElementById(which), 0, 0, img.width(), img.height(),
                                  x * vars.game_supersampling, y * vars.game_supersampling,
                                  img.width() * vars.game_supersampling, img.height() * vars.game_supersampling);
}
