// fields: 28x16

function mod(m, n) {
    return ((m % n) + n) % n;
}

var vars = {};

function mark_dirty(x, y)
{
    var ydirty = y - Math.floor(vars.vy / 24);
    var xdirty = x - Math.floor(vars.vx / 24);
    if (xdirty >= 0 && xdirty < 28 && ydirty >= 0 && ydirty < 16)
        vars.display_sprite[ydirty][xdirty] = -2;
//     draw_rect(xdirty * 24, ydirty * 24, xdirty * 24 + 23, ydirty * 24 + 23, '#fff');
}

function _get_field(x, y)
{
    var clevel = vars.current_level_copy;
    if (clevel.use !== true)
        return -1;
    if (y < 0 || y >= clevel.height)
        return -1;
    if (x < 0 || x >= clevel.width)
        return -1;
    return clevel.data[y][x];
}

function _set_field(x, y, v)
{
    var clevel = vars.current_level_copy;
    if (clevel.use !== true)
        return;
    if (y < 0 || y >= clevel.height)
        return;
    if (x < 0 || x >= clevel.width)
        return;
    clevel.data[y][x] = v;
}

function _get_reachable(x, y)
{
    var clevel = vars.current_level_copy;
    if (y < 0 || y >= clevel.height)
        return 0;
    if (x < 0 || x >= clevel.width)
        return 0;
    return vars.reachable_blocks[y][x];
}

function _set_reachable(x, y, v)
{
    var clevel = vars.current_level_copy;
    if (y < 0 || y >= clevel.height)
        return;
    if (x < 0 || x >= clevel.width)
        return;
    if (vars.reachable_xmin == null)
        vars.reachable_xmin = x;
    if (vars.reachable_xmax == null)
        vars.reachable_xmax = x;
    if (vars.reachable_ymin == null)
        vars.reachable_ymin = y;
    if (vars.reachable_ymax == null)
        vars.reachable_ymax = y;
    if (x < vars.reachable_xmin)
        vars.reachable_xmin = x;
    if (x > vars.reachable_xmax)
        vars.reachable_xmax = x;
    if (y < vars.reachable_ymin)
        vars.reachable_ymin = y;
    if (y > vars.reachable_ymax)
        vars.reachable_ymax = y;
    vars.reachable_blocks[y][x] = v;
}

function _fix_sizes()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var canvas = $('#canvas');
    if (width * vars.game_height < height * vars.game_width)
        vars.sprite_size = Math.floor(width / 28.0);
    else
        vars.sprite_size = Math.floor(height / 16.0);
    vars.offset_x = Math.floor((width - (vars.sprite_size * 28)) / 2);
    vars.offset_y = Math.floor((height - (vars.sprite_size * 16)) / 2) + vars.sprite_size;
    vars.sliders[0].css('right', '' + (width - vars.offset_x) + 'px');
    vars.sliders[1].css('left', '' + (width - vars.offset_x) + 'px');
    vars.sliders[2].css('bottom', '' + (height - vars.offset_y) + 'px');
    vars.sliders[3].css('top', '' + (height - vars.offset_y + vars.sprite_size) + 'px');
    vars.sprite_container.css('left', vars.offset_x + 'px');
    vars.sprite_container.css('top', vars.offset_y + 'px');
//         height = width * vars.game_height / vars.game_width;
//         canvas.css('left', 0);
//         canvas.css('top', (window.innerHeight - height) / 2);
//         $('.ontop').css('left', 0);
//         $('.ontop').css('top', (window.innerHeight - height) / 2);
//     }
//     else
//     {
//         width = height * vars.game_width / vars.game_height;
//         canvas.css('left', (window.innerWidth - width) / 2);
//         canvas.css('top', 0);
//         $('.ontop').css('left', (window.innerWidth - width) / 2);
//         $('.ontop').css('top', 0);
//     }
//     canvas.css('width', width);
//     canvas.css('height', height);
//     $('.ontop').css('font-size', '' + height / 40.0 + 'px');

    $('.sd').css('width', '' + vars.sprite_size + 'px');
    $('.sd').css('height', '' + vars.sprite_size + 'px');
    $('.sd').css('background-size', '' + (vars.sprite_size * 8) + 'px');
    $('.pixelfont').css('font-size', '' + (vars.sprite_size * 0.6) + 'px');
    $('.game_title').css('font-size', '' + (vars.sprite_size * 1.8) + 'px');
    $('.game_subtitle').css('font-size', '' + (vars.sprite_size * 0.6) + 'px');
    $('.pixelfont').css('line-height', '' + vars.sprite_size + 'px');
    $('#title_left').css('left', vars.offset_x + 'px');
    $('#title_left').css('top', (vars.offset_y - vars.sprite_size) + 'px');
    $('#title_right').css('right', vars.offset_x + 'px');
    $('#title_right').css('top', (vars.offset_y - vars.sprite_size) + 'px');
    for (var y = 0; y < 16; y++)
    {
        for (var x = 0; x < 29; x++)
        {
            var tile = vars.sprite_div[y][x];
            tile.css('left', (x * vars.sprite_size) + 'px');
            tile.css('top', (y * vars.sprite_size) + 'px');
        }
    }
    if (typeof(vars.display_sprite) !== 'undefined' && vars.display_sprite.length > 0)
    {
        for (var y = 0; y < 16; y++)
            for (var x = 0; x < 29; x++)
                vars.display_sprite[y][x] = -2;
    }
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

