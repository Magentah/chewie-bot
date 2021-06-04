import { Command } from "../command";
import { AchievementType, EventLogType, ICommandAlias, IUser, UserLevels } from "../../models";
import { EventLogService } from "../../services";
import { BotContainer } from "../../inversify.config";
import AchievementService from "../../services/achievementService";

export class SudokuCommand extends Command {
    private readonly SudokuTimeoutLength = 120;
    private eventLogService: EventLogService;
    private achievementService: AchievementService;

    constructor() {
        super();
        this.eventLogService = BotContainer.get(EventLogService);
        this.achievementService = BotContainer.get(AchievementService);
    }

    public async executeInternal(channel: string, user: IUser, force: number): Promise<void> {
        if (!force && user && user.userLevel && user.userLevel.rank >= UserLevels.Moderator) {
            // Moderators are exempt from being timed out.
            return;
        }

        await this.twitchService.timeout(channel, user.username, this.SudokuTimeoutLength, `${user.username} just got their guts spilled chewieSudoku`);
        this.twitchService.sendMessage(channel, `${user.username} just got their guts spilled chewieSudoku`);

        await this.eventLogService.addSudoku(user);
        const count = await this.eventLogService.getCount(EventLogType.Sudoku, user.username);
        this.achievementService.grantAchievements(user, AchievementType.Sudoku, count);
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
}

export default SudokuCommand;
