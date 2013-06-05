clear_screen = function() {
    context.fillStyle = "rgb(0,0,0)";
    context.fillRect(0,0,800,600);
};


gen_sprite = function( file, fw, fh, cb ) {
    var spr = {};
    spr.img = new Image();
    spr.img.src = file;
    spr.frame_width = fw;
    spr.frame_height = fh;

    spr.img.onload = function() { 
        console.warn('loaded');
        spr.num_cols = Math.floor(spr.img.width / fw);
        spr.num_rows = Math.floor(spr.img.height / fh);
        spr.num_frames = spr.num_cols * spr.num_rows;
        cb(spr);
    };
    spr.current_frame = 0
    spr.frame_rate = 0.35
    spr.rotation = 0;
};

update_sprite = function(spr) {
    spr.current_frame += spr.frame_rate;
    if( spr.current_frame >= spr.num_frames ) {
        spr.current_frame -= spr.num_frames;
    }
};

draw_sprite = function(spr,context) {
    var fr = Math.floor( spr.current_frame );
    //console.log('' + ( fr % spr.num_rows )*spr.frame_width + ', ' + Math.floor( fr / spr.num_rows )*spr.frame_height);

    context.drawImage( spr.img,  (fr % spr.num_rows) * spr.frame_width, Math.floor( fr / spr.num_rows) * spr.frame_height,
                       spr.frame_width, spr.frame_height, -spr.frame_width/2, -spr.frame_height/2,
                       spr.frame_width,spr.frame_height );
}


DT = 40

DT_T = (DT / 83 );

get_random = function( max ) {
    return Math.random()*max;
};

function get_image(email, callback) {
    var md5 = hex_md5(email);
    var img = new Image();
    img.src= "http://gravatar.com/avatar/" + md5;
    img.onload = function() {
        callback(img);
    };
}

STATE_DEAD  = 0;
STATE_ALIVE = 1;


LEFT  = 1;
RIGHT = 2;
UP    = 4;
DOWN  = 8;

KEYS = 0;

MAX_RADIUS = 600;

stars = null;
enemies = [];
spr = null;

to_cartesian = function( t ) {
    t.x = Math.cos(t.theta)*t.radius + 400;
    t.y = Math.sin(t.theta)*t.radius + 300;
};

gen_enemy = function() {
    var e = null;
    for( var i = 0 ; i < enemies.length ; ++i ) {
        if( enemies[i].state == STATE_DEAD ) {
            e = enemies[i];
            break;
        }
    }

    if( e == null ) {
        enemies.push( e =  {} );
        get_image("john.duff@jadedpixel.com", function(img) {
            e.img = img;
        });
     }
    e.state = STATE_ALIVE;
    e.radius = 0;
    e.theta = 0;
    e.theta_vel = get_random( 0.6 );
    e.radius_vel = get_random( MAX_RADIUS/140 );

};

draw_enemies = function() {
    context.fillStyle = "rgb(255,0,0)";
    for( var i = 0 ; i < enemies.length ; ++i ) {
        if( enemies[i].state == STATE_ALIVE ) {
            to_cartesian(enemies[i]);
            context.save();
            context.translate( enemies[i].x, enemies[i].y);
            context.rotate( enemies[i].theta + Math.PI/2 );
            if( enemies[i].img ) {
                context.scale(0.2,0.2);
                context.drawImage(enemies[i].img, -enemies[i].img.width/2, -enemies[i].img.height/2);
            }
            else {
                context.fillRect( -15,-15, 30,30 );
            }
            context.restore();

            enemies[i].radius += enemies[i].radius_vel*DT_T;
            enemies[i].theta  += enemies[i].theta_vel*DT_T;

            if( enemies[i].radius > MAX_RADIUS ) {
                enemies[i].state = STATE_DEAD;
            }
        }
    }
};

draw_stars = function() {
    if( stars == null ) {
        stars = [];
        for( var i = 0 ; i < 512 ; i = i + 1 ) {
            var s = { }
            s.radius = get_random( MAX_RADIUS );
            s.theta =  get_random( 2* Math.PI );
            s.time_to_spawn = get_random( 100);
            stars.push(s);
        }
    } 

    context.fillStyle = "rgb(255,255,255)";
    for( var i = 0 ; i < stars.length ; ++i ) {
        if( stars[i].time_to_spawn <= 0 ) {
            to_cartesian( stars[i] );
            context.fillRect(stars[i].x,stars[i].y, 1,1);

            stars[i].radius *= 0.98;
            
        
            if( stars[i].radius < 30 ) {
                stars[i].time_to_spawn = get_random( 100);
                stars[i].radius = MAX_RADIUS + stars[i].radius;
            }
        } else {
            stars[i].time_to_spawn -= 1*DT_T;
        }
    }
};

player = { img: null,
           radius: 300,
           theta: 0,
           theta_vel: 0
         };

tick = function() {
    // clear screen
    clear_screen();
    //draw lights
    draw_stars();

    if( KEYS & LEFT ) {
        player.theta_vel -= 0.3;
    }
    else if (KEYS & RIGHT ) {
        player.theta_vel += 0.3;
    }

    if( KEYS & DOWN ) {
        gen_sprite( 'http://members.gamedev.net/dfgames/explosion.png', 64, 64, function(s) { if( spr == null ) { spr = s; }} );
    }

    if( player.theta_vel > 0.5) {
        player.theta_vel = 0.5
    }
    else if( player.theta_vel < -0.5 ) {
        player.theta_vel = -0.5
    }

    draw_enemies();
    if( spr != null ) {
        context.save();
        context.translate(400,300);
        draw_sprite(spr,context);
        update_sprite(spr);
        context.restore();
    }
    if( player.img ) {
        to_cartesian(player);
        context.save();
        context.translate(player.x , player.y );
        context.rotate( player.theta + Math.PI/2 );

        context.drawImage( player.img,- player.img.width/2,- player.img.height/2 );
        context.restore();
        
        if( player.theta_vel < 1.0 && player.theta_vel > -1.0) {
            player.theta += player.theta_vel*DT_T;
            player.theta_vel *= 0.7;
        }
    }
};


start_game = function() {
    get_image('ian.quick@jadedpixel.com', function(img) {
        player.img = img;
    });
    canvas = document.getElementById('thingy');
    context = canvas.getContext('2d');
    
    var code_to_action = function(keyCode) {
        var i = 0;
        switch( keyCode ) {
        case 13:
            i = FIRE;
        case 37:
            i = LEFT;
            break;
        case 38:
            i = UP;
            break;
        case 39:
            i = RIGHT;
            break;
        case 40:
            i = DOWN;
            break;
        }
        return i;
    };

    window.addEventListener( "keydown", function(evt) {
        var action = code_to_action(evt.keyCode);
        
        KEYS |= action;
        if( action != 0 ) 
            evt.preventDefault();
    } );
    window.addEventListener( "keyup", function(evt) {
        var action = code_to_action(evt.keyCode);
        KEYS &= ~action;
        if( action != 0 ) 
            evt.preventDefault();
    } );

    setInterval( tick, DT );
};


