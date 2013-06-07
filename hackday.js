MILESTONE_LIMIT = null;

API_URL = 'https://api.github.com/'
$.ajaxSetup({
    headers: { 'Authorization': "token " + AUTH.token ,
               'Accept': 'application/json'
             }
});


issues_cache = {}

REPO = 'shopify';
ORG = 'Shopify';


get_one_issue = function( issue ,cb) {
    var u = 'https://api.github.com/repos/' + ORG + '/' + REPO + '/' + issue.number;
    var h = '';
    
    if( issues_cache[u] ) {
        h = issues_cache[u];
    }

    var ajax = $.ajax( { url: u,
                         header: { 'If-Modified-Since': h },
                         success: function( data ) {
                             issues_cache[u] = ajax.getResponseHeader('Last-Modified');
                             cb(data);
                         }
                       } );
}


get_issues = function( callback, url ) {
    if( !url ) {
        url = 'https://api.github.com/repos/' + ORG + '/'  + REPO + '/' + 'issues';
    }

    var h = '';
    if( issues_cache[url] ) {
        h = issues_cache[url];
    }

    var ajax = $.ajax( { url: url,
                         headers: { 'If-Modified-Since': h },
                         success: function(data) {
                             if (data )
                                 callback(data);
                             else {
                                 callback(null);
                                 return;
                             }

                             var link = ajax.getResponseHeader('Link');
                             link = link.split(',');
                             var links = {};
                             for( var i = 0 ; i < link.length ; ++i ) {
                                 var m = link[i].match(/<(.*)>; rel=\"(.*)\"/);
                                 links[ m[2] ] = m[1];
                             }
                             issues_cache[url] = ajax.getResponseHeader('Last-Modified');

                             if( links.next != links.last ) {
                                 get_issues( callback, links.next );
                             } else {
                                 callback(null);
                             }
                         }
                       });
};

get_url = function(url, callback) {
    $.ajax( { url: url, 
              success: callback
            } );
};

clear_screen = function() {
    context.fillStyle = "rgb(0,0,0)";
    context.fillRect(0,0,800,600);


};

issues = [];
pull_requests = null;
assigned = null;


gen_sprite = function( file, fw, fh, cb ) {
    var spr = {};
    spr.img = new Image();
    spr.img.src = file;
    spr.frame_width = fw;
    spr.frame_height = fh;

    spr.img.onload = function() { 
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


lerp = function(x0,x1,t,d) {
    if( t > d ) {
        t = d;
    } else if( t < 0 ) {
        t = 0;
    }
    t/= d;
    return (x1-x0)*t + x0;
};


ease = function( x0, x1, t, d ){
    if( t > d ) {
        t = d;
    } else if( t < 0 ) {
        t = 0;
    }
    t /= d;
	  return (x1-x0)*t*t + x0;
};



STATE_DEAD  = 0;
STATE_ALIVE = 1;


LEFT  = 1;
RIGHT = 2;
UP    = 4;
DOWN  = 8;

KEYS = 0;

MAX_RADIUS = 600;

//TIME_TO_STARVE =  60 * 1000 * 60 * 24 ;
TIME_TO_STARVE = 30 * 1000;

stars = null;
enemies = [];
enemy_queue = [];
spr = null;
players = [];
bullets = [];
title_bars = []
DO_WARP = false;
warp_time = 0;
global_fade_timer = 0;
stars_rotation = { theta: 0};

FASTEST_BUG = null;

do_warp = function() {
    DO_WARP = true;
    warp_time = 0;
    global_fade_timer = 0;

    Tweener.addTween( stars_rotation, { theta: 0.05, time: 2, onComplete: function() {
        Tweener.addTween( stars_rotation, { theta: -0.05, time: 0.8 } );
    }} );

};
function getLines(ctx, text, maxWidth) {
    var words = text.split(" ");
    var lines = [];
    var currentLine = words[0];

    for (var i = 1; i < words.length; i++) {
        var word = words[i];
        var width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

add_title_bar = function( msgs, player ) {
    var y = 0;

    var lines = [];
    context.font = "20px press_start_2pregular";
    for( var i = 0 ; i < msgs.length ; ++i ) {
        var l = getLines(context,msgs[i], 700 );
        lines = lines.concat( l );

    }

    for ( var i = 0 ; i < lines.length ; ++i ) {
        var t = {}
        t.alpha = 1;
        Tweener.addTween( t, { y: 20 + i*20, time:2, delay:0, onComplete:function(o) {
            setTimeout( function() { 
                Tweener.addTween( o, { alpha: 0, time:1, delay:0, onComplete:function(o) {
                    title_bars.splice( title_bars.indexOf( o ), 1 );
                    if( title_bars.length == 0 ) {
                        do_warp();
                    }
                } } );
            }, 1000 );
        }} );

        t.y = 600 + ( i*40);
        t.dest_y = 40 + i * 20;
        t.msg = lines[i];
        t.time =  0;
        t.total_time = 60;
        if( i == 0 ) {
            t.player = player;
        }
        title_bars.push( t );
    }
};


draw_title_bar = function() {
    context.save();
    context.font = "20px press_start_2pregular";
    context.textAlign = "left";
    context.strokeStyle = "rgb(0,255,255)";
    context.fillStyle = "rgb(255,255,255)";

    for( var i = 0 ; i < title_bars.length ; ++i ) {
        var t = title_bars[i];
        context.globalAlpha = t.alpha;
        context.fillText( t.msg, 110, t.y );
        if( t.player ) {
            context.drawImage( t.player.img, 20, t.y  - 20);
        }
        context.strokeText(t.msg, 110,t.y );
    }
    context.restore();
}

gen_player = function( user )  {
    for( var i = 0 ; i < players.length ; ++i ) {
        if (players[i].user.avatar_url == user.avatar_url ) {
            players[i].radius -= 10;
            return players[i];
        }
    }


    var p = {}
    p.user = user;
    p.img = null;
    p.radius = 300;
    p.theta = get_random( 2* Math.PI );
    p.theta_vel = 0.001;
    p.scale = 0.3;
    p.img = new Image();
    p.img.src = user.avatar_url;
    p.last_food = Date.now();
    players.push(  p );
    return p;
};

to_cartesian = function( t ) {
    t.x = Math.cos(t.theta)*t.radius + 400;
    t.y = Math.sin(t.theta)*t.radius + 300;
};

gen_bullet = function( enemy, player ) {
    var b = {};
    to_cartesian( enemy );
    to_cartesian( player );


    b.x = player.x;
    b.y = player.y;
    enemy.bullet = b;
    b.enemy = enemy;
    b.timer = 128;
    b.player = player;
    bullets.push(b);
};
last_radius = 0
gen_enemy = function(issue) {
    var e = {};
    e.issue = issue;
    e.state = STATE_ALIVE;
    e.radius = 0;
    e.theta = 0;

    var c = issue.comments;

    if( c == 0 ) {
        c = 0.1;
    }

    if( c > 10 ) {
        c = 10;
    }

    e.theta_vel = 0.03 * c;

    if(! issue.assignee ) {
        e.theta_vel *= -1;
    }

    e.radius_vel = get_random( MAX_RADIUS/140 );
    e.bullet_timer = 512;
    e.gonna_eat = 'no';

    e.img = new Image();
    e.img.src = "http://nmrwiki.org/wiki/images/7/7d/Bug.png";


    var d = new Date( issue.updated_at );

    var t = Date.now() - d

    t /= ( 60 * 1000 * 60  * 100);
    t /= 4;
    t = t | 0;

    if( t > 5 ) {
        t = 5;
    } else if( t < 0 ) {
        t  = 1;
    }

    if(last_radius == 0 ) {
        e.radius_target = 20;
        e.theta_target = 0;
        last_radius = 20;
    } else {
        var d = (enemies.length + enemy_queue.length) % 5;
        e.radius_target = 40 + t*40;
        d = d + 1;
        e.theta_target = (2*Math.PI) / ( d);
    }


    e.time = 0;
    e.total_time = 20;
    return e;
};

draw_enemies = function() {
    to_destroy = [] ;
    for( var i = 0 ; i < enemies.length ; ++i ) {
        if( enemies[i].state == STATE_ALIVE ) {
            to_cartesian(enemies[i]);
            context.save();
            context.translate( enemies[i].x, enemies[i].y);
            context.rotate( enemies[i].theta + Math.PI/2 );
            if( enemies[i].img ) {
                enemies[i].img.width=80;
                enemies[i].img.height = 80;
                context.scale(0.1,0.1);
                context.drawImage(enemies[i].img, -enemies[i].img.width/2, -enemies[i].img.height/2);
            }
            else {
                context.fillStyle = "rgb(255,0,0)";
                context.fillRect( -15,-15, 30,30 );
            }
            enemies[i].time += 1;
            if( enemies[i].gonna_eat == 'food') {
                var x = ease( enemies[i].x, enemies[i].player.x, enemies[i].time, enemies[i].total_time );
                var y = ease( enemies[i].y, enemies[i].player.y, enemies[i].time, enemies[i].total_time );
                
                x -= 400;
                y -= 300;

                enemies[i].radius = Math.sqrt( x * x + y * y );
                enemies[i].theta = Math.atan2(y,x );

                if( enemies[i].time > enemies[i].total_time ) {
                    enemies[i].player.scale += 0.3;
                    enemies[i].player.theta_vel = 0.01;
                    enemies[i].state = STATE_DEAD;
                    
                    bullets.splice( bullets.indexOf( enemies[i].bullet ), 1 );
                }

                // it's food lets tell what issue
                context.font = '50px press_start_2pregular';
                context.fillStyle = "rgb(255,255,255)";
                context.scale(10.0,10.0)
                context.fillText( '#' + enemies[i].issue.number, 0, 0 );
            }
            else {
                if( enemies[i].time < enemies[i].total_time ) {
                    enemies[i].radius = ease( enemies[i].radius, enemies[i].radius_target, enemies[i].time, enemies[i].total_time );
                    enemies[i].theta = ease( 0, enemies[i].theta_target, enemies[i].time, enemies[i].total_time );
                } else {
                    enemies[i].theta  += enemies[i].theta_vel*DT_T;
                }

                if( enemies[i].theta > 2*Math.PI ) {
                    enemies[i].theta -= 2*Math.PI;
                }
            }
            
            if( enemies[i].radius > MAX_RADIUS ) {
                enemies[i].radius = 0;
                enemies[i].radius_vel = get_random(MAX_RADIUS/120 );
            }

            context.restore();

            /*
            enemies[i].bullet_timer -= 10
            if( enemies[i].player && enemies[i].bullet_timer < 0 ) {
                // shoot it
                gen_bullet(enemies[i], enemies[i].player );
                enemies[i].bullet_timer = get_random( 512 );
            }
            */
        } else {
            to_destroy.push(i);
        }
    }

    for( var i = 0 ; i < to_destroy.length ; ++i ) {
        enemies.splice( to_destroy[i],1 );
    }
};

draw_bullets = function() {
    to_remove = []
    for( var i = 0 ; i < bullets.length ; ++i ) {
        var b = bullets[i];

        var x = (b.enemy.x - b.player.x);
        var y = (b.enemy.y - b.player.y);
        b.timer -= 1;

        if( b.timer < 0 ) {
            to_remove.push(i);
        }
        context.fillStyle = "rgb(0,0,255)";
        context.strokeStyle = "rgb(0,0,255)";
        context.beginPath();
        context.moveTo( b.player.x, b.player.y );
        context.lineTo( b.enemy.x, b.enemy.y );
        context.stroke();
        context.closePath();
        context.beginPath()
        context.arc( b.enemy.x, b.enemy.y , 10, 0, 2*Math.PI );
        context.fill();
        context.closePath();
        //context.fillRect( x,y, 10,10 );
    }

    for( var i = 0 ; i < to_remove.length ; ++i ) {
        bullets.splice(to_remove[i], 1 );
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
    if( DO_WARP ) {
        warp_time += 10;

        if( warp_time > 500 ) {
            DO_WARP=false;
            
            var t = 500;
            global_fade_timer = 64;
        }
    }
    context.save();
    for( var i = 0 ; i < stars.length ; ++i ) {
        var s = stars[i];
        if( stars[i].time_to_spawn <= 0 ) {
            if( DO_WARP ) {
                context.strokeStyle = "rgb(255,255,255)";
                // ease the wwarp out
                var new_r = ease( stars[i].radius, 0, warp_time,  500 );
                var old_r = s.radius;
                context.save();
                context.beginPath();
                s.theta += stars_rotation.theta;
                to_cartesian(s);
                context.moveTo( s.x,s.y );
                s.radius = new_r;
                to_cartesian( s );
                context.lineTo(s.x,s.y);
                context.stroke();
                context.closePath();
                context.restore();
                s.radius = old_r;
            } else {
                to_cartesian( stars[i] );
                
                context.fillRect(stars[i].x,stars[i].y, 1,1);
                
                stars[i].radius *= 0.98;
            
                
                if( stars[i].radius < 30 ) {
                    stars[i].time_to_spawn = get_random( 100);
                    stars[i].radius = MAX_RADIUS + stars[i].radius;
                }
            }
        } else {
            stars[i].time_to_spawn -= 1*DT_T;
        }
    }
    context.restore();
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
    }

    if( player.theta_vel > 0.5) {
        player.theta_vel = 0.5
    }
    else if( player.theta_vel < -0.5 ) {
        player.theta_vel = -0.5
    }
    if( DO_WARP == false ) 
        draw_enemies();

    if( spr != null ) {
        context.save();
        context.translate(400,300);
        draw_sprite(spr,context);
        update_sprite(spr);
        context.restore();
    }
    draw_bullets();

    for( var i = 0 ; i < players.length ; ++i ) {
        if( players[i].img && players[i].img.width > 0 && players[i].img.height > 0 ) {
            to_cartesian(players[i]);
            context.save();
            context.translate(players[i].x , players[i].y );
            context.rotate( players[i].theta + Math.PI/2 );
            context.scale( players[i].scale,players[i].scale);
            context.drawImage( players[i].img,- players[i].img.width/2,- players[i].img.height/2 );

            context.scale(1.0,1.0);
            
            var t = Date.now() - players[i].last_food;
            if( t > ( TIME_TO_STARVE ) ) {
                players[i].scale -= 0.1;
                if( players[i].scale < 0.1 ) {
                    players[i].scale = 0.1;
                }
                players[i].last_food = Date.now();

                if( players[i].theta_vel > 0 ) {
                    players[i].theta_vel *= -1;
                }
            }
            context.restore();
            if( players[i].theta_vel < 1.0 && players[i].theta_vel > -1.0) {
                players[i].theta += players[i].theta_vel/DT_T;
            }
        }
    }

    if( global_fade_timer > 0 ) {
        context.save();
        var a = ease( 0, 255, global_fade_timer, 64) | 0;
        context.globalAlpha =  (a / 255);
        context.fillStyle = "rgb(" + a + "," + a  +"," + a + ")";
        context.fillRect(0,0,800,600);
        global_fade_timer -= 1;
        context.restore();
    }

    draw_title_bar();

    

};

is_in_array = function(new_issue,array) {
    for( var i = 0 ; i < array.length ; ++i ) {
        if( array[i].number == new_issue.number ) {
            return i;
        }
    }
    return -1;
};


update_issues = function( new_issues ) {
    to_eat = [];
    for( var i = 0 ; i < issues.length ; ++i ) {
        var index = is_in_array( issues[i], new_issues );
        if( i < 0 ) {
            eat_issue( issues[i] );
        }
    }

    for( var i = 0 ; i < new_issues.length ; ++i ) {
        var index = is_in_array(new_issues[i],issues );
        if( index < 0 ) {
            issues.push(new_issues[i] );
            var e = gen_enemy(new_issues[i] );
            
            if( new_issues[i].assignee ) {
                var p = gen_player( new_issues[i].assignee );
                e.player = p;
            }
            enemy_queue.push( e );
        } 
    }

};


eat_issue = function( e )  {
    if( e.player ) {
        console.log('eating');
        e.gonna_eat = 'food';
        e.player.theta_vel = 0;
        e.radius_target = e.player.radius;
        if( e.player.theta > e.theta ) 
            e.theta_target = e.player.theta;
        else 
            e.theta_target = - e.player.theta;

        e.o_theta = e.theta;
        e.total_time = 100;
        e.time = 0;
        //gen_bullet( e, e.player );
        add_title_bar( [ '' + e.player.user.login + ' just closed a ticket!',
                         '' + e.issue.title ] , e.player );
        e.player.last_food = Date.now();
        e.player.theta_vel += 0.01;
        if( e.player.theta_vel > 0.5 ) {
            e.player.theta_vel = 0.5;
        }
    }
};

check_for_closed = function() {

    for( var i = 0 ; i < issues.length ; ++i ) {
        get_one_issue( issues[i] , function( updated_issue ) {
            if( updated_issue.state == 'closed' ) {
                eat_issue( updated_issue );
            }
        } );
    }
};


update_github_data = function() {
    var updated_issues = [];
    get_issues( function(data) {
        if( data ) {
            updated_issues = updated_issues.concat(data);
        } else {
            update_issues(updated_issues );
        }
    } );
};
(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

start_game = function() {
    user = null;
    org = null
    update_github_data();

    setInterval( update_github_data, 60*1000 );

    setInterval( function() {
        if( enemy_queue.length > 0 ) {
            enemies.push( enemy_queue.pop() ) ;
        }
    }, 500 );

    /* ---- DEMO MODE ----- */
    setTimeout( function() {
        setInterval( function() { 
                                  for( var i = 0 ; i < enemies.length ; ++i ) {
                                      if( enemies[i].state == STATE_ALIVE ) {
                                          enemies[i].player = players[ get_random( players.length) | 0];
                                          if( enemies[i].player ) {
                                              eat_issue( enemies[i] );
                                              return;
                                          }
                                      }
                                  }
                                }, 13*1000 )
    }, 1*1000 ); 
                                  


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
        if( evt.keyCode == 32 ) {
            for( var i = 0 ; i < enemies.length ; ++i ) {
                if( enemies[i].state == STATE_ALIVE ) {
                    enemies[i].player = players[ get_random( players.length) | 0];
                    if( enemies[i].player ) {
                        eat_issue( enemies[i] );
                        return;
                    }
                }
            } 
        }


        var action = code_to_action(evt.keyCode);
        KEYS &= ~action;
        if( action != 0 ) 
            evt.preventDefault();
    } );

    setInterval( function() {
        window.requestAnimationFrame( tick );
    }, DT );
};
