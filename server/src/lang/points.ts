import { Lang } from "../lang";

Lang.register("points.status", "$1: $2 chews.");
Lang.register("points.give.wrongarguments", "$1 - try again with !give <username> <chews>");
Lang.register("points.add.wrongarguments", "$1 - try again with !add <username> <chews>");
Lang.register("points.give.noself", "$1, you can't give chews to yourself!");
Lang.register("points.give.insufficientpoints", "$1, you don't have enough chews to do that!");
Lang.register("points.userunknown", "$1 is not a valid user.");
Lang.register("points.give.success", "$1 has given $2 $3 chews!");
Lang.register("points.add.success", "$1 has added $3 chews to $2!");

Lang.register("points.check.neutralstats", "$1, your stats for $2: +$3 points and $4 points. ");
Lang.register("points.check.notransaction", "$1 has not yet been involved in any transaction.");
Lang.register("points.check.total", "That's $1 total.");

Lang.register("points.check.givestats", "$1 has given $2 and got $3 points. ");
Lang.register("points.check.receiver", "That's $1 more points received than given.");
Lang.register("points.check.giver", "That's $1 more points given than received.");

Lang.register("points.check.gamestats", "$1 has won $2 and lost $3 points $4. ");
Lang.register("points.check.nogame", "$1 has not yet lost or won points $2.");
Lang.register("points.check.gameneutral", "You win some, you lose some.");
Lang.register("points.check.gamewin", "That's a total win of $1 points. It's not gambling, it's investing!");
Lang.register("points.check.gameloss", "That's a total loss of $1 points. Gambling is dangerous.");
