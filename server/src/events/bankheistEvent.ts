import { EventService, UserService, TwitchService, EventLogService } from "../services";
import { IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/participationEvent";
import { EventParticipant } from "../models/eventParticipant";
import { Logger, LogType } from "../logger";
import { inject } from "inversify";
import { Lang } from "../lang";
import { PointLogType } from "../models/pointLog";

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

    constructor(
        @inject(TwitchService) twitchService: TwitchService,
        @inject(UserService) userService: UserService,
        @inject(EventService) private eventService: EventService,
        @inject(EventLogService) private eventLogService: EventLogService,
        initiatingUser: IUser,
        wager: number
    ) {
        super(twitchService, userService, BankheistParticipationPeriod, BankheistCooldownPeriod, PointLogType.Bankheist);

        this.addParticipant(new EventParticipant(initiatingUser, wager));
    }

    public start() {
        Logger.info(LogType.Command, `Bankheist initiated`);
        this.sendMessage(Lang.get("bankheist.start", this.participants[0].user.username));
    }

    public addParticipant(participant: EventParticipant): boolean {
        const oldLevel = this.getHeistLevel();

        if (super.addParticipant(participant, true)) {
            // If a new level has been reached after a participant has been added, make an announcement.
            const newLevel = this.getHeistLevel();
            if (newLevel.level > oldLevel.level && newLevel.level < this.heistLevels.length) {
                this.sendMessage(Lang.get("bankheist.newlevel", newLevel.bankname, this.heistLevels[newLevel.level]));
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
                    return [false, Lang.get("bankheist.cooldown")];

                case EventState.BoardingCompleted:
                    return [false, Lang.get("bankheist.participationover", user.username)];

                default:
                    return [false, Lang.get("bankheist.inprogess")];
            }
        }

        return [true, ""];
    }

    private async startBankheist() {
        const level = this.getHeistLevel();

        Logger.info(LogType.Command, `Bankheist started with ${this.participants.length} participants (level ${level.level})`);
        this.sendMessage(Lang.get("bankheist.commencing", level.bankname));

        // Suspense
        await this.delay(10000);

        // Win or lose? We need to determine success for each participant individually.
        const winners = [];
        for (const participant of this.participants) {
            const hasWon = Math.random() * 100 <= level.winChance;
            if (hasWon) {
                const pointsWon = Math.floor(participant.points * level.payoutMultiplier);
                winners.push({ participant, pointsWon });

                this.userService.changeUserPoints(participant.user, pointsWon, this.pointLogType);
            }
        }

        Logger.info(LogType.Command, `${winners.length} have won the bank heist`);

        // Output a random win or lose message
        if (winners.length > 0) {
            const percentWin = (winners.length / this.participants.length) * 100.0;
            const winMessages = percentWin >= 100 ? this.win100Messages : percentWin >= 34 ? this.win34Messages : this.win1Messages;
            const msgIndex = Math.floor(Math.random() * Math.floor(winMessages.length));
            this.sendMessage(winMessages[msgIndex]);

            // List all winners
            let winMessage = Lang.get("bankheist.winners");
            for (const winner of winners) {
                winMessage += `${winner.participant.user.username} - ${winner.pointsWon} (${winner.participant.points}), `;
            }

            this.sendMessage(winMessage.substring(0, winMessage.length - 2));
        } else {
            const msgIndex = Math.floor(Math.random() * Math.floor(this.loseMessages.length));
            this.sendMessage(this.loseMessages[msgIndex]);
        }

        this.eventLogService.addBankheist(this.participantUsernames.join(","), {
            message: "Bankheist finished.",
            participants: this.participants.map((participant) => {
                return { username: participant.user.username, wager: participant.points };
            }),
            winners: winners.map((participant) => {
                return { username: participant.participant.user.username, pointsWon: participant.pointsWon };
            }),
            level: this.getHeistLevel(),
        });
        this.eventService.stopEventStartCooldown(this);
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Bankheist cooldown ended`);
        this.sendMessage(Lang.get("bankheist.cooldownEnd"));
    }
}

export default BankheistEvent;
