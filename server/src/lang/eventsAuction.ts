import { Lang } from "../lang";

Lang.register("auction.starttimelimit", "Auction for $1 opened for bidding for all users using Chews with a min bid of $2. Time limit: $3 minutes. Type !bid [x] to register your bid.");
Lang.register("auction.start", "Auction for $1 opened for bidding for all users using Chews with a min bid of $2. Type !bid [x] to register your bid.");
Lang.register("auction.status", "Auction for $1 currently running! $2 is currently winning with a bid of $3 Chews.");
Lang.register("auction.newbid", "New top bid of $1 registered by $2.");
Lang.register("auction.closed", "Auction closed. No one made a bid though.");
Lang.register("auction.closedwin", "Auction closed. The winner is: $1 with a bid of $2 Chews.");
Lang.register("auction.cooldown", "Auction on cooldown.");
Lang.register("auction.inprogress", "An auction is currently in progress, use !bid <wager> to join!");

Lang.register("auction.bidnan", "$1, minimum bid is not a number!");
Lang.register("auction.noitem", "$1, item to be auctioned needs to be specified!");
Lang.register("auction.bidtoolow", "$1, your bid needs to be higher than $2!");
Lang.register("auction.isclosed", "$1, the auction is closed!");
Lang.register("auction.notinprogress", "No auction is currently in progress.");
