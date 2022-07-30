import { EventService, UserService, TwitchService, EventAggregator } from "../services";
import { AchievementType, IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/participationEvent";
import { EventParticipant } from "../models/eventParticipant";
import { Logger, LogType } from "../logger";
import { inject } from "inversify";
import { Lang } from "../lang";
import { PointLogReason, PointLogType } from "../models/pointLog";
import PointLogsRepository from "../database/pointLogsRepository";
import SeasonsRepository from "../database/seasonsRepository";
import { delay } from "../helpers/asyncHelper";

/**
 * Detailed description of an arena (tournament) event: http://wiki.deepbot.tv/arena
 * 1) First user starts with !startarena amount (only allowed for mods).
 * 2) Any amount of users can join with !joinarena amount (wait 2 minutes for participants to enter)
 * 3) Check the persons joining have the required amount of points
 * 4) Calculate winners (3 winners out of all users) and number of wins per user. A minimum of 4 participants is required.
 * 5) Put arena in cooldown
 */

const ArenaParticipationPeriod = 2 * 60 * 1000;
const ArenaCooldownPeriod = 5 * 60 * 1000;

export default class ArenaEvent extends ParticipationEvent<EventParticipant> {
    private initiatingUser: IUser;
    public wager: number;

    constructor(
        @inject(TwitchService) twitchService: TwitchService,
        @inject(UserService) userService: UserService,
        @inject(EventService) private eventService: EventService,
        @inject(PointLogsRepository) private pointLogsRepository: PointLogsRepository,
        @inject(SeasonsRepository) private seasonsRepository: SeasonsRepository,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
        initiatingUser: IUser,
        wager: number
    ) {
        super(twitchService, userService, ArenaParticipationPeriod, ArenaCooldownPeriod, PointLogType.Arena);

        this.wager = wager;
        this.initiatingUser = initiatingUser;
    }

    public start() {
        Logger.info(LogType.Command, `Arena initiated`);
        this.sendMessage(Lang.get("arena.start", this.initiatingUser.username, this.wager));
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Arena participation period ended`);
        this.state = EventState.BoardingCompleted;

        // Participants missing?
        if (this.participants.length < 4) {
            this.refundPoints();
            this.sendMessage(Lang.get("arena.insufficientparticipants"));
            this.eventService.stopEvent(this);
        } else {
            this.startArena();
        }
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof ArenaEvent) {
            if (runningEvent.state === EventState.Ended) {
                return [false, Lang.get("arena.justfinished", user.username)];
            } else if (runningEvent.state === EventState.BoardingCompleted) {
                return [false, Lang.get("arena.toolate", user.username)];
            } else {
                return [false, Lang.get("arena.inprogress")];
            }
        }

        return [true, ""];
    }

    private async startArena() {
        Logger.info(LogType.Command, `Tournament started with ${this.participants.length} participants`);
        this.sendMessage(Lang.get("arena.started", this.participants.length));

        // Suspense
        await delay(10000);

        // Win or lose? We need 3 winners out of all participants.
        const fighters = this.participants.map((x) => x.user);
        const winners = [];
        while (winners.length < 3) {
            const winIndex = Math.floor(Math.random() * Math.floor(fighters.length));
            winners.push({ user: fighters[winIndex], points: 0, reason: PointLogReason.None });
            // Prevent participant from getting more than once place
            fighters.splice(winIndex, 1);
        }

        // Payoffs are 60% for 1st place, 25% for 2nd place, and 15% for 3rd place.
        const totalPoints = this.participants.map((x) => x.points).reduce((x, y) => x + y);
        winners[0].points = Math.floor(totalPoints * 0.6);
        winners[0].reason = PointLogReason.FirstPlace;
        winners[1].points = Math.floor(totalPoints * 0.25);
        winners[1].reason = PointLogReason.SecondPlace;
        winners[2].points = Math.max(0, totalPoints - winners[1].points - winners[0].points);
        winners[2].reason = PointLogReason.ThirdPlace;

        for (const winner of winners) {
            this.userService.changeUserPoints(winner.user, winner.points, this.pointLogType, winner.reason);
        }

        // Number of wins needed to be first place should be log2(n). This is only an approximation
        // though because an odd number of participants can join and also eg. 6 participants which cannot be properly matched.
        // In the end this is all a bit fake but it shouldn't really matter.
        const numberOfWinsNeeded = Math.floor(Math.log(this.participants.length) / Math.log(2));

        const currentSeasonStart = (await this.seasonsRepository.getCurrentSeason()).startDate;
        const arenasWon = await this.pointLogsRepository.getWinCount(winners[0].user, PointLogType.Arena, PointLogReason.FirstPlace);
        const arenasWonSeasonal = await this.pointLogsRepository.getWinCount(winners[0].user, PointLogType.Arena, PointLogReason.FirstPlace, currentSeasonStart);
        this.eventAggregator.publishAchievement({user: winners[0].user, type: AchievementType.ArenaWon, count: arenasWon, seasonalCount: arenasWonSeasonal });

        await this.sendMessage(
            Lang.get("arena.result3rd", numberOfWinsNeeded - 1, winners[2].points, winners[2].user.username)
        );
        await delay(3000);
        await this.sendMessage(
            Lang.get("arena.result2nd", numberOfWinsNeeded - 1, winners[1].points, winners[1].user.username)
        );
        await delay(3000);
        await this.sendMessage(Lang.get("arena.result1st", numberOfWinsNeeded, winners[0].points, winners[0].user.username));

        this.eventService.stopEventStartCooldown(this);
    }

    private async refundPoints() {
        for (const user of this.participants) {
            await this.userService.changeUserPoints(user.user, user.points, this.pointLogType, PointLogReason.Refund);
        }
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Arena cooldown ended`);
        this.sendMessage(Lang.get("arena.cooldownEnd"));
    }
}