function render()
{
    var now = Date.now();
//     console.log("render loop: " + (now - vars.latest_render_update));
    vars.latest_render_update = now;

    var dx = vars.vx;
    var dy = vars.vy;

    var pix = Math.floor(vars.player_x / 24);
    var piy = Math.floor(vars.player_y / 24);
    var player_shift_x = 0;
    var player_shift_y = 0;

    if (mod(vars.player_y, 24) < 23 && applies(_get_field(pix, piy - 1), 'is_solid'))
        player_shift_y = 18 - mod(vars.player_y, 24);
    if (mod(vars.player_x, 24) < 8 && applies(_get_field(pix - 1, piy), 'is_solid') && !field_has_silhouette(pix-1, piy))
        player_shift_x = 8 - mod(vars.player_x, 24);
    if (mod(vars.player_x, 24) > 15 && applies(_get_field(pix + 1, piy), 'is_solid') && !field_has_silhouette(pix + 1, piy))
        player_shift_x = - 8 + (23 - mod(vars.player_x, 24));

    $('.sprite').css('background-position', '-' + vars.sprite_size + 'px -' + 0 + 'px');
    var need_to_move_sprite_divs =
        (vars.current_sprite_offset_x != mod(dx, 24)) ||
        (vars.current_sprite_offset_y != mod(dy, 24));
    vars.current_sprite_offset_x = mod(dx, 24);
    vars.current_sprite_offset_y = mod(dy, 24);
    var randomize_count = 1;
    for (var y = 0; y < 16; y++)
    {
        for (var x = 0; x < 29; x++)
        {
            randomize_count += x + y;
            var tile = vars.sprite_div[y][x];
            if (need_to_move_sprite_divs)
            {
                tile.css('left', Math.floor((x * 24 - mod(dx, 24)) * vars.sprite_size / 24) + 'px');
                tile.css('top', Math.floor((y * 24 - mod(dy, 24)) * vars.sprite_size / 24) + 'px');
            }
            var v = _get_field(x + Math.floor(dx / 24), y + Math.floor(dy / 24));
            jQuery.each(vars.sprite_animations, function(_, info) {
                if (v == info.start)
                {
                    var delta = vars.animation_phase;
                    if (info.shuffle)
                        delta += x * 17 + y * 13 + randomize_count;
                    var shift = Math.floor(delta / info.speed) % (info.count + info.wait);
                    if (shift >= info.count)
                        shift = 0;
                    v += shift;
                }
            });

            var poskey = '' + (x + Math.floor(dx / 24)) + '/' + (y + Math.floor(dy / 24));
            if (poskey in vars.field_offset)
            {
                vars.display_sprite[y][x] = v;
                tile.css('display', (v == -1) ? 'none' : 'block');
                var sprite_x = v % 8;
                var sprite_y = Math.floor(v / 8);
                tile.css('background-position', '-' + Math.floor(sprite_x * vars.sprite_size + vars.field_offset[poskey].osx * vars.sprite_size / 24) + 'px -' + Math.floor(sprite_y * vars.sprite_size + vars.field_offset[poskey].osy * vars.sprite_size / 24) + 'px');
                tile.css('left', Math.floor((x * 24 - mod(dx, 24) + vars.field_offset[poskey].dx) * vars.sprite_size / 24) + 'px');
                tile.css('top', Math.floor((y * 24 - mod(dy, 24) + vars.field_offset[poskey].dy) * vars.sprite_size / 24) + 'px');
                tile.css('width', Math.floor(vars.field_offset[poskey].w * vars.sprite_size / 24) + 'px');
                tile.css('height', Math.floor(vars.field_offset[poskey].h * vars.sprite_size / 24) + 'px');
                tile.css('opacity', vars.field_offset[poskey].alpha);
//                 fill_rect(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), x * 24 - (mod(dx, 24)) + 23, y * 24 - (mod(dy, 24)) + 23, '#000');
//                 draw_sprite_special(x * 24 - (mod(dx, 24)) + vars.field_offset[poskey].dx,
//                                     y * 24 - (mod(dy, 24)) + vars.field_offset[poskey].dy,
//                                     v, 'sprites_default', vars.field_offset[poskey].alpha,
//                                     vars.field_offset[poskey].osx, vars.field_offset[poskey].osy,
//                                     vars.field_offset[poskey].w, vars.field_offset[poskey].h,
//                                     vars.field_offset[poskey].odx, vars.field_offset[poskey].ody);
            }
            else if (applies(v, 'appears'))
            {
                if (vars.block_visible[poskey])
                {
                    tile.css('width', vars.sprite_size + 'px');
                    tile.css('height', vars.sprite_size + 'px');
                    tile.css('opacity', 1.0);
                    if (vars.display_sprite[y][x] != v)
                    {
                        vars.display_sprite[y][x] = v;
                        tile.css('display', (v == -1) ? 'none' : 'block');
                        var sprite_x = v % 8;
                        var sprite_y = Math.floor(v / 8);
                        var value = '-' + (sprite_x * vars.sprite_size) + 'px -' + (sprite_y * vars.sprite_size) + 'px';
                        tile.css('background-position', value);
                    }
                }
                else
                {
                    if (vars.display_sprite[y][x] != v)
                    {
                        vars.display_sprite[y][x] = v;
                        tile.css('opacity', 0.0);
                    }
                }
            }
            else
            {
                tile.css('width', vars.sprite_size + 'px');
                tile.css('height', vars.sprite_size + 'px');
                tile.css('opacity', 1.0);
                if (vars.display_sprite[y][x] != v)
                {
                    vars.display_sprite[y][x] = v;
                    tile.css('display', (v == -1) ? 'none' : 'block');
                    var sprite_x = v % 8;
                    var sprite_y = Math.floor(v / 8);
                    var value = '-' + (sprite_x * vars.sprite_size) + 'px -' + (sprite_y * vars.sprite_size) + 'px';
                    tile.css('background-position', value);
                }
            }
        }
    }

    var use_sprite = vars.player_sprite;
    if (vars.jumping)
    {
        if (use_sprite == vars.player_sprite_left && vars.player_sprite_jump_left >= 0)
            use_sprite = vars.player_sprite_jump_left;
        else if (use_sprite == vars.player_sprite_right && vars.player_sprite_jump_right >= 0)
            use_sprite = vars.player_sprite_jump_right;
    }
    else if (vars.player_walk_phase > 3)
    {
        if (use_sprite == vars.player_sprite_left && vars.player_sprite_walk_left >= 0)
            use_sprite = vars.player_sprite_walk_left;
        else if (use_sprite == vars.player_sprite_right && vars.player_sprite_walk_right >= 0)
            use_sprite = vars.player_sprite_walk_right;
    }
    if (vars.found_trap !== null)
        use_sprite = vars.trap_actor_sprite[vars.found_trap];
    var tile = vars.player_sprite_div;
    var v = use_sprite;
    var sprite_x = v % 8;
    var sprite_y = Math.floor(v / 8);
    var value = '-' + (sprite_x * vars.sprite_size) + 'px -' + (sprite_y * vars.sprite_size) + 'px';
    tile.css('background-position', value);
    tile.css('left', '' + Math.floor((vars.player_x + player_shift_x - dx - 12) * vars.sprite_size / 24/* + vars.offset_x*/) + 'px');
    tile.css('top', '' + Math.floor((vars.player_y + player_shift_y - dy - 23) * vars.sprite_size / 24/* + vars.offset_y*/) + 'px');
//     draw_sprite(vars.player_x + player_shift_x - dx - 12, vars.player_y + player_shift_y - dy - 23, use_sprite);

    $('#title_left').html("Level: " + (vars.current_level + 1) + "   Punkte: " + vars.level_points);
    $('#title_right').html("Leben: " + vars.lives_left);

    return;

    var dx = vars.vx;
    var dy = vars.vy;

    var pix = Math.floor(vars.player_x / 24);
    var piy = Math.floor(vars.player_y / 24);
    var player_shift_x = 0;
    var player_shift_y = 0;


    if (mod(vars.player_y, 24) < 23 && applies(_get_field(pix, piy - 1), 'is_solid'))
        player_shift_y = 18 - mod(vars.player_y, 24);
    if (mod(vars.player_x, 24) < 8 && applies(_get_field(pix - 1, piy), 'is_solid') && !field_has_silhouette(pix-1, piy))
        player_shift_x = 8 - mod(vars.player_x, 24);
    if (mod(vars.player_x, 24) > 15 && applies(_get_field(pix + 1, piy), 'is_solid') && !field_has_silhouette(pix + 1, piy))
        player_shift_x = - 8 + (23 - mod(vars.player_x, 24));


    for (var y = -1; y <= 1; y++)
        for (var x = -1; x <= 1; x++)
            mark_dirty(pix + x, piy + y);

    if (player_shift_x < 0)
        mark_dirty(vars.player_x - 1, vars.player_y);
    else if (player_shift_x > 0)
        mark_dirty(vars.player_x + 1, vars.player_y);
    if (player_shift_y < 0)
        mark_dirty(vars.player_x, vars.player_y - 1);
    else if (player_shift_y > 0)
        mark_dirty(vars.player_x, vars.player_y + 1);

    for (var y = 0; y < 16; y++)
    {
        for (var x = 0; x < 29; x++)
        {
            var v = _get_field(x + Math.floor(dx / 24), y + Math.floor(dy / 24));
            var poskey = '' + (x + Math.floor(dx / 24)) + '/' + (y + Math.floor(dy / 24));
            if (poskey in vars.field_offset)
            {
                vars.display_sprite[y][x] = v;
                fill_rect(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), x * 24 - (mod(dx, 24)) + 23, y * 24 - (mod(dy, 24)) + 23, '#000');
                draw_sprite_special(x * 24 - (mod(dx, 24)) + vars.field_offset[poskey].dx,
                                    y * 24 - (mod(dy, 24)) + vars.field_offset[poskey].dy,
                                    v, 'sprites_default', vars.field_offset[poskey].alpha,
                                    vars.field_offset[poskey].osx, vars.field_offset[poskey].osy,
                                    vars.field_offset[poskey].w, vars.field_offset[poskey].h,
                                    vars.field_offset[poskey].odx, vars.field_offset[poskey].ody);
            }
            else
            {
                if (applies(v, 'appears'))
                {
                    if (vars.block_visible[poskey])
                    {
                        fill_rect(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), x * 24 - (mod(dx, 24)) + 23, y * 24 - (mod(dy, 24)) + 23, '#000');
                        draw_sprite(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), v);
                    }
                    else
                    {
                        if (vars.display_sprite[y][x] != v)
                        {
                            vars.display_sprite[y][x] = v;
                            fill_rect(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), x * 24 - (mod(dx, 24)) + 23, y * 24 - (mod(dy, 24)) + 23, '#000');
                        }
                    }
                }
                else
                {
                    if (vars.display_sprite[y][x] != v)
                    {
                        vars.display_sprite[y][x] = v;
                        fill_rect(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), x * 24 - (mod(dx, 24)) + 23, y * 24 - (mod(dy, 24)) + 23, '#000');
                        draw_sprite(x * 24 - (mod(dx, 24)), y * 24 - (mod(dy, 24)), v);
//                         draw_rect(x * 24 + 1, y * 24 + 1, x * 24 + 23, y * 24 + 23, '#080');
                    }
                }
            }
//             if (_get_reachable(x + Math.floor(dx / 24), y + Math.floor(dy / 24)) > 0)
//                 fill_rect_semi(x * 24 + 8, y * 24 + 8, x * 24 + 16, y * 24 + 16);
        }
    }
    var use_sprite = vars.player_sprite;
    if (vars.jumping)
    {
        if (use_sprite == vars.player_sprite_left && vars.player_sprite_jump_left >= 0)
            use_sprite = vars.player_sprite_jump_left;
        else if (use_sprite == vars.player_sprite_right && vars.player_sprite_jump_right >= 0)
            use_sprite = vars.player_sprite_jump_right;
    }
    else if (vars.player_walk_phase > 3)
    {
        if (use_sprite == vars.player_sprite_left && vars.player_sprite_walk_left >= 0)
            use_sprite = vars.player_sprite_walk_left;
        else if (use_sprite == vars.player_sprite_right && vars.player_sprite_walk_right >= 0)
            use_sprite = vars.player_sprite_walk_right;
    }
    draw_sprite(vars.player_x + player_shift_x - dx - 12, vars.player_y + player_shift_y - dy - 23, use_sprite);
