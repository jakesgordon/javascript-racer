Javascript-Racer
==========================

An Outrun-style pseudo-3d racing game in HTML5 and pure Javascript (no JQuery), playable on desktop and mobile devices, and based on the awesome engine by [Jakes Gordon (Code InComplete)](https://github.com/jakesgordon/javascript-racer).

![javascript-racer screenshot night time](https://github.com/lrq3000/javascript-racer/raw/master/screenshots/screenshot1.png)
![javascript-racer screenshot daylight](https://github.com/lrq3000/javascript-racer/raw/master/screenshots/screenshot2.png)

 * [play the game](https://lrq3000.github.io/javascript-racer/v5.game.html) ([or the original game](http://codeincomplete.com/projects/racer/v4.final.html))
 * view the [source](https://github.com/lrq3000/javascript-racer) ([or the original engine source](https://github.com/jakesgordon/javascript-racer))
 * read about [how it works](http://codeincomplete.com/posts/2012/6/22/javascript_racer/)

Incrementally built up in 5 parts:

 * play the [straight road demo](https://lrq3000.github.io/javascript-racer/v1.straight.html)
 * play the [curves demo](https://lrq3000.github.io/javascript-racer/v2.curves.html)
 * play the [hills demo](https://lrq3000.github.io/javascript-racer/v3.hills.html)
 * play the [final version - fastest lap game mode](https://lrq3000.github.io/javascript-racer/v4.final.html)
 * play the [final game - out of time game mode](https://lrq3000.github.io/javascript-racer/v5.game.html)

With detailed descriptions of how each part works:

 * read [the intro post](http://codeincomplete.com/posts/2012/6/22/javascript_racer/)
 * read more about [v1 - straight roads](http://codeincomplete.com/posts/2012/6/23/javascript_racer_v1_straight)
 * read more about [v2 - curves](http://codeincomplete.com/posts/2012/6/24/javascript_racer_v2_curves/)
 * read more about [v3 - hills](http://codeincomplete.com/posts/2012/6/26/javascript_racer_v3_hills/)
 * read more about v4 - final (coming soon)

A note on performance
=====================

The performance of this game is **very** machine/browser dependent. It works quite well in modern
browsers, especially those with GPU canvas acceleration, but a bad graphics driver can kill it stone
dead. So your mileage may vary. There are controls provided to change the rendering resolution
and the draw distance to scale to fit your machine.

Currently supported browsers include:

 * Firefox (v12+) works great, 60fps at high res - Nice!
 * Chrome (v19+) works great, 60fps at high res... provided you dont have a bad GPU driver
 * IE9 - ok, 30fps at medium res... not great, but at least it works

The current state of mobile browser performance is better than before but still just barely enough to run the game.
Optimizing would surely help for mobile support.

>> _NOTE: I havent actually spent anytime optimizing for performance yet. So it might be possible to
   make it play well on older browsers, but that's not really what this project is about._

A note on code structure
========================

This project happens to be implemented in javascript (because its easy for prototyping) but
is not intended to demonstrate javascript techniques or best practices. In fact, in order to
keep it simple to understand it embeds the javascript for each example directly in the HTML
page (horror!) and, even worse, uses global variables and functions (OMG!).

If I was building a real game I would have much more structure and organization to the
code, but since its just a racing game tech demo, I have elected to [KISS](http://en.wikipedia.org/wiki/KISS_principle).

FUTURE
======

It's quite astounding what it takes to actually [finish](http://codeincomplete.com/posts/2011/9/21/defining_finished/)
a game, even a simple one. And this is not a project that I plan on polishing into a finished state. It should
really be considered just how to get started with a pseudo-3d racing game.

If we were to try to turn it into a real game we would have to consider:

 * car sound fx
 * synchronized music change
 * enhance full screen mode to include the HUD
 * HUD fx (flash on fastest lap, confetti, color coded speedometer, etc)
 * more accurate sprite collision
 * better car AI (steering, braking etc)
 * an actual crash when colliding at high speed
 * more bounce when car is off road
 * screen shake when off-road or collision
 * throw up dirt particles when off road
 * more dynamic camera (lower at faster speed, swoop over hills etc)
 * automatic resolution & drawDistance detection
 * projection based curves ? x,y rotation
 * sub-pixel aliasing artifacts on curves
 * smarter fog to cover sprites (blue against sky, cover sprites)
 * multiple stages, different maps
 * a lap map, with current position indicator
 * road splits and joins
 * cars coming in opposite direction
 * weather effects
 * tunnels, bridges, clouds, walls, buildings
 * city, desert, ocean
 * add city of seattle and space needle to background
 * 'bad guys' - add some competetor drivers to race against as well as the 'traffic'
 * different game modes - 1-on-1 racing, collect coins ? shoot bad guys ?
 * a nice retro intro (using [codef](https://github.com/N0NameN0/CODEF) or [phaser](http://phaser.io/examples/v2/demoscene/atari-intro)?)
 * a whole lot of gameplay tuning
 * ...
 * ...

Related Links
=============

 * [Lou's Pseudo-3d Page](http://www.extentofthejam.com/pseudo/) - high level how-to guide
 * [Racer 10k](https://github.com/onaluf/RacerJS) - another javascript racing game

License
=======

[MIT](http://en.wikipedia.org/wiki/MIT_License) license including resources, except for some resources that are under creative commons or public domain (see thanks.txt). In any case, all assets are under permissive licenses allowing reuse and modification including for commercial purpose.
