function racer(gamemode) {
    var fps            = 60;                      // how many 'update' frames per second
    var step           = 1/fps;                   // how long is each frame (in seconds)
    var width          = 1024;                    // logical canvas width
    var height         = 768;                     // logical canvas height
    var centrifugal    = 0.3;                     // centrifugal force multiplier when going around curves
    var offRoadDecel   = 0.99;                    // speed multiplier when off road (e.g. you lose 2% speed each update frame)
    var skySpeed       = 0.001;                   // background sky layer scroll speed when going around curve (or up hill)
    var hillSpeed      = 0.002;                   // background hill layer scroll speed when going around curve (or up hill)
    var treeSpeed      = 0.003;                   // background tree layer scroll speed when going around curve (or up hill)
    var skyOffset      = 0;                       // current sky scroll offset
    var hillOffset     = 0;                       // current hill scroll offset
    var treeOffset     = 0;                       // current tree scroll offset
    var segments       = [];                      // array of road segments
    var cars           = [];                      // array of cars on the road
    var stats          = Game.stats('fps');       // mr.doobs FPS counter
    var canvas         = Dom.get('canvas');       // our canvas...
    var ctx            = canvas.getContext('2d'); // ...and its drawing context
    var background     = null;                    // our background image (loaded below)
    var sprites        = null;                    // our spritesheet (loaded below)
    var resolution     = null;                    // scaling factor to provide resolution independence (computed)
    var roadWidth      = 2000;                    // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
    var segmentLength  = 200;                     // length of a single segment
    var rumbleLength   = 3;                       // number of segments per red/white rumble strip
    var trackLength    = null;                    // z length of entire track (computed)
    var lanes          = 3;                       // number of lanes
    var fieldOfView    = 100;                     // angle (degrees) for field of view
    var cameraHeight   = 1000;                    // z height of camera
    var cameraDepth    = null;                    // z distance camera is from screen (computed)
    var drawDistance   = 300;                     // number of segments to draw
    var playerX        = 0;                       // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
    var playerZ        = null;                    // player relative z distance from camera (computed)
    var fogDensity     = 5;                       // exponential fog density
    var position       = 0;                       // current camera Z position (add playerZ to get player's absolute Z position)
    var speed          = 0;                       // current speed
    var maxSpeed       = segmentLength/step;      // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
    var accel          =  maxSpeed/5;             // acceleration rate - tuned until it 'felt' right
    var breaking       = -maxSpeed;               // deceleration rate when braking
    var decel          = -maxSpeed/5;             // 'natural' deceleration rate when neither accelerating, nor braking
    var offRoadDecel   = -maxSpeed/2;             // off road deceleration is somewhere in between
    var offRoadLimit   =  maxSpeed/4;             // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)
    var totalCars      = 20;                     // total number of cars on the road
    var currentLapTime = 0;                       // current lap time
    var lastLapTime    = null;                    // last lap time
    var enableTilt = false;                          // enable horizon tilt
    var currentRotation = 0;                     // horizon tilt initialization
    var randomTrack = true;                     // enable random procedural generation of the track
    var randomTrackLength = 5;                  // if random track is enable, how many track segments/constructs to build?
    //var gamemode = 1;                               // Gamemode: 0: fastest lap, 1: out of time DEPRECATED: defined as argument now

    // Gamemode 1: out of time
    var remainingTime = 0;                         // internal variable - remaining time left to pass the next finish line or it's game over, will be calculated automatically
    var difficultyStart = 4;                         // Starting difficulty (track length)
    var difficultyIncrement = 0.5;                // How much to increment the difficulty (and track length) each time player finish a track?
    var difficultyGap = 2.0;                          // After how many track finishes do we start to increase the difficulty in terms of number of cars on road, number of turns, etc
    var difficultyMax = 14;                      // Maximum difficulty, after this there will be no increase in difficulty
    var difficultyCurrent = difficultyStart;    // Current difficulty (will be modified ingame)
    var remainingTimeIncrease = 0.00009;                      // Multiplier of the trackLength to get seconds that will be added to the remainingTime, in other words this defines the time left to the player to finish the track proportionally to the track length (a higher value makes the game easier)
    var remainingTimeStartBonus = 2.0;                      // Multiplier of the remaining time given for the first level (to make game easier for newscomers), also because the player has no momentum at the beginning
    var remainingTimeThreshold = 20;      // When only this amount of time is left, the remaining time HUD will be highlighted (set to 0 to disable)
    var currentLevel = 0;                           // Internal variable, just a value to display the current level
    var gameOverFlag = false;                       // this flag will be set if game over was triggered
    var changeBackgroundEvery = 3;              // change the background image every few levels, set to 0 to disable
    var changeBackgroundCurrentAlpha = 0.0;          // internal variable from 0.0 to 1.0 to specify the current state of background switching (via progressing blending animation)
    var currentBackground = 0;                      // internal variable to track which background we currently draw
    var changeBackgroundFlag = false;           // internal variable to start the background change
    var turboLeft = 3;                                      // number of turbos left
    var turboDuration = 10.0;                            // duration of turbo in seconds
    var turboAnimation = 2.0;                           // duration of animation to do progressive increase/decrease of fov
    var turboFovIncrement = 1.4;                        // multiplier of fov during turbo
    var turboMaxSpeed = maxSpeed * 1.5;         // maximum speed under turbo
    var turboGiveEvery = changeBackgroundEvery;     // give a new turbo every x levels (set to 0 to disable)
    var turboCentrifugal = centrifugal/2;                         // torque when under turbo (else the player cannot turn in curves)
    var turboTriggered = false;                         // internal variable - turbo triggered by player?
    var turboTimeDone = 0.0;                             // internal variable - turbo being consumed, since how much time (allow to do animation and such)
    var turboCurrentFov = fieldOfView;              // internal variable - current fov while doing turbo

    var keyLeft        = false;
    var keyRight       = false;
    var keyFaster      = false;
    var keySlower      = false;

    // Add variables to update HUD
    var hud = {
      speed:            { value: null, dom: Dom.get('speed_value')            },
      current_lap_time: { value: null, dom: Dom.get('current_lap_time_value') },
      current_level: { value: null, dom: Dom.get('current_level_value') },
      remaining_time: { value: null, dom: Dom.get('remaining_time_value') },
      last_lap_time:    { value: null, dom: Dom.get('last_lap_time_value')    },
      fast_lap_time:    { value: null, dom: Dom.get('fast_lap_time_value')    },
    }

    if (gamemode == 1) {
        // Out of time gamemode-only HUD elements
        hud["turbo_left"] = { value: null, dom: Dom.get('turbo_left_value') }
    }

    // Hide either the current lap time or the remaining time HUD meter according to the selected gamemode
    if (gamemode == 1) {
        document.getElementById('current_lap_time').style.display = 'none';
        document.getElementById('fast_lap_time').style.display = 'none';
        document.getElementById('last_lap_time').style.display = 'none';
    } else {
        try {
            document.getElementById('remaining_time').style.display = 'none';
            document.getElementById('current_level').style.display = 'none';
            document.getElementById('turbo_left').style.display = 'none';
        } catch(exc) {};
    }

    //=========================================================================
    // UPDATE THE GAME WORLD
    //=========================================================================

    function update(dt) {

      var n, car, carW, sprite, spriteW;
      var playerSegment = findSegment(position+playerZ);
      var playerW       = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE;
      var speedPercent  = speed/maxSpeed;
      var dx            = dt * 2 * speedPercent; // at top speed, should be able to cross from left to right (-1 to 1) in 1 second
      var startPosition = position;

      updateCars(dt, playerSegment, playerW);

      position = Util.increase(position, dt * speed, trackLength);

      if (!gameOverFlag) {
          if (keyLeft)
            playerX = playerX - dx;
          else if (keyRight)
            playerX = playerX + dx;
      }

      if (turboTriggered && gamemode == 1) {
        // give more torque under turbo
        playerX = playerX - (dx * speedPercent * playerSegment.curve * turboCentrifugal);
      } else {
        // else manage the torque as usual
        playerX = playerX - (dx * speedPercent * playerSegment.curve * centrifugal);
      }

      if (!gameOverFlag) {
          if (keyFaster)
            speed = Util.accelerate(speed, accel, dt);
          else if (keySlower)
            speed = Util.accelerate(speed, breaking, dt);
          else
            speed = Util.accelerate(speed, decel, dt);
      } else { // game over flag, just decelerate the car until full stop
        speed = Util.accelerate(speed, decel, dt);
      }


      if ((playerX < -1) || (playerX > 1)) {

        if (speed > offRoadLimit)
          speed = Util.accelerate(speed, offRoadDecel, dt);

        for(n = 0 ; n < playerSegment.sprites.length ; n++) {
          sprite  = playerSegment.sprites[n];
          spriteW = sprite.source.w * SPRITES.SCALE;
          if (Util.overlap(playerX, playerW, sprite.offset + spriteW/2 * (sprite.offset > 0 ? 1 : -1), spriteW)) {
            speed = maxSpeed/5;
            position = Util.increase(playerSegment.p1.world.z, -playerZ, trackLength); // stop in front of sprite (at front of segment)
            break;
          }
        }
      }

      for(n = 0 ; n < playerSegment.cars.length ; n++) {
        car  = playerSegment.cars[n];
        carW = car.sprite.w * SPRITES.SCALE;
        if (speed > car.speed) {
          if (Util.overlap(playerX, playerW, car.offset, carW, 0.8)) {
            speed    = car.speed * (car.speed/speed);
            position = Util.increase(car.z, -playerZ, trackLength);
            break;
          }
        }
      }

      playerX = Util.limit(playerX, -3, 3);     // dont ever let it go too far out of bounds
      if (!turboTriggered) {
        // Normal speed limit, no turbo
        speed   = Util.limit(speed, 0, maxSpeed); // or exceed maxSpeed
      } else if (gamemode == 1) {
        // Turbo management
        speed   = Util.limit(speed, 0, turboMaxSpeed); // do not exceed turbo max speed
        accel = turboMaxSpeed / 3; // increase acceleration
        turboTimeDone += dt; // increase the current consumed time of turbo
        if (turboTimeDone < turboDuration) {
            // if turbo time is left, we can continue
            if (turboTimeDone < turboAnimation) {
                // turbo initialization animation, increase fov
                turboFov = fieldOfView * turboFovIncrement;
                if (turboCurrentFov < turboFov) {
                    turboCurrentFov += (turboFov - fieldOfView) * (dt/turboAnimation);
                    updateFOV(turboCurrentFov);
                }
            } else if (turboDuration <= (turboTimeDone + turboAnimation)) {
                // turbo end animation, decrease fov
                if (turboCurrentFov > fieldOfView) {
                    turboCurrentFov -= (turboFov - fieldOfView) * (dt/turboAnimation);
                    updateFOV(turboCurrentFov);
                }
                if (speed > maxSpeed) {
                    // also decrease speed gradually
                    speed -= (turboMaxSpeed - maxSpeed) * (dt/turboAnimation)*3; // *3 is magic value to overcome the fact that the car will still get acceleration next frame and is still capped at turboMaxSpeed (see Util.limit above). By multiplying by 2 we cancel the next increase.
                }
            }
        } else {
            // no turbo time left, disable the turbo mode
            turboTriggered = false;
            updateFOV(fieldOfView); // reinit fieldOfView
        }
      }

      skyOffset  = Util.increase(skyOffset,  skySpeed  * playerSegment.curve * (position-startPosition)/segmentLength, 1);
      hillOffset = Util.increase(hillOffset, hillSpeed * playerSegment.curve * (position-startPosition)/segmentLength, 1);
      treeOffset = Util.increase(treeOffset, treeSpeed * playerSegment.curve * (position-startPosition)/segmentLength, 1);

      if (position > playerZ) {
        if (currentLapTime && (startPosition < playerZ)) { // arrived at finish line, update last lap time + generate new track if enabled
          if (gamemode == 1) { // Out of time gamemode
            // Increase level (only useful for display, internally we use difficultyCurrent)
            currentLevel += 1;
            // Give the player some more time
            var remainingTimePast = remainingTime;
            remainingTime += trackLength * remainingTimeIncrease;
            if ((remainingTimePast < remainingTimeThreshold) & (remainingTime > remainingTimeThreshold)) {
                Dom.removeClassName('remaining_time_value', 'warninglow'); // remove any warning if there was one
                Dom.addClassName('remaining_time_value', 'value');
            }
            // Increase current difficulty unless we are already at the max
            if (difficultyCurrent < difficultyMax) {
                difficultyCurrent += difficultyIncrement;
            }
            if (randomTrack) { // generate procedurally a new track when arriving at the finish line according to difficulty
                // Generate a new track length according to difficulty
                randomTrackLength = Math.floor(difficultyCurrent);
                // Regenerate the new track
                resetRoad(randomTrack, randomTrackLength);
                // If we crossed the difficulty gap (ie, every few levels), then we increase the number of cars
                if (((difficultyCurrent % difficultyGap) == 0) & (difficultyCurrent < difficultyMax)) {
                    // Double the number of cars (keep in mind the track extended and we kept the same number of cars, so it's not too much to double)
                    totalCars += Math.floor(totalCars);
                    // And we redraw all cars TODO: make it look better (cars on screen at finish line will disappear)
                    resetCars();
                }
            }
            // Change background if enabled and we have passed enough levels
            if ((changeBackgroundEvery > 0) & (currentLevel % changeBackgroundEvery == 0)) {
                changeBackgroundFlag = true;
            }
            // Add a turbo if passed enough levels
            if ((turboGiveEvery > 0) & (currentLevel % turboGiveEvery == 0)) {
                turboLeft += 1;
            }
          } else { // fastest lap time gamemode
              lastLapTime    = currentLapTime;
              currentLapTime = 0;
              if ((lastLapTime <= Util.toFloat(Dom.storage.fast_lap_time)) | (Util.toFloat(Dom.storage.fast_lap_time) == 0)) {
                Dom.storage.fast_lap_time = lastLapTime;
                updateHud('fast_lap_time', formatTime(lastLapTime));
                Dom.addClassName('fast_lap_time', 'fastest');
                Dom.addClassName('last_lap_time', 'fastest');
              } else {
                Dom.removeClassName('fast_lap_time', 'fastest');
                Dom.removeClassName('last_lap_time', 'fastest');
              }
              updateHud('last_lap_time', formatTime(lastLapTime));
              Dom.show('last_lap_time');
          }
        } else {
          // Else we are not yet at the finish line, we increase the time/decrease remaining time
          currentLapTime += dt;
          if (remainingTime > 0) {
            remainingTime -= dt;
          } else {
            remainingTime = 0;
            if (currentLevel == 0) { // first level, we give some time to the player
                remainingTime += trackLength * remainingTimeIncrease * remainingTimeStartBonus;
            }
          }

          // Highlight remaining time if quite low
          if ((gamemode == 1) & (remainingTime < remainingTimeThreshold)) {
            Dom.removeClassName('remaining_time_value', 'value');
            Dom.addClassName('remaining_time_value', 'warninglow');
          }

          // Highlight turbo when in use
          if (gamemode == 1) {
              if (turboTriggered) {
                Dom.addClassName('turbo_left', 'magenta');
              } else {
                Dom.removeClassName('turbo_left', 'magenta');
              }
          }

          // Call game over if conditions are met
          if ((gamemode == 1) & (remainingTime <= 0)) { // gamemode out of time and no remaining time left
            gameOverFlag = true;
          }
        }
      }

      // Update HUD
      updateHud('speed',            5 * Math.round(speed/500));
      if (gamemode == 1) {
        updateHud('remaining_time', formatTime(remainingTime));
        updateHud('current_level', currentLevel);
        updateHud('turbo_left', turboLeft);
      } else {
        updateHud('current_lap_time', formatTime(currentLapTime));
      }
    }

    //-------------------------------------------------------------------------

    function updateCars(dt, playerSegment, playerW) {
      var n, car, oldSegment, newSegment;
      for(n = 0 ; n < cars.length ; n++) {
        car         = cars[n];
        oldSegment  = findSegment(car.z);
        car.offset  = car.offset + updateCarOffset(car, oldSegment, playerSegment, playerW);
        car.z       = Util.increase(car.z, dt * car.speed, trackLength);
        car.percent = Util.percentRemaining(car.z, segmentLength); // useful for interpolation during rendering phase
        newSegment  = findSegment(car.z);
        if (oldSegment != newSegment) {
          index = oldSegment.cars.indexOf(car);
          oldSegment.cars.splice(index, 1);
          newSegment.cars.push(car);
        }
      }
    }

    function updateCarOffset(car, carSegment, playerSegment, playerW) {

      var i, j, dir, segment, otherCar, otherCarW, lookahead = 20, carW = car.sprite.w * SPRITES.SCALE;

      // optimization, dont bother steering around other cars when 'out of sight' of the player
      if ((carSegment.index - playerSegment.index) > drawDistance)
        return 0;

      for(i = 1 ; i < lookahead ; i++) {
        segment = segments[(carSegment.index+i)%segments.length];

        if ((segment === playerSegment) && (car.speed > speed) && (Util.overlap(playerX, playerW, car.offset, carW, 1.2))) {
          if (playerX > 0.5)
            dir = -1;
          else if (playerX < -0.5)
            dir = 1;
          else
            dir = (car.offset > playerX) ? 1 : -1;
          return dir * 1/i * (car.speed-speed)/maxSpeed; // the closer the cars (smaller i) and the greated the speed ratio, the larger the offset
        }

        for(j = 0 ; j < segment.cars.length ; j++) {
          otherCar  = segment.cars[j];
          otherCarW = otherCar.sprite.w * SPRITES.SCALE;
          if ((car.speed > otherCar.speed) && Util.overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)) {
            if (otherCar.offset > 0.5)
              dir = -1;
            else if (otherCar.offset < -0.5)
              dir = 1;
            else
              dir = (car.offset > otherCar.offset) ? 1 : -1;
            return dir * 1/i * (car.speed-otherCar.speed)/maxSpeed;
          }
        }
      }

      // if no cars ahead, but I have somehow ended up off road, then steer back on
      if (car.offset < -0.9)
        return 0.1;
      else if (car.offset > 0.9)
        return -0.1;
      else
        return 0;
    }

    //-------------------------------------------------------------------------

    function updateHud(key, value) { // accessing DOM can be slow, so only do it if value has changed
      if (hud[key].value !== value) {
        hud[key].value = value;
        Dom.set(hud[key].dom, value);
      }
    }

    function formatTime(dt) {
      var minutes = Math.floor(dt/60);
      var seconds = Math.floor(dt - (minutes * 60));
      var tenths  = Math.floor(10 * (dt - Math.floor(dt)));
      if (minutes > 0)
        return minutes + "." + (seconds < 10 ? "0" : "") + seconds + "." + tenths;
      else
        return seconds + "." + tenths;
    }

    //=========================================================================
    // RENDER THE GAME WORLD
    //=========================================================================

    function render() {

      var baseSegment   = findSegment(position);
      var basePercent   = Util.percentRemaining(position, segmentLength);
      var playerSegment = findSegment(position+playerZ);
      var playerPercent = Util.percentRemaining(position+playerZ, segmentLength);
      var playerY       = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
      var maxy          = height;

      var x  = 0;
      var dx = - (baseSegment.curve * basePercent);

      // Clear the canvas
      ctx.clearRect(0, 0, width, height);

      // Order the background layers
      if (currentBackground == 0) {
        // Build the list of positions in the image to extract the appropriate background
        // Depending on the current background, load as current the night or day version
        background_pos_cur = [BACKGROUND.SKY, BACKGROUND.HILLS, BACKGROUND.TREES];
        background_pos_next = [BACKGROUND.SKY2, BACKGROUND.HILLS2, BACKGROUND.TREES2];
      } else {
        background_pos_cur = [BACKGROUND.SKY2, BACKGROUND.HILLS2, BACKGROUND.TREES2];
        background_pos_next = [BACKGROUND.SKY, BACKGROUND.HILLS, BACKGROUND.TREES];
      }
      // Draw the background layers
      if (!changeBackgroundFlag) {
          // No switching, we draw one set of backgrounds
          Render.background(ctx, background, width, height, background_pos_cur[0], skyOffset,  resolution * skySpeed  * playerY, 1.0);
          Render.background(ctx, background, width, height, background_pos_cur[1], hillOffset, resolution * hillSpeed * playerY, 1.0);
          Render.background(ctx, background, width, height, background_pos_cur[2], treeOffset, resolution * treeSpeed * playerY, 1.0);
      } else {
          // else we are in the process of switching, do a progressive blending
          // continue the blending
          changeBackgroundCurrentAlpha += 0.01; // increase the alpha for one, and decrease for the next background set
          Render.background(ctx, background, width, height, background_pos_cur[0], skyOffset,  resolution * skySpeed  * playerY, 1.0-changeBackgroundCurrentAlpha);
          Render.background(ctx, background, width, height, background_pos_cur[1], hillOffset, resolution * hillSpeed * playerY, 1.0-changeBackgroundCurrentAlpha);
          Render.background(ctx, background, width, height, background_pos_cur[2], treeOffset, resolution * treeSpeed * playerY, 1.0-changeBackgroundCurrentAlpha);
          Render.background(ctx, background, width, height, background_pos_next[0], skyOffset,  resolution * skySpeed  * playerY, changeBackgroundCurrentAlpha);
          Render.background(ctx, background, width, height, background_pos_next[1], hillOffset, resolution * hillSpeed * playerY, changeBackgroundCurrentAlpha);
          Render.background(ctx, background, width, height, background_pos_next[2], treeOffset, resolution * treeSpeed * playerY, changeBackgroundCurrentAlpha);
          if (changeBackgroundCurrentAlpha >= 1.0) {
              // blending is done, disable the flags and reinit all related vars
              // Note: it is important to still do the drawing (and not put it in an if statement) because else the last drawing won't be done, there will be no background for a split-second and this will produce a flickering effect
              currentBackground = (currentBackground + 1) % 2
              changeBackgroundCurrentAlpha = 0.0;
              changeBackgroundFlag = false;
          }
      }

      var n, i, segment, car, sprite, spriteScale, spriteX, spriteY;

      for(n = 0 ; n < drawDistance ; n++) {

        segment        = segments[(baseSegment.index + n) % segments.length];
        segment.looped = segment.index < baseSegment.index;
        segment.fog    = Util.exponentialFog(n/drawDistance, fogDensity);
        segment.clip   = maxy;

        Util.project(segment.p1, (playerX * roadWidth) - x,      playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
        Util.project(segment.p2, (playerX * roadWidth) - x - dx, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);

        x  = x + dx;
        dx = dx + segment.curve;

        if ((segment.p1.camera.z <= cameraDepth)         || // behind us
            (segment.p2.screen.y >= segment.p1.screen.y) || // back face cull
            (segment.p2.screen.y >= maxy))                  // clip by (already rendered) hill
          continue;

        Render.segment(ctx, width, lanes,
                       segment.p1.screen.x,
                       segment.p1.screen.y,
                       segment.p1.screen.w,
                       segment.p2.screen.x,
                       segment.p2.screen.y,
                       segment.p2.screen.w,
                       segment.fog,
                       segment.color);

        maxy = segment.p1.screen.y;
      }

      for(n = (drawDistance-1) ; n > 0 ; n--) {
        segment = segments[(baseSegment.index + n) % segments.length];

        for(i = 0 ; i < segment.cars.length ; i++) {
          car         = segment.cars[i];
          sprite      = car.sprite;
          spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
          spriteX     = Util.interpolate(segment.p1.screen.x,     segment.p2.screen.x,     car.percent) + (spriteScale * car.offset * roadWidth * width/2);
          spriteY     = Util.interpolate(segment.p1.screen.y,     segment.p2.screen.y,     car.percent);
          Render.sprite(ctx, width, height, resolution, roadWidth, sprites, car.sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip);
        }

        for(i = 0 ; i < segment.sprites.length ; i++) {
          sprite      = segment.sprites[i];
          spriteScale = segment.p1.screen.scale;
          spriteX     = segment.p1.screen.x + (spriteScale * sprite.offset * roadWidth * width/2);
          spriteY     = segment.p1.screen.y;
          Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite.source, spriteScale, spriteX, spriteY, (sprite.offset < 0 ? -1 : 0), -1, segment.clip);
        }

        if (segment == playerSegment) {
          Render.player(ctx, width, height, resolution, roadWidth, sprites, speed/maxSpeed,
                        cameraDepth/playerZ,
                        width/2,
                        (height/2) - (cameraDepth/playerZ * Util.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * height/2),
                        speed * (keyLeft ? -1 : keyRight ? 1 : 0),
                        playerSegment.p2.world.y - playerSegment.p1.world.y);
        }
      }
			
      // start horizon tilt
      if (enableTilt) {
        rotation=0;
        if (baseSegment.curve==0) {
            rotation=-currentRotation;
            currentRotation=0;
        } else {
            newrot = Math.round(baseSegment.curve*speed/maxSpeed*100)/100;
            rotation=newrot - currentRotation ;
            currentRotation = newrot ;
        }
        if (rotation!=0) {
            //ctx.save(); // doesn't help with moire problem
            ctx.translate(canvas.width/2,canvas.height/2);
            ctx.rotate(-rotation*(Math.PI/90));
            ctx.translate(-canvas.width/2,-canvas.height/2);
            //ctx.restore();
        }
      }

      // Draw "Game Over" screen
      if (gameOverFlag) {
          ctx.font = "3em Arial";
          ctx.fillStyle = "magenta";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
          ctx.fillText("(refresh to restart)", canvas.width/2, canvas.height/1.5);
      }
    }

    function findSegment(z) {
      return segments[Math.floor(z/segmentLength) % segments.length]; 
    }

    //=========================================================================
    // BUILD ROAD GEOMETRY
    //=========================================================================

    function lastY() { return (segments.length == 0) ? 0 : segments[segments.length-1].p2.world.y; }

    function addSegment(curve, y) {
      var n = segments.length;
      segments.push({
          index: n,
             p1: { world: { y: lastY(), z:  n   *segmentLength }, camera: {}, screen: {} },
             p2: { world: { y: y,       z: (n+1)*segmentLength }, camera: {}, screen: {} },
          curve: curve,
        sprites: [],
           cars: [],
          color: Math.floor(n/rumbleLength)%2 ? COLORS.DARK : COLORS.LIGHT
      });
    }

    function addSprite(n, sprite, offset) {
      segments[n].sprites.push({ source: sprite, offset: offset });
    }

    function addRoad(enter, hold, leave, curve, y) {
      var startY   = lastY();
      var endY     = startY + (Util.toInt(y, 0) * segmentLength);
      var n, total = enter + hold + leave;
      for(n = 0 ; n < enter ; n++)
        addSegment(Util.easeIn(0, curve, n/enter), Util.easeInOut(startY, endY, n/total));
      for(n = 0 ; n < hold  ; n++)
        addSegment(curve, Util.easeInOut(startY, endY, (enter+n)/total));
      for(n = 0 ; n < leave ; n++)
        addSegment(Util.easeInOut(curve, 0, n/leave), Util.easeInOut(startY, endY, (enter+hold+n)/total));
    }

    var ROAD = {
      LENGTH: { NONE: 0, SHORT:  25, MEDIUM:   50, LONG:  100 },
      HILL:   { NONE: 0, LOW:    20, MEDIUM:   40, HIGH:   60 },
      CURVE:  { NONE: 0, EASY:    2, MEDIUM:    4, HARD:    6 }
    };

    function addStraight(num) {
      num = num || ROAD.LENGTH.MEDIUM;
      addRoad(num, num, num, 0, 0);
    }

    function addHill(num, height) {
      num    = num    || ROAD.LENGTH.MEDIUM;
      height = height || ROAD.HILL.MEDIUM;
      addRoad(num, num, num, 0, height);
    }

    function addCurve(num, curve, height) {
      num    = num    || ROAD.LENGTH.MEDIUM;
      curve  = curve  || ROAD.CURVE.MEDIUM;
      height = height || ROAD.HILL.NONE;
      addRoad(num, num, num, curve, height);
    }
        
    function addLowRollingHills(num, height) {
      num    = num    || ROAD.LENGTH.SHORT;
      height = height || ROAD.HILL.LOW;
      addRoad(num, num, num,  0,                height/2);
      addRoad(num, num, num,  0,               -height);
      addRoad(num, num, num,  ROAD.CURVE.EASY,  height);
      addRoad(num, num, num,  0,                0);
      addRoad(num, num, num, -ROAD.CURVE.EASY,  height/2);
      addRoad(num, num, num,  0,                0);
    }

    function addSCurves() {
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.EASY,    ROAD.HILL.NONE);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,   ROAD.CURVE.MEDIUM,  ROAD.HILL.MEDIUM);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,   ROAD.CURVE.EASY,   -ROAD.HILL.LOW);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.EASY,    ROAD.HILL.MEDIUM);
      addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM,  -ROAD.CURVE.MEDIUM, -ROAD.HILL.MEDIUM);
    }

    function addBumps() {
      addRoad(10, 10, 10, 0,  5);
      addRoad(10, 10, 10, 0, -2);
      addRoad(10, 10, 10, 0, -5);
      addRoad(10, 10, 10, 0,  8);
      addRoad(10, 10, 10, 0,  5);
      addRoad(10, 10, 10, 0, -7);
      addRoad(10, 10, 10, 0,  5);
      addRoad(10, 10, 10, 0, -2);
    }

    function addDownhillToEnd(num) {
      num = num || 200;
      addRoad(num, num, num, -ROAD.CURVE.EASY, -lastY()/segmentLength);
    }

    function resetRoad(random, mintracklength) {
      segments = [];

      random = true;
      if (random==true) {
        // Build the list of possible constructs
        var constructs = ['straight', 'scurves', 'curve', 'bumps', 'hill', 'lowrollinghills'];
        // Minimum track length needs to be 2 (between start and end), else it will fail
        if (!mintracklength) {
            mintracklength = 2;
        }

        // Build start part of the track
        addStraight(ROAD.LENGTH.LONG); // use a long road length to hide the regeneration of the next track when arriving at finish line. TODO: fix this by preloading in parallel the new track, and when riding the last construct before the finish line, modify the rendering functions to render the new track

        // Procedurally and randomly build the rest of the track
        i = -1;
        while ((i+=1) < mintracklength) { // TODO: sometimes, 2 tracks are not enough and the loading fails, try to find out why? (there must be an incompatibility between constructs somewhere)
            // Pick randomly a construct
            var randc = constructs[Math.floor(Math.random() * constructs.length)];
            if (randc == 'straight') {
                var posvals = [ROAD.LENGTH.SHORT, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.LONG, null];
                var randval = posvals[Math.floor(Math.random() * posvals.length)];
                addStraight(randval);
            } else if (randc == 'scurves') {
                addSCurves();
            } else if (randc == 'curve') {
                var posroad = [ROAD.LENGTH.SHORT, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.LONG];
                var randroad = posroad[Math.floor(Math.random() * posroad.length)];
                var poscurve = [ROAD.CURVE.SHORT, ROAD.CURVE.MEDIUM, ROAD.CURVE.LONG];
                var randcurve = poscurve[Math.floor(Math.random() * poscurve.length)];
                var poshill = [ROAD.HILL.LOW, ROAD.HILL.MEDIUM, ROAD.HILL.HIGH];
                var randhill = poshill[Math.floor(Math.random() * poshill.length)];
                addCurve(randroad, randcurve, randhill);
            } else if (randc == 'bumps') {
                addBumps();
            } else if (randc == 'hill') {
                var posroad = [ROAD.LENGTH.SHORT, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.LONG];
                var randroad = posroad[Math.floor(Math.random() * posroad.length)];
                var poshill = [ROAD.HILL.LOW, ROAD.HILL.MEDIUM, ROAD.HILL.HIGH];
                var randhill = poshill[Math.floor(Math.random() * poshill.length)];
                addHill(randroad, randhill);
            } else if (randc == 'curve') {
                addLowRollingHills();
            }
        }
        // Build end part of the track
        addDownhillToEnd();
      } else {
          addStraight(ROAD.LENGTH.SHORT);
          addLowRollingHills();
          addSCurves();
          addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
          addBumps();
          addLowRollingHills();
          addCurve(ROAD.LENGTH.LONG*2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
          addStraight();
          addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
          addSCurves();
          addCurve(ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
          addHill(ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
          addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
          addBumps();
          addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
          addStraight();
          addSCurves();
          addDownhillToEnd();
      }

      try { // workaround for the exception raised sometimes when the tracklength is too small (<5). TODO: fix the root cause of this.
        resetSprites(); // reset (or create) the environmental sprites
      } catch (exc) {console.log(exc);}
      //resetCars(); // don't necessarily reset cars, if we generate procedurally we just want the cars to continue

      segments[findSegment(playerZ).index + 2].color = COLORS.START;
      segments[findSegment(playerZ).index + 3].color = COLORS.START;
      for(var n = 0 ; n < rumbleLength ; n++)
        segments[segments.length-1-n].color = COLORS.FINISH;

      trackLength = segments.length * segmentLength;
    }

    function resetSprites() {
      var n, i;

      addSprite(20,  SPRITES.BILLBOARD07, -1);
      addSprite(40,  SPRITES.BILLBOARD06, -1);
      addSprite(60,  SPRITES.BILLBOARD08, -1);
      addSprite(80,  SPRITES.BILLBOARD09, -1);
      addSprite(100, SPRITES.BILLBOARD01, -1);
      addSprite(120, SPRITES.BILLBOARD02, -1);
      addSprite(140, SPRITES.BILLBOARD03, -1);
      addSprite(160, SPRITES.BILLBOARD04, -1);
      addSprite(180, SPRITES.BILLBOARD05, -1);

      addSprite(240,                  SPRITES.BILLBOARD07, -1.2);
      addSprite(240,                  SPRITES.BILLBOARD06,  1.2);
      addSprite(segments.length - 25, SPRITES.BILLBOARD07, -1.2);
      addSprite(segments.length - 25, SPRITES.BILLBOARD06,  1.2);

      for(n = 10 ; n < 200 ; n += 4 + Math.floor(n/100)) {
        addSprite(n, SPRITES.PALM_TREE, 0.5 + Math.random()*0.5);
        addSprite(n, SPRITES.PALM_TREE,   1 + Math.random()*2);
      }

      for(n = 250 ; n < 1000 ; n += 5) {
        addSprite(n,     SPRITES.COLUMN, 1.1);
        addSprite(n + Util.randomInt(0,5), SPRITES.TREE1, -1 - (Math.random() * 2));
        addSprite(n + Util.randomInt(0,5), SPRITES.TREE2, -1 - (Math.random() * 2));
      }

      for(n = 200 ; n < segments.length ; n += 3) {
        addSprite(n, Util.randomChoice(SPRITES.PLANTS), Util.randomChoice([1,-1]) * (2 + Math.random() * 5));
      }

      var side, sprite, offset;
      for(n = 1000 ; n < (segments.length-50) ; n += 100) {
        side      = Util.randomChoice([1, -1]);
        addSprite(n + Util.randomInt(0, 50), Util.randomChoice(SPRITES.BILLBOARDS), -side);
        for(i = 0 ; i < 20 ; i++) {
          sprite = Util.randomChoice(SPRITES.PLANTS);
          offset = side * (1.5 + Math.random());
          addSprite(n + Util.randomInt(0, 50), sprite, offset);
        }
          
      }

    }

    function resetCars() {
      cars = [];
      var n, car, segment, offset, z, sprite, speed;
      for (var n = 0 ; n < totalCars ; n++) {
        offset = Math.random() * Util.randomChoice([-0.8, 0.8]);
        z = (Math.floor(Math.random() * (segments.length-400)) * segmentLength) + (100*segmentLength); // ensure that cars do not respawn just in front of the player, so we generate cars in all segments except the first and last (after and before finish line) - TODO: fix me in a more elegant way, without using constants
        sprite = Util.randomChoice(SPRITES.CARS);
        speed  = maxSpeed/4 + Math.random() * maxSpeed/(sprite == SPRITES.SEMI ? 4 : 2);
        car = { offset: offset, z: z, sprite: sprite, speed: speed };
        segment = findSegment(car.z);
        segment.cars.push(car);
        cars.push(car);
      }
    }

    //=========================================================================
    // THE GAME LOOP
    //=========================================================================

    Game.run({
      canvas: canvas, render: render, update: update, stats: stats, step: step,
      images: ["background", "sprites"],
      keys: [
        { keys: [KEY.LEFT,  KEY.A], div: 'gamepad-left', mode: 'down', action: function() { keyLeft   = true;  } },
        { keys: [KEY.RIGHT, KEY.D], div: 'gamepad-right', mode: 'down', action: function() { keyRight  = true;  } },
        { keys: [KEY.UP,    KEY.W], div: 'gamepad-up', mode: 'down', action: function() { keyFaster = true;  } },
        { keys: [KEY.DOWN,  KEY.S], div: 'gamepad-down', mode: 'down', action: function() { keySlower = true;  } },
        { keys: [KEY.LEFT,  KEY.A], div: 'gamepad-left', mode: 'up',   action: function() { keyLeft   = false; } },
        { keys: [KEY.RIGHT, KEY.D], div: 'gamepad-right', mode: 'up',   action: function() { keyRight  = false; } },
        { keys: [KEY.UP,    KEY.W], div: 'gamepad-up', mode: 'up',   action: function() { keyFaster = false; } },
        { keys: [KEY.DOWN,  KEY.S], div: 'gamepad-down', mode: 'up',   action: function() { keySlower = false; } },
        { keys: [KEY.SPACE, KEY.CTRL], div: 'gamepad-turbo', mode: 'down',   action: triggerTurbo }
      ],
      ready: function(images) {
        background = images[0];
        sprites    = images[1];
        reset();
        Dom.storage.fast_lap_time = Dom.storage.fast_lap_time || 180;
        updateHud('fast_lap_time', formatTime(Util.toFloat(Dom.storage.fast_lap_time)));
        // Allow to put in fullscreen
        var e = document.getElementById('canvas');
        e.ondblclick = fullscreenOnClick;
      }
    });

    function reset(options) {
      options       = options || {};
      canvas.width  = width  = Util.toInt(options.width,          width);
      canvas.height = height = Util.toInt(options.height,         height);
      lanes                  = Util.toInt(options.lanes,          lanes);
      roadWidth              = Util.toInt(options.roadWidth,      roadWidth);
      cameraHeight           = Util.toInt(options.cameraHeight,   cameraHeight);
      drawDistance           = Util.toInt(options.drawDistance,   drawDistance);
      fogDensity             = Util.toInt(options.fogDensity,     fogDensity);
      fieldOfView            = Util.toInt(options.fieldOfView,    fieldOfView);
      segmentLength          = Util.toInt(options.segmentLength,  segmentLength);
      rumbleLength           = Util.toInt(options.rumbleLength,   rumbleLength);
      cameraDepth            = 1 / Math.tan((fieldOfView/2) * Math.PI/180);
      playerZ                = (cameraHeight * cameraDepth);
      resolution             = height/480;
      refreshTweakUI();

      if ((segments.length==0) || (options.segmentLength) || (options.rumbleLength)) {
        resetRoad(randomTrack, randomTrackLength); // only rebuild road when necessary
        resetCars();
      }
    }
    
    function updateFOV(fov) {
        cameraDepth            = 1 / Math.tan((fov/2) * Math.PI/180);
        playerZ                = (cameraHeight * cameraDepth);
    }

    //=========================================================================
    // TWEAK UI HANDLERS
    //=========================================================================

    Dom.on('resolution', 'change', function(ev) {
      var w, h, ratio;
      switch(ev.target.options[ev.target.selectedIndex].value) {
        case 'fine':   w = 1280; h = 960;  ratio=w/width; break;
        case 'high':   w = 1024; h = 768;  ratio=w/width; break;
        case 'medium': w = 640;  h = 480;  ratio=w/width; break;
        case 'low':    w = 480;  h = 360;  ratio=w/width; break;
      }
      reset({ width: w, height: h })
      Dom.blur(ev);
    });

    Dom.on('lanes',          'change', function(ev) { Dom.blur(ev); reset({ lanes:         ev.target.options[ev.target.selectedIndex].value }); });
    Dom.on('roadWidth',      'change', function(ev) { Dom.blur(ev); reset({ roadWidth:     Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('cameraHeight',   'change', function(ev) { Dom.blur(ev); reset({ cameraHeight:  Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('drawDistance',   'change', function(ev) { Dom.blur(ev); reset({ drawDistance:  Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('fieldOfView',    'change', function(ev) { Dom.blur(ev); reset({ fieldOfView:   Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });
    Dom.on('fogDensity',     'change', function(ev) { Dom.blur(ev); reset({ fogDensity:    Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max'))) }); });

    function refreshTweakUI() {
      Dom.get('lanes').selectedIndex = lanes-1;
      Dom.get('currentRoadWidth').innerHTML      = Dom.get('roadWidth').value      = roadWidth;
      Dom.get('currentCameraHeight').innerHTML   = Dom.get('cameraHeight').value   = cameraHeight;
      Dom.get('currentDrawDistance').innerHTML   = Dom.get('drawDistance').value   = drawDistance;
      Dom.get('currentFieldOfView').innerHTML    = Dom.get('fieldOfView').value    = fieldOfView;
      Dom.get('currentFogDensity').innerHTML     = Dom.get('fogDensity').value     = fogDensity;
    }

    function fullscreenOnClick() {
        // Manage full screen mode on double click
        // from: https://www.sitepoint.com/use-html5-full-screen-api/
        if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
        ) {
            // exit full-screen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            // go full-screen
            var e = document.getElementById('canvas');
            if (e.requestFullscreen) {
                e.requestFullscreen();
            } else if (e.webkitRequestFullscreen) {
                e.webkitRequestFullscreen();
            } else if (e.mozRequestFullScreen) {
                e.mozRequestFullScreen();
            } else if (e.msRequestFullscreen) {
                e.msRequestFullscreen();
            }
        }
    }

    function triggerTurbo() {
    // turbo trigger function
        if (gamemode == 1 && turboLeft > 0 && !turboTriggered) {
            turboCurrentFov = fieldOfView;
            turboTimeDone = 0.0;
            turboTriggered = true;
            turboLeft -= 1;
        }
    }
    //=========================================================================
}