//     draw_rect(vars.player_x + player_shift_x - dx - 1, vars.player_y + player_shift_y - dy - 1,
//               vars.player_x + player_shift_x - dx + 1, vars.player_y + player_shift_y - dy + 1, '#fff');
}

function move_player(move_x, move_y)
{
    move_player_small(move_x * 24, move_y * 24);
}

function move_player_small(move_x, move_y)
{
    var x = 0;
    var y = 0;
    while (y != move_y)
    {
        var dy = 0;
        if (y < move_y)
            dy = 1;
        else if (y > move_y)
            dy = -1;
        if (!_move_player_small(0, dy))
            break;
        y += dy;
    }
    while (x != move_x)
    {
        var dx = 0;
        if (x < move_x)
            dx = 1;
        else if (x > move_x)
            dx = -1;
        if (!_move_player_small(dx, 0))
            break;
        x += dx;
    }
//     while (x != move_x || y != move_y)
//     {
//         var dx = 0;
//         var dy = 0;
//         if (x < move_x)
//             dx = 1;
//         else if (x > move_x)
//             dx = -1;
//         if (y < move_y)
//             dy = 1;
//         else if (y > move_y)
//             dy = -1;
//         if (!_move_player_small(dx, dy))
//             break;
//         x += dx;
//         y += dy;
//     }
}

function field_has_silhouette(px, py)
{
    return (
        applies(_get_field(px, py), 'slide_down_left') ||
        applies(_get_field(px, py), 'slide_down_left_2_1_left') ||
        applies(_get_field(px, py), 'slide_down_left_2_1_right') ||
        applies(_get_field(px, py), 'slide_down_left_1_2_top') ||
        applies(_get_field(px, py), 'slide_down_left_1_2_bottom') ||
        applies(_get_field(px, py), 'slide_down_right') ||
        applies(_get_field(px, py), 'slide_down_right_2_1_left') ||
        applies(_get_field(px, py), 'slide_down_right_2_1_right') ||
        applies(_get_field(px, py), 'slide_down_right_1_2_top') ||
        applies(_get_field(px, py), 'slide_down_right_1_2_bottom') ||
        applies(_get_field(px, py), 'stairs_up_left') ||
        applies(_get_field(px, py), 'stairs_up_left_2_1_left') ||
        applies(_get_field(px, py), 'stairs_up_left_2_1_right') ||
        applies(_get_field(px, py), 'stairs_up_right') ||
        applies(_get_field(px, py), 'stairs_up_right_2_1_left') ||
        applies(_get_field(px, py), 'stairs_up_right_2_1_right'));
}

function _move_player_small(move_x, move_y)
{
    var pix = Math.floor(vars.player_x / 24);
    var piy = Math.floor(vars.player_y / 24);

    // mark old position dirty
    mark_dirty(pix - 1, piy);
    mark_dirty(pix - 1, piy - 1);
    mark_dirty(pix - 1, piy + 1);
    mark_dirty(pix, piy);
    mark_dirty(pix, piy - 1);
    mark_dirty(pix, piy + 1);
    mark_dirty(pix + 1, piy);
    mark_dirty(pix + 1, piy - 1);
    mark_dirty(pix + 1, piy + 1);

//     if (move_y == 0 && move_x < 0)
//     {
//         // left
//         if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'stairs_up_left'))
//             move_y -= 1;
//         if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'stairs_up_left_2_1_right'))
//             move_y -= 1;
//         if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_right'))
//             move_y += 1;
//         if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_right_2_1_left'))
//             move_y += 1;
//     }
//     else if (move_y == 0 && move_x > 0)
//     {
//         // right
//         if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'stairs_up_right'))
//             move_y -= 1;
//         if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y), 'stairs_up_right_2_1_left'))
//             move_y -= 1;
//         if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_left'))
//             move_y += 1;
//         if (applies(_get_field(vars.player_x, vars.player_y + 1), 'stairs_up_left_2_1_right'))
//             move_y += 1;
//     }


    var stopped_jump = false;
    var move_ok = false;
    if (move_x != 0 || move_y != 0)
    {
        var p = [];
        p.push([0, 0]);
//         if (vars.jumping)
//             p.push([0, -20]);
//         p.push([-8, 0]);
//         p.push([8, 0]);
        var ok = true;
        jQuery.each(p, function(_, pm) {
            if (applies(_get_field(Math.floor((vars.player_x + move_x + pm[0]) / 24), Math.floor((vars.player_y + move_y + pm[1]) / 24)), 'is_solid') &&
                !(('' + Math.floor((vars.player_x + move_x + pm[0]) / 24) + '/' + Math.floor((vars.player_y + move_y + pm[1]) / 24)) in vars.door_open))
            {
                ok = false;
                if ((vars.ay < -0.0001) && (move_y < 0) && (Math.floor(vars.player_y / 24) != Math.floor((vars.player_y + move_y) / 24)))
                {
//                     console.log(vars.jumping, vars.jump_start_x, vars.jump_start_y, Math.floor((vars.player_x + move_x + pm[0]) / 24), Math.floor((vars.player_y + move_y + pm[1]) / 24), move_x, move_y);
                    vars.ay = 0.0;
                    stopped_jump = true;
                    vars.jumping = false;
//                     console.log('stopping jump');
                }
            }
        });
        if (ok)
            move_ok = true;
    }

//     if (applies(_get_field(vars.player_x + move_x, vars.player_y + move_y + 1), 'slide_down_right_1_2_bottom') ||
//         applies(_get_field(vars.player_x + move_x, vars.player_y + move_y + 1), 'slide_down_left_1_2_bottom'))
//         move_ok = true;

    var pmix = Math.floor((vars.player_x + move_x) / 24);
    var pmiy = Math.floor((vars.player_y + move_y) / 24);
    var currently_on_silhouette_field = field_has_silhouette(pix, piy);
    var target_has_silhouette = field_has_silhouette(pmix, pmiy);
    var above_target_has_silhouette = field_has_silhouette(pmix, pmiy - 1);
    var above_target_is_steep_slope =
        applies(_get_field(pmix, pmiy - 1), 'slide_down_left_1_2_bottom') ||
        applies(_get_field(pmix, pmiy - 1), 'slide_down_left_1_2_top') ||
        applies(_get_field(pmix, pmiy - 1), 'slide_down_right_1_2_bottom') ||
        applies(_get_field(pmix, pmiy - 1), 'slide_down_right_1_2_top');
//     console.log('move:', move_x, move_y, 'player:', Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24), pix, piy, 'flags:', currently_on_silhouette_field, target_has_silhouette, above_target_has_silhouette, 'move_ok:', move_ok, 'stopped_jump:', stopped_jump);

    if (!stopped_jump)
    {
        if (!move_ok)
        {
            if (target_has_silhouette)
            {
                move_ok = true;
//                 console.log('A');
            }
        }

//         if (!move_ok)
//         {
            if (currently_on_silhouette_field && above_target_has_silhouette && !above_target_is_steep_slope)
            {
                move_y -= 24;
                move_ok = true;
//                 console.log('B');
            }
//         }

        if (!move_ok)
        {
            if (currently_on_silhouette_field &&
                applies(_get_field(Math.floor((vars.player_x + move_x) / 24), Math.floor((vars.player_y + move_y) / 24)), 'can_stand_on') &&
                (!applies(_get_field(Math.floor((vars.player_x + move_x) / 24), Math.floor((vars.player_y + move_y) / 24 - 1)), 'can_stand_on')))
            {
                move_y -= above_target_is_steep_slope ? 48 : 24;
                move_ok = true;
//                 console.log('C');
            }
        }
    }

    if (move_ok)
    {
        vars.player_x += move_x;
        vars.player_y += move_y;
        var pix = Math.floor(vars.player_x / 24);
        var piy = Math.floor(vars.player_y / 24);
        _set_reachable(pix, piy, 1);
        if (move_x < 0)
            vars.player_sprite = vars.player_sprite_left;
        else if (move_x > 0)
            vars.player_sprite = vars.player_sprite_right;
        else {
            if (applies(_get_field(pix, piy), 'can_climb'))
                vars.player_sprite = vars.player_sprite_back;
            else if (applies(_get_field(pix, piy + 1), 'can_climb'))
                vars.player_sprite = vars.player_sprite_front;
        }

        // see if we've captured the flag
        if (applies(_get_field(pix, piy), 'level_finished'))
        {
            start_next_level();
        }

        // see if we found a trap
        for (var i = 0; i < vars.max_traps; i++)
        {
            if (applies(_get_field(pix, piy), 'trap_' + (i + 1)))
            {
                if (vars.found_trap == null)
                {
                    if (vars.lives_left <= 1)
                    {
                        show_card("GAME OVER", 'Sorry, das Spiel ist vorbei.<br /><br />Geh vielleicht ein bisschen raus!<br />Spielen oder so.', 500, 500, true, null, null);
                    }
                    else
                    {
                        var ouch = [];
                        ouch.push('Huch! Du bist tot.');
                        ouch.push('Aua! Das tat weh.');
                        ouch.push('Autsch! Du bist tot.');
                        ouch.push('Auweia! Das macht Schmerzen.');
                        var message = ouch[Math.floor(Math.random()*ouch.length)];
                        if (vars.lives_left == 2)
                            message = "Jetzt wird es eng. Gib alles!";
                        show_card(message, 'Dr&uuml;cke eine Taste...', 500, 500, true, function() {
                            vars.sprite_container.fadeOut(500);
                        }, function() {
                            vars.lives_left -= 1;
                            initLevel(vars.current_level);
                            vars.sprite_container.fadeIn(500);
                        });
                    }
                }
                vars.found_trap = i;
            }
        }

        // see if we found a key
        for (var i = 0; i < vars.max_keys; i++)
        {
            if (applies(_get_field(pix, piy), 'key_' + (i + 1)))
            {
                vars.got_key[i] = true;
                var anim_key = '' + (pix) + '/' + piy;
                if (!(anim_key in vars.animations))
                {
                    if (vars.play_sounds)
                        vars.sounds['pick_up'].play();
                    vars.animations[anim_key] = {type: 'pick_up', done: function(x, y) {
                        _set_field(x, y, -1);
                    }};
                }
            }
        }

        // see if we found points
        for (var i = 0; i < 3; i++)
        {
            var p = 1;
            if (i == 1)
                p = 5;
            else if (i == 2)
                p = 10;
            if (applies(_get_field(pix, piy), '' + p + 'p'))
            {
                var anim_key = '' + (pix) + '/' + piy;
                if (!(anim_key in vars.animations))
                {
                    vars.level_points += p;
                    if (vars.play_sounds)
                        vars.sounds['pick_up'].play();
                    vars.animations[anim_key] = {type: 'pick_up', done: function(x, y) {
                        _set_field(x, y, -1);
                    }};
                }
            }
        }

        // see if we can open a door
        for (var i = 0; i < vars.max_keys; i++)
        {
            if (vars.got_key[i])
            {
                for (var dx = -1; dx <= 1; dx += 2)
                {
                    if (applies(_get_field(pix + dx, piy), 'door_' + (i + 1)))
                    {
                        if (!(('' + (pix + dx) + '/' + piy) in vars.door_open))
                        {
                            var anim_key = '' + (pix + dx) + '/' + piy;
                            if (!(anim_key in vars.animations))
                            {
                                if (vars.play_sounds)
                                    vars.sounds['power_up'].play();
                                vars.animations[anim_key] = {type: 'slide_door_up'};
                            }
                        }
                    }
                }
            }
        }

        // see if we stand on a crumbling block
        if (applies(_get_field(pix, piy + 1), 'crumbles'))
        {
            var anim_key = '' + (pix) + '/' + (piy + 1);
            if (!(anim_key in vars.animations))
            {
                vars.animations[anim_key] = {wait: 15, type: 'crumble', done: function(x, y) {
                    _set_field(x, y, -1);
                }};
            }
        }

        for (var dy = 0; dy <= 1; dy++)
        {
            // see if we stand on an appearing block
            if (applies(_get_field(pix, piy + dy), 'appears'))
            {
                var anim_key = '' + (pix) + '/' + (piy + dy);
                if (!vars.block_visible[anim_key])
                {
                    if (!(anim_key in vars.animations))
                    {
                        vars.animations[anim_key] = {type: 'appear', done: function(x, y) {
                            vars.block_visible[anim_key] = true;
                        }};
                    }
                }
            }
        }
    }
    return move_ok;
}

