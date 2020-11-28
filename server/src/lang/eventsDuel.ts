import { Lang } from "../lang";

Lang.register("duel.start", "Sir $1 has challenged Sir $2 to a duel for $3 chews! Sir $2, to accept this duel, type !accept");
Lang.register("duel.startopen", "Sir $1 has issued an open duel with the wager of $2 chews! Is there anyone who would !accept this challenge?");
Lang.register("duel.noparticipants", "Oh Sir $1, it appears your challenge has not been answered. The duel has been called off.");
Lang.register("duel.notaccepted", "Oh Sir $1, it appears $2 did not answer your challenge. The duel has been called off.");
Lang.register("duel.cooldown", "A duel has just finished $1. Please wait while we clean up the battleground.");
Lang.register("duel.inprogress", "A duel is underway $1. Please wait for the current duel to finish.");
Lang.register("duel.notenoughchews", "$1 does not have enough chews!");
Lang.register("duel.calledoffbyinitiator", "How rude, Sir $1, calling a duel and then not participating! The duel has been called off FeelsBadMan");
Lang.register("duel.calledoffbyopponent", "Despite accepting the duel, it appears Sir $1 has run away! The duel has been called off FeelsBadMan");

Lang.register("duel.drawrock", "Sir $1 and Sir $2 both threw Rock! They collide with such force they fuse to form nuclear isotope cozmium-322!");
Lang.register("duel.drawpaper", "Sir $1 and Sir $2 both threw Paper! They combine into a paper airplane and fly away!");
Lang.register("duel.drawscissors", "Sir $1 and Sir $2 both threw Scissors! They entangle and the audience is not quite sure if they're witnessing something indecent monkaS");
Lang.register("duel.chewslost", "Both participants lose $1 chews chewieWUT");

Lang.register("duel.winrock", "Sir $1 threw Rock and absolutely smashed Sir $2's Scissors!");
Lang.register("duel.winpaper", "Sir $1's Paper covered Sir $2's Rock. Hello darkness my old friend FeelsBadMan");
Lang.register("duel.winscissors", "Sir $1's Scissors cuts Sir $2's Paper into subatomic particles!");
Lang.register("duel.chewswon", "Sir $1 wins $2 chews!");

Lang.register("duel.cooldownEnd", "The duelgrounds are ready for the next battle! Settle your grievances today with !duel <target> <wager>");
Lang.register("duel.accepted", "It's time to D-D-D-D-D-D-D-D-Duel! Sir $1, Sir $2, please whisper me your weapon of choice using !rock, !paper, or !scissors");

Lang.register("duel.noselfduel", "$1, you cannot duel yourself.");
Lang.register("duel.userunknown", "Who is $1?");
Lang.register("duel.curentweapon", "Your current weapon is: $1");
