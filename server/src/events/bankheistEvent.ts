import { EventService, UserService, TwitchService, EventLogService, EventAggregator } from "../services";
import { AchievementType, GameEventType, GameMessageType, IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/participationEvent";
import { EventParticipant } from "../models/eventParticipant";
import { Logger, LogType } from "../logger";
import { inject } from "inversify";
import { Lang } from "../lang";
import { PointLogReason, PointLogType } from "../models/pointLog";
import MessagesRepository from "../database/messagesRepository";
import PointLogsRepository from "../database/pointLogsRepository";
import SeasonsRepository from "../database/seasonsRepository";
import { delay } from "../helpers/asyncHelper";

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
    private readonly heistLevels = [
        { level: 1, bankname: GameMessageType.BankNameLevel1, winChance: 59.5, payoutMultiplier: 1.5, minUsers: 0 },
        { level: 2, bankname: GameMessageType.BankNameLevel2, winChance: 50.6, payoutMultiplier: 1.75, minUsers: 5 },
        { level: 3, bankname: GameMessageType.BankNameLevel3, winChance: 46, payoutMultiplier: 2, minUsers: 10 },
        { level: 4, bankname: GameMessageType.BankNameLevel4, winChance: 38, payoutMultiplier: 2.5, minUsers: 15 },
        { level: 5, bankname: GameMessageType.BankNameLevel5, winChance: 25, payoutMultiplier: 4, minUsers: 20 },
    ];

    private readonly startingUser: EventParticipant;

    constructor(
        @inject(TwitchService) twitchService: TwitchService,
        @inject(UserService) userService: UserService,
        @inject(EventService) private eventService: EventService,
        @inject(EventLogService) private eventLogService: EventLogService,
        @inject(MessagesRepository) private messages: MessagesRepository,
        @inject(PointLogsRepository) private pointsLog: PointLogsRepository,
        @inject(SeasonsRepository) private seasonsRepository: SeasonsRepository,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
        initiatingUser: IUser,
        wager: number
    ) {
        super(twitchService, userService, BankheistParticipationPeriod, BankheistCooldownPeriod, PointLogType.Bankheist);
        this.startingUser = new EventParticipant(initiatingUser, wager);
    }

    public start() {
        Logger.info(LogType.Command, `Bankheist initiated`);
        this.addParticipant(this.startingUser);
        this.sendMessage(Lang.get("bankheist.start", this.participants[0].user.username));
    }

    public async addParticipant(participant: EventParticipant): Promise<boolean> {
        const oldLevel = this.getHeistLevel();

        if (await super.addParticipant(participant, true)) {
            // If a new level has been reached after a participant has been added, make an announcement.
            const newLevel = this.getHeistLevel();
            if (newLevel.level > oldLevel.level && newLevel.level < this.heistLevels.length) {
                const bankNameCurrent = await this.messages.getByType(GameEventType.Bankheist, newLevel.bankname);
                const bankNameNext = await this.messages.getByType(GameEventType.Bankheist, this.heistLevels[newLevel.level].bankname);
                if (bankNameCurrent.length > 0 && bankNameNext.length > 0) {
                    this.sendMessage(Lang.get("bankheist.newlevel", bankNameCurrent[0].text, bankNameNext[0].text));
                }
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

        const banknames = await this.messages.getByType(GameEventType.Bankheist, level.bankname);
        if (banknames.length > 0) {
            this.sendMessage(Lang.get("bankheist.commencing", banknames[0].text));
        }

        // Suspense
        await delay(10000);

        // Win or lose? We need to determine success for each participant individually.
        const winners = [];
        for (const participant of this.participants) {
            const hasWon = Math.random() * 100 <= level.winChance;
            if (hasWon) {
                const pointsWon = Math.floor(participant.points * level.payoutMultiplier);
                winners.push({ participant, pointsWon });

                this.userService.changeUserPoints(participant.user, pointsWon, this.pointLogType, PointLogReason.Win);
            }
        }

        Logger.info(LogType.Command, `${winners.length} have won the bank heist`);

        // Output a random win or lose message
        if (winners.length > 0) {
            const percentWin = (winners.length / this.participants.length) * 100.0;

            const messageType = this.participants.length === 1 ? GameMessageType.SingleWin : percentWin >= 100 ? GameMessageType.AllWin : GameMessageType.SomeWin;
            const winMessages = (await this.messages.getByType(GameEventType.Bankheist, messageType)).map(item => item.text);
            if (winMessages.length > 0) {
                const msgIndex = Math.floor(Math.random() * Math.floor(winMessages.length));

                // Replace variables for "single user" scenario.
                const winMessageResult = winMessages[msgIndex].replace(/\{user\}/ig, winners[0].participant.user.username)
                    .replace(/\{amount\}/ig, winners[0].pointsWon.toString());
                this.sendMessage(winMessageResult);
            } else {
                Logger.warn(LogType.Command, `No messages available for ${messageType}`);
            }

            // List all winners
            let winMessage = Lang.get("bankheist.winners");
            for (const winner of winners) {
                winMessage += `${winner.participant.user.username} - ${winner.pointsWon} (${winner.participant.points}), `;
            }

            this.sendMessage(winMessage.substring(0, winMessage.length - 2));
        } else {
            const loseMessages = (await this.messages.getByType(GameEventType.Bankheist, this.participants.length === 1 ? GameMessageType.SingleLose : GameMessageType.NoWin))
                .map(item => item.text);
            if (loseMessages.length > 0) {
                const msgIndex = Math.floor(Math.random() * Math.floor(loseMessages.length));

                // Allow special case for defeat: Sudoku every one if sudoku used in text.
                const useSudoku = loseMessages[msgIndex].toLowerCase().indexOf("sudoku") !== -1;

                // Replace variables for "single user" scenario.
                const loseMessageResult = loseMessages[msgIndex].replace(/\{user\}/ig, this.participants[0].user.username)
                    .replace(/\{amount\}/ig, this.participants[0].points.toString());
                this.sendMessage(loseMessageResult);

                if (useSudoku) {
                    this.sudokuParticipants();
                }
            } else {
                Logger.warn(LogType.Command, `No messages available for ${GameMessageType.NoWin}`);
            }
        }

        // Grant achievements
        for (const participant of this.participants) {
            const currentSeasonStart = (await this.seasonsRepository.getCurrentSeason()).startDate;
            const stats = await this.pointsLog.getStats(participant.user, PointLogType.Bankheist);
            const seasonStats = await this.pointsLog.getStats(participant.user, PointLogType.Bankheist, currentSeasonStart);
            const total = stats.lost + stats.won;
            const seasonTotal = seasonStats.lost + seasonStats.won;
            if (total > 0) {
                this.eventAggregator.publishAchievement({ user: participant.user, type: AchievementType.BankheistPointsWon, count: total });
            } else if (total < 0) {
                this.eventAggregator.publishAchievement({ user: participant.user, type: AchievementType.BankheistPointsLost, count: -total });
            }

            if (seasonTotal > 0) {
                this.eventAggregator.publishAchievement({ user: participant.user, type: AchievementType.BankheistPointsWon, seasonalCount: seasonTotal });
            } else if (seasonTotal < 0) {
                this.eventAggregator.publishAchievement({ user: participant.user, type: AchievementType.BankheistPointsLost, seasonalCount: -seasonTotal });
            }
        }

        this.eventLogService.addBankheist(this.participantUsernames.join(","), {
            message: "Bankheist finished.",
            participants: this.participants.map((participant) => {
                return { username: participant.user.username, wager: participant.points };
            }),
            winners: winners.map((participant) => {
                return { username: participant.participant.user.username, pointsWon: participant.pointsWon };
            }),
            level,
        });
        this.eventService.stopEventStartCooldown(this);
    }

    private async sudokuParticipants() {
        // Give users time to process the message and realize their fate.
        await delay(5000);

        for (const participant of this.participants) {
            this.twitchService.invokeCommand(participant.user.username, "!sudoku");
        }
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Bankheist cooldown ended`);
        this.sendMessage(Lang.get("bankheist.cooldownEnd"));
    }
}

export default BankheistEvent;