function game_logic_loop()
{
    if (vars.showing_card != 0 && (!vars.showing_card_but_contine_animation))
        return;
    vars.animation_phase++;

    vars.player_walk_phase = (vars.player_walk_phase + 1) % 8;

    var pix = Math.floor(vars.player_x / 24);
    var piy = Math.floor(vars.player_y / 24);

    var sliding = false;
    // slide down slides
    if (applies(_get_field(pix, piy), 'slide_down_left') ||
        applies(_get_field(pix, piy), 'slide_down_left_2_1_left') ||
        applies(_get_field(pix, piy), 'slide_down_left_2_1_right') ||
        applies(_get_field(pix, piy), 'slide_down_left_1_2_bottom') ||
        applies(_get_field(pix, piy), 'slide_down_left_1_2_top'))
    {
//         console.log('sliding down left');
        sliding = true;
        if (vars.slide_ax > -7)
            vars.slide_ax--;
    }
    else if (applies(_get_field(pix, piy), 'slide_down_right') ||
        applies(_get_field(pix, piy), 'slide_down_right_2_1_left') ||
        applies(_get_field(pix, piy), 'slide_down_right_2_1_right') ||
        applies(_get_field(pix, piy), 'slide_down_right_1_2_bottom') ||
        applies(_get_field(pix, piy), 'slide_down_right_1_2_top'))
    {
//         console.log('sliding down right');
        sliding = true;
        if (vars.slide_ax < 7)
            vars.slide_ax++;
    }
    else if (!vars.jumping)
    {
        vars.slide_ax = 0;
        vars.jump_ax = 0.0;
    }

    if (!(applies(_get_field(pix, piy), 'can_climb')) &&
        !(applies(_get_field(pix, piy + 1), 'can_climb')) &&
        !(applies(_get_field(pix, piy), 'can_stand_on') && field_has_silhouette(pix, piy)) &&
        !(applies(_get_field(pix, piy + 1), 'can_stand_on')))
        // falling down!
    {
//         console.log('falling down');
        move_player_small(0, 12);
    }
    else if (vars.ay < -0.0001)
    {
//         console.log("falling down anyway because we're jumping up");
        if (applies(_get_field(pix, piy), 'can_climb') ||
            applies(_get_field(pix, piy + 1), 'can_climb'))
            move_player_small(0, 12);
    }
    else if (applies(_get_field(pix, piy + 1), 'crumbles') &&
        ('' + pix + '/' + (piy + 1) in vars.field_offset))
    {
//         console.log('falling down because of crumbling field');
        move_player(0, 1);
    }
    else if (mod(vars.player_y, 24) < 23)
    {
        if (!applies(_get_field(pix, piy), 'can_climb'))
        {
            if (!vars.jumping)
            {
//                 console.log('dropping to bottom');
                vars.player_y = Math.floor(vars.player_y / 24) * 24 + 23;
            }
        }
    }

    // handle camera
    var oldvx = vars.vx;
    var oldvy = vars.vy;
    if (vars.current_level_copy.width < 28)
    {
        vars.vx = -Math.floor(((28 - vars.current_level_copy.width) / 2) * 24);
    }
    else
    {
        if (vars.player_x - vars.vx > 20 * 24 && vars.vx < (vars.reachable_xmax - 28 + 2) * 24)
            vars.vx += 6;
        if (vars.player_x - vars.vx < 8 * 24 && vars.vx > (vars.reachable_xmin - 2) * 24)
            vars.vx -= 6;
        if (vars.vx < 0)
            vars.vx = 0;
        if (vars.vx > (vars.current_level_copy.width - 28) * 24)
            vars.vx = (vars.current_level_copy.width - 28) * 24;
    }

    if (vars.current_level_copy.height < 15)
    {
        vars.vy = -Math.floor(((15 - vars.current_level_copy.height) / 2) * 24);
    }
    else
    {
        if (vars.player_y - vars.vy > 10 * 24 && vars.vy < (vars.reachable_ymax - 15 + 2) * 24)
            vars.vy += 12;
        if (vars.player_y - vars.vy < 5 * 24 && vars.vy > (vars.reachable_ymin - 2) * 24)
            vars.vy -= 6;
        if (vars.vy < 0)
            vars.vy = 0;
        if (vars.vy > (vars.current_level_copy.height - 15) * 24)
            vars.vy = (vars.current_level_copy.height - 15) * 24;
    }
    if (oldvx != vars.vx || oldvy != vars.vy)
    {
        for (var y = 0; y < 16; y++)
            for (var x = 0; x < 29; x++)
                vars.display_sprite[y][x] = -2;
    }

    // handle keys, move player
    if ((vars.found_trap === null) && vars.pressed_keys[37])
    {
        // left
        if (vars.keys_ax > -6.0)
            vars.keys_ax -= 3.0;
    }
    else if ((vars.found_trap === null) && vars.pressed_keys[39])
    {
        // right
        if (vars.keys_ax < 6.0)
            vars.keys_ax += 3.0;
    }
    else if (!vars.jumping)
    {
        if (vars.keys_ax > 0.0)
        {
            vars.keys_ax -= 3.0;
            if (vars.keys_ax < 0.0)
                vars.keys_ax = 0.0;
        }
        else if (vars.keys_ax < 0.0)
        {
            vars.keys_ax += 3.0;
            if (vars.keys_ax > 0.0)
                vars.keys_ax = 0.0;
        }
    }

    if ((vars.found_trap === null) && vars.pressed_keys[38])
    {
        // up
        if (applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24)), 'can_climb'))
        {
//             console.log('climbing up');
            vars.player_x = Math.floor(vars.player_x / 24) * 24 + 12;
            move_player_small(0, -6);
        }
        else if (field_has_silhouette(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24)) && applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24 - 1)), 'can_climb'))
        {
//             console.log('barely reaching and climbing up');
            vars.player_x = Math.floor(vars.player_x / 24) * 24 + 12;
            move_player_small(0, -(mod(vars.player_y, 24) + 7));
        }
    }

    if ((vars.found_trap === null) && vars.pressed_keys[40])
    {
        // down
        if (applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24)), 'can_climb') ||
            applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24) + 1), 'can_climb')
        )
        {
            vars.player_x = Math.floor(vars.player_x / 24) * 24 + 12;
            move_player_small(0, 6);
        }
    }

    var ax = vars.slide_ax + vars.keys_ax + vars.jump_ax;
    if (Math.abs(ax) > 0.0001)
    {
        move_player_small(ax, 0);
    }
    else
    {
        vars.player_walk_phase = 0;
    }

    if ((vars.found_trap === null) && vars.pressed_keys[16])
    {
        // jump
        if ((mod(vars.player_y, 24) == 23) || applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24)), 'can_climb'))
        {
            delete vars.pressed_keys[16];
            if (applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24) + 1), 'can_stand_on') ||
                applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24)), 'can_stand_on') ||
                applies(_get_field(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24) + 1), 'can_climb')
            )
            {
                vars.ay = -40.0;
//                 console.log(vars.keys_ax);
                if (vars.keys_ax < 0.0)
                    vars.jump_ax = -2.0;
                else if (vars.keys_ax > 0.0)
                    vars.jump_ax = 2.0;
                else
                    vars.jump_ax = 0.0;
                vars.jumping = true;
                vars.jump_start_x = Math.floor(vars.player_x / 24);
                vars.jump_start_y = Math.floor(vars.player_y / 24);
            }
        }
    }
    if (Math.abs(vars.ay) > 0.0001)
    {
        move_player_small(0, vars.ay);
        if (vars.ay > 0)
        {
            vars.ay -= 6.0;
            if (vars.ay <= 0.0)
                vars.ay = 0.0;
        }
        else
        {
            vars.ay += 6.0;
            if (vars.ay >= 0.0)
                vars.ay = 0.0;
        }
    }
    else
    {
        vars.ay = 0.0;
        vars.jumping = false;
    }
    // adjust to block silhouette
    var pix = Math.floor(vars.player_x / 24);
    var piy = Math.floor(vars.player_y / 24);
    if (!applies(_get_field(pix, piy), 'is_solid'))
    {
        if (field_has_silhouette(pix, piy + 1) && (!applies(_get_field(pix, piy), 'can_climb')))
        {
            vars.player_y = Math.floor(vars.player_y / 24 + 1) * 24;
//             console.log('dropping down because silhouette');
        }
    }

    if (applies(_get_field(pix, piy), 'slide_down_left') ||
        applies(_get_field(pix, piy), 'stairs_up_right'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + 23 - mod(vars.player_x, 24);
    else if (applies(_get_field(pix, piy), 'slide_down_left_2_1_right') ||
        (applies(_get_field(pix, piy), 'stairs_up_right_2_1_right')))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + 11 - Math.floor(mod(vars.player_x, 24) / 2);
    else if (applies(_get_field(pix, piy), 'slide_down_left_2_1_left') ||
        applies(_get_field(pix, piy), 'stairs_up_right_2_1_left'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + 23 - Math.floor(mod(vars.player_x, 24) / 2);
    else if (applies(_get_field(pix, piy), 'slide_down_right') ||
        applies(_get_field(pix, piy), 'stairs_up_left'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + mod(vars.player_x, 24);
    else if (applies(_get_field(pix, piy), 'slide_down_right_2_1_left') ||
        applies(_get_field(pix, piy), 'stairs_up_left_2_1_left'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + Math.floor(mod(vars.player_x, 24) / 2);
    else if (applies(_get_field(pix, piy), 'slide_down_right_2_1_right') ||
        applies(_get_field(pix, piy), 'stairs_up_left_2_1_right'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + Math.floor(mod(vars.player_x, 24) / 2) + 12;
    else if (applies(_get_field(pix, piy), 'slide_down_right_1_2_top'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + Math.floor(mod(vars.player_x, 24) * 2);
    else if (applies(_get_field(pix, piy), 'slide_down_right_1_2_bottom'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + Math.floor((mod(vars.player_x, 24) - 12) * 2);
    else if (applies(_get_field(pix, piy), 'slide_down_left_1_2_top'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + Math.floor((23 - mod(vars.player_x, 24)) * 2);
    else if (applies(_get_field(pix, piy), 'slide_down_left_1_2_bottom'))
        vars.player_y = Math.floor(vars.player_y / 24) * 24 + Math.floor(((23 - mod(vars.player_x, 24)) - 12) * 2);

//     console.log(Math.floor(vars.player_y / 24), mod(vars.player_y, 24));

    // handle animations
    var remove_animations = [];
    jQuery.each(Object.keys(vars.animations), function(_, key) {
        var info = vars.animations[key];
        var xy = key.split('/');
        var x = new Number(xy[0]).valueOf();
        var y = new Number(xy[1]).valueOf();
        if (typeof(info.wait) !== 'undefined')
        {
            if (info.wait > 0)
            {
                info.wait--;
                return;
            }
        }
        if (info.type == 'slide_door_up')
        {
            if (!(key in vars.field_offset))
                vars.field_offset[key] = {dx: 0, dy: 0, alpha: 1.0, osx: 0, osy: 0, w: 24, h: 24, odx: 0, ody: 0};
            vars.field_offset[key].osy += 1;
            vars.field_offset[key].h -= 1;
            if (vars.field_offset[key].osy > 14)
            {
                vars.door_open[key] = true;
                var xy = key.split('/');
                find_reachable_blocks(new Number(xy[0]).valueOf(), new Number(xy[1]).valueOf());
            }
            if (vars.field_offset[key].osy > 18)
            {
                if (typeof(info.done) === 'function')
                {
                    var xy = key.split('/');
                    info.done(new Number(xy[0]).valueOf(), new Number(xy[1]).valueOf());
                }
//                 delete vars.field_offset[key];
                remove_animations.push(key);
            }
        }
        if (info.type == 'pick_up')
        {
            if (!(key in vars.field_offset))
                vars.field_offset[key] = {dx: 0, dy: 0, alpha: 1.0, osx: 0, osy: 0, w: 24, h: 24, odx: 0, ody: 0};
            vars.field_offset[key].dy -= 2;
//             mark_dirty(x, y + 1);
            mark_dirty(x, y - 1);
            mark_dirty(x, y);
//             mark_dirty(x, y - 1);
            if (vars.field_offset[key].dy < -20)
                vars.field_offset[key].alpha -= 0.1;
            if (vars.field_offset[key].dy < -40)
            {
                if (typeof(info.done) === 'function')
                {
                    var xy = key.split('/');
                    info.done(new Number(xy[0]).valueOf(), new Number(xy[1]).valueOf());
                }
                delete vars.field_offset[key];
                remove_animations.push(key);
            }
        }
        if (info.type == 'crumble')
        {
            if (!(key in vars.field_offset))
                vars.field_offset[key] = {dx: 0, dy: 0, alpha: 1.0, osx: 0, osy: 0, w: 24, h: 24, odx: 0, ody: 0};
//             mark_dirty(x, y + Math.floor(vars.field_offset[key].dy / 24) - 2);
            mark_dirty(x, y + Math.floor(vars.field_offset[key].dy / 24) - 1);
            mark_dirty(x, y + Math.floor(vars.field_offset[key].dy / 24) + 1);
            mark_dirty(x, y + Math.floor(vars.field_offset[key].dy / 24));
            mark_dirty(x, y);
            vars.field_offset[key].dy += 12;
            if (applies(_get_field(x, y + Math.floor(vars.field_offset[key].dy / 24)), 'is_solid'))
            {
                vars.sounds['hit_hurt'].currentTime = 0;
                if (vars.play_sounds)
                    vars.sounds['hit_hurt'].play();
                if (typeof(info.done) === 'function')
                    info.done(x, y);
                delete vars.field_offset[key];
                remove_animations.push(key);
            }
        }
        if (info.type == 'appear')
        {
            if (!(key in vars.field_offset))
                vars.field_offset[key] = {dx: 0, dy: 0, alpha: 1.0, osx: 0, osy: 0, w: 24, h: 0, odx: 0, ody: 0};
            vars.field_offset[key].h += 3;
            if (vars.field_offset[key].h >= 24)
            {
                if (typeof(info.done) === 'function')
                    info.done(x, y);
                delete vars.field_offset[key];
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
    var player = $('#yt')[0];
    player.pauseVideo();
}

function start_next_level()
{
    // find next level
    while (true)
    {
        vars.current_level = (vars.current_level + 1) % vars.levels.length;
        if (vars.levels[vars.current_level].use)
        {
            initLevel(vars.current_level);
            break;
        }
    }
}

function restart_level()
{
    initLevel(vars.current_level);
}

function keydown(code)
{
    if (current_pane !== 'play')
        return;
    if (vars.showing_card == 2)
    {
        if (Date.now() - vars.showing_card_time > 500)
        {
            if (code != 16 && code != 17 && code != 18 && code != 92 && code != 93)
            {
                if (Object.keys(vars.showing_card_pressed_keys).length == 0)
                {
                    vars.showing_card = 1;
                    if (vars.showing_card_hide_function !== null)
                        vars.showing_card_hide_function();
                    $('#title_card').fadeOut(vars.showing_card_fadeout_duration, function() {
                        vars.showing_card = 0;
                        if (vars.showing_card_completion_function !== null)
                            vars.showing_card_completion_function();
                    });
                }
            }
        }
    }
    if (code == 82)
    {
        restart_level();
    }
    if (code == 76)
    {
        start_next_level();
    }
    if (code == 27)
    {
        stopTheGame();
    }
//     if (code == 39)
//     {
//         move_player(1, 0);
//     }
//     if (code == 37)
//     {
//         move_player(-1, 0);
//     }
//     if (code == 38)
//     {
//         if (applies(_get_field(vars.player_x, vars.player_y), 'can_climb'))
//             move_player(0, -1);
//     }
//     if (code == 40)
//     {
//         if (applies(_get_field(vars.player_x, vars.player_y), 'can_climb') ||
//             applies(_get_field(vars.player_x, vars.player_y + 1), 'can_climb'))
//             move_player(0, 1);
//     }
}

function __keydown(e)
{
    _keydown(e.keyCode);
}

function __keyup(e)
{
    _keyup(e.keyCode);
}

function _keydown(keyCode)
{
    if (typeof(vars.pressed_keys[keyCode]) === 'undefined')
    {
        keydown(keyCode);
        vars.pressed_keys[keyCode] = {
            key_down: vars.game_logic_loop_counter,
            key_delay_passed: vars.game_logic_loop_counter + 5
        };
    }
}

function _keyup(keyCode)
{
    delete vars.pressed_keys[keyCode];
    delete vars.showing_card_pressed_keys[keyCode];
}

function _clear_keys(e)
{
    vars.pressed_keys = {};
}

function init() {
//     init();
//     defs();

//     vars.canvas = document.getElementById("canvas");
//     vars.imageContext = vars.canvas.getContext("2d");
//     vars.imageContext.mozImageSmoothingEnabled = false;
//     vars.imageContext.webkitImageSmoothingEnabled = false;
//     vars.imageContext.msImageSmoothingEnabled = false;
//     vars.imageContext.imageSmoothingEnabled = false;

    window.onresize = _fix_sizes;

    function _game_logic_loop()
    {
        var now = Date.now();
//         console.log("_game_logic_loop(): " + (now - vars.latest_game_logic_update));
        while (now - vars.latest_game_logic_update >= 33)
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
            vars.latest_game_logic_update += 33;
        }
        render();
        setTimeout(_game_logic_loop, 33);
    }

    window.addEventListener("keydown", __keydown, false);
    window.addEventListener("keyup", __keyup, false);
    window.addEventListener("blur", _clear_keys, false);
    window.addEventListener("focus", _clear_keys, false);
//     requestAnimationFrame(_loop);
    setTimeout(_game_logic_loop, 33);
    _fix_sizes();
    vars.showing_card = 0;
    vars.showing_card_but_contine_animation = false;
    vars.showing_card_completion_function = null;
    vars.showing_card_hide_function = null;
    vars.showing_card_pressed_keys = {};
    vars.showing_card_fadeout_duration = 500;
}

function find_reachable_blocks(x, y)
{
    var seen = {};
    var stack = [];
    stack.push([x, y]);
    var iterations = 0;
    while (stack.length > 0)
    {
        iterations++;
        var position = stack.pop();
        var x = position[0];
        var y = position[1];
        var xykey = '' + x + '/' + y;
        seen[xykey] = true;
        if (_get_reachable(x, y) == 0)
        {
            var proceed = false;
            if (_get_field(x, y) == -1)
                proceed = true;
            else if (!(applies(_get_field(x, y), 'is_solid')))
                proceed = true;
            else if (vars.door_open['' + x + '/' + y])
                proceed = true;
//             else if (applies(_get_field(x, y), 'crumbles'))
//                 proceed = true;
            else if (field_has_silhouette(x, y))
                proceed = true;
//             else if (field_has_silhouette(x, y + 1))
//                 proceed = true;
            if (proceed)
            {
                _set_reachable(x, y, 1);
                var tries = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                if (applies(_get_field(x + 1, y), 'stairs_up_right'))
                    tries.push([1, -1]);
                if (applies(_get_field(x - 1, y), 'stairs_up_left'))
                    tries.push([-1, -1]);
                if (applies(_get_field(x, y + 1), 'stairs_up_left'))
                    tries.push([1, 1]);
                if (applies(_get_field(x, y + 1), 'stairs_up_right'))
                    tries.push([-1, 1]);
                jQuery.each(tries, function(_, t) {
                    var tx = x + t[0];
                    var ty = y + t[1];
                    if (tx >= 0 && tx < vars.current_level_copy.width &&
                        ty >= 0 && ty < vars.current_level_copy.height &&
                        (!(('' + tx + '/' + ty) in seen)))
                    {
                        stack.push([tx, ty]);
                    }
                });
            }
        }
    }
//     console.log("This took " + iterations + " iterations.");
}

function initLevel(which, wait)
{
    if (typeof(wait) === 'undefined')
        wait = true;
    if (wait)
        vars.sprite_container.hide();
    vars.animation_phase = 0;
    vars.current_level = which;
    vars.current_level_copy = jQuery.extend(true, {}, vars.levels[vars.current_level])
    var found_player = false;
    vars.vx = 0;
    vars.vy = 0;
    jQuery.each(vars.current_level_copy.data, function(y, row) {
        jQuery.each(row, function(x, cell) {
            if (applies(cell, 'actor_front') || applies(cell, 'actor_back') ||
                applies(cell, 'actor_left') || applies(cell, 'actor_right'))
            {
                vars.player_x = x * 24 + 12;
                vars.player_y = y * 24 + 23;
//                 console.log('setting player at', vars.player_x, vars.player_y);
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
    vars.got_key = [];
    vars.door_open = {};
    vars.animations = {};
    vars.field_offset = {};
    vars.block_visible = {};
    vars.reachable_blocks = [];
    vars.reachable_xmin = null;
    vars.reachable_xmax = null;
    vars.reachable_ymin = null;
    vars.reachable_ymax = null;
    vars.display_sprite = [];
    vars.jumping = false;
    vars.jump_start_x = 0;
    vars.jump_start_y = 0;
    vars.player_walk_phase = 0;
    vars.latest_game_logic_update = Date.now();
    vars.latest_render_update = Date.now();
    vars.current_sprite_offset_x = -1;
    vars.current_sprite_offset_y = -1;
    vars.found_trap = null;
    vars.level_points = 0;
    vars.keys_ax = 0.0;
    vars.slide_ax = 0.0;
    vars.jump_ax = 0.0;
    vars.ay = 0.0;
    vars.vx = 0;
    vars.vy = 0;

    for (var y = 0; y < 16; y++)
    {
        var display_sprite_row = [];
        for (var x = 0; x < 29; x++)
            display_sprite_row.push(-2);
        vars.display_sprite.push(display_sprite_row);
    }
    for (var y = 0; y < vars.current_level_copy.height; y++)
    {
        var row = [];
        for (var x = 0; x < vars.current_level_copy.width; x++)
            row.push(0);
        vars.reachable_blocks.push(row);
    }

    // reset all keys
    for (var i = 0; i < vars.max_keys; i++)
    {
        vars.got_key[i] = false;
        vars.door_open = {};
    }

//     console.log(vars.levels[vars.current_level]);
    vars.backdrop.css('background-color', vars.levels[vars.current_level].background);

    vars.pressed_keys = {};

    _fix_sizes();
    find_reachable_blocks(Math.floor(vars.player_x / 24), Math.floor(vars.player_y / 24));
    if (wait)
    {
        vars.sprite_container.fadeIn(1000);
        show_card("Level " + (which + 1), "Dr&uuml;ck eine Taste...", 500, 500, false, null, null);
    }
}

function init_game(width, height, supersampling, data)
{
    $('#yt_placeholder').empty();
    // <embed id="playerid" width="500px" height="400px" allowfullscreen="true"
    // allowscriptaccess="always" quality="high" bgcolor="#000000" name="playerid"
    //style=""
    //src="http://www.youtube.com/v/[ID]?enablejsapi=1&version=3&playerapiid=ytplayer"
    //type="application/x-shockwave-flash">
    window.onYouTubePlayerReady = function() {
        var player = $('#yt')[0];
//         player.playVideo();
    };
    var yt_embed = $('<embed>');
    yt_embed.attr('id', 'yt');
    yt_embed.attr('width', '192px');
    yt_embed.attr('height', '128px');
    yt_embed.attr('allowfullscreen', 'false');
    yt_embed.attr('autoplay', 'true');
    yt_embed.attr('allowscriptaccess', 'always');
    yt_embed.attr('name', 'yt');
//     var video_id = 'RDi1IJTXYdI'; // Hysteria
//     var video_id = 'fIgI8IGkJ-E'; // Chop Suey
//     var video_id = 'umMmGgsxBWA'; // Nyan Cat
//     var video_id = 'ZRISfN-cfmM'; // Light my fire
//     var video_id = 'Uu8WP-Se90w'; // Take on me
    var video_id = 'fpcLxmSmlLQ'; // Around the world
//     var video_id = 'HIEogKEWGlc'; // The Zephyr Song
//     var video_id = 'L1O0wymSZsc'; // Someday
//     var video_id = 'jDJ9dmZzQoY'; // Everything counts
//     var video_id = 'kxJXqEOyJUg'; // Rebel Rebel
//     var video_id = 'AEi7KKPHLgU'; // I want you back
//     var video_id = '';
//
//     yt_embed.attr('src', 'http://www.youtube.com/v/' + video_id + '?enablejsapi=1&version=3&playerapiid=ytplayer');
//     yt_embed.attr('type', 'application/x-shockwave-flash');
//     yt_embed.css('z-index', '2000');
//     yt_embed.css('width', '0');
//     yt_embed.css('height', '0');
//     $('#yt_placeholder').append(yt_embed);

    vars = {
        animation_phase: 0,
        sprite_animations: [],
        play_sounds: false,
        sprite_size: 1,
        keys_ax: 0.0,
        slide_ax: 0.0,
        ay: 0.0,
        vx: 0,
        vy: 0,
        game_width: null,
        game_height: null,
        game_supersampling: null,
        canvas: null,
        imageContext: null,
        jumping: false,
        fields: [],
        display_sprite: [],
        sprite_div: [],
        game_logic_loop_counter: 0,
        pressed_keys: {},
        player_x: 0,
        player_y: 0,
        player_sprite: 0,
        current_level: 0,
        current_level_copy: {},
        levels: [],
        sprite_properties: [],
        player_sprite_front: -1,
        player_sprite_back: -1,
        player_sprite_left: -1,
        player_sprite_right: -1,
        player_sprite_walk_left: -1,
        player_sprite_walk_right: -1,
        player_sprite_jump_left: -1,
        player_sprite_jump_right: -1,
        player_walk_phase: 0,
        max_keys: 4,
        max_traps: 4,
        trap_actor_sprite: [],
        sounds: {},
        sprites_repo: null,
        latest_game_logic_update: Date.now(),
        latest_render_update: Date.now(),
        offset_x: 0,
        offset_y: 0,
        lives_left: 5
    };
    if (typeof(supersampling) == 'undefined')
        supersampling = 4;
    vars.game_width = width;
    vars.game_height = height;
    vars.game_supersampling = supersampling;
    var container = $('<div>');
    container.attr('id', 'play_container');
    container.css('position', 'absolute');
    container.css('top', '0');
    container.css('bottom', '0');
    container.css('left', '0');
    container.css('right', '0');
    container.css('background-color', '#000');
    container.css('display', 'none');
    container.css('z-index', '1');
//     var canvas = $('<canvas>');
//     canvas.attr('id', 'canvas');
//     canvas.attr('width', 1);
//     canvas.attr('height', 1);
//     canvas.css('position', 'absolute');
//     canvas.css('z-index', '1000');
//     canvas.css('left', 0);
//     canvas.css('top', 0);
    var backdrop = $('<div>');
    backdrop.css('position', 'absolute');
    backdrop.css('background-color', '#000');
    backdrop.css('top', '0');
    backdrop.css('bottom', '0');
    backdrop.css('left', '0');
    backdrop.css('right', '0');
    backdrop.css('cursor', 'none');
//     backdrop.css('z-index', 800);
    $(container).append(backdrop);
    vars.backdrop = backdrop;
    var sprite_container = $('<div>');
    vars.sprite_container = sprite_container;
    sprite_container.css('position', 'relative');
    sprite_container.css('background-color', '#000');
    sprite_container.hide();
    $(container).append(sprite_container);

//     $(container).append(canvas);
    for (var y = 0; y < 16; y++)
    {
        var sprite_div_row = [];
        for (var x = 0; x < 29; x++)
        {
            var sprite = $('<div>').addClass('sd');
            sprite.css('cursor', 'none');
            sprite_div_row.push(sprite);
            sprite_container.append(sprite);
        }
        vars.sprite_div.push(sprite_div_row);
    }
    var sprite = $('<div>').addClass('sd');
    $(sprite_container).append(sprite);
    vars.player_sprite_div = sprite;

    vars.sliders = [];
    for (var i = 0; i < 4; i++)
    {
        var slider = $('<div>');
        slider.css('position', 'absolute');
        slider.css('background-color', '#000');
        slider.css('top', '0');
        slider.css('bottom', '0');
        slider.css('left', '0');
        slider.css('right', '0');
        slider.css('z-index', 2000);
        $(container).append(slider);
        vars.sliders.push(slider);
    }

    var title = $('<div>');
    title.attr('id', 'title_left');
    title.addClass('ontop');
    title.addClass('pixelfont');
    title.css('z-index', '2001');
    title.css('position', 'absolute');
    title.html('');

    $(container).append(title);
    title = $('<div>');
    title.attr('id', 'title_right');
    title.addClass('ontop');
    title.addClass('pixelfont');
    title.css('z-index', '2001');
    title.css('position', 'absolute');
    title.css('text-align', 'right');
    title.html("");
    $(container).append(title);

    var title_card = $('<div>');
    title_card.attr('id', 'title_card');
    title_card.addClass('ontop');
    title_card.css('z-index', '2002');
    title_card.css('position', 'absolute');
    $(container).append(title_card);

    var title_card_text = $('<div>');
    title_card_text.attr('id', 'title_card_text');
    $(title_card).append(title_card_text);

    var title = $('<div>');
    title.addClass('game_title')
    $(title_card_text).append(title);

    var title = $('<div>');
    title.addClass('game_subtitle')
    $(title_card_text).append(title);

    _fix_sizes();
    if (!!('ontouchstart' in window))
    {
        var control = null;
        control = $('<div>').addClass('control').html("<i class='fa fa-arrow-circle-left'></i>").css('right', '120px').css('bottom', '0');
        control.bind('touchstart', function() {
            _keydown(37);
        });
        control.bind('touchend', function() {
            _keyup(37);
        });
        $(container).append(control);
        control = $('<div>').addClass('control').html("<i class='fa fa-arrow-circle-down'></i>").css('right', '60px').css('bottom', '0');
        control.bind('touchstart', function() {
            _keydown(40);
        });
        control.bind('touchend', function() {
            _keyup(40);
        });
        $(container).append(control);
        control = $('<div>').addClass('control').html("<i class='fa fa-arrow-circle-up'></i>").css('right', '60px').css('bottom', '60px');
        control.bind('touchstart', function() {
            _keydown(38);
        });
        control.bind('touchend', function() {
            _keyup(38);
        });
        $(container).append(control);
        control = $('<div>').addClass('control').html("<i class='fa fa-arrow-circle-right'></i>").css('right', '0').css('bottom', '0');
        control.bind('touchstart', function() {
            _keydown(39);
        });
        control.bind('touchend', function() {
            _keyup(39);
        });
        $(container).append(control);
        control = $('<div>').addClass('control').html("<i class='fa fa-arrow-circle-up'></i>").css('left', '0').css('bottom', '0');
        control.bind('touchstart', function() {
            _keydown(16);
        });
        control.bind('touchend', function() {
            _keyup(16);
        });
        $(container).append(control);
    }
    backdrop.css('display', 'none');
//     canvas.css('display', 'none');
    $('body').append(container);

    vars.sounds['hit_hurt'] = new Audio('sounds/Hit_Hurt41.wav');
    vars.sounds['hit_hurt'].volume = 0.5;
    vars.sounds['pick_up'] = new Audio('sounds/Pickup_Coin36.wav');
    vars.sounds['pick_up'].volume = 0.5;
    vars.sounds['power_up'] = new Audio('sounds/Powerup28.wav');
    vars.sounds['power_up'].volume = 0.5;
    var zip = new JSZip(atob(data));
    $.each(zip.files, function (index, zipEntry) {
//         console.log(zipEntry);
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
        }
        else if (zipEntry.name == 'animations.json')
        {
            var info = JSON.parse(zipEntry.asText());
            vars.sprite_animations = info.slice();
        }
        else if (zipEntry.name == 'sprite_props.json')
        {
            var info = JSON.parse(zipEntry.asText());
            vars.sprite_properties = info;
            // promote properties
            jQuery.each(Object.keys(vars.sprite_properties), function(_, k) {
                var p = vars.sprite_properties[k];
                if (p.stairs_up_right || p.stairs_up_right_2_1_left || p.stairs_up_right_2_1_right ||
                    p.stairs_up_left || p.stairs_up_left_2_1_left || p.stairs_up_left_2_1_right ||
                    p.slide_down_left || p.slide_down_left_1_2_bottom || p.slide_down_left_1_2_top ||
                    p.slide_down_left_2_1_left || p.slide_down_left_2_1_right ||
                    p.slide_down_right || p.slide_down_right_1_2_bottom || p.slide_down_right_1_2_top ||
                    p.slide_down_right_2_1_left || p.slide_down_right_2_1_right)
                {
                    p.can_stand_on = true;
                    p.is_solid = true;
                }
            });
//             loadLevels(info);
        }
    });
    jQuery.each(vars.sprite_properties, function(_, props) {
        if ('actor_front' in props)
            vars.player_sprite_front = _;
        if ('actor_back' in props)
            vars.player_sprite_back = _;
        if ('actor_left' in props)
            vars.player_sprite_left = _;
        if ('actor_right' in props)
            vars.player_sprite_right = _;
        if ('actor_walk_left' in props)
            vars.player_sprite_walk_left = _;
        if ('actor_walk_right' in props)
            vars.player_sprite_walk_right = _;
        if ('actor_jump_left' in props)
            vars.player_sprite_jump_left = _;
        if ('actor_jump_right' in props)
            vars.player_sprite_jump_right = _;
    });
    for (var i = 0; i < vars.max_traps; i++)
        vars.trap_actor_sprite.push(vars.player_sprite_front);
    jQuery.each(vars.sprite_properties, function(_, props) {
        for (var i = 0; i < vars.max_traps; i++)
        {
            if ('trap_' + (i + 1) + '_actor' in props)
                vars.trap_actor_sprite[i] = _;
        }
    });

//     backdrop.fadeIn(function() {
        $('body').css('padding', '0');
        $('body').css('margin', '0');
        $('body').css('overflow', 'hidden');
//         canvas.fadeIn();
        switchPane('play', true);
        init();
        initLevel(0, false);
        $('#title_left').hide();
        $('#title_right').hide();
        show_card("WIE SOLL DIESES SPIEL<br />NUR HEISSEN?", "<!--Ein Spiel von Charlotte Specht<br /><br />-->Bitte dr&uuml;cke eine Taste...", 1, 500, false, null, function() {
            vars.sprite_container.fadeIn(1);
            initLevel(0);
            $('#title_left').fadeIn(500);
            $('#title_right').fadeIn(500);
        });
        $('#play_container').show();
//     });
}

function show_card(first, second, speed, fadeout_speed, continue_animation, message_hide, complete)
{
    if (vars.showing_card != 0)
        return;

    vars.showing_card_but_contine_animation = continue_animation;
    vars.showing_card_hide_function = message_hide;
    vars.showing_card_completion_function = complete;
    vars.showing_card_pressed_keys = jQuery.extend(true, {}, vars.pressed_keys);
    vars.showing_card_fadeout_duration = fadeout_speed;

    $('.game_title').html(first);
    $('.game_subtitle').html(second);
    vars.showing_card = 1;
    $('#title_card').hide().fadeIn(speed, function() {
        vars.showing_card = 2;
        vars.showing_card_time = Date.now();
    });

}

// Takes a data URI and returns the Data URI corresponding to the resized image at the wanted size.
// http://stackoverflow.com/a/26884245
function resizedataURL(datas, scale, hook)
    {
        // We create an image to receive the Data URI
        var img = document.createElement('img');

        // When the event "onload" is triggered we can resize the image.
        img.onload = function()
            {
                // We create a canvas and get its context.
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                // We set the dimensions at the wanted size.
                canvas.width = Math.floor(img.width * scale);
                canvas.height = Math.floor(img.height * scale);

                // We resize the image with the canvas method drawImage();
                ctx.mozImageSmoothingEnabled = false;
                ctx.webkitImageSmoothingEnabled = false;
                ctx.msImageSmoothingEnabled = false;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(this, 0, 0, img.width * scale, img.height * scale);

                var dataURI = canvas.toDataURL('image/png');
                hook(dataURI);

                /////////////////////////////////////////
                // Use and treat your Data URI here !! //
                /////////////////////////////////////////
            };

        // We put the Data URI in the image's src attribute
        img.src = datas;
    }
// Use it like that : resizedataURL('yourDataURIHere', 50, 50);

// http://stackoverflow.com/a/16245768
function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

function load_sprites(path, id)
{
    if (typeof(id) === 'undefined')
        id = 'sprites_default';
    resizedataURL(path, 3, function(data) {
//         var img = $('<img>').attr('id', id).attr('src', data).css('display', 'none');
//         $('#play_container').append(img);
//         vars.sprites_repo = $('#sprites_default')[0];
        data = data.substr(data.indexOf('base64,') + 7);
//         console.log(data);
        var blob = b64toBlob(data, 'image/png');
        var urlCreator = window.URL || window.webkitURL;
        data = urlCreator.createObjectURL(blob);
//         console.log(path.length, path);
//         $('.sd').css('background-image', 'url(' + path + ')');
        $('.sd').css('background-image', 'url(' + data + ')');
    });
}

function load_game(url)
{
    $.get(url, function(data) {
//         console.log(data);
    });
}

function fill_rect(x0, y0, x1, y1, color)
{
    x0 *= vars.game_supersampling;
    x1 *= vars.game_supersampling;
    y0 *= vars.game_supersampling;
    y1 *= vars.game_supersampling;
    vars.imageContext.fillStyle = color;
    vars.imageContext.strokeStyle = "none";
//     vars.imageContext.fillRect(x0 + 0.5, y0 + 0.5, x1 - x0 + 1, y1 - y0 + 1);
    vars.imageContext.fillRect(x0, y0, x1 - x0 + vars.game_supersampling, y1 - y0 + vars.game_supersampling);
}

function clear(color)
{
    fill_rect(0, 0, vars.game_width, vars.game_height, color);
}

function fill_rect_semi(x0, y0, x1, y1)
{
    x0 *= vars.game_supersampling;
    x1 *= vars.game_supersampling;
    y0 *= vars.game_supersampling;
    y1 *= vars.game_supersampling;
    vars.imageContext.fillStyle = 'rgba(255, 255, 255, 0.4)'
    vars.imageContext.strokeStyle = "none";
    vars.imageContext.fillRect(x0 + 0.5, y0 + 0.5, x1 - x0 + 1, y1 - y0 + 1);
}

function draw_rect(x0, y0, x1, y1, color)
{
    x0 *= vars.game_supersampling;
    x1 *= vars.game_supersampling;
    y0 *= vars.game_supersampling;
    y1 *= vars.game_supersampling;
    vars.imageContext.strokeStyle = color;
    vars.imageContext.fillStyle = "rgba(255,255,255,0.1);";
    vars.imageContext.strokeWidth = 1.0;
    vars.imageContext.strokeRect(x0, y0, x1 - x0 + vars.game_supersampling, y1 - y0 + vars.game_supersampling);
}

function draw_sprite(x, y, which, id)
{
    if (which < 0)
        return;
    x = Math.round(x);
    y = Math.round(y);
    var px = Math.floor(which % 8);
    var py = Math.floor(which / 8);
    vars.imageContext.drawImage(vars.sprites_repo, px * 24, py * 24, 24, 24,
                                x * vars.game_supersampling, y * vars.game_supersampling,
                                24 * vars.game_supersampling, 24 * vars.game_supersampling);
}

function draw_sprite_special(x, y, which, id, alpha, osx, osy, w, h, odx, ody)
{
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
    vars.imageContext.drawImage(vars.sprites_repo, px * 24 + osx, py * 24 + osy, w, h,
                                (x + odx) * vars.game_supersampling, (y + ody) * vars.game_supersampling,
                                w * vars.game_supersampling, h * vars.game_supersampling);
    if (alpha != 1.0)
    {
        vars.imageContext.restore();
    }
}

function draw_sprite_part_y(x, y, which, id, sy, h, dy)
{
    if (which < 0)
        return;
    x = Math.round(x);
    y = Math.round(y);
    var px = Math.floor(which % 8);
    var py = Math.floor(which / 8);
    vars.imageContext.drawImage(vars.sprites_repo, px * 24, py * 24 + sy, 24, h,
                                x * vars.game_supersampling, (y + dy) * vars.game_supersampling,
                                24 * vars.game_supersampling, h * vars.game_supersampling);
}
