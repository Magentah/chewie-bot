import { Lang } from "../lang";

Lang.register("cards.insufficientpoints", "$1, you don't have enough chews to redeem a card!");
Lang.register("cards.cardredeemed", "$1 got the card \"$2\"!");
Lang.register("cards.cardredeemedpulls", "$1 got the card \"$2\" ($3 pulls left this week).");
Lang.register("cards.cardredeemedmultiple", "$1 got the cards: $2");
Lang.register("cards.cardredeemedmultiplepulls", "$1 got the cards: $2 ($3 pulls left this week)");
Lang.register("cards.redeemlimitexceeded", "$1, you have already redeemed $2 cards this week!");
Lang.register("cards.cardrecycled", "$1, you got $3 chews for recycling the card \"$2\"!");
Lang.register("cards.readonlymode", "Cannot currently redeem cards because read-only mode is enabled!");

Lang.register("cards.trading.nocardoffered", "$1, you need to offer a card for trading!");
Lang.register("cards.trading.missingargument", "$1, use !offer <card> <for card or chews> <optional: to user>");
Lang.register("cards.trading.userunknown", "$1 is not a valid user.");
Lang.register("cards.trading.cardnotfound", "$1, the card \"$2\" was not found in your stack of cards.");
Lang.register("cards.trading.notenoughchews", "$1, you don't have enough chews to accept the offer!");
Lang.register("cards.trading.nosamecard", "Why do you want to trade for the same card you dufus?");

Lang.register("cards.trading.startforpoints", "$1 wants to trade \"$2\" for $3 chews. Use !acceptoffer to trade!");
Lang.register("cards.trading.startforcard", "$1 wants to trade \"$2\" for the card \"$3\". Use !acceptoffer to trade!");
Lang.register("cards.trading.startforpoints.touser", "$4, $1 wants to trade \"$2\" for $3 chews with you. Use !acceptoffer to accept!");
Lang.register("cards.trading.startforcard.touser", "$4, $1 wants to trade \"$2\" for the card \"$3\" with you. Use !acceptoffer to accept!");
Lang.register("cards.trading.cardnotexists", "$1, the card \"$2\" does not exist.");
Lang.register("cards.trading.maxpointsexceeded", "$1, you cannot trade for more than \"$2\" chews.");

Lang.register("cards.trading.inprogess", "A trade is currently in progress, please wait until the transaction has been completed.");
Lang.register("cards.trading.cooldown", "Trading currently is in cooldown.");

Lang.register("cards.trading.incomplete", "$1, your offer has not been accepted.");
Lang.register("cards.trading.completedcards", "Trade completed! $1 got \"$2\" from $3 and gave \"$4\" in exchange.");
Lang.register("cards.trading.completedpoints", "Trade completed. $1 got $2 chews from $3 for \"$4\".");
Lang.register("cards.trading.norunningtrade", "$1, there is no trade in progress for you to participate.");
Lang.register("cards.trading.noselftrading", "$1, you cannot trade with yourself.");
Lang.register("cards.trading.wronguser", "$1, this trade is not directed at you.");
Lang.register("cards.trading.notowningcard", "$1, you do not have the card \"$2\".");
Lang.register("cards.trading.onecardleft", "$1, you have only one \"$2\" card left. Use !recycle 1 or no argument to recycle.");

Lang.register("cards.redeemupgrade.missingargument", "$1, you did not specify a card.");
Lang.register("cards.redeemupgrade.notenoughcards", "$1, you do not have enough cards.");
Lang.register("cards.redeemupgrade.upgraded", "$1 upgraded \"$2\" by redeeming $3 cards.");
Lang.register("cards.redeemupgrade.noupgrade", "$1, this card cannot be upgraded.");
Lang.register("cards.redeemupgrade.alreadyupgraded", "$1, this card has already been upgraded.");
