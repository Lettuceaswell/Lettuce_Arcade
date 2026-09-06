/* Tonight's Sky — constellation names for the win screen. Gentle, homely,
   nothing scary or clinical. Picked deterministically from the day's seed
   so the same sky always lights the same name. */

(function () {
  "use strict";

  var NAMES = [
    "The Kettle", "The Long Dog", "Grandmother's Chair", "The Quiet Fox",
    "The Ladder", "The Sleepy Bear", "The Watering Can", "The Old Boot",
    "The Rocking Horse", "The Tea Set", "The Kite", "The Lantern",
    "The Wandering Cat", "The Garden Gate", "The Slow River", "The Nightjar",
    "The Bicycle", "The Little Owl", "The Woven Basket", "The Fireside",
    "The Compass Rose", "The Paper Boat", "The Quilt", "The Songbird",
    "The Windmill", "The Porch Swing", "The Sleeping Fox", "The Milk Jug",
    "The Rowboat", "The Pinwheel", "The Shepherd's Crook", "The Snail",
    "The Hourglass", "The Violin", "The Umbrella", "The Wishing Well",
    "The Spinning Top", "The Church Bell", "The Sailmaker", "The Otter",
    "The Weathervane", "The Bread Loaf", "The Candle Stub", "The Hedge Maze",
    "The Fisherman", "The Old Bridge", "The Lullaby", "The Moth",
    "The Bookmark", "The Watchtower", "The Cradle", "The Ferryman",
    "The Broom", "The Chimney Swift", "The Trellis", "The Sundial",
    "The Marmalade Cat", "The Rope Swing", "The Anchor", "The Cider Press",
    "The Nightcap", "The Pocket Watch", "The Grandfather Clock", "The Sparrow",
    "The Wheelbarrow", "The Beehive", "The Lighthouse", "The Sleigh",
    "The Corn Husk", "The Fishing Net", "The Reading Lamp", "The Barn Owl",
    "The Milking Stool", "The Scarecrow", "The Cobbler's Bench", "The Weaver",
    "The Orchard", "The Stray Kitten", "The Rain Barrel", "The Slow Loris",
    "The Paper Lantern", "The Old Well", "The Woodstove", "The Otter's Slide"
  ];

  window.SkyNames = {
    pick: function (seedString) {
      var rng = Arcade.seededRandom(String(seedString) + ":constellation");
      return NAMES[Math.floor(rng() * NAMES.length)];
    }
  };
})();
