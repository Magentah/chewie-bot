import { Container } from "inversify";
import "reflect-metadata";
import DatabaseService from "./services/databaseService";
import DatabaseProvider from "./services/databaseService";
import WebsocketService from "./services/websocketService";
import TwitchService, { TwitchServiceProvider } from "./services/twitchService";
import CacheService from "./services/cacheService";
import YoutubeService from "./services/youtubeService";
import SpotifyService from "./services/spotifyService";
import CommandService from "./services/commandService";
import SongService from "./services/songService";
import UserService from "./services/userService";
import EventService from "./services/eventService";
import BotSettingsService from "./services/botSettingsService";
import BotSettingsRepository from "./database/botSettings";
import UsersRepository from "./database/usersRepository";
import UserLevelsRepository from "./database/userLevelsRepository";
import VIPLevelsRepository from "./database/vipLevels";
import DonationsRepository from "./database/donations";
import TextCommandsRepository from "./database/textCommands";
import CommandAliasesRepository from "./database/commandAliases";
import SongController from "./controllers/songController";
import TwitchController from "./controllers/twitchController";
import EventController from "./controllers/eventController";

import * as Commands from "./commands/commandScripts";
import { Command } from "./commands/command";

const botContainer = new Container();

botContainer.bind<DatabaseService>(DatabaseService).toSelf().inSingletonScope();
botContainer.bind<DatabaseProvider>("DatabaseProvider").toProvider((context) => {
    return () => {
        return new Promise<DatabaseService>(async (resolve, reject) => {
            try {
                const databaseService = context.container.get(DatabaseService);
                await databaseService.initDatabase();
                return resolve(databaseService);
            } catch (e) {
                return reject(e);
            }
        });
    };
});

botContainer.bind<WebsocketService>(WebsocketService).toSelf().inSingletonScope();
botContainer.bind<TwitchService>(TwitchService).toSelf().inSingletonScope();
botContainer.bind<TwitchServiceProvider>("TwitchServiceProvider").toProvider((context) => {
    return () => {
        return new Promise<TwitchService>(async (resolve, reject) => {
            try {
                const twitchService = context.container.get(TwitchService);
                if (!twitchService.hasInitialized) {
                    await twitchService.initialize();
                }
                return resolve(twitchService);
            } catch (e) {
                return reject(e);
            }
        });
    };
});
botContainer.bind<CacheService>(CacheService).toSelf().inSingletonScope();
botContainer.bind<YoutubeService>(YoutubeService).toSelf().inSingletonScope();
botContainer.bind<SpotifyService>(SpotifyService).toSelf().inSingletonScope();
botContainer.bind<SongService>(SongService).toSelf().inSingletonScope();
botContainer.bind<UserService>(UserService).toSelf().inSingletonScope();
botContainer.bind<EventService>(EventService).toSelf().inSingletonScope();
botContainer.bind<BotSettingsService>(BotSettingsService).toSelf().inSingletonScope();

botContainer.bind<UsersRepository>(UsersRepository).toSelf();
botContainer.bind<UserLevelsRepository>(UserLevelsRepository).toSelf();
botContainer.bind<VIPLevelsRepository>(VIPLevelsRepository).toSelf();
botContainer.bind<DonationsRepository>(DonationsRepository).toSelf();
botContainer.bind<TextCommandsRepository>(TextCommandsRepository).toSelf();
botContainer.bind<CommandAliasesRepository>(CommandAliasesRepository).toSelf();
botContainer.bind<BotSettingsRepository>(BotSettingsRepository).toSelf();

botContainer.bind<SongController>(SongController).toSelf();
botContainer.bind<TwitchController>(TwitchController).toSelf();
botContainer.bind<EventController>(EventController).toSelf();

/*botContainer.bind<Command>(Commands.AcceptCommand).to(Commands.AcceptCommand);
botContainer.bind<Command>(Commands.AddAliasCommand).to(Commands.AddAliasCommand);
botContainer.bind<Command>(Commands.AddCmdCommand).to(Commands.AddCmdCommand);
botContainer.bind<Command>(Commands.AddSongCommand).to(Commands.AddSongCommand);
botContainer.bind<Command>(Commands.AuctionCommand).to(Commands.AuctionCommand);
botContainer.bind<Command>(Commands.BankheistCommand).to(Commands.BankheistCommand);
botContainer.bind<Command>(Commands.BidCommand).to(Commands.BidCommand);
botContainer.bind<Command>(Commands.DelAliasCommand).to(Commands.DelAliasCommand);
botContainer.bind<Command>(Commands.DelCmdCommand).to(Commands.DelCmdCommand);
botContainer.bind<Command>(Commands.DuelCommand).to(Commands.DuelCommand);
botContainer.bind<Command>(Commands.JoinArenaCommand).to(Commands.JoinArenaCommand);
botContainer.bind<Command>(Commands.StartArenaCommand).to(Commands.StartArenaCommand);
botContainer.bind<Command>(Commands.TestCommand.name).to(Commands.TestCommand);
botContainer.bind<Command>(Commands.TextCommand).to(Commands.TextCommand);
botContainer.bind<Command>(Commands.WeaponCommand).to(Commands.WeaponCommand);*/

const commandList: Map<string, Command> = new Map<string, Command>();
Object.keys(Commands).forEach((val, index) => {
    const commandName = val.substr(0, val.toLowerCase().indexOf("command"));
    const command = new (Object.values(Commands)[index])();
    commandList.set(commandName.toLowerCase(), command);
    for (const alias of command.getAliases()) {
        commandList.set(alias.alias.toLowerCase(), command);
    }
});
botContainer.bind<Map<string, Command>>("Commands").toConstantValue(commandList);

botContainer.bind<CommandService>(CommandService).toSelf().inSingletonScope();
export { botContainer as BotContainer };
