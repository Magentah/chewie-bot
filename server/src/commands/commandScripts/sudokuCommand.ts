import { Command } from "../command";
import { IUser, UserLevels } from "../../models";

export class SudokuCommand extends Command {
    private readonly SudokuTimeoutLength = 120;

    constructor() {
        super();
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        if (user && user.userLevel && user.userLevel.rank >= UserLevels.Moderator) {
            // Moderators are exempt from being timed out.
            return;
        }

        await this.twitchService.timeout(channel, user.username, this.SudokuTimeoutLength, `${user.username} just got their guts spilled chewieSudoku`);
        this.twitchService.sendMessage(channel, `${user.username} just got their guts spilled chewieSudoku`);
    }

    /**
     * Execute command whenever someone uses the chewieSudoku emote or the
     * word "sudoku" in chat.
     */
    public shouldExecuteOnMessage(message: string): boolean {
        return message.toLowerCase().indexOf("sudoku") !== -1;
    }
}

export default SudokuCommand;
