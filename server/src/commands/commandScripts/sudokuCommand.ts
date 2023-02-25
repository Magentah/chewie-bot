import { Command } from "../command";
import { AchievementType, EventLogType, ICommandAlias, IUser, UserLevels } from "../../models";
import { EventLogService, UserService } from "../../services";
import { BotContainer } from "../../inversify.config";
import EventAggregator from "../../services/eventAggregator";
import SeasonsRepository from "../../database/seasonsRepository";

export class SudokuCommand extends Command {
    private readonly SudokuTimeoutLength = 120;
    private eventLogService: EventLogService;
    private seasonsRepository: SeasonsRepository;
    private eventAggregator: EventAggregator;
    private userService: UserService;

    constructor() {
        super();
        this.eventLogService = BotContainer.get(EventLogService);
        this.eventAggregator = BotContainer.get(EventAggregator);
        this.seasonsRepository = BotContainer.get(SeasonsRepository);
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, targetUser: string): Promise<void> {
        if (user && user.userLevel && user.userLevel >= UserLevels.Moderator) {
            if (targetUser) {
                // Mods can use this command to timeout other people
                const newUser = await this.userService.getUser(targetUser);
                if (newUser) {
                    user = newUser;
                } else {
                    return;
                }
            } else {
                // Moderators are exempt from being timed out.
                return;
            }
        }

        await this.twitchService.banUser(user.username, this.SudokuTimeoutLength, `${user.username} just got their guts spilled chewieSudoku`);
        await this.twitchService.sendMessage(channel, `${user.username} just got their guts spilled chewieSudoku`);

        await this.eventLogService.addSudoku(user);

        const currentSeasonStart = (await this.seasonsRepository.getCurrentSeason()).startDate;
        const count = await this.eventLogService.getCount(EventLogType.Sudoku, user);
        const seasonalCount = await this.eventLogService.getCount(EventLogType.Sudoku, user, currentSeasonStart);
        const msg = { user, type: AchievementType.Sudoku, count, seasonalCount };
        this.eventAggregator.publishAchievement(msg);
    }

    /**
     * Execute command whenever someone uses the chewieSudoku emote or the
     * word "sudoku" in chat.
     */
    public shouldExecuteOnMessage(message: string): boolean {
        const msgToLower = message.toLowerCase();
        return msgToLower.indexOf("sudoku") !== -1 ||
            msgToLower.indexOf("subaru") !== -1 ||
            msgToLower.indexOf("sepukku") !== -1 ||
            msgToLower.indexOf("seppuku") !== -1 ||
            msgToLower.indexOf("harakiri") !== -1;
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "subaru", commandName: "sudoku" },
            { alias: "sepukku", commandName: "sudoku" },
            { alias: "seppuku", commandName: "sudoku" },
            { alias: "harakiri", commandName: "sudoku" },
        ];
    }

    public async getDescription(): Promise<string> {
        return "Commit sudoku (get timed out). You probably noticed.";
    }
}

export default SudokuCommand;
