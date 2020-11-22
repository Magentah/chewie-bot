import { EventService, UserService } from "../services";
import { IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/event";
import { EventParticipant } from "../models/eventParticipant";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";

/**
 * Detailed description of a bankheist: http://wiki.deepbot.tv/bankheist
 * 1) First user starts with !bankheist amount.
 * 2) Any amount of users can join with !bankheist amount (wait 2 minutes for participants to enter)
 * 3) Check the persons joining have the required amount of points
 * 4) Calculate winners and losers
 * 5) Put bankheist in cooldown
 */

const BankheistParticipationPeriod = 2 * 60 * 1000;
const BankheistCooldownPeriod = 2 * 60 * 1000;

export class BankheistEvent extends ParticipationEvent<EventParticipant> {
    // TODO: Allow configuration of values and messages in UI.
    private readonly heistLevels = [
        { level: 1, bankname: "Chewie's Piggy Bank", winChance: 54, payoutMultiplier: 1.5, minUsers: 0 },
        { level: 2, bankname: "Chewie's Piggy Bank", winChance: 48.8, payoutMultiplier: 1.7, minUsers: 10 },
        { level: 3, bankname: "Chewie's Piggy Bank", winChance: 42.5, payoutMultiplier: 2, minUsers: 20 },
        { level: 4, bankname: "Chewie's Piggy Bank", winChance: 38.7, payoutMultiplier: 2.25, minUsers: 30 },
        { level: 5, bankname: "Chewie's Piggy Bank", winChance: 32.4, payoutMultiplier: 2.75, minUsers: 40 },
    ];

    private readonly win100Messages = [
        "The heisters find themselves at the presitigous wedding of ArcaneFox and lixy chewieHug and decide to put on a big band to celebrate BongoPenguin BBoomer GuitarTime epicSax kannaPiano DanceBro For their performance, the heisters are given their pay in chews chewieLove chewieLove chewieLove",
    ];
    private readonly win34Messages = [
        "The heisters find themselves at the presitigous wedding of ArcaneFox and lixy chewieHug and decide to put on a big band to celebrate BongoPenguin BBoomer GuitarTime epicSax kannaPiano DanceBro For their performance, the heisters are given their pay in chews chewieLove chewieLove chewieLove",
    ];
    private readonly win1Messages = [
        "The heisters find themselves at the presitigous wedding of ArcaneFox and lixy chewieHug and decide to put on a big band to celebrate BongoPenguin BBoomer GuitarTime epicSax kannaPiano DanceBro For their performance, the heisters are given their pay in chews chewieLove chewieLove chewieLove",
    ];
    private readonly loseMessages = ["Something with kaputcheese and lactose intolerance..."];

    constructor(initiatingUser: IUser, wager: number) {
        super(BankheistParticipationPeriod, BankheistCooldownPeriod);

        this.addParticipant(new EventParticipant(initiatingUser, wager));
    }

    public start() {
        Logger.info(LogType.Command, `Bankheist initiated`);
        this.sendMessage(
            `${this.participants[0].user.username} has started planning a bank heist! Looking for a bigger crew for a bigger score. Join in! Type !bankheist [x] to enter.`
        );
    }

    public addParticipant(participant: EventParticipant): boolean {
        const oldLevel = this.getHeistLevel();

        if (super.addParticipant(participant, true)) {
            // If a new level has been reached after a participant has been added, make an announcement.
            const newLevel = this.getHeistLevel();
            if (newLevel.level > oldLevel.level && newLevel.level < this.heistLevels.length) {
                this.sendMessage(
                    `With this crew, we can now hit the ${
                        newLevel.bankname
                    }. Lets see if we can get a bigger crew to hit the ${this.heistLevels[newLevel.level]}!`
                );
            }

            return true;
        }

        return false;
    }

    private getHeistLevel() {
        for (let i = this.heistLevels.length - 1; i > 0; i--) {
            if (this.participants.length >= this.heistLevels[i].minUsers) {
                return this.heistLevels[i];
            }
        }

        return this.heistLevels[0];
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Bankheist participation period ended`);
        this.state = EventState.BoardingCompleted;

        this.startBankheist();
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof BankheistEvent) {
            switch (runningEvent.state) {
                case EventState.Ended:
                    return [
                        false,
                        `Chewie and his highly inept security guards request some downtime, have a heart and let them rest will ya?`,
                    ];

                case EventState.BoardingCompleted:
                    return [
                        false,
                        `Sorry ${user.username}, you are too late. The crew is in the middle of a heist. Come back for the next one?`,
                    ];

                default:
                    return [false, `A bankheist is currently in progress, use !bankheist <wager> to join!`];
            }
        }

        return [true, ""];
    }

    private async startBankheist() {
        const level = this.getHeistLevel();

        Logger.info(
            LogType.Command,
            `Bankheist started with ${this.participants.length} participants (level ${level.level})`
        );
        this.sendMessage(
            "It's time to sneak into Chewie's Piggy Bank. Can we really get out with the chews? NotLikeThis"
        );

        // Suspense
        await this.delay(10000);

        // Win or lose? We need to determine success for each participant individually.
        const winners = [];
        for (const participant of this.participants) {
            const hasWon = Math.random() * 100 <= level.winChance;
            if (hasWon) {
                const pointsWon = Math.floor(participant.points * level.payoutMultiplier);
                winners.push({ participant, pointsWon });

                BotContainer.get(UserService).changeUserPoints(participant.user, pointsWon);
            }
        }

        Logger.info(LogType.Command, `${winners.length} have won the bank heist`);

        // Output a random win or lose message
        if (winners.length > 0) {
            const percentWin = (winners.length / this.participants.length) * 100.0;
            const winMessages =
                percentWin >= 100 ? this.win100Messages : percentWin >= 34 ? this.win34Messages : this.win1Messages;
            const msgIndex = Math.floor(Math.random() * Math.floor(winMessages.length));
            this.sendMessage(winMessages[msgIndex]);

            // List all winners
            let winMessage = "These monsters stole this from poor ol Chewie: ";
            for (const winner of winners) {
                winMessage += `${winner.participant.user.username} - ${winner.pointsWon} (${winner.participant.points}), `;
            }

            this.sendMessage(winMessage.substring(0, winMessage.length - 2));
        } else {
            const msgIndex = Math.floor(Math.random() * Math.floor(this.loseMessages.length));
            this.sendMessage(this.loseMessages[msgIndex]);
        }

        BotContainer.get(EventService).stopEventStartCooldown(this);
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Bankheist cooldown ended`);
        this.sendMessage("Looks like you can bankheist again... If you dare ( ͡° ͜ʖ ͡°)");
    }
}

export default BankheistEvent;
