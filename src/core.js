/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// --- Helper assert() function ---

function AssertionError(msg) {
  this.message = msg || "";
  this.name = "AssertionError";
}
AssertionError.prototype = Error.prototype;

/* Call assert(cond, description1, ...)
  An AssertionError will be thrown if the cond is false.  All parameters will be logged to the console, 
  and be part of the error.
  */
function assert(cond) {
  if (! cond) {
    var args = ["Assertion error:"].concat(Array.prototype.slice.call(arguments, 1));
    console.error.apply(console, args);
    // This is mostly for Firefox, and should perhaps be conditional on that;
    // this is because the standard Web Console often doesn't show proper stacks for errors
    // (depending on where the error was thrown)
    if (console.trace) {
      console.trace();
    }
    throw new AssertionError(args.join(" "));
  }
}